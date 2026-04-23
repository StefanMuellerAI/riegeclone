import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { differenceInHours } from "date-fns";

type Msg = { role: "user" | "assistant"; content: string };

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Msg[] };
  const user = messages[messages.length - 1]?.content ?? "";

  const context = await buildContext();

  const client = getAnthropic();
  let text: string;
  let cards: Array<{ ref: string; origin: string; dest: string; status: string; delayDays?: number }> = [];

  if (client) {
    try {
      const res = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 900,
        system: SYSTEM_PROMPT + "\n\nLive DB Snapshot:\n" + context,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const block = res.content.find((b) => b.type === "text");
      text = block && block.type === "text" ? block.text : "Keine Antwort.";
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      text = `Copilot-API nicht erreichbar (${msg}).\n\nDemo-Fallback aktiv — hier der lokale Überblick:\n\n${context}`;
    }
  } else {
    text = mockAnswer(user, context);
  }

  // Extract refs that look like FW-.... into cards if they appear in text
  const refs = Array.from(new Set([...text.matchAll(/\b(FW-[A-Z0-9-]+)\b/g)].map((m) => m[1])));
  if (refs.length) {
    const ships = await db.shipment.findMany({ where: { ref: { in: refs } }, take: 6 });
    cards = ships.map((s) => ({
      ref: s.ref,
      origin: s.originCode,
      dest: s.destCode,
      status: s.status,
      delayDays:
        s.etaPredicted && s.etaPredicted > s.eta
          ? Math.round(differenceInHours(s.etaPredicted, s.eta) / 24)
          : undefined,
    }));
  }

  return NextResponse.json({ content: text, cards });
}

const SYSTEM_PROMPT = `Du bist Frachtwerk Copilot, ein AI-Assistent in einem modernen Transport Management System (TMS).
Sprich Deutsch, kurz und sachlich, wie ein kundiger Operations-Manager eines Spediteurs.
Wenn du Sendungsnummern erwähnst, nutze das Format FW-YYYY-XXXX so wie in den Daten.
Bei Angebotserstellungen schätze realistische Marktraten (Luftfracht 3-6 USD/kg abhängig von Lane; FCL 2500-4500 USD für 40'HC Transpazifik, 1200-2200 USD Asien-Europa).
Gib nie vor, einen Tool-Call wirklich ausgeführt zu haben — beschreibe was zu tun wäre und welche Felder betroffen sind.`;

async function buildContext() {
  const [total, byStatus, late, customs, co2] = await Promise.all([
    db.shipment.count(),
    db.shipment.groupBy({ by: ["status"], _count: { _all: true } }),
    db.shipment.findMany({
      where: { etaPredicted: { gt: new Date() }, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      take: 10,
      orderBy: { delayRiskScore: "desc" },
      select: { ref: true, originCode: true, destCode: true, status: true, eta: true, etaPredicted: true, carrier: true, mode: true },
    }),
    db.customsDeclaration.groupBy({ by: ["regime", "status"], _count: { _all: true } }),
    db.shipment.aggregate({ _sum: { co2eKg: true } }),
  ]);
  const statusBlock = byStatus.map((s) => `${s.status}: ${s._count._all}`).join(", ");
  const lateBlock = late
    .map((s) => `${s.ref} ${s.mode} ${s.originCode}->${s.destCode} ${s.status} ETA ${s.eta.toISOString().slice(0, 10)} (pred ${s.etaPredicted?.toISOString().slice(0, 10)})`)
    .join("\n");
  const customsBlock = customs.map((c) => `${c.regime}/${c.status}: ${c._count._all}`).join(", ");
  return `Shipments: ${total} total (${statusBlock})
Top delay-risk:
${lateBlock}
Customs: ${customsBlock}
Carbon: Total CO2e tracked ${(Number(co2._sum.co2eKg ?? 0) / 1000).toFixed(1)} t`;
}

function mockAnswer(prompt: string, ctx: string) {
  const p = prompt.toLowerCase();
  if (p.includes("verspätet") || p.includes("delay") || p.includes("delayed")) {
    return `Hier sind die aktuell kritischsten Sendungen (Risk-Score sortiert):\n\n${ctx.split("Top delay-risk:")[1]?.split("Customs:")[0] ?? ""}\n\nEmpfehlung: FW-Refs mit >48h Vorsprung auf Kunden proaktiv kommunizieren.`;
  }
  if (p.includes("angebot") || p.includes("quote") || p.includes("erstelle")) {
    return `Angebotsentwurf (Demo-Modus, keine echte Raten-API):
• Mode: Ocean FCL, 2x 40'HC
• Lane: Rotterdam (NLRTM) → Chicago (USORD via LAX Intermodal)
• Transit: ~28 Tage
• Basisrate: USD 3.400 / Container
• BAF/CAF: USD 280
• Incoterm: DDP
• Gültig: 14 Tage

Soll ich das Angebot als Entwurf unter dem Kunden anlegen und eine Tracking-Referenz generieren?`;
  }
  if (p.includes("co2") || p.includes("carbon") || p.includes("cbam")) {
    return `Carbon-Snapshot (Live):\n\n${ctx.split("Carbon:")[1] ?? ""}\n\nFür CBAM Q1 2026 sind 14 Sendungen mit CN-Code 7208/7304 relevant (Stahl). Entwurf des Quarterly Reports liegt unter /cbam.`;
  }
  if (p.includes("atlas") || p.includes("zoll") || p.includes("customs")) {
    return `Zoll-Status (Live):\n\n${ctx.split("Customs:")[1]?.split("Carbon:")[0] ?? ""}\n\nOffene ATLAS-Anmeldungen in /customs.`;
  }
  return `Demo-Modus: setze ANTHROPIC_API_KEY in der .env um den vollen Copilot (Claude Opus 4.7 mit Tool-Use) zu aktivieren.\n\nHier der aktuelle DB-Kontext:\n\n${ctx}`;
}
