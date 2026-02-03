import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Trash2,
  RefreshCw,
  Download,
  Eye,
  Key,
  ChevronLeft,
  ChevronRight,
  Coins,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowUpDown,
  Pencil,
  ChevronDown,
  Calendar,
  Settings2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

interface UserWithDetails {
  id: string;
  email?: string;
  full_name: string | null;
  credits: number;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  plan_id: string | null;
  roles: { role: string }[];
  email_verified?: boolean;
  // New blocking fields
  is_blocked?: boolean;
  blocked_reason?: string;
  // User plan fields for subscription management
  user_plan?: {
    id: string;
    status: string;
    current_period_end: string | null;
    admin_override_limits: {
      max_listings?: number;
      max_auto_orders?: number;
      credits_per_month?: number;
    } | null;
  };
}

interface Plan {
  id: string;
  name: string;
  display_name: string;
  credits_per_month: number | null;
  max_listings?: number | null;
  max_auto_orders?: number | null;
}

interface OverrideLimits {
  max_listings?: number;
  max_auto_orders?: number;
  credits_per_month?: number;
}

type SortField = 'id' | 'name' | 'credits' | 'status' | 'created_at' | 'last_login';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

// Country data for display
const countries = [
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'GB', name: 'UK', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
];

// Generate a consistent user ID based on actual id
const generateUserId = (id: string): string => {
  const hash = id.slice(0, 6).toUpperCase();
  const suffix = id.slice(-2).toUpperCase();
  return `${hash.slice(0, 6)}-${suffix}`;
};

// Get random country for user (consistent based on id)
const getUserCountry = (id: string) => {
  const index = parseInt(id.slice(0, 8), 16) % countries.length;
  return countries[index];
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'super_admin'>('user');
  const [newPlanId, setNewPlanId] = useState<string>('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState<string | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [creditAdjustment, setCreditAdjustment] = useState<number>(0);
  const [creditAdjustmentReason, setCreditAdjustmentReason] = useState('');
  const [isAdjustingCredits, setIsAdjustingCredits] = useState(false);
  
  // Subscription extension state
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [extensionDays, setExtensionDays] = useState<number>(30);
  const [extensionReason, setExtensionReason] = useState('');
  const [isExtending, setIsExtending] = useState(false);
  
  // Limit override state
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideLimits, setOverrideLimits] = useState<OverrideLimits>({});
  const [isUpdatingOverride, setIsUpdatingOverride] = useState(false);

  const fetchUsersCallback = useCallback(() => {
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterActive, filterRole]);

  useRealtimeSync(
    [
      { table: 'profiles', event: '*', callback: fetchUsersCallback },
      { table: 'user_roles', event: '*', callback: fetchUsersCallback },
    ],
    [fetchUsersCallback]
  );

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, [currentPage, filterActive, filterRole]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, display_name, credits_per_month')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      if (filterActive === 'active') {
        query = query.eq('is_active', true);
      } else if (filterActive === 'inactive') {
        query = query.eq('is_active', false);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: profiles, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const userIds = profiles?.map(p => p.id) || [];
      
      // Fetch roles, user_plans, and verification data in parallel
      const [rolesResult, userPlansResult, verificationResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds),
        supabase
          .from('user_plans')
          .select('*')
          .in('user_id', userIds) as any,
        (async () => {
          if (userIds.length === 0) return { verificationStatuses: {}, userEmails: {} };
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const { data: verificationData } = await supabase.functions.invoke('admin-get-users-verification', {
              body: { userIds },
              headers: {
                Authorization: `Bearer ${sessionData.session?.access_token}`,
              },
            });
            return {
              verificationStatuses: verificationData?.verificationStatuses || {},
              userEmails: verificationData?.userEmails || {}
            };
          } catch {
            return { verificationStatuses: {}, userEmails: {} };
          }
        })()
      ]);

      const rolesData = rolesResult.data || [];
      // Cast user_plans result for extended schema
      interface UserPlanRow { id: string; user_id: string; status?: string; current_period_end?: string; admin_override_limits?: OverrideLimits | null }
      const userPlansData: UserPlanRow[] = (userPlansResult as any).data || [];
      const { verificationStatuses, userEmails } = verificationResult;

      const usersWithRoles = profiles?.map(profile => {
        const userPlan = userPlansData.find(up => up.user_id === profile.id);
        return {
          ...profile,
          email: userEmails[profile.id] || '',
          roles: rolesData.filter(r => r.user_id === profile.id) || [],
          email_verified: verificationStatuses[profile.id] ?? undefined,
          user_plan: userPlan ? {
            id: userPlan.id,
            status: userPlan.status ?? 'active',
            current_period_end: userPlan.current_period_end ?? null,
            admin_override_limits: userPlan.admin_override_limits ?? null,
          } : undefined,
        };
      }) || [];

      let filteredUsers = usersWithRoles;
      if (filterRole !== 'all') {
        filteredUsers = usersWithRoles.filter(u => 
          u.roles.some(r => r.role === filterRole)
        );
      }

      setUsers(filteredUsers);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_active: !isActive } : u
      ));

      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: !isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entity_type: 'user',
        entity_id: userId,
        new_values: { is_active: !isActive },
      });

      toast.success(`User ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const updateUserRole = async () => {
    if (!selectedUser) return;

    try {
      const existingRole = selectedUser.roles.find(r => r.role === newRole);
      
      if (existingRole) {
        toast.info('User already has this role');
        setShowRoleDialog(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.id,
          role: newRole as any,
        } as any);

      if (insertError) throw insertError;

      await supabase.from('audit_logs').insert({
        action: 'ROLE_CHANGED',
        entity_type: 'user',
        entity_id: selectedUser.id,
        old_values: { roles: selectedUser.roles },
        new_values: { role: newRole },
      });

      setShowRoleDialog(false);
      fetchUsers();
      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const updateUserPlan = async () => {
    if (!selectedUser || !newPlanId) return;

    setIsUpdatingPlan(true);
    try {
      const selectedPlan = plans.find(p => p.id === newPlanId);
      if (!selectedPlan) {
        toast.error('Invalid plan selected.');
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          plan_id: newPlanId,
          credits: selectedPlan.credits_per_month || 5
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      const { data: existingUserPlan } = await supabase
        .from('user_plans')
        .select('id')
        .eq('user_id', selectedUser.id)
        .maybeSingle();

      if (existingUserPlan) {
        await supabase
          .from('user_plans')
          .update({ 
            plan_id: newPlanId,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', existingUserPlan.id);
      } else {
        await supabase
          .from('user_plans')
          .insert({
            user_id: selectedUser.id,
            plan_id: newPlanId,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
      }

      await supabase.from('audit_logs').insert({
        action: 'PLAN_CHANGED',
        entity_type: 'user',
        entity_id: selectedUser.id,
        old_values: { plan_id: selectedUser.plan_id },
        new_values: { plan_id: newPlanId, plan_name: selectedPlan.name },
      });

      setShowPlanDialog(false);
      fetchUsers();
      toast.success(`Plan updated to ${selectedPlan.display_name}`);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const verifyUserEmail = async (userId: string) => {
    setIsVerifyingEmail(userId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('admin-verify-email', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, email_verified: true } : u
        ));
        toast.success('Email verified successfully');
      } else {
        throw new Error(data.error || 'Failed to verify email');
      }
    } catch (error: any) {
      console.error('Error verifying email:', error);
      toast.error(error.message || 'Failed to verify email');
    } finally {
      setIsVerifyingEmail(null);
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;

    setIsDeletingUser(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: selectedUser.id },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        setUsers(users.filter(u => u.id !== selectedUser.id));
        setTotalCount(prev => prev - 1);
        setShowDeleteDialog(false);
        setSelectedUser(null);
        toast.success('User deleted successfully');
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const adjustUserCredits = async () => {
    if (!selectedUser || creditAdjustment === 0) return;

    setIsAdjustingCredits(true);
    try {
      const newBalance = selectedUser.credits + creditAdjustment;
      
      if (newBalance < 0) {
        toast.error('Credits cannot go below 0');
        return;
      }

      // Update the user's credits
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newBalance })
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      // Log to credit_transactions for audit trail (cast for extended schema)
      const { error: txError } = await (supabase as any)
        .from('credit_transactions')
        .insert({
          user_id: selectedUser.id,
          amount: creditAdjustment,
          balance_after: newBalance,
          transaction_type: 'manual_adjustment',
          description: creditAdjustmentReason || `Manual adjustment by admin`,
          metadata: { 
            previous_balance: selectedUser.credits,
            adjustment_reason: creditAdjustmentReason 
          }
        });

      if (txError) {
        console.error('Failed to log credit transaction:', txError);
      }

      // Also log to audit_logs for admin visibility
      await supabase.from('audit_logs').insert({
        action: 'CREDITS_ADJUSTED',
        entity_type: 'user',
        entity_id: selectedUser.id,
        old_values: { credits: selectedUser.credits },
        new_values: { credits: newBalance, adjustment: creditAdjustment },
        metadata: { reason: creditAdjustmentReason }
      });

      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, credits: newBalance } : u
      ));

      setShowCreditsDialog(false);
      setCreditAdjustment(0);
      setCreditAdjustmentReason('');
      toast.success(`Credits adjusted: ${creditAdjustment > 0 ? '+' : ''}${creditAdjustment}. New balance: ${newBalance}`);
    } catch (error) {
      console.error('Error adjusting credits:', error);
      toast.error('Failed to adjust credits');
    } finally {
      setIsAdjustingCredits(false);
    }
  };

  // Extend subscription period
  const extendSubscription = async () => {
    if (!selectedUser || extensionDays <= 0) return;

    setIsExtending(true);
    try {
      // Calculate new end date
      const currentEnd = selectedUser.user_plan?.current_period_end 
        ? new Date(selectedUser.user_plan.current_period_end)
        : new Date();
      
      // If current end is in the past, start from now
      const baseDate = currentEnd > new Date() ? currentEnd : new Date();
      const newEndDate = new Date(baseDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);

      if (selectedUser.user_plan?.id) {
        // Update existing user_plan
        const { error } = await supabase
          .from('user_plans')
          .update({ 
            current_period_end: newEndDate.toISOString(),
            status: 'active'
          })
          .eq('id', selectedUser.user_plan.id);

        if (error) throw error;
      } else {
        // Create new user_plan if it doesn't exist
        const { error } = await supabase
          .from('user_plans')
          .insert({
            user_id: selectedUser.id,
            plan_id: selectedUser.plan_id,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: newEndDate.toISOString()
          });

        if (error) throw error;
      }

      // Also activate the user profile
      await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', selectedUser.id);

      // Log to audit
      await supabase.from('audit_logs').insert({
        action: 'SUBSCRIPTION_EXTENDED',
        entity_type: 'user',
        entity_id: selectedUser.id,
        old_values: { current_period_end: selectedUser.user_plan?.current_period_end },
        new_values: { current_period_end: newEndDate.toISOString(), extension_days: extensionDays },
        metadata: { reason: extensionReason }
      });

      setShowExtendDialog(false);
      setExtensionDays(30);
      setExtensionReason('');
      fetchUsers();
      toast.success(`Subscription extended by ${extensionDays} days until ${format(newEndDate, 'PPP')}`);
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast.error('Failed to extend subscription');
    } finally {
      setIsExtending(false);
    }
  };

  // Update limit overrides
  const updateLimitOverrides = async () => {
    if (!selectedUser) return;

    setIsUpdatingOverride(true);
    try {
      // Filter out empty/undefined values
      const cleanedOverrides: OverrideLimits = {};
      if (overrideLimits.max_listings !== undefined && overrideLimits.max_listings > 0) {
        cleanedOverrides.max_listings = overrideLimits.max_listings;
      }
      if (overrideLimits.max_auto_orders !== undefined && overrideLimits.max_auto_orders >= 0) {
        cleanedOverrides.max_auto_orders = overrideLimits.max_auto_orders;
      }
      if (overrideLimits.credits_per_month !== undefined && overrideLimits.credits_per_month > 0) {
        cleanedOverrides.credits_per_month = overrideLimits.credits_per_month;
      }

      const hasOverrides = Object.keys(cleanedOverrides).length > 0;

      if (selectedUser.user_plan?.id) {
        // Update existing user_plan (cast for extended schema)
        const { error } = await (supabase as any)
          .from('user_plans')
          .update({ 
            admin_override_limits: hasOverrides ? cleanedOverrides : null
          })
          .eq('id', selectedUser.user_plan.id);

        if (error) throw error;
      } else if (hasOverrides) {
        // Create new user_plan if it doesn't exist and has overrides
        const { error } = await (supabase as any)
          .from('user_plans')
          .insert([{
            user_id: selectedUser.id,
            plan_id: selectedUser.plan_id!,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            admin_override_limits: cleanedOverrides
          }]);

        if (error) throw error;
      }

      // Log to audit
      await supabase.from('audit_logs').insert([{
        action: 'LIMIT_OVERRIDE_UPDATED',
        entity_type: 'user',
        entity_id: selectedUser.id,
        old_values: { admin_override_limits: selectedUser.user_plan?.admin_override_limits } as unknown as null,
        new_values: { admin_override_limits: hasOverrides ? cleanedOverrides : null } as unknown as null
      }]);

      setShowOverrideDialog(false);
      setOverrideLimits({});
      fetchUsers();
      toast.success(hasOverrides ? 'Limit overrides applied successfully' : 'Limit overrides cleared');
    } catch (error) {
      console.error('Error updating limit overrides:', error);
      toast.error('Failed to update limit overrides');
    } finally {
      setIsUpdatingOverride(false);
    }
  };

  const exportUsers = () => {
    const headers = ['User ID', 'Email', 'Name', 'Credits', 'Status', 'Roles', 'Joined', 'Last Login'];
    const csvContent = [
      headers.join(','),
      ...users.map(user => [
        generateUserId(user.id),
        user.email,
        user.full_name || '',
        user.credits,
        user.is_active ? 'Active' : 'Inactive',
        user.roles.map(r => r.role).join(';'),
        format(new Date(user.created_at), 'yyyy-MM-dd'),
        user.last_login ? format(new Date(user.last_login), 'yyyy-MM-dd') : 'Never',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Users exported successfully');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      generateUserId(user.id).toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'id':
        comparison = generateUserId(a.id).localeCompare(generateUserId(b.id));
        break;
      case 'name':
        comparison = (a.full_name || '').localeCompare(b.full_name || '');
        break;
      case 'credits':
        comparison = a.credits - b.credits;
        break;
      case 'status':
        comparison = (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'last_login':
        const aLogin = a.last_login ? new Date(a.last_login).getTime() : 0;
        const bLogin = b.last_login ? new Date(b.last_login).getTime() : 0;
        comparison = aLogin - bLogin;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const activeCount = users.filter(u => u.is_active).length;
  const activePercentage = totalCount > 0 ? Math.round((activeCount / users.length) * 100) : 0;

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-primary' : 'opacity-50'}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Customer List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount.toLocaleString()} Customers found. {activePercentage}% are active
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportUsers} className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <span className="hidden sm:inline">More Actions</span>
                <span className="sm:hidden">More</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={fetchUsers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh List
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                Email Selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="gap-2 bg-primary">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </motion.div>

      {/* Users Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="py-3 sm:py-4 px-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
            <CardTitle className="text-base font-semibold">Customers</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="py-3 px-4 w-10">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left py-3 px-4">
                      <SortableHeader field="id">User ID</SortableHeader>
                    </th>
                    <th className="text-left py-3 px-4">
                      <SortableHeader field="name">Customer</SortableHeader>
                    </th>
                    <th className="text-left py-3 px-4">
                      <span className="text-xs font-medium text-muted-foreground">Country</span>
                    </th>
                    <th className="text-left py-3 px-4">
                      <SortableHeader field="credits">Credits</SortableHeader>
                    </th>
                    <th className="text-left py-3 px-4">
                      <span className="text-xs font-medium text-muted-foreground">Role</span>
                    </th>
                    <th className="text-left py-3 px-4">
                      <SortableHeader field="status">Status</SortableHeader>
                    </th>
                    <th className="text-left py-3 px-4">
                      <SortableHeader field="last_login">Last Login</SortableHeader>
                    </th>
                    <th className="text-right py-3 px-4 w-28">
                      <span className="text-xs font-medium text-muted-foreground">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Loading customers...</p>
                      </td>
                    </tr>
                  ) : sortedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12">
                        <p className="text-sm text-muted-foreground">No customers found</p>
                      </td>
                    </tr>
                  ) : (
                    sortedUsers.map((user) => {
                      const country = getUserCountry(user.id);
                      const userId = generateUserId(user.id);
                      
                      return (
                        <tr 
                          key={user.id} 
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={() => toggleSelectUser(user.id)}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-primary">
                              {userId}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-border">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {user.full_name || 'Unknown'}
                                  </p>
                                  {user.email_verified === true && (
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{country.flag}</span>
                              <span className="text-sm text-foreground">{country.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-foreground">{user.credits}</span>
                          </td>
                          <td className="py-3 px-4">
                            {user.roles.some(r => r.role === 'super_admin') ? (
                              <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Super Admin</Badge>
                            ) : user.roles.some(r => r.role === 'admin') ? (
                              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">Admin</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">User</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              className={
                                user.is_active 
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs' 
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs'
                              }
                            >
                              {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground">
                              {user.last_login
                                ? format(new Date(user.last_login), 'dd MMM, yyyy')
                                : 'Never'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDetailsDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewRole((user.roles[0]?.role as any) || 'user');
                                  setShowRoleDialog(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Loading customers...</p>
                </div>
              ) : sortedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No customers found</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {sortedUsers.map((user) => {
                    const country = getUserCountry(user.id);
                    const userId = generateUserId(user.id);
                    
                    return (
                      <div 
                        key={user.id} 
                        className="p-4 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleSelectUser(user.id)}
                            className="mt-1"
                          />
                          <Avatar className="h-10 w-10 border border-border flex-shrink-0">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {user.full_name || 'Unknown'}
                                  </p>
                                  {user.email_verified === true && (
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedUser(user);
                                    setShowDetailsDialog(true);
                                  }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedUser(user);
                                    setNewRole((user.roles[0]?.role as any) || 'user');
                                    setShowRoleDialog(true);
                                  }}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedUser(user);
                                    setCreditAdjustment(0);
                                    setCreditAdjustmentReason('');
                                    setShowCreditsDialog(true);
                                  }}>
                                    <Coins className="h-4 w-4 mr-2" />
                                    Adjust Credits
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedUser(user);
                                    setExtensionDays(30);
                                    setExtensionReason('');
                                    setShowExtendDialog(true);
                                  }}>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Extend Subscription
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedUser(user);
                                    setOverrideLimits(user.user_plan?.admin_override_limits || {});
                                    setShowOverrideDialog(true);
                                  }}>
                                    <Settings2 className="h-4 w-4 mr-2" />
                                    Override Limits
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowDeleteDialog(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span className="text-primary font-medium">{userId}</span>
                              <span>•</span>
                              <span>{country.flag} {country.name}</span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge 
                                className={
                                  user.is_active 
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs' 
                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs'
                                }
                              >
                                {user.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {user.roles.some(r => r.role === 'super_admin') ? (
                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Super Admin</Badge>
                              ) : user.roles.some(r => r.role === 'admin') ? (
                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">Admin</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">User</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                <Coins className="h-3 w-3 inline mr-1" />
                                {user.credits} credits
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-border">
              <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2 sm:px-3"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Prev</span>
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground min-w-[80px] text-center">
                  {currentPage} / {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-2 sm:px-3"
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateUserRole}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-border">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.id}`} />
                  <AvatarFallback className="text-lg sm:text-xl bg-primary/10 text-primary">
                    {selectedUser.full_name?.charAt(0) || selectedUser.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold truncate">{selectedUser.full_name || 'Unknown'}</h3>
                  <p className="text-sm text-muted-foreground truncate">{selectedUser.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">ID: {generateUserId(selectedUser.id)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                  <p className="text-xs sm:text-sm text-muted-foreground">Credits</p>
                  <p className="text-xl sm:text-2xl font-bold">{selectedUser.credits}</p>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                  <p className="text-xs sm:text-sm text-muted-foreground">Status</p>
                  <Badge className={`${selectedUser.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'} mt-1`}>
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                  <p className="text-xs sm:text-sm text-muted-foreground">Email Verified</p>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedUser.email_verified === true ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-500 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Verified
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                  <p className="text-xs sm:text-sm text-muted-foreground">Joined</p>
                  <p className="text-sm font-medium">{format(new Date(selectedUser.created_at), 'PP')}</p>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                  <p className="text-xs sm:text-sm text-muted-foreground">Last Login</p>
                  <p className="text-sm font-medium">
                    {selectedUser.last_login 
                      ? format(new Date(selectedUser.last_login), 'PP')
                      : 'Never'}
                  </p>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                  <p className="text-xs sm:text-sm text-muted-foreground">Subscription Expires</p>
                  <p className="text-sm font-medium">
                    {selectedUser.user_plan?.current_period_end 
                      ? format(new Date(selectedUser.user_plan.current_period_end), 'PP')
                      : 'N/A'}
                  </p>
                  {selectedUser.user_plan?.current_period_end && new Date(selectedUser.user_plan.current_period_end) < new Date() && (
                    <Badge className="bg-destructive/10 text-destructive text-xs mt-1">Expired</Badge>
                  )}
                </div>
                {selectedUser.user_plan?.admin_override_limits && Object.keys(selectedUser.user_plan.admin_override_limits).length > 0 && (
                  <div className="p-3 sm:p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 col-span-2">
                    <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 font-medium mb-1">Custom Limit Overrides</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {selectedUser.user_plan.admin_override_limits.max_listings && (
                        <span className="px-2 py-1 rounded bg-background">
                          Listings: {selectedUser.user_plan.admin_override_limits.max_listings}
                        </span>
                      )}
                      {selectedUser.user_plan.admin_override_limits.max_auto_orders !== undefined && (
                        <span className="px-2 py-1 rounded bg-background">
                          Orders: {selectedUser.user_plan.admin_override_limits.max_auto_orders}
                        </span>
                      )}
                      {selectedUser.user_plan.admin_override_limits.credits_per_month && (
                        <span className="px-2 py-1 rounded bg-background">
                          Credits/mo: {selectedUser.user_plan.admin_override_limits.credits_per_month}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {selectedUser.email_verified === false && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => verifyUserEmail(selectedUser.id)}
                    disabled={isVerifyingEmail === selectedUser.id}
                    className="w-full text-xs sm:text-sm"
                  >
                    {isVerifyingEmail === selectedUser.id ? (
                      <>
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                        <span className="truncate">Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="truncate">Verify Email</span>
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleUserStatus(selectedUser.id, selectedUser.is_active)}
                  className="w-full text-xs sm:text-sm"
                >
                  {selectedUser.is_active ? (
                    <>
                      <UserX className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="truncate">Deactivate</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="truncate">Activate</span>
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setNewPlanId(selectedUser.plan_id || '');
                    setShowDetailsDialog(false);
                    setShowPlanDialog(true);
                  }}
                  className="w-full text-xs sm:text-sm"
                >
                  <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="truncate">Change Plan</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setCreditAdjustment(0);
                    setCreditAdjustmentReason('');
                    setShowDetailsDialog(false);
                    setShowCreditsDialog(true);
                  }}
                  className="w-full text-xs sm:text-sm"
                >
                  <Coins className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="truncate">Adjust Credits</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setExtensionDays(30);
                    setExtensionReason('');
                    setShowDetailsDialog(false);
                    setShowExtendDialog(true);
                  }}
                  className="w-full text-xs sm:text-sm"
                >
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="truncate">Extend Subscription</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setOverrideLimits(selectedUser.user_plan?.admin_override_limits || {});
                    setShowDetailsDialog(false);
                    setShowOverrideDialog(true);
                  }}
                  className="w-full text-xs sm:text-sm"
                >
                  <Settings2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="truncate">Override Limits</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Plan</DialogTitle>
            <DialogDescription>
              Update the subscription plan for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.display_name} ({plan.credits_per_month} credits/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateUserPlan} disabled={isUpdatingPlan}>
              {isUpdatingPlan ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.email}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteUser}
              disabled={isDeletingUser}
            >
              {isDeletingUser ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Credits Dialog */}
      <Dialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust User Credits</DialogTitle>
            <DialogDescription>
              Manually adjust credits for {selectedUser?.email}. Current balance: <strong>{selectedUser?.credits}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Adjustment Amount</Label>
              <Input
                type="number"
                value={creditAdjustment}
                onChange={(e) => setCreditAdjustment(parseInt(e.target.value) || 0)}
                placeholder="Enter positive or negative number"
              />
              <p className="text-xs text-muted-foreground">
                Use positive numbers to add credits, negative to deduct. 
                New balance will be: <strong>{(selectedUser?.credits || 0) + creditAdjustment}</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={creditAdjustmentReason}
                onChange={(e) => setCreditAdjustmentReason(e.target.value)}
                placeholder="e.g., Compensation for service issue, Promotional credits, etc."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreditAdjustment(5)}
                type="button"
              >
                +5
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreditAdjustment(10)}
                type="button"
              >
                +10
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreditAdjustment(25)}
                type="button"
              >
                +25
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreditAdjustment(-5)}
                type="button"
              >
                -5
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={adjustUserCredits} 
              disabled={isAdjustingCredits || creditAdjustment === 0}
            >
              {isAdjustingCredits ? 'Adjusting...' : 'Adjust Credits'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Extend Subscription
            </DialogTitle>
            <DialogDescription>
              Extend the subscription period for {selectedUser?.email}
              {selectedUser?.user_plan?.current_period_end && (
                <span className="block mt-1">
                  Current expiry: <strong>{format(new Date(selectedUser.user_plan.current_period_end), 'PPP')}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Extension Period (days)</Label>
              <Input
                type="number"
                value={extensionDays}
                onChange={(e) => setExtensionDays(parseInt(e.target.value) || 0)}
                min={1}
                max={365}
              />
              <p className="text-xs text-muted-foreground">
                New expiry date will be:{' '}
                <strong>
                  {format(
                    new Date(
                      (selectedUser?.user_plan?.current_period_end 
                        ? new Date(selectedUser.user_plan.current_period_end) > new Date()
                          ? new Date(selectedUser.user_plan.current_period_end)
                          : new Date()
                        : new Date()
                      ).getTime() + extensionDays * 24 * 60 * 60 * 1000
                    ),
                    'PPP'
                  )}
                </strong>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setExtensionDays(7)}>+7 days</Button>
              <Button variant="outline" size="sm" onClick={() => setExtensionDays(14)}>+14 days</Button>
              <Button variant="outline" size="sm" onClick={() => setExtensionDays(30)}>+30 days</Button>
              <Button variant="outline" size="sm" onClick={() => setExtensionDays(90)}>+90 days</Button>
              <Button variant="outline" size="sm" onClick={() => setExtensionDays(365)}>+1 year</Button>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="e.g., Compensation, VIP customer, Bug fix downtime, etc."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={extendSubscription} 
              disabled={isExtending || extensionDays <= 0}
            >
              {isExtending ? 'Extending...' : 'Extend Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Limits Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Override Plan Limits
            </DialogTitle>
            <DialogDescription>
              Set custom limits for {selectedUser?.email} that override their plan defaults.
              Leave fields empty to use the plan's default values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedUser?.user_plan?.admin_override_limits && Object.keys(selectedUser.user_plan.admin_override_limits).length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  This user has existing limit overrides. Saving will replace them.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Max Listings (leave empty for plan default)</Label>
              <Input
                type="number"
                value={overrideLimits.max_listings ?? ''}
                onChange={(e) => setOverrideLimits(prev => ({
                  ...prev,
                  max_listings: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                placeholder="e.g., 100"
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Auto Orders / Month (leave empty for plan default)</Label>
              <Input
                type="number"
                value={overrideLimits.max_auto_orders ?? ''}
                onChange={(e) => setOverrideLimits(prev => ({
                  ...prev,
                  max_auto_orders: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                placeholder="e.g., 50"
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Credits Per Month (leave empty for plan default)</Label>
              <Input
                type="number"
                value={overrideLimits.credits_per_month ?? ''}
                onChange={(e) => setOverrideLimits(prev => ({
                  ...prev,
                  credits_per_month: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                placeholder="e.g., 100"
                min={0}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="text-destructive"
              onClick={() => setOverrideLimits({})}
            >
              Clear All Overrides
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={updateLimitOverrides} 
              disabled={isUpdatingOverride}
            >
              {isUpdatingOverride ? 'Saving...' : 'Save Overrides'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}