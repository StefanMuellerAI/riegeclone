import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { CopilotDock } from "@/components/copilot-dock";
import { CommandPalette } from "@/components/command-palette";
import { LiveRefresh } from "@/components/live-refresh";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CopilotDock />
      <CommandPalette />
      <LiveRefresh />
    </div>
  );
}
