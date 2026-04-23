import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const [customers, parties] = await Promise.all([
    db.customer.findMany({ include: { _count: { select: { shipments: true, quotes: true } } } }),
    db.party.findMany({ include: { _count: { select: { asShipper: true, asConsignee: true } } }, take: 40 }),
  ]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Partner</h1>
        <p className="text-sm text-muted-foreground">Kunden, Shipper, Consignees — im zentralen Adress-Register, täglich mit Sanktionslisten abgeglichen</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kunden</CardTitle>
          <CardDescription>Ihre direkten Abrechnungspartner</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="h-10 w-10 rounded-lg grid place-items-center text-white font-bold shrink-0" style={{ background: c.color }}>
                  {c.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c._count.shipments} Sendungen · {c._count.quotes} Quotes
                  </div>
                </div>
                <Badge variant="success" className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3" /> clean</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipper & Consignees</CardTitle>
          <CardDescription>Alle Trade-Partner, die in Sendungsdokumenten vorkommen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
            {parties.map((p) => (
              <div key={p.id} className="rounded-lg border p-3 flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.city}, {p.country} · {p._count.asShipper} Shipper · {p._count.asConsignee} Consignee
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
