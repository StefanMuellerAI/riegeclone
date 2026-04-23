import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WorkflowsList } from "./client";
import { Workflow } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const workflows = await db.workflow.findMany({ orderBy: { createdAt: "desc" } });
  const lastRuns = await db.workflowRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" /> Workflow-Automation
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Trigger · Conditions · Actions — visueller Flow-Builder. Ersetzt externe Tools für logistik-spezifische Prozesse.
          </p>
        </div>
      </div>

      <WorkflowsList
        workflows={workflows.map((w) => ({
          id: w.id, name: w.name, description: w.description, enabled: w.enabled,
          runsLast7d: w.runsLast7d, triggerJson: w.triggerJson, stepsJson: w.stepsJson,
        }))}
        recentRuns={lastRuns.map((r) => ({ id: r.id, workflowId: r.workflowId, status: r.status, stepsJson: r.stepsJson, startedAt: r.startedAt.toISOString(), finishedAt: r.finishedAt?.toISOString() ?? null }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Marketplace · Templates</CardTitle>
          <CardDescription>Industrie-Best-Practices · 1-Klick-Installation</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          {[
            "Pre-Alert bei Carrier-Bestätigung an Kunde (Slack + Email)",
            "Invoice-Matching mit PO bei Eingang (3-Way-Match)",
            "Auto-Booking: Shopify-Order → Sendung anlegen",
            "CO2-Kompensation via South Pole bei Flugbuchung",
            "Demurrage-Alarm bei >5 Tagen Liegezeit",
            "Auto-Umbuchung bei Sailing-Ausfall (<2 Tage Delay)",
          ].map((t) => (
            <div key={t} className="rounded-lg border p-3 text-sm hover:bg-muted/30 cursor-pointer">
              <div className="font-medium">{t}</div>
              <div className="mt-1 text-xs text-primary">Template installieren →</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
