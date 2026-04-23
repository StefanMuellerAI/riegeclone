"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Send, Sparkles, X, User2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; cards?: CardHit[] };
type CardHit = { ref: string; origin: string; dest: string; status: string; delayDays?: number };

const SEED_SUGGESTIONS = [
  "Welche Luftfracht-Sendungen aus Shanghai sind >24h verspätet?",
  "Erstelle ein Angebot 2x 40HC Rotterdam → Chicago, DDP, gültig 14 Tage",
  "Liste alle Sendungen mit offener ATLAS-Anmeldung",
  "Wie hoch ist meine Q1 CO2e-Last in Tonnen nach Trade Lane?",
];

export function CopilotDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, busy]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (typeof ce.detail === "string") {
        setOpen(true);
        setTimeout(() => send(ce.detail), 150);
      }
    };
    window.addEventListener("copilot-ask", handler as EventListener);
    return () => window.removeEventListener("copilot-ask", handler as EventListener);
  }, []);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const newMsgs: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(newMsgs);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: newMsgs.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await r.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.content ?? "Antwort nicht verfügbar.", cards: data.cards }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Netzwerkfehler — bitte erneut versuchen." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all",
          "bg-[linear-gradient(135deg,#1e40af,#3b82f6)] text-white hover:scale-105",
          open && "scale-0 opacity-0"
        )}
        aria-label="Copilot öffnen"
      >
        <Sparkles className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 rounded-full bg-emerald-500 h-3 w-3 ring-2 ring-background animate-pulseGlow" />
      </button>

      <aside
        className={cn(
          "fixed bottom-6 right-6 z-40 flex flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl transition-all",
          "w-[min(420px,calc(100vw-2rem))] h-[min(620px,calc(100vh-3rem))]",
          open ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-4"
        )}
      >
        <header className="flex items-center gap-2 border-b px-4 py-3 bg-[linear-gradient(135deg,#1e40af,#3b82f6)] text-white">
          <div className="h-8 w-8 rounded-lg bg-white/15 grid place-items-center">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Frachtwerk Copilot</div>
            <div className="text-[11px] opacity-80">Claude Opus · Tools: shipments, quotes, carbon, customs</div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
          {msgs.length === 0 && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Frag mich alles über deine Sendungen, Angebote, Zoll oder Carbon. Ich habe Live-Zugriff
                auf die Datenbank.
              </div>
              <div className="space-y-1.5">
                {SEED_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left text-xs rounded-lg border px-3 py-2 hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
              <div
                className={cn(
                  "h-7 w-7 rounded-full grid place-items-center shrink-0 text-xs",
                  m.role === "user" ? "bg-muted" : "bg-[linear-gradient(135deg,#1e40af,#3b82f6)] text-white"
                )}
              >
                {m.role === "user" ? <User2 className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm max-w-[85%]",
                  m.role === "user" ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted"
                )}
              >
                {m.role === "user" ? (
                  m.content
                ) : (
                  <div className="prose-copilot">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="leading-snug">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => <code className="rounded bg-background/80 px-1 py-0.5 text-[11px] font-mono">{children}</code>,
                        pre: ({ children }) => <pre className="rounded bg-background/80 p-2 text-[11px] font-mono overflow-x-auto my-2">{children}</pre>,
                        a: ({ href, children }) => <a href={href} className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer">{children}</a>,
                        h1: ({ children }) => <div className="font-semibold text-sm mb-1">{children}</div>,
                        h2: ({ children }) => <div className="font-semibold text-sm mb-1">{children}</div>,
                        h3: ({ children }) => <div className="font-semibold text-sm mb-1">{children}</div>,
                        table: ({ children }) => <table className="w-full text-xs my-2 border-collapse">{children}</table>,
                        th: ({ children }) => <th className="border-b text-left px-1.5 py-1 font-semibold">{children}</th>,
                        td: ({ children }) => <td className="border-b px-1.5 py-1">{children}</td>,
                        hr: () => <hr className="my-2 border-border" />,
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}
                {m.cards && m.cards.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {m.cards.map((c) => (
                      <div key={c.ref} className="rounded-lg bg-background border p-2 text-xs flex gap-2 items-center">
                        <div className="font-mono font-semibold text-primary">{c.ref}</div>
                        <div className="text-muted-foreground">
                          {c.origin} → {c.dest}
                        </div>
                        <div className="flex-1" />
                        <span className="rounded bg-amber-500/15 text-amber-700 px-1.5 py-0.5 text-[10px]">
                          {c.delayDays ? `+${c.delayDays}d` : c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Copilot denkt…
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t px-3 py-3 bg-card"
        >
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Frage stellen oder Aufgabe geben…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <Button size="icon" type="submit" variant="gradient" disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </aside>
    </>
  );
}
