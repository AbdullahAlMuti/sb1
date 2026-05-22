import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { Loader2, Search, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@repo/api-client/supabase/client";
import { DeviceDetailDrawer } from "./DeviceDetailDrawer";

export function DeviceListTable() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const { data: resData, error } = await supabase.functions.invoke("extension-admin-devices", {
        body: {
          page,
          pageSize,
          search: search || undefined,
          status: status !== "all" ? status : undefined,
        },
      });

      if (error) throw error;
      if (resData.success) {
        setData(resData.data);
        setTotal(resData.pagination.total);
      } else {
        throw new Error(resData.error);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to fetch devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [page, pageSize, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDevices();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Extension Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search email or device ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            
            <div className="flex gap-2">
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon" onClick={fetchDevices} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No devices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((device) => (
                    <TableRow key={device.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedDeviceId(device.id)}>
                      <TableCell>
                        <div className="font-medium">{device.userEmail}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">{device.userId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{device.id.slice(0, 8)}...</div>
                        <div className="text-xs text-muted-foreground">v{device.extensionVersion || "unknown"}</div>
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[150px]">{device.workspaceName}</TableCell>
                      <TableCell>
                        <Badge variant={device.status === "active" ? "default" : device.status === "revoked" ? "destructive" : "secondary"}>
                          {device.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {device.lastSeenAt ? format(new Date(device.lastSeenAt), "MMM d, HH:mm") : "Never"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedDeviceId(device.id); }}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {data.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, total)} of {total} devices
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total || loading}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeviceDetailDrawer
        deviceId={selectedDeviceId}
        onClose={() => setSelectedDeviceId(null)}
        onRevoked={fetchDevices}
      />
    </>
  );
}
