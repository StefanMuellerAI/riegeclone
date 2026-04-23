"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUSES = [
  { v: "BOOKED", l: "Gebucht" },
  { v: "IN_TRANSIT", l: "Unterwegs" },
  { v: "AT_DESTINATION", l: "Am Ziel" },
  { v: "CUSTOMS_CLEARANCE", l: "Zoll" },
  { v: "DELIVERED", l: "Zugestellt" },
  { v: "EXCEPTION", l: "Exception" },
];
const DIRECTIONS = [
  { v: "IMPORT", l: "Import" },
  { v: "EXPORT", l: "Export" },
];

type Customer = { id: string; name: string };

export function ShipmentsFilter({ customers, activeCount }: { customers: Customer[]; activeCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const current = {
    status: params.get("status") ?? "",
    direction: params.get("direction") ?? "",
    customerId: params.get("customerId") ?? "",
    mode: params.get("mode") ?? "",
    risk: params.get("filter") === "risk",
  };

  function apply(key: string, value: string | null) {
    const p = new URLSearchParams(params.toString());
    if (!value) p.delete(key); else p.set(key, value);
    router.push(`${pathname}?${p.toString()}`);
  }

  const anyActive = current.status || current.direction || current.customerId || current.mode || current.risk;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Filter className="h-4 w-4" /> Filter
        {anyActive && <Badge variant="default" className="h-4 px-1.5 text-[10px]">{Object.values(current).filter(Boolean).length}</Badge>}
      </Button>

      {anyActive && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {current.status && <ActiveChip label={STATUSES.find((s) => s.v === current.status)?.l ?? current.status} onRemove={() => apply("status", null)} />}
          {current.direction && <ActiveChip label={current.direction} onRemove={() => apply("direction", null)} />}
          {current.customerId && <ActiveChip label={customers.find((c) => c.id === current.customerId)?.name ?? "Kunde"} onRemove={() => apply("customerId", null)} />}
          {current.risk && <ActiveChip label="High Risk" onRemove={() => apply("filter", null)} />}
          <Link href={pathname} className="underline hover:text-foreground">Alle zurücksetzen</Link>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter · Sendungen</DialogTitle>
            <DialogDescription>Kombinierbar. URL-shareable.</DialogDescription>
          </DialogHeader>

          <Section title="Status">
            <div className="grid grid-cols-3 gap-1.5">
              {STATUSES.map((s) => (
                <Pill key={s.v} active={current.status === s.v} onClick={() => apply("status", current.status === s.v ? null : s.v)}>{s.l}</Pill>
              ))}
            </div>
          </Section>

          <Section title="Direction">
            <div className="grid grid-cols-2 gap-1.5">
              {DIRECTIONS.map((s) => (
                <Pill key={s.v} active={current.direction === s.v} onClick={() => apply("direction", current.direction === s.v ? null : s.v)}>{s.l}</Pill>
              ))}
            </div>
          </Section>

          <Section title="Kunde">
            <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto">
              {customers.map((c) => (
                <Pill key={c.id} active={current.customerId === c.id} onClick={() => apply("customerId", current.customerId === c.id ? null : c.id)}>{c.name}</Pill>
              ))}
            </div>
          </Section>

          <Section title="Risk">
            <div className="grid grid-cols-2 gap-1.5">
              <Pill active={current.risk} onClick={() => apply("filter", current.risk ? null : "risk")}>Sort by Delay Risk</Pill>
            </div>
          </Section>

          <div className="flex justify-between pt-1">
            <Button variant="ghost" size="sm" onClick={() => { router.push(pathname); setOpen(false); }}>Reset</Button>
            <Button size="sm" onClick={() => setOpen(false)}>Fertig</Button>
          </div>
          <div className="text-[11px] text-muted-foreground">{activeCount} Treffer</div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors whitespace-nowrap truncate",
        active ? "border-primary bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50")}
    >
      {children}
    </button>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
      {label}
      <button onClick={onRemove} className="hover:text-foreground"><X className="h-3 w-3" /></button>
    </span>
  );
}
