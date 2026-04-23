import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModeChip } from "@/components/mode-chip";
import { formatDate, formatUsd } from "@/lib/utils";
import { QuotesHeader } from "./client";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, any> = {
  OPEN: "warning", SENT: "info", ACCEPTED: "success", DECLINED: "destructive", EXPIRED: "muted",
};

export default async function QuotesPage() {
  const [quotes, customers] = await Promise.all([
    db.quote.findMany({ orderBy: { createdAt: "desc" }, include: { customer: true }, take: 50 }),
    db.customer.findMany({ select: { id: true, name: true } }),
  ]);
  const total = quotes.reduce((a, b) => a + b.totalUsd, 0);
  const open = quotes.filter((q) => q.status === "OPEN").length;
  const accepted = quotes.filter((q) => q.status === "ACCEPTED").length;
  const conversion = quotes.length > 0 ? Math.round((accepted / quotes.length) * 100) : 0;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <QuotesHeader count={quotes.length} conversion={conversion} customers={customers} />
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Pipeline (offen)" value={formatUsd(total)} hint={`${open} offen`} />
        <Stat label="Angenommen" value={accepted.toString()} hint={`${conversion}% Quote`} />
        <Stat label="Ø Angebot" value={formatUsd(quotes.length ? total / quotes.length : 0)} hint="USD pro Angebot" />
        <Stat label="Abgelaufen" value={quotes.filter((q) => q.status === "EXPIRED").length.toString()} hint="Re-Quote empfohlen" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5 text-left">Ref</th>
                <th className="px-3 py-2.5 text-left">Kunde</th>
                <th className="px-3 py-2.5 text-left">Mode</th>
                <th className="px-3 py-2.5 text-left">Lane</th>
                <th className="px-3 py-2.5 text-left">Incoterm</th>
                <th className="px-3 py-2.5 text-left">Gültig bis</th>
                <th className="px-3 py-2.5 text-left">Status</th>
                <th className="px-3 py-2.5 text-right">Total (USD)</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-3">
                    <Link href={`/quotes/${q.id}`} className="font-mono font-semibold text-primary hover:underline">{q.ref}</Link>
                  </td>
                  <td className="px-3 py-3">{q.customer?.name ?? "—"}</td>
                  <td className="px-3 py-3"><ModeChip mode={q.mode as any} /></td>
                  <td className="px-3 py-3 font-mono text-xs">{q.origin} → {q.destination}</td>
                  <td className="px-3 py-3 text-xs font-medium">{q.incoterm}</td>
                  <td className="px-3 py-3 text-xs tabular-nums">{formatDate(q.validUntil)}</td>
                  <td className="px-3 py-3"><Badge variant={STATUS_VARIANT[q.status]}>{q.status}</Badge></td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{formatUsd(q.totalUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </CardContent></Card>
  );
}
