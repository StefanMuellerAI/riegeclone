"use client";
import { useEffect, useState } from "react";

type ClockState = {
  epochRealStart: string;
  epochVirtualStart: string;
  compression: number;
};

let cache: ClockState | null = null;
let cacheAt = 0;

/**
 * Fetches the server's world clock once, caches it globally for 5s, then
 * lets callers compute `virtualNow()` locally every animation frame.
 */
export function useWorldClock() {
  const [state, setState] = useState<ClockState | null>(cache);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (cache && Date.now() - cacheAt < 5000) {
        if (mounted) setState(cache);
        return;
      }
      try {
        const r = await fetch("/api/world-clock");
        const d: ClockState = await r.json();
        cache = d;
        cacheAt = Date.now();
        if (mounted) setState(d);
      } catch {}
    }
    load();
    const t = setInterval(load, 20000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  return state;
}

export function virtualNowFor(state: ClockState): number {
  const real = new Date(state.epochRealStart).getTime();
  const virt = new Date(state.epochVirtualStart).getTime();
  return virt + (Date.now() - real) * state.compression;
}
