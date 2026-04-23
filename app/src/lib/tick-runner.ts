import { runTick } from "./tick";

let started = false;

// Singleton: only start one interval per Node process.
export function ensureTickRunnerStarted() {
  if (started) return;
  if (process.env.DISABLE_WORLD_TICK === "1") return;
  started = true;

  const interval = Number(process.env.WORLD_TICK_INTERVAL_MS ?? 15000);
  console.log(`[world-clock] tick runner started @ ${interval}ms`);

  const run = async () => {
    try {
      const r = await runTick();
      if (r.milestonesFired + r.statusChanges + r.delaysAdded > 0) {
        console.log(`[world-clock] tick vnow=${r.virtualNow} ms=${r.milestonesFired} status=${r.statusChanges} delays=${r.delaysAdded}`);
      }
    } catch (e) {
      console.error("[world-clock] tick failed:", e instanceof Error ? e.message : e);
    }
  };

  setTimeout(run, 2000); // first tick shortly after boot
  setInterval(run, interval);
}
