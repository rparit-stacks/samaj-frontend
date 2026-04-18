import { useState } from "react";
import {
  Search,
  RefreshCcw,
  Trash2,
  Pencil,
  Eye,
  Loader2,
  Mail,
  Phone,
  User,
  Shield,
  KeyRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { adminUsersApi, type AdminUserSummary, type AdminUserFullDetail } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initialsOf(name?: string | null): string {
  const v = (name ?? "").trim();
  if (!v) return "U";
  return v
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0]!)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function BoolRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-1 border-b border-slate-100 last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className={value ? "text-emerald-700 font-medium" : "text-slate-400"}>{value ? "Yes" : "No"}</span>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</h4>
      {children}
    </div>
  );
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);
  const size = 20;

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("USER");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editEmailVerified, setEditEmailVerified] = useState(false);
  const [editPhoneVerified, setEditPhoneVerified] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("USER");
  const [createStatus, setCreateStatus] = useState("ACTIVE");

  const [deleteTarget, setDeleteTarget] = useState<AdminUserSummary | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin", "users", { q, role, status, page, size }],
    queryFn: () =>
      adminUsersApi.list({
        page,
        size,
        q: q.trim() || undefined,
        role,
        status,
      }),
    staleTime: 5_000,
  });

  const detailQuery = useQuery({
    queryKey: ["admin", "users", "detail", detailId],
    queryFn: () => adminUsersApi.get(detailId!),
    enabled: detailOpen && !!detailId,
  });

  const updateUser = useMutation({
    mutationFn: (input: { id: string }) =>
      adminUsersApi.update(input.id, {
        name: editName || null,
        email: editEmail || null,
        phone: editPhone || null,
        role: editRole,
        status: editStatus,
        emailVerified: editEmailVerified,
        phoneVerified: editPhoneVerified,
      }),
    onSuccess: () => {
      setEditOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createUser = useMutation({
    mutationFn: () =>
      adminUsersApi.create({
        name: createName || null,
        email: createEmail.trim(),
        phone: createPhone.trim() || null,
        password: createPassword.trim() || null,
        role: createRole,
        status: createStatus,
      }),
    onSuccess: async (res) => {
      if (res.tempPassword) {
        await navigator.clipboard.writeText(
          `Email: ${res.user.email ?? ""}\nTemp password: ${res.tempPassword}`
        );
        toast.success("User created — temp password copied to clipboard");
      } else {
        toast.success("User created");
      }
      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePhone("");
      setCreatePassword("");
      setCreateRole("USER");
      setCreateStatus("ACTIVE");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => adminUsersApi.delete(id),
    onSuccess: () => {
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User removed (soft delete)");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = usersQuery.data?.content ?? [];
  const totalPages = usersQuery.data?.totalPages ?? 0;
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  const openDetail = (u: AdminUserSummary) => {
    setDetailId(u.id);
    setDetailOpen(true);
  };

  const openEdit = (u: AdminUserSummary) => {
    setEditing(u);
    setEditName(u.fullName ?? "");
    setEditEmail(u.email ?? "");
    setEditPhone(u.phone ?? "");
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditEmailVerified(u.emailVerified);
    setEditPhoneVerified(u.phoneVerified);
    setEditOpen(true);
  };

  const prettyMetadata = (raw: string | null | undefined) => {
    if (!raw) return "—";
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  const showingDetail = detailOpen && detailId;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User management</h1>
            {showingDetail ? (
              <p className="text-slate-600">
                Full account, contact, privacy and security view for a single member.
              </p>
            ) : (
              <p className="text-slate-600">
                Full account, contact, and privacy flags (admin view — not redacted). Sub-admin tools stay under
                Settings → system when enabled.
              </p>
            )}
          </div>
          {!showingDetail && (
            <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={() => setCreateOpen(true)}>
              New user
            </Button>
          )}
        </div>

        {showingDetail ? (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-700"
                  onClick={() => {
                    setDetailOpen(false);
                    setDetailId(null);
                  }}
                >
                  ← Back to users
                </Button>
                <span className="text-sm text-slate-500">Admin-only user detail</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {detailQuery.isLoading ? (
                <div className="px-6 py-6 flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading full profile…
                </div>
              ) : detailQuery.isError ? (
                <div className="px-6 py-6 text-red-600">Could not load user detail</div>
              ) : detailQuery.data ? (
                <UserDetailPanel d={detailQuery.data} formatWhen={formatWhen} prettyMetadata={prettyMetadata} />
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setPage(0);
                      }}
                      placeholder="Search email, phone, name, profile key…"
                      className="pl-10 bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <Select
                    value={role}
                    onValueChange={(v) => {
                      setRole(v);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="w-[160px] bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      <SelectItem value="USER">USER</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="MODERATOR">MODERATOR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={status}
                    onValueChange={(v) => {
                      setStatus(v);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="w-[200px] bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                      <SelectItem value="DELETED">DELETED</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="border-slate-300 text-slate-700"
                    onClick={() => usersQuery.refetch()}
                    disabled={usersQuery.isFetching}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center justify-between">
                  <span>Users</span>
                  <span className="text-xs font-normal text-slate-500">
                    Total: {usersQuery.data?.totalElements ?? 0}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {usersQuery.isLoading ? (
                  <div className="p-6 text-slate-500 flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                  </div>
                ) : usersQuery.isError ? (
                  <div className="p-6 text-red-600">Failed to load users</div>
                ) : users.length === 0 ? (
                  <div className="p-6 text-slate-600">No users match your filters.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                          <th className="p-3 font-medium">User</th>
                          <th className="p-3 font-medium hidden md:table-cell">Email</th>
                          <th className="p-3 font-medium hidden lg:table-cell">Phone</th>
                          <th className="p-3 font-medium">Role</th>
                          <th className="p-3 font-medium">Status</th>
                          <th className="p-3 font-medium hidden sm:table-cell">Joined</th>
                          <th className="p-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                            <td className="p-3">
                              <div className="font-medium text-slate-900">{u.fullName ?? "—"}</div>
                              <div className="text-xs text-slate-500 font-mono truncate max-w-[200px]">{u.profileKey}</div>
                            </td>
                            <td className="p-3 text-slate-700 hidden md:table-cell">{u.email ?? "—"}</td>
                            <td className="p-3 text-slate-700 hidden lg:table-cell">{u.phone ?? "—"}</td>
                            <td className="p-3">
                              <Badge variant="secondary">{u.role}</Badge>
                            </td>
                            <td className="p-3 text-slate-700">{u.status}</td>
                            <td className="p-3 text-slate-500 text-xs whitespace-nowrap hidden sm:table-cell">
                              {formatWhen(u.createdAt)}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-300"
                                  onClick={() => openDetail(u)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-300"
                                  onClick={() => openEdit(u)}
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-700"
                                  onClick={() => setDeleteTarget(u)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="p-4 flex items-center justify-between border-t border-slate-200">
                  <span className="text-xs text-slate-500">
                    Page {page + 1} / {Math.max(1, totalPages)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-slate-300"
                      disabled={!canPrev}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-300"
                      disabled={!canNext}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-white border-slate-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="bg-white border-slate-300" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="bg-white border-slate-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">USER</SelectItem>
                      <SelectItem value="MODERATOR">MODERATOR</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                      <SelectItem value="DELETED">DELETED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editEmailVerified}
                    onChange={(e) => setEditEmailVerified(e.target.checked)}
                  />
                  Email verified
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editPhoneVerified}
                    onChange={(e) => setEditPhoneVerified(e.target.checked)}
                  />
                  Phone verified
                </label>
              </div>
              <Button
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                disabled={updateUser.isPending}
                onClick={() => editing && updateUser.mutate({ id: editing.id })}
              >
                {updateUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} className="bg-white border-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="bg-white border-slate-300" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} className="bg-white border-slate-300" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password (optional)</Label>
              <Input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                className="bg-white border-slate-300"
                placeholder="Leave empty to auto-generate"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={createRole} onValueChange={setCreateRole}>
                  <SelectTrigger className="bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="MODERATOR">MODERATOR</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={createStatus} onValueChange={setCreateStatus}>
                  <SelectTrigger className="bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
              disabled={createUser.isPending || !createEmail.trim()}
              onClick={() => createUser.mutate()}
            >
              {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Soft delete: account is marked deleted and email is anonymized. This matches the user self-delete flow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
            >
              {deleteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function UserDetailPanel({
  d,
  formatWhen,
  prettyMetadata,
}: {
  d: AdminUserFullDetail;
  formatWhen: (iso: string | null | undefined) => string;
  prettyMetadata: (raw: string | null | undefined) => string;
}) {
  return (
    <ScrollArea className="max-h-[calc(90vh-5rem)] px-6 pb-6">
      <div className="space-y-4 pr-4">
        <div className="flex flex-wrap gap-4 items-start">
          <Avatar className="h-16 w-16 border border-slate-200">
            <AvatarImage src={d.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-slate-100 text-slate-700">{initialsOf(d.fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 items-center">
              <h3 className="text-lg font-semibold text-slate-900">{d.fullName ?? "—"}</h3>
              {d.parentAdmin ? (
                <Badge className="bg-amber-100 text-amber-900 border-amber-200">Parent admin</Badge>
              ) : null}
              <Badge variant="outline">{d.role}</Badge>
              <Badge variant="outline">{d.status}</Badge>
              <Badge variant="outline">KYC {d.kycStatus}</Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1 break-all">ID: {d.id}</p>
            <p className="text-sm text-slate-600">@{d.profileKey ?? "—"}</p>
            {d.adminServiceKeysCsv ? (
              <p className="text-xs text-slate-500 mt-1">
                Admin service keys (CSV): <span className="font-mono">{d.adminServiceKeysCsv}</span>
              </p>
            ) : null}
          </div>
        </div>

        <DetailBlock title="Contact & login">
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-slate-800 break-all">{d.email ?? "—"}</span>
              {d.email ? (
                <Button size="sm" variant="outline" className="h-7 border-slate-300" asChild>
                  <a href={`mailto:${d.email}`}>Email</a>
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="text-slate-800">{d.phone ?? "—"}</span>
              {d.phone ? (
                <Button size="sm" variant="outline" className="h-7 border-slate-300" asChild>
                  <a href={`tel:${d.phone.replace(/\s/g, "")}`}>Call</a>
                </Button>
              ) : null}
            </div>
            <BoolRow label="Email verified" value={d.emailVerified} />
            <BoolRow label="Phone verified" value={d.phoneVerified} />
            <div className="flex justify-between gap-4 text-sm py-1">
              <span className="text-slate-600 flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5" /> Password set
              </span>
              <span className={d.passwordSet ? "text-emerald-700 font-medium" : "text-slate-400"}>
                {d.passwordSet ? "Yes" : "No (OAuth / pending)"}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-sm py-1 border-t border-slate-100 pt-2">
              <span className="text-slate-600">Google ID</span>
              <span className="text-slate-800 font-mono text-xs break-all">{d.googleId ?? "—"}</span>
            </div>
          </div>
        </DetailBlock>

        <DetailBlock title="Profile (stored)">
          <div className="text-sm space-y-1 text-slate-800">
            <p>
              <span className="text-slate-500">City:</span> {d.city ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Profession:</span> {d.profession ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Blood group:</span> {d.bloodGroup ?? "—"}
            </p>
            <p className="whitespace-pre-wrap">
              <span className="text-slate-500">Bio:</span> {d.bio ?? "—"}
            </p>
            {d.coverImageUrl ? (
              <p className="text-xs break-all">
                <span className="text-slate-500">Cover:</span> {d.coverImageUrl}
              </p>
            ) : null}
          </div>
        </DetailBlock>

        <DetailBlock title="Directory & app settings">
          <BoolRow label="Settings: show phone in app" value={d.settingsShowPhone} />
          <BoolRow label="Show in directory" value={d.settingsShowInDirectory} />
          <BoolRow label="Emergency alerts" value={d.settingsEmergencyAlerts} />
          <BoolRow label="Settings 2FA flag" value={d.settingsTwoFactorEnabled} />
          <BoolRow label="Settings login alerts" value={d.settingsLoginAlertsEnabled} />
        </DetailBlock>

        <DetailBlock title="Privacy flags (what user chose to expose)">
          <p className="text-xs text-slate-500 mb-2">Admin still sees raw values above; these are member-facing toggles.</p>
          <BoolRow label="Privacy: show email" value={d.privacyShowEmail} />
          <BoolRow label="Privacy: show blood group" value={d.privacyShowBloodGroup} />
          <BoolRow label="Privacy: show phone" value={d.privacyShowPhone} />
          <BoolRow label="Privacy: show family" value={d.privacyShowFamilyMembers} />
          <div className="flex justify-between gap-4 text-sm py-1">
            <span className="text-slate-600">Profile visibility</span>
            <span className="text-slate-900">{d.profileVisibility ?? "—"}</span>
          </div>
          <pre className="text-xs bg-white border border-slate-200 rounded p-2 overflow-x-auto max-h-32 mt-2">
            {d.servicePrivacyJson ?? "{}"}
          </pre>
        </DetailBlock>

        <DetailBlock title="Security entity">
          <BoolRow label="Security 2FA" value={d.securityTwoFactorEnabled} />
          <BoolRow label="Security login alerts" value={d.securityLoginAlertsEnabled} />
        </DetailBlock>

        <DetailBlock title="Notifications">
          <BoolRow label="Email notifications" value={d.notificationEmailEnabled} />
          <BoolRow label="In-app notifications" value={d.notificationInAppEnabled} />
          <BoolRow label="Security email" value={d.notificationSecurityEmailEnabled} />
        </DetailBlock>

        <DetailBlock title="Timestamps">
          <div className="flex flex-wrap gap-1 text-sm text-slate-700">
            <Shield className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Joined: {formatWhen(d.createdAt)}</span>
            <span className="text-slate-400">·</span>
            <span>Updated: {formatWhen(d.updatedAt)}</span>
          </div>
        </DetailBlock>

        <DetailBlock title="Metadata (JSON)">
          <pre className="text-xs bg-white border border-slate-200 rounded p-2 overflow-x-auto max-h-40">
            {prettyMetadata(d.metadata)}
          </pre>
        </DetailBlock>
      </div>
    </ScrollArea>
  );
}
