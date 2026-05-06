import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, X, Check, Clock, UserCheck, Search,
  ChevronDown, ChevronUp, Mail, Shield, RefreshCw, Edit,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminSystemApi, type AdminServiceKey } from "@/lib/api";

// ── service metadata ───────────────────────────────────────────────────────

const ALL_SERVICE_KEYS: AdminServiceKey[] = [
  "COMMUNITY", "DIRECTORY", "EMERGENCY", "DOCUMENTS", "CHAT",
  "NEWS", "EVENTS", "KYC", "NOTIFICATIONS", "HISTORY",
  "APP_CONFIG", "EXAM", "MATRIMONY", "GALLERY", "SUGGESTION",
  "ACHIEVER", "BUSINESS", "DONATION", "JOBS",
];

const SERVICE_LABELS: Record<AdminServiceKey, string> = {
  COMMUNITY: "Community",
  DIRECTORY: "Directory",
  EMERGENCY: "Emergency",
  DOCUMENTS: "Documents",
  CHAT: "Chat",
  NEWS: "News & Content",
  EVENTS: "Events",
  KYC: "KYC Verification",
  NOTIFICATIONS: "Notifications",
  HISTORY: "Samaj History",
  APP_CONFIG: "App Config",
  EXAM: "Exams",
  MATRIMONY: "Matrimony",
  GALLERY: "Gallery",
  SUGGESTION: "Suggestions",
  ACHIEVER: "Achievers",
  BUSINESS: "Business",
  DONATION: "Donations",
  JOBS: "Job Listings",
};

const SERVICE_COLORS: Record<string, string> = {
  COMMUNITY: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  DIRECTORY: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  EMERGENCY: "bg-red-500/10 text-red-400 border-red-500/20",
  DOCUMENTS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CHAT: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  NEWS: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  EVENTS: "bg-green-500/10 text-green-400 border-green-500/20",
  KYC: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  NOTIFICATIONS: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HISTORY: "bg-stone-500/10 text-stone-400 border-stone-500/20",
  APP_CONFIG: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  EXAM: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  MATRIMONY: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  GALLERY: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
  SUGGESTION: "bg-lime-500/10 text-lime-400 border-lime-500/20",
  ACHIEVER: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  BUSINESS: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  DONATION: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  JOBS: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

// ── helper ─────────────────────────────────────────────────────────────────

function ServiceBadge({ serviceKey }: { serviceKey: string }) {
  const colorClass = SERVICE_COLORS[serviceKey] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium", colorClass)}>
      {SERVICE_LABELS[serviceKey as AdminServiceKey] ?? serviceKey}
    </span>
  );
}

function ServiceSelector({
  selected,
  onChange,
}: {
  selected: AdminServiceKey[];
  onChange: (keys: AdminServiceKey[]) => void;
}) {
  const toggle = (k: AdminServiceKey) => {
    onChange(selected.includes(k) ? selected.filter((s) => s !== k) : [...selected, k]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_SERVICE_KEYS.map((k) => {
        const active = selected.includes(k);
        return (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
              active
                ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                : "bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/20"
            )}
          >
            {active && <Check className="h-3 w-3" />}
            {SERVICE_LABELS[k]}
          </button>
        );
      })}
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

type Tab = "admins" | "invitations";

function prettyStatus(raw: string | null | undefined) {
  const s = String(raw ?? "").toUpperCase();
  if (s === "ACTIVE") return "Active";
  if (s === "SUSPENDED") return "Suspended";
  return raw ?? "—";
}

export default function AdminSubAdmins() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("admins");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteKeys, setInviteKeys] = useState<AdminServiceKey[]>([]);

  // Edit form state
  const [editKeys, setEditKeys] = useState<AdminServiceKey[]>([]);
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");

  // ── queries ──────────────────────────────────────────────────────────────

  const { data: adminsPage, isLoading: adminsLoading } = useQuery({
    queryKey: ["admin", "system", "child-admins"],
    queryFn: () => adminSystemApi.listChildAdmins(),
  });

  const { data: invitations, isLoading: invitesLoading } = useQuery({
    queryKey: ["admin", "system", "invitations"],
    queryFn: adminSystemApi.listPendingInvitations,
  });

  // ── mutations ─────────────────────────────────────────────────────────────

  const inviteMutation = useMutation({
    mutationFn: ({ email, serviceKeys }: { email: string; serviceKeys: AdminServiceKey[] }) =>
      adminSystemApi.inviteChildAdmin({ email, serviceKeys }),
    onSuccess: (_, vars) => {
      toast.success(`Invitation sent to ${vars.email}`);
      qc.invalidateQueries({ queryKey: ["admin", "system", "invitations"] });
      setSheetOpen(false);
      setInviteEmail("");
      setInviteKeys([]);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to send invitation"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, serviceKeys, status }: { id: string; serviceKeys: AdminServiceKey[]; status: string }) =>
      adminSystemApi.updateChildAdmin(id, { serviceKeys, status }),
    onSuccess: () => {
      toast.success("Sub-admin updated");
      qc.invalidateQueries({ queryKey: ["admin", "system", "child-admins"] });
      setEditId(null);
    },
    onError: (err: Error) => toast.error(err.message || "Update failed"),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (id: string) => adminSystemApi.cancelInvitation(id),
    onSuccess: () => {
      toast.success("Invitation cancelled");
      qc.invalidateQueries({ queryKey: ["admin", "system", "invitations"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to cancel"),
  });

  // ── derived ───────────────────────────────────────────────────────────────

  const admins = (adminsPage?.content ?? []).filter((a) => {
    if (!search.trim()) return true;
    return (a.email ?? "").toLowerCase().includes(search.toLowerCase());
  });

  const activeAdmins = admins.filter((a) => String(a.status).toUpperCase() === "ACTIVE");
  const suspendedAdmins = admins.filter((a) => String(a.status).toUpperCase() !== "ACTIVE");

  // ── handlers ──────────────────────────────────────────────────────────────

  const openEdit = (id: string, keys: string[], status: string) => {
    setEditId(id);
    setEditKeys(keys as AdminServiceKey[]);
    setEditStatus((status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE") as "ACTIVE" | "SUSPENDED");
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) { toast.error("Email is required"); return; }
    if (inviteKeys.length === 0) { toast.error("Select at least one service"); return; }
    inviteMutation.mutate({ email: inviteEmail.trim(), serviceKeys: inviteKeys });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    if (editKeys.length === 0) { toast.error("Select at least one service"); return; }
    updateMutation.mutate({ id: editId, serviceKeys: editKeys, status: editStatus });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sub Admin Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Invite and manage admins with restricted service access
            </p>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Invite Admin
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {(["admins", "invitations"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "h-8 px-5 rounded-lg text-sm font-medium transition-all",
                tab === t
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t === "admins" ? (
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  Active ({activeAdmins.length})
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Pending ({invitations?.length ?? 0})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Active Sub Admins tab ── */}
        {tab === "admins" && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            {adminsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : admins.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                <UserCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-medium">No sub-admins yet</p>
                <p className="text-slate-400 text-xs mt-1">
                  Use the "Invite Admin" button to send an invitation
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Active */}
                {activeAdmins.map((admin) => {
                  const isExpanded = expandedId === admin.id;
                  const isEditing = editId === admin.id;

                  return (
                    <div key={admin.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      {/* Row */}
                      <div className="flex items-center gap-4 px-4 py-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {(admin.email ?? "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{admin.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                              admin.status === "ACTIVE"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            )}>
                              {prettyStatus(admin.status)}
                            </span>
                            <span className="text-[11px] text-slate-500">{admin.serviceKeys.length} services</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(admin.id, admin.serviceKeys, admin.status)}
                            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5 text-slate-500" />
                          </button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : admin.id)}
                            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded: services */}
                      {isExpanded && !isEditing && (
                        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assigned Services</p>
                          <div className="flex flex-wrap gap-1.5">
                            {admin.serviceKeys.map((k) => <ServiceBadge key={k} serviceKey={k} />)}
                          </div>
                        </div>
                      )}

                      {/* Edit form */}
                      {isEditing && (
                        <form onSubmit={handleEditSubmit} className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Services</p>
                            <ServiceSelector selected={editKeys} onChange={setEditKeys} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</p>
                            <div className="flex gap-2">
                              {(["ACTIVE", "SUSPENDED"] as const).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setEditStatus(s)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                                    editStatus === s
                                      ? s === "ACTIVE"
                                        ? "bg-green-50 border-green-300 text-green-700"
                                        : "bg-red-50 border-red-300 text-red-700"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                                  )}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="submit"
                              disabled={updateMutation.isPending}
                              className="h-8 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                            >
                              {updateMutation.isPending ? (
                                <><RefreshCw className="h-3 w-3 animate-spin" /> Saving…</>
                              ) : (
                                <><Check className="h-3 w-3" /> Save Changes</>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditId(null)}
                              className="h-8 px-4 rounded-lg border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}

                {/* Suspended */}
                {suspendedAdmins.length > 0 && (
                  <div className="pt-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">
                      Suspended ({suspendedAdmins.length})
                    </p>
                    <div className="space-y-2 mt-2">
                      {suspendedAdmins.map((admin) => {
                        const isExpanded = expandedId === admin.id;
                        const isEditing = editId === admin.id;

                        return (
                          <div key={admin.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="flex items-center gap-4 px-4 py-3">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">
                                  {(admin.email ?? "?")[0].toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{admin.email}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-700">
                                    {prettyStatus(admin.status)}
                                  </span>
                                  <span className="text-[11px] text-slate-500">{admin.serviceKeys.length} services</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEdit(admin.id, admin.serviceKeys, admin.status)}
                                  className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors"
                                >
                                  <Edit className="h-3.5 w-3.5 text-slate-500" />
                                </button>
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : admin.id)}
                                  className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors"
                                >
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
                                </button>
                              </div>
                            </div>

                            {isExpanded && !isEditing && (
                              <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assigned Services</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {admin.serviceKeys.map((k) => <ServiceBadge key={k} serviceKey={k} />)}
                                </div>
                              </div>
                            )}

                            {isEditing && (
                              <form onSubmit={handleEditSubmit} className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-4">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Services</p>
                                  <ServiceSelector selected={editKeys} onChange={setEditKeys} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</p>
                                  <div className="flex gap-2">
                                    {(["ACTIVE", "SUSPENDED"] as const).map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => setEditStatus(s)}
                                        className={cn(
                                          "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                                          editStatus === s
                                            ? s === "ACTIVE"
                                              ? "bg-green-50 border-green-300 text-green-700"
                                              : "bg-red-50 border-red-300 text-red-700"
                                            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                                        )}
                                      >
                                        {s === "ACTIVE" ? "Active" : "Suspended"}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="h-8 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                                  >
                                    {updateMutation.isPending ? (
                                      <><RefreshCw className="h-3 w-3 animate-spin" /> Saving…</>
                                    ) : (
                                      <><Check className="h-3 w-3" /> Save Changes</>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditId(null)}
                                    className="h-8 px-4 rounded-lg border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Pending Invitations tab ── */}
        {tab === "invitations" && (
          <div className="space-y-3">
            {invitesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}
              </div>
            ) : (invitations ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                <Mail className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-medium">No pending invitations</p>
                <p className="text-slate-400 text-xs mt-1">Invitations you send will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(invitations ?? []).map((inv) => {
                  const expires = new Date(inv.expiresAt);
                  const isExpired = expires < new Date();
                  return (
                    <div key={inv.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm">
                      <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{inv.email}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {inv.serviceKeys.slice(0, 4).map((k) => <ServiceBadge key={k} serviceKey={k} />)}
                          {inv.serviceKeys.length > 4 && (
                            <span className="text-[11px] text-slate-500">+{inv.serviceKeys.length - 4} more</span>
                          )}
                        </div>
                        <p className={cn("text-[11px] mt-1", isExpired ? "text-red-500" : "text-slate-500")}>
                          {isExpired
                            ? "Expired"
                            : `Expires ${expires.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} at ${expires.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => cancelInviteMutation.mutate(inv.id)}
                        disabled={cancelInviteMutation.isPending}
                        className="h-8 w-8 rounded-lg border border-red-100 hover:bg-red-50 flex items-center justify-center transition-colors group"
                        title="Cancel invitation"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400 group-hover:text-red-600" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Invite Sheet / Overlay ── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          {/* Panel */}
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Invite Sub Admin</h2>
                <p className="text-xs text-slate-500 mt-0.5">An invitation email will be sent to the address below</p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleInviteSubmit} className="flex-1 flex flex-col p-6 gap-6">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="newadmin@yourdomain.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full h-10 rounded-xl pl-9 pr-4 text-sm text-slate-900 bg-slate-50 border border-slate-200 outline-none focus:border-slate-400 transition-colors"
                  />
                </div>
              </div>

              {/* Services */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Assign Services
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteKeys([...ALL_SERVICE_KEYS])}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Select all
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setInviteKeys([])}
                      className="text-[11px] text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <ServiceSelector selected={inviteKeys} onChange={setInviteKeys} />
                {inviteKeys.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {inviteKeys.length} service{inviteKeys.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>

              {/* Info banner */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex gap-3">
                <Shield className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 leading-relaxed">
                  The invited person will receive an email with a secure link. They will set their own password and verify via OTP before gaining access. The link expires in 48 hours.
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={inviteMutation.isPending || !inviteEmail.trim() || inviteKeys.length === 0}
                  className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {inviteMutation.isPending ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Mail className="h-4 w-4" /> Send Invitation</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
