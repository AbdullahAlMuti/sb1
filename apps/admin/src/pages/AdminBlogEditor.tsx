import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@repo/api-client/supabase/client";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/components/ui/tabs";
import { toast } from "sonner";
import type {
  MarketingAuthor,
  MarketingCategory,
  MarketingFaqItem,
  MarketingPostFormValues,
} from "@repo/types";
import {
  createPost,
  updatePost,
  getPost,
  listCategories,
  listAuthors,
  slugify,
  triggerSiteRebuild,
  uploadBlogImage,
} from "@/lib/marketing-blog";

const EMPTY: MarketingPostFormValues = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  category_id: null,
  author_id: null,
  status: "draft",
  published_at: null,
  seo_title: "",
  meta_description: "",
  canonical_url: "",
  og_image_url: "",
  keywords: [],
  faq: [],
};

export default function AdminBlogEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const [form, setForm] = useState<MarketingPostFormValues>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [categories, setCategories] = useState<MarketingCategory[]>([]);
  const [authors, setAuthors] = useState<MarketingAuthor[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [cats, auths] = await Promise.all([listCategories(), listAuthors()]);
        setCategories(cats);
        setAuthors(auths);
        if (!isNew && id) {
          const post = await getPost(id);
          if (post) {
            setForm({
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt ?? "",
              content: post.content ?? "",
              cover_image_url: post.cover_image_url ?? "",
              category_id: post.category_id,
              author_id: post.author_id,
              status: post.status,
              published_at: post.published_at,
              seo_title: post.seo_title ?? "",
              meta_description: post.meta_description ?? "",
              canonical_url: post.canonical_url ?? "",
              og_image_url: post.og_image_url ?? "",
              keywords: post.keywords ?? [],
              faq: post.faq ?? [],
            });
            setSlugTouched(true);
          }
        } else if (auths[0]) {
          setForm((f) => ({ ...f, author_id: auths[0].id }));
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load editor data");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const set = <K extends keyof MarketingPostFormValues>(
    key: K,
    value: MarketingPostFormValues[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  function onTitleChange(value: string) {
    setForm((f) => ({
      ...f,
      title: value,
      slug: slugTouched ? f.slug : slugify(value),
    }));
  }

  const previewHtml = useMemo(
    () => DOMPurify.sanitize(form.content || "<p class='text-muted-foreground'>Nothing to preview yet.</p>"),
    [form.content],
  );

  async function save(targetStatus: MarketingPostFormValues["status"]) {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    const values: MarketingPostFormValues = { ...form, status: targetStatus };
    try {
      if (isNew) {
        const created = await createPost(values);
        toast.success(targetStatus === "published" ? "Published" : "Draft saved");
        if (targetStatus === "published") await rebuild();
        navigate(`/blog/${created.id}/edit`, { replace: true });
      } else if (id) {
        await updatePost(id, values);
        toast.success(targetStatus === "published" ? "Published" : "Saved");
        if (targetStatus === "published") await rebuild();
      }
      setForm((f) => ({ ...f, status: targetStatus }));
    } catch (e) {
      console.error("Save failed:", e);
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function rebuild() {
    const res = await triggerSiteRebuild();
    if (res.triggered) toast.success("Site rebuild triggered — live in ~1–2 min");
    else
      toast.message("Saved. Site rebuild not triggered", {
        description: res.reason
          ? `Deploy hook: ${res.reason}`
          : "Set the VERCEL_DEPLOY_HOOK_URL secret to auto-publish.",
      });
  }

  async function generateWithAI() {
    if (!aiTopic.trim()) {
      toast.error("Enter a topic for the AI to write about");
      return;
    }
    setGenerating(true);
    try {
      const category = categories.find((c) => c.id === form.category_id);
      const { data, error } = await supabase.functions.invoke("generate-marketing-post", {
        body: { topic: aiTopic, categoryName: category?.name },
      });
      if (error) throw error;
      const d = data as any;
      setForm((f) => ({
        ...f,
        title: d.title || f.title,
        slug: slugTouched ? f.slug : slugify(d.title || f.title),
        excerpt: d.excerpt || f.excerpt,
        content: d.content || f.content,
        seo_title: d.seoTitle || f.seo_title,
        meta_description: d.metaDescription || f.meta_description,
        keywords: Array.isArray(d.keywords) ? d.keywords : f.keywords,
        faq: Array.isArray(d.faq) ? d.faq : f.faq,
      }));
      toast.success("Draft generated — review and edit before publishing");
    } catch (e) {
      console.error("AI generation failed:", e);
      toast.error(e instanceof Error ? e.message : "AI generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function onUploadCover(file: File) {
    try {
      const url = await uploadBlogImage(file);
      set("cover_image_url", url);
      toast.success("Cover uploaded");
    } catch (e) {
      console.error(e);
      toast.error("Upload failed");
    }
  }

  function updateFaq(i: number, field: keyof MarketingFaqItem, value: string) {
    setForm((f) => {
      const faq = [...f.faq];
      faq[i] = { ...faq[i], [field]: value };
      return { ...f, faq };
    });
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/blog")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">
              {isNew ? "New Post" : "Edit Post"}
            </h1>
            <p className="text-sm text-muted-foreground">/{form.slug || "…"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => save("draft")} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save draft
          </Button>
          <Button onClick={() => save("published")} disabled={saving}>
            <Send className="h-4 w-4 mr-2" />
            Publish
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="Amazon to eBay Dropshipping: The Complete 2026 Guide"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value);
                  }}
                  placeholder="amazon-to-ebay-dropshipping-guide-2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) => set("excerpt", e.target.value)}
                  placeholder="One-sentence summary shown on cards and in meta description fallback."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="write">
                <TabsList>
                  <TabsTrigger value="write">Write (HTML)</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="write">
                  <Textarea
                    value={form.content}
                    onChange={(e) => set("content", e.target.value)}
                    rows={22}
                    className="font-mono text-sm"
                    placeholder="<h2>Section</h2><p>Write your article in HTML. Use h2/h3, p, ul/li, strong, a…</p>"
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none rounded-lg border p-4"
                    // previewHtml is sanitized with DOMPurify above
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">FAQ (drives FAQ rich results)</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => set("faq", [...form.faq, { q: "", a: "" }])}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.faq.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Optional. Add Q&amp;A pairs to generate FAQ schema.
                </p>
              )}
              {form.faq.map((item, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={item.q}
                      onChange={(e) => updateFaq(i, "q", e.target.value)}
                      placeholder="Question"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0"
                      onClick={() =>
                        set("faq", form.faq.filter((_, idx) => idx !== i))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
                    value={item.a}
                    onChange={(e) => updateFaq(i, "a", e.target.value)}
                    placeholder="Answer"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI draft
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={2}
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g. How to avoid eBay VeRO violations when dropshipping"
              />
              <Button
                variant="secondary"
                className="w-full"
                onClick={generateWithAI}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> Generate draft
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Generates a structured draft. Always review before publishing.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category_id ?? undefined}
                  onValueChange={(v) => set("category_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Author</Label>
                <Select
                  value={form.author_id ?? undefined}
                  onValueChange={(v) => set("author_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select author" />
                  </SelectTrigger>
                  <SelectContent>
                    {authors.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    set("status", v as MarketingPostFormValues["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="published_at">Publish date</Label>
                <Input
                  id="published_at"
                  type="datetime-local"
                  value={
                    form.published_at
                      ? new Date(form.published_at).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    set(
                      "published_at",
                      e.target.value ? new Date(e.target.value).toISOString() : null,
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.cover_image_url && (
                <img
                  src={form.cover_image_url}
                  alt="cover"
                  className="aspect-[16/9] w-full rounded-lg object-cover"
                />
              )}
              <Input
                value={form.cover_image_url}
                onChange={(e) => set("cover_image_url", e.target.value)}
                placeholder="https://… or upload"
              />
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onUploadCover(e.target.files[0])}
                />
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" /> Upload
                  </span>
                </Button>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title">SEO title</Label>
                <Input
                  id="seo_title"
                  value={form.seo_title}
                  onChange={(e) => set("seo_title", e.target.value)}
                  placeholder="Defaults to the post title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta">Meta description</Label>
                <Textarea
                  id="meta"
                  rows={3}
                  value={form.meta_description}
                  onChange={(e) => set("meta_description", e.target.value)}
                  placeholder="150–160 characters"
                />
                <p className="text-xs text-muted-foreground">
                  {form.meta_description.length} chars
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  value={form.keywords.join(", ")}
                  onChange={(e) =>
                    set(
                      "keywords",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="ebay dropshipping, amazon to ebay"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canonical">Canonical URL (optional)</Label>
                <Input
                  id="canonical"
                  value={form.canonical_url}
                  onChange={(e) => set("canonical_url", e.target.value)}
                  placeholder="Leave blank for default"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
