"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HelpCircle, Plus, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationDrawer } from "@/components/notification-drawer";
import { WorldClockWidget } from "@/components/world-clock-widget";
import { NewShipmentDialog } from "@/components/new-shipment-dialog";
import { MobileSidebarTrigger } from "@/components/mobile-sidebar";

export function TopBar() {
  const [openCmd, setOpenCmd] = useState(false);
  const [openNewShipment, setOpenNewShipment] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const ev = new CustomEvent("open-command-palette");
        window.dispatchEvent(ev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setOpenNewShipment(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  function triggerCmd() {
    const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
    window.dispatchEvent(ev);
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/85 backdrop-blur px-4 lg:px-6">
        <MobileSidebarTrigger />
        <button
          onClick={triggerCmd}
          className="relative w-full max-w-md text-left inline-flex items-center gap-2 rounded-md border bg-background h-9 px-2.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <Search className="h-4 w-4" />
          Sendung, MAWB, Container, Partner…
          <span className="ml-auto flex items-center gap-1">
            <span className="kbd">⌘</span><span className="kbd">K</span>
          </span>
        </button>
        <div className="flex-1" />
        <WorldClockWidget />
        <Badge variant="warning" className="hidden lg:inline-flex">Early Demo · Prototyp</Badge>
        <Button size="sm" variant="gradient" className="gap-1.5" onClick={() => setOpenNewShipment(true)}>
          <Plus className="h-4 w-4" /> Neue Sendung
        </Button>
        <NotificationDrawer />
        <Button size="icon" variant="ghost" asChild>
          <Link href="/help" aria-label="Hilfe"><HelpCircle className="h-4 w-4" /></Link>
        </Button>
      </header>
      <NewShipmentDialog open={openNewShipment} onOpenChange={setOpenNewShipment} />
    </>
  );
}
