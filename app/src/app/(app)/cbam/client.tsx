"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Download, FileText, Loader2, Radio, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { generateCbamReport, submitCbamReport } from "@/app/actions/cbam";

export function CbamActions({ currentPeriod, reportId, submittable }: { currentPeriod?: string; reportId?: string; submittable?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [submitDialog, setSubmitDialog] = useState<{ open: boolean; status: "idle" | "submitting" | "done"; ref?: string }>({ open: false, status: "idle" });

  function generate() {
    if (!currentPeriod) return;
    start(async () => {
      await generateCbamReport(currentPeriod);
      toast.success(`CBAM-Report ${currentPeriod} generiert`);
      router.refresh();
    });
  }

  function submit() {
    if (!reportId) return;
    setSubmitDialog({ open: true, status: "submitting" });
    start(async () => {
      const r = await submitCbamReport(reportId);
      setSubmitDialog({ open: true, status: "done", ref: r.ref });
      toast.success("CBAM eingereicht bei DEHSt");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {currentPeriod && !submittable && (
        <>
          <Button variant="outline" size="sm" onClick={() => toast("Upload-Dialog folgt — Emissionsdaten aus Lieferanten-CSV bzw. API")}><Upload className="h-4 w-4" /> Emissionsdaten hochladen</Button>
          <Button variant="gradient" size="sm" onClick={generate} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Report generieren
          </Button>
        </>
      )}
      {submittable && reportId && (
        <>
          <Button variant="outline" size="sm" onClick={() => toast("XML exportiert: CBAM_Q1_2026.xml (12 KB)")}><Download className="h-4 w-4" /> XML-Export</Button>
          <Button variant="outline" size="sm" onClick={() => toast("PDF-Vorschau in neuem Tab…")}><FileText className="h-4 w-4" /> PDF-Vorschau</Button>
          <Button variant="gradient" size="sm" onClick={submit} disabled={pending}>
            <Check className="h-4 w-4" /> Jetzt einreichen
          </Button>
        </>
      )}

      <Dialog open={submitDialog.open} onOpenChange={(v) => setSubmitDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Einreichung bei DEHSt</DialogTitle>
            <DialogDescription>Deutsche Emissionshandelsstelle — Quartalsmeldung</DialogDescription>
          </DialogHeader>
          {submitDialog.status === "submitting" && (
            <div className="py-10 flex flex-col items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 grid place-items-center">
                <Radio className="h-7 w-7 text-emerald-600 animate-pulse" />
              </div>
              <div className="text-sm font-medium">Übermittle XML-Nachricht an DEHSt…</div>
              <div className="text-xs text-muted-foreground">Signiert mit qualifizierter eIDAS-Signatur</div>
            </div>
          )}
          {submitDialog.status === "done" && (
            <div className="py-8 space-y-3 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 grid place-items-center mx-auto">
                <Check className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">Eingereicht</div>
                <div className="text-xs text-muted-foreground">Annahmebestätigung erhalten · 2 413 ms</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-left text-xs">
                <div className="text-muted-foreground">DEHSt-Referenz</div>
                <div className="font-mono text-sm">{submitDialog.ref}</div>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setSubmitDialog({ open: false, status: "idle" })}>Schließen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
