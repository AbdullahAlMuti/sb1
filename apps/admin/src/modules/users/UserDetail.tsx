import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Button } from "@repo/ui/components/ui/button";
import { Calendar, CheckCircle, Coins, CreditCard, RefreshCw, Settings2, ShieldCheck, UserCog } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { StateLayout } from "@/core/ui/StateLayout";
import { ConfirmDialog } from "@/core/ui/ConfirmDialog";
import { AuditTrailList } from "@/core/ui/AuditTrailList";
import { RequireRole } from "@/core/auth/RequireRole";
import { EntityFormDialog } from "@/core/entity/EntityFormDialog";
import { type FieldDef, type FormValues } from "@/core/entity/types";
import { useUserStats } from "./useUsers";
import {
  useAdjustCredits,
  useChangePlan,
  useChangeRole,
  useExtendSubscription,
  usePlansList,
  useQueueResync,
  useToggleStatus,
  useUpdateLimits,
  useVerifyEmail,
} from "./userActions";

type Action = "credits" | "plan" | "extend" | "limits" | "role" | null;

const money = (n: unknown) => `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

/** User-360 detail + every operator action, each routed through an audited RPC. */
export function UserDetail({ userId, open, onOpenChange }: { userId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: u, isLoading, isError, refetch } = useUserStats(userId);
  const { data: plans = [] } = usePlansList();
  const [action, setAction] = useState<Action>(null);
  const [confirmStatus, setConfirmStatus] = useState(false);

  const id = userId ?? "";
  const adjustCredits = useAdjustCredits(id);
  const changePlan = useChangePlan(id);
  const extend = useExtendSubscription(id);
  const updateLimits = useUpdateLimits(id);
  const changeRole = useChangeRole(id);
  const toggleStatus = useToggleStatus(id);
  const verifyEmail = useVerifyEmail(id);
  const queueResync = useQueueResync(id);

  const actionFields: Record<Exclude<Action, null>, FieldDef[]> = {
    credits: [
      { name: "amount", label: "Amount (+ grant / − revoke)", type: "number", required: true },
      { name: "reason", label: "Reason (logged)", type: "textarea", required: true, rows: 2 },
    ],
    plan: [
      { name: "planId", label: "Plan", type: "select", required: true, options: plans.map((p) => ({ value: p.id, label: p.display_name })) },
      { name: "reason", label: "Reason (optional)", type: "textarea", rows: 2 },
    ],
    extend: [
      { name: "days", label: "Days to extend", type: "number", required: true },
      { name: "reason", label: "Reason (optional)", type: "textarea", rows: 2 },
    ],
    limits: [
      { name: "maxListings", label: "Max listings", type: "number" },
      { name: "maxAutoOrders", label: "Max auto orders", type: "number" },
      { name: "creditsPerMonth", label: "Credits per month", type: "number" },
      { name: "reason", label: "Reason (logged)", type: "textarea", required: true, rows: 2 },
    ],
    role: [
      {
        name: "newRole",
        label: "Role",
        type: "select",
        required: true,
        options: [
          { value: "user", label: "User" },
          { value: "admin", label: "Admin" },
          { value: "super_admin", label: "Super Admin" },
        ],
      },
    ],
  };

  const submitAction = async (values: FormValues) => {
    switch (action) {
      case "credits":
        await adjustCredits.mutateAsync({ amount: Number(values.amount) || 0, reason: String(values.reason ?? "") });
        break;
      case "plan":
        await changePlan.mutateAsync({ planId: String(values.planId), reason: String(values.reason ?? "Plan changed by admin") });
        break;
      case "extend":
        await extend.mutateAsync({ days: Number(values.days) || 0, reason: String(values.reason ?? "Subscription extended") });
        break;
      case "limits":
        await updateLimits.mutateAsync({
          maxListings: Number(values.maxListings) || 0,
          maxAutoOrders: Number(values.maxAutoOrders) || 0,
          creditsPerMonth: Number(values.creditsPerMonth) || 0,
          reason: String(values.reason ?? ""),
        });
        break;
      case "role":
        await changeRole.mutateAsync({ newRole: String(values.newRole) });
        break;
    }
    setAction(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
            <DialogDescription>{u?.email ?? "Loading user…"}</DialogDescription>
          </DialogHeader>

          <StateLayout isLoading={isLoading} isError={isError} onRetry={() => refetch()}>
            {u && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Stat label="Status">
                    <StatusBadge value={u.is_active ? "active" : "inactive"} />
                  </Stat>
                  <Stat label="Plan">
                    {u.plan_name} <span className="text-xs font-normal text-slate-500">({u.plan_status})</span>
                  </Stat>
                  <Stat label="Stripe">{u.stripe_status}</Stat>
                  <Stat label="Credits">{u.credits.toLocaleString()}</Stat>
                  <Stat label="Active listings">{u.active_listings.toLocaleString()}</Stat>
                  <Stat label="Inventory value">{money(u.inventory_value)}</Stat>
                  <Stat label="Orders">{u.total_orders.toLocaleString()}</Stat>
                  <Stat label="Revenue">{money(u.revenue)}</Stat>
                  <Stat label="Success rate">{u.success_rate}%</Stat>
                  <Stat label="Sync">
                    <StatusBadge value={u.sync_status} />
                  </Stat>
                  <Stat label="Last sync">{u.last_sync_at ? format(new Date(u.last_sync_at), "PP") : "Never"}</Stat>
                  <Stat label="Sub. expires">
                    {u.subscription_period_end ? format(new Date(u.subscription_period_end), "PP") : "N/A"}
                  </Stat>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Button variant="outline" size="sm" onClick={() => setAction("credits")}><Coins className="mr-2 h-4 w-4" />Credits</Button>
                  <Button variant="outline" size="sm" onClick={() => setAction("plan")}><CreditCard className="mr-2 h-4 w-4" />Change plan</Button>
                  <Button variant="outline" size="sm" onClick={() => setAction("extend")}><Calendar className="mr-2 h-4 w-4" />Extend</Button>
                  <RequireRole role="super_admin">
                    <Button variant="outline" size="sm" onClick={() => setAction("limits")}><Settings2 className="mr-2 h-4 w-4" />Limits</Button>
                  </RequireRole>
                  <RequireRole role="super_admin">
                    <Button variant="outline" size="sm" onClick={() => setAction("role")}><ShieldCheck className="mr-2 h-4 w-4" />Role</Button>
                  </RequireRole>
                  <Button variant="outline" size="sm" onClick={() => verifyEmail.mutate()} disabled={verifyEmail.isPending}>
                    <CheckCircle className="mr-2 h-4 w-4" />Verify email
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => queueResync.mutate()} disabled={queueResync.isPending}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${queueResync.isPending ? "animate-spin" : ""}`} />Queue resync
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={u.is_active ? "text-destructive hover:text-destructive" : ""}
                    onClick={() => setConfirmStatus(true)}
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    {u.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Recent activity</p>
                  <AuditTrailList targetUserId={u.id} limit={10} />
                </div>
              </div>
            )}
          </StateLayout>
        </DialogContent>
      </Dialog>

      {action && (
        <EntityFormDialog
          open
          onOpenChange={(o) => !o && setAction(null)}
          title={
            action === "credits" ? "Adjust credits"
            : action === "plan" ? "Change plan"
            : action === "extend" ? "Extend subscription"
            : action === "limits" ? "Override limits"
            : "Change role"
          }
          fields={actionFields[action]}
          initialValues={action === "extend" ? { days: 30 } : {}}
          onSubmit={submitAction}
        />
      )}

      <ConfirmDialog
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={u?.is_active ? "Deactivate account" : "Activate account"}
        description={`${u?.is_active ? "Deactivate" : "Activate"} ${u?.email}?`}
        destructive={u?.is_active}
        reasonRequired
        confirmLabel={u?.is_active ? "Deactivate" : "Activate"}
        onConfirm={async (reason) => {
          await toggleStatus.mutateAsync({ isActive: !u?.is_active, reason });
        }}
      />
    </>
  );
}
