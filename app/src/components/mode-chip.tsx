import { Plane, Ship, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModeChip({ mode, className }: { mode: "AIR" | "OCEAN" | "ROAD"; className?: string }) {
  const Icon = mode === "AIR" ? Plane : mode === "OCEAN" ? Ship : Truck;
  const color = mode === "AIR" ? "text-violet-600 bg-violet-500/10 ring-violet-500/20"
    : mode === "OCEAN" ? "text-blue-600 bg-blue-500/10 ring-blue-500/20"
    : "text-slate-600 bg-slate-500/10 ring-slate-500/20";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md ring-1 px-1.5 py-0.5 text-[11px] font-medium", color, className)}>
      <Icon className="h-3 w-3" />
      {mode === "AIR" ? "Air" : mode === "OCEAN" ? "Ocean" : "Road"}
    </span>
  );
}
