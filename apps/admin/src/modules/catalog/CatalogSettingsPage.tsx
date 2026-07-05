import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Save, SlidersHorizontal, Wand2 } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Label } from "@repo/ui/components/ui/label";
import { Slider } from "@repo/ui/components/ui/slider";
import { Switch } from "@repo/ui/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { StateLayout } from "@/core/ui/StateLayout";
import { useAdminMutation } from "@/core/data/mutate";
import { updateWhere, logAdminAction } from "@/core/data/resource";
import { keys } from "@/core/data/keys";
import { suggestSettings, useSmartSettings } from "./api";
import { FACTOR_LABELS, normalizeWeights } from "./lib";
import { type SmartSettings, type SuggestedSettings } from "./types";

interface SettingsDraft {
  auto_must_sell_detection: boolean;
  auto_priority_update: boolean;
  auto_clearance_detection: boolean;
  require_manual_approval: boolean;
  ranking_strategy: "suggested" | "custom";
  factors: Record<string, number>;
  cutoffs: Record<string, number>;
}

function toDraft(s: SmartSettings): SettingsDraft {
  const suggested = s.suggested_weights;
  return {
    auto_must_sell_detection: s.auto_must_sell_detection,
    auto_priority_update: s.auto_priority_update,
    auto_clearance_detection: s.auto_clearance_detection,
    require_manual_approval: s.require_manual_approval,
    ranking_strategy: s.ranking_strategy,
    factors: s.weights?.factors ?? suggested?.factors ?? {},
    cutoffs: s.weights?.cutoffs ?? suggested?.cutoffs ?? {},
  };
}

/**
 * Smart Settings: automation toggles + ranking strategy. The system never
 * ships hardcoded weights — "Suggested" mode recalculates them from live data
 * every run; "Custom" lets the admin pin their own, seeded from the
 * suggestion so overrides start from something data-backed.
 */
export default function CatalogSettingsPage() {
  const settingsQuery = useSmartSettings();
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestedSettings | null>(null);

  useEffect(() => {
    if (settingsQuery.data && !draft) {
      setDraft(toDraft(settingsQuery.data));
      setSuggestion(settingsQuery.data.suggested_weights);
    }
  }, [settingsQuery.data, draft]);

  const suggest = useAdminMutation(suggestSettings, {
    invalidate: [keys.catalogSettings.all as unknown as string[]],
    successMessage: (s) => `Analyzed ${s.sample_size} products — suggestion refreshed`,
    onSuccess: (s) => setSuggestion(s),
  });

  const save = useAdminMutation<SettingsDraft, void>(
    async (d) => {
      const record = {
        auto_must_sell_detection: d.auto_must_sell_detection,
        auto_priority_update: d.auto_priority_update,
        auto_clearance_detection: d.auto_clearance_detection,
        require_manual_approval: d.require_manual_approval,
        ranking_strategy: d.ranking_strategy,
        weights:
          d.ranking_strategy === "custom"
            ? { factors: normalizeWeights(d.factors), cutoffs: d.cutoffs }
            : null,
        updated_at: new Date().toISOString(),
      };
      await updateWhere("product_smart_settings", { id: 1 }, record);
      await logAdminAction({
        action: "product_smart_settings_updated",
        entityType: "product_smart_settings",
        entityId: "1",
        newValue: record,
      });
    },
    { invalidate: [keys.catalogSettings.all as unknown as string[]], successMessage: "Settings saved" },
  );

  if (!draft) {
    return (
      <div className="space-y-5">
        <PageHeader title="Smart Settings" icon={SlidersHorizontal} />
        <StateLayout isLoading={settingsQuery.isLoading} isError={settingsQuery.isError} onRetry={() => settingsQuery.refetch()}>
          <></>
        </StateLayout>
      </div>
    );
  }

  const set = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const applySuggestion = () => {
    if (!suggestion) return;
    setDraft((d) =>
      d
        ? {
            ...d,
            factors: suggestion.factors ?? d.factors,
            cutoffs: suggestion.cutoffs ?? d.cutoffs,
            auto_must_sell_detection: suggestion.suggest_auto_must_sell ?? d.auto_must_sell_detection,
            auto_clearance_detection: suggestion.suggest_auto_clearance ?? d.auto_clearance_detection,
            auto_priority_update: suggestion.suggest_auto_priority ?? d.auto_priority_update,
          }
        : d,
    );
  };

  const toggles: { key: keyof SettingsDraft; label: string; hint: string }[] = [
    { key: "auto_must_sell_detection", label: "Auto must-sell detection", hint: "Engine may flag/unflag must-sell (auto-sourced flags only)." },
    { key: "auto_priority_update", label: "Auto priority update", hint: "Engine writes score-derived priority on each run." },
    { key: "auto_clearance_detection", label: "Auto clearance detection", hint: "Overstocked low-margin products move to clearance." },
    { key: "require_manual_approval", label: "Require manual approval", hint: "When on, everything lands as a pending recommendation — nothing is applied automatically." },
  ];

  const factorKeys = Object.keys({ ...FACTOR_LABELS, ...draft.factors });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Smart Settings"
        description="Automation behavior and ranking strategy. Weights and cutoffs are suggested from your actual catalog data — never hardcoded."
        icon={SlidersHorizontal}
        actions={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => suggest.mutate()} disabled={suggest.isPending}>
              <Wand2 className="mr-2 h-4 w-4" />
              {suggest.isPending ? "Analyzing…" : "Suggest from data"}
            </Button>
            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => save.mutate(draft)} disabled={save.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save settings
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Automation</CardTitle>
            <CardDescription>What the engine is allowed to do on its own.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {toggles.map((t) => (
              <div key={t.key} className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium">{t.label}</Label>
                  <p className="text-xs text-slate-500">{t.hint}</p>
                </div>
                <Switch
                  checked={Boolean(draft[t.key])}
                  onCheckedChange={(v) => set(t.key, v as SettingsDraft[typeof t.key])}
                />
              </div>
            ))}
            {!draft.require_manual_approval &&
              (draft.auto_must_sell_detection || draft.auto_clearance_detection || draft.auto_priority_update) && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Auto-apply mode is active: enabled automations change products without approval (pinned and
                  excluded products are always protected). Every change is written to the automation log.
                </p>
              )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System suggestion</CardTitle>
            <CardDescription>
              {settingsQuery.data?.suggested_at
                ? `Last analyzed ${format(new Date(settingsQuery.data.suggested_at), "MMM dd, yyyy HH:mm")}`
                : "Run “Suggest from data” to analyze the catalog."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestion ? (
              <>
                <div className="space-y-1.5">
                  {Object.entries(suggestion.factors ?? {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([factor, weight]) => (
                      <div key={factor} className="flex items-center gap-2 text-sm">
                        <span className="w-52 shrink-0 text-slate-600">{FACTOR_LABELS[factor] ?? factor}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round(weight * 100)}%` }} />
                        </div>
                        <span className="w-10 text-right text-xs text-slate-500">{Math.round(weight * 100)}%</span>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-slate-500">
                  Weights reflect data coverage × discrimination across {suggestion.sample_size} products. Factors
                  without data get no weight until data arrives.
                </p>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={applySuggestion}>
                  Apply suggestion to draft
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-500">No suggestion computed yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ranking strategy</CardTitle>
          <CardDescription>
            “Suggested” recalculates weights from live data on every run. “Custom” pins your own weighting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="max-w-xs">
            <Select value={draft.ranking_strategy} onValueChange={(v) => set("ranking_strategy", v as "suggested" | "custom")}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suggested">Suggested (data-driven, self-updating)</SelectItem>
                <SelectItem value="custom">Custom (pin my weights)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {draft.ranking_strategy === "custom" && (
            <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
              {factorKeys.map((factor) => (
                <div key={factor} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <Label>{FACTOR_LABELS[factor] ?? factor}</Label>
                    <span className="text-xs text-slate-500">{Math.round((draft.factors[factor] ?? 0) * 100)}</span>
                  </div>
                  <Slider
                    value={[Math.round((draft.factors[factor] ?? 0) * 100)]}
                    max={100}
                    step={1}
                    onValueChange={([v]) => set("factors", { ...draft.factors, [factor]: v / 100 })}
                  />
                </div>
              ))}
              <p className="text-xs text-slate-500 lg:col-span-2">
                Weights are normalized to sum to 100% when saved. Tier cutoffs (must-sell / high-priority / hidden
                percentiles) stay data-suggested unless edited here:{" "}
                {Object.entries(draft.cutoffs).map(([k, v]) => `${k}=${v}`).join(" · ") || "none set"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
