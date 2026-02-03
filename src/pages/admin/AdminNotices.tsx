import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit2,
  Trash2,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  Send,
  Eye,
  EyeOff,
  Calendar,
  Users,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Notice {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: number;
  target_audience: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  created_by: string | null;
}

interface NoticeFormData {
  title: string;
  content: string;
  type: string;
  priority: number;
  target_audience: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
}

export default function AdminNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingNotice, setDeletingNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices((data || []).map((n: any) => ({
        ...n,
        target_audience: n.target_audience || 'all',
        created_by: n.created_by || null,
      })) as Notice[]);
    } catch (error) {
      console.error('Error fetching notices:', error);
      toast.error('Failed to fetch notices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotice = async (formData: NoticeFormData) => {
    setIsSaving(true);
    try {
      const noticeData = {
        title: formData.title,
        message: formData.content, // "message" is required per DB schema
        content: formData.content,
        type: formData.type,
        priority: formData.priority,
        target_audience: formData.target_audience,
        is_active: formData.is_active,
        starts_at: formData.starts_at || null,
        ends_at: formData.ends_at || null,
        created_by: user?.id,
      };

      if (editingNotice?.id) {
        const { error } = await supabase
          .from('notices')
          .update(noticeData)
          .eq('id', editingNotice.id);

        if (error) throw error;
        toast.success('Notice updated successfully');
      } else {
        const { error } = await supabase
          .from('notices')
          .insert([noticeData]);

        if (error) throw error;
        toast.success('Notice created successfully');
      }

      setIsDialogOpen(false);
      setEditingNotice(null);
      fetchNotices();
    } catch (error) {
      console.error('Error saving notice:', error);
      toast.error('Failed to save notice');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNotice = async () => {
    if (!deletingNotice) return;

    try {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', deletingNotice.id);

      if (error) throw error;

      setDeletingNotice(null);
      fetchNotices();
      toast.success('Notice deleted successfully');
    } catch (error) {
      console.error('Error deleting notice:', error);
      toast.error('Failed to delete notice');
    }
  };

  const toggleNoticeStatus = async (noticeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('notices')
        .update({ is_active: !isActive })
        .eq('id', noticeId);

      if (error) throw error;

      setNotices(notices.map(n => 
        n.id === noticeId ? { ...n, is_active: !isActive } : n
      ));

      toast.success(`Notice ${!isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating notice:', error);
      toast.error('Failed to update notice');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-500/20 text-blue-400',
      warning: 'bg-amber-500/20 text-amber-400',
      error: 'bg-destructive/20 text-destructive',
      success: 'bg-emerald-500/20 text-emerald-400',
    };
    return <Badge className={colors[type] || colors.info}>{type}</Badge>;
  };

  const activeNotices = notices.filter(n => n.is_active);
  const inactiveNotices = notices.filter(n => !n.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground mt-1">
            Manage platform notices and system updates
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingNotice(null)}>
              <Plus className="h-5 w-5 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingNotice ? 'Edit Announcement' : 'Create Announcement'}
              </DialogTitle>
              <DialogDescription>
                Create a notice that will be shown to users
              </DialogDescription>
            </DialogHeader>
            <NoticeForm
              notice={editingNotice}
              onSave={handleSaveNotice}
              onCancel={() => setIsDialogOpen(false)}
              isSaving={isSaving}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notices</p>
                <p className="text-3xl font-bold">{notices.length}</p>
              </div>
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-3xl font-bold text-emerald-500">{activeNotices.length}</p>
              </div>
              <Eye className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-3xl font-bold text-muted-foreground">{inactiveNotices.length}</p>
              </div>
              <EyeOff className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notices List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Loading notices...</p>
              </div>
            ) : notices.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground mt-2">No announcements yet</p>
                <p className="text-sm text-muted-foreground/70">Create your first announcement to notify users</p>
              </div>
            ) : (
              notices.map((notice) => (
                <div
                  key={notice.id}
                  className={`p-4 rounded-lg border ${notice.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getTypeIcon(notice.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{notice.title}</h3>
                          {getTypeBadge(notice.type)}
                          <Badge variant="outline">Priority: {notice.priority}</Badge>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {notice.target_audience}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notice.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {format(new Date(notice.created_at), 'MMM dd, yyyy')}
                          </span>
                          {notice.starts_at && (
                            <span>Starts: {format(new Date(notice.starts_at), 'MMM dd, yyyy')}</span>
                          )}
                          {notice.ends_at && (
                            <span>Ends: {format(new Date(notice.ends_at), 'MMM dd, yyyy')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleNoticeStatus(notice.id, notice.is_active)}
                      >
                        {notice.is_active ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-emerald-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingNotice(notice);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingNotice(notice)}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingNotice} onOpenChange={() => setDeletingNotice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingNotice?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNotice} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Notice Form Component
function NoticeForm({
  notice,
  onSave,
  onCancel,
  isSaving,
}: {
  notice: Notice | null;
  onSave: (formData: NoticeFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<NoticeFormData>({
    title: notice?.title || '',
    content: notice?.content || '',
    type: notice?.type || 'info',
    priority: notice?.priority || 0,
    target_audience: notice?.target_audience || 'all',
    is_active: notice?.is_active ?? true,
    starts_at: notice?.starts_at ? format(new Date(notice.starts_at), "yyyy-MM-dd'T'HH:mm") : '',
    ends_at: notice?.ends_at ? format(new Date(notice.ends_at), "yyyy-MM-dd'T'HH:mm") : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Announcement title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Announcement message"
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="success">Success</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Input
            id="priority"
            type="number"
            min="0"
            max="100"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audience">Audience</Label>
          <Select value={formData.target_audience} onValueChange={(value) => setFormData({ ...formData, target_audience: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="free">Free Users</SelectItem>
              <SelectItem value="paid">Paid Users</SelectItem>
              <SelectItem value="admin">Admins Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Start Date (optional)</Label>
          <Input
            id="starts_at"
            type="datetime-local"
            value={formData.starts_at}
            onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends_at">End Date (optional)</Label>
          <Input
            id="ends_at"
            type="datetime-local"
            value={formData.ends_at}
            onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Publish immediately</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {notice ? 'Update' : 'Publish'}
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
