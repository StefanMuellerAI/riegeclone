"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { notify } from "@/lib/mocks/notifications";
import { createShipment } from "./shipments";
import type { TransportMode } from "@prisma/client";

const CreateSchema = z.object({
  mode: z.enum(["AIR", "OCEAN"]),
  origin: z.string(),
  destination: z.string(),
  incoterm: z.string().default("FOB"),
  customerId: z.string().optional(),
  totalUsd: z.number(),
  transitDays: z.number().int().positive(),
  carrier: z.string(),
  carrierCode: z.string().optional(),
  lines: z
    .array(z.object({ label: z.string(), usd: z.number() }))
    .default([]),
  weightKg: z.number().default(500),
  volumeM3: z.number().default(5),
});

export async function createQuote(input: unknown) {
  const data = CreateSchema.parse(input);
  const count = await db.quote.count();
  const ref = `Q-2026-${String(200 + count).padStart(4, "0")}`;
  const q = await db.quote.create({
    data: {
      ref,
      status: "OPEN",
      mode: data.mode as TransportMode,
      origin: data.origin,
      destination: data.destination,
      incoterm: data.incoterm,
      validUntil: new Date(Date.now() + 14 * 86400 * 1000),
      totalUsd: data.totalUsd,
      customerId: data.customerId,
      linesJson: {
        lines: data.lines.length ? data.lines : [
          { label: `${data.mode === "AIR" ? "Air" : "Ocean"} base freight`, usd: Math.round(data.totalUsd * 0.7) },
          { label: "Bunker surcharge", usd: Math.round(data.totalUsd * 0.08) },
          { label: "Terminal handling", usd: Math.round(data.totalUsd * 0.07) },
          { label: "Documentation & ISPS", usd: Math.round(data.totalUsd * 0.05) },
          { label: "Customs clearance", usd: Math.round(data.totalUsd * 0.1) },
        ],
        carrier: data.carrier,
        carrierCode: data.carrierCode,
        transitDays: data.transitDays,
        weightKg: data.weightKg,
        volumeM3: data.volumeM3,
      },
    },
  });
  await notify({ level: "info", title: `Angebot ${ref} erstellt`, body: `${data.origin} → ${data.destination} · USD ${data.totalUsd.toLocaleString()}` , href: `/quotes/${q.id}` });
  revalidatePath("/quotes");
  return { id: q.id, ref };
}

export async function sendQuote(id: string) {
  const q = await db.quote.update({ where: { id }, data: { status: "SENT" } });
  await notify({ level: "info", title: `Angebot ${q.ref} versandt`, body: "Kunde erhält Email mit PDF-Anhang", href: `/quotes/${q.id}` });
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  return { ok: true };
}

export async function declineQuote(id: string) {
  const q = await db.quote.update({ where: { id }, data: { status: "DECLINED" } });
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  return { ok: true };
}

export async function acceptQuoteAndCreateShipment(id: string) {
  const q = await db.quote.findUnique({ where: { id }, include: { customer: true } });
  if (!q) return { ok: false, error: "Angebot nicht gefunden" };
  const lines = (q.linesJson as any) ?? {};
  const shipment = await createShipment({
    mode: q.mode,
    direction: "EXPORT", // default; demo
    origin: q.origin,
    destination: q.destination,
    carrier: lines.carrier ?? "Maersk",
    carrierCode: lines.carrierCode,
    transitDays: lines.transitDays ?? (q.mode === "AIR" ? 2 : 25),
    pieces: 1,
    weightKg: lines.weightKg ?? 500,
    volumeM3: lines.volumeM3 ?? 5,
    commodity: "Kundenauftrag",
    incoterm: q.incoterm,
    customerId: q.customerId ?? undefined,
    totalUsd: q.totalUsd,
  });
  await db.quote.update({ where: { id }, data: { status: "ACCEPTED", shipmentId: shipment.id } });
  await notify({ level: "success", title: `${q.ref} angenommen → ${shipment.ref}`, body: `Neue Sendung aus Angebot erzeugt`, href: `/shipments/${shipment.id}` });
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  revalidatePath("/shipments");
  return { ok: true, shipmentId: shipment.id, shipmentRef: shipment.ref };
}
