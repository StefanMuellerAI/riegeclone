"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { notify, sendEmail, sendSlack } from "@/lib/mocks/notifications";
import { submitAtlas, submitAes, submitEdec } from "@/lib/mocks/customs";
import { virtualNowAsync } from "@/lib/world-clock";
import type { Direction, TransportMode, ShipmentStatus } from "@prisma/client";
import { NODE_BY_CODE } from "@/lib/ports";

const CreateSchema = z.object({
  mode: z.enum(["AIR", "OCEAN"]),
  direction: z.enum(["IMPORT", "EXPORT"]),
  origin: z.string(),
  destination: z.string(),
  carrier: z.string(),
  carrierCode: z.string().optional(),
  transitDays: z.number().int().positive(),
  pieces: z.number().int().positive().default(1),
  weightKg: z.number().positive(),
  volumeM3: z.number().positive().default(1),
  commodity: z.string().default("General cargo"),
  incoterm: z.string().default("FOB"),
  customerId: z.string().optional(),
  shipperId: z.string().optional(),
  consigneeId: z.string().optional(),
  totalUsd: z.number().optional(),
  dangerousGoods: z.boolean().default(false),
});

export async function createShipment(input: unknown) {
  const data = CreateSchema.parse(input);
  const vnow = await virtualNowAsync();
  const year = vnow.getFullYear();
  const count = await db.shipment.count({ where: { ref: { startsWith: `FW-${year}-` } } });
  const ref = `FW-${year}-${String(1000 + count).padStart(4, "0")}`;

  const fromNode = NODE_BY_CODE[data.origin];
  const toNode = NODE_BY_CODE[data.destination];

  const etd = new Date(vnow.getTime() + 2 * 3600 * 1000); // launch in 2 virtual hours
  const eta = new Date(etd.getTime() + data.transitDays * 86400 * 1000);
  const chargeable = data.mode === "AIR" ? Math.max(data.weightKg, data.volumeM3 * 167) : data.weightKg;

  const distance = fromNode && toNode
    ? Math.acos(
        Math.sin((fromNode.lat * Math.PI) / 180) * Math.sin((toNode.lat * Math.PI) / 180) +
          Math.cos((fromNode.lat * Math.PI) / 180) * Math.cos((toNode.lat * Math.PI) / 180) *
            Math.cos(((fromNode.lon - toNode.lon) * Math.PI) / 180)
      ) * 6371
    : 8000;
  const co2 = data.mode === "AIR" ? (chargeable / 1000) * distance * 0.602 : (chargeable / 1000) * distance * 0.015;

  const carrierCode = data.carrierCode ?? data.carrier.split(" ").map((p) => p[0]).join("").slice(0, 3).toUpperCase();
  const mawb = data.mode === "AIR" ? `${carrierCode}-${Math.floor(Math.random() * 90000000 + 10000000)}` : null;
  const hbl = data.mode === "OCEAN" ? `${carrierCode}${Math.floor(Math.random() * 900000000 + 100000000)}` : null;

  const s = await db.shipment.create({
    data: {
      ref,
      mode: data.mode as TransportMode,
      direction: data.direction as Direction,
      status: "BOOKED",
      originCode: data.origin,
      originName: fromNode?.name ?? data.origin,
      originCountry: fromNode?.country ?? "",
      originLat: fromNode?.lat,
      originLon: fromNode?.lon,
      destCode: data.destination,
      destName: toNode?.name ?? data.destination,
      destCountry: toNode?.country ?? "",
      destLat: toNode?.lat,
      destLon: toNode?.lon,
      etd,
      eta,
      etaPredicted: eta,
      delayRiskScore: 12,
      carrier: data.carrier,
      carrierCode,
      mawb,
      hbl,
      vessel: data.mode === "OCEAN" ? ["MAERSK EINDHOVEN", "CMA CGM JACQUES SAADE", "MSC GÜLSÜN"][Math.floor(Math.random() * 3)] : null,
      voyage: data.mode === "OCEAN" ? `${Math.floor(Math.random() * 500 + 200)}W` : null,
      flightNumber: data.mode === "AIR" ? `${carrierCode}${Math.floor(Math.random() * 899 + 100)}` : null,
      containerNos: data.mode === "OCEAN" ? [`MSKU${Math.floor(Math.random() * 9000000 + 1000000)}`] : [],
      weightKg: data.weightKg,
      volumeM3: data.volumeM3,
      chargeableKg: chargeable,
      pieces: data.pieces,
      incoterm: data.incoterm,
      commodity: data.commodity,
      hsCodes: [],
      co2eKg: Math.round(co2),
      dangerousGoods: data.dangerousGoods,
      customerId: data.customerId,
      shipperId: data.shipperId,
      consigneeId: data.consigneeId,
    },
  });

  // Initial milestones
  await db.milestone.createMany({
    data: [
      { shipmentId: s.id, code: "BOOKED", label: "Sendung gebucht", timestamp: vnow, source: "MANUAL", isFuture: false },
      { shipmentId: s.id, code: data.mode === "AIR" ? "DEP" : "LOAD", label: data.mode === "AIR" ? `Abflug ${data.origin}` : `Verladen ${data.origin}`, location: fromNode?.name ?? data.origin, timestamp: etd, source: data.mode === "AIR" ? "AIRLINE_EDI" : "AIS", isFuture: true },
      { shipmentId: s.id, code: data.mode === "AIR" ? "ARR" : "DISCHARGE", label: data.mode === "AIR" ? `Ankunft ${data.destination}` : `Entladen ${data.destination}`, location: toNode?.name ?? data.destination, timestamp: eta, source: data.mode === "AIR" ? "AIRLINE_EDI" : "AIS", isFuture: true },
      { shipmentId: s.id, code: "CUSTOMS_PLANNED", label: "Zollabfertigung geplant", location: toNode?.name, timestamp: new Date(eta.getTime() + 12 * 3600 * 1000), source: "PLANNED", isFuture: true },
      { shipmentId: s.id, code: "DELIVERY_PLANNED", label: "Zustellung geplant", timestamp: new Date(eta.getTime() + 2 * 86400 * 1000), source: "PLANNED", isFuture: true },
    ],
  });

  await notify({ level: "success", title: `${ref} gebucht`, body: `${data.origin} → ${data.destination} · ${data.carrier}`, shipmentId: s.id, href: `/shipments/${s.id}` });

  revalidatePath("/");
  revalidatePath("/shipments");
  return { id: s.id, ref: s.ref };
}

export async function updateShipmentStatus(id: string, status: ShipmentStatus) {
  const before = await db.shipment.findUnique({ where: { id }, select: { ref: true, status: true } });
  await db.shipment.update({ where: { id }, data: { status } });
  const vnow = await virtualNowAsync();
  await db.milestone.create({
    data: {
      shipmentId: id,
      code: `STATUS_${status}`,
      label: `Status: ${status}`,
      timestamp: vnow,
      source: "MANUAL",
      isFuture: false,
    },
  });
  await notify({ level: status === "EXCEPTION" ? "critical" : "info", title: `${before?.ref} · Status → ${status}`, shipmentId: id, href: `/shipments/${id}` });
  revalidatePath(`/shipments/${id}`);
  revalidatePath("/shipments");
  revalidatePath("/");
  return { ok: true };
}

export async function addManualMilestone(id: string, label: string, location?: string) {
  const vnow = await virtualNowAsync();
  await db.milestone.create({
    data: { shipmentId: id, code: "MANUAL", label, location, timestamp: vnow, source: "MANUAL", isFuture: false },
  });
  revalidatePath(`/shipments/${id}`);
  return { ok: true };
}

export async function sendPreAlert(id: string) {
  const s = await db.shipment.findUnique({ where: { id }, include: { customer: true } });
  if (!s) return { ok: false };
  await sendEmail(
    `ops@${(s.customer?.name ?? "customer").toLowerCase().replace(/[^a-z]/g, "")}.demo`,
    `Pre-Alert ${s.ref}`,
    `Ihre Sendung ${s.ref} (${s.originCode} → ${s.destCode}, ${s.carrier}) wurde erfolgreich aufgegeben.`,
    s.id
  );
  await sendSlack("#ops-alerts", `📨 Pre-Alert gesendet für ${s.ref}`, s.id);
  await notify({ level: "success", title: `Pre-Alert gesendet · ${s.ref}`, body: `Kunde: ${s.customer?.name ?? "—"}`, shipmentId: s.id, href: `/shipments/${s.id}` });
  revalidatePath(`/shipments/${id}`);
  return { ok: true };
}

export async function submitCustomsDeclaration(shipmentId: string, regime: "ATLAS_DE" | "AES_US" | "EDEC_CH" | "NCTS" | "ISF_US" | "SAGITTA_NL") {
  const s = await db.shipment.findUnique({ where: { id: shipmentId } });
  if (!s) return { ok: false, error: "Sendung nicht gefunden" };

  const r =
    regime === "AES_US" || regime === "ISF_US" ? await submitAes(s.ref) :
    regime === "EDEC_CH" ? await submitEdec(s.ref) :
    await submitAtlas(s.ref);

  if (!r.ok) {
    await db.customsDeclaration.create({
      data: { shipmentId, regime, status: "REJECTED", deniedPartyCheck: true },
    });
    await notify({ level: "critical", title: `ATLAS Ablehnung · ${s.ref}`, body: r.rejectionReason, shipmentId, href: `/shipments/${shipmentId}` });
    return { ok: false, error: r.rejectionReason };
  }

  await db.customsDeclaration.create({
    data: { shipmentId, regime, status: "ACCEPTED", mrn: r.mrn, submittedAt: new Date(), deniedPartyCheck: true },
  });
  await notify({
    level: "success",
    title: `${regime.replace("_", " ")} akzeptiert · ${s.ref}`,
    body: `MRN: ${r.mrn}`,
    shipmentId,
    href: `/shipments/${shipmentId}`,
  });
  revalidatePath(`/shipments/${shipmentId}`);
  revalidatePath("/customs");
  return { ok: true, mrn: r.mrn, responseTimeMs: r.responseTimeMs };
}
