"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex lg:hidden h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
        aria-label="Menü öffnen"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[58] bg-black/50 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className={cn(
              "absolute left-0 top-0 h-full w-64 bg-card shadow-2xl transition-transform duration-200",
              open ? "translate-x-0" : "-translate-x-full"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 z-10 h-8 w-8 grid place-items-center rounded-md hover:bg-muted"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Force the sidebar to show on mobile inside this drawer */}
            <div className="h-full [&>aside]:flex [&>aside]:h-full [&>aside]:w-full [&>aside]:border-r-0">
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
