"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Sparkles, ExternalLink, Copy, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDateTime } from "@/lib/utils";

type Doc = {
  id: string;
  type: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  extractionConfidence: number | null;
  extractedJson: any;
  createdAt: string;
};

export function DocumentsList({ documents }: { documents: Doc[] }) {
  const [active, setActive] = useState<Doc | null>(null);
  return (
    <>
      {documents.map((d) => (
        <button
          key={d.id}
          onClick={() => setActive(d)}
          className="w-full text-left flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
        >
          <div className="h-9 w-9 rounded-md bg-muted grid place-items-center shrink-0">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{d.filename}</div>
            <div className="text-[11px] text-muted-foreground">
              {d.type} · {(d.sizeBytes / 1024).toFixed(0)} KB · Vertrauen{" "}
              {d.extractionConfidence ? Math.round(d.extractionConfidence * 100) : 0}%
            </div>
          </div>
          <Badge variant="success" className="gap-1">
            <Sparkles className="h-3 w-3" /> extrahiert
          </Badge>
          <span className="text-xs text-primary">Öffnen</span>
        </button>
      ))}
      <DocumentViewer document={active} onClose={() => setActive(null)} />
    </>
  );
}

export function DocumentViewer({ document: doc, onClose }: { document: Doc | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const open = !!doc;
  const fields = doc?.extractedJson?.fields ?? {};

  function copyJson() {
    if (!doc) return;
    navigator.clipboard.writeText(JSON.stringify(doc.extractedJson, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 1800);
    toast.success("JSON in Zwischenablage kopiert");
  }

  function download() {
    if (!doc) return;
    const content = `%PDF-1.1 — Frachtwerk Demo Stub of ${doc.filename}\n\n[Dies ist kein echtes PDF. Der Content wird bei Integration aus S3/MinIO gezogen.]`;
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a"); a.href = url; a.download = doc.filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${doc.filename} heruntergeladen`);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-muted-foreground" />
            {doc?.filename}
          </DialogTitle>
          <DialogDescription>
            {doc?.type} · {doc && (doc.sizeBytes / 1024).toFixed(0)} KB · {doc && formatDate(doc.createdAt)} ·
            Extraktion Claude Opus 4.7 · Vertrauen {doc?.extractionConfidence ? Math.round(doc.extractionConfidence * 100) : 0}%
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="fields" className="px-6 py-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="fields">Extrahierte Felder</TabsTrigger>
              <TabsTrigger value="preview">Vorschau</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={copyJson}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} JSON kopieren
              </Button>
              <Button variant="outline" size="sm" onClick={download}><Download className="h-3.5 w-3.5" /> Original</Button>
            </div>
          </div>

          <TabsContent value="fields">
            <div className="grid gap-2 sm:grid-cols-2 max-h-[55vh] overflow-y-auto pr-1">
              {Object.entries(fields).map(([k, v]) => (
                <div key={k} className="rounded-lg border bg-card p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.replace(/_/g, " ")}</div>
                  <div className="text-sm font-medium break-words">{Array.isArray(v) ? v.join(", ") : String(v ?? "—")}</div>
                </div>
              ))}
              {Object.keys(fields).length === 0 && (
                <div className="col-span-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Noch keine strukturierten Felder — Extraktion läuft oder fehlgeschlagen.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <div className="rounded-lg border bg-white shadow-sm max-h-[55vh] overflow-y-auto">
              {/* Fake letterhead / doc preview */}
              <div className="p-8 text-[13px] text-slate-900 font-[inherit]">
                <div className="flex items-start justify-between pb-4 border-b border-slate-300">
                  <div>
                    <div className="text-lg font-bold tracking-tight">{doc?.type === "COMMERCIAL_INVOICE" ? "COMMERCIAL INVOICE" : doc?.type === "AWB" ? "AIR WAYBILL" : doc?.type === "PACKING_LIST" ? "PACKING LIST" : "BILL OF LADING"}</div>
                    <div className="text-xs text-slate-500 font-mono">{doc?.filename}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{fields.carrier ?? "—"}</div>
                    <div className="text-[10px] text-slate-500">Reference {fields.bl_or_awb_number ?? "—"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 py-4 border-b border-slate-200 text-[12px]">
                  <div>
                    <div className="text-[9px] uppercase text-slate-500 tracking-wider mb-1">Shipper</div>
                    <div className="font-medium">{fields.shipper ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-slate-500 tracking-wider mb-1">Consignee</div>
                    <div className="font-medium">{fields.consignee ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-slate-500 tracking-wider mb-1">Origin</div>
                    <div className="font-mono">{fields.origin ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-slate-500 tracking-wider mb-1">Destination</div>
                    <div className="font-mono">{fields.destination ?? "—"}</div>
                  </div>
                </div>
                <table className="w-full mt-4 text-[11px]">
                  <thead className="text-slate-500">
                    <tr className="text-left">
                      <th className="py-1.5 border-b border-slate-300 font-semibold">Description</th>
                      <th className="py-1.5 border-b border-slate-300 font-semibold text-right">Pieces</th>
                      <th className="py-1.5 border-b border-slate-300 font-semibold text-right">Weight</th>
                      <th className="py-1.5 border-b border-slate-300 font-semibold text-right">HS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1.5 border-b border-slate-100">{fields.commodity ?? "—"}</td>
                      <td className="py-1.5 border-b border-slate-100 text-right">{fields.pieces ?? "—"}</td>
                      <td className="py-1.5 border-b border-slate-100 text-right">{fields.weight ?? "—"}</td>
                      <td className="py-1.5 border-b border-slate-100 text-right font-mono">{Array.isArray(fields.hs) ? fields.hs.join(", ") : (fields.hs ?? "—")}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-6 text-[10px] text-slate-400 italic">
                  Diese Vorschau ist generiert aus den extrahierten Feldern. Das Original-PDF wird bei produktivem Setup aus S3/MinIO geladen.
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="json">
            <pre className="rounded-lg border bg-[#0b1220] text-slate-200 text-[11px] font-mono p-4 max-h-[55vh] overflow-auto">
              {JSON.stringify(doc?.extractedJson ?? {}, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between border-t px-6 py-3 bg-muted/30 text-xs">
          <div className="text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Extrahiert ohne Templates — Claude Opus 4.7 Vision
          </div>
          <Button size="sm" onClick={onClose}>Schließen</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
