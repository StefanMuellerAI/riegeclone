"use client";
import { useEffect, useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule } from "d3-geo";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import { NODES, NODE_BY_CODE, type LocationNode } from "@/lib/ports";
import { useWorldClock, virtualNowFor } from "@/lib/use-world-clock";
import { buildRoutePoints, pointAtProgress } from "@/lib/routing";

export type Arc = {
  from: string;
  to: string;
  mode: "AIR" | "OCEAN";
  label?: string;
  progress?: number;
  risk?: "low" | "mid" | "high";
  ref?: string;
  etd?: string;
  eta?: string;
};

const VIEWBOX_W = 1000;
const VIEWBOX_H = 520;

const countries = feature(worldData as any, (worldData as any).objects.countries) as any;
const graticule = geoGraticule().step([15, 15])();

export function WorldMap({ arcs }: { arcs: Arc[] }) {
  const [hover, setHover] = useState<Arc | null>(null);
  const clock = useWorldClock();
  const [, setTick] = useState(0);

  const projection = useMemo(
    () => geoNaturalEarth1().scale(180).translate([VIEWBOX_W / 2, VIEWBOX_H / 2 + 10]),
    []
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const graticulePath = useMemo(() => path(graticule) ?? "", [path]);
  const countriesPath = useMemo(() => countries.features.map((f: any) => path(f) ?? ""), [path]);

  useEffect(() => {
    if (!arcs.some((a) => a.etd && a.eta)) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [arcs]);

  const visibleNodes = useMemo(() => {
    const codes = new Set<string>();
    arcs.forEach((a) => { codes.add(a.from); codes.add(a.to); });
    return NODES.filter((n) => codes.has(n.code));
  }, [arcs]);

  const virtNow = clock ? virtualNowFor(clock) : Date.now();

  const arcSegments = useMemo(() => arcs.map((arc) => {
    const polyline = buildRoutePoints(arc.mode, arc.from, arc.to);
    if (polyline.length < 2) return null;

    // Build SVG path from projected polyline
    let d = "";
    const projected: [number, number][] = [];
    for (const p of polyline) {
      const pr = projection(p as any);
      if (!pr) continue;
      projected.push(pr as [number, number]);
    }
    if (projected.length < 2) return null;
    for (let i = 0; i < projected.length; i++) {
      d += (i === 0 ? "M" : "L") + projected[i][0].toFixed(1) + "," + projected[i][1].toFixed(1);
    }

    let progress: number;
    if (arc.etd && arc.eta) {
      const start = new Date(arc.etd).getTime();
      const end = new Date(arc.eta).getTime();
      const span = end - start;
      progress = span > 0 ? Math.max(0, Math.min(1, (virtNow - start) / span)) : arc.progress ?? 0.5;
    } else {
      progress = Math.max(0, Math.min(1, arc.progress ?? 0.5));
    }

    const pointLngLat = pointAtProgress(polyline, progress);
    const ppt = projection(pointLngLat as any);
    const [px, py] = ppt ?? projected[Math.floor(projected.length * progress)] ?? projected[0];

    return { arc, d, px, py, progress };
  }).filter(Boolean) as Array<{ arc: Arc; d: string; px: number; py: number; progress: number }>, [arcs, projection, virtNow]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-[#081224] ring-1 ring-border">
      <svg viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} className="block w-full h-auto">
        <defs>
          <linearGradient id="oceanGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity=".95" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity=".45" />
          </linearGradient>
          <linearGradient id="airGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="1" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity=".45" />
          </linearGradient>
          <radialGradient id="pulsePt" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity=".9" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} fill="#081224" />
        <path d={graticulePath} fill="none" stroke="#1e2a44" strokeWidth="0.4" opacity=".6" />

        <g>
          {countriesPath.map((d: string, i: number) => (
            <path key={i} d={d} fill="#13213a" stroke="#223556" strokeWidth="0.4" />
          ))}
        </g>

        {/* Ocean route back-halos */}
        {arcSegments.filter((s) => s.arc.mode === "OCEAN").map((seg, i) => (
          <path key={`halo-o-${i}`} d={seg.d} stroke="#3b82f6" strokeWidth="3" fill="none" opacity="0.12" strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {arcSegments.map((seg, i) => {
          const isAir = seg.arc.mode === "AIR";
          const stroke = isAir ? "url(#airGrad)" : "url(#oceanGrad)";
          return (
            <g key={`line-${i}`} filter="url(#glow)">
              <path
                d={seg.d}
                stroke={stroke}
                strokeWidth={isAir ? 1.1 : 1.6}
                fill="none"
                strokeDasharray={isAir ? "4 3" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={isAir ? 0.85 : 0.95}
              />
            </g>
          );
        })}

        {/* Animated dot along route */}
        {arcSegments.map((seg, i) => (
          <circle key={`dot-${i}`} r={seg.arc.mode === "AIR" ? 1.6 : 1.9} fill={seg.arc.mode === "AIR" ? "#c4b5fd" : "#93c5fd"}>
            <animateMotion dur={`${seg.arc.mode === "AIR" ? 6 + (i % 5) : 14 + (i % 6) * 2}s`} repeatCount="indefinite" path={seg.d} />
          </circle>
        ))}

        {arcSegments.map((seg, i) => {
          const risk = seg.arc.risk;
          const color = risk === "high" ? "#fb923c" : risk === "mid" ? "#fbbf24" : "#34d399";
          return (
            <g key={`prog-${i}`}
              onMouseEnter={() => setHover(seg.arc)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={seg.px} cy={seg.py} r="6" fill={color} opacity=".2" />
              <circle cx={seg.px} cy={seg.py} r="3.2" fill={color} stroke="#081224" strokeWidth="1.1" filter="url(#strongGlow)" />
            </g>
          );
        })}

        {visibleNodes.map((n: LocationNode) => {
          const p = projection([n.lon, n.lat]);
          if (!p) return null;
          return (
            <g key={n.code}>
              <circle cx={p[0]} cy={p[1]} r="7" fill="url(#pulsePt)" opacity=".6" />
              <circle cx={p[0]} cy={p[1]} r="2.2" fill="#f1f5f9" />
              <text x={p[0] + 5} y={p[1] + 3} fontSize="8" fill="#cbd5e1" className="select-none pointer-events-none">{n.code}</text>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-slate-200 bg-black/45 backdrop-blur rounded-lg px-2 py-1.5">
        <span className="flex items-center gap-1.5"><span className="block w-3 h-0.5 bg-violet-300" style={{ borderTop: "1px dashed #c4b5fd" }} /> Air · Großkreis</span>
        <span className="flex items-center gap-1.5"><span className="block w-3 h-0.5 bg-blue-300" /> Ocean · via Suez/Malacca/Panama</span>
        <span className="flex items-center gap-1.5"><span className="block w-1.5 h-1.5 bg-emerald-400 rounded-full" /> On Plan</span>
        <span className="flex items-center gap-1.5"><span className="block w-1.5 h-1.5 bg-amber-400 rounded-full" /> Watch</span>
        <span className="flex items-center gap-1.5"><span className="block w-1.5 h-1.5 bg-orange-400 rounded-full" /> Risk</span>
      </div>
      <div className="absolute top-3 right-3 rounded-lg bg-black/45 backdrop-blur px-2 py-1 text-[10px] text-slate-200 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        LIVE · {arcs.length} arcs
      </div>

      {hover && (
        <div className="absolute left-3 top-3 rounded-lg bg-black/70 backdrop-blur px-3 py-2 text-[11px] text-slate-100 space-y-0.5 pointer-events-none">
          <div className="font-semibold">{hover.ref ?? `${hover.from} → ${hover.to}`}</div>
          <div>{hover.from} → {hover.to} · {hover.mode}</div>
          {hover.eta && (
            <div className="text-slate-300">
              ETA {new Date(hover.eta).toLocaleString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
