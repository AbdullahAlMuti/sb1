import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import { Input } from "@repo/ui/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "@/components/admin-dashboard/MetricCard";
import { StatusBadge } from "@/components/admin-dashboard/StatusBadge";

interface AdminModulePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  primaryAction?: string;
  moduleType?: "users" | "commerce" | "operations" | "billing" | "security" | "general";
}



export default function AdminModulePage({
  title,
  description,
  icon: Icon,
  primaryAction = "Create",
  moduleType = "general",
}: AdminModulePageProps) {
  const navigate = useNavigate();

  const rows = useMemo(
    () => [
      { name: "Dreamy Home Store", owner: "dreamy-home.myshopify.com", provider: "Shopify", status: "Healthy", priority: "Low", updated: "May 31, 10:24 AM", action: "Review" },
      { name: "TopRatedDeals", owner: "toprateddeals", provider: "eBay", status: "Healthy", priority: "Low", updated: "May 31, 09:12 AM", action: "View Logs" },
      { name: "USA Seller Central", owner: "US Trading Co.", provider: "Amazon", status: "Reconnect", priority: "High", updated: "May 30, 11:45 PM", action: "Reconnect" },
      { name: "Modern Living Store", owner: "modernliving.myshopify.com", provider: "Shopify", status: "Error", priority: "Critical", updated: "May 31, 07:18 AM", action: "Fix Now" },
      { name: "Collectibles Hub", owner: "collectibleshub", provider: "eBay", status: "Warning", priority: "Medium", updated: "May 30, 06:32 PM", action: "Review" },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl border-slate-200">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            {primaryAction}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Records"
          value="3,892"
          trend={14.3}
          comparison="vs previous period"
          action="View all"
          icon={Icon}
          tone="green"
          sparkline={[12, 18, 16, 22, 27, 29, 35]}
        />
        <MetricCard
          title="Needs Attention"
          value="23"
          trend={-18.6}
          comparison="open issues"
          action="Review queue"
          icon={AlertTriangle}
          tone="red"
          sparkline={[25, 24, 20, 18, 16, 14, 12]}
        />
        <MetricCard
          title="Healthy"
          value="96.4%"
          trend={4.2}
          comparison="service health"
          action="View health"
          icon={CheckCircle2}
          tone="green"
          sparkline={[60, 62, 61, 65, 70, 73, 76]}
        />
        <MetricCard
          title="Actions Today"
          value="148"
          trend={9.7}
          comparison="admin actions"
          action="View activity"
          icon={RefreshCw}
          tone="blue"
          sparkline={[18, 22, 24, 28, 31, 29, 35]}
        />
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">{title} Work Queue</CardTitle>
              <p className="text-sm text-slate-500">
                Search, filter, bulk manage, and inspect records without leaving the page.
              </p>
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-2 lg:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 lg:w-[170px]">
              <Checkbox />
              <span>0 selected</span>
            </div>
            <Select defaultValue="bulk">
              <SelectTrigger className="h-10 rounded-xl border-slate-200 lg:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bulk">Bulk Actions</SelectItem>
                <SelectItem value="enable">Enable</SelectItem>
                <SelectItem value="disable">Disable</SelectItem>
                <SelectItem value="notify">Send Notification</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-10 rounded-xl border-slate-200 lg:w-[120px]">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <div className="relative flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder={`Search ${title.toLowerCase()}...`} className="h-10 rounded-xl border-slate-200 pl-9" />
            </div>
            <Button variant="outline" className="h-10 rounded-xl border-slate-200 lg:ml-auto">
              <Settings2 className="mr-2 h-4 w-4" />
              Columns
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead className="w-10"><Checkbox /></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>{moduleType === "users" ? "Email / Owner" : "Owner / Source"}</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.name} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/integrations/${index}`)}>
                    <TableCell onClick={(event) => event.stopPropagation()}><Checkbox /></TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{row.name}</div>
                      <div className="text-xs text-slate-500">Managed from unified admin</div>
                    </TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>{row.provider}</TableCell>
                    <TableCell><StatusBadge value={row.status} /></TableCell>
                    <TableCell><StatusBadge value={row.priority} /></TableCell>
                    <TableCell>{row.updated}</TableCell>
                    <TableCell>
                      <Button variant="link" className="h-auto p-0 text-xs font-semibold text-blue-600">
                        {row.action}
                      </Button>
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()} className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200" onClick={() => navigate(`/integrations/${index}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Retry</DropdownMenuItem>
                            <DropdownMenuItem>View logs</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Disable</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            <span>Showing 1 to {rows.length} of {rows.length} records</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-200">Previous</Button>
              <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-200">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
