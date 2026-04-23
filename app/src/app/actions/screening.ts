"use server";
import { screenParty } from "@/lib/mocks/sanctions";

export async function runScreening(name: string, country?: string) {
  return screenParty(name, country);
}
