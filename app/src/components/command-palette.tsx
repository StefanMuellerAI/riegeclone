"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Bot, FileText, Package, Leaf, Radar, ShieldCheck, Workflow, Users, Sparkles,
  LayoutDashboard, FileCheck2, FileSearch2, Plus, Globe, ArrowRight, Search,
} from "lucide-react";

type Item = {
  id: string;
  type: "page" | "shipment" | "quote" | "customer" | "action";
  title: string;
  subtitle?: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect?: () => void;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const openEv = () => setOpen(true);
    window.addEventListener("keydown", h);
    window.addEventListener("open-command-palette", openEv);
    return () => {
      window.removeEventListener("keydown", h);
      window.removeEventListener("open-command-palette", openEv);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await r.json();
        if (!cancelled) setResults(data.items ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(run, 80);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  const go = (href: string) => { setOpen(false); setQ(""); router.push(href); };

  const staticActions: Item[] = [
    { id: "nav-dashboard", type: "page", title: "Dashboard", href: "/", icon: LayoutDashboard },
    { id: "nav-shipments", type: "page", title: "Alle Sendungen", href: "/shipments", icon: Package },
    { id: "nav-quotes", type: "page", title: "Angebote", href: "/quotes", icon: FileText },
    { id: "nav-customs", type: "page", title: "Zoll", href: "/customs", icon: FileCheck2 },
    { id: "nav-documents", type: "page", title: "Dokumente", href: "/documents", icon: FileSearch2 },
    { id: "nav-cbam", type: "page", title: "CBAM", href: "/cbam", icon: Leaf },
    { id: "nav-workflows", type: "page", title: "Workflows", href: "/workflows", icon: Workflow },
    { id: "nav-radar", type: "page", title: "Live-Radar", href: "/radar", icon: Radar },
    { id: "nav-screening", type: "page", title: "Sanktions-Screening", href: "/screening", icon: ShieldCheck },
    { id: "nav-partners", type: "page", title: "Partner", href: "/partners", icon: Users },
    { id: "nav-copilot", type: "page", title: "Copilot öffnen", href: "/copilot", icon: Bot },
    { id: "nav-portal", type: "page", title: "Customer Portal", href: "/portal", icon: Globe },
    { id: "act-new-shipment", type: "action", title: "Neue Sendung anlegen", href: "/shipments/new", icon: Plus },
    { id: "act-extract", type: "action", title: "Dokument extrahieren", href: "/extract", icon: Sparkles },
  ];

  const show = q ? results : staticActions;

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-24 right-6 z-30 hidden"
      aria-hidden
    />
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-2xl rounded-xl border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="[&_[cmdk-input]]:outline-none">
          <div className="flex items-center gap-2 px-3 border-b">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Suche Sendung, Angebot, Kunde, oder springe zu einer Seite…"
              value={q}
              onValueChange={setQ}
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <span className="flex items-center gap-1 pr-1">
              <span className="kbd">esc</span>
            </span>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {loading && <div className="text-xs text-muted-foreground px-3 py-2">Suche…</div>}
            <Command.Empty className="text-xs text-muted-foreground px-3 py-6 text-center">
              Keine Treffer für „{q}".
            </Command.Empty>

            {!q && (
              <Command.Group heading="Aktionen" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
                {staticActions.slice(-2).map((it) => (
                  <Row key={it.id} item={it} onSelect={() => it.href && go(it.href)} />
                ))}
              </Command.Group>
            )}
            {!q && (
              <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
                {staticActions.slice(0, -2).map((it) => (
                  <Row key={it.id} item={it} onSelect={() => it.href && go(it.href)} />
                ))}
              </Command.Group>
            )}
            {q && results.length > 0 && (
              <>
                {groupByType(results).map(([type, items]) => (
                  <Command.Group key={type} heading={labelForType(type)} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
                    {items.map((it) => (
                      <Row key={it.id} item={it} onSelect={() => it.href && go(it.href)} />
                    ))}
                  </Command.Group>
                ))}
              </>
            )}
          </Command.List>
          <div className="border-t px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="kbd">↑</span><span className="kbd">↓</span> navigieren</span>
            <span className="flex items-center gap-1"><span className="kbd">↵</span> auswählen</span>
            <span className="flex items-center gap-1"><span className="kbd">⌘</span><span className="kbd">K</span> schließen</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function Row({ item, onSelect }: { item: Item; onSelect: () => void }) {
  const Icon = item.icon ?? ArrowRight;
  return (
    <Command.Item
      value={item.title + " " + (item.subtitle ?? "") + " " + item.id}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer aria-selected:bg-muted data-[selected=true]:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate">{item.title}</div>
        {item.subtitle && <div className="text-[11px] text-muted-foreground truncate">{item.subtitle}</div>}
      </div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{labelForType(item.type)}</span>
    </Command.Item>
  );
}

function groupByType(items: Item[]): Array<[Item["type"], Item[]]> {
  const m = new Map<Item["type"], Item[]>();
  for (const it of items) {
    if (!m.has(it.type)) m.set(it.type, []);
    m.get(it.type)!.push(it);
  }
  const order: Item["type"][] = ["shipment", "quote", "customer", "page", "action"];
  return order.filter((t) => m.has(t)).map((t) => [t, m.get(t)!]);
}
function labelForType(t: Item["type"]): string {
  return t === "shipment" ? "Sendungen" : t === "quote" ? "Angebote" : t === "customer" ? "Kunden" : t === "page" ? "Seiten" : "Aktion";
}
