import { Search, Filter, CalendarIcon, X, RefreshCw, Activity, MoreHorizontal, FileDown, Sheet } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";

import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import { Calendar as CalendarComponent } from "@repo/ui/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";

interface ListingsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClearDateRange: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSyncInventory: () => void;
  isSyncing: boolean;
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  hasListings: boolean;
  sheetsConnected: boolean;
  enqueueAutoSheetsSync: () => void;
}

export function ListingsFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
  onClearDateRange,
  onRefresh,
  isRefreshing,
  onSyncInventory,
  isSyncing,
  onGenerateReport,
  isGeneratingReport,
  hasListings,
  sheetsConnected,
  enqueueAutoSheetsSync,
}: ListingsFiltersProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, SKU, or ASIN..."
              className="pl-9 h-9 bg-background"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Filters */}
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="h-9 w-[130px]">
                <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 justify-start text-left font-normal",
                    (dateRange.from || dateRange.to) && "text-primary border-primary/50"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM d, yyyy")
                    )
                  ) : (
                    "Date"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Filter by Date</p>
                    {(dateRange.from || dateRange.to) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearDateRange}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => onDateRangeChange({ from: startOfDay(new Date()), to: endOfDay(new Date()) })}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => onDateRangeChange({ from: subDays(new Date(), 7), to: new Date() })}
                    >
                      7 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => onDateRangeChange({ from: subDays(new Date(), 30), to: new Date() })}
                    >
                      30 Days
                    </Button>
                  </div>
                </div>
                <CalendarComponent
                  mode="range"
                  selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                  onSelect={(range) => onDateRangeChange(range ? { from: range.from, to: range.to } : undefined)}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onSyncInventory}
              disabled={isSyncing}
            >
              <Activity className={cn("h-3.5 w-3.5 mr-2", isSyncing && "animate-pulse")} />
              Sync
            </Button>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onGenerateReport} disabled={isGeneratingReport || !hasListings}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Download Report
                </DropdownMenuItem>
                {sheetsConnected && (
                  <DropdownMenuItem onClick={() => enqueueAutoSheetsSync()}>
                    <Sheet className="h-4 w-4 mr-2" />
                    Force Sheets Sync
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
