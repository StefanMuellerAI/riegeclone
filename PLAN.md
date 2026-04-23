# Frachtwerk — Clone von Riege Scope

> **Status: Früher Prototyp / Technology Demo.** Nicht produktionsreif. Zweck: Zeigen, wie ein moderner Wettbewerber Riege Scope heute mit AI-First-Features und moderner UX angreifen könnte.

---

## 1. Was ist Riege Scope?

Riege Software GmbH (Meerbusch, gegründet 1985, ~700 Kunden in 60 Ländern) vertreibt **Scope** — ein cloud-basiertes Transport Management System (TMS) für Spediteure. Scope ist SaaS, kam 2009 in die Marktreife, gilt als einer der deutschen Quasi-Standards für digitale Luft-/Seefracht-Abwicklung.

### Scope Module & Features (ermittelt aus riege.com und Confluence Wiki)

**Air Freight (Import/Export)**
- Angebotserstellung, Buchung, Abrechnung
- E-AWB (elektronisches Air Waybill)
- Airline Messaging (IATA Cargo IMP/XML)
- Flight Schedule / Booking Portal
- Cargo iQ Qualitätskontrolle

**Ocean Freight (Import/Export)**
- Shipment Creation, Multi-Leg Tracking
- Ocean Carrier Messaging (EDI INTTRA / CargoWise-kompatibel)
- Sailing Schedules
- Port/News-Portal-Integration

**Customs**
- ATLAS (DE), e-dec (CH), NCTS (EU-Transit), AES/ISF (US), Sagitta/AGS (NL)
- RAKC Screening, Denied Party Screening (UN/EU/US-Sanktionslisten)

**Quer-Module**
- Quotations, Cost Control, Shipment Monitor, Track & Trace
- Transport Orders, E-Invoice
- Documents & Archive, Dangerous Goods, CO2-Rechner
- Personal Quick Access Dashboard

**Zielgruppe**: Internationale Spediteure (Air/Ocean), Zollagenten, Import/Export-Firmen. DB Schenker ist prominenter Referenzkunde.

### Wahrgenommene Schwächen (2026er Blick)

1. Klassisches Enterprise-UI — funktional, aber nicht modern.
2. Kein sichtbares AI-First-Story (OCR via Templates, kein LLM-basiertes Extraction / Copilot).
3. Kein CBAM-Modul im Marketing (CBAM ist seit 2026 Pflicht für EU-Importeure).
4. Kein öffentliches API-Marketplace / Self-Service-Integration.
5. Customer-Portal / Shipper-Self-Service eher als Track&Trace-Link, kein vollwertiges Portal.
6. Keine Workflow-Automation-Engine (Forwarder behelfen sich mit Zapier/n8n außen rum).
7. Keine Live-Vessel/Flight-Map mit AIS/ADS-B-Integration.

---

## 2. Produktvision Frachtwerk

**Frachtwerk** ist ein moderner, AI-nativer Scope-Klon: gleiche Hauptdomänen (Air/Ocean/Customs/Quotations/Documents), aber mit sieben expliziten "Moat-Breakern", die das Riege-Angebot unter Druck setzen.

### Feature-Parität mit Scope
| Modul | Scope | Frachtwerk |
|---|---|---|
| Air Freight Import/Export | ✓ | ✓ (Demo-Stub) |
| Ocean Freight Import/Export | ✓ | ✓ (Demo-Stub) |
| Customs (ATLAS/e-dec/NCTS/AES) | ✓ (live) | ✓ (UI-Mockup, keine echte Behördenanbindung) |
| Quotations → Booking → Invoice | ✓ | ✓ |
| Shipment Monitor / Track & Trace | ✓ | ✓ |
| Documents & Archive | ✓ | ✓ |
| Dangerous Goods | ✓ | ✓ (Flag+Compliance-Check) |
| Denied Party Screening | ✓ | ✓ (Mock-API) |
| CO2-Rechner | ✓ | ✓ |

### Frachtwerk-Differenzierer (Dinge, die Riege heute **nicht** so hat)

1. **AI Document Extraction** — Drop PDF (B/L, Commercial Invoice, Packing List, AWB). LLM extrahiert Container-Nr., HS-Codes, Parties, Gewichte → Shipment wird direkt befüllt. Keine Templates. Keine spatial OCR, die bei neuen Layouts bricht.
2. **Frachtwerk Copilot** — Chat-Assistent mit Function-Calls in die Datenbank: *"Welche Sendungen aus Shanghai sind diese Woche >2 Tage verspätet?"*, *"Erstelle Quote für 2x 40HC Rotterdam → Chicago"*.
3. **Predictive ETA** — ML-Scoring von Delays basierend auf Hafen-Congestion, Wetter, Carrier-Historie. (Demo: regelbasiert.)
4. **Live-Map mit Vessel/Flight-Position** — MarineTraffic/AISstream + OpenSky, auf Shipment-Detailseite und Dashboard.
5. **CBAM-Modul** — Pflicht-Meldung ab 2026 für EU-Importeure (Stahl/Zement/Dünger/Aluminium). Scope bewirbt es nicht. Frachtwerk liefert fertige Quarterly-Reports.
6. **Visual Workflow Builder** — n8n-artiger Flow-Editor im TMS: "Wenn B/L eingeht → Denied-Party-Check → bei Clean: ATLAS-Anmeldung erzeugen → Kunde benachrichtigen".
7. **White-Label Customer Portal** — Kunde des Spediteurs loggt sich ein, sieht nur *seine* Sendungen, lädt Dokumente, stellt Anfragen. Ein Kern-Verkaufsargument gegen Scope.

### Bonus (falls Zeit)
- **Spot-Rate Marketplace** — Freightos/Xeneta-Style Rate Ingestion inline.
- **Slack/Teams Webhook** — Milestone-Alerts in Kanäle.
- **Mobile PWA** — installable, Offline-Manifest.
- **OpenAPI-Spec + Postman-Collection** — "API-First Story" als Storytelling.

---

## 3. Technischer Stack

| Schicht | Wahl | Warum |
|---|---|---|
| Frontend + Backend | **Next.js 15 (App Router) + TypeScript** | Monolith, Server Actions, schneller Demo-Aufbau |
| UI Kit | **Tailwind + shadcn/ui + lucide-react** | Modernes, cleanes Look-and-Feel |
| ORM / DB | **Prisma + PostgreSQL 16** | Einfaches Schema, pgvector-ready |
| State / Queries | **TanStack Query (client-side)** | Wo nötig |
| Auth | Einfaches Cookie-Session (NextAuth v5 optional) | Demo-Niveau |
| Map | **MapLibre GL + world.geojson** | Leicht, kein Google-Token |
| Charts | **Recharts** | KPIs / CO2 |
| AI | **Anthropic Claude API** (Opus 4.7) für Document Extraction + Copilot | State of the Art |
| Container | **Docker + docker compose** (App + Postgres) | "Demo in einem Befehl" |

**Out of scope (explizit für den Prototyp):**
- Kein echter IATA/EDI-Connector, keine echte Zollbehörden-Anbindung.
- Kein Payment.
- Keine produktionsreife Multi-Tenant-Isolation.

---

## 4. Projektstruktur

```
RiegeClone/
├── PLAN.md                         # Dieses Dokument
├── docker-compose.yml              # Postgres + App
├── Dockerfile                      # Next.js Production Build
├── .env.example                    # DATABASE_URL, ANTHROPIC_API_KEY (optional)
├── app/
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── prisma/
│   │   ├── schema.prisma           # Shipment, Quote, Party, Document, Milestone, Customs, User
│   │   └── seed.ts                 # ~30 realistische Sendungen
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx            # Dashboard
│       │   ├── shipments/
│       │   ├── quotes/
│       │   ├── partners/
│       │   ├── customs/
│       │   ├── cbam/
│       │   ├── documents/
│       │   ├── workflows/
│       │   ├── portal/             # Customer Portal (getrennter Layout-Tree)
│       │   ├── track/[code]/       # Öffentlicher Track&Trace-Link
│       │   └── api/
│       │       ├── copilot/route.ts    # Claude function-calling
│       │       └── extract/route.ts    # Document AI
│       ├── components/ui/          # shadcn-Komponenten
│       ├── components/             # App-spezifische
│       ├── lib/
│       │   ├── db.ts
│       │   ├── anthropic.ts
│       │   └── seed-data.ts
│       └── styles/globals.css
```

---

## 5. Datenmodell (Kern)

```
User            (id, email, name, role, customerId?)
Customer        (id, name, white-label logo/color)
Party           (id, name, type[SHIPPER|CONSIGNEE|NOTIFY|CARRIER], address, country)
Shipment        (id, ref, mode[AIR|OCEAN], direction[IMPORT|EXPORT], status,
                 origin, destination, etd, eta, carrier, mawb/hbl,
                 weightKg, volumeM3, chargeableKg, incoterm,
                 co2eKg, customerId, shipperId, consigneeId)
Milestone       (id, shipmentId, code, description, timestamp, location, source)
Document        (id, shipmentId, type, filename, extractedJson, storageKey)
Quote           (id, ref, status, ratesJson, validUntil, customerId, shipmentId?)
CustomsDec      (id, shipmentId, regime[ATLAS|EDEC|NCTS|AES], status, mrn)
Workflow        (id, name, definitionJson, enabled)
CbamReport      (id, period, status, cnCodes[], embeddedEmissionsTons)
```

---

## 6. Build-Reihenfolge

1. ✅ Recherche abgeschlossen
2. 🟡 **PLAN.md** (hier)
3. Scaffold Next.js, Tailwind, shadcn, Prisma
4. docker-compose mit Postgres
5. Prisma Schema + Seed
6. Shared Layout (Sidebar, Top-Bar, "Early Demo"-Banner)
7. Dashboard / Shipment Monitor (KPIs, Live-Map, Alerts)
8. Shipments-Liste + Detail
9. Quotations Wizard
10. Customs-Übersicht
11. AI Document Extraction (Claude-gestützt, mit Fallback-Mock)
12. AI Copilot (Chat-Drawer rechts im Screen)
13. CBAM-Modul
14. Customer Portal + `/track/[code]`
15. Polish: Demo-Walkthrough-Tour, Präsentations-Mode

---

## 7. Demo-Szenario beim Kundentermin

1. **Kontext-Seite:** Landing → "Frachtwerk — built in one week by a single engineer with Claude."
2. **Dashboard** mit Live-Map, KPI-Kacheln, aktuellem Shipment-Feed.
3. **Shipment-Detail** Air Freight: Milestones-Timeline, Parties, Dokumente, Copilot-Drawer öffnen → *"Wann erreicht FWC-2026-0123 den Empfänger?"*.
4. **Document Extraction Demo:** B/L-PDF drag-droppen → Felder werden in Echtzeit befüllt.
5. **CBAM-Report:** Quarterly Report Q1 2026, fertig generiert.
6. **Customer Portal** in zweitem Browser-Tab → selben Shipment aus Kundensicht.
7. **Workflow Builder:** Fertiger Flow "B/L → Denied Party → ATLAS → Notify Customer".

**Narrativ:** "Sieben Tage Arbeit. Ein Entwickler. Claude. Das ist der Druck, den Sie auf dem Markt jetzt bekommen — wenn dieses Zeug aus einem Garagen-Startup in Nullzeit kommt, was passiert, wenn ein finanzierter Wettbewerber das macht?"
