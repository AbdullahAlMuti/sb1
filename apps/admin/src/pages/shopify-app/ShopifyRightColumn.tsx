import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Progress } from "@repo/ui/components/ui/progress";
import { CheckCircle2, XCircle, Clock, Sparkles, Zap, UserPlus } from "lucide-react";

export default function ShopifyRightColumn() {
  return (
    <div className="space-y-6">
      {/* Subscription Overview */}
      <Card className="shadow-none border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold">Subscription Overview</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 hover:bg-muted/50">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 py-4">
            {/* Mock Donut Chart using CSS */}
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-muted">
              <div
                className="absolute inset-0 rounded-full border-8 border-emerald-500"
                style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 50%)" }}
              />
              <div
                className="absolute inset-0 rounded-full border-8 border-amber-500"
                style={{ clipPath: "polygon(100% 100%, 100% 50%, 50% 50%)" }}
              />
              <div
                className="absolute inset-0 rounded-full border-8 border-rose-500"
                style={{ clipPath: "polygon(0 0, 50% 0, 50% 50%)" }}
              />
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-sm font-bold">12,634</span>
                <span className="text-[9px] text-muted-foreground leading-none">Total Users</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" /> Paid Users
                </div>
                <span className="font-medium">4,892 (38.7%)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-amber-500" /> Trial Users
                </div>
                <span className="font-medium">2,156 (17.1%)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/30" /> Free Users
                </div>
                <span className="font-medium">5,068 (40.1%)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-rose-500" /> Cancelled
                </div>
                <span className="font-medium">518 (4.1%)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Features Usage */}
      <Card className="shadow-none border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm font-semibold">Top Features Usage</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 hover:bg-muted/50">
            View All
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { name: "Product Research", value: 78 },
            { name: "Winning Products", value: 64 },
            { name: "AI Copy Studio", value: 56 },
            { name: "Ad Library", value: 48 },
            { name: "Store Explorer", value: 42 },
          ].map((feature) => (
            <div key={feature.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium flex items-center gap-2">
                  <div className="h-3.5 w-3.5 rounded bg-muted flex items-center justify-center">
                    <Sparkles className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                  {feature.name}
                </span>
                <span className="text-muted-foreground">{feature.value}%</span>
              </div>
              <Progress value={feature.value} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="shadow-none border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 hover:bg-muted/50">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                icon: UserPlus,
                title: "New user registered",
                desc: "Olivia Rhye joined using Pro plan",
                time: "2m ago",
                color: "text-emerald-500",
                bg: "bg-emerald-50",
                dot: "bg-emerald-500",
              },
              {
                icon: CheckCircle2,
                title: "Subscription renewed",
                desc: "Liam Johnson's Pro plan renewed",
                time: "1h ago",
                color: "text-emerald-500",
                bg: "bg-emerald-50",
                dot: "bg-emerald-500",
              },
              {
                icon: XCircle,
                title: "Payment failed",
                desc: "Noah Williams - Pro plan payment failed",
                time: "3h ago",
                color: "text-rose-500",
                bg: "bg-rose-50",
                dot: "bg-rose-500",
              },
              {
                icon: Sparkles,
                title: "AI Copy generated",
                desc: "Emma Brown generated 5 copies",
                time: "5h ago",
                color: "text-blue-500",
                bg: "bg-blue-50",
                dot: "bg-blue-500",
              },
              {
                icon: Clock,
                title: "Feature limit reached",
                desc: "Lucas Davis reached Product Research limit",
                time: "6h ago",
                color: "text-amber-500",
                bg: "bg-amber-50",
                dot: "bg-amber-500",
              },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${activity.bg} ${activity.color}`}>
                  <activity.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-0.5 min-w-0">
                  <p className="text-xs font-medium text-foreground">{activity.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{activity.desc}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className={`h-1.5 w-1.5 rounded-full ${activity.dot}`} />
                  <span className="text-[10px] text-muted-foreground">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
