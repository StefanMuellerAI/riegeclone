"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, Download, FileText, Loader2, Plane, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { requestQuoteFromPortal } from "@/app/actions/portal";

type Customer = { id: string; name: string; color: string };

export function PortalCustomerSwitcher({ customers, activeId }: { customers: Customer[]; activeId: string }) {
  const router = useRouter();
  const active = customers.find((c) => c.id === activeId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-xs hover:bg-white/20">
          als {active?.name ?? "—"} <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {customers.map((c) => (
          <DropdownMenuItem key={c.id} onClick={() => router.push(`/portal?c=${c.id}`)}>
            <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
            {c.name}
            {c.id === activeId && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PortalQuoteRequest({ customerId, customerColor }: { customerId: string; customerColor: string }) {
  const [origin, setOrigin] = useState("CNSHA");
  const [destination, setDestination] = useState("DEHAM");
  const [mode, setMode] = useState<"AIR" | "OCEAN">("OCEAN");
  const [description, setDescription] = useState("2x 40 HC, Auto-Teile, EXW Shanghai");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const r = await requestQuoteFromPortal({ customerId, mode, origin, destination, description });
      if (r.ok) toast.success(`Angebot ${r.ref} angefragt`, { description: "Wir melden uns typisch in <1h." });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neues Angebot anfragen</CardTitle>
        <CardDescription>Wir antworten typisch in &lt;1h</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex gap-2">
          <button onClick={() => setMode("OCEAN")} className={`flex-1 rounded-md border px-3 py-2 text-sm flex items-center justify-center gap-2 ${mode === "OCEAN" ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
            <Ship className="h-4 w-4" /> Ocean
          </button>
          <button onClick={() => setMode("AIR")} className={`flex-1 rounded-md border px-3 py-2 text-sm flex items-center justify-center gap-2 ${mode === "AIR" ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
            <Plane className="h-4 w-4" /> Air
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Origin</Label><Input value={origin} onChange={(e) => setOrigin(e.target.value)} className="mt-1.5" /></div>
          <div><Label>Destination</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} className="mt-1.5" /></div>
        </div>
        <div><Label>Kurzbeschreibung</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" /></div>
        <Button className="w-full" style={{ background: customerColor, color: "#fff" }} onClick={submit} disabled={pending}>
          {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> senden…</> : <>Angebot anfragen</>}
        </Button>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Check className="h-3 w-3 text-emerald-600" /> Anfragen werden automatisch vom AI-Copilot vorbewertet
        </div>
      </CardContent>
    </Card>
  );
}

export function PortalInvoiceDownload({ invoices }: { invoices: Array<{ nr: string; datum: string; betrag: string; status: string }> }) {
  function download(nr: string) {
    // Generate a simple data-URL PDF-stub
    const content = `%PDF-1.1 — Frachtwerk Demo-Rechnung ${nr}`;
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${nr}.pdf`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${nr} heruntergeladen`);
  }
  return (
    <>
      {invoices.map((r) => (
        <div key={r.nr} className="flex items-center gap-3 rounded-lg border p-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{r.nr}</div>
            <div className="text-xs text-muted-foreground">{r.datum} · {r.betrag}</div>
          </div>
          <Badge variant={r.status === "Bezahlt" ? "success" : "warning"}>{r.status}</Badge>
          <Button size="icon" variant="ghost" onClick={() => download(r.nr)}><Download className="h-3.5 w-3.5" /></Button>
        </div>
      ))}
    </>
  );
}
