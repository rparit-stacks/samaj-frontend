import React, { useState } from "react";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { adminSettingsApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

/** Radix Select forbids `value=""` on items. */
const FILTER_ALL = "__all__";

export default function AdminAuditLogs() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [resource, setResource] = useState(FILTER_ALL);

  const { data: logsPage, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs", page, size, resource],
    queryFn: () =>
      adminSettingsApi.listAuditLogs({
        page,
        size,
        resource: resource === FILTER_ALL ? undefined : resource,
      }),
  });

  const getResourceColor = (resource: string) => {
    switch (resource) {
      case "SMTP_CONFIG":
        return "bg-blue-100 text-blue-800";
      case "MAINTENANCE_MODE":
        return "bg-amber-100 text-amber-800";
      case "STORAGE_CONFIG":
        return "bg-purple-100 text-purple-800";
      case "BANNER":
        return "bg-green-100 text-green-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-800";
      case "UPDATE":
        return "bg-blue-100 text-blue-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Audit Logs
          </h1>
          <p className="text-slate-600 mt-1">
            View all configuration changes and administrative actions
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="resource-filter">Filter by Resource</Label>
                <Select value={resource} onValueChange={setResource}>
                  <SelectTrigger id="resource-filter" className="mt-1">
                    <SelectValue placeholder="All resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All resources</SelectItem>
                    <SelectItem value="SMTP_CONFIG">SMTP Configuration</SelectItem>
                    <SelectItem value="MAINTENANCE_MODE">Maintenance Mode</SelectItem>
                    <SelectItem value="STORAGE_CONFIG">Storage Configuration</SelectItem>
                    <SelectItem value="BANNER">Banners</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Label htmlFor="page-size">Page Size</Label>
                <Select value={String(size)} onValueChange={(v) => setSize(parseInt(v))}>
                  <SelectTrigger id="page-size" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : logsPage && logsPage.content.length > 0 ? (
          <>
            <div className="space-y-4">
              {logsPage.content.map((log) => (
                <Card key={log.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                        <Badge className={getResourceColor(log.resource)}>
                          {log.resource}
                        </Badge>
                        <span className="text-sm text-slate-600">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-slate-700">Admin ID</p>
                          <p className="text-slate-600 break-all font-mono text-xs">
                            {log.adminUserId}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">IP Address</p>
                          <p className="text-slate-600">{log.ipAddress}</p>
                        </div>
                      </div>

                      {log.changesBefore && (
                        <div>
                          <p className="font-medium text-slate-700 text-sm">Before</p>
                          <div className="bg-slate-50 p-3 rounded mt-1 max-h-40 overflow-auto">
                            <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words">
                              {log.changesBefore}
                            </pre>
                          </div>
                        </div>
                      )}

                      {log.changesAfter && (
                        <div>
                          <p className="font-medium text-slate-700 text-sm">After</p>
                          <div className="bg-green-50 p-3 rounded mt-1 max-h-40 overflow-auto">
                            <pre className="text-xs font-mono text-green-700 whitespace-pre-wrap break-words">
                              {log.changesAfter}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {logsPage.totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-slate-600">
                  Page {logsPage.number + 1} of {logsPage.totalPages} (
                  {logsPage.totalElements} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={logsPage.first}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={logsPage.last}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-slate-600 text-center py-8">
                No audit logs found
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
