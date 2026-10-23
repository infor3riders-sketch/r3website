import { SettingForm } from "@/components/portal/admin-forms";
import { SETTING_DEFS } from "@/lib/settings-schema";
import { DEFAULT_SETTINGS } from "@/lib/site-defaults";
import { getSettingValues } from "@/server/queries/admin";

export const metadata = { title: "Site content & settings" };

export default async function AdminSettingsPage() {
  const stored = await getSettingValues();
  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Site content &amp; settings</h1>
        <p className="text-sm text-muted">What you save here appears on the public website within a few minutes. Anything you have not saved yet shows the built-in placeholder.</p>
      </header>
      <div className="space-y-3">
        {SETTING_DEFS.map((def) => {
          const value = def.key in stored ? stored[def.key] : (DEFAULT_SETTINGS as Record<string, unknown>)[def.key];
          return (
            <details key={def.key} className="rounded-lg border border-line bg-panel p-5">
              <summary className="min-h-11 cursor-pointer">
                <span className="text-lg font-semibold uppercase text-gold">{def.title}</span>
                <span className="ml-3 text-xs text-muted">
                  {def.key in stored ? "saved" : "placeholder"}
                  {def.isPublic ? "" : " · private"}
                </span>
              </summary>
              <p className="mb-4 mt-2 text-sm text-muted">{def.description}</p>
              <SettingForm settingKey={def.key} fields={def.fields} values={def.format(value)} />
            </details>
          );
        })}
      </div>
    </div>
  );
}
