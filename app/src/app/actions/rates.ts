"use server";
import { lookupRates } from "@/lib/mocks/rates";

export async function fetchRates(origin: string, destination: string, mode: "AIR" | "OCEAN", weightKg: number, volumeM3 = 1) {
  return lookupRates(origin, destination, mode, weightKg, volumeM3);
}
