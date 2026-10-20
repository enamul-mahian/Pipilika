import { getSettings } from "@/lib/settings";
import { SettingsEditor } from "@/components/admin-settings";

export default async function Settings() {
  return <SettingsEditor initial={await getSettings()} />;
}
