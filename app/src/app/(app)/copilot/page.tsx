import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, FileSearch2, Package, Sparkles, TrendingUp } from "lucide-react";

export default function CopilotPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" /> Frachtwerk Copilot
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          AI-Assistent mit Live-Zugriff auf Shipments, Angebote, Zoll, Carbon. Ersetzt nicht den Operator,
          aber spart ihm zig Stunden die Woche bei Reporting, Status-Queries und Quote-Erstellung.
        </p>
      </div>

      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-radial-fade" />
        <CardContent className="relative p-10 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-[linear-gradient(135deg,#1e40af,#3b82f6)] grid place-items-center text-white shadow-xl">
            <Sparkles className="h-8 w-8" />
          </div>
          <div>
            <div className="text-xl font-semibold">Frage mich unten rechts</div>
            <div className="text-sm text-muted-foreground max-w-md mx-auto">
              Der Copilot ist immer verfügbar — im Floating-Panel unten rechts (oder drücke{" "}
              <span className="kbd">⌘</span> <span className="kbd">K</span>).
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Sample>Welche Luftfracht-Sendungen aus Shanghai sind &gt;24h verspätet?</Sample>
            <Sample>Wie viele Sendungen haben diese Woche auf Hamburg gezielt?</Sample>
            <Sample>Bei welchen Sendungen läuft der Free-Time ab?</Sample>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileSearch2 className="h-4 w-4 text-primary" /> Dokumente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Sample>Extrahiere das Commercial Invoice für FW-2026-1010</Sample>
            <Sample>Welche HS-Codes sind diesen Monat häufig genutzt?</Sample>
            <Sample>Gibt es Sendungen ohne B/L im Archiv?</Sample>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Sample>Erstelle Quote für 2x 40HC Rotterdam → Chicago, DDP, 14 Tage gültig</Sample>
            <Sample>Conversion Rate pro Kunde im Q1</Sample>
            <Sample>Q1 CO2e-Last in Tonnen nach Trade Lane</Sample>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tools verfügbar</CardTitle>
          <CardDescription>Der Copilot ruft diese Tools direkt auf Ihrer Datenbank auf</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            "shipments.search", "shipments.get", "shipments.update_status",
            "quotes.create", "quotes.send",
            "customs.create_declaration", "customs.check_sanctions",
            "documents.extract", "documents.attach",
            "carbon.compute", "cbam.aggregate",
            "notifications.slack", "notifications.email",
            "rates.lookup", "carriers.schedule",
          ].map((t) => (
            <Badge key={t} variant="outline" className="font-mono">{t}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Sample({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/30 cursor-pointer">
      „{children}"
    </div>
  );
}
