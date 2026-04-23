import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ items: [] });

  const like = { contains: q, mode: "insensitive" as const };

  const [ships, quotes, customers] = await Promise.all([
    db.shipment.findMany({
      where: {
        OR: [
          { ref: like },
          { mawb: like },
          { hbl: like },
          { carrier: like },
          { commodity: like },
          { vessel: like },
        ],
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),
    db.quote.findMany({
      where: { OR: [{ ref: like }] },
      take: 4,
      include: { customer: true },
    }),
    db.customer.findMany({ where: { name: like }, take: 4 }),
  ]);

  const items = [
    ...ships.map((s) => ({
      id: s.id,
      type: "shipment",
      title: `${s.ref} · ${s.originCode} → ${s.destCode}`,
      subtitle: `${s.mode} · ${s.carrier}${s.customer ? " · " + s.customer.name : ""}`,
      href: `/shipments/${s.id}`,
    })),
    ...quotes.map((q) => ({
      id: q.id,
      type: "quote",
      title: `${q.ref}`,
      subtitle: `${q.mode} · ${q.origin} → ${q.destination}${q.customer ? " · " + q.customer.name : ""}`,
      href: `/quotes/${q.id}`,
    })),
    ...customers.map((c) => ({
      id: c.id,
      type: "customer",
      title: c.name,
      subtitle: "Kunde",
      href: `/partners`,
    })),
  ];
  return NextResponse.json({ items });
}
