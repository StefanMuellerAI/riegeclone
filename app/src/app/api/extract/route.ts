import { NextResponse } from "next/server";
import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXTRACTION_PROMPT = `Du bist ein Experte für Logistik-Dokumente. Lies das angehängte Dokument und extrahiere die relevanten Felder als JSON.

Regeln:
- Erkenne den Dokumenttyp: BILL_OF_LADING, AWB, COMMERCIAL_INVOICE, PACKING_LIST, CERTIFICATE_OF_ORIGIN, ATA_CARNET, CUSTOMS_DECLARATION, andere.
- Extrahiere verfügbare Felder (je nach Typ): shipper, consignee, notify, carrier, vessel_voyage, flight_number, bl_or_awb_number, booking_number, origin, destination, etd, eta, pieces, gross_weight, chargeable_weight, volume, commodity_description, hs_codes (liste), incoterm, currency, total_amount, terms_of_payment, container_numbers (liste), dangerous_goods (bool), marks_and_numbers.
- Gib bei Line Items ein Array "lineItems" mit Objekten: {description, hs_code, qty, unit_price, amount}.
- Nutze ISO-Formate: Daten YYYY-MM-DD, Gewichte als "{number} kg", Volumen als "{number} m3".
- Wenn ein Feld nicht vorkommt, lasse es weg (nicht leer string).
- Füge "warnings" hinzu (Array) wenn etwas unklar ist (fehlendes HS-Code, DGR ohne Klasse, etc.).

Antwort AUSSCHLIESSLICH als valides JSON nach diesem Schema:
{ "documentType": string, "confidence": number (0..1), "fields": object, "lineItems": array?, "warnings": array? }`;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/pdf";

  const client = getAnthropic();
  const t0 = Date.now();

  if (!client) {
    return NextResponse.json(mockExtraction(file.name, Date.now() - t0));
  }

  try {
    const mediaType = mime === "application/pdf" ? "application/pdf" : mime;
    const isPdf = mime === "application/pdf";
    const res = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            isPdf
              ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } }
              : { type: "image", source: { type: "base64", media_type: mediaType as any, data: buf.toString("base64") } },
            { type: "text", text: EXTRACTION_PROMPT },
          ] as any,
        },
      ],
    });
    const text = res.content.find((c) => c.type === "text");
    const raw = text && text.type === "text" ? text.text : "{}";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    return NextResponse.json({
      ...parsed,
      model: CLAUDE_MODEL,
      latencyMs: Date.now() - t0,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "extraction failed";
    return NextResponse.json({ ...mockExtraction(file.name, Date.now() - t0), warnings: [`Claude-API nicht erreichbar: ${msg}. Demo-Fallback.`] });
  }
}

function mockExtraction(filename: string, latency: number) {
  const lower = filename.toLowerCase();
  const isInv = lower.includes("ci") || lower.includes("invoice");
  const isPl = lower.includes("pl") || lower.includes("packing");
  const type = lower.includes("awb") ? "AWB" : isInv ? "COMMERCIAL_INVOICE" : isPl ? "PACKING_LIST" : "BILL_OF_LADING";
  return {
    documentType: type,
    confidence: 0.94,
    model: CLAUDE_MODEL + " (demo fallback)",
    latencyMs: latency + 1200,
    fields: {
      bl_or_awb_number: "MAEU-224857102",
      shipper: "Shanghai Jiangnan Precision Co. Ltd.",
      consignee: "ACME Industrial Supply Inc., Chicago IL",
      notify: "DSV Air & Sea Inc., c/o Frachtwerk Meerbusch",
      carrier: "Maersk Line",
      vessel_voyage: "MAERSK EINDHOVEN / 215W",
      origin: "CNSHA · Shanghai, CN",
      destination: "USORD · Chicago, US (via LAX)",
      etd: "2026-04-12",
      eta: "2026-05-08",
      pieces: "24",
      gross_weight: "18 420 kg",
      volume: "42 m3",
      commodity_description: "Steel coils (flat-rolled, cold-reduced)",
      hs_codes: "7208.39, 7208.51",
      incoterm: "FOB",
      dangerous_goods: "false",
      container_numbers: "MSKU 448723-9, TCLU 662834-1",
    },
    lineItems: isInv
      ? [
          { description: "Cold-reduced steel coils, HR 6mm", hs_code: "7208.39", qty: "12", unit_price: "USD 4250", amount: "USD 51000" },
          { description: "Hot-rolled steel sheets, HR 10mm", hs_code: "7208.51", qty: "6", unit_price: "USD 5120", amount: "USD 30720" },
        ]
      : undefined,
    warnings: ["CBAM-Pflicht: CN-Codes 7208.39 und 7208.51 ausweisen im Quarterly Report."],
  };
}
