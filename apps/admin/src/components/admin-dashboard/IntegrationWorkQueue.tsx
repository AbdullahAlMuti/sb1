import { Eye, MoreHorizontal, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import { Input } from "@repo/ui/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import type { IntegrationRecord } from "./DetailDrawer";

const providerStyles = {
  Shopify: "bg-emerald-50 text-emerald-700 border-emerald-200",
  eBay: "bg-blue-50 text-blue-700 border-blue-200",
  Amazon: "bg-orange-50 text-orange-700 border-orange-200",
};

interface IntegrationWorkQueueProps {
  records: IntegrationRecord[];
  onSelect: (record: IntegrationRecord) => void;
}

export function IntegrationWorkQueue({ records, onSelect }: IntegrationWorkQueueProps) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-none">
      <div className="border-b border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-foreground">Integration Work Queue</h2>
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                {records.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Manage health of marketplace integrations</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-8 rounded-lg border-border text-xs">
              Export
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 lg:flex-row">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground lg:w-[150px]">
            <Checkbox />
            <span>0 selected</span>
          </div>
          <Select defaultValue="bulk">
            <SelectTrigger className="h-8 rounded-lg border-border text-xs lg:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bulk">Bulk Actions</SelectItem>
              <SelectItem value="retry">Retry Sync</SelectItem>
              <SelectItem value="notify">Send Notification</SelectItem>
              <SelectItem value="export">Export Selected</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" className="h-8 rounded-lg border-border text-xs lg:w-[100px]">
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
            Filters
          </Button>
          <Select defaultValue="all">
            <SelectTrigger className="h-8 rounded-lg border-border text-xs lg:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Search integrations..." className="h-8 rounded-lg border-border text-xs lg:max-w-[240px]" />
          <Button type="button" variant="outline" className="h-8 rounded-lg border-border text-xs lg:ml-auto">
            Customize
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70">
              <TableHead className="w-10"><Checkbox /></TableHead>
              <TableHead>Marketplace Account</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Workspace / Store</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead>Next Action</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id} className="cursor-pointer hover:bg-slate-50" onClick={() => onSelect(record)}>
                <TableCell onClick={(event) => event.stopPropagation()}><Checkbox /></TableCell>
                <TableCell>
                  <div className="text-xs font-medium text-foreground">{record.account}</div>
                  <div className="text-[10px] text-muted-foreground">{record.subtext}</div>
                </TableCell>
                <TableCell>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${providerStyles[record.provider]}`}>
                    {record.provider}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-medium text-foreground">{record.workspace}</div>
                  <div className="text-[10px] text-muted-foreground">ID: ws_{record.id}</div>
                </TableCell>
                <TableCell><StatusBadge value={record.health} /></TableCell>
                <TableCell>
                  <div className="text-xs font-medium text-foreground">{record.lastSync}</div>
                  <div className="text-[10px] text-muted-foreground">{record.duration}</div>
                </TableCell>
                <TableCell>
                  <span className={record.issues > 0 ? "text-xs font-medium text-red-600" : "text-xs text-muted-foreground"}>
                    {record.issues}
                  </span>
                </TableCell>
                <TableCell>
                  <Button type="button" variant="link" className="h-auto p-0 text-[11px] font-medium text-blue-600">
                    {record.nextAction}
                  </Button>
                </TableCell>
                <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                  <div className="flex justify-end gap-1.5">
                    <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-md border-border" onClick={() => onSelect(record)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-md border-border">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Retry sync</DropdownMenuItem>
                        <DropdownMenuItem>View logs</DropdownMenuItem>
                        <DropdownMenuItem>Send notification</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2.5 text-[11px] text-muted-foreground">
        <span>Showing 1 to {records.length} of {records.length} integrations</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 rounded-md border-border text-[11px]">Previous</Button>
          <Button variant="outline" size="sm" className="h-7 rounded-md border-border text-[11px]">Next</Button>
        </div>
      </div>
    </section>
  );
}
