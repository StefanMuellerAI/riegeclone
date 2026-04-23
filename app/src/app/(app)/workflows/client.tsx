"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2, PlayCircle, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toggleWorkflow, runWorkflow } from "@/app/actions/workflows";

type Wf = { id: string; name: string; description: string | null; enabled: boolean; runsLast7d: number; triggerJson: any; stepsJson: any };
type Run = { id: string; workflowId: string; status: string; stepsJson: any; startedAt: string; finishedAt: string | null };

export function WorkflowsList({ workflows, recentRuns }: { workflows: Wf[]; recentRuns: Run[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [runDialog, setRunDialog] = useState<{ open: boolean; workflow?: Wf; steps: any[]; status: "running" | "success" | "failed" }>({ open: false, steps: [], status: "running" });

  async function testRun(w: Wf) {
    setRunDialog({ open: true, workflow: w, steps: [], status: "running" });
    // Sim: fake stepping as we go
    const definition = Array.isArray(w.stepsJson) ? w.stepsJson : [];
    // Kick off actual server run
    const resPromise = runWorkflow(w.id);

    const fakeSteps: any[] = [];
    for (let i = 0; i < definition.length; i++) {
      await new Promise((r) => setTimeout(r, 450 + Math.random() * 700));
      fakeSteps.push({ name: definition[i].type, status: "ok", durationMs: Math.round(450 + Math.random() * 700), output: descFor(definition[i].type) });
      setRunDialog((d) => ({ ...d, steps: [...fakeSteps] }));
    }
    const result = await resPromise;
    setRunDialog((d) => ({ ...d, status: result.ok ? "success" : "failed", steps: result.steps ?? fakeSteps }));
    toast.success(`Workflow „${w.name}" ausgeführt`);
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {workflows.map((w) => {
          const steps = Array.isArray(w.stepsJson) ? w.stepsJson : [];
          const trigger = w.triggerJson ?? {};
          return (
            <Card key={w.id} className="relative overflow-hidden">
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
              <CardHeader className="relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{w.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{w.description}</CardDescription>
                  </div>
                  <Switch
                    defaultChecked={w.enabled}
                    onCheckedChange={(v) => start(async () => {
                      await toggleWorkflow(w.id, v);
                      toast.success(`Workflow ${v ? "aktiviert" : "deaktiviert"}`);
                      router.refresh();
                    })}
                  />
                </div>
              </CardHeader>
              <CardContent className="relative space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="gap-1"><Zap className="h-3 w-3" /> {trigger.type ?? "—"}</Badge>
                  <span className="text-muted-foreground truncate">
                    {trigger.cron ? <>Cron: <span className="font-mono">{trigger.cron}</span></> :
                     trigger.filter ? <>Filter: <span className="font-mono">{JSON.stringify(trigger.filter)}</span></> :
                     trigger.threshold_hours ? <>Threshold: {trigger.threshold_hours}h</> : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {steps.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 shrink-0">
                      <div className="rounded-lg border bg-card px-2.5 py-1.5 text-xs font-mono">
                        <div className="font-semibold text-primary">{s.type}</div>
                        {s.model && <div className="text-[10px] text-muted-foreground">{s.model}</div>}
                        {s.regime && <div className="text-[10px] text-muted-foreground">{s.regime}</div>}
                        {s.channel && <div className="text-[10px] text-muted-foreground">→ {s.channel}</div>}
                        {s.lists && <div className="text-[10px] text-muted-foreground">{s.lists.join(", ")}</div>}
                      </div>
                      {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    {w.runsLast7d} Ausführungen · letzte 7 Tage
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => testRun(w)} disabled={pending}>
                    <PlayCircle className="h-3.5 w-3.5" /> Testlauf
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={runDialog.open} onOpenChange={(v) => setRunDialog((d) => ({ ...d, open: v }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Workflow-Testlauf</DialogTitle>
            <DialogDescription>{runDialog.workflow?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 font-mono text-xs max-h-[400px] overflow-y-auto">
            {runDialog.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-2">
                <div className="h-4 w-4 rounded-full bg-emerald-500 grid place-items-center">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
                <div className="font-semibold text-primary">{s.name}</div>
                <div className="text-muted-foreground truncate flex-1">{s.output}</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">{s.durationMs}ms</div>
              </div>
            ))}
            {runDialog.status === "running" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> läuft…
              </div>
            )}
            {runDialog.status === "success" && (
              <div className="rounded-md bg-emerald-500/10 text-emerald-700 px-2.5 py-2 text-xs">
                ✓ Erfolgreich abgeschlossen. Gesamtdauer {runDialog.steps.reduce((s: number, x: any) => s + (x.durationMs || 0), 0)}ms
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setRunDialog((d) => ({ ...d, open: false }))}>Schließen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function descFor(type: string): string {
  switch (type) {
    case "ai_extract": return "extrahierte 14 Felder (Confidence 0.96)";
    case "sanctions_check": return "Clean gegen UN · EU · US OFAC";
    case "create_customs_declaration": return "MRN 26DE478203915";
    case "notify": return "Slack + Email raus";
    case "db_query": return "342 rows";
    case "aggregate": return "14 CN-Codes";
    case "generate_xml": return "CBAM_Q1_2026.xml (28KB)";
    case "compose_message": return "Template gerendert";
    case "fetch_feed": return "4 Raten";
    case "detect_price_change": return "3 Lanes > 8%";
    case "generate_quote": return "2 Angebote erstellt";
    default: return "OK";
  }
}
