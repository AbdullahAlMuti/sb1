import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Shield, Settings, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { Separator } from '@repo/ui/components/ui/separator';
import { format } from 'date-fns';
import { cn } from '@repo/ui/lib/utils';

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
    <div className="bg-card/50 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-border">
      {/* Header with gradient */}
      <div className="h-20 bg-gradient-to-r from-primary/30 via-accent/20 to-transparent" />
      
      {/* Profile Info */}
      <div className="px-6 pb-6 -mt-10">
        <div className="flex items-end gap-4 mb-5">
          <Avatar className="h-20 w-20 border-4 border-card shadow-2xl transition-all duration-300 hover:scale-105">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pb-1">
            <h3 className="text-xl font-display font-bold text-foreground truncate leading-tight">
              {profile?.full_name || 'User'}
            </h3>
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              {user?.email}
            </p>
          </div>
        </div>

        {/* Plan & Status */}
        <div className="space-y-3.5 mb-5 bg-muted/20 p-4 rounded-xl border border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Plan</span>
            <Badge 
              variant={subscribed ? 'default' : 'secondary'}
              className={cn(
                "font-semibold px-2.5 py-0.5",
                subscribed && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              )}
            >
              <Shield className="h-3 w-3 mr-1" />
              {planName || 'No Plan'}
            </Badge>
          </div>

          {subscribed && subscriptionEnd && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Renews</span>
              <span className="text-xs text-foreground flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {format(new Date(subscriptionEnd), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Credits</span>
            <span className="text-xs font-bold text-foreground">
              {profile?.credits ?? 0} remaining
            </span>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</span>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wide border-amber-500/30 text-amber-500 bg-amber-500/5">
                Admin
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Member Since</span>
            <span className="text-xs font-medium text-foreground">
              {user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A'}
            </span>
          </div>
        </div>

        <Separator className="my-5 bg-border/50" />

        {/* Quick Actions */}
        <div className="grid gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start text-xs font-medium border-border/60 hover:bg-muted"
            onClick={() => navigate('/dashboard/subscription')}
          >
            <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
            {subscribed ? 'Manage Subscription' : 'Upgrade Plan'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start text-xs font-medium border-border/60 hover:bg-muted"
            onClick={() => navigate('/dashboard/settings')}
          >
            <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
            Account Settings
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5"
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
