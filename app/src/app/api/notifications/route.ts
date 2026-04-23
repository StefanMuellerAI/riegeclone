import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const [items, unread] = await Promise.all([
    db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    db.notification.count({ where: { readAt: null } }),
  ]);
  return NextResponse.json({ items, unread });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === "read_all") {
    await db.notification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
  } else if (body.action === "read" && body.id) {
    await db.notification.update({ where: { id: body.id }, data: { readAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
