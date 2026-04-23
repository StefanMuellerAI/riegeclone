import Link from "next/link";
import { Check, FileCheck2, ShieldCheck, X, Filter } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/status-chip";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const REGIME_INFO: Record<string, { label: string; country: string; color: string }> = {
  ATLAS_DE: { label: "ATLAS", country: "Deutschland", color: "bg-black text-white" },
  EDEC_CH: { label: "e-dec", country: "Schweiz", color: "bg-red-600 text-white" },
  NCTS: { label: "NCTS", country: "EU-Transit", color: "bg-blue-600 text-white" },
  AES_US: { label: "AES", country: "USA Export", color: "bg-indigo-600 text-white" },
  ISF_US: { label: "ISF", country: "USA Import", color: "bg-indigo-500 text-white" },
  SAGITTA_NL: { label: "Sagitta/DMS", country: "Niederlande", color: "bg-orange-600 text-white" },
};

type SearchParams = Promise<{ regime?: string; status?: string }>;

export default async function CustomsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const where: any = {};
  if (sp.regime) where.regime = sp.regime;
  if (sp.status) where.status = sp.status;
  const [all, byRegime, byStatus] = await Promise.all([
    db.customsDeclaration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { shipment: { select: { ref: true, originCode: true, destCode: true, customer: true } } },
    }),
    db.customsDeclaration.groupBy({ by: ["regime"], _count: { _all: true } }),
    db.customsDeclaration.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Zollabwicklung</h1>
        <p className="text-sm text-muted-foreground">
          ATLAS · e-dec · NCTS · AES · Sagitta — mit automatischer Sanktionsprüfung gegen UN, EU und US OFAC
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/customs"
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm ${!sp.regime && !sp.status ? "border-primary bg-primary/5 text-primary font-medium" : "hover:bg-muted/50"}`}
        >
          Alle <span className="text-xs text-muted-foreground tabular-nums">{byRegime.reduce((a, b) => a + b._count._all, 0)}</span>
        </Link>
        {(sp.regime || sp.status) && (
          <Link href="/customs" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <X className="h-3 w-3" /> Filter zurücksetzen
          </Link>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        {Object.entries(REGIME_INFO).map(([key, info]) => {
          const count = byRegime.find((r) => r.regime === key)?._count._all ?? 0;
          const active = sp.regime === key;
          return (
            <Link key={key} href={`/customs?regime=${key}`}>
              <Card className={`transition-colors ${active ? "ring-2 ring-primary border-primary" : "hover:border-primary/40 cursor-pointer"}`}>
                <CardContent className="p-4 space-y-2">
                  <div className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${info.color}`}>
                    {info.label}
                  </div>
                  <div className="text-2xl font-semibold tabular-nums">{count}</div>
                  <div className="text-[11px] text-muted-foreground">{info.country}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Sanktions-Screening Engine
          </CardTitle>
          <CardDescription>Letzte Synchronisation: heute 06:00 UTC</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4 text-sm">
          <ListItem title="EU Consolidated List" version="v2026.04.17" count="12.847 Entities" ok />
          <ListItem title="UN Sanctions List" version="v2026.04.15" count="1.432 Entities" ok />
          <ListItem title="US OFAC SDN" version="v2026.04.17" count="23.516 Entities" ok />
          <ListItem title="EU Dual-Use Goods" version="v2026.04.01" count="Annex I vollständig" ok />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anmeldungen</CardTitle>
          <CardDescription>{all.length} der letzten 40</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left">Sendung</th>
                <th className="px-3 py-2 text-left">Regime</th>
                <th className="px-3 py-2 text-left">MRN</th>
                <th className="px-3 py-2 text-left">Kunde</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Submitted</th>
                <th className="px-3 py-2 text-left">Cleared</th>
                <th className="px-3 py-2 text-left">Denied Party</th>
              </tr>
            </thead>
            <tbody>
              {all.map((c) => {
                const ri = REGIME_INFO[c.regime];
                return (
                  <tr key={c.id} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Link href={`/shipments/${c.shipmentId}`} className="font-mono font-semibold text-primary hover:underline">
                        {c.shipment.ref}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">{c.shipment.originCode} → {c.shipment.destCode}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ${ri?.color ?? "bg-muted"}`}>
                        {ri?.label ?? c.regime}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{c.mrn ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{c.shipment.customer?.name ?? "—"}</td>
                    <td className="px-3 py-2"><StatusChip status={c.status} /></td>
                    <td className="px-3 py-2 text-xs tabular-nums">{c.submittedAt ? formatDate(c.submittedAt) : "—"}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">{c.clearedAt ? formatDate(c.clearedAt) : "—"}</td>
                    <td className="px-3 py-2">
                      {c.deniedPartyCheck ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><Check className="h-3 w-3" /> clean</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 text-xs"><X className="h-3 w-3" /> pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ListItem({ title, version, count, ok }: { title: string; version: string; count: string; ok?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{title}</div>
        {ok && <Check className="h-3.5 w-3.5 text-emerald-600" />}
      </div>
      <div className="text-xs text-muted-foreground">{version}</div>
      <div className="text-xs tabular-nums mt-1">{count}</div>
    </div>
  );
}
