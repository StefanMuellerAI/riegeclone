"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { submitCbam } from "@/lib/mocks/customs";
import { notify } from "@/lib/mocks/notifications";

export async function generateCbamReport(period: string) {
  const existing = await db.cbamReport.findFirst({ where: { period } });
  if (existing) {
    await db.cbamReport.update({ where: { id: existing.id }, data: { status: "READY_TO_SUBMIT" } });
    revalidatePath("/cbam");
    return { ok: true, id: existing.id };
  }
  const r = await db.cbamReport.create({
    data: {
      period,
      status: "READY_TO_SUBMIT",
      cnCodes: ["7208.39", "7208.51", "7304.19"],
      totalEmbeddedEmissionsT: 40 + Math.random() * 50,
    },
  });
  await notify({ level: "info", title: `CBAM-Report ${period} generiert`, body: "Bereit zur Einreichung bei DEHSt", href: "/cbam" });
  revalidatePath("/cbam");
  return { ok: true, id: r.id };
}

export async function submitCbamReport(id: string) {
  const r = await db.cbamReport.findUnique({ where: { id } });
  if (!r) return { ok: false };
  const res = await submitCbam(r.period);
  await db.cbamReport.update({ where: { id }, data: { status: "SUBMITTED", submittedAt: new Date() } });
  await notify({ level: "success", title: `CBAM ${r.period} eingereicht`, body: `DEHSt-Referenz: ${res.mrn}`, href: "/cbam" });
  revalidatePath("/cbam");
  return { ok: true, ref: res.mrn };
}
