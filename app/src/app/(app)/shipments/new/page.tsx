import Link from "next/link";
import { Sparkles, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NewShipmentPage() {
  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Neue Sendung</h1>
        <p className="text-sm text-muted-foreground">
          Drei Wege zur Sendungsanlage — wähle was passt.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
          <CardHeader className="relative">
            <Badge variant="info" className="w-fit gap-1 mb-1"><Sparkles className="h-3 w-3" /> schnellste Route</Badge>
            <CardTitle>Aus Dokument anlegen</CardTitle>
            <CardDescription>B/L oder AWB hochladen — Felder werden per AI extrahiert und Sendung automatisch befüllt.</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Button variant="gradient" className="w-full" asChild>
              <Link href="/extract">
                <Upload className="h-4 w-4" /> Dokument hochladen
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aus Quote konvertieren</CardTitle>
            <CardDescription>Bestehendes angenommenes Angebot übernehmen — alle Daten werden vorausgefüllt.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/quotes">Angebot auswählen</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manuell erfassen</CardTitle>
            <CardDescription>Klassisches Formular — wenn du alle Daten bereits kennst.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Formular öffnen</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schnellerfassung</CardTitle>
          <CardDescription>Minimaldaten — Rest fügt der Copilot ein</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Mode</Label><Input placeholder="AIR / OCEAN" /></div>
          <div className="space-y-1.5"><Label>Direction</Label><Input placeholder="IMPORT / EXPORT" /></div>
          <div className="space-y-1.5"><Label>Origin</Label><Input placeholder="CNSHA · Shanghai" /></div>
          <div className="space-y-1.5"><Label>Destination</Label><Input placeholder="DEHAM · Hamburg" /></div>
          <div className="space-y-1.5"><Label>Carrier</Label><Input placeholder="Maersk" /></div>
          <div className="space-y-1.5"><Label>Kunde</Label><Input placeholder="Böhler Edelstahl" /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Commodity</Label><Input placeholder="Steel coils" /></div>
          <div className="md:col-span-2 flex gap-2">
            <Button variant="gradient">Sendung anlegen</Button>
            <Button variant="ghost">Abbrechen</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
