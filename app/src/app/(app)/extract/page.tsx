import { ExtractClient } from "./client";

export const metadata = { title: "AI Document Extraction — Frachtwerk" };

export default function ExtractPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Document Extraction</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Ziehe ein PDF oder Bild (Bill of Lading, Commercial Invoice, Packing List, AWB, Certificate of Origin)
          hier hinein. Claude Opus 4.7 Vision liest das Dokument ohne Templates oder spatial OCR-Regeln.
          Ergebnis strukturiert als JSON, direkt nutzbar für Sendungs-Anlage oder Zollanmeldung.
        </p>
      </div>
      <ExtractClient />
    </div>
  );
}
