"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, Check, X, AlertTriangle, Info, CircleCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { relativeFromNow } from "@/lib/utils";
import { toast } from "sonner";

// Procedural audio "ping" using Web Audio — no mp3 dependency.
function playPing(level: string) {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const notes = level === "critical" ? [[880, 0], [660, 0.12]]
      : level === "warning" ? [[700, 0], [520, 0.12]]
      : level === "success" ? [[660, 0], [880, 0.12]]
      : [[660, 0]] as number[][];

    for (const [freq, offset] of notes) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + offset);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + offset);
      g.gain.linearRampToValueAtTime(0.06, now + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.25);
      osc.connect(g).connect(gain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.3);
    }
    setTimeout(() => ctx.close(), 800);
  } catch {}
}

type Notification = {
  id: string;
  level: string;
  title: string;
  body?: string | null;
  href?: string | null;
  shipmentId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export function NotificationDrawer() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  async function refresh(silent = true) {
    if (!silent) setLoading(true);
    try {
      const r = await fetch("/api/notifications");
      const data = await r.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { refresh(false); }, []);

  // Poll every 8 seconds; show toast for newly arriving ones while closed
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/notifications");
        const data = await r.json();
        const newIds = new Set(items.map((i) => i.id));
        const newcomers: Notification[] = (data.items ?? []).filter((n: Notification) => !newIds.has(n.id));
        setItems(data.items ?? []);
        setUnread(data.unread ?? 0);
        if (!open) {
          newcomers.slice(0, 3).forEach((n) => {
            const opts = {
              description: n.body ?? undefined,
              action: n.href ? { label: "Öffnen", onClick: () => (window.location.href = n.href!) } : undefined,
            } as any;
            if (n.level === "critical") toast.error(n.title, opts);
            else if (n.level === "warning") toast.warning(n.title, opts);
            else if (n.level === "success") toast.success(n.title, opts);
            else toast(n.title, opts);
          });
        }
      } catch {}
    }, 8000);
    return () => clearInterval(t);
  }, [items, open]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "read_all" }) });
    refresh();
  }
  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "read", id }) });
    refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[10px] grid place-items-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[70] bg-black/40" onClick={() => setOpen(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-[400px] max-w-[92vw] bg-card border-l shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-2 border-b px-4 h-14">
              <Bell className="h-4 w-4 text-primary" />
              <div className="font-semibold text-sm">Benachrichtigungen</div>
              {unread > 0 && (
                <span className="ml-1 rounded bg-rose-500/15 text-rose-700 text-[10px] px-1.5 py-0.5">{unread} neu</span>
              )}
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={markAllRead} disabled={unread === 0}>
                Alle gelesen
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </header>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading && (
                <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> lädt…
                </div>
              )}
              {items.length === 0 && !loading && (
                <div className="text-center text-xs text-muted-foreground p-6">
                  Keine Benachrichtigungen.
                </div>
              )}
              {items.map((n) => {
                const unread = !n.readAt;
                const IconEl = n.level === "critical" ? AlertTriangle
                  : n.level === "warning" ? AlertTriangle
                  : n.level === "success" ? CircleCheck
                  : Info;
                const color = n.level === "critical" ? "text-rose-500"
                  : n.level === "warning" ? "text-amber-500"
                  : n.level === "success" ? "text-emerald-500"
                  : "text-blue-500";
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "group flex gap-2.5 rounded-lg px-3 py-2.5 transition-colors",
                      unread ? "bg-primary/5" : "hover:bg-muted/40"
                    )}
                  >
                    <IconEl className={cn("h-4 w-4 shrink-0 mt-0.5", color)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {n.href ? (
                          <Link
                            href={n.href}
                            className="text-sm font-medium leading-tight truncate hover:text-primary"
                            onClick={() => { markRead(n.id); setOpen(false); }}
                          >
                            {n.title}
                          </Link>
                        ) : (
                          <div className="text-sm font-medium leading-tight truncate">{n.title}</div>
                        )}
                        {unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </div>
                      {n.body && <div className="text-xs text-muted-foreground truncate">{n.body}</div>}
                      <div className="text-[10px] text-muted-foreground mt-0.5">{relativeFromNow(n.createdAt)}</div>
                    </div>
                    {unread && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}
