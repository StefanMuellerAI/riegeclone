"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  FileCheck2,
  Leaf,
  Workflow,
  Bot,
  FileSearch2,
  ShieldCheck,
  Radar,
  Settings,
  ExternalLink,
  LifeBuoy,
  Sparkles,
  Activity,
  Moon,
  Sun,
  LogOut,
  User,
  KeyRound,
  HelpCircle,
  Gauge,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "info" | "muted";
};

const CORE: Item[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/shipments", label: "Sendungen", icon: Package },
  { href: "/quotes", label: "Angebote", icon: FileText },
  { href: "/partners", label: "Partner", icon: Users },
  { href: "/customs", label: "Zoll", icon: FileCheck2 },
  { href: "/documents", label: "Dokumente", icon: FileSearch2 },
];

const SMART: Item[] = [
  { href: "/copilot", label: "Copilot", icon: Bot, badge: "AI", badgeVariant: "info" },
  { href: "/extract", label: "Doc-Extractor", icon: Sparkles, badge: "AI", badgeVariant: "info" },
  { href: "/workflows", label: "Workflows", icon: Workflow, badge: "Neu", badgeVariant: "success" },
  { href: "/cbam", label: "CBAM", icon: Leaf, badge: "Pflicht '26", badgeVariant: "warning" },
  { href: "/radar", label: "Live-Radar", icon: Radar },
  { href: "/screening", label: "Sanktions-Screening", icon: ShieldCheck },
  { href: "/activity", label: "Activity-Log", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex h-screen w-64 shrink-0 flex-col border-r bg-card sticky top-0">
      <div className="flex h-14 items-center gap-2 px-4 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#1e40af,#3b82f6)] text-white font-bold">
          F
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Frachtwerk</span>
          <span className="text-[10px] text-muted-foreground tracking-wide">FORWARDING OS · v0.1</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-sm">
        <SidebarGroup label="Operations" items={CORE} pathname={pathname} />
        <SidebarGroup label="Smart" items={SMART} pathname={pathname} />
        <div className="px-3 pt-4">
          <Link
            href="/portal"
            className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" /> Customer Portal
            </span>
          </Link>
        </div>
      </nav>
      <SidebarFooter />
    </aside>
  );
}

function SidebarFooter() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [sound, setSound] = useState(true);

  function toggleDark() {
    const v = !dark;
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
    try { localStorage.setItem("frachtwerk-theme", v ? "dark" : "light"); } catch {}
  }
  function toggleSound() {
    const v = !sound;
    setSound(v);
    try { localStorage.setItem("frachtwerk-sound", v ? "on" : "off"); } catch {}
  }

  return (
    <div className="border-t p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-2 rounded-lg bg-muted/50 p-2 hover:bg-muted transition-colors">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white grid place-items-center text-xs font-semibold shrink-0">
              SA
            </div>
            <div className="flex-1 leading-tight min-w-0 text-left">
              <div className="text-xs font-medium truncate">Stefan Anders</div>
              <div className="text-[10px] text-muted-foreground truncate">Frachtwerk GmbH · Admin</div>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          <DropdownMenuLabel>Stefan Anders</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push("/help")}>
            <User className="h-3.5 w-3.5" /> Mein Profil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/workflows")}>
            <Gauge className="h-3.5 w-3.5" /> Mein Dashboard
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Einstellungen</DropdownMenuLabel>
          <DropdownMenuItem onClick={toggleDark}>
            {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {dark ? "Light Mode" : "Dark Mode"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleSound}>
            {sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Notification-Ping: {sound ? "an" : "aus"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/help")}>
            <HelpCircle className="h-3.5 w-3.5" /> Keyboard-Shortcuts
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/help")}>
            <KeyRound className="h-3.5 w-3.5" /> API-Keys & Integrationen
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <LogOut className="h-3.5 w-3.5" /> Abmelden
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SidebarGroup({ label, items, pathname }: { label: string; items: Item[]; pathname: string }) {
  return (
    <div>
      <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <ul className="space-y-0.5">
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                <span className="flex-1 truncate">{it.label}</span>
                {it.badge && (
                  <Badge variant={it.badgeVariant ?? "muted"} className="text-[10px] py-0 px-1.5 h-4">
                    {it.badge}
                  </Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
