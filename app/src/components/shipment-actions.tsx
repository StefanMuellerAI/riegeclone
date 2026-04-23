"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight, Bell, Check, ChevronDown, Clipboard, FileCheck2, Loader2, MessageCircle,
  MoreVertical, Radio, RefreshCw, Sparkles, Truck, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateShipmentStatus, addManualMilestone, sendPreAlert, submitCustomsDeclaration } from "@/app/actions/shipments";
import { cn } from "@/lib/utils";

type Regime = "ATLAS_DE" | "AES_US" | "EDEC_CH" | "NCTS" | "ISF_US";

const STATUSES = [
  { value: "BOOKED", label: "Gebucht" },
  { value: "IN_TRANSIT", label: "Unterwegs" },
  { value: "AT_DESTINATION", label: "Am Ziel" },
  { value: "CUSTOMS_CLEARANCE", label: "Zoll" },
  { value: "DELIVERED", label: "Zugestellt" },
  { value: "EXCEPTION", label: "Exception" },
];

export function ShipmentActions({ shipmentId, shipmentRef, destCountry }: { shipmentId: string; shipmentRef: string; destCountry: string }) {
  const router = useRouter();
  const [openMilestone, setOpenMilestone] = useState(false);
  const [openCustoms, setOpenCustoms] = useState(false);
  const [pending, start] = useTransition();

  const defaultRegime: Regime =
    destCountry === "DE" || destCountry === "AT" ? "ATLAS_DE" :
    destCountry === "CH" ? "EDEC_CH" :
    destCountry === "US" ? "ISF_US" : "NCTS";

  return (
    <>
      <Button
        variant="outline" size="sm"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("copilot-ask", { detail: `Status von ${shipmentRef}? Zeige Timeline, Risk und empfohlene nächste Aktion.` }));
        }}
      >
        <Sparkles className="h-4 w-4" /> Copilot fragen
      </Button>
      <Button
        variant="outline" size="sm"
        onClick={() => start(async () => {
          try {
            await sendPreAlert(shipmentId);
            toast.success(`Pre-Alert versandt · ${shipmentRef}`, { description: "Slack + Email an Kunde raus" });
            router.refresh();
          } catch (e) { toast.error("Konnte Pre-Alert nicht senden"); }
        })}
        disabled={pending}
      >
        <Bell className="h-4 w-4" /> Pre-Alert
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="gradient" size="sm">
            <RefreshCw className="h-4 w-4" /> Aktualisieren <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Status setzen</DropdownMenuLabel>
          {STATUSES.map((s) => (
            <DropdownMenuItem
              key={s.value}
              onClick={() => start(async () => {
                await updateShipmentStatus(shipmentId, s.value as any);
                toast.success(`${shipmentRef} · Status → ${s.label}`);
                router.refresh();
              })}
            >
              <Truck className="h-3.5 w-3.5" /> {s.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenMilestone(true)}>
            <Clipboard className="h-3.5 w-3.5" /> Milestone manuell erfassen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenCustoms(true)}>
            <FileCheck2 className="h-3.5 w-3.5" /> Zoll-Anmeldung einreichen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddMilestoneDialog open={openMilestone} onOpenChange={setOpenMilestone} shipmentId={shipmentId} shipmentRef={shipmentRef} />
      <SubmitCustomsDialog open={openCustoms} onOpenChange={setOpenCustoms} shipmentId={shipmentId} shipmentRef={shipmentRef} defaultRegime={defaultRegime} />
    </>
  );
}

function AddMilestoneDialog({ open, onOpenChange, shipmentId, shipmentRef }: { open: boolean; onOpenChange: (v: boolean) => void; shipmentId: string; shipmentRef: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [location, setLocation] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!label.trim()) return;
    start(async () => {
      await addManualMilestone(shipmentId, label, location || undefined);
      toast.success(`Milestone hinzugefügt · ${shipmentRef}`);
      onOpenChange(false); setLabel(""); setLocation("");
      router.refresh();
    });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Milestone manuell erfassen</DialogTitle>
          <DialogDescription>Für Events, die kein EDI/AIS/ADS-B liefert — z.B. telefonische Carrier-Info.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Bezeichnung</Label><Input placeholder="z.B. 'Containerumladung in Singapur abgeschlossen'" value={label} onChange={(e) => setLabel(e.target.value)} /></div>
          <div><Label>Ort (optional)</Label><Input placeholder="Singapur · PSA Terminal" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button variant="gradient" onClick={submit} disabled={pending || !label.trim()}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Erfassen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubmitCustomsDialog({ open, onOpenChange, shipmentId, shipmentRef, defaultRegime }: { open: boolean; onOpenChange: (v: boolean) => void; shipmentId: string; shipmentRef: string; defaultRegime: Regime }) {
  const router = useRouter();
  const [regime, setRegime] = useState<Regime>(defaultRegime);
  const [status, setStatus] = useState<"idle" | "submitting" | "accepted" | "rejected">("idle");
  const [result, setResult] = useState<{ mrn?: string; error?: string; responseTimeMs?: number } | null>(null);

  const regimeLabel: Record<Regime, { label: string; authority: string; color: string }> = {
    ATLAS_DE: { label: "ATLAS (Deutschland)", authority: "Zoll — GZD", color: "bg-black" },
    AES_US: { label: "AES (USA Export)", authority: "US CBP", color: "bg-indigo-600" },
    EDEC_CH: { label: "e-dec (Schweiz)", authority: "BAZG", color: "bg-red-600" },
    NCTS: { label: "NCTS (EU-Transit)", authority: "Customs Community", color: "bg-blue-600" },
    ISF_US: { label: "ISF (USA Import 10+2)", authority: "US CBP", color: "bg-indigo-500" },
  };

  async function submit() {
    setStatus("submitting"); setResult(null);
    const r = await submitCustomsDeclaration(shipmentId, regime);
    if (r.ok) {
      setStatus("accepted");
      setResult({ mrn: r.mrn, responseTimeMs: r.responseTimeMs });
      toast.success(`${regime.replace("_", " ")} akzeptiert · MRN ${r.mrn}`);
      setTimeout(() => { router.refresh(); }, 300);
    } else {
      setStatus("rejected");
      setResult({ error: r.error });
      toast.error(`${regime.replace("_", " ")} abgelehnt`);
    }
  }

  function close() {
    onOpenChange(false);
    setStatus("idle"); setResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zoll-Anmeldung einreichen · {shipmentRef}</DialogTitle>
          <DialogDescription>Regime wählen. Daten werden direkt an die jeweilige Behörde übermittelt.</DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <div className="space-y-3">
            <Label>Zoll-Regime</Label>
            <div className="grid gap-2">
              {(Object.keys(regimeLabel) as Regime[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setRegime(k)}
                  className={cn("flex items-center gap-3 rounded-lg border p-2.5 text-left",
                    regime === k ? "border-primary bg-primary/5" : "hover:bg-muted/40")}
                >
                  <span className={cn("rounded px-2 py-0.5 text-xs font-semibold text-white", regimeLabel[k].color)}>
                    {k.replace("_", " ")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{regimeLabel[k].label}</div>
                    <div className="text-[11px] text-muted-foreground">Behörde: {regimeLabel[k].authority}</div>
                  </div>
                  {regime === k && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-xs flex items-start gap-2">
              <ShieldCheckIcon />
              <div>
                <div className="font-semibold">Pre-Submission-Check</div>
                <div className="text-muted-foreground">Sanktionsscreening clean · HS-Codes validiert · Beleg-Completeness ok</div>
              </div>
            </div>
          </div>
        )}

        {status === "submitting" && (
          <div className="py-10 flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 grid place-items-center">
                <Radio className="h-7 w-7 text-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full ring-4 ring-primary/30 animate-pulseGlow" />
            </div>
            <div className="text-sm font-medium">Übermittle an {regimeLabel[regime].authority}…</div>
            <div className="text-xs text-muted-foreground">XML-Nachricht gerendert · EDI Endpoint erreicht · warte auf Annahme</div>
          </div>
        )}

        {status === "accepted" && result && (
          <div className="py-8 space-y-4 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 grid place-items-center mx-auto">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">Angenommen</div>
              <div className="text-xs text-muted-foreground">{regimeLabel[regime].authority} · {result.responseTimeMs}ms</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-left text-xs">
              <div className="text-muted-foreground">MRN</div>
              <div className="font-mono text-sm">{result.mrn}</div>
            </div>
          </div>
        )}

        {status === "rejected" && result && (
          <div className="py-6 space-y-3">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 grid place-items-center mx-auto">
              <X className="h-6 w-6 text-rose-600" />
            </div>
            <div className="text-center">
              <div className="font-semibold">Anmeldung abgelehnt</div>
              <div className="text-sm text-muted-foreground">{regimeLabel[regime].authority}</div>
            </div>
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs">
              <div className="font-semibold text-rose-700 dark:text-rose-300 mb-1">Ablehnungsgrund</div>
              <div>{result.error}</div>
            </div>
            <div className="text-xs text-muted-foreground">Beleg ergänzen, dann erneut einreichen.</div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {status === "idle" && (
            <>
              <Button variant="ghost" onClick={close}>Abbrechen</Button>
              <Button variant="gradient" onClick={submit}>Einreichen</Button>
            </>
          )}
          {(status === "accepted" || status === "rejected") && (
            <>
              {status === "rejected" && <Button variant="outline" onClick={() => setStatus("idle")}>Erneut</Button>}
              <Button onClick={close}>Schließen</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShieldCheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600 shrink-0 mt-0.5">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
