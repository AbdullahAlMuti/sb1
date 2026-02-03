import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  RefreshCw,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

type AppRole = 'user' | 'admin' | 'super_admin';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string | null;
  profile?: {
    full_name: string | null;
  };
  email?: string;
}

interface RoleStats {
  totalUsers: number;
  adminCount: number;
  superAdminCount: number;
  regularUsers: number;
}

const ITEMS_PER_PAGE = 10;

export default function AdminRoles() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [stats, setStats] = useState<RoleStats>({
    totalUsers: 0,
    adminCount: 0,
    superAdminCount: 0,
    regularUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRoles();
    fetchStats();
  }, [currentPage, filterRole]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('user-roles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
        },
        () => {
          fetchRoles();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { count: total } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true });

      const { count: admins } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      const { count: superAdmins } = await (supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin' as any) as any);

      const { count: users } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user');

      setStats({
        totalUsers: total || 0,
        adminCount: admins || 0,
        superAdminCount: superAdmins || 0,
        regularUsers: users || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from('user_roles')
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `, { count: 'exact' });

      if (filterRole !== 'all') {
        query = query.eq('role', filterRole as any);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Fetch emails from edge function
      const userIds = (data as any[])?.map(item => item.user_id).filter(Boolean) || [];
      let userEmails: Record<string, string> = {};
      
      if (userIds.length > 0) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const { data: verificationData } = await supabase.functions.invoke('admin-get-users-verification', {
            body: { userIds },
            headers: {
              Authorization: `Bearer ${sessionData.session?.access_token}`,
            },
          });
          
          if (verificationData?.userEmails) {
            userEmails = verificationData.userEmails;
          }
        } catch (e) {
          console.error('Error fetching emails:', e);
        }
      }

      const formattedData = (data as any[])?.map((item: any) => ({
        ...item,
        created_at: item.created_at || null,
        profile: item.profiles as unknown as UserRole['profile'],
        email: userEmails[item.user_id] || '',
      })) || [];

      setRoles(formattedData as UserRole[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!newUserEmail.trim()) {
      toast.error('Please enter a user ID');
      return;
    }

    setIsSubmitting(true);
    try {
      // Verify user exists by checking profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', newUserEmail.trim())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        toast.error('User not found with that ID');
        setIsSubmitting(false);
        return;
      }

      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.id)
        .eq('role', newRole as any)
        .maybeSingle();

      if (existingRole) {
        toast.error('User already has this role');
        setIsSubmitting(false);
        return;
      }

      // Remove existing role and add new one
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', profile.id);

      const { error } = await (supabase
        .from('user_roles')
        .insert({
          user_id: profile.id,
          role: newRole,
        } as any) as any);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        action: 'ROLE_ASSIGNED',
        entity_type: 'user_role',
        entity_id: profile.id,
        new_values: { role: newRole, email: newUserEmail },
      });

      toast.success(`Role assigned to ${newUserEmail}`);
      setShowAddDialog(false);
      setNewUserEmail('');
      setNewRole('admin');
      fetchRoles();
      fetchStats();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      // Demote to regular user instead of completely removing
      await supabase
        .from('user_roles')
        .delete()
        .eq('id', selectedRole.id);

      const { error } = await (supabase
        .from('user_roles')
        .insert({
          user_id: selectedRole.user_id,
          role: 'user',
        } as any) as any);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        action: 'ROLE_REMOVED',
        entity_type: 'user_role',
        entity_id: selectedRole.user_id,
        old_values: { role: selectedRole.role },
        new_values: { role: 'user' },
      });

      toast.success('User demoted to regular user');
      setShowDeleteDialog(false);
      setSelectedRole(null);
      fetchRoles();
      fetchStats();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    }
  };

  const filteredRoles = roles.filter((role) => {
    const matchesSearch =
      role.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.user_id?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge className="bg-red-500/20 text-red-400">
            <ShieldAlert className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-amber-500/20 text-amber-400">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            User
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Role Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage admin roles and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Assign Role
          </Button>
          <Button variant="outline" onClick={fetchRoles}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary uppercase tracking-wide">Total Roles</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.totalUsers}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/20">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-400 uppercase tracking-wide">Super Admins</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.superAdminCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/20">
                  <ShieldAlert className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-400 uppercase tracking-wide">Admins</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.adminCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <ShieldCheck className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-400 uppercase tracking-wide">Regular Users</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.regularUsers}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Shield className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Roles Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">User</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">Role</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">Assigned</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground mt-2">Loading roles...</p>
                      </td>
                    </tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12">
                        <Shield className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="text-muted-foreground mt-2">No roles found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((role) => (
                      <tr key={role.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary-foreground">
                                {role.profile?.full_name?.charAt(0) || role.email?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {role.profile?.full_name || 'Unknown'}
                              </p>
                              <p className="text-sm text-muted-foreground">{role.email || role.user_id?.slice(0, 8) + '...'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {getRoleBadge(role.role)}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {role.created_at
                            ? format(new Date(role.created_at), 'MMM dd, yyyy HH:mm')
                            : '-'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {role.role !== 'user' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedRole(role);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Demote
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Role Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Admin Role</DialogTitle>
            <DialogDescription>
              Assign an admin or super admin role to a user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input
                placeholder="Enter user ID (UUID)..."
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">You can find user IDs in the Users management page.</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demote User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to demote {selectedRole?.email || selectedRole?.profile?.full_name || 'this user'} to regular user?
              They will lose all admin privileges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Demote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
