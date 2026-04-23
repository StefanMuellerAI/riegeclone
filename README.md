# Frachtwerk

> Clone demo of **Riege Scope** — built in days, not decades. Modern, AI-native Transport Management System (TMS) for air freight, ocean freight and customs.

## ⚠️ Status

**Early demo / Prototyp.** Kein Produktionssystem. Baustellen sichtbar. Siehe [`PLAN.md`](./PLAN.md) für Scope, Architektur und Feature-Liste.

## Quickstart

```bash
cp .env.example .env    # optional: ANTHROPIC_API_KEY eintragen für den Copilot
docker compose up --build
```

Dann [http://localhost:3000](http://localhost:3000) öffnen.

Beim ersten Start läuft automatisch:
1. Postgres startet
2. Prisma `db push` erstellt das Schema
3. Seed-Script schreibt ~34 realistische Sendungen, Angebote, Workflows, CBAM-Reports

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind + shadcn/ui
- Prisma + PostgreSQL 16
- Anthropic Claude Opus 4.7 (Copilot + Document Extraction)
- MapLibre + Recharts

## Module

**Operations** Dashboard · Sendungen · Angebote · Partner · Zoll · Dokumente
**Smart** AI-Copilot · Document Extractor · Workflow-Builder · CBAM · Live-Radar · Sanktions-Screening
**Customer** Portal · öffentlicher Track & Trace

## Lokal entwickeln

```bash
cd app
npm install
# Postgres separat starten (oder docker compose up db)
npx prisma db push
npm run db:seed
npm run dev
```
