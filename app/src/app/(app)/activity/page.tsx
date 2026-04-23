import Link from "next/link";
import { Activity, ArrowRight, Bot, Mail, MessageCircle, Webhook } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, relativeFromNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ channel?: string }>;

const ICON: Record<string, any> = { slack: MessageCircle, email: Mail, webhook: Webhook };
const CHANNEL_LABEL: Record<string, string> = { slack: "Slack", email: "Email", webhook: "Webhook" };

export default async function ActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const where = sp.channel ? { channel: sp.channel } : {};

  const [logs, counts, notifications] = await Promise.all([
    db.notificationLog.findMany({ where, orderBy: { sentAt: "desc" }, take: 120 }),
    db.notificationLog.groupBy({ by: ["channel"], _count: { _all: true } }),
    db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
  ]);

  // Resolve shipment refs for display
  const shipIds = Array.from(new Set(logs.map((l) => l.shipmentId).filter(Boolean))) as string[];
  const ships = await db.shipment.findMany({ where: { id: { in: shipIds } }, select: { id: true, ref: true } });
  const shipMap = Object.fromEntries(ships.map((s) => [s.id, s.ref]));

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" /> Activity & Integrations-Log
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Alles was Frachtwerk in den letzten Tagen an externen Systemen verschickt hat. Slack-Channel, Email-Empfänger, Webhook-URL — alles nachvollziehbar.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ChannelChip label="Alle" href="/activity" count={logs.length} active={!sp.channel} />
        {["slack", "email", "webhook"].map((c) => {
          const n = counts.find((x) => x.channel === c)?._count._all ?? 0;
          const Icon = ICON[c];
          return (
            <ChannelChip key={c} href={`/activity?channel=${c}`} label={CHANNEL_LABEL[c]} count={n} active={sp.channel === c} icon={<Icon className="h-3.5 w-3.5" />} />
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Letzte Auslieferungen</CardTitle>
            <CardDescription>Automatisch von Workflows und System-Events ausgelöst</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.map((l) => {
              const Icon = ICON[l.channel] ?? Webhook;
              return (
                <div key={l.id} className="flex gap-3 rounded-lg border p-3 hover:bg-muted/30">
                  <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
                    l.channel === "slack" ? "bg-[#4A154B]/10 text-[#611f69]" :
                    l.channel === "email" ? "bg-blue-500/10 text-blue-600" :
                    "bg-slate-500/10 text-slate-600"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="muted" className="text-[10px] font-mono">{l.channel.toUpperCase()}</Badge>
                      <span className="font-mono text-xs">→ {l.to}</span>
                      {l.shipmentId && shipMap[l.shipmentId] && (
                        <Link href={`/shipments/${l.shipmentId}`} className="text-xs font-mono text-primary hover:underline">
                          {shipMap[l.shipmentId]}
                        </Link>
                      )}
                    </div>
                    {l.subject && <div className="text-sm font-medium mt-0.5">{l.subject}</div>}
                    <div className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{l.body}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatDateTime(l.sentAt)} · {relativeFromNow(l.sentAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            {logs.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                Noch keine Auslieferungen. Workflow-Testlauf oder Shipment-Pre-Alert triggert Mock-Nachrichten.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> System-Events
            </CardTitle>
            <CardDescription>Interne Notifications (auch im Drawer sichtbar)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.slice(0, 20).map((n) => (
              <div key={n.id} className="flex gap-2.5 rounded-lg px-2 py-2">
                <div className={`h-1.5 w-1.5 rounded-full mt-2 shrink-0 ${
                  n.level === "critical" ? "bg-rose-500" : n.level === "warning" ? "bg-amber-500" :
                  n.level === "success" ? "bg-emerald-500" : "bg-blue-500"}`} />
                <div className="min-w-0 flex-1">
                  {n.href ? (
                    <Link href={n.href} className="text-sm font-medium leading-tight truncate hover:text-primary block">{n.title}</Link>
                  ) : <div className="text-sm font-medium leading-tight truncate">{n.title}</div>}
                  {n.body && <div className="text-xs text-muted-foreground truncate">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground">{relativeFromNow(n.createdAt)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChannelChip({ label, href, count, active, icon }: { label: string; href: string; count: number; active?: boolean; icon?: React.ReactNode }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${active ? "border-primary bg-primary/5 text-primary font-medium" : "hover:bg-muted/50"}`}>
      {icon}
      {label}
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
    </Link>
  );
}
