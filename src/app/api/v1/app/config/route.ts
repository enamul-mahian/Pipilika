import { getSettings } from "@/lib/settings";
import { ok } from "@/lib/api";
/** Mobile app bootstrap: version policy + feature flags. */
export async function GET() {
  const s = await getSettings();
  return ok({ apiVersion: "v1", minAppVersion: s.app.minVersion, latestAppVersion: s.app.latestVersion, forceUpdate: s.app.forceUpdate, features: s.features, store: s.store, payments: Object.fromEntries(Object.entries(s.payments.methods).filter(([, m]) => m.enabled)) });
}
