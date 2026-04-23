# Plan V2 — Demo-Härtung

> Ziel: Beim Riege-Termin soll sich das Demo anfühlen wie ein echtes Produkt. Kein toter Button, kein toter Dialog. Externe Systeme (Carrier-EDI, ATLAS, DEHSt, Freightos, Slack, AIS) sind Mocks — aber realistische: Latenzen, Fehlerfälle, konkrete Daten.

---

## 1. Audit — was in V1 NICHT funktioniert

### Globale UI (sichtbar auf jeder Seite)
- TopBar-Suche (Platzhalter)
- ⌘K Keyboard-Shortcut (keine Palette)
- Bell (Notifications) — öffnet nichts
- HelpCircle — öffnet nichts
- "Neue Sendung" in TopBar — geht zu /shipments/new, aber die Buttons dort tun nichts
- Sidebar User-Widget + Settings-Icon — tot

### Dashboard
- "Doc hochladen" → funktioniert (Link)
- "Neue Sendung" → funktioniert (Link)
- Delay-Queue-Einträge → funktionieren (Links zu Detail)
- "Alle ansehen →" → funktioniert

### Shipments Liste
- Filter-Button — tot
- Suchfeld — funktioniert (GET param)
- Mode/Status Chips — funktionieren (Links)
- Row-Klick → funktioniert

### Shipment Detail
- "Copilot fragen" — tot
- "Nachricht" — tot
- "Aktualisieren" — tot
- Tabs — funktionieren
- "Aus Extraktion Sendung anlegen" (im Extract) — tot
- "Öffnen" pro Dokument — tot

### Quotes
- "AI-Quote" — funktioniert (Link zu Copilot)
- "Neues Angebot" — tot
- Row-Klick → /quotes/[id] — **404**

### Customs
- Regime-Cards — tot (sollten filtern)

### Documents
- "Hochladen & extrahieren" — funktioniert
- Kein einzelner Doc-Detail-Link

### Extract
- File-Upload + Extraktion — funktioniert
- "Aus Extraktion Sendung anlegen" — tot

### CBAM
- "Report generieren" — tot
- "Emissionsdaten hochladen" — tot
- "Jetzt einreichen" — tot
- "XML-Export" — tot
- "PDF-Vorschau" — tot

### Workflows
- Switch — tot (kein Persist)
- "Testlauf" — tot
- "Neuer Workflow" — tot
- Template-Karten — tot

### Radar
- Rein anzeigend — OK

### Screening
- Ad-hoc Input + "Screenen" — tot
- "Bulk-CSV" — tot
- "Clear / Block / Escalate" pro Hit — tot

### Portal (Kundensicht)
- Suchfeld — tot
- Rechnung Download — tot
- Angebot anfragen — tot
- Keine Möglichkeit, zwischen Kunden zu wechseln

### /track/[code]
- Reine Anzeige — OK

### /shipments/new
- Alle drei Wege — tot bis auf "Dokument hochladen"
- Schnellerfassungs-Formular — tot

---

## 2. Was für die Demo funktionieren MUSS

### Tier 1 — diese Klicks wird der Kunde mit 100% Wahrscheinlichkeit testen
1. **Command Palette (⌘K)** — Globale Suche über Shipments, Quotes, Partners, Seiten. Immer verfügbar.
2. **Notification-Drawer** (Bell) — Alerts mit Read/Unread, "Go to Shipment"
3. **Neue Sendung (Wizard)** — 4-step Modal: Mode → Lane → Parties/Cargo → Rates-Lookup (mock 3 Carrier) → Confirm. Erzeugt echte DB-Row mit Milestones.
4. **Neues Angebot** — Modal: Origin, Dest, Cargo → Raten-Matrix (mock) → Save as Draft
5. **Quote Detail** (`/quotes/[id]`) mit Line Items, "Senden" → Status-Change, "Annehmen → Sendung anlegen"
6. **Shipment Actions** (Dropdown auf Detail-Seite):
   - Status setzen (BOOKED → IN_TRANSIT → …)
   - Milestone hinzufügen
   - Pre-Alert an Kunde senden (mock Email + Slack)
   - Zollanmeldung starten
7. **Copilot Open with Context** — "Copilot fragen" am Shipment öffnet Dock mit pre-fill "Status zu FW-2026-1023?"
8. **Workflow Toggle** — Switch persistiert in DB
9. **Workflow Testlauf** — Modal zeigt Schritt-für-Schritt Log (mock ausgeführt in 3s)
10. **Customs submit (ATLAS)** — Button "Einreichen" → 2s Animation → MRN erscheint → Status wird SUBMITTED
11. **CBAM Report generate + submit** — Button-Klicks mit realistischer Simulation
12. **Screening Ad-hoc** — Input-Feld → Enter → zeigt Hits (Heuristik: "Iran", "Huawei", "Shenzhen" → Treffer)
13. **Portal Angebot anfragen** — erzeugt Quote in DB, Toast-Feedback
14. **Rechnung Download Portal** — erzeugt PDF-Stub (mock)
15. **Extract → Shipment anlegen** — nach Extraktion: "Sendung anlegen" → neue Sendung mit extrahierten Daten

### Tier 2 — sichtbare Polish-Details
- **Command-K Palette** zeigt Recents + Suggestions ("Neue Sendung", "Neues Angebot")
- **Toast/Sonner** Feedback-Layer nach Aktionen ("Sendung FW-2026-1042 angelegt")
- **Workflow-Run Log-Stream** — simuliert Step-by-Step Ausführung
- **Customer-Switcher im Portal** — dropdown oben rechts, wechselt Kundenperspektive
- **Rate-Lookup Panel** — Freightos-Style Matrix mit 3 Carrier, Transit-Zeiten, CO2e
- **Sailing Schedule Popover** beim Rate-Lookup
- **Document-Viewer Modal** — "Öffnen" zeigt extrahiertes JSON + dummy PDF-Preview
- **Settings/Profile Dropdown** in Sidebar
- **Help-Dialog** — Demo-Walkthrough auf "?"-Klick

### Tier 3 — skip (kein Budget, keine Demo-Relevanz)
- Echter Auth-Flow (Login-Seite)
- Multi-Tenant Isolation
- Echte Payment/Billing
- Bulk-CSV-Upload

---

## 3. Technischer Ansatz

### Mock-Service-Layer (`src/lib/mocks/`)
Einzelner zentraler Ort für alle "externen" Systeme. Jede Funktion:
- Akzeptiert realistische Inputs (Ports, Carrier-Codes, Gewichte)
- Simuliert Latenz 200–1400ms (via `await sleep()`)
- Kann deterministisch Fehler werfen (10% Rate bei ATLAS z.B.)
- Gibt realistische, aus seeded Daten abgeleitete Outputs zurück

Dateien:
- `rates.ts` — `lookupRates(origin, dest, mode, weightKg) → Array<{carrier, transitDays, usd, co2eKg}>`
- `schedules.ts` — `nextSailings(origin, dest) → Array<{vessel, voyage, etd, eta, cutoff}>`
- `customs.ts` — `submitAtlas(payload) → {mrn, acceptedAt}`
- `carriers.ts` — `preAlert(shipment) → {messageId, channel}`
- `notifications.ts` — `sendSlack(channel, msg)`, `sendEmail(to, subj, body)` — loggt in DB
- `sanctions.ts` — `screen(name) → {matches: Hit[], clean: boolean}` mit Heuristik
- `ais.ts` — `vesselPosition(vessel, progress) → {lat, lon, speed, heading}`
- `port.ts` — `portCongestion(code) → {index, vessels_waiting, berth_availability}`

### Server Actions (`src/app/actions/`)
Next.js Server Actions — direkt an UI-Buttons gebunden:
- `shipments.ts`: create, updateStatus, addMilestone, requestPreAlert
- `quotes.ts`: create, send, accept, decline
- `customs.ts`: submitDeclaration (calls mock ATLAS)
- `workflows.ts`: toggle, testRun
- `cbam.ts`: submitReport
- `screening.ts`: screenParty
- `notifications.ts`: markRead, dismiss

### Neue DB-Tabellen
- `WorkflowRun` (id, workflowId, status, stepsJson, startedAt, finishedAt)
- `Notification` (id, level, title, body, shipmentId?, userId?, readAt?, createdAt) — ersetzt/ergänzt `Alert`
- `NotificationLog` (id, channel[slack|email], to, subject, body, sentAt) — für Audit
- `CarrierRate` seeded — für echte Rate-Lookups

### Neue UI-Komponenten
- `CommandPalette` (cmdk library ODER eigen gebaut mit Dialog + search)
- `NotificationDrawer` (Sheet von rechts)
- `NewShipmentWizard` (Dialog mit Stepper)
- `QuoteCreateDialog` (Dialog)
- `ShipmentActionsMenu` (DropdownMenu)
- `WorkflowRunDialog` (Dialog mit live Log)
- `CustomsSubmitDialog` (Dialog mit Submission-Animation)
- `ScreeningSearchBar` (Input + Hit-Liste)
- `CustomerSwitcher` (DropdownMenu im Portal)
- `RateMatrix` (Tabelle mit Carrier-Optionen)
- `SailingSchedulePopover`
- `DocumentViewerDialog`
- `Toast/Sonner` System (sonner lib)

### Shared
- `useOptimistic` / Toast-Feedback für fast jede Action
- Global State nur wo nötig (Sidebar open state bleibt URL-based)
- Zod-Schemas für alle Server Action Inputs

---

## 4. Bauliche Abhängigkeiten + Reihenfolge

**Phase A — Foundation** (ca. 30 Min)
1. Toast-System (sonner) einbauen
2. Mock-Service-Layer (`lib/mocks/*`)
3. Neue Prisma-Tabellen (`WorkflowRun`, `Notification`, `NotificationLog`, `CarrierRate`) + Seed
4. Command Palette (cmdk)
5. Notification Drawer

**Phase B — Shipment Lifecycle** (ca. 45 Min)
6. `NewShipmentWizard` — Modal mit Rate-Lookup
7. `ShipmentActionsMenu` — Status, Milestone, Pre-Alert
8. `CustomsSubmitDialog` — ATLAS-Animation
9. `updateShipmentStatus` + `addMilestone` Server Actions

**Phase C — Quote Lifecycle** (ca. 30 Min)
10. `QuoteCreateDialog` + Rate-Matrix
11. Quote-Detail-Page (`/quotes/[id]`)
12. Senden → Accept → Convert to Shipment

**Phase D — Workflows & Compliance** (ca. 30 Min)
13. Workflow-Toggle-Persist + Testlauf-Dialog mit Log-Stream
14. CBAM generate/submit Dialoge
15. Screening-Search mit Heuristik
16. Tier-2-Details (Settings-Menü, Help-Dialog, Customer-Switcher im Portal)

**Phase E — Portal & Final Polish** (ca. 20 Min)
17. Portal: Angebot anfragen → echte Quote
18. Portal: Rechnung-PDF-Stub
19. Extract → Shipment anlegen Flow
20. Copilot Pre-Fill auf Shipment Detail
21. Demo-Walkthrough (?-Hilfe-Dialog)

**Phase F — Abschlusstest** (10 Min)
22. `docker compose up --build` → durchklicken, alle Tier-1-Buttons testen
23. README-Update mit Demo-Script

Gesamt: ~2h 30min fokussiertes Bauen. Ich baue inkrementell und pushe Änderungen live in den laufenden Container via `next dev` oder Rebuild.

---

## 4b. Procedural Living World (NEU — Demo-Killer)

Sendungen dürfen nicht stillstehen. Während der Demo soll der Raum erleben wie:
- Sendung **FW-2026-1023** biegt um das Kap der Guten Hoffnung
- 4 Min später: Milestone "Umschlag in Singapur" poppt in der Timeline
- Notification: "FW-2026-1007 erreicht Hamburg — Zoll-Anmeldung erzeugt"
- Dashboard-KPI "Aktive Sendungen" zählt hoch
- Radar-Map: ein Punkt wandert sichtbar um 3–5° pro Minute

### Konzept: World Clock mit Zeit-Kompression

- **WorldClock**-Singleton (in DB: ein Row mit `epochStartedAt` + `compressionFactor`)
- **Virtual Now** = `now + (now - epochStartedAt) × (compression - 1)`
- Default `compression = 60` → 1 reale Minute = 1 virtuelle Stunde. Ein 20-min-Termin = 20 virtuelle Stunden Weltgeschehen.

### Tick-Service
Läuft intern im Next.js Server-Prozess alle 15s:
1. `virtualNow` berechnen
2. Für jede aktive Shipment:
   - `progress = (virtualNow - etd) / (eta - etd)` neu berechnen
   - Wenn ein geseedeter Future-Milestone jetzt in der Vergangenheit liegt → auf "completed" setzen, Notification erzeugen, Status ggf. updaten
   - Wenn progress ≥ 1 und Status = IN_TRANSIT → auf AT_DESTINATION, dann (nach 3 virtuellen Stunden) CUSTOMS_CLEARANCE, dann DELIVERED
3. 4%-Chance pro Tick: spontaner Delay-Event auf einer IN_TRANSIT-Sendung (+4–12h auf eta, Notification "Port Congestion erkannt")
4. 2%-Chance: neue BOOKED-Sendung wird angelegt (Kunde+Carrier+Lane aus Seed-Pool)
5. Jede Shipment-Status-Änderung erzeugt `Notification` row
6. Live-Vessel-Position wird pro Lookup aus `virtualNow` + Lane-Geometrie berechnet (nicht gespeichert)

### UX-Beigabe
- **Live-Indikator** oben rechts: "WORLD CLOCK ⚡ 24 April 2026 14:32 UTC" (tickt live, jede Sekunde sichtbar)
- **"Zeit-Kompression"** Kontroll-Widget (Admin): 1x, 60x, 240x, 1440x Knöpfe
- **Neue Notifications** slide-in rechts oben (Sonner)
- **Dashboard auto-refresh** alle 20s (React Server Component re-render mit `revalidatePath`)
- **Shipment-Detail auto-refresh** alle 15s wenn der User auf der Seite ist

### Seed-Anpassung
Damit während der Demo tatsächlich etwas fertig wird:
- 3–4 Sendungen mit ETA in virtuellen +3h bis +8h → innerhalb 3–8 realer Minuten ankommen
- 5–6 Sendungen mit ETA in +20h bis +2 Tage → Progression sichtbar
- Rest: längere Transits (3–4 Wochen)

---

## 5. Realismus-Knöpfe

Was die Demo vom Prototyp zum "echten Produkt"-Gefühl hebt:

- **Latenzen** — jede Action 200–1200ms simuliert (nicht instant)
- **Realistische Referenznummern** — MRN-Format `26DE…`, MAWB `XXX-12345678`, HBL Carrier-Prefix
- **Toast-Feedback** — jede Action erzeugt Message oben rechts
- **Milestone-Events** — jede Action fügt echten Milestone in Timeline ein
- **Notification-Log** — jede Slack/Email-Notification landet im NotificationLog, sichtbar
- **Konsistente Daten** — 14 seeded Carrier-Rates, passende Schedules
- **Copilot mit echtem DB-Context** — auch im Mock-Modus konkret (bereits so)
- **Error-Szenarien** — 1 von 8 ATLAS-Submissions "abgelehnt" → realistisches Drama
- **Loading-States** überall konsequent
- **Keyboard-Shortcuts**: ⌘K Palette, ⌘N Neue Sendung, ⌘/ Help
