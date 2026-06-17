import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, ToggleLeft } from "lucide-react";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Switch } from "@repo/ui/components/ui/switch";
import { PageHeader } from "@/core/ui/PageHeader";
import { StateLayout } from "@/core/ui/StateLayout";
import { RequireRole, useHasRole } from "@/core/auth/RequireRole";
import { useAdminMutation } from "@/core/data/mutate";
import { list, updateWhere, logAdminAction } from "@/core/data/resource";
import { keys } from "@/core/data/keys";

const KILL_SWITCHES = [
  { key: "global_auto_fulfillment_enabled", label: "Auto-fulfillment", description: "Master switch for auto-ordering." },
  { key: "ebay_sync_enabled", label: "eBay order sync", description: "Background extension order syncing." },
];

interface SettingRow { key: string; value: string | null }
interface FlagRow { key: string; enabled: boolean; description: string | null; rollout_percentage: number }

function Row({ label, description, checked, disabled, onToggle }: { label: string; description?: string | null; checked: boolean; disabled?: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onToggle} />
    </div>
  );
}

/** Runtime kill switches (super-admin) + extension feature flags. No deploy needed. */
export default function FeatureFlagsPage() {
  const canEditSwitches = useHasRole("super_admin");

  const settings = useQuery({
    queryKey: keys.featureFlags.list({ kind: "settings" }),
    queryFn: async () => {
      const { rows } = await list<SettingRow>("admin_settings", { select: "key, value" });
      return rows;
    },
  });

  const flags = useQuery({
    queryKey: keys.featureFlags.list({ kind: "flags" }),
    queryFn: async () => {
      const { rows } = await list<FlagRow>("app_feature_flags", {
        select: "key, enabled, description, rollout_percentage",
        order: { column: "key", ascending: true },
      });
      return rows;
    },
  });

  const toggleSetting = useAdminMutation<{ key: string; on: boolean }, unknown>(
    async ({ key, on }) => {
      await updateWhere("admin_settings", { key }, { value: String(on) });
      await logAdminAction({ action: "kill_switch_toggled", entityType: "admin_settings", entityId: key, newValue: on });
    },
    { invalidate: [keys.featureFlags.all], successMessage: "Setting updated" },
  );

  const toggleFlag = useAdminMutation<{ key: string; on: boolean }, unknown>(
    async ({ key, on }) => {
      await updateWhere("app_feature_flags", { key }, { enabled: on });
      await logAdminAction({ action: "feature_flag_toggled", entityType: "app_feature_flags", entityId: key, newValue: on });
    },
    { invalidate: [keys.featureFlags.all], successMessage: "Flag updated" },
  );

  const settingOn = (key: string) => settings.data?.find((s) => s.key === key)?.value === "true";

  return (
    <div className="space-y-5">
      <PageHeader title="Feature Flags" description="Emergency kill switches and extension feature flags — runtime, no deploy." icon={ToggleLeft} />

      <Card className="rounded-2xl border-slate-200">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldAlert className="h-4 w-4 text-amber-500" /> Kill switches
            {!canEditSwitches && <span className="text-xs font-normal text-slate-500">(super-admin only)</span>}
          </div>
          <StateLayout isLoading={settings.isLoading} isError={settings.isError} onRetry={() => settings.refetch()} loading={<div className="h-24 animate-pulse rounded-lg bg-slate-100" />}>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {KILL_SWITCHES.map((ks) => (
                <Row
                  key={ks.key}
                  label={ks.label}
                  description={ks.description}
                  checked={settingOn(ks.key)}
                  disabled={!canEditSwitches || toggleSetting.isPending}
                  onToggle={(on) => toggleSetting.mutate({ key: ks.key, on })}
                />
              ))}
            </div>
          </StateLayout>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200">
        <CardContent className="p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">Extension feature flags</p>
          <StateLayout
            isLoading={flags.isLoading}
            isError={flags.isError}
            isEmpty={(flags.data ?? []).length === 0}
            onRetry={() => flags.refetch()}
            emptyTitle="No feature flags"
            loading={<div className="h-24 animate-pulse rounded-lg bg-slate-100" />}
          >
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {(flags.data ?? []).map((f) => (
                <Row
                  key={f.key}
                  label={f.key}
                  description={f.description}
                  checked={f.enabled}
                  disabled={toggleFlag.isPending}
                  onToggle={(on) => toggleFlag.mutate({ key: f.key, on })}
                />
              ))}
            </div>
          </StateLayout>
        </CardContent>
      </Card>
    </div>
  );
}
