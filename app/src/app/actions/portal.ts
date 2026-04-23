"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notify } from "@/lib/mocks/notifications";
import { lookupRates } from "@/lib/mocks/rates";
import type { TransportMode } from "@prisma/client";

export async function requestQuoteFromPortal(input: {
  customerId: string;
  mode: "AIR" | "OCEAN";
  origin: string;
  destination: string;
  description: string;
}) {
  const rates = await lookupRates(input.origin, input.destination, input.mode, 2500, 12);
  const best = rates[0];
  const count = await db.quote.count();
  const ref = `Q-2026-${String(200 + count).padStart(4, "0")}`;
  const q = await db.quote.create({
    data: {
      ref,
      status: "OPEN",
      mode: input.mode as TransportMode,
      origin: input.origin,
      destination: input.destination,
      incoterm: "FOB",
      validUntil: new Date(Date.now() + 14 * 86400 * 1000),
      totalUsd: best?.totalUsd ?? 4500,
      customerId: input.customerId,
      linesJson: {
        lines: [
          { label: `${input.mode === "AIR" ? "Air" : "Ocean"} base freight`, usd: Math.round((best?.totalUsd ?? 4500) * 0.72) },
          { label: "Surcharges", usd: Math.round((best?.totalUsd ?? 4500) * 0.18) },
          { label: "Documentation", usd: Math.round((best?.totalUsd ?? 4500) * 0.1) },
        ],
        carrier: best?.carrier ?? "Maersk",
        transitDays: best?.transitDays ?? 25,
        weightKg: 2500,
        volumeM3: 12,
        fromPortal: true,
        description: input.description,
      },
    },
  });
  await notify({
    level: "info",
    title: `Portal-Anfrage: ${ref}`,
    body: `${input.origin} → ${input.destination} · ${input.mode} · „${input.description.slice(0, 80)}"`,
    href: `/quotes/${q.id}`,
  });
  revalidatePath("/portal");
  revalidatePath("/quotes");
  return { ok: true, ref, id: q.id };
}
