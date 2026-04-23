import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatKg } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/status-chip";
import { ModeChip } from "@/components/mode-chip";
import { Input } from "@/components/ui/input";
import { ExternalLink, FileText, Globe, LogOut, MessageCircle, Package, Search, Download } from "lucide-react";
import { PortalCustomerSwitcher, PortalQuoteRequest, PortalInvoiceDownload } from "./client";

export const dynamic = "force-dynamic";

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const customers = await db.customer.findMany({ orderBy: { name: "asc" } });
  const customer = customers.find((c) => c.id === sp.c) ?? customers[0];
  if (!customer) return <div className="p-6">Keine Kundendaten. Seed ausführen.</div>;

  const [shipments, quotes] = await Promise.all([
    db.shipment.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.quote.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const active = shipments.filter((s) => !["DELIVERED", "CANCELLED"].includes(s.status));
  const delivered = shipments.filter((s) => s.status === "DELIVERED");
  const firstName = customer.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${customer.color}, ${customer.color}dd)` }}>
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 grid place-items-center font-bold text-xl">{customer.name.charAt(0)}</div>
            <div>
              <div className="text-sm opacity-80">Customer Portal</div>
              <div className="font-semibold">{customer.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <PortalCustomerSwitcher customers={customers} activeId={customer.id} />
            <Badge className="bg-white/20 text-white border-transparent">powered by Frachtwerk</Badge>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10"><MessageCircle className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" asChild>
              <Link href="/"><ExternalLink className="h-4 w-4" /> Admin</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Hallo {firstName === customer.name ? "Team" : firstName},</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} aktive Sendungen · {delivered.length} zugestellt · {quotes.filter((q) => q.status === "OPEN" || q.status === "SENT").length} offene Angebote.
          </p>
        </div>

        <div className="relative max-w-lg">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Sendungsnummer, MAWB, Container…" className="pl-8 bg-background" />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Aktive Sendungen" value={active.length.toString()} />
          <Stat label="Diesen Monat" value={shipments.filter((s) => s.createdAt.getMonth() === new Date().getMonth()).length.toString()} />
          <Stat label="Ø Transit-Zeit" value="24 T" />
          <Stat label="On-Time (Quartal)" value="94%" />
        </div>

        <Card>
          <CardHeader><CardTitle>Aktive Sendungen</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {active.map((s) => (
              <Link href={`/track/${s.ref}`} key={s.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                <ModeChip mode={s.mode as any} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{s.ref}</span>
                    <StatusChip status={s.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.originCode} → {s.destCode} · {s.carrier} · {formatKg(s.chargeableKg)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">ETA</div>
                  <div className="text-sm font-medium tabular-nums">{formatDate(s.eta)}</div>
                </div>
              </Link>
            ))}
            {active.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Derzeit keine aktiven Sendungen.</div>}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Rechnungen</CardTitle><CardDescription>Letzte 6 Monate</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <PortalInvoiceDownload invoices={[
                { nr: "RE-2026-0412", datum: "18 Apr 2026", betrag: "EUR 12.480,00", status: "Offen" },
                { nr: "RE-2026-0389", datum: "02 Apr 2026", betrag: "EUR 8.210,50", status: "Bezahlt" },
                { nr: "RE-2026-0356", datum: "22 Mär 2026", betrag: "EUR 6.890,00", status: "Bezahlt" },
              ]} />
            </CardContent>
          </Card>

          <PortalQuoteRequest customerId={customer.id} customerColor={customer.color} />
        </div>

        <div className="text-center text-xs text-muted-foreground py-4">
          <Globe className="inline h-3 w-3 mr-1" /> Portal betrieben durch Frachtwerk · White-Label Edition
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
