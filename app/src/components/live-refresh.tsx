"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Periodically refreshes the current server-rendered page so the user sees
// the procedurally progressing world without having to manually reload.
export function LiveRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}
