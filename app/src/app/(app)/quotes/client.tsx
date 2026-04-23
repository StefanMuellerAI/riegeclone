"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { QuoteCreateDialog } from "@/components/quote-create-dialog";

type Customer = { id: string; name: string };

export function QuotesHeader({ count, conversion, customers }: { count: number; conversion: number; customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Angebote</h1>
          <p className="text-sm text-muted-foreground">{count} Angebote · Conversion Rate {conversion}%</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/copilot?q=erstelle+ein+angebot">
              <Sparkles className="h-4 w-4" /> AI-Quote
            </Link>
          </Button>
          <Button variant="gradient" size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Neues Angebot
          </Button>
        </div>
      </div>
      <QuoteCreateDialog open={open} onOpenChange={setOpen} customers={customers} />
    </>
  );
}
