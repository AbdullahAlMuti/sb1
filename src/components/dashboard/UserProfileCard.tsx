import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Shield, Settings, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function UserProfileCard() {
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();
  const { planName, subscribed, subscriptionEnd } = useSubscription();

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header with gradient */}
      <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
      
      {/* Profile Info */}
      <div className="px-5 pb-5 -mt-8">
        <div className="flex items-end gap-4 mb-4">
          <Avatar className="h-16 w-16 border-4 border-card shadow-lg">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pb-1">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {profile?.full_name || 'User'}
            </h3>
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              {user?.email}
            </p>
          </div>
        </div>

        {/* Plan & Status */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Plan</span>
            <Badge 
              variant={subscribed ? 'default' : 'secondary'}
              className={cn(
                "font-medium",
                subscribed && "bg-primary/10 text-primary border-primary/20"
              )}
            >
              <Shield className="h-3 w-3 mr-1" />
              {planName || 'No Plan'}
            </Badge>
          </div>

          {subscribed && subscriptionEnd && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Renews</span>
              <span className="text-sm text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {format(new Date(subscriptionEnd), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Credits</span>
            <span className="text-sm font-medium text-foreground">
              {profile?.credits ?? 0} remaining
            </span>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-500">
                Admin
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Member Since</span>
            <span className="text-sm text-foreground">
              {user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A'}
            </span>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Quick Actions */}
        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => navigate('/dashboard/subscription')}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {subscribed ? 'Manage Subscription' : 'Upgrade Plan'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => navigate('/dashboard/settings')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Account Settings
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
