/**
 * Generate Ponte Trade product-page .docx files from inline content.
 *
 * Usage:
 *   npm install -g docx   (once)
 *   node generate-docx.js
 *
 * Output: four .docx files next to this script.
 *
 * The .md files in this folder are the editorial source of truth. This
 * generator carries the same content with Ponte-brand styling for marketing
 * and external distribution.
 */

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageBreak,
  TabStopType, TabStopPosition,
} = require("docx");

// ---------- shared style ----------

const PONTE_NAVY = "0A1628";
const PONTE_BLUE = "1A3A5C";
const PONTE_GOLD = "E8A020";
const TEXT_GREY = "555555";
const RULE_GREY = "CCD6E0";

const styles = {
  default: {
    document: { run: { font: "Arial", size: 22 } }, // 11pt
  },
  paragraphStyles: [
    {
      id: "Heading1",
      name: "Heading 1",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size: 36, bold: true, font: "Arial", color: PONTE_NAVY },
      paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
    },
    {
      id: "Heading2",
      name: "Heading 2",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size: 28, bold: true, font: "Arial", color: PONTE_BLUE },
      paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
    },
    {
      id: "Heading3",
      name: "Heading 3",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size: 24, bold: true, font: "Arial", color: PONTE_BLUE },
      paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 2 },
    },
  ],
};

const numbering = {
  config: [
    {
      reference: "bullets",
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
    {
      reference: "numbers",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
  ],
};

// ---------- builder helpers ----------

const para = (text, opts = {}) =>
  new Paragraph({
    children: [new TextRun({ text, ...opts.run })],
    spacing: { before: 80, after: 120 },
    ...opts.paragraph,
  });

const body = (text) =>
  new Paragraph({
    children: [new TextRun({ text, color: TEXT_GREY, size: 22 })],
    spacing: { before: 80, after: 120 },
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun(text)],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun(text)],
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun(text)],
  });

const bullet = (text) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, color: TEXT_GREY, size: 22 })],
    spacing: { before: 40, after: 40 },
  });

const numbered = (text) =>
  new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    children: [new TextRun({ text, color: TEXT_GREY, size: 22 })],
    spacing: { before: 40, after: 40 },
  });

const callout = (text) =>
  new Paragraph({
    children: [new TextRun({ text, color: PONTE_NAVY, size: 24, italics: true })],
    spacing: { before: 200, after: 200 },
    alignment: AlignmentType.LEFT,
  });

const ruleParagraph = () =>
  new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: PONTE_GOLD, space: 1 },
    },
    spacing: { before: 200, after: 200 },
  });

const spacer = () => new Paragraph({ spacing: { before: 80, after: 80 } });

// Simple two- or three-column table with grey borders
function table(rowsData, columnWidths) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: RULE_GREY };
  const borders = { top: border, bottom: border, left: border, right: border };
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths,
    rows: rowsData.map((row, ri) =>
      new TableRow({
        children: row.map((cellText, ci) =>
          new TableCell({
            borders,
            width: { size: columnWidths[ci], type: WidthType.DXA },
            shading: ri === 0
              ? { fill: "EEF3F8", type: ShadingType.CLEAR }
              : { fill: "FFFFFF", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cellText,
                    bold: ri === 0,
                    color: ri === 0 ? PONTE_NAVY : TEXT_GREY,
                    size: 22,
                  }),
                ],
                spacing: { before: 20, after: 20 },
              }),
            ],
          })
        ),
      })
    ),
  });
}

// Cover block: brand mark + title + subtitle + meta
function cover(title, subtitle, meta) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 0 },
      children: [
        new TextRun({
          text: "PONTE TRADE",
          bold: true,
          color: PONTE_NAVY,
          size: 48,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 360 },
      children: [
        new TextRun({
          text: "ponte.trade  ·  an ICTTM company",
          color: TEXT_GREY,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: PONTE_GOLD, space: 4 },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: PONTE_GOLD, space: 4 },
      },
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          color: PONTE_NAVY,
          size: 48,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({ text: subtitle, color: PONTE_BLUE, size: 28 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 0 },
      children: [
        new TextRun({ text: meta, color: TEXT_GREY, size: 22 }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// SKU header block (used on product sections within a doc)
function skuBlock(sku, price, sla, tier) {
  const parts = [sku, price, sla];
  if (tier) parts.push(tier);
  return new Paragraph({
    spacing: { before: 80, after: 240 },
    children: [
      new TextRun({
        text: parts.join("  ·  "),
        bold: true,
        color: PONTE_GOLD,
        size: 24,
      }),
    ],
  });
}

// Footer
function pageFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Ponte Trade  ·  ponte.trade  ·  an ICTTM company  ·  Wave 4 (May 2026)",
            color: TEXT_GREY,
            size: 18,
          }),
        ],
      }),
    ],
  });
}

// ---------- document 01: Trade Intelligence Products ----------

function doc01() {
  return new Document({
    styles,
    numbering,
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: { default: pageFooter() },
        children: [
          ...cover(
            "Trade Intelligence Products",
            "Buyer/Supplier Intelligence + Trade Corridor Report",
            "Product Page  ·  Wave 4  ·  May 2026"
          ),

          h1("The decisions these solve"),
          bullet("Who should I be selling to? — find qualified buyers"),
          bullet("Who should I be sourcing from? — find qualified suppliers"),
          bullet("What’s actually flowing on a specific origin–destination corridor? — volumes, prices, operators, seasonality"),
          body("Both products are powered by ADAMftd transaction-level customs and bill-of-lading data — actual import and export transactions with real company names, real prices, real ports. Both are delivered as senior-analyst-curated licensed PDFs. Bought once. No subscription. No credits. No platform login."),
          ruleParagraph(),

          h1("CI-003 — Buyer/Supplier Intelligence"),
          skuBlock("CI-003", "From $2,000", "48-hour delivery", "Tier B"),
          body("A ranked, contactable shortlist of qualified buyers OR suppliers for one HS code. Senior-analyst-curated from transaction-level customs records."),

          h3("You configure"),
          bullet("Role — looking for buyers OR suppliers"),
          bullet("HS code (one)"),
          bullet("Pack size — Top 50, 100, 200, or 500"),
          bullet("Target market (optional)"),

          h3("Pricing by pack size"),
          table(
            [
              ["Pack", "Price"],
              ["Top 50",  "$2,000"],
              ["Top 100", "$3,000"],
              ["Top 200", "$5,000"],
              ["Top 500", "$11,000"],
            ],
            [3600, 5760]
          ),
          spacer(),

          h3("What you get in the PDF"),
          bullet("Ranked counterparty list (by trade volume)"),
          bullet("Company name, country, estimated annual volumes"),
          bullet("Verified contact details where available (Top 100+)"),
          bullet("Counterparty risk flags (sanctions screen)"),
          bullet("Methodology and full source citations"),
          bullet("Single-organisation licence"),

          h3("When to commission CI-003"),
          bullet("You’re entering a new market and need to identify buyers"),
          bullet("You’re diversifying sourcing and need supplier alternatives"),
          bullet("You’re evaluating partnership candidates and need volume context"),
          bullet("You’re a trade-finance team validating counterparty quality"),

          h3("What CI-003 is not"),
          body("Not a CRM. Not a contact-database subscription. Not a list export from a business directory. Each shortlist is curated by a senior analyst against transaction evidence and screened for sanctions exposure."),
          ruleParagraph(),

          h1("MR-004 — Trade Corridor Report"),
          skuBlock("MR-004", "$399", "48-hour delivery", "Tier A"),
          body("Origin-to-destination product flow analysis for one HS code: who’s shipping, how much, at what prices, through which ports."),

          h3("You configure"),
          bullet("Origin country"),
          bullet("Destination country"),
          bullet("HS code (one)"),

          h3("What you get in the PDF"),
          bullet("Corridor volume and value, 5-year trend"),
          bullet("Unit price analysis (CIF, FOB where derivable)"),
          bullet("Top shipping operators and routes"),
          bullet("Leading ports of loading and discharge"),
          bullet("Seasonal flow patterns"),
          bullet("Key trade partners on the corridor"),
          bullet("Methodology and full source citations"),
          bullet("Single-organisation licence"),

          h3("When to commission MR-004"),
          bullet("You’re pricing a new lane and need price benchmarks"),
          bullet("You’re assessing competitor flow on a corridor where you operate"),
          bullet("You’re a trade-finance or freight-forwarder team underwriting trade"),
          bullet("You’re investigating a sourcing arbitrage between corridors"),

          h3("What MR-004 is not"),
          body("Not a real-time tracking feed. Not a vessel-by-vessel AIS dashboard. Not a raw shipment dump. The deliverable is an analyst-written PDF answering: “what does this corridor look like and what should we do about it?”"),
          ruleParagraph(),

          h1("About the data behind both products"),
          body("Both products use ADAMftd’s transaction-level dataset, which combines customs declarations and bill-of-lading filings from 30+ source countries."),

          h3("Strong coverage"),
          body("United States, Latin America (Mexico, Brazil, Colombia, Chile, Peru, Ecuador), India, Pakistan, Bangladesh, Vietnam, Philippines, Russia, Ukraine, and many African nations."),

          h3("Limited or no coverage"),
          body("Intra-EU trade (no internal customs barriers), China exports (restricted), Japan, South Korea, Australia, Canada, and some Middle Eastern countries."),

          h3("Price extrapolation where direct data is unavailable"),
          body("Where direct data isn’t available for a specific route, Ponte analysts use price extrapolation from related corridors with visible data. For example: German tyres arriving at US ports at $45–55/unit CIF allow us to derive a likely intra-EU FOB range for the same product flowing Germany→Italy, where no customs records exist. This kind of triangulation is what an analyst does that raw data alone cannot."),
          ruleParagraph(),

          h1("Trade data vs. statistical data — why this matters"),
          table(
            [
              ["",            "Transaction data (Ponte)",                 "Statistical data"],
              ["Built from",  "Customs declarations + BoLs",              "Aggregated national totals"],
              ["Shows",       "Real buyer & supplier names",              "Country-level flows only"],
              ["Granularity", "Per-shipment prices, ports, HS",           "Average prices, no detail"],
              ["Best for",    "Decisions involving specific counterparties", "Macro trends, policy work"],
            ],
            [2160, 3600, 3600]
          ),
          spacer(),
          body("Statistical data tells you: “Vietnam exported $2.3bn of footwear to the US in 2024.” Transaction data tells you: “Nike Inc. imported 42,000 pairs of running shoes from Pou Chen Corp (Vietnam) via Long Beach on 15 March 2024 at $18.50/pair under HS 6404.11.90.”"),
          body("Ponte uses both. CI-003 and MR-004 are the products that turn transaction data into a decision."),
        ],
      },
    ],
  });
}

// ---------- document 02: CT-002 ----------

function doc02() {
  return new Document({
    styles,
    numbering,
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: { default: pageFooter() },
        children: [
          ...cover(
            "Tariff & Landed Cost Strategic Brief",
            "CT-002  ·  $299  ·  48-hour delivery",
            "Product Page  ·  Wave 4  ·  May 2026"
          ),

          h1("The decision you’re making"),
          callout("“Will this product be profitable after duty, and what is the cheapest legal way to bring it in?”"),
          body("If that’s the question, CT-002 is the answer. A senior-analyst-curated licensed PDF covering tariff classification, duty rates, landed-cost build-up, and mitigation strategy for ONE product on ONE origin-destination corridor. Bought once. No subscription. No credits."),
          ruleParagraph(),

          h1("You configure"),
          bullet("HS code (one)"),
          bullet("Origin country"),
          bullet("Destination country"),
          body("Three inputs. That’s the order. Your analyst takes it from there."),
          ruleParagraph(),

          h1("What you get in the PDF"),
          h3("Classification"),
          bullet("HS / HTS classification check (right code, right rate)"),
          bullet("Disambiguation between adjacent classifications where margin is at risk"),

          h3("Duty rate landscape"),
          bullet("Baseline MFN rate"),
          bullet("Preferential FTA rate (with origin-rule qualification analysis)"),
          bullet("Anti-dumping (ADD) and countervailing (CVD) duties where in force"),
          bullet("Safeguard duties where applicable"),
          bullet("Unilateral measures: Section 301, Section 232, equivalent regimes"),

          h3("Customs valuation"),
          bullet("Customs value calculation against the chosen Incoterm"),
          bullet("First-sale and deductive-value options where relevant"),

          h3("Landed-cost build-up"),
          bullet("Duty + VAT/GST + customs processing fees + freight + insurance + inspection"),
          bullet("Total landed cost as a single defensible number"),

          h3("Mitigation matrix — with quantified savings ranges"),
          bullet("FTA / preferential routing options"),
          bullet("Classification review opportunities"),
          bullet("Valuation strategy (first-sale, deductive value)"),
          bullet("Origin restructuring options"),
          bullet("Free Trade Zone / inward processing routes"),

          h3("Forward planning"),
          bullet("Announced rate changes hitting in the next 12 months"),
          bullet("Expiring FTAs and renegotiation status"),
          bullet("Pending trade-defence cases that could change the rate"),
          bullet("Tariff history (last 5 years) for trend context"),

          h3("Standard inclusions"),
          bullet("Methodology and full source citations"),
          bullet("Single-organisation licence"),
          ruleParagraph(),

          h1("Worked example — Laptop, China → US (HS 8471.30)"),
          table(
            [
              ["Component",                            "Rate",       "Amount on $1,000 customs value"],
              ["MFN duty",                             "0%",         "$0"],
              ["Section 301 (List 3)",                 "25%",        "$250"],
              ["Harbor Maintenance Fee",               "0.125%",     "$1.25"],
              ["Merchandise Processing Fee",           "—",     "~$30"],
              ["Total US duty + fees",                 "",           "~$281"],
            ],
            [3600, 1800, 3960]
          ),
          spacer(),
          body("A zero MFN rate doesn’t protect against Section 301, ADD, or safeguard duties. The mitigation analysis in your CT-002 brief identifies whether shifting origin (e.g. to Vietnam or Mexico under USMCA) clears the Section 301 layer, and quantifies the savings net of re-routing cost."),
          ruleParagraph(),

          h1("When to commission CT-002"),
          bullet("You’re pricing a new sourcing lane and need a defensible landed-cost number"),
          bullet("A duty rate change has hit your margin and you need mitigation options"),
          bullet("You’re considering an FTA-qualified origin shift"),
          bullet("You’re filing or contesting an ADD/CVD case and need the duty landscape mapped"),
          bullet("You’re an importer optimising duty drawback or first-sale strategy"),
          bullet("You’re a trade-finance team underwriting a margin-sensitive trade"),
          ruleParagraph(),

          h1("What CT-002 is not"),
          body("Not a self-serve calculator. Not an HS-lookup database. Not a duty-rate API subscription. Each brief is written by a senior trade-customs analyst who interprets the rules in the context of your specific corridor — including the cases where the published rate isn’t the rate you’ll actually pay."),
          ruleParagraph(),

          h1("Data sources"),
          body("WTO Tariff Database  ·  ITC Market Access Map  ·  national customs authorities (CBP, EU TARIC, HMRC, etc.)  ·  USITC  ·  official Federal Register / EU Official Journal notices for Section 301, ADD, CVD, and safeguard cases."),
          ruleParagraph(),

          h1("How duties actually work — the background"),
          body("Every import duty calculation depends on three factors:"),
          numbered("HS / HTS code — classification determines the rate. First six digits universal; further digits country-specific (US HTS, EU TARIC). Wrong code, wrong rate."),
          numbered("Customs value — usually the transaction value (price paid or payable) plus insurance, freight, and other costs per the Incoterm. CIF is the most common base globally."),
          numbered("Duty rate — depends on HS code, country of origin, and any trade agreements in force. MFN, FTA, ADD, CVD, safeguard, and unilateral measures can apply simultaneously — or not at all."),
          body("Beyond duties, total landed cost includes VAT/GST (most countries 10–25% on the duty-inclusive customs value), customs processing fees, the US Harbor Maintenance Fee (0.125% on sea cargo), excise duties on alcohol, tobacco and fuel, and inspection and compliance costs (phytosanitary certificates, conformity assessments, lab testing). A CT-002 brief addresses every one of these where they apply to your specific corridor."),
        ],
      },
    ],
  });
}

// ---------- document 03: MA-100 + MA-002 ----------

function doc03() {
  return new Document({
    styles,
    numbering,
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: { default: pageFooter() },
        children: [
          ...cover(
            "Market Analysis Reports",
            "Single-topic and modular senior-analyst briefs",
            "Product Page  ·  Wave 4  ·  May 2026"
          ),

          h1("The decision you’re making"),
          callout("“Before I commit time, money, or capacity to this market, what do I need to understand about consumer demand, retail structure, competitors, and entry barriers?”"),
          body("If your question fits inside one dimension → MA-100. If it spans several → MA-002. If it’s a full strategic read on a country → upgrade to MR-001."),
          ruleParagraph(),

          h1("MA-100 — Single Market Analysis Report"),
          skuBlock("MA-100", "$299", "48-hour delivery", "Tier A  ·  Live today"),
          body("A focused senior-analyst brief on ONE of the eleven dimensions, for ONE HS code, in ONE country. Best for buyers with a specific question."),

          h3("You configure"),
          bullet("Topic — pick one of the eleven dimensions below"),
          bullet("HS code (one)"),
          bullet("Target country (one)"),

          h3("What you get in the PDF"),
          bullet("Analyst-written brief on the selected topic"),
          bullet("Data-backed findings with full source citations"),
          bullet("Methodology appendix"),
          bullet("Single-organisation licence"),

          h3("When to commission MA-100"),
          bullet("You already know the country and the product, but need to understand ONE specific dimension"),
          bullet("You’re stress-testing one assumption before a bigger commitment"),
          bullet("You need a defensible answer to a single board-level question"),
          ruleParagraph(),

          h1("MA-002 — Modular Market Analysis Report ✦ NEW"),
          skuBlock("MA-002", "Pricing TBD (reflects modules selected)", "48-hour delivery", "Tier A"),
          body("A structured multi-module report where you tick the dimensions you need from the eleven-module menu. The analyst delivers each selected module as a section of the licensed PDF. Pricing scales with the number of modules."),

          h3("You configure"),
          bullet("HS code (one)"),
          bullet("Target country (one)"),
          bullet("Module selection — any combination of the eleven dimensions"),

          h3("What you get in the PDF"),
          bullet("Each selected module delivered as a structured section"),
          bullet("Each section data-backed with full source citations"),
          bullet("Consolidated methodology appendix"),
          bullet("Single-organisation licence"),

          h3("When to commission MA-002"),
          bullet("You need more than one dimension but less than a full Country MR"),
          bullet("You want predictable scope and a structured, modular deliverable"),
          bullet("You’re scoping a market with a defined-perimeter question — e.g. “can I sell organic pasta in Germany?” → market size + consumer preferences + retail snapshot + certifications"),
          ruleParagraph(),

          h1("The eleven-dimension framework"),

          h2("Market Overview — six dimensions"),
          numbered("Retail Snapshot — major retailers, channel mix (modern / traditional / e-com), price-band segmentation, private-label strength"),
          numbered("Market Size & Demand — TAM, historical trends, current-year estimates, 3–5 year demand outlook"),
          numbered("Consumer Preferences — preferred formats, packaging, quality tiers, brand loyalty vs. price sensitivity, cultural drivers"),
          numbered("Market Sentiment — trade press, buyer feedback, social signals, regulatory climate"),
          numbered("Seasonal Demand — month-by-month profile, peaks, troughs, regulatory seasonal triggers"),
          numbered("Local Production — domestic supply capacity vs. structural import gap"),

          h2("Trade Readiness — five dimensions"),
          numbered("Substitutes & Competitors — direct substitutes, price positioning, market share estimates"),
          numbered("SWOT Analysis — product-country specific strengths, weaknesses, opportunities, threats"),
          numbered("Entry Barriers — licensing, phytosanitary and food safety standards, distribution complexity, buyer concentration"),
          numbered("Packaging & Labelling — mandatory language, nutrition labels, origin marking, sustainability mandates"),
          numbered("Quality & Certifications — required certs (HACCP, BRC, IFS, SQF, ISO, EN, ASTM), timelines and cost estimates"),
          ruleParagraph(),

          h1("How to choose between MA-100, MA-002, and MR-001"),
          table(
            [
              ["Need",                                                    "Product"],
              ["One specific question",                                    "MA-100 ($299)"],
              ["Two-to-four dimensions",                                   "MA-002 (modular pricing)"],
              ["Full integrated market read with executive summary",       "MR-001 Single Country Market Report ($1,099, 72h)"],
              ["Multi-country comparative",                                "MR-002 Multi-Country Comparative Strategy ($1,599, 96h)"],
            ],
            [4680, 4680]
          ),
          spacer(),
          body("MA-100, MA-002, and MR-001 are three points on the same spectrum: width of the question and depth of strategic integration. The analyst pool is the same."),
          ruleParagraph(),

          h1("When to commission an MA report"),
          bullet("You’re a brand or exporter preparing a market-entry pitch and need defensible data on retail, consumer and competitive dimensions"),
          bullet("You’re an importer evaluating a new product line and need to understand demand and seasonality before placing orders"),
          bullet("You’re a trade-finance team sizing the underlying market opportunity"),
          bullet("You’re an investor or analyst building a sector-level thesis"),
          bullet("You’re a government trade-promotion agency advising exporters on market selection"),
          ruleParagraph(),

          h1("What an MA report is not"),
          body("Not an AI-generated dashboard. Not a SaaS subscription. Not a generic syndicated market research download. Each brief is written from authoritative sources by a senior sector analyst, with the buyer’s specific question front-of-mind. The PDF is the deliverable. There is no platform to learn, no credit balance to top up, no licence to renew."),
          ruleParagraph(),

          h1("Data sources"),
          body("UN Comtrade  ·  World Bank  ·  WTO  ·  Eurostat  ·  ITC  ·  EU Taxud  ·  sector-specific retail and consumer data sources  ·  primary research where applicable  ·  ICTTM transaction data for competitive intelligence modules."),
          ruleParagraph(),

          h1("The Ponte advantage"),
          body("Unlike generic market research, every claim in a Ponte Market Analysis about market size, price levels, or competitive dynamics is anchored to actual customs declarations, retail data, or primary sources — not modelled estimates or survey responses. The senior analyst’s job is to turn that evidence into a decision you can defend."),
        ],
      },
    ],
  });
}

// ---------- document 04: Market Reports (4 SKUs) ----------

function doc04() {
  return new Document({
    styles,
    numbering,
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: { default: pageFooter() },
        children: [
          ...cover(
            "Market Reports",
            "Global OR for a specific country — always for ONE specific HS code",
            "Product Page  ·  Wave 4  ·  May 2026"
          ),

          h1("The Ponte Market Reports rule"),
          callout("A Ponte Market Report covers ONE specific market — either the world, or one country — for ONE specific HS code. That’s it."),
          body("Each report is produced by a senior analyst from authoritative trade-statistics sources and delivered as a licensed PDF. Bought once. No subscription. No credits. No platform login."),
          ruleParagraph(),

          h1("The four market reports"),
          table(
            [
              ["SKU",     "Title",                            "Scope",                       "Price",   "SLA"],
              ["MR-001",  "Single Country Market Report",     "One country",                 "$1,099",  "72h"],
              ["MR-005 ✦", "Global Market Report",       "World",                       "TBD",     "TBD"],
              ["MR-006 ✦", "US Trade Intelligence Report", "United States",             "TBD",     "TBD"],
              ["SF-001 ✦", "EU Seafood Trade Report",    "EU regional (specialist)",    "TBD",     "TBD"],
            ],
            [1440, 3000, 2520, 1200, 1200]
          ),
          spacer(),
          body("✦ = new product (Wave 4+). MR-001 is live today."),
          ruleParagraph(),

          h1("How to choose"),
          table(
            [
              ["Your question",                                                                  "The report"],
              ["“Should I enter this specific country with this product?”",             "MR-001"],
              ["“Which country in the world should I focus on for this product?”",      "MR-005"],
              ["“Specifically in the US — who’s importing what from where?”", "MR-006"],
              ["“How is this seafood species moving into the EU this week?”",           "SF-001"],
            ],
            [6480, 2880]
          ),
          spacer(),
          body("Use MR-005 first when the country is unknown. Once you’ve picked the country, commission MR-001 (or MR-006 if it’s the US) for the deep read."),
          ruleParagraph(),

          h1("MR-001 — Single Country Market Report"),
          skuBlock("MR-001", "$1,099", "72-hour delivery", "Tier B  ·  Live today"),
          body("The decision: “Should I enter this specific country with this product, and on what terms?”"),

          h3("You configure"),
          bullet("HS code (one)"),
          bullet("Target country (one)"),

          h3("What you get — 40+ page PDF"),
          bullet("Market structure and competitive landscape"),
          bullet("Demand and import analysis"),
          bullet("Pricing landscape"),
          bullet("Supplier landscape"),
          bullet("Regulatory and risk overview"),
          bullet("Senior-analyst executive summary integrating all of the above"),
          bullet("Methodology appendix"),
          bullet("Single-organisation licence"),

          h3("When to commission MR-001"),
          bullet("You’ve shortlisted a country and need a board-ready market read"),
          bullet("You’re preparing a market-entry investment case"),
          bullet("You’re underwriting trade finance against a country exposure"),
          bullet("You’re an investor or PE sizing a sector in one geography"),
          ruleParagraph(),

          h1("MR-005 — Global Market Report ✦ NEW"),
          skuBlock("MR-005", "Pricing TBD", "Delivery TBD", "New product"),
          body("The decision: “Which country in the world should I focus on for this product?”"),
          body("The flagship global report. A comprehensive trade-flow analysis covering any product defined by HS code, drawing on the most complete and authoritative international trade datasets available."),

          h3("You configure"),
          bullet("HS code (one — the only geographic input; report covers all countries)"),
          bullet("Time period (default: last 5 years)"),

          h3("What you get in the PDF"),
          bullet("Global trade flows — top exporters and importers by volume and value, 5-year trend"),
          bullet("Price trend analysis — average unit values by trade route, high/low price corridors by origin"),
          bullet("Market concentration — Herfindahl-Hirschman Index for supply and demand sides, with concentration-risk commentary"),
          bullet("Trade growth — fastest-growing import markets, emerging corridors"),
          bullet("Tariff landscape — MFN rates in key markets, active FTAs, ADD/CVD duty cases"),
          bullet("Regulatory overview — key standards and certifications by major importing region"),
          bullet("Analyst outlook — supply-chain risks, geopolitical factors, demand drivers"),
          bullet("Methodology appendix and full source citations"),
          bullet("Single-organisation licence"),

          h3("When to commission MR-005"),
          bullet("You’re scoping global opportunity before picking a country"),
          bullet("You’re a strategic-sourcing team mapping global supply"),
          bullet("You’re an investor looking at sector-level flow before geography"),
          bullet("You want the global scan before commissioning a country-deep MR-001"),
          ruleParagraph(),

          h1("MR-006 — US Trade Intelligence Report ✦ NEW"),
          skuBlock("MR-006", "Pricing TBD", "Delivery TBD", "New product"),
          body("The decision: “Specifically for the US — who’s importing what, from where, and at what price?”"),
          body("A US-focused trade-intelligence report combining official US Census Bureau Foreign Trade statistics with ICTTM transaction-level customs and bill-of-lading data. Census gives authoritative totals; transaction data adds company-level granularity — which US companies are importing the product, and from which foreign suppliers."),

          h3("You configure"),
          bullet("HS code (one)"),
          bullet("Trade direction: imports / exports / both"),
          bullet("Time period (default: last 12 months)"),

          h3("What you get in the PDF"),
          bullet("US import and export volumes and values — monthly trend, MoM, YoY"),
          bullet("Top origin/destination countries ranked by volume and value"),
          bullet("Top US importing companies and top foreign suppliers (transaction-level)"),
          bullet("Port-level data: leading US ports of entry by volume"),
          bullet("Price analysis: average unit value vs. global benchmark"),
          bullet("Section 301 tariff impact analysis where applicable"),
          bullet("Trade balance: US net position, 5-year trend"),
          bullet("Analyst commentary and outlook"),
          bullet("Methodology appendix and full source citations"),
          bullet("Single-organisation licence"),

          h3("Why this report is data-intensive"),
          body("The US is one of very few markets where both official statistics (Census Bureau) AND transaction-level customs / BoL data are publicly available. MR-006 layers both: Census for authoritative totals plus transaction data for company-level granularity. No other country allows that depth from public sources."),

          h3("When to commission MR-006"),
          bullet("You’re a foreign exporter targeting the US market"),
          bullet("You’re a US importer benchmarking sourcing costs against competitors"),
          bullet("You’re a US manufacturer assessing import competition"),
          bullet("You’re a trade attorney working on a Section 301 case"),
          bullet("You’re a government body monitoring US market access"),

          h3("MR-006 vs. MR-001"),
          body("MR-006 is US-specific and data-intensive — it answers “who is trading this product in the US and at what volumes and prices?” MR-001 is the deeper analyst engagement covering market-entry strategy, competitive landscape, barriers, and go-to-market — for ANY country including the US. A buyer who reads MR-006 and wants the full US market-entry strategy commissions MR-001 next."),
          ruleParagraph(),

          h1("SF-001 — EU Seafood Trade Report ✦ NEW"),
          skuBlock("SF-001", "Pricing TBD", "Delivery TBD", "Specialist regional report"),
          body("The decision: “How is this seafood species moving into the EU this week, at what price, from which origin?”"),

          h3("Why this report is unique"),
          body("EU Taxud tracks EU seafood imports at weekly frequency, broken down by species, country of origin, and EU member state of import. Most official trade statistics are monthly or quarterly and published with a 2–3 month lag. Taxud data is typically available within days of the reference week."),
          body("For seafood markets where prices move weekly, that frequency changes the entire game. There is no global or single-country structured product that delivers what weekly Taxud delivers for EU seafood — which is why SF-001 is the lone regional exception to Ponte’s “global OR one country” rule."),

          h3("You configure"),
          bullet("Seafood species or HS code within Chapter 03, 1604, or 1605"),
          bullet("Reference week"),
          bullet("Comparison period: prior week / same week prior year / YTD vs prior year"),

          h3("What you get in the PDF"),
          bullet("Weekly import volumes and values by species and EU member state"),
          bullet("Top origin countries by species: market share, trend, emerging suppliers"),
          bullet("Average landed price per kg by species and origin — weekly movements and seasonal pattern"),
          bullet("Year-over-year and week-on-week volume and price comparison"),
          bullet("Tariff and TRQ (Tariff Rate Quota) utilisation rates by species and origin"),
          bullet("Supply-chain alerts: volume spikes, price anomalies, new entrants"),
          bullet("Senior-analyst commentary"),
          bullet("Methodology appendix and full source citations"),
          bullet("Single-organisation licence"),

          h3("When to commission SF-001"),
          bullet("You’re an EU seafood importer monitoring competitor sourcing"),
          bullet("You’re an exporter to the EU tracking landed-price benchmarks"),
          bullet("You’re a seafood trader managing price risk on weekly cycles"),
          bullet("You’re a bank underwriting seafood trade finance and need recent market data, not 3-month-old statistics"),
          bullet("You’re an industry association monitoring sector health"),
          ruleParagraph(),

          h1("Data sources across all four reports"),
          body("WITS (World Bank)  ·  UN Comtrade  ·  Eurostat (including Taxud weekly surveillance for SF-001)  ·  Statistics Canada  ·  US Census Bureau Foreign Trade Division  ·  ICTTM transaction-level customs and bill-of-lading data  ·  WTO Tariff Database  ·  OECD."),
          body("Every figure in a Ponte Market Report is traceable to its official source. Our reports are built to withstand scrutiny — in trade-finance underwriting, legal proceedings, regulatory submissions, and investment decisions, the source of data matters as much as the data itself."),
          ruleParagraph(),

          h1("What these reports are not"),
          body("Not data dashboards. Not API feeds. Not subscriptions. Not generic syndicated research downloads. Each Ponte Market Report is a senior-analyst-curated licensed PDF that answers a specific market question for a specific HS code, bought once."),
          ruleParagraph(),

          h1("The Ponte competitive position"),
          body("The combination of official statistical data and transaction-level trade data, integrated by a senior analyst into a licensed PDF, is what distinguishes Ponte from both traditional market research providers and raw data vendors. Traditional providers give polished narrative but weak data foundations. Raw data vendors give granular data but no analytical framework. Ponte gives both — curated by an analyst, delivered as a single document."),
        ],
      },
    ],
  });
}

// ---------- emit ----------

async function emit(doc, filename) {
  const buf = await Packer.toBuffer(doc);
  const out = path.join(__dirname, filename);
  fs.writeFileSync(out, buf);
  const stat = fs.statSync(out);
  console.log(`  wrote ${filename}  (${stat.size.toLocaleString()} bytes)`);
}

(async () => {
  console.log("Generating Ponte product-page DOCX files...");
  await emit(doc01(), "01-trade-intelligence-products.docx");
  await emit(doc02(), "02-tariff-landed-cost-brief.docx");
  await emit(doc03(), "03-market-analysis-reports.docx");
  await emit(doc04(), "04-market-reports.docx");
  console.log("Done.");
})();
