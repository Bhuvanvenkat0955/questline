// Next.js runs register() once when Questline's server starts.
// If screen-time tracking was on when Questline last closed, it carries on.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { resumeTracking } = await import("@/lib/tracker/tracker");
    resumeTracking();
  }
}
