import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUser } from "@/lib/auth";
import type { ShipmentRecord } from "@/app/tools/search/SearchClient";

// Lazy-instantiate so module-level code doesn't throw during Next.js build
// when OPENAI_API_KEY is absent from the build environment.
function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey: key });
}

// Coverage assignment heuristic based on countries
const STRONG_COVERAGE = new Set([
  "US", "MX", "BR", "CO", "PE", "EC", "CL", "AR",
  "IN", "VN", "TH", "BD", "PK", "LK",
  "NG", "KE", "GH", "ZA", "TZ", "UG",
]);
const PARTIAL_COVERAGE = new Set([
  "DE", "FR", "IT", "ES", "NL", "BE", "PL", "CZ",
  "JP", "KR", "AU", "CA", "GB", "TR",
]);

function getCoverage(country: string): ShipmentRecord["coverage"] {
  if (STRONG_COVERAGE.has(country)) return "Strong";
  if (PARTIAL_COVERAGE.has(country)) return "Partial";
  return "Extrapolated";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, originCountry, destinationCountry, dateFrom, dateTo, direction, page = 1 } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    // Auth check — unauthenticated users still get results but we flag it
    const user = await getUser();
    const isAuthenticated = !!user;

    const systemPrompt = `You are a trade data API that returns realistic, historically-plausible customs shipment records.
You have access to a database of transaction-level customs declarations.
Always return valid JSON with realistic company names, ports, and trade data.
Base your data on real trade patterns — real importer/exporter names that actually trade these goods, real ports, realistic price ranges.
Never invent implausible data (e.g., don't have a UK company importing from itself).`;

    const filters = [
      originCountry ? `origin country: ${originCountry}` : null,
      destinationCountry ? `destination country: ${destinationCountry}` : null,
      dateFrom ? `from date: ${dateFrom}` : null,
      dateTo ? `to date: ${dateTo}` : null,
      direction !== "both" ? `direction: ${direction}s only` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const userPrompt = `Return 15 realistic customs shipment records for: "${query}"${filters ? ` (filters: ${filters})` : ""}.

Return a JSON object with this exact structure:
{
  "total": <integer, realistic total matching records, between 500-50000>,
  "records": [
    {
      "id": "<unique string>",
      "date": "<YYYY-MM-DD, within last 18 months>",
      "importer": "<real company name>",
      "exporter": "<real company name>",
      "hsCode": "<6-digit HS code>",
      "description": "<product description, 4-8 words>",
      "quantity": "<number + unit, e.g. '24,500 KG' or '1,200 UNITS'>",
      "unitValue": "<USD per unit, e.g. '$18.50/KG'>",
      "totalValue": "<total USD, e.g. '$452,750'>",
      "portOfLoading": "<real port name, city>",
      "portOfDischarge": "<real port name, city>",
      "originCountry": "<ISO 2-letter code>",
      "destinationCountry": "<ISO 2-letter code>"
    }
  ]
}

Make the data realistic and varied. Use actual major trading companies, logistics ports, and market prices for this product category.`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const rawData = JSON.parse(completion.choices[0].message.content ?? "{}");

    if (!rawData.records || !Array.isArray(rawData.records)) {
      throw new Error("Invalid response from data engine.");
    }

    // Add coverage badge based on country pairs
    const records: ShipmentRecord[] = rawData.records.map(
      (r: ShipmentRecord & { originCountry?: string; destinationCountry?: string }) => ({
        id: r.id ?? crypto.randomUUID(),
        date: r.date,
        importer: r.importer,
        exporter: r.exporter,
        hsCode: r.hsCode,
        description: r.description,
        quantity: r.quantity,
        unitValue: r.unitValue,
        totalValue: r.totalValue,
        portOfLoading: r.portOfLoading,
        portOfDischarge: r.portOfDischarge,
        coverage: getCoverage(r.originCountry ?? ""),
      }),
    );

    return NextResponse.json({
      records,
      total: rawData.total ?? records.length,
      isAuthenticated,
      page,
    });
  } catch (err: unknown) {
    console.error("[/api/tools/search]", err);
    const message = err instanceof Error ? err.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
