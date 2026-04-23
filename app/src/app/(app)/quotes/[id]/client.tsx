"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Send, X, Loader2, ArrowRight } from "lucide-react";
import { sendQuote, acceptQuoteAndCreateShipment, declineQuote } from "@/app/actions/quotes";

export function QuoteActions({ id, status, shipmentId }: { id: string; status: string; shipmentId: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function doSend() {
    start(async () => {
      await sendQuote(id);
      toast.success("Angebot versandt", { description: "Kunde hat Email + PDF erhalten" });
      router.refresh();
    });
  }

  function doAccept() {
    start(async () => {
      const r = await acceptQuoteAndCreateShipment(id);
      if (r.ok && r.shipmentId) {
        toast.success(`Angenommen → Sendung ${r.shipmentRef}`, {
          action: { label: "Öffnen", onClick: () => router.push(`/shipments/${r.shipmentId}`) },
        });
        router.push(`/shipments/${r.shipmentId}`);
      }
    });
  }

  function doDecline() {
    start(async () => {
      await declineQuote(id);
      toast("Angebot abgelehnt");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status === "OPEN" && (
        <>
          <Button variant="outline" size="sm" onClick={doSend} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Versenden
          </Button>
          <Button variant="gradient" size="sm" onClick={doAccept} disabled={pending}>
            <Check className="h-4 w-4" /> Annehmen → Sendung
          </Button>
          <Button variant="ghost" size="sm" onClick={doDecline} disabled={pending}>
            <X className="h-4 w-4" /> Ablehnen
          </Button>
        </>
      )}
      {status === "SENT" && (
        <>
          <Button variant="gradient" size="sm" onClick={doAccept} disabled={pending}>
            <Check className="h-4 w-4" /> Annehmen → Sendung
          </Button>
          <Button variant="outline" size="sm" onClick={doDecline} disabled={pending}>
            <X className="h-4 w-4" /> Ablehnen
          </Button>
        </>
      )}
      {status === "ACCEPTED" && shipmentId && (
        <Button variant="outline" size="sm" onClick={() => router.push(`/shipments/${shipmentId}`)}>
          Zur Sendung <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
