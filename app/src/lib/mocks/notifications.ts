import { db } from "@/lib/db";

export async function sendSlack(channel: string, body: string, shipmentId?: string) {
  await db.notificationLog.create({ data: { channel: "slack", to: channel, body, shipmentId } });
}

export async function sendEmail(to: string, subject: string, body: string, shipmentId?: string) {
  await db.notificationLog.create({ data: { channel: "email", to, subject, body, shipmentId } });
}

export async function notify(input: {
  level: "info" | "success" | "warning" | "critical";
  title: string;
  body?: string;
  shipmentId?: string;
  href?: string;
}) {
  await db.notification.create({ data: input });
}
