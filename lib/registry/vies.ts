// EU VAT validation through VIES.
//
// Free service run by the European Commission, no key, no account. It is a
// SOAP 1.1 endpoint: the envelope below is built by hand and the answer is
// parsed with tolerant regular expressions, so no XML dependency is added.
//
// Endpoint:
//   POST https://ec.europa.eu/taxation_customs/vies/services/checkVatService
//   namespace urn:ec.europa.eu:taxud:vies:services:checkVat:types
//
// VIES is a proxy onto 27 national tax systems and any one of them can be
// down, busy or slow. A timeout, a SOAP fault or a malformed answer returns
// available:false with a reason. It never returns valid:false for those,
// because "the Italian tax system was offline" and "this VAT number is fake"
// must not look the same to the pipeline.
//
// Note: GB numbers have not been in VIES since Brexit. Northern Ireland uses
// the XI prefix and is still covered.

const ENDPOINT = "https://ec.europa.eu/taxation_customs/vies/services/checkVatService";
const NAMESPACE = "urn:ec.europa.eu:taxud:vies:services:checkVat:types";
const SOURCE = "VIES";
const TIMEOUT_MS = 10_000;

export const VIES_COUNTRY_CODES = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR",
  "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO",
  "SE", "SI", "SK", "XI",
] as const;

const CODES = new Set<string>(VIES_COUNTRY_CODES);

export type VatCheckResult = {
  source: "VIES";
  available: boolean;
  reason?: string;
  valid?: boolean;
  countryCode?: string;
  vatNumber?: string;
  name?: string;
  address?: string;
  requestDate?: string;
  checkedAt: string;
};

/**
 * Validate an EU VAT number.
 *
 * available:true means VIES answered, and `valid` then carries its answer.
 * available:false means it did not answer usefully, and `valid` is left
 * undefined on purpose so nothing downstream can read a silence as a refusal.
 */
export async function checkVat(
  countryCode: string,
  vatNumber: string,
): Promise<VatCheckResult> {
  const checkedAt = new Date().toISOString();
  const country = normalizeCountry(countryCode);
  const number = normalizeVat(vatNumber, country);

  if (!country || !CODES.has(country)) {
    return {
      source: SOURCE,
      available: false,
      reason: `VIES not called, ${countryCode ? `"${countryCode}"` : "an empty value"} is not an EU VAT country code covered by the service`,
      countryCode: countryCode?.trim().toUpperCase() || undefined,
      vatNumber: vatNumber?.trim().toUpperCase() || undefined,
      checkedAt,
    };
  }
  if (!number) {
    return {
      source: SOURCE,
      available: false,
      reason: "VIES not called, the VAT number supplied was empty",
      countryCode: country,
      checkedAt,
    };
  }

  const envelope = buildEnvelope(country, number);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let xml: string;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "",
        Accept: "text/xml",
      },
      body: envelope,
      signal: controller.signal,
      cache: "no-store",
    });

    // A SOAP fault arrives as HTTP 500 with a useful body, so the body is
    // read before the status is judged.
    xml = await res.text();

    if (!res.ok && !/fault/i.test(xml)) {
      return {
        source: SOURCE,
        available: false,
        reason: `VIES returned HTTP ${res.status} ${res.statusText}`.trim(),
        countryCode: country,
        vatNumber: number,
        checkedAt,
      };
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        source: SOURCE,
        available: false,
        reason: `VIES timed out after ${TIMEOUT_MS / 1000} seconds`,
        countryCode: country,
        vatNumber: number,
        checkedAt,
      };
    }
    const detail = err instanceof Error ? err.message : "unknown error";
    return {
      source: SOURCE,
      available: false,
      reason: `VIES request failed: ${detail}`,
      countryCode: country,
      vatNumber: number,
      checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }

  const fault = readTag(xml, "faultstring") ?? readTag(xml, "Text");
  if (fault) {
    return {
      source: SOURCE,
      available: false,
      reason: `VIES fault: ${describeFault(fault)}`,
      countryCode: country,
      vatNumber: number,
      checkedAt,
    };
  }

  const validRaw = readTag(xml, "valid");
  if (validRaw === undefined) {
    return {
      source: SOURCE,
      available: false,
      reason: "VIES answered but the response carried no validity element",
      countryCode: country,
      vatNumber: number,
      checkedAt,
    };
  }

  const valid = /^true$/i.test(validRaw);
  return {
    source: SOURCE,
    available: true,
    valid,
    countryCode: readTag(xml, "countryCode") ?? country,
    vatNumber: readTag(xml, "vatNumber") ?? number,
    // Several member states withhold the trader details and send "---".
    name: cleanField(readTag(xml, "name")),
    address: cleanField(readTag(xml, "address")),
    requestDate: readTag(xml, "requestDate"),
    checkedAt,
  };
}

// ---------------------------------------------------------------------------
// SOAP
// ---------------------------------------------------------------------------

function buildEnvelope(country: string, vat: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="${NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${escapeXml(country)}</urn:countryCode>
      <urn:vatNumber>${escapeXml(vat)}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// Tolerant on purpose: VIES prefixes elements with ns2, tns or nothing at
// all depending on the day, and self closing empty elements do appear.
function readTag(xml: string, tag: string): string | undefined {
  const prefix = "(?:[A-Za-z0-9_.-]+:)?";
  const selfClosing = new RegExp(`<${prefix}${tag}\\b[^>]*/>`, "i");
  const paired = new RegExp(`<${prefix}${tag}\\b[^>]*>([\\s\\S]*?)</${prefix}${tag}\\s*>`, "i");
  const match = xml.match(paired);
  if (match) return decodeXml(match[1]).trim();
  if (selfClosing.test(xml)) return "";
  return undefined;
}

// The published fault codes. Every one of them means "no answer", never
// "invalid VAT number".
function describeFault(fault: string): string {
  const code = fault.trim().toUpperCase();
  const known: Record<string, string> = {
    INVALID_INPUT: "the country code or VAT number was rejected as malformed, the number was not validated",
    SERVICE_UNAVAILABLE: "the VIES service is unavailable",
    MS_UNAVAILABLE: "the member state register is unavailable",
    MS_MAX_CONCURRENT_REQ: "the member state register is over its concurrent request limit",
    GLOBAL_MAX_CONCURRENT_REQ: "VIES is over its global concurrent request limit",
    SERVER_BUSY: "the VIES server is busy",
    TIMEOUT: "the member state register timed out",
    INVALID_REQUESTER_INFO: "the requester information was rejected",
  };
  return known[code] ? `${code}, ${known[code]}` : code;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeCountry(input: string): string {
  const code = (input ?? "").trim().toUpperCase();
  // Greece files VAT under EL, not under its ISO code.
  if (code === "GR") return "EL";
  return code;
}

// Traders write the country prefix into the number itself, and VIES rejects
// the number when it is still there.
function normalizeVat(input: string, country: string): string {
  let vat = (input ?? "").replace(/[\s.\-/]/g, "").toUpperCase();
  if (country && vat.startsWith(country)) vat = vat.slice(country.length);
  if (country === "EL" && vat.startsWith("GR")) vat = vat.slice(2);
  return vat;
}

function cleanField(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "---") return undefined;
  return trimmed.replace(/\s*\n\s*/g, ", ");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}
