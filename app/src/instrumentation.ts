export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureTickRunnerStarted } = await import("@/lib/tick-runner");
    ensureTickRunnerStarted();
  }
}
