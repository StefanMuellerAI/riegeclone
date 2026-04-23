import { db } from "@/lib/db";
import { getClock, virtualNow } from "@/lib/world-clock";
import { notify, sendSlack, sendEmail } from "@/lib/mocks/notifications";
import type { ShipmentStatus, Prisma } from "@prisma/client";

// A single tick: advances world state by consuming elapsed virtual time.
// Idempotent per shipment: uses timestamp comparisons rather than counters.

type TickResult = {
  milestonesFired: number;
  statusChanges: number;
  delaysAdded: number;
  newShipments: number;
  virtualNow: string;
};

export async function runTick(): Promise<TickResult> {
  const clock = await getClock();
  const vnow = virtualNow(clock);
  let milestonesFired = 0;
  let statusChanges = 0;
  let delaysAdded = 0;
  let newShipments = 0;

  // 1) Fire future milestones that now lie in the virtual past.
  const dueMs = await db.milestone.findMany({
    where: { isFuture: true, timestamp: { lte: vnow } },
    take: 50,
    include: {
      shipment: {
        select: {
          id: true,
          ref: true,
          status: true,
          destCode: true,
          originCode: true,
          customer: { select: { name: true, id: true } },
        },
      },
    },
  });

  for (const m of dueMs) {
    await db.milestone.update({ where: { id: m.id }, data: { isFuture: false, source: m.source === "PREDICTED" ? "AIS" : m.source === "PLANNED" ? "MANUAL" : m.source } });
    milestonesFired++;

    // Translate milestone code to status change + notification
    const s = m.shipment;
    const nextStatus = statusFromMilestoneCode(m.code);
    if (nextStatus && nextStatus !== s.status) {
      await db.shipment.update({ where: { id: s.id }, data: { status: nextStatus as ShipmentStatus } });
      statusChanges++;
      await notify({
        level: nextStatus === "DELIVERED" ? "success" : nextStatus === "EXCEPTION" ? "critical" : "info",
        title: titleFor(nextStatus as string, s.ref),
        body: `${s.originCode} → ${s.destCode} · ${m.label}${s.customer ? " · " + s.customer.name : ""}`,
        shipmentId: s.id,
        href: `/shipments/${s.id}`,
      });
      if (nextStatus === "DELIVERED" && s.customer) {
        await sendEmail(`ops@${s.customer.name.toLowerCase().replace(/[^a-z]/g, "")}.demo`, `Sendung ${s.ref} zugestellt`, `${s.ref} wurde am ${new Date().toLocaleString("de-DE")} zugestellt.`, s.id);
      }
    } else {
      await notify({
        level: "info",
        title: `${s.ref} · ${m.label}`,
        body: `${s.originCode} → ${s.destCode}`,
        shipmentId: s.id,
        href: `/shipments/${s.id}`,
      });
    }
  }

  // 2) Randomly add delay events to IN_TRANSIT shipments (4% per tick)
  const activeShipments = await db.shipment.findMany({
    where: { status: "IN_TRANSIT" },
    take: 30,
  });
  for (const s of activeShipments) {
    if (Math.random() < 0.04) {
      const addHours = 6 + Math.floor(Math.random() * 18);
      const newEta = new Date((s.etaPredicted ?? s.eta).getTime() + addHours * 3600 * 1000);
      await db.shipment.update({
        where: { id: s.id },
        data: { etaPredicted: newEta, delayRiskScore: Math.min(98, (s.delayRiskScore ?? 20) + 15) },
      });
      await notify({
        level: "warning",
        title: `Delay erkannt: ${s.ref}`,
        body: `Port congestion an ${s.destCode} — +${addHours}h predictive`,
        shipmentId: s.id,
        href: `/shipments/${s.id}`,
      });
      await sendSlack("#ops-alerts", `⚠️ ${s.ref} +${addHours}h Delay`, s.id);
      delaysAdded++;
    }
  }

  // 3) Auto-progress: shipments whose virtual progress > 1 and still IN_TRANSIT become AT_DESTINATION
  const overdue = await db.shipment.findMany({
    where: { status: "IN_TRANSIT", eta: { lt: vnow } },
    take: 10,
  });
  for (const s of overdue) {
    // If no arrival milestone exists yet, create one
    await db.milestone.create({
      data: {
        shipmentId: s.id,
        code: s.mode === "AIR" ? "ARR" : "DISCHARGE",
        label: s.mode === "AIR" ? `Ankunft ${s.destCode}` : `Entladen ${s.destCode}`,
        location: s.destName,
        timestamp: vnow,
        source: s.mode === "AIR" ? "AIRLINE_EDI" : "AIS",
        isFuture: false,
      },
    });
    await db.shipment.update({ where: { id: s.id }, data: { status: "AT_DESTINATION" } });
    statusChanges++;
    await notify({ level: "info", title: `${s.ref} erreicht ${s.destCode}`, body: `${s.carrier} · ${s.mode}`, shipmentId: s.id, href: `/shipments/${s.id}` });
  }

  // 4) AT_DESTINATION → CUSTOMS_CLEARANCE after ~3 virtual hours
  const atDest = await db.shipment.findMany({ where: { status: "AT_DESTINATION" }, take: 10 });
  for (const s of atDest) {
    const arrival = s.eta;
    if (vnow.getTime() - arrival.getTime() > 3 * 3600 * 1000) {
      await db.shipment.update({ where: { id: s.id }, data: { status: "CUSTOMS_CLEARANCE" } });
      await db.milestone.create({
        data: {
          shipmentId: s.id,
          code: "CUSTOMS_IN_PROGRESS",
          label: "Zollabfertigung läuft",
          location: s.destName,
          timestamp: vnow,
          source: "MANUAL",
          isFuture: false,
        },
      });
      statusChanges++;
      await notify({ level: "info", title: `${s.ref} · Zoll läuft`, body: `Regime ${s.destCountry === "DE" ? "ATLAS" : s.destCountry === "CH" ? "e-dec" : s.destCountry === "US" ? "ISF/AES" : "NCTS"}`, shipmentId: s.id, href: `/shipments/${s.id}` });
    }
  }

  // 5) CUSTOMS → DELIVERED after another ~6 virtual hours
  const inCustoms = await db.shipment.findMany({ where: { status: "CUSTOMS_CLEARANCE" }, take: 10 });
  for (const s of inCustoms) {
    if (vnow.getTime() - s.eta.getTime() > 9 * 3600 * 1000) {
      await db.shipment.update({ where: { id: s.id }, data: { status: "DELIVERED" } });
      await db.milestone.create({
        data: {
          shipmentId: s.id,
          code: "DELIVERED",
          label: "Zugestellt",
          location: s.destName,
          timestamp: vnow,
          source: "MANUAL",
          isFuture: false,
        },
      });
      statusChanges++;
      await notify({ level: "success", title: `${s.ref} zugestellt`, body: `${s.destCode}`, shipmentId: s.id, href: `/shipments/${s.id}` });
    }
  }

  await db.worldClock.update({ where: { id: "singleton" }, data: { ticks: { increment: 1 }, lastTickAt: new Date() } });

  return {
    milestonesFired,
    statusChanges,
    delaysAdded,
    newShipments,
    virtualNow: vnow.toISOString(),
  };
}

function statusFromMilestoneCode(code: string): string | null {
  switch (code) {
    case "DEP":
    case "LOAD":
      return "IN_TRANSIT";
    case "ARR":
    case "DISCHARGE":
      return "AT_DESTINATION";
    case "CUSTOMS_IN_PROGRESS":
    case "CUSTOMS_PLANNED":
      return "CUSTOMS_CLEARANCE";
    case "DELIVERY_PLANNED":
    case "DELIVERED":
      return "DELIVERED";
    default:
      return null;
  }
}

function titleFor(status: string, ref: string): string {
  switch (status) {
    case "IN_TRANSIT":
      return `${ref} ist unterwegs`;
    case "AT_DESTINATION":
      return `${ref} · Ankunft am Ziel`;
    case "CUSTOMS_CLEARANCE":
      return `${ref} · Zollabfertigung`;
    case "DELIVERED":
      return `${ref} · Zugestellt`;
    case "EXCEPTION":
      return `${ref} · Exception`;
    default:
      return `${ref} · Statuswechsel zu ${status}`;
  }
}
