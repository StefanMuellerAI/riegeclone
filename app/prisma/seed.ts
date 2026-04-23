import { PrismaClient, TransportMode, Direction, ShipmentStatus, CustomsRegime, CustomsStatus, QuoteStatus, PartyType, UserRole } from "@prisma/client";
import { addDays, addHours, subDays, subHours } from "date-fns";

const db = new PrismaClient();

const NODES: Record<string, { name: string; country: string; lat: number; lon: number; kind: "AIR" | "OCEAN" }> = {
  FRA: { name: "Frankfurt Airport", country: "DE", lat: 50.0379, lon: 8.5622, kind: "AIR" },
  MUC: { name: "München Airport", country: "DE", lat: 48.3537, lon: 11.775, kind: "AIR" },
  AMS: { name: "Amsterdam Schiphol", country: "NL", lat: 52.3105, lon: 4.7683, kind: "AIR" },
  JFK: { name: "New York JFK", country: "US", lat: 40.6413, lon: -73.7781, kind: "AIR" },
  ORD: { name: "Chicago O'Hare", country: "US", lat: 41.9742, lon: -87.9073, kind: "AIR" },
  PVG: { name: "Shanghai Pudong", country: "CN", lat: 31.1443, lon: 121.8083, kind: "AIR" },
  HKG: { name: "Hong Kong Intl", country: "HK", lat: 22.308, lon: 113.9185, kind: "AIR" },
  SIN: { name: "Singapore Changi", country: "SG", lat: 1.3644, lon: 103.9915, kind: "AIR" },
  DXB: { name: "Dubai Intl", country: "AE", lat: 25.2532, lon: 55.3657, kind: "AIR" },
  NRT: { name: "Tokyo Narita", country: "JP", lat: 35.772, lon: 140.3929, kind: "AIR" },
  DEHAM: { name: "Hamburg Port", country: "DE", lat: 53.5407, lon: 9.9847, kind: "OCEAN" },
  DEBRV: { name: "Bremerhaven", country: "DE", lat: 53.5396, lon: 8.581, kind: "OCEAN" },
  NLRTM: { name: "Rotterdam", country: "NL", lat: 51.9496, lon: 4.1453, kind: "OCEAN" },
  BEANR: { name: "Antwerpen", country: "BE", lat: 51.2993, lon: 4.4014, kind: "OCEAN" },
  CNSHA: { name: "Shanghai Port", country: "CN", lat: 31.3389, lon: 121.6147, kind: "OCEAN" },
  CNNGB: { name: "Ningbo", country: "CN", lat: 29.8683, lon: 121.8408, kind: "OCEAN" },
  SGSIN: { name: "Singapore Port", country: "SG", lat: 1.2644, lon: 103.84, kind: "OCEAN" },
  USNYC: { name: "New York Port", country: "US", lat: 40.6843, lon: -74.044, kind: "OCEAN" },
  USLAX: { name: "Los Angeles Port", country: "US", lat: 33.7292, lon: -118.262, kind: "OCEAN" },
  AEJEA: { name: "Jebel Ali", country: "AE", lat: 25.0167, lon: 55.0611, kind: "OCEAN" },
};

const CUSTOMERS = [
  { name: "Böhler Edelstahl GmbH", color: "#0ea5e9" },
  { name: "Siemens Healthineers AG", color: "#64748b" },
  { name: "BASF Coatings", color: "#1e40af" },
  { name: "Miele & Cie KG", color: "#b91c1c" },
  { name: "Continental Tires", color: "#111827" },
  { name: "Kärcher Cleaning", color: "#fbbf24" },
  { name: "Beiersdorf AG", color: "#2563eb" },
];

const SHIPPERS = [
  { name: "Shanghai Jiangnan Precision Co. Ltd.", country: "CN", city: "Shanghai" },
  { name: "Ningbo Anli Forge Ltd.", country: "CN", city: "Ningbo" },
  { name: "Tokyo Kasei Kogyo KK", country: "JP", city: "Tokyo" },
  { name: "Samsung SDI Manufacturing", country: "KR", city: "Seoul" },
  { name: "Böhler Edelstahl GmbH", country: "AT", city: "Kapfenberg" },
  { name: "BASF SE", country: "DE", city: "Ludwigshafen" },
  { name: "Bosch Automotive", country: "DE", city: "Stuttgart" },
  { name: "TSMC Packaging", country: "TW", city: "Hsinchu" },
];

const CONSIGNEES = [
  { name: "ACME Industrial Supply Inc.", country: "US", city: "Chicago" },
  { name: "DieselWorx LLC", country: "US", city: "Los Angeles" },
  { name: "Emirates Retail Holdings", country: "AE", city: "Dubai" },
  { name: "Tata Consumer Products", country: "IN", city: "Mumbai" },
  { name: "Miele Vertriebs GmbH", country: "DE", city: "Gütersloh" },
  { name: "Siemens Healthineers USA", country: "US", city: "Malvern" },
  { name: "Continental Tires North America", country: "US", city: "Fort Mill" },
];

const CARRIERS = [
  { name: "Lufthansa Cargo", code: "LH" },
  { name: "Cathay Pacific Cargo", code: "CX" },
  { name: "Emirates SkyCargo", code: "EK" },
  { name: "CMA CGM", code: "CMA" },
  { name: "Maersk", code: "MAEU" },
  { name: "MSC", code: "MSC" },
  { name: "Hapag-Lloyd", code: "HLCU" },
  { name: "ONE", code: "ONEY" },
];

const COMMODITIES = [
  { name: "Automotive parts (brake systems)", hs: ["8708.30"] },
  { name: "Pharmaceutical cold chain", hs: ["3004.90"] },
  { name: "Steel coils (flat-rolled)", hs: ["7208.39"] },
  { name: "Lithium-ion battery cells", hs: ["8507.60"] },
  { name: "Semiconductor wafers", hs: ["8541.10"] },
  { name: "Consumer electronics (TVs)", hs: ["8528.72"] },
  { name: "Industrial valves", hs: ["8481.80"] },
  { name: "Cosmetics & personal care", hs: ["3304.99"] },
  { name: "Steel fasteners", hs: ["7318.15"] },
  { name: "Wind turbine generators", hs: ["8502.31"] },
];

const INCOTERMS = ["EXW", "FCA", "FOB", "CIF", "CIP", "DAP", "DDP"];

const VESSELS = [
  "CMA CGM JACQUES SAADE", "EVER ALOT", "MAERSK EINDHOVEN",
  "MSC GÜLSÜN", "HMM ALGECIRAS", "ONE INNOVATION", "COSCO UNIVERSE",
];

function pick<T>(arr: T[], i?: number): T {
  return i !== undefined ? arr[i % arr.length] : arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

async function main() {
  console.log("Reset…");
  await db.notification.deleteMany().catch(() => {});
  await db.notificationLog.deleteMany().catch(() => {});
  await db.workflowRun.deleteMany().catch(() => {});
  await db.carrierRate.deleteMany().catch(() => {});
  await db.worldClock.deleteMany().catch(() => {});
  await db.alert.deleteMany();
  await db.cbamReport.deleteMany();
  await db.workflow.deleteMany();
  await db.customsDeclaration.deleteMany();
  await db.document.deleteMany();
  await db.milestone.deleteMany();
  await db.quote.deleteMany();
  await db.shipment.deleteMany();
  await db.user.deleteMany();
  await db.customer.deleteMany();
  await db.party.deleteMany();

  console.log("Customers…");
  const customers = await Promise.all(
    CUSTOMERS.map((c) => db.customer.create({ data: { name: c.name, color: c.color } }))
  );

  console.log("Users…");
  await db.user.createMany({
    data: [
      { email: "stefan@frachtwerk.demo", name: "Stefan Anders", role: UserRole.ADMIN },
      { email: "ops@frachtwerk.demo", name: "Lisa Krämer", role: UserRole.OPERATOR },
      { email: "portal@boehler.demo", name: "Andrea Hofer", role: UserRole.CUSTOMER, customerId: customers[0].id },
      { email: "portal@miele.demo", name: "Thomas Feld", role: UserRole.CUSTOMER, customerId: customers[3].id },
    ],
  });

  console.log("Parties…");
  const shipperParties = await Promise.all(
    SHIPPERS.map((s) =>
      db.party.create({
        data: { name: s.name, country: s.country, city: s.city, type: PartyType.SHIPPER },
      })
    )
  );
  const consigneeParties = await Promise.all(
    CONSIGNEES.map((c) =>
      db.party.create({
        data: { name: c.name, country: c.country, city: c.city, type: PartyType.CONSIGNEE },
      })
    )
  );

  console.log("Shipments…");
  const nodeCodes = Object.keys(NODES);
  const airNodes = nodeCodes.filter((c) => NODES[c].kind === "AIR");
  const oceanNodes = nodeCodes.filter((c) => NODES[c].kind === "OCEAN");

  // Use REAL current time as base so the world clock progresses visibly from here.
  const TODAY = new Date();

  // Demo-scale shipments: ETAs in virtual-hours range so they visibly progress during a 10-30 min demo
  // At default compression=60 (1 real min = 1 virtual hour):
  //   - 4 shipments arriving in 3-12 virtual hours (3-12 real minutes)
  //   - 6 shipments arriving in 1-3 virtual days (24-72 real minutes — steady visible progress)
  //   - rest: normal seeded shipments

  for (let i = 0; i < 38; i++) {
    const mode: TransportMode = Math.random() > 0.4 ? TransportMode.OCEAN : TransportMode.AIR;
    const direction: Direction = Math.random() > 0.5 ? Direction.IMPORT : Direction.EXPORT;
    const pool = mode === TransportMode.AIR ? airNodes : oceanNodes;
    let fromCode = pick(pool);
    let toCode = pick(pool);
    while (toCode === fromCode) toCode = pick(pool);
    if (direction === Direction.IMPORT) {
      // Prefer toCode in EU
      const eu = pool.filter((c) => ["DE", "NL", "BE", "AT"].includes(NODES[c].country));
      const nonEu = pool.filter((c) => !["DE", "NL", "BE", "AT"].includes(NODES[c].country));
      if (eu.length && nonEu.length) {
        toCode = pick(eu);
        fromCode = pick(nonEu);
      }
    } else {
      const eu = pool.filter((c) => ["DE", "NL", "BE", "AT"].includes(NODES[c].country));
      const nonEu = pool.filter((c) => !["DE", "NL", "BE", "AT"].includes(NODES[c].country));
      if (eu.length && nonEu.length) {
        fromCode = pick(eu);
        toCode = pick(nonEu);
      }
    }
    const fromNode = NODES[fromCode];
    const toNode = NODES[toCode];

    const carrier = pick(CARRIERS);
    const commodity = pick(COMMODITIES);
    const customer = pick(customers);
    const shipper = pick(shipperParties);
    const consignee = pick(consigneeParties);

    // Determine bucket: demo-scale (quick progression) or regular
    // First 4 items: quick-arrival (ETA in 3-12 virtual hours)
    // Next 6 items: medium-arrival (ETA in 1-3 virtual days)
    // Rest: regular distribution
    let status: ShipmentStatus;
    let etd: Date, eta: Date;

    if (i < 4) {
      // Quick arrival — IN_TRANSIT already, ETA in 3-12 virtual hours
      status = ShipmentStatus.IN_TRANSIT;
      const hoursAgo = randInt(8, 36);
      const hoursToGo = randInt(3, 12);
      etd = new Date(TODAY.getTime() - hoursAgo * 3600 * 1000);
      eta = new Date(TODAY.getTime() + hoursToGo * 3600 * 1000);
    } else if (i < 10) {
      // Medium — IN_TRANSIT, ETA in 1-3 virtual days
      status = ShipmentStatus.IN_TRANSIT;
      const daysAgo = randInt(1, 3);
      const daysToGo = randInt(1, 3);
      etd = subDays(TODAY, daysAgo);
      eta = addDays(TODAY, daysToGo);
    } else {
      const statuses: ShipmentStatus[] = [
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.BOOKED,
        ShipmentStatus.BOOKED,
        ShipmentStatus.AT_DESTINATION,
        ShipmentStatus.CUSTOMS_CLEARANCE,
        ShipmentStatus.DELIVERED,
        ShipmentStatus.DELIVERED,
        ShipmentStatus.EXCEPTION,
      ];
      status = pick(statuses);

      const transitDays = mode === TransportMode.AIR ? randInt(1, 3) : randInt(18, 35);
      switch (status) {
        case ShipmentStatus.BOOKED:
          etd = addDays(TODAY, randInt(2, 20));
          eta = addDays(etd, transitDays);
          break;
        case ShipmentStatus.IN_TRANSIT:
          etd = subDays(TODAY, randInt(1, transitDays - 1));
          eta = addDays(etd, transitDays);
          break;
        case ShipmentStatus.AT_DESTINATION:
        case ShipmentStatus.CUSTOMS_CLEARANCE:
          etd = subDays(TODAY, transitDays + randInt(0, 2));
          eta = subDays(TODAY, randInt(0, 3));
          break;
        case ShipmentStatus.DELIVERED:
          etd = subDays(TODAY, transitDays + randInt(3, 20));
          eta = subDays(TODAY, randInt(2, 15));
          break;
        case ShipmentStatus.EXCEPTION:
          etd = subDays(TODAY, randInt(3, mode === TransportMode.AIR ? 2 : 20));
          eta = addDays(etd, transitDays);
          break;
        default:
          etd = TODAY;
          eta = addDays(TODAY, transitDays);
      }
    }

    const transitDays = Math.max(1, Math.round((eta.getTime() - etd.getTime()) / 86400000));

    const delayRiskScore = status === ShipmentStatus.EXCEPTION ? randInt(75, 98)
      : status === ShipmentStatus.IN_TRANSIT ? randInt(8, 70)
      : randInt(0, 30);
    const etaPredicted = delayRiskScore > 60 ? addDays(eta, randInt(1, 5)) : eta;

    const weightKg = mode === TransportMode.AIR ? rand(120, 4200) : rand(5000, 28000);
    const volumeM3 = mode === TransportMode.AIR ? weightKg / 167 : rand(20, 70);
    const chargeableKg = mode === TransportMode.AIR ? Math.max(weightKg, volumeM3 * 167) : weightKg;

    const distanceKm = Math.round(
      Math.acos(
        Math.sin((fromNode.lat * Math.PI) / 180) * Math.sin((toNode.lat * Math.PI) / 180) +
          Math.cos((fromNode.lat * Math.PI) / 180) *
            Math.cos((toNode.lat * Math.PI) / 180) *
            Math.cos(((fromNode.lon - toNode.lon) * Math.PI) / 180)
      ) * 6371 || 1000
    );
    const co2eKg = mode === TransportMode.AIR
      ? (weightKg / 1000) * distanceKm * 0.602
      : (weightKg / 1000) * distanceKm * 0.015;

    const refYear = 2026;
    const ref = `FW-${refYear}-${String(1000 + i).padStart(4, "0")}`;

    const shipment = await db.shipment.create({
      data: {
        ref,
        mode,
        direction,
        status,
        originCode: fromCode,
        originName: fromNode.name,
        originCountry: fromNode.country,
        originLat: fromNode.lat,
        originLon: fromNode.lon,
        destCode: toCode,
        destName: toNode.name,
        destCountry: toNode.country,
        destLat: toNode.lat,
        destLon: toNode.lon,
        etd,
        eta,
        etaPredicted,
        delayRiskScore,
        carrier: carrier.name,
        carrierCode: carrier.code,
        mawb: mode === TransportMode.AIR ? `${carrier.code}-${randInt(10000000, 99999999)}` : null,
        hbl: mode === TransportMode.OCEAN ? `${carrier.code}${randInt(100000000, 999999999)}` : null,
        vessel: mode === TransportMode.OCEAN ? pick(VESSELS) : null,
        voyage: mode === TransportMode.OCEAN ? `${randInt(200, 800)}W` : null,
        flightNumber: mode === TransportMode.AIR ? `${carrier.code}${randInt(100, 899)}` : null,
        containerNos: mode === TransportMode.OCEAN
          ? Array.from({ length: randInt(1, 3) }, () => `${pick(["MSKU", "TCLU", "TEMU", "CMAU"])}${randInt(1000000, 9999999)}`)
          : [],
        weightKg: Math.round(weightKg),
        volumeM3: Number(volumeM3.toFixed(2)),
        chargeableKg: Math.round(chargeableKg),
        pieces: randInt(1, 400),
        incoterm: pick(INCOTERMS),
        commodity: commodity.name,
        hsCodes: commodity.hs,
        co2eKg: Math.round(co2eKg),
        dangerousGoods: Math.random() > 0.85,
        customerId: customer.id,
        shipperId: shipper.id,
        consigneeId: consignee.id,
      },
    });

    // Milestones
    const milestones: { code: string; label: string; location?: string; timestamp: Date; source: string; isFuture: boolean }[] = [];
    const isAir = mode === TransportMode.AIR;
    milestones.push({ code: "BOOKED", label: "Sendung gebucht", timestamp: subHours(etd, randInt(24, 96)), source: "MANUAL", isFuture: false });
    milestones.push({ code: "DOCS_RECEIVED", label: "Dokumente empfangen", timestamp: subHours(etd, randInt(12, 48)), source: "OCR", isFuture: false });
    if (status !== ShipmentStatus.BOOKED) {
      milestones.push({ code: isAir ? "DEP" : "LOAD", label: isAir ? `Abflug ${fromCode}` : `Verladen auf ${fromCode}`, location: fromNode.name, timestamp: etd, source: isAir ? "AIRLINE_EDI" : "AIS", isFuture: false });
    }
    if (([ShipmentStatus.AT_DESTINATION, ShipmentStatus.CUSTOMS_CLEARANCE, ShipmentStatus.DELIVERED] as ShipmentStatus[]).includes(status)) {
      milestones.push({ code: isAir ? "ARR" : "DISCHARGE", label: isAir ? `Ankunft ${toCode}` : `Entladen ${toCode}`, location: toNode.name, timestamp: eta, source: isAir ? "AIRLINE_EDI" : "AIS", isFuture: false });
    }
    if (status === ShipmentStatus.CUSTOMS_CLEARANCE) {
      milestones.push({ code: "CUSTOMS_IN_PROGRESS", label: "Zollabfertigung läuft", location: toNode.name, timestamp: addHours(eta, 8), source: "MANUAL", isFuture: false });
    }
    if (status === ShipmentStatus.DELIVERED) {
      milestones.push({ code: "DELIVERED", label: "Zugestellt beim Empfänger", location: consignee.city ?? toNode.name, timestamp: addDays(eta, randInt(1, 3)), source: "MANUAL", isFuture: false });
    }
    if (status === ShipmentStatus.EXCEPTION) {
      milestones.push({
        code: "DELAY",
        label: `Delay: ${pick(["Port congestion", "Wetterbedingte Verspätung", "Umladung verpasst", "Carrier storniert Leg", "Hafen-Streik"])}`,
        location: "In Transit",
        timestamp: addHours(etd, randInt(12, 80)),
        source: "MANUAL",
        isFuture: false,
      });
    }
    // Future milestones
    if (([ShipmentStatus.BOOKED, ShipmentStatus.IN_TRANSIT] as ShipmentStatus[]).includes(status)) {
      if (status === ShipmentStatus.IN_TRANSIT && !isAir) {
        milestones.push({ code: "TRANSSHIPMENT", label: `Transshipment ${pick(["Singapur", "Jebel Ali", "Port Said"])}`, timestamp: addDays(etd, Math.floor(transitDays / 2)), source: "AIS", isFuture: false });
      }
      milestones.push({ code: "ETA", label: isAir ? `Ankunft geplant ${toCode}` : `Geplante Ankunft ${toCode}`, location: toNode.name, timestamp: etaPredicted, source: "PREDICTED", isFuture: true });
      milestones.push({ code: "CUSTOMS_PLANNED", label: "Zollabfertigung geplant", location: toNode.name, timestamp: addHours(etaPredicted, 12), source: "PLANNED", isFuture: true });
      milestones.push({ code: "DELIVERY_PLANNED", label: "Geplante Zustellung", timestamp: addDays(etaPredicted, 2), source: "PLANNED", isFuture: true });
    }

    await db.milestone.createMany({
      data: milestones.map((m) => ({ ...m, shipmentId: shipment.id })),
    });

    // Documents
    const docs = [
      { type: isAir ? "AWB" : "BL", filename: isAir ? `MAWB-${shipment.mawb ?? ref}.pdf` : `HBL-${shipment.hbl ?? ref}.pdf`, mimeType: "application/pdf", sizeBytes: randInt(130000, 900000), extractionConfidence: 0.96 },
      { type: "COMMERCIAL_INVOICE", filename: `CI-${ref}.pdf`, mimeType: "application/pdf", sizeBytes: randInt(80000, 350000), extractionConfidence: 0.93 },
      { type: "PACKING_LIST", filename: `PL-${ref}.pdf`, mimeType: "application/pdf", sizeBytes: randInt(45000, 180000), extractionConfidence: 0.97 },
    ];
    if (direction === Direction.IMPORT && Math.random() > 0.5) {
      docs.push({ type: "CERTIFICATE_OF_ORIGIN", filename: `CO-${ref}.pdf`, mimeType: "application/pdf", sizeBytes: randInt(40000, 120000), extractionConfidence: 0.89 });
    }
    await db.document.createMany({
      data: docs.map((d) => ({
        ...d,
        shipmentId: shipment.id,
        extractedJson: {
          fields: {
            shipper: shipper.name,
            consignee: consignee.name,
            origin: fromCode,
            destination: toCode,
            pieces: shipment.pieces,
            weight: `${shipment.weightKg} kg`,
            commodity: commodity.name,
            hs: commodity.hs,
          },
        },
      })),
    });

    // Customs declarations
    if (direction === Direction.IMPORT && toNode.country === "DE") {
      await db.customsDeclaration.create({
        data: {
          shipmentId: shipment.id,
          regime: CustomsRegime.ATLAS_DE,
          status: status === ShipmentStatus.DELIVERED ? CustomsStatus.CLEARED
            : status === ShipmentStatus.CUSTOMS_CLEARANCE ? CustomsStatus.SUBMITTED
            : CustomsStatus.DRAFT,
          mrn: `26DE${randInt(100000000, 999999999)}`,
          deniedPartyCheck: true,
          submittedAt: status !== ShipmentStatus.BOOKED ? subHours(TODAY, randInt(6, 72)) : null,
          clearedAt: status === ShipmentStatus.DELIVERED ? subHours(TODAY, randInt(2, 48)) : null,
        },
      });
    } else if (direction === Direction.EXPORT && fromNode.country === "DE") {
      await db.customsDeclaration.create({
        data: {
          shipmentId: shipment.id,
          regime: CustomsRegime.ATLAS_DE,
          status: CustomsStatus.CLEARED,
          mrn: `26DE${randInt(100000000, 999999999)}`,
          deniedPartyCheck: true,
          submittedAt: subHours(etd, randInt(24, 96)),
          clearedAt: subHours(etd, randInt(2, 20)),
        },
      });
    }
    if (toNode.country === "US" && direction === Direction.EXPORT) {
      await db.customsDeclaration.create({
        data: {
          shipmentId: shipment.id,
          regime: CustomsRegime.AES_US,
          status: CustomsStatus.ACCEPTED,
          mrn: `ITN${randInt(100000000, 999999999)}`,
          deniedPartyCheck: true,
          submittedAt: subHours(etd, 72),
        },
      });
    }
  }

  // Quotes
  console.log("Quotes…");
  for (let i = 0; i < 14; i++) {
    const mode = Math.random() > 0.5 ? TransportMode.OCEAN : TransportMode.AIR;
    const pool = mode === TransportMode.AIR ? airNodes : oceanNodes;
    const origin = pick(pool);
    let dest = pick(pool);
    while (dest === origin) dest = pick(pool);
    const statusArr = [QuoteStatus.OPEN, QuoteStatus.OPEN, QuoteStatus.SENT, QuoteStatus.ACCEPTED, QuoteStatus.DECLINED, QuoteStatus.EXPIRED];
    const s = pick(statusArr);
    const total = mode === TransportMode.AIR ? rand(3200, 22000) : rand(2500, 9500);
    await db.quote.create({
      data: {
        ref: `Q-2026-${String(200 + i).padStart(4, "0")}`,
        status: s,
        mode,
        origin,
        destination: dest,
        incoterm: pick(INCOTERMS),
        validUntil: addDays(TODAY, randInt(3, 30)),
        totalUsd: Math.round(total),
        customerId: pick(customers).id,
        linesJson: {
          lines: [
            { label: "Ocean / Air basic freight", usd: Math.round(total * 0.7) },
            { label: "Bunker surcharge (BAF)", usd: Math.round(total * 0.08) },
            { label: "Terminal handling charges", usd: Math.round(total * 0.07) },
            { label: "Documentation & ISPS", usd: Math.round(total * 0.05) },
            { label: "Customs clearance & filings", usd: Math.round(total * 0.1) },
          ],
        },
      },
    });
  }

  // Workflows
  console.log("Workflows…");
  await db.workflow.createMany({
    data: [
      {
        name: "Auto ATLAS-Anmeldung bei B/L-Eingang",
        description: "Bei Eingang eines Ocean B/L → Daten extrahieren → Denied-Party-Check → ATLAS-Anmeldung erzeugen → Kunde benachrichtigen.",
        enabled: true,
        runsLast7d: 23,
        triggerJson: { type: "DOCUMENT_RECEIVED", filter: { type: "BL" } },
        stepsJson: [
          { type: "ai_extract", model: "claude-opus-4-7" },
          { type: "sanctions_check", lists: ["EU", "UN", "US_OFAC"] },
          { type: "create_customs_declaration", regime: "ATLAS_DE" },
          { type: "notify", channel: "email", template: "atlas_submitted" },
        ],
      },
      {
        name: "Delay-Alert → Kunde",
        description: "Wenn predictive ETA >24h von Plan-ETA abweicht, Slack + Email an Customer-Manager.",
        enabled: true,
        runsLast7d: 8,
        triggerJson: { type: "ETA_CHANGE", threshold_hours: 24 },
        stepsJson: [
          { type: "compose_message", template: "delay_notice" },
          { type: "notify", channel: "slack", room: "#ops-alerts" },
          { type: "notify", channel: "email", to: "customer" },
        ],
      },
      {
        name: "CBAM Quarterly Report",
        description: "Aggregiert HS-Codes (Stahl, Zement, Aluminium, Dünger, Wasserstoff) aus Importen zum Quartalsende und generiert XML.",
        enabled: true,
        runsLast7d: 0,
        triggerJson: { type: "CRON", cron: "0 0 1 */3 *" },
        stepsJson: [
          { type: "db_query", collection: "shipments" },
          { type: "aggregate", by: "cn_code" },
          { type: "generate_xml", format: "CBAM_Q_2026" },
          { type: "notify", channel: "email", to: "compliance" },
        ],
      },
      {
        name: "Rate Re-Quote bei Carrier-Preisänderung",
        description: "Täglich Freightos-Feed prüfen — bei >8% Ratenverfall automatisch neues Angebot an Top-Kunden.",
        enabled: false,
        runsLast7d: 0,
        triggerJson: { type: "CRON", cron: "0 6 * * *" },
        stepsJson: [
          { type: "fetch_feed", source: "freightos" },
          { type: "detect_price_change", threshold: 0.08 },
          { type: "generate_quote", customer: "top_20" },
        ],
      },
    ],
  });

  // CBAM Reports
  console.log("CBAM reports…");
  await db.cbamReport.createMany({
    data: [
      { period: "2026-Q1", status: "READY_TO_SUBMIT", cnCodes: ["7208.39", "7208.51", "7304.19", "7318.15"], totalEmbeddedEmissionsT: 87.4 },
      { period: "2025-Q4", status: "SUBMITTED", cnCodes: ["7208.39", "7304.19"], totalEmbeddedEmissionsT: 72.1, submittedAt: new Date("2026-01-28") },
      { period: "2025-Q3", status: "SUBMITTED", cnCodes: ["7208.39", "2523.29"], totalEmbeddedEmissionsT: 65.8, submittedAt: new Date("2025-10-27") },
    ],
  });

  // World Clock
  console.log("World Clock…");
  await db.worldClock.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", compression: 60 },
    update: { epochRealStart: new Date(), epochVirtualStart: new Date(), compression: 60, ticks: 0, lastTickAt: new Date() },
  });

  // Carrier Rates matrix — used by Rate-Lookup modal
  console.log("Carrier Rates…");
  const rateRows: any[] = [];
  const oceanCarriers = [
    { name: "Maersk", code: "MAEU" },
    { name: "MSC", code: "MSCU" },
    { name: "CMA CGM", code: "CMAU" },
    { name: "Hapag-Lloyd", code: "HLCU" },
  ];
  const airCarriers = [
    { name: "Lufthansa Cargo", code: "LH" },
    { name: "Cathay Pacific", code: "CX" },
    { name: "Emirates SkyCargo", code: "EK" },
  ];
  for (const fr of ["CNSHA", "CNNGB", "SGSIN", "USLAX", "USNYC"]) {
    for (const to of ["DEHAM", "DEBRV", "NLRTM", "BEANR"]) {
      if (fr === to) continue;
      for (const c of oceanCarriers) {
        rateRows.push({
          carrier: c.name,
          carrierCode: c.code,
          origin: fr,
          destination: to,
          mode: TransportMode.OCEAN,
          transitDays: 20 + Math.floor(Math.random() * 14),
          basePerContainer: 2400 + Math.floor(Math.random() * 2000),
          co2ePerKg: 0.015,
          validUntil: addDays(TODAY, 30),
        });
      }
    }
  }
  for (const fr of ["PVG", "HKG", "NRT", "FRA", "AMS"]) {
    for (const to of ["JFK", "ORD", "FRA", "AMS", "DXB"]) {
      if (fr === to) continue;
      for (const c of airCarriers) {
        rateRows.push({
          carrier: c.name,
          carrierCode: c.code,
          origin: fr,
          destination: to,
          mode: TransportMode.AIR,
          transitDays: 1 + Math.floor(Math.random() * 3),
          basePerKg: 3 + Math.random() * 3.5,
          co2ePerKg: 0.602,
          validUntil: addDays(TODAY, 14),
        });
      }
    }
  }
  if (rateRows.length) await db.carrierRate.createMany({ data: rateRows });

  // Alerts
  console.log("Alerts…");
  const ships = await db.shipment.findMany({ where: { status: { in: [ShipmentStatus.EXCEPTION, ShipmentStatus.IN_TRANSIT] } }, take: 8 });
  await db.alert.createMany({
    data: [
      ...ships.slice(0, 3).map((s) => ({
        level: "warning",
        title: `Predictive Delay: ${s.ref}`,
        body: `Ankunft ${s.destCode} verschiebt sich voraussichtlich um ${Math.round(Math.random() * 3 + 1)} Tage. Ursache: Port congestion (Index 0.71).`,
        shipmentId: s.id,
      })),
      ...ships.slice(3, 5).map((s) => ({
        level: "critical",
        title: `Exception: ${s.ref}`,
        body: `Carrier meldet Exception. Kunde sollte proaktiv informiert werden.`,
        shipmentId: s.id,
      })),
      { level: "info", title: "CBAM Q1 2026 bereit zur Einreichung", body: "Quarterly Report mit 14 relevanten Sendungen liegt zur Freigabe." },
      { level: "info", title: "Neuer Carrier onboardet", body: "Hapag-Lloyd EDI-Endpoint produktiv — 3 Lanes verfügbar." },
    ],
  });

  // Seed live notifications
  console.log("Notifications…");
  const seedShips = await db.shipment.findMany({ take: 6, orderBy: { createdAt: "desc" } });
  await db.notification.createMany({
    data: seedShips.map((s, i) => ({
      level: (["info", "success", "warning", "info", "success", "info"] as const)[i],
      title:
        i === 0 ? `${s.ref} · Status-Update` :
        i === 1 ? `${s.ref} · Zugestellt` :
        i === 2 ? `${s.ref} · Delay erkannt` :
        i === 3 ? `${s.ref} · Dokumente empfangen` :
        i === 4 ? `${s.ref} · ATLAS akzeptiert` :
                  `${s.ref} · Pre-Alert versandt`,
      body: `${s.originCode} → ${s.destCode}`,
      shipmentId: s.id,
      href: `/shipments/${s.id}`,
      readAt: i > 2 ? new Date(Date.now() - i * 3600 * 1000) : null,
      createdAt: new Date(Date.now() - i * 180 * 1000),
    })),
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
