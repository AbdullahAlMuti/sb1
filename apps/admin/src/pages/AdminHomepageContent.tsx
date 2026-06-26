/**
 * AdminHomepageContent
 *
 * Edits the `homepage_content` table (scope='global').
 * Writes go through browser→Postgres; RBAC is enforced server-side by
 * the `homepage_content_admin_write` RLS policy (`is_admin(auth.uid())`).
 * Reads fall back to hardcoded defaults on empty DB.
 */
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { Label } from "@repo/ui/components/ui/label";
import { Badge } from "@repo/ui/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@repo/api-client/supabase/client";
import { Save, RefreshCw, Plus, Trash2, ArrowUp, ArrowDown, Globe } from "lucide-react";
import type {
  HomepageContent,
  HpNavMegaDrop,
  HpNavMegaGroup,
  HpNavMegaItem,
  HpUseCaseCard,
  HpBenefitItem,
  HpFeatureBlock,
  HpFeatureBullet,
  HpTrustBadge,
  HpCommunityChannel,
  HpFooterColumn,
  HpFooterSocial,
  HpFooterBadge,
} from "@repo/types";

// ── Defaults ────────────────────────────────────────────────────────────────
// Minimal shape so state is never undefined.
const EMPTY: HomepageContent = {
  announcement: { message: "", link: { label: "", href: "" }, accentColors: [] },
  nav: { links: [], megaDrops: [], loginCta: { label: "", href: "" }, primaryCta: { label: "", href: "" } },
  hero: { eyebrow: "", titleLead: "", titleHighlight: "", subtitle: "", primaryCta: { label: "", href: "" }, secondaryCta: { label: "", href: "" }, stats: [] },
  logo_cloud: { heading: "", logos: [] },
  use_cases: { eyebrow: "", heading: "", intro: "", cards: [] },
  benefits: { eyebrow: "", heading: "", intro: "", items: [] },
  features: { eyebrow: "", heading: "", intro: "", blocks: [] },
  trust: { eyebrow: "", heading: "", paragraph: "", badges: [] },
  mission: { eyebrow: "", heading: "", paragraph: "", cta: { label: "", href: "" } },
  community: { eyebrow: "", heading: "", intro: "", channels: [] },
  final_cta: { heading: "", primaryCta: { label: "", href: "" }, secondaryCta: { label: "", href: "" } },
  footer: { tagline: "", columns: [], badges: [], social: [], copyright: "" },
};

// ── Helper: small field editor ───────────────────────────────────────────────
function Field({ label, value, onChange, multiline = false, mono = false, className = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; mono?: boolean; className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
          className={`resize-none text-sm ${mono ? "font-mono text-xs" : ""}`} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)}
          className={`text-sm ${mono ? "font-mono" : ""}`} />
      )}
    </div>
  );
}

// ── Reorder helpers ──────────────────────────────────────────────────────────
function move<T>(arr: T[], i: number, dir: "up" | "down"): T[] {
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminHomepageContent() {
  const [content, setContent] = useState<HomepageContent>(EMPTY);
  const [version, setVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("homepage_content")
        .select("content, version")
        .eq("scope", "global")
        .maybeSingle();
      if (error) throw error;
      if (data?.content) {
        setContent(data.content as HomepageContent);
        setVersion(data.version ?? 1);
      } else {
        toast.info("No homepage content found — showing defaults. Save to create the record.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load homepage content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("homepage_content")
        .upsert(
          { scope: "global", content, version: version + 1, updated_at: new Date().toISOString() },
          { onConflict: "scope" }
        );
      if (error) throw error;
      setVersion((v) => v + 1);
      toast.success("Homepage content saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── Typed updaters ────────────────────────────────────────────────────────
  const patch = <K extends keyof HomepageContent>(section: K, value: HomepageContent[K]) =>
    setContent((prev) => ({ ...prev, [section]: value }));

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading homepage content…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
            <Globe className="h-7 w-7 text-primary" />
            Homepage Content
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit all copy, CTAs, and section data served to the public marketing homepage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-950/20 dark:text-blue-400">
            v{version}
          </Badge>
          <Button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 font-medium text-white shadow-md hover:from-blue-600 hover:to-blue-700">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="announcement" className="space-y-6">
        <TabsList className="flex-wrap gap-1 rounded-lg border border-border bg-muted p-1">
          {[
            ["announcement", "Announcement"],
            ["nav",          "Navigation"],
            ["hero",         "Hero"],
            ["logo_cloud",   "Logo Cloud"],
            ["use_cases",    "Use Cases"],
            ["benefits",     "Benefits"],
            ["features",     "Features"],
            ["trust",        "Trust"],
            ["mission",      "Mission"],
            ["community",    "Community"],
            ["final_cta",    "Final CTA"],
            ["footer",       "Footer"],
          ].map(([v, label]) => (
            <TabsTrigger key={v} value={v} className="rounded-md px-3 py-1.5 text-xs font-medium">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Announcement ────────────────────────────────────────────────── */}
        <TabsContent value="announcement">
          <Card>
            <CardHeader>
              <CardTitle>Announcement Bar</CardTitle>
              <CardDescription>
                The full-width banner shown above the nav. Dismiss/visibility logic is controlled
                separately by <code>themeConfig.seasonalCampaign</code> — only the copy and link are edited here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Message" value={content.announcement.message}
                onChange={(v) => patch("announcement", { ...content.announcement, message: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Link label" value={content.announcement.link.label}
                  onChange={(v) => patch("announcement", { ...content.announcement, link: { ...content.announcement.link, label: v } })} />
                <Field label="Link href" value={content.announcement.link.href}
                  onChange={(v) => patch("announcement", { ...content.announcement, link: { ...content.announcement.link, href: v } })} />
              </div>
              <Field label="Accent colors (comma-separated CSS values)"
                value={content.announcement.accentColors.join(", ")}
                onChange={(v) => patch("announcement", { ...content.announcement, accentColors: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <TabsContent value="nav">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Simple Links</CardTitle><CardDescription>Flat nav links (non-dropdown).</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {content.nav.links.map((link, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <Field label="Label" value={link.label} onChange={(v) => {
                      const links = [...content.nav.links]; links[i] = { ...links[i], label: v };
                      patch("nav", { ...content.nav, links });
                    }} />
                    <Field label="Href" value={link.href} onChange={(v) => {
                      const links = [...content.nav.links]; links[i] = { ...links[i], href: v };
                      patch("nav", { ...content.nav, links });
                    }} />
                    <Button variant="ghost" size="icon" className="mb-0.5 text-destructive"
                      onClick={() => patch("nav", { ...content.nav, links: content.nav.links.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => patch("nav", { ...content.nav, links: [...content.nav.links, { label: "", href: "" }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add link
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>CTAs</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Login CTA</p>
                  <Field label="Label" value={content.nav.loginCta.label} onChange={(v) => patch("nav", { ...content.nav, loginCta: { ...content.nav.loginCta, label: v } })} />
                  <Field label="Href"  value={content.nav.loginCta.href}  onChange={(v) => patch("nav", { ...content.nav, loginCta: { ...content.nav.loginCta, href: v } })} />
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Primary CTA</p>
                  <Field label="Label" value={content.nav.primaryCta.label} onChange={(v) => patch("nav", { ...content.nav, primaryCta: { ...content.nav.primaryCta, label: v } })} />
                  <Field label="Href"  value={content.nav.primaryCta.href}  onChange={(v) => patch("nav", { ...content.nav, primaryCta: { ...content.nav.primaryCta, href: v } })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mega-menu Dropdowns</CardTitle>
                <CardDescription>Each dropdown has a label and one or more groups of items. Icon field uses a Lucide icon name (e.g. <code>ScanSearch</code>).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {content.nav.megaDrops.map((drop: HpNavMegaDrop, di) => (
                  <div key={di} className="rounded-lg border border-border p-4 space-y-4">
                    <div className="flex items-end gap-2">
                      <Field className="flex-1" label="Dropdown label" value={drop.label}
                        onChange={(v) => {
                          const drops = [...content.nav.megaDrops]; drops[di] = { ...drops[di], label: v };
                          patch("nav", { ...content.nav, megaDrops: drops });
                        }} />
                      <Button variant="ghost" size="icon" className="mb-0.5 text-destructive"
                        onClick={() => patch("nav", { ...content.nav, megaDrops: content.nav.megaDrops.filter((_, j) => j !== di) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {drop.groups.map((group: HpNavMegaGroup, gi) => (
                      <div key={gi} className="ml-4 space-y-3 border-l border-border pl-4">
                        <Field label="Group heading (optional)" value={group.heading ?? ""}
                          onChange={(v) => {
                            const drops = [...content.nav.megaDrops];
                            const groups = [...drop.groups];
                            groups[gi] = { ...groups[gi], heading: v };
                            drops[di] = { ...drops[di], groups };
                            patch("nav", { ...content.nav, megaDrops: drops });
                          }} />

                        {group.items.map((item: HpNavMegaItem, ii) => (
                          <div key={ii} className="grid grid-cols-2 gap-2">
                            <Field label="Icon" value={item.icon}
                              onChange={(v) => {
                                const drops = [...content.nav.megaDrops]; const groups = [...drop.groups];
                                const items = [...group.items]; items[ii] = { ...items[ii], icon: v };
                                groups[gi] = { ...groups[gi], items }; drops[di] = { ...drops[di], groups };
                                patch("nav", { ...content.nav, megaDrops: drops });
                              }} />
                            <Field label="Title" value={item.title}
                              onChange={(v) => {
                                const drops = [...content.nav.megaDrops]; const groups = [...drop.groups];
                                const items = [...group.items]; items[ii] = { ...items[ii], title: v };
                                groups[gi] = { ...groups[gi], items }; drops[di] = { ...drops[di], groups };
                                patch("nav", { ...content.nav, megaDrops: drops });
                              }} />
                            <Field label="Subtitle" value={item.subtitle}
                              onChange={(v) => {
                                const drops = [...content.nav.megaDrops]; const groups = [...drop.groups];
                                const items = [...group.items]; items[ii] = { ...items[ii], subtitle: v };
                                groups[gi] = { ...groups[gi], items }; drops[di] = { ...drops[di], groups };
                                patch("nav", { ...content.nav, megaDrops: drops });
                              }} />
                            <Field label="Href" value={item.href}
                              onChange={(v) => {
                                const drops = [...content.nav.megaDrops]; const groups = [...drop.groups];
                                const items = [...group.items]; items[ii] = { ...items[ii], href: v };
                                groups[gi] = { ...groups[gi], items }; drops[di] = { ...drops[di], groups };
                                patch("nav", { ...content.nav, megaDrops: drops });
                              }} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => patch("nav", { ...content.nav, megaDrops: [...content.nav.megaDrops, { label: "New dropdown", groups: [{ items: [] }] }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add dropdown
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <TabsContent value="hero">
          <Card>
            <CardHeader><CardTitle>Hero Section</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Eyebrow" value={content.hero.eyebrow} onChange={(v) => patch("hero", { ...content.hero, eyebrow: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title lead" value={content.hero.titleLead} onChange={(v) => patch("hero", { ...content.hero, titleLead: v })} />
                <Field label="Title highlight (gradient)" value={content.hero.titleHighlight} onChange={(v) => patch("hero", { ...content.hero, titleHighlight: v })} />
              </div>
              <Field label="Subtitle" value={content.hero.subtitle} multiline onChange={(v) => patch("hero", { ...content.hero, subtitle: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Primary CTA</p>
                  <Field label="Label" value={content.hero.primaryCta.label} onChange={(v) => patch("hero", { ...content.hero, primaryCta: { ...content.hero.primaryCta, label: v } })} />
                  <Field label="Href"  value={content.hero.primaryCta.href}  onChange={(v) => patch("hero", { ...content.hero, primaryCta: { ...content.hero.primaryCta, href: v } })} />
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Secondary CTA</p>
                  <Field label="Label" value={content.hero.secondaryCta.label} onChange={(v) => patch("hero", { ...content.hero, secondaryCta: { ...content.hero.secondaryCta, label: v } })} />
                  <Field label="Href"  value={content.hero.secondaryCta.href}  onChange={(v) => patch("hero", { ...content.hero, secondaryCta: { ...content.hero.secondaryCta, href: v } })} />
                </div>
              </div>
              <Field label="Hero image URL (optional)" value={content.hero.heroImageSrc ?? ""}
                onChange={(v) => patch("hero", { ...content.hero, heroImageSrc: v })} />
              <Field label="Hero image alt text" value={content.hero.heroImageAlt ?? ""}
                onChange={(v) => patch("hero", { ...content.hero, heroImageAlt: v })} />
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Stats</p>
                {content.hero.stats.map((stat, i) => (
                  <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
                    <Field label="Value" value={stat.value} onChange={(v) => {
                      const stats = [...content.hero.stats]; stats[i] = { ...stat, value: v };
                      patch("hero", { ...content.hero, stats });
                    }} />
                    <Field label="Label" value={stat.label} onChange={(v) => {
                      const stats = [...content.hero.stats]; stats[i] = { ...stat, label: v };
                      patch("hero", { ...content.hero, stats });
                    }} />
                    <Button variant="ghost" size="icon" className="mb-0.5 text-destructive"
                      onClick={() => patch("hero", { ...content.hero, stats: content.hero.stats.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => patch("hero", { ...content.hero, stats: [...content.hero.stats, { value: "", label: "" }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add stat
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Logo Cloud ──────────────────────────────────────────────────── */}
        <TabsContent value="logo_cloud">
          <Card>
            <CardHeader><CardTitle>Logo Cloud / Marquee</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Heading" value={content.logo_cloud.heading} onChange={(v) => patch("logo_cloud", { ...content.logo_cloud, heading: v })} />
              <Field label="Proof text (optional)" value={content.logo_cloud.proof ?? ""} onChange={(v) => patch("logo_cloud", { ...content.logo_cloud, proof: v })} />
              <div className="space-y-2">
                {content.logo_cloud.logos.map((logo, i) => (
                  <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
                    <Field label="Name" value={logo.name} onChange={(v) => {
                      const logos = [...content.logo_cloud.logos]; logos[i] = { ...logo, name: v };
                      patch("logo_cloud", { ...content.logo_cloud, logos });
                    }} />
                    <Field label="Image src" value={logo.src} onChange={(v) => {
                      const logos = [...content.logo_cloud.logos]; logos[i] = { ...logo, src: v };
                      patch("logo_cloud", { ...content.logo_cloud, logos });
                    }} />
                    <Button variant="ghost" size="icon" className="mb-0.5 text-destructive"
                      onClick={() => patch("logo_cloud", { ...content.logo_cloud, logos: content.logo_cloud.logos.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => patch("logo_cloud", { ...content.logo_cloud, logos: [...content.logo_cloud.logos, { name: "", src: "" }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add logo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Use Cases ───────────────────────────────────────────────────── */}
        <TabsContent value="use_cases">
          <Card>
            <CardHeader><CardTitle>Use Cases</CardTitle><CardDescription>4-card grid section.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Eyebrow" value={content.use_cases.eyebrow} onChange={(v) => patch("use_cases", { ...content.use_cases, eyebrow: v })} />
                <Field label="Heading" value={content.use_cases.heading} onChange={(v) => patch("use_cases", { ...content.use_cases, heading: v })} className="sm:col-span-2" />
              </div>
              <Field label="Intro" value={content.use_cases.intro} multiline onChange={(v) => patch("use_cases", { ...content.use_cases, intro: v })} />
              <div className="space-y-3">
                {content.use_cases.cards.map((card: HpUseCaseCard, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                      <Field label="Icon name" value={card.icon ?? ""} onChange={(v) => {
                        const cards = [...content.use_cases.cards]; cards[i] = { ...card, icon: v };
                        patch("use_cases", { ...content.use_cases, cards });
                      }} />
                      <Field label="Heading" value={card.heading} onChange={(v) => {
                        const cards = [...content.use_cases.cards]; cards[i] = { ...card, heading: v };
                        patch("use_cases", { ...content.use_cases, cards });
                      }} />
                      <Button variant="ghost" size="icon" className="mt-6 text-destructive"
                        onClick={() => patch("use_cases", { ...content.use_cases, cards: content.use_cases.cards.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Field label="Description" value={card.description} multiline onChange={(v) => {
                      const cards = [...content.use_cases.cards]; cards[i] = { ...card, description: v };
                      patch("use_cases", { ...content.use_cases, cards });
                    }} />
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => patch("use_cases", { ...content.use_cases, cards: [...content.use_cases.cards, { heading: "", description: "", icon: "" }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add card
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Benefits ────────────────────────────────────────────────────── */}
        <TabsContent value="benefits">
          <Card>
            <CardHeader><CardTitle>Benefits</CardTitle><CardDescription>4-item icon-and-label grid.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Eyebrow" value={content.benefits.eyebrow} onChange={(v) => patch("benefits", { ...content.benefits, eyebrow: v })} />
                <Field label="Heading" value={content.benefits.heading} onChange={(v) => patch("benefits", { ...content.benefits, heading: v })} className="sm:col-span-2" />
              </div>
              <Field label="Intro" value={content.benefits.intro} multiline onChange={(v) => patch("benefits", { ...content.benefits, intro: v })} />
              <div className="space-y-2">
                {content.benefits.items.map((item: HpBenefitItem, i) => (
                  <div key={i} className="grid grid-cols-[1fr_2fr_2fr_auto] gap-2 items-end">
                    <Field label="Icon" value={item.icon} onChange={(v) => {
                      const items = [...content.benefits.items]; items[i] = { ...item, icon: v };
                      patch("benefits", { ...content.benefits, items });
                    }} />
                    <Field label="Label" value={item.label} onChange={(v) => {
                      const items = [...content.benefits.items]; items[i] = { ...item, label: v };
                      patch("benefits", { ...content.benefits, items });
                    }} />
                    <Field label="Description" value={item.description ?? ""} onChange={(v) => {
                      const items = [...content.benefits.items]; items[i] = { ...item, description: v };
                      patch("benefits", { ...content.benefits, items });
                    }} />
                    <Button variant="ghost" size="icon" className="mb-0.5 text-destructive"
                      onClick={() => patch("benefits", { ...content.benefits, items: content.benefits.items.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => patch("benefits", { ...content.benefits, items: [...content.benefits.items, { icon: "", label: "", description: "" }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add item
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Features ────────────────────────────────────────────────────── */}
        <TabsContent value="features">
          <Card>
            <CardHeader><CardTitle>Numbered Features</CardTitle><CardDescription>3 alternating blocks with number badges and icon sub-bullets.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Eyebrow" value={content.features.eyebrow} onChange={(v) => patch("features", { ...content.features, eyebrow: v })} />
                <Field label="Heading" value={content.features.heading} onChange={(v) => patch("features", { ...content.features, heading: v })} className="sm:col-span-2" />
              </div>
              <Field label="Intro" value={content.features.intro} multiline onChange={(v) => patch("features", { ...content.features, intro: v })} />

              {content.features.blocks.map((block: HpFeatureBlock, bi) => (
                <div key={bi} className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{block.number}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" disabled={bi === 0} onClick={() => patch("features", { ...content.features, blocks: move(content.features.blocks, bi, "up") })}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" disabled={bi === content.features.blocks.length - 1} onClick={() => patch("features", { ...content.features, blocks: move(content.features.blocks, bi, "down") })}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => patch("features", { ...content.features, blocks: content.features.blocks.filter((_, j) => j !== bi) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <Field label="Heading" value={block.heading} onChange={(v) => {
                    const blocks = [...content.features.blocks]; blocks[bi] = { ...block, heading: v };
                    patch("features", { ...content.features, blocks });
                  }} />
                  <Field label="Description" value={block.description} multiline onChange={(v) => {
                    const blocks = [...content.features.blocks]; blocks[bi] = { ...block, description: v };
                    patch("features", { ...content.features, blocks });
                  }} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Image URL" value={block.imageSrc ?? ""} onChange={(v) => {
                      const blocks = [...content.features.blocks]; blocks[bi] = { ...block, imageSrc: v };
                      patch("features", { ...content.features, blocks });
                    }} />
                    <Field label="Image alt" value={block.imageAlt ?? ""} onChange={(v) => {
                      const blocks = [...content.features.blocks]; blocks[bi] = { ...block, imageAlt: v };
                      patch("features", { ...content.features, blocks });
                    }} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Sub-bullets</p>
                    {block.bullets.map((bullet: HpFeatureBullet, ii) => (
                      <div key={ii} className="grid grid-cols-[1fr_3fr_auto] gap-2 items-end">
                        <Field label="Icon" value={bullet.icon} onChange={(v) => {
                          const blocks = [...content.features.blocks];
                          const bullets = [...block.bullets]; bullets[ii] = { ...bullet, icon: v };
                          blocks[bi] = { ...block, bullets };
                          patch("features", { ...content.features, blocks });
                        }} />
                        <Field label="Label" value={bullet.label} onChange={(v) => {
                          const blocks = [...content.features.blocks];
                          const bullets = [...block.bullets]; bullets[ii] = { ...bullet, label: v };
                          blocks[bi] = { ...block, bullets };
                          patch("features", { ...content.features, blocks });
                        }} />
                        <Button variant="ghost" size="icon" className="mb-0.5 text-destructive" onClick={() => {
                          const blocks = [...content.features.blocks];
                          blocks[bi] = { ...block, bullets: block.bullets.filter((_, j) => j !== ii) };
                          patch("features", { ...content.features, blocks });
                        }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => {
                      const blocks = [...content.features.blocks];
                      blocks[bi] = { ...block, bullets: [...block.bullets, { icon: "", label: "" }] };
                      patch("features", { ...content.features, blocks });
                    }}><Plus className="mr-1 h-4 w-4" /> Add bullet</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm"
                onClick={() => patch("features", { ...content.features, blocks: [...content.features.blocks, { number: content.features.blocks.length + 1, heading: "", description: "", bullets: [], imageSrc: "", imageAlt: "" }] })}>
                <Plus className="mr-1 h-4 w-4" /> Add feature block
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Trust ───────────────────────────────────────────────────────── */}
        <TabsContent value="trust">
          <Card>
            <CardHeader><CardTitle>Trust / Certifications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Eyebrow" value={content.trust.eyebrow} onChange={(v) => patch("trust", { ...content.trust, eyebrow: v })} />
                <Field label="Heading" value={content.trust.heading} onChange={(v) => patch("trust", { ...content.trust, heading: v })} className="sm:col-span-2" />
              </div>
              <Field label="Paragraph" value={content.trust.paragraph} multiline onChange={(v) => patch("trust", { ...content.trust, paragraph: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Paragraph link label" value={content.trust.paragraphLink?.label ?? ""}
                  onChange={(v) => patch("trust", { ...content.trust, paragraphLink: { ...content.trust.paragraphLink, label: v, href: content.trust.paragraphLink?.href ?? "" } })} />
                <Field label="Paragraph link href" value={content.trust.paragraphLink?.href ?? ""}
                  onChange={(v) => patch("trust", { ...content.trust, paragraphLink: { ...content.trust.paragraphLink, label: content.trust.paragraphLink?.label ?? "", href: v } })} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Badges</p>
                {content.trust.badges.map((badge: HpTrustBadge, i) => (
                  <div key={i} className="grid grid-cols-[2fr_3fr_auto] gap-2 items-end">
                    <Field label="Label" value={badge.label} onChange={(v) => {
                      const badges = [...content.trust.badges]; badges[i] = { ...badge, label: v };
                      patch("trust", { ...content.trust, badges });
                    }} />
                    <Field label="Description" value={badge.description ?? ""} onChange={(v) => {
                      const badges = [...content.trust.badges]; badges[i] = { ...badge, description: v };
                      patch("trust", { ...content.trust, badges });
                    }} />
                    <Button variant="ghost" size="icon" className="mb-0.5 text-destructive"
                      onClick={() => patch("trust", { ...content.trust, badges: content.trust.badges.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => patch("trust", { ...content.trust, badges: [...content.trust.badges, { label: "", description: "" }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add badge
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Mission ─────────────────────────────────────────────────────── */}
        <TabsContent value="mission">
          <Card>
            <CardHeader><CardTitle>Mission / Technology</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Eyebrow" value={content.mission.eyebrow} onChange={(v) => patch("mission", { ...content.mission, eyebrow: v })} />
                <Field label="Heading" value={content.mission.heading} onChange={(v) => patch("mission", { ...content.mission, heading: v })} className="sm:col-span-2" />
              </div>
              <Field label="Paragraph" value={content.mission.paragraph} multiline onChange={(v) => patch("mission", { ...content.mission, paragraph: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="CTA label" value={content.mission.cta.label} onChange={(v) => patch("mission", { ...content.mission, cta: { ...content.mission.cta, label: v } })} />
                <Field label="CTA href"  value={content.mission.cta.href}  onChange={(v) => patch("mission", { ...content.mission, cta: { ...content.mission.cta, href: v } })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Community ───────────────────────────────────────────────────── */}
        <TabsContent value="community">
          <Card>
            <CardHeader><CardTitle>Community</CardTitle><CardDescription>4-channel link cards.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Eyebrow" value={content.community.eyebrow} onChange={(v) => patch("community", { ...content.community, eyebrow: v })} />
                <Field label="Heading" value={content.community.heading} onChange={(v) => patch("community", { ...content.community, heading: v })} className="sm:col-span-2" />
              </div>
              <Field label="Intro" value={content.community.intro} multiline onChange={(v) => patch("community", { ...content.community, intro: v })} />
              <div className="space-y-3">
                {content.community.channels.map((ch: HpCommunityChannel, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                      <Field label="Icon" value={ch.icon} onChange={(v) => {
                        const channels = [...content.community.channels]; channels[i] = { ...ch, icon: v };
                        patch("community", { ...content.community, channels });
                      }} />
                      <Field label="Channel name" value={ch.name} onChange={(v) => {
                        const channels = [...content.community.channels]; channels[i] = { ...ch, name: v };
                        patch("community", { ...content.community, channels });
                      }} />
                      <Button variant="ghost" size="icon" className="mt-6 text-destructive"
                        onClick={() => patch("community", { ...content.community, channels: content.community.channels.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Field label="Blurb" value={ch.blurb} multiline onChange={(v) => {
                      const channels = [...content.community.channels]; channels[i] = { ...ch, blurb: v };
                      patch("community", { ...content.community, channels });
                    }} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Action label" value={ch.actionLabel} onChange={(v) => {
                        const channels = [...content.community.channels]; channels[i] = { ...ch, actionLabel: v };
                        patch("community", { ...content.community, channels });
                      }} />
                      <Field label="Href" value={ch.href} onChange={(v) => {
                        const channels = [...content.community.channels]; channels[i] = { ...ch, href: v };
                        patch("community", { ...content.community, channels });
                      }} />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => patch("community", { ...content.community, channels: [...content.community.channels, { icon: "", name: "", blurb: "", actionLabel: "", href: "" }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add channel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Final CTA ───────────────────────────────────────────────────── */}
        <TabsContent value="final_cta">
          <Card>
            <CardHeader><CardTitle>Final CTA Band</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Heading" value={content.final_cta.heading} onChange={(v) => patch("final_cta", { ...content.final_cta, heading: v })} />
              <Field label="Subheading" value={content.final_cta.subheading ?? ""} multiline onChange={(v) => patch("final_cta", { ...content.final_cta, subheading: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Primary CTA</p>
                  <Field label="Label" value={content.final_cta.primaryCta.label} onChange={(v) => patch("final_cta", { ...content.final_cta, primaryCta: { ...content.final_cta.primaryCta, label: v } })} />
                  <Field label="Href"  value={content.final_cta.primaryCta.href}  onChange={(v) => patch("final_cta", { ...content.final_cta, primaryCta: { ...content.final_cta.primaryCta, href: v } })} />
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Secondary CTA</p>
                  <Field label="Label" value={content.final_cta.secondaryCta.label} onChange={(v) => patch("final_cta", { ...content.final_cta, secondaryCta: { ...content.final_cta.secondaryCta, label: v } })} />
                  <Field label="Href"  value={content.final_cta.secondaryCta.href}  onChange={(v) => patch("final_cta", { ...content.final_cta, secondaryCta: { ...content.final_cta.secondaryCta, href: v } })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <TabsContent value="footer">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Footer Basics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="Tagline" value={content.footer.tagline} multiline onChange={(v) => patch("footer", { ...content.footer, tagline: v })} />
                <Field label="Copyright" value={content.footer.copyright} onChange={(v) => patch("footer", { ...content.footer, copyright: v })} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Link Columns</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {content.footer.columns.map((col: HpFooterColumn, ci) => (
                  <div key={ci} className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-end gap-2">
                      <Field className="flex-1" label="Column title" value={col.title} onChange={(v) => {
                        const cols = [...content.footer.columns]; cols[ci] = { ...col, title: v };
                        patch("footer", { ...content.footer, columns: cols });
                      }} />
                      <Button variant="ghost" size="icon" className="mb-0.5 text-destructive"
                        onClick={() => patch("footer", { ...content.footer, columns: content.footer.columns.filter((_, j) => j !== ci) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {col.links.map((link, li) => (
                      <div key={li} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end ml-4">
                        <Field label="Label" value={link.label} onChange={(v) => {
                          const cols = [...content.footer.columns]; const links = [...col.links]; links[li] = { ...link, label: v };
                          cols[ci] = { ...col, links }; patch("footer", { ...content.footer, columns: cols });
                        }} />
                        <Field label="Href" value={link.href} onChange={(v) => {
                          const cols = [...content.footer.columns]; const links = [...col.links]; links[li] = { ...link, href: v };
                          cols[ci] = { ...col, links }; patch("footer", { ...content.footer, columns: cols });
                        }} />
                        <Button variant="ghost" size="icon" className="mb-0.5 text-destructive" onClick={() => {
                          const cols = [...content.footer.columns];
                          cols[ci] = { ...col, links: col.links.filter((_, j) => j !== li) };
                          patch("footer", { ...content.footer, columns: cols });
                        }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="ml-4" onClick={() => {
                      const cols = [...content.footer.columns];
                      cols[ci] = { ...col, links: [...col.links, { label: "", href: "" }] };
                      patch("footer", { ...content.footer, columns: cols });
                    }}><Plus className="mr-1 h-4 w-4" /> Add link</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => patch("footer", { ...content.footer, columns: [...content.footer.columns, { title: "", links: [] }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add column
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Social Links</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {content.footer.social.map((s: HpFooterSocial, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-end">
                    <Field label="Icon" value={s.icon} onChange={(v) => {
                      const social = [...content.footer.social]; social[i] = { ...s, icon: v };
                      patch("footer", { ...content.footer, social });
                    }} />
                    <Field label="Name" value={s.name} onChange={(v) => {
                      const social = [...content.footer.social]; social[i] = { ...s, name: v };
                      patch("footer", { ...content.footer, social });
                    }} />
                    <Field label="Href" value={s.href} onChange={(v) => {
                      const social = [...content.footer.social]; social[i] = { ...s, href: v };
                      patch("footer", { ...content.footer, social });
                    }} />
                    <Button variant="ghost" size="icon" className="mb-0.5 text-destructive"
                      onClick={() => patch("footer", { ...content.footer, social: content.footer.social.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => patch("footer", { ...content.footer, social: [...content.footer.social, { icon: "", name: "", href: "" }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add social
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Trust Badges</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {content.footer.badges.map((b: HpFooterBadge, i) => (
                  <div key={i} className="grid grid-cols-[2fr_2fr_auto] gap-2 items-end">
                    <Field label="Label" value={b.label} onChange={(v) => {
                      const badges = [...content.footer.badges]; badges[i] = { ...b, label: v };
                      patch("footer", { ...content.footer, badges });
                    }} />
                    <Field label="Href (optional)" value={b.href ?? ""} onChange={(v) => {
                      const badges = [...content.footer.badges]; badges[i] = { ...b, href: v };
                      patch("footer", { ...content.footer, badges });
                    }} />
                    <Button variant="ghost" size="icon" className="mb-0.5 text-destructive"
                      onClick={() => patch("footer", { ...content.footer, badges: content.footer.badges.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => patch("footer", { ...content.footer, badges: [...content.footer.badges, { label: "" }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add badge
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
