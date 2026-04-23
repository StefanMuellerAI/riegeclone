import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down"; positive?: boolean };
  icon: LucideIcon;
  accent?: "blue" | "emerald" | "amber" | "violet" | "slate";
  hint?: string;
};

const ACCENTS = {
  blue: { ring: "ring-blue-500/20", bg: "bg-blue-500/10", text: "text-blue-600" },
  emerald: { ring: "ring-emerald-500/20", bg: "bg-emerald-500/10", text: "text-emerald-600" },
  amber: { ring: "ring-amber-500/20", bg: "bg-amber-500/10", text: "text-amber-600" },
  violet: { ring: "ring-violet-500/20", bg: "bg-violet-500/10", text: "text-violet-600" },
  slate: { ring: "ring-slate-500/20", bg: "bg-slate-500/10", text: "text-slate-600" },
};

export function KpiCard({ label, value, delta, icon: Icon, accent = "blue", hint }: Props) {
  const a = ACCENTS[accent];
  return (
    <Card className="relative overflow-hidden">
      <div className={cn("pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl", a.bg)} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-semibold tracking-tight">{value}</div>
            {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
          </div>
          <div className={cn("h-9 w-9 rounded-lg grid place-items-center ring-1", a.bg, a.ring, a.text)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {delta && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {delta.direction === "up" ? (
              <ArrowUpRight className={cn("h-3.5 w-3.5", delta.positive ? "text-emerald-600" : "text-rose-600")} />
            ) : (
              <ArrowDownRight className={cn("h-3.5 w-3.5", delta.positive ? "text-emerald-600" : "text-rose-600")} />
            )}
            <span className={cn("font-medium", delta.positive ? "text-emerald-600" : "text-rose-600")}>{delta.value}</span>
            <span className="text-muted-foreground">vs. letzter Monat</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
