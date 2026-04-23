import Link from "next/link";
import { ArrowRight, Book, CheckCircle2, Code, Command, HelpCircle, Keyboard, Package, Play, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HelpPage() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" /> Demo-Walkthrough & Hilfe
        </h1>
        <p className="text-sm text-muted-foreground">
          Frachtwerk ist ein früher Prototyp. Hier die empfohlene 10-Minuten-Tour für Besucher.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Play className="h-4 w-4 text-primary" /> 10-Minuten-Tour</CardTitle>
          <CardDescription>Geh die folgenden Schritte durch um das System echt zu erleben</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            { n: 1, title: "Dashboard ansehen", body: "Live-Radar mit animierten Arcs, KPIs, Delay Risk Queue, CBAM-Widget. Oben rechts läuft die World Clock — die Welt tickt mit 60x Geschwindigkeit.", href: "/" },
            { n: 2, title: "Command Palette", body: "Drücke ⌘K. Tippe eine Sendungsnummer, einen Kundennamen oder einen Seiten-Begriff. Direktsprung.", href: null, keys: ["⌘", "K"] },
            { n: 3, title: "Neue Sendung anlegen", body: "Oben rechts 'Neue Sendung' klicken. 4-Step Wizard mit Live-Rate-Lookup gegen Carrier. Buchung erzeugt Milestones und startet den Progress-Cycle.", href: "/shipments" },
            { n: 4, title: "Shipment Detail", body: "Öffne eine Sendung. Timeline zeigt vergangene und zukünftige Milestones. Unter 'Aktualisieren' kannst du Status setzen, Milestone erfassen, ATLAS-Anmeldung einreichen.", href: "/shipments" },
            { n: 5, title: "Zoll-Anmeldung", body: "Auf Shipment-Detail: Aktualisieren > Zoll-Anmeldung. Wähle ATLAS. 2s Animation, dann MRN.", href: null },
            { n: 6, title: "Document Extraction", body: "Lade ein B/L PDF hoch. Claude Opus 4.7 Vision extrahiert Felder ohne Templates.", href: "/extract" },
            { n: 7, title: "AI Copilot", body: "Floating-Button unten rechts. 'Welche Sendungen aus Shanghai sind >24h verspätet?' — fragt die DB live ab.", href: null, keys: [] },
            { n: 8, title: "Workflow Testlauf", body: "Auf /workflows einen Testlauf starten. Schritte streamen live durch.", href: "/workflows" },
            { n: 9, title: "CBAM Report einreichen", body: "Auf /cbam den Q1 2026 Report öffnen und 'Jetzt einreichen'. Simulierte Übertragung an DEHSt.", href: "/cbam" },
            { n: 10, title: "Customer Portal", body: "Öffne /portal in neuem Tab. Wechsle oben den Kunden. White-Label-Theming pro Kunde.", href: "/portal" },
          ].map((s) => (
            <div key={s.n} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
              <div className="h-7 w-7 shrink-0 rounded-full bg-primary/10 text-primary grid place-items-center font-mono text-xs">{s.n}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2">
                  {s.title}
                  {s.keys && s.keys.length > 0 && (
                    <span className="flex items-center gap-1">
                      {s.keys.map((k) => <span key={k} className="kbd">{k}</span>)}
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground text-sm leading-snug">{s.body}</div>
                {s.href && (
                  <Link href={s.href} className="text-xs text-primary inline-flex items-center gap-1 mt-1">
                    Öffnen <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Keyboard className="h-4 w-4" /> Shortcuts</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <Row keys={["⌘", "K"]} label="Command Palette" />
            <Row keys={["⌘", "⇧", "N"]} label="Neue Sendung" />
            <Row keys={["Esc"]} label="Dialog schließen" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Hinweis zum Realismus</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Alle externen Systeme sind simuliert — mit realistischen Latenzen, Referenznummern und gelegentlichen Fehlerfällen.</p>
            <div className="flex flex-wrap gap-1.5">
              {["ATLAS", "e-dec", "AES", "NCTS", "Freightos", "Slack", "Email", "AIS", "ADS-B", "DEHSt"].map((s) => (
                <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
              ))}
            </div>
            <p className="text-xs">Setze <span className="font-mono">ANTHROPIC_API_KEY</span> um den Copilot + Document-Extractor mit echtem Claude Opus 4.7 laufen zu lassen.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1">{keys.map((k, i) => <span key={i} className="kbd">{k}</span>)}</div>
    </div>
  );
}
