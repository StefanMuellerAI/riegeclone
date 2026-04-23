"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sleep } from "@/lib/mocks/sleep";
import { notify } from "@/lib/mocks/notifications";

export async function toggleWorkflow(id: string, enabled: boolean) {
  await db.workflow.update({ where: { id }, data: { enabled } });
  revalidatePath("/workflows");
  return { ok: true };
}

export async function runWorkflow(id: string) {
  const w = await db.workflow.findUnique({ where: { id } });
  if (!w) return { ok: false };

  const run = await db.workflowRun.create({
    data: {
      workflowId: id,
      status: "running",
      stepsJson: { steps: [] },
    },
  });

  const steps: Array<{ name: string; status: string; durationMs: number; output?: string }> = [];
  const definition = Array.isArray(w.stepsJson) ? (w.stepsJson as any[]) : [];
  for (const step of definition) {
    const t0 = Date.now();
    await sleep(400 + Math.random() * 900);
    steps.push({
      name: step.type,
      status: "ok",
      durationMs: Date.now() - t0,
      output: outputFor(step.type),
    });
    await db.workflowRun.update({ where: { id: run.id }, data: { stepsJson: { steps } } });
  }

  await db.workflowRun.update({ where: { id: run.id }, data: { status: "success", finishedAt: new Date(), stepsJson: { steps } } });
  await db.workflow.update({ where: { id }, data: { runsLast7d: { increment: 1 } } });

  await notify({ level: "success", title: `Workflow „${w.name}" ausgeführt`, body: `${steps.length} Schritte, ${steps.reduce((s, x) => s + x.durationMs, 0)}ms`, href: `/workflows` });

  revalidatePath("/workflows");
  return { ok: true, runId: run.id, steps };
}

export async function getWorkflowRun(runId: string) {
  return db.workflowRun.findUnique({ where: { id: runId } });
}

function outputFor(type: string): string {
  switch (type) {
    case "ai_extract": return "Extrahierte Felder: 14 · Confidence 0.96";
    case "sanctions_check": return "Clean (UN, EU, OFAC)";
    case "create_customs_declaration": return "MRN 26DE478203915 erzeugt";
    case "notify": return "Email + Slack versandt";
    case "db_query": return "342 Sendungen gelesen";
    case "aggregate": return "14 CN-Codes aggregiert";
    case "generate_xml": return "CBAM_Q1_2026.xml erstellt (28 KB)";
    case "compose_message": return "Template gerendert";
    case "fetch_feed": return "4 neue Raten eingelesen";
    case "detect_price_change": return "3 Lanes mit >8% Verfall";
    case "generate_quote": return "2 Quotes für Top-Kunden generiert";
    default: return "OK";
  }
}
