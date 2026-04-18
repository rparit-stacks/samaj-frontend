import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

/**
 * Shown only when `VITE_ADMIN_KYC_ENABLED=true`.
 * Wire to backend when a KYC service exists (e.g. list pending, approve/reject).
 */
export default function AdminKYC() {
  const pending: never[] = [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              KYC verification
            </h1>
            <p className="text-slate-400">
              Review member verification requests. Backend APIs are not deployed yet; this screen is ready to plug in.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit bg-slate-700 text-slate-200">
            Pending: {pending.length}
          </Badge>
        </div>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">Queue</CardTitle>
            <CardDescription className="text-slate-400">
              Planned integration: <code className="text-slate-300">GET /admin/kyc/pending</code> (or your KYC service
              URL proxied through the API gateway). Until then, the queue stays empty—no mock rows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-300">User</TableHead>
                    <TableHead className="text-slate-300">Submitted</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 ? (
                    <TableRow className="border-slate-700 hover:bg-slate-800/40">
                      <TableCell colSpan={4} className="text-center text-slate-400 py-12">
                        No pending KYC submissions. When the backend is connected, rows will appear here.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
