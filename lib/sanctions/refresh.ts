// Sanctions list refresh.
//
// Fetches the four public consolidated lists Ponte screens against and loads
// them into sanctions_entries. Public sanctions publications only: no customs
// data, no third party trade data, nothing bought from a data broker.
//
// Sources, all published free by the issuing authority:
//   OFAC_SDN   US Treasury, Specially Designated Nationals, XML
//   OFAC_CONS  US Treasury, Consolidated non SDN list, XML
//   EU_CFSL    European Commission, Consolidated Financial Sanctions List, XML
//   UN_SC      UN Security Council, Consolidated List, XML
//   UK_OFSI    HM Treasury OFSI, UK Sanctions List, CSV
//
// Parsing note. package.json carries no XML dependency and none was added:
// pulling a full DOM for a 28 MB SDN file to read six fields per record is not
// a trade worth making, and a new dependency in the compliance path is a new
// thing to audit. What follows is a deliberately tolerant string scanner. It
// looks for the record element of each feed and reads named children out of
// it. It does not validate against a schema, it does not resolve namespaces,
// and it does not care about attribute order or unknown elements. When a feed
// changes shape the usual outcome is fewer fields on a record, or zero records
// for that one source, which is caught by the entry count guard below and
// logged, rather than a hard crash that takes the other three lists with it.

import { createAdminClient } from "@/lib/supabase/server";
import { normalizeName } from "./normalize";

export type SourceList =
  | "OFAC_SDN"
  | "OFAC_CONS"
  | "EU_CFSL"
  | "UN_SC"
  | "UK_OFSI";

export type RefreshSummary = {
  source: SourceList;
  status: "ok" | "failed";
  entryCount: number;
  durationMs: number;
  error: string | null;
};

/** A record as parsed out of a feed, before normalisation. */
export type ParsedEntry = {
  entry_id: string;
  primary_name: string;
  aliases: string[];
  entity_type: string | null;
  country: string | null;
  programs: string[];
  listed_date: string | null;
  raw: Record<string, unknown>;
};

export type SourceConfig = {
  source: SourceList;
  url: string;
  label: string;
  parse: (body: string) => ParsedEntry[];
  /** A floor under which the feed is treated as broken rather than shrunk. */
  minExpectedEntries: number;
};

const DEFAULT_TIMEOUT_MS = 120_000;
const UPSERT_CHUNK = 500;
const USER_AGENT = "ponte.trade sanctions screening (compliance)";

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

async function fetchText(
  url: string,
  label: string,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "*/*" },
      cache: "no-store",
    });
  } catch (err) {
    const e = err as Error;
    const timedOut = e.name === "AbortError" || e.name === "TimeoutError";
    throw new Error(
      timedOut
        ? `${label}: download timed out after ${timeoutMs} ms, ${url}`
        : `${label}: download failed, ${e.message}, ${url}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(
      `${label}: publisher returned HTTP ${res.status} ${res.statusText}, ${url}`,
    );
  }

  const body = await res.text();
  if (body.length < 1000) {
    throw new Error(
      `${label}: response was only ${body.length} bytes, treating it as a broken feed rather than an empty list, ${url}`,
    );
  }
  return body;
}

// ---------------------------------------------------------------------------
// Tolerant XML reading
// ---------------------------------------------------------------------------

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeXml(input: string): string {
  if (input.indexOf("&") === -1) return input;
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.charAt(0) === "#") {
      const isHex = body.charAt(1) === "x" || body.charAt(1) === "X";
      const code = parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      if (!isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    const mapped = ENTITY_MAP[body.toLowerCase()];
    return mapped === undefined ? whole : mapped;
  });
}

type XmlElement = { open: string; inner: string };

/**
 * Walk every <tag ...>...</tag> or <tag .../> in a string and hand the caller
 * the opening tag and the inner text.
 *
 * Uses indexOf scanning rather than a regex, both for speed on files this size
 * and to avoid a catastrophic backtracking risk on a feed we do not control.
 * The guard on the character after the tag name is what keeps <ENTITY> from
 * matching <ENTITIES> or <ENTITY_ALIAS>.
 */
function forEachElement(
  xml: string,
  tag: string,
  fn: (el: XmlElement) => void,
): void {
  const openPrefix = "<" + tag;
  const closeTag = "</" + tag + ">";
  let i = 0;

  for (;;) {
    const start = xml.indexOf(openPrefix, i);
    if (start === -1) return;

    const next = xml.charAt(start + openPrefix.length);
    if (next !== "" && next !== ">" && next !== "/" && !/\s/.test(next)) {
      i = start + openPrefix.length;
      continue;
    }

    const gt = xml.indexOf(">", start);
    if (gt === -1) return;

    const open = xml.slice(start, gt + 1);
    if (open.charAt(open.length - 2) === "/") {
      fn({ open, inner: "" });
      i = gt + 1;
      continue;
    }

    const end = xml.indexOf(closeTag, gt + 1);
    if (end === -1) return;
    fn({ open, inner: xml.slice(gt + 1, end) });
    i = end + closeTag.length;
  }
}

function firstElement(xml: string, tag: string): XmlElement | null {
  let found: XmlElement | null = null;
  forEachElement(xml, tag, (el) => {
    if (found === null) found = el;
  });
  return found;
}

/**
 * First text of <tag>...</tag>, decoded and trimmed.
 *
 * Keeps scanning past a longer tag that merely starts with the same letters,
 * so asking for COUNTRY in a block that opens with COUNTRY_OF_BIRTH still
 * finds the COUNTRY that follows it.
 */
function tagText(xml: string, tag: string): string {
  const openPrefix = "<" + tag;
  let i = 0;

  for (;;) {
    const start = xml.indexOf(openPrefix, i);
    if (start === -1) return "";

    const next = xml.charAt(start + openPrefix.length);
    if (next !== "" && next !== ">" && next !== "/" && !/\s/.test(next)) {
      i = start + openPrefix.length;
      continue;
    }

    const gt = xml.indexOf(">", start);
    if (gt === -1) return "";
    if (xml.charAt(gt - 1) === "/") {
      // Self closing, so empty. Keep looking for a populated one.
      i = gt + 1;
      continue;
    }

    const end = xml.indexOf("</" + tag + ">", gt + 1);
    if (end === -1) return "";
    return decodeXml(xml.slice(gt + 1, end)).trim();
  }
}

function allTagText(xml: string, tag: string): string[] {
  const out: string[] = [];
  forEachElement(xml, tag, (el) => {
    const v = decodeXml(el.inner).trim();
    if (v) out.push(v);
  });
  return out;
}

const attrCache: Record<string, RegExp> = {};

function attr(openTag: string, name: string): string {
  let re = attrCache[name];
  if (!re) {
    re = new RegExp("\\s" + name + '="([^"]*)"');
    attrCache[name] = re;
  }
  const m = openTag.match(re);
  return m ? decodeXml(m[1]).trim() : "";
}

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

function joinName(parts: (string | undefined | null)[]): string {
  return parts
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]): string[] {
  const seen: Record<string, true> = {};
  const out: string[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = (values[i] || "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(v);
  }
  return out;
}

/** ISO date or null. Accepts yyyy-mm-dd and dd/mm/yyyy, which is all we meet. */
function toIsoDate(value: string): string | null {
  const v = (value || "").trim();
  if (!v) return null;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  const uk = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (uk) return uk[3] + "-" + uk[2] + "-" + uk[1];
  return null;
}

function mapEntityType(raw: string): string | null {
  const v = (raw || "").trim().toLowerCase();
  if (!v) return null;
  if (v === "individual" || v === "person") return "individual";
  if (v === "entity" || v === "enterprise" || v === "organisation") return "entity";
  if (v === "vessel" || v === "ship") return "vessel";
  if (v === "aircraft") return "aircraft";
  return null;
}

// ---------------------------------------------------------------------------
// Parser: OFAC, both the SDN list and the consolidated non SDN list
// ---------------------------------------------------------------------------
// Shape: <sdnList><sdnEntry><uid/><firstName/><lastName/><sdnType/>
//        <programList><program/></programList>
//        <akaList><aka><firstName/><lastName/></aka></akaList>
//        <addressList><address><country/></address></addressList> ...
// The entry's own name fields sit before the first child list, so names are
// read from the head of the record only. That stops an a.k.a. name being read
// as the primary name if OFAC ever reorders the children.

const OFAC_LIST_TAGS = [
  "<akaList",
  "<addressList",
  "<nationalityList",
  "<citizenshipList",
  "<dateOfBirthList",
  "<placeOfBirthList",
  "<idList",
  "<vesselInfo",
];

function ofacHead(block: string): string {
  let cut = block.length;
  for (let i = 0; i < OFAC_LIST_TAGS.length; i++) {
    const at = block.indexOf(OFAC_LIST_TAGS[i]);
    if (at !== -1 && at < cut) cut = at;
  }
  return block.slice(0, cut);
}

function parseOfac(xml: string): ParsedEntry[] {
  const out: ParsedEntry[] = [];

  forEachElement(xml, "sdnEntry", (entry) => {
    const block = entry.inner;
    const head = ofacHead(block);

    const uid = tagText(head, "uid");
    const primary = joinName([
      tagText(head, "firstName"),
      tagText(head, "lastName"),
    ]);
    if (!uid || !primary) return;

    const aliases: string[] = [];
    const akaList = firstElement(block, "akaList");
    if (akaList) {
      forEachElement(akaList.inner, "aka", (aka) => {
        const name = joinName([
          tagText(aka.inner, "firstName"),
          tagText(aka.inner, "lastName"),
        ]);
        if (name) aliases.push(name);
      });
    }

    const programsEl = firstElement(block, "programList");
    const programs = programsEl ? allTagText(programsEl.inner, "program") : [];

    const countries: string[] = [];
    const addressList = firstElement(block, "addressList");
    if (addressList) countries.push(...allTagText(addressList.inner, "country"));
    const nationalityList = firstElement(block, "nationalityList");
    if (nationalityList)
      countries.push(...allTagText(nationalityList.inner, "country"));
    const citizenshipList = firstElement(block, "citizenshipList");
    if (citizenshipList)
      countries.push(...allTagText(citizenshipList.inner, "country"));

    const sdnType = tagText(head, "sdnType");

    out.push({
      entry_id: uid,
      primary_name: primary,
      aliases: uniqueStrings(aliases),
      entity_type: mapEntityType(sdnType),
      country: countries.length ? countries[0] : null,
      programs: uniqueStrings(programs),
      // The published SDN XML carries no designation date on the record.
      listed_date: null,
      raw: {
        uid,
        sdn_type: sdnType || null,
        title: tagText(head, "title") || null,
        programs: uniqueStrings(programs),
        countries: uniqueStrings(countries),
      },
    });
  });

  return out;
}

// ---------------------------------------------------------------------------
// Parser: UN Security Council consolidated list
// ---------------------------------------------------------------------------
// Shape: <CONSOLIDATED_LIST><INDIVIDUALS><INDIVIDUAL>...</INDIVIDUAL>
//        <ENTITIES><ENTITY>...</ENTITY>
// Names arrive split across FIRST_NAME to FOURTH_NAME. Entities put their whole
// name in FIRST_NAME.

function parseUnRecord(block: string, kind: "individual" | "entity"): ParsedEntry | null {
  const dataId = tagText(block, "DATAID");
  const primary = joinName([
    tagText(block, "FIRST_NAME"),
    tagText(block, "SECOND_NAME"),
    tagText(block, "THIRD_NAME"),
    tagText(block, "FOURTH_NAME"),
  ]);
  if (!dataId || !primary) return null;

  const aliasTag = kind === "individual" ? "INDIVIDUAL_ALIAS" : "ENTITY_ALIAS";
  const addressTag =
    kind === "individual" ? "INDIVIDUAL_ADDRESS" : "ENTITY_ADDRESS";

  const aliases: string[] = [];
  forEachElement(block, aliasTag, (el) => {
    const name = tagText(el.inner, "ALIAS_NAME");
    if (name) aliases.push(name);
  });
  const originalScript = tagText(block, "NAME_ORIGINAL_SCRIPT");
  if (originalScript) aliases.push(originalScript);

  const countries: string[] = [];
  const nationality = firstElement(block, "NATIONALITY");
  if (nationality) countries.push(...allTagText(nationality.inner, "VALUE"));
  forEachElement(block, addressTag, (el) => {
    const c = tagText(el.inner, "COUNTRY");
    if (c) countries.push(c);
  });

  const listType = tagText(block, "UN_LIST_TYPE");
  const reference = tagText(block, "REFERENCE_NUMBER");

  return {
    entry_id: dataId,
    primary_name: primary,
    aliases: uniqueStrings(aliases),
    entity_type: kind,
    country: countries.length ? countries[0] : null,
    programs: uniqueStrings([listType]),
    listed_date: toIsoDate(tagText(block, "LISTED_ON")),
    raw: {
      data_id: dataId,
      reference_number: reference || null,
      un_list_type: listType || null,
      countries: uniqueStrings(countries),
    },
  };
}

function parseUn(xml: string): ParsedEntry[] {
  const out: ParsedEntry[] = [];
  forEachElement(xml, "INDIVIDUAL", (el) => {
    const row = parseUnRecord(el.inner, "individual");
    if (row) out.push(row);
  });
  forEachElement(xml, "ENTITY", (el) => {
    const row = parseUnRecord(el.inner, "entity");
    if (row) out.push(row);
  });
  return out;
}

// ---------------------------------------------------------------------------
// Parser: EU Consolidated Financial Sanctions List
// ---------------------------------------------------------------------------
// Shape: <export><sanctionEntity logicalId=".." euReferenceNumber="..">
//          <regulation programme=".." publicationDate=".."/>
//          <subjectType code="person|enterprise"/>
//          <nameAlias wholeName=".." firstName=".." lastName=".." nameLanguage=".."/>
//          <citizenship countryDescription=".."/> <address countryDescription=".."/>
// Everything worth having is in attributes. The name aliases arrive in no
// useful order and include translations into other EU languages, so the entry
// with no nameLanguage is preferred as the primary and the rest become aliases.

function parseEu(xml: string): ParsedEntry[] {
  const out: ParsedEntry[] = [];

  forEachElement(xml, "sanctionEntity", (entity) => {
    const block = entity.inner;
    const logicalId = attr(entity.open, "logicalId");
    const euRef = attr(entity.open, "euReferenceNumber");
    const entryId = logicalId || euRef;
    if (!entryId) return;

    const names: { name: string; neutral: boolean }[] = [];
    forEachElement(block, "nameAlias", (el) => {
      const whole = attr(el.open, "wholeName");
      const name =
        whole ||
        joinName([
          attr(el.open, "firstName"),
          attr(el.open, "middleName"),
          attr(el.open, "lastName"),
        ]);
      if (!name) return;
      names.push({ name, neutral: attr(el.open, "nameLanguage") === "" });
    });
    if (!names.length) return;

    let primaryIndex = 0;
    for (let i = 0; i < names.length; i++) {
      if (names[i].neutral) {
        primaryIndex = i;
        break;
      }
    }
    const primary = names[primaryIndex].name;
    const aliases = uniqueStrings(
      names.filter((_, i) => i !== primaryIndex).map((n) => n.name),
    );

    const subject = firstElement(block, "subjectType");
    const entityType = subject ? mapEntityType(attr(subject.open, "code")) : null;

    const programs: string[] = [];
    let earliestPublication = "";
    forEachElement(block, "regulation", (el) => {
      const programme = attr(el.open, "programme");
      if (programme) programs.push(programme);
      const published = attr(el.open, "publicationDate");
      if (published && (!earliestPublication || published < earliestPublication)) {
        earliestPublication = published;
      }
    });

    const countries: string[] = [];
    forEachElement(block, "citizenship", (el) => {
      const c = attr(el.open, "countryDescription");
      if (c && c.toUpperCase() !== "UNKNOWN") countries.push(c);
    });
    forEachElement(block, "address", (el) => {
      const c = attr(el.open, "countryDescription");
      if (c && c.toUpperCase() !== "UNKNOWN") countries.push(c);
    });

    out.push({
      entry_id: entryId,
      primary_name: primary,
      aliases,
      entity_type: entityType,
      country: countries.length ? countries[0] : null,
      programs: uniqueStrings(programs),
      listed_date:
        toIsoDate(attr(entity.open, "designationDate")) ||
        toIsoDate(earliestPublication),
      raw: {
        logical_id: logicalId || null,
        eu_reference_number: euRef || null,
        united_nation_id: attr(entity.open, "unitedNationId") || null,
        programmes: uniqueStrings(programs),
        countries: uniqueStrings(countries),
      },
    });
  });

  return out;
}

// ---------------------------------------------------------------------------
// Parser: UK OFSI consolidated list, CSV
// ---------------------------------------------------------------------------
// The file opens with a "Last Updated,<date>" line, then a header row, then one
// row per name variation. Rows belonging to the same designation share a
// Group ID, so rows are grouped and the "Primary name" row becomes the entry.
// Name parts run Name 1 to Name 6 with the family name in Name 6, and the
// column order in the file puts Name 6 first, so the columns are read by
// header name and never by position.

/** RFC 4180 style CSV, tolerant of quoted commas, quoted newlines and CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < body.length; i++) {
    const ch = body.charAt(i);
    if (inQuotes) {
      if (ch === '"') {
        if (body.charAt(i + 1) === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const OFSI_NAME_COLUMNS = [
  "Name 1",
  "Name 2",
  "Name 3",
  "Name 4",
  "Name 5",
  "Name 6",
];

function parseOfsi(csv: string): ParsedEntry[] {
  const rows = parseCsv(csv);

  let headerIndex = -1;
  for (let i = 0; i < rows.length && i < 10; i++) {
    if (rows[i].indexOf("Group ID") !== -1) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) return [];

  const header = rows[headerIndex];
  const col: Record<string, number> = {};
  for (let i = 0; i < header.length; i++) col[header[i].trim()] = i;

  const get = (row: string[], name: string): string => {
    const idx = col[name];
    if (idx === undefined || idx >= row.length) return "";
    return (row[idx] || "").trim();
  };

  const rowName = (row: string[]): string =>
    joinName(OFSI_NAME_COLUMNS.map((c) => get(row, c)));

  const order: string[] = [];
  const groups: Record<string, string[][]> = {};
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    const groupId = get(row, "Group ID");
    if (!groupId) continue;
    if (!groups[groupId]) {
      groups[groupId] = [];
      order.push(groupId);
    }
    groups[groupId].push(row);
  }

  const out: ParsedEntry[] = [];
  for (let g = 0; g < order.length; g++) {
    const groupId = order[g];
    const groupRows = groups[groupId];

    let primaryRow = groupRows[0];
    for (let i = 0; i < groupRows.length; i++) {
      if (get(groupRows[i], "Alias Type") === "Primary name") {
        primaryRow = groupRows[i];
        break;
      }
    }

    const primary = rowName(primaryRow);
    if (!primary) continue;

    const aliases: string[] = [];
    for (let i = 0; i < groupRows.length; i++) {
      if (groupRows[i] === primaryRow) continue;
      const name = rowName(groupRows[i]);
      if (name && name.toLowerCase() !== primary.toLowerCase()) aliases.push(name);
      const nonLatin = get(groupRows[i], "Name Non-Latin Script");
      if (nonLatin) aliases.push(nonLatin);
    }
    const primaryNonLatin = get(primaryRow, "Name Non-Latin Script");
    if (primaryNonLatin) aliases.push(primaryNonLatin);

    const programs: string[] = [];
    for (let i = 0; i < groupRows.length; i++) {
      const regime = get(groupRows[i], "Regime");
      if (regime) programs.push(regime);
    }

    out.push({
      entry_id: groupId,
      primary_name: primary,
      aliases: uniqueStrings(aliases),
      entity_type: mapEntityType(get(primaryRow, "Group Type")),
      country:
        get(primaryRow, "Country") ||
        get(primaryRow, "Nationality") ||
        get(primaryRow, "Country of Birth") ||
        null,
      programs: uniqueStrings(programs),
      listed_date:
        toIsoDate(get(primaryRow, "Listed On")) ||
        toIsoDate(get(primaryRow, "UK Sanctions List Date Designated")),
      raw: {
        group_id: groupId,
        group_type: get(primaryRow, "Group Type") || null,
        regimes: uniqueStrings(programs),
        rows: groupRows.length,
      },
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export const SOURCES: SourceConfig[] = [
  {
    source: "OFAC_SDN",
    label: "OFAC SDN",
    url: "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML",
    parse: parseOfac,
    minExpectedEntries: 5000,
  },
  {
    source: "OFAC_CONS",
    label: "OFAC consolidated non SDN",
    url: "https://www.treasury.gov/ofac/downloads/consolidated/consolidated.xml",
    parse: parseOfac,
    minExpectedEntries: 100,
  },
  {
    source: "EU_CFSL",
    label: "EU consolidated financial sanctions list",
    // The token is the public one the Commission publishes for the open feed.
    url: "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw",
    parse: parseEu,
    minExpectedEntries: 1000,
  },
  {
    source: "UN_SC",
    label: "UN Security Council consolidated list",
    url: "https://scsanctions.un.org/resources/xml/en/consolidated.xml",
    parse: parseUn,
    minExpectedEntries: 300,
  },
  {
    source: "UK_OFSI",
    label: "UK OFSI consolidated list",
    url: "https://ofsistorage.blob.core.windows.net/publishlive/2022format/ConList.csv",
    parse: parseOfsi,
    minExpectedEntries: 1000,
  },
];

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

type StagedRow = {
  source_list: string;
  entry_id: string;
  primary_name: string;
  normalized_name: string;
  aliases: string[];
  normalized_aliases: string[];
  entity_type: string | null;
  country: string | null;
  programs: string[];
  listed_date: string | null;
  raw: Record<string, unknown>;
  imported_at: string;
};

function toRows(
  source: SourceList,
  entries: ParsedEntry[],
  stamp: string,
): StagedRow[] {
  // One row per entry_id. A feed that repeats an id would otherwise make
  // Postgres reject the whole batch, since a single statement cannot update
  // the same conflicting row twice. Last write wins, which matches how these
  // publishers amend a record in place.
  const byId: Record<string, StagedRow> = {};
  const order: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const normalized = normalizeName(e.primary_name);
    if (!normalized) continue;

    if (!byId[e.entry_id]) order.push(e.entry_id);
    byId[e.entry_id] = {
      source_list: source,
      entry_id: e.entry_id,
      primary_name: e.primary_name,
      normalized_name: normalized,
      aliases: e.aliases,
      normalized_aliases: uniqueStrings(
        e.aliases.map(normalizeName).filter(Boolean),
      ),
      entity_type: e.entity_type,
      country: e.country,
      programs: e.programs,
      listed_date: e.listed_date,
      raw: e.raw,
      imported_at: stamp,
    };
  }

  return order.map((id) => byId[id]);
}

/**
 * Load one source.
 *
 * Upsert on (source_list, entry_id) with this run's timestamp, then sweep the
 * rows for that source that the run did not touch.
 *
 * Chosen over delete then insert because there is no moment at which the list
 * is empty. A delete then insert leaves a window, however short, where a
 * screening running concurrently sees no rows for a source and reports a
 * subject clean. That failure is silent, it looks exactly like a real clean
 * result, and it is the one outcome this whole engine exists to prevent. With
 * upsert then sweep, a concurrent screening always sees either the old row or
 * the new row for every entry that is still listed.
 *
 * The sweep only runs after every chunk has landed. A refresh that dies half
 * way therefore leaves a superset of the correct list, never a subset.
 */
async function loadSource(
  source: SourceList,
  rows: StagedRow[],
  stamp: string,
): Promise<void> {
  const sb = createAdminClient();

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    const { error } = await sb
      .from("sanctions_entries")
      .upsert(chunk, { onConflict: "source_list,entry_id" });
    if (error) {
      throw new Error(
        `${source}: upsert failed at row ${i} of ${rows.length}, ${error.message}`,
      );
    }
  }

  const { error: sweepError } = await sb
    .from("sanctions_entries")
    .delete()
    .eq("source_list", source)
    .lt("imported_at", stamp);
  if (sweepError) {
    throw new Error(
      `${source}: sweep of delisted entries failed, ${sweepError.message}`,
    );
  }
}

async function writeLog(summary: RefreshSummary): Promise<void> {
  try {
    const sb = createAdminClient();
    await sb.from("sanctions_refresh_log").insert({
      source_list: summary.source,
      entry_count: summary.entryCount,
      status: summary.status,
      error: summary.error,
      duration_ms: summary.durationMs,
    });
  } catch (err) {
    // Losing the audit line must not lose the list. Log and carry on.
    console.error(
      "[ponte] sanctions_refresh_log insert failed:",
      (err as Error).message,
    );
  }
}

/**
 * Refresh a single source. Never throws: a failure is returned as a summary
 * and written to sanctions_refresh_log.
 */
export async function refreshSource(
  config: SourceConfig,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<RefreshSummary> {
  const started = Date.now();
  const stamp = new Date().toISOString();

  try {
    const body = await fetchText(config.url, config.label, timeoutMs);
    const entries = config.parse(body);

    if (entries.length < config.minExpectedEntries) {
      throw new Error(
        `${config.label}: parsed only ${entries.length} entries, expected at least ${config.minExpectedEntries}. The feed shape has probably changed. The previously loaded list has been left in place.`,
      );
    }

    const rows = toRows(config.source, entries, stamp);
    await loadSource(config.source, rows, stamp);

    const summary: RefreshSummary = {
      source: config.source,
      status: "ok",
      entryCount: rows.length,
      durationMs: Date.now() - started,
      error: null,
    };
    await writeLog(summary);
    return summary;
  } catch (err) {
    // Never include a record in this message, only the source and the reason.
    const summary: RefreshSummary = {
      source: config.source,
      status: "failed",
      entryCount: 0,
      durationMs: Date.now() - started,
      error: (err as Error).message.slice(0, 500),
    };
    await writeLog(summary);
    return summary;
  }
}

/**
 * Refresh every source.
 *
 * Sequential on purpose. These files run to tens of megabytes and holding four
 * of them in memory at once is how a serverless function gets killed. One
 * source failing never stops the others: the failure is logged and the run
 * continues, because three fresh lists and one stale list is a far better
 * position than four stale lists.
 */
export async function refreshAll(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<RefreshSummary[]> {
  const summaries: RefreshSummary[] = [];
  for (let i = 0; i < SOURCES.length; i++) {
    summaries.push(await refreshSource(SOURCES[i], timeoutMs));
  }
  return summaries;
}

// Parsers are exported for the loader tests and for a one off reparse of a
// saved feed. They are pure functions of the feed body.
export const parsers = {
  parseOfac,
  parseUn,
  parseEu,
  parseOfsi,
  parseCsv,
};
