import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; variant: "success" | "warning" | "info" | "destructive" | "muted" | "secondary" }> = {
  QUOTED: { label: "Angebot", variant: "muted" },
  BOOKED: { label: "Gebucht", variant: "info" },
  IN_TRANSIT: { label: "Unterwegs", variant: "info" },
  AT_DESTINATION: { label: "Zielankunft", variant: "secondary" },
  CUSTOMS_CLEARANCE: { label: "Zoll", variant: "warning" },
  DELIVERED: { label: "Zugestellt", variant: "success" },
  EXCEPTION: { label: "Exception", variant: "destructive" },
  CANCELLED: { label: "Storniert", variant: "muted" },
};

export function StatusChip({ status }: { status: string }) {
  const m = MAP[status] ?? { label: status, variant: "muted" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
