"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, Search, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { runScreening } from "@/app/actions/screening";
import type { ScreeningResult } from "@/lib/mocks/sanctions";

const EXAMPLES = [
  "Shanghai Jiangnan Precision Co.",
  "Bank Mellat Tehran Branch",
  "Huawei Technologies Shenzhen",
  "Sputnik Trading FZC Dubai",
  "Siemens Healthineers AG",
];

export function ScreeningClient() {
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ScreeningResult | null>(null);

  function run(name: string) {
    if (!name.trim()) return;
    setQuery(name);
    setResult(null);
    start(async () => {
      const r = await runScreening(name);
      setResult(r);
      if (r.clean) toast.success(`Clean: ${name}`);
      else toast.warning(`${r.hits.length} Treffer: ${name}`);
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ad-hoc Screening</CardTitle>
          <CardDescription>Party-Name oder Adresse — gegen UN, EU, US OFAC, UK OFSI, BAFA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={(e) => { e.preventDefault(); run(query); }} className="flex gap-2">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="z.B. 'Bank Mellat Tehran'" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
            </div>
            <Button variant="gradient" disabled={pending || !query.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Screenen
            </Button>
            <Button variant="outline" type="button"><Upload className="h-4 w-4" /> Bulk-CSV</Button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Beispiele:</span>
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => run(e)} className="rounded-full border bg-background px-2.5 py-0.5 text-[11px] hover:bg-muted/50">{e}</button>
            ))}
          </div>

          {pending && (
            <div className="rounded-lg border p-4 flex items-center gap-3 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <div className="font-medium">Prüfe gegen 5 Sanktionslisten…</div>
                <div className="text-xs text-muted-foreground">Fuzzy-Match mit 0.85 Threshold · diakritisch normalisiert</div>
              </div>
            </div>
          )}

          {result && !pending && (
            <div className={`rounded-lg border p-4 ${result.clean ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
              <div className="flex items-start gap-3">
                {result.clean ? (
                  <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {result.clean ? "Kein Treffer — Party ist clean" : `${result.hits.length} Treffer — Review erforderlich`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Geprüft gegen {result.lists.length} Listen · {new Date(result.screenedAt).toLocaleString("de-DE")}
                  </div>
                </div>
              </div>
              {result.hits.length > 0 && (
                <div className="mt-3 space-y-2">
                  {result.hits.map((h, i) => (
                    <div key={i} className="rounded-lg border p-3 bg-card">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{h.matchedName}</div>
                        <Badge variant="warning">{Math.round(h.score * 100)}% match</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="font-mono">{h.list}</span> · {h.reason}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline">Clear (manuell)</Button>
                        <Button size="sm" variant="destructive">Block</Button>
                        <Button size="sm" variant="ghost">Eskalieren</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
