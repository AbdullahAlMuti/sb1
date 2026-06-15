import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit2,
  Trash2,
  Newspaper,
  Eye,
  FileText,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import type { MarketingPostWithRelations } from "@repo/types";
import { listPosts, deletePost } from "@/lib/marketing-blog";

const SITE_URL = "https://www.sellersuit.com";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    published: "bg-emerald-500/20 text-emerald-400",
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-amber-500/20 text-amber-400",
  };
  return <Badge className={map[status] || map.draft}>{status}</Badge>;
}

export default function AdminBlog() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<MarketingPostWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState<MarketingPostWithRelations | null>(null);

  useEffect(() => {
    void fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      setPosts(await listPosts());
    } catch (e) {
      console.error("Error fetching posts:", e);
      toast.error("Failed to load blog posts");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deletePost(deleting.id);
      toast.success("Post deleted");
      setDeleting(null);
      void fetchPosts();
    } catch (e) {
      console.error("Error deleting post:", e);
      toast.error("Failed to delete post");
    }
  }

  const published = posts.filter((p) => p.status === "published");
  const drafts = posts.filter((p) => p.status !== "published");

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Blog</h1>
          <p className="text-muted-foreground mt-1">
            Write and publish the company marketing blog (sellersuit.com/blog).
          </p>
        </div>
        <Button onClick={() => navigate("/blog/new")}>
          <Plus className="h-5 w-5 mr-2" />
          New Post
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-3xl font-bold">{posts.length}</p>
              </div>
              <Newspaper className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-3xl font-bold text-emerald-500">{published.length}</p>
              </div>
              <Eye className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-3xl font-bold text-muted-foreground">{drafts.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Loading posts…</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground mt-2">No posts yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Write your first article to start ranking on Google.
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className={`p-4 rounded-lg border ${
                    post.status === "published" ? "bg-card" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
                        {statusBadge(post.status)}
                        {post.category && <Badge variant="outline">{post.category.name}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        /{post.slug}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.reading_minutes} min
                        </span>
                        <span>Updated {format(new Date(post.updated_at), "MMM dd, yyyy")}</span>
                        {post.author && <span>By {post.author.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {post.status === "published" && (
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={`${SITE_URL}/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View live"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/blog/${post.id}/edit`)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(post)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post</AlertDialogTitle>
            <AlertDialogDescription>
              Delete “{deleting?.title}”? This cannot be undone. If it was published, it
              stays live until the next site rebuild.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
