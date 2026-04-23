"use client";
import { useEffect, useState } from "react";
import { Clock, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ClockState = {
  epochRealStart: string;
  epochVirtualStart: string;
  compression: number;
  ticks: number;
};

export function WorldClockWidget() {
  const [state, setState] = useState<ClockState | null>(null);
  const [virtualNow, setVirtualNow] = useState<Date>(new Date());
  const [pulse, setPulse] = useState(false);

  async function refresh() {
    try {
      const r = await fetch("/api/world-clock");
      const d: ClockState = await r.json();
      setState(d);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    } catch {}
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => {
      const realDelta = Date.now() - new Date(state.epochRealStart).getTime();
      setVirtualNow(new Date(new Date(state.epochVirtualStart).getTime() + realDelta * state.compression));
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  async function setCompression(c: number) {
    await fetch("/api/world-clock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ compression: c }) });
    refresh();
  }

  const fmt = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "UTC",
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "hidden md:inline-flex items-center gap-2 rounded-md border bg-background px-2.5 h-9 text-xs transition-colors hover:bg-muted",
            pulse && "ring-1 ring-emerald-400/40"
          )}
          title="World Clock (virtuelle Zeit)"
        >
          <span className={cn("h-1.5 w-1.5 rounded-full bg-emerald-400", pulse ? "animate-pulse" : "")} />
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono tabular-nums">{fmt.format(virtualNow)} UTC</span>
          <span className="text-[10px] text-muted-foreground">· {state?.compression ?? 60}x</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Gauge className="h-4 w-4" /> Zeit-Kompression
        </DropdownMenuLabel>
        <div className="px-2 py-1 text-[11px] text-muted-foreground">
          Die simulierte Welt läuft mit {state?.compression ?? 60}x Beschleunigung.
          Bei 60x = 1 reale Minute ist 1 virtuelle Stunde.
        </div>
        <DropdownMenuSeparator />
        {[
          { v: 1, l: "1x — Echtzeit" },
          { v: 60, l: "60x — 1 min = 1 Stunde" },
          { v: 240, l: "240x — 1 min = 4 Stunden" },
          { v: 1440, l: "1440x — 1 min = 1 Tag" },
          { v: 14400, l: "14400x — 1 min = 10 Tage" },
        ].map((o) => (
          <DropdownMenuItem key={o.v} onClick={() => setCompression(o.v)}>
            <span className={cn("font-mono text-xs", state?.compression === o.v && "font-bold text-primary")}>
              {o.v}x
            </span>
            <span className="ml-2 text-muted-foreground text-xs">{o.l.split("—")[1]}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-[11px] text-muted-foreground">
          Ticks: <span className="font-mono">{state?.ticks ?? 0}</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
