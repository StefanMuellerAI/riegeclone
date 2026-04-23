import Link from "next/link";
import { ArrowUpDown, Filter, Plane, Plus, Ship } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/status-chip";
import { ModeChip } from "@/components/mode-chip";
import { formatDate, formatKg } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShipmentsFilter } from "./filter-bar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ mode?: string; status?: string; direction?: string; customerId?: string; q?: string; filter?: string }>;

export default async function ShipmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const where: Record<string, unknown> = {};
  if (sp.mode && ["AIR", "OCEAN"].includes(sp.mode)) where.mode = sp.mode;
  if (sp.status) where.status = sp.status;
  if (sp.direction) where.direction = sp.direction;
  if (sp.customerId) where.customerId = sp.customerId;
  if (sp.q) {
    where.OR = [
      { ref: { contains: sp.q, mode: "insensitive" } },
      { mawb: { contains: sp.q, mode: "insensitive" } },
      { hbl: { contains: sp.q, mode: "insensitive" } },
      { carrier: { contains: sp.q, mode: "insensitive" } },
    ];
  }

  const [shipments, customers, modeCount] = await Promise.all([
    db.shipment.findMany({
      where,
      orderBy: sp.filter === "risk" ? { delayRiskScore: "desc" } : { createdAt: "desc" },
      take: 100,
      include: { customer: true, shipper: true, consignee: true },
    }),
    db.customer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.shipment.groupBy({ by: ["mode"], _count: { _all: true } }),
  ]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sendungen</h1>
          <p className="text-sm text-muted-foreground">
            {shipments.length} von {modeCount.reduce((s, m) => s + m._count._all, 0)} gefiltert
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShipmentsFilter customers={customers} activeCount={shipments.length} />
          <Button variant="gradient" size="sm" asChild>
            <Link href="/shipments/new">
              <Plus className="h-4 w-4" /> Neu
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <ChipFilter label="Alle" href="/shipments" count={modeCount.reduce((s, m) => s + m._count._all, 0)} active={!sp.mode} />
        <ChipFilter
          label="Air Freight"
          href="/shipments?mode=AIR"
          count={modeCount.find((m) => m.mode === "AIR")?._count._all ?? 0}
          active={sp.mode === "AIR"}
          icon={<Plane className="h-3.5 w-3.5 text-violet-500" />}
        />
        <ChipFilter
          label="Ocean Freight"
          href="/shipments?mode=OCEAN"
          count={modeCount.find((m) => m.mode === "OCEAN")?._count._all ?? 0}
          active={sp.mode === "OCEAN"}
          icon={<Ship className="h-3.5 w-3.5 text-blue-500" />}
        />
        <form action="/shipments" method="get" className="md:col-span-1">
          <Input name="q" placeholder="Ref · MAWB · HBL · Carrier…" defaultValue={sp.q ?? ""} />
        </form>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <Th>Ref</Th>
                <Th>Mode</Th>
                <Th>Lane</Th>
                <Th>Kunde</Th>
                <Th>Carrier</Th>
                <Th>Status</Th>
                <Th>ETD</Th>
                <Th>ETA</Th>
                <Th className="text-right">Chargeable</Th>
                <Th className="text-right">Risk</Th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const risk = s.delayRiskScore ?? 0;
                return (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <Td>
                      <Link href={`/shipments/${s.id}`} className="font-mono font-semibold text-primary hover:underline">
                        {s.ref}
                      </Link>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {s.mawb ?? s.hbl ?? "—"}
                      </div>
                    </Td>
                    <Td><ModeChip mode={s.mode as any} /></Td>
                    <Td>
                      <div className="font-mono text-xs">{s.originCode} → {s.destCode}</div>
                      <div className="text-[11px] text-muted-foreground">{s.originCountry} → {s.destCountry}</div>
                    </Td>
                    <Td><div className="truncate max-w-[180px]">{s.customer?.name ?? "—"}</div></Td>
                    <Td><div className="text-xs">{s.carrier}</div></Td>
                    <Td><StatusChip status={s.status} /></Td>
                    <Td><div className="text-xs tabular-nums">{formatDate(s.etd)}</div></Td>
                    <Td>
                      <div className="text-xs tabular-nums">{formatDate(s.eta)}</div>
                      {s.etaPredicted && s.etaPredicted.getTime() !== s.eta.getTime() && (
                        <div className="text-[10px] text-rose-600 tabular-nums">pred {formatDate(s.etaPredicted)}</div>
                      )}
                    </Td>
                    <Td className="text-right font-mono text-xs">{formatKg(s.chargeableKg)}</Td>
                    <Td className="text-right">
                      <RiskBadge score={risk} />
                    </Td>
                  </tr>
                );
              })}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-sm text-muted-foreground">
                    Keine Sendungen. <Link href="/shipments" className="underline">Filter zurücksetzen</Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2.5 text-left font-medium ${className ?? ""}`}>
      <span className="inline-flex items-center gap-1">{children}</span>
    </th>
  );
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 align-middle ${className ?? ""}`}>{children}</td>;
}

function ChipFilter({ label, href, count, active, icon }: { label: string; href: string; count: number; active?: boolean; icon?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
    >
      <span className="inline-flex items-center gap-2 font-medium">
        {icon}
        {label}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
    </Link>
  );
}

function RiskBadge({ score }: { score: number }) {
  const color = score > 65 ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
    : score > 35 ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono font-semibold ${color}`}>
      {score}
    </span>
  );
}
