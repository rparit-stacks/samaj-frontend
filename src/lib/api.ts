import type { ExamPaperDocument } from "@/types/examPaper";
import { Capacitor } from "@capacitor/core";

/**
 * API base URL.
 *
 * - Local/dev: set VITE_API_URL (e.g. http://localhost:9512)
 * - Android emulator: localhost is rewritten to 10.0.2.2 (host machine)
 * - Physical device: set VITE_API_URL to http://<LAN-IP>:9512 before build
 * - Vercel/prod: leave VITE_API_URL unset so we use same-origin HTTPS, and proxy to the backend via rewrites.
 */
function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.trim() || "";
  const base =
    configured ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android" &&
    /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?/i.test(base)
  ) {
    return base.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)/i, "$110.0.2.2");
  }
  return base;
}

const API_BASE = resolveApiBase();

/**
 * Only rewrite `/admin/*` → `/admin-api/*` when we're using same-origin hosting + proxy rewrites
 * (e.g. Vercel `vercel.json`). If `VITE_API_URL` is set, we are calling the backend directly and
 * MUST keep the real backend paths (`/admin/*`).
 */
const SHOULD_USE_ADMIN_PROXY =
  !import.meta.env.VITE_API_URL?.trim() &&
  typeof window !== "undefined" &&
  API_BASE === window.location.origin;

function mapAdminPathForProxy(path: string): string {
  // Avoid clashing with the frontend /admin routes on Vercel.
  // We proxy backend admin APIs under /admin-api/* and rewrite that to backend /admin/*.
  return path.startsWith("/admin/") ? path.replace(/^\/admin\//, "/admin-api/") : path;
}

/**
 * Public fetch helper: never redirects to /login or /admin/login.
 * Use for admin UI when calling permitAll endpoints.
 */
async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || (data as any)?.message || "Request failed");
  }
  return data as T;
}

/**
 * Admin login is a permitAll endpoint.
 * IMPORTANT: Do NOT use `adminApi()` here because it redirects on 401 (bad UX for wrong password).
 */
export async function adminAuthLogin<T>(body: { identifier: string; password: string }): Promise<T> {
  return publicFetch<T>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** No JWT — used for one-time parent admin install flow. */
export async function fetchSetupStatus(): Promise<{ setupRequired: boolean }> {
  const url = `${API_BASE}/auth/setup/status`;
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; setupRequired?: boolean };
  if (!res.ok) {
    throw new Error(data.error || data.message || "Could not reach server");
  }
  return { setupRequired: Boolean(data.setupRequired) };
}

export async function postParentAdminSetup(body: { email: string; password: string }): Promise<void> {
  const url = `${API_BASE}/auth/setup`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.error || data.message || "Setup failed");
  }
}

const ACCESS_TOKEN_EXPIRES_AT_KEY = "accessTokenExpiresAt";
const ADMIN_ACCESS_TOKEN_EXPIRES_AT_KEY = "adminAccessTokenExpiresAt";

/** Call after login / token refresh so we can refresh the access token before it expires. */
export function recordUserSessionExpiry(expiresInSeconds?: number) {
  if (typeof expiresInSeconds === "number" && expiresInSeconds > 0) {
    localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000));
  }
}

export function recordAdminSessionExpiry(expiresInSeconds?: number) {
  if (typeof expiresInSeconds === "number" && expiresInSeconds > 0) {
    localStorage.setItem(ADMIN_ACCESS_TOKEN_EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000));
  }
}

function clearUserSessionExpiry() {
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
}

function clearAdminSessionExpiry() {
  localStorage.removeItem(ADMIN_ACCESS_TOKEN_EXPIRES_AT_KEY);
}

/** Clear admin tokens + expiry (logout or failed refresh). */
export function clearAdminTokensClientSide() {
  localStorage.removeItem("adminAccessToken");
  localStorage.removeItem("adminRefreshToken");
  clearAdminSessionExpiry();
}

/** Proactive refresh: call periodically while the app is open so users rarely hit 401. */
export function startSessionKeepAlive() {
  if (typeof window === "undefined") return () => {};
  const tick = () => {
    const refreshTok = localStorage.getItem("refreshToken");
    const expRaw = localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
    if (!refreshTok || !expRaw) return;
    const exp = parseInt(expRaw, 10);
    if (Number.isNaN(exp)) return;
    const fiveMin = 5 * 60 * 1000;
    if (Date.now() > exp - fiveMin) {
      void refreshToken();
    }
  };
  tick();
  const id = window.setInterval(tick, 60 * 1000);
  return () => window.clearInterval(id);
}

export function startAdminSessionKeepAlive() {
  if (typeof window === "undefined") return () => {};
  const tick = () => {
    const refreshTok = localStorage.getItem("adminRefreshToken");
    const expRaw = localStorage.getItem(ADMIN_ACCESS_TOKEN_EXPIRES_AT_KEY);
    if (!refreshTok || !expRaw) return;
    const exp = parseInt(expRaw, 10);
    if (Number.isNaN(exp)) return;
    const fiveMin = 5 * 60 * 1000;
    if (Date.now() > exp - fiveMin) {
      void refreshAdminToken();
    }
  };
  tick();
  const id = window.setInterval(tick, 60 * 1000);
  return () => window.clearInterval(id);
}

let userRefreshInFlight: Promise<boolean> | null = null;
let adminRefreshInFlight: Promise<boolean> | null = null;

/** True if `ref` is a UUID (member profile API accepts UUID or public profileKey). */
export function isUserUuid(ref: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref);
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  const h: Record<string, string> = {};
  if (token) {
    const bearer = `Bearer ${token}`;
    h.Authorization = bearer;
    h["X-Auth-Token"] = bearer;
  }
  const uid = localStorage.getItem("samajUserId");
  if (uid) {
    h["X-User-Id"] = uid;
  }
  return h;
}

function getAdminAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("adminAccessToken");
  const h: Record<string, string> = {};
  if (token) {
    const bearer = `Bearer ${token}`;
    h.Authorization = bearer;
    h["X-Auth-Token"] = bearer;
  }
  const aid = localStorage.getItem("samajAdminUserId");
  if (aid) {
    h["X-Admin-User-Id"] = aid;
  }
  return h;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...options.headers,
    },
  });

  // Check for maintenance mode (503 Service Unavailable)
  if (res.status === 503) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    if (typeof window !== "undefined") {
      window.location.href = `/maintenance?message=${encodeURIComponent(data.message || "The site is under maintenance")}`;
    }
    throw new Error("Maintenance mode");
  }

  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return api(path, options);
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    clearUserSessionExpiry();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }
  return data;
}

async function refreshToken(): Promise<boolean> {
  if (userRefreshInFlight) {
    return userRefreshInFlight;
  }
  userRefreshInFlight = (async () => {
    const refresh = localStorage.getItem("refreshToken");
    if (!refresh) return false;
    try {
      const base = API_BASE || (typeof window !== "undefined" ? window.location.origin : "");
      const res = await fetch(`${base}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }
        recordUserSessionExpiry(data.expiresIn as number | undefined);
        return true;
      }
    } catch {
      /* network / parse */
    }
    return false;
  })();
  try {
    return await userRefreshInFlight;
  } finally {
    userRefreshInFlight = null;
  }
}

/** Re-fetch access (+ optional new refresh) using the stored refresh token; single-flight with api(). */
export async function refreshSession(): Promise<boolean> {
  return refreshToken();
}

async function refreshAdminToken(): Promise<boolean> {
  if (adminRefreshInFlight) {
    return adminRefreshInFlight;
  }
  adminRefreshInFlight = (async () => {
    const refresh = localStorage.getItem("adminRefreshToken");
    if (!refresh) return false;
    try {
      const base = API_BASE || (typeof window !== "undefined" ? window.location.origin : "");
      const res = await fetch(`${base}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.accessToken) {
        localStorage.setItem("adminAccessToken", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("adminRefreshToken", data.refreshToken);
        }
        recordAdminSessionExpiry(data.expiresIn as number | undefined);
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  })();
  try {
    return await adminRefreshInFlight;
  } finally {
    adminRefreshInFlight = null;
  }
}

export async function adminApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const finalPath = SHOULD_USE_ADMIN_PROXY ? mapAdminPathForProxy(path) : path;
  const url = `${API_BASE}${finalPath}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAdminAuthHeader(),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const refreshed = await refreshAdminToken();
    if (refreshed) {
      return adminApi(path, options);
    }
    clearAdminTokensClientSide();
    window.location.href = "/admin/login";
    throw new Error("Admin session expired");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }
  return data;
}

// --- Admin System (parent/child admin) ---

export type AdminServiceKey =
  | "COMMUNITY"
  | "DIRECTORY"
  | "EMERGENCY"
  | "DOCUMENTS"
  | "CHAT"
  | "NEWS"
  | "EVENTS"
  | "KYC"
  | "NOTIFICATIONS"
  | "HISTORY"
  | "APP_CONFIG"
  | "EXAM"
  | "MATRIMONY"
  | "GALLERY"
  | "SUGGESTION"
  | "ACHIEVER"
  | "BUSINESS"
  | "DONATION"
  | "JOBS";

export interface AdminMeResponse {
  userId: string;
  role: string;
  parentAdmin: boolean;
  fullAccess: boolean;
  assignedServiceKeys: AdminServiceKey[];
}

export interface AdminServiceCatalogEntry {
  key: AdminServiceKey | string;
  description: string;
  adminPathPrefix: string;
}

export interface ChildAdminSummary {
  id: string;
  email: string | null;
  phone: string | null;
  status: string;
  serviceKeys: string[];
}

export interface ChildAdminPageResponse {
  content: ChildAdminSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AdminInvitationSummary {
  id: string;
  email: string;
  serviceKeys: string[];
  createdAt: string;
  expiresAt: string;
  accepted: boolean;
}

export const adminSystemApi = {
  me: () => adminApi<AdminMeResponse>("/admin/system/me"),
  catalog: () => adminApi<AdminServiceCatalogEntry[]>("/admin/system/catalog"),

  // Child admin CRUD
  listChildAdmins: (page = 0, size = 50) =>
    adminApi<ChildAdminPageResponse>(`/admin/system/child-admins?page=${page}&size=${size}`),
  getChildAdmin: (id: string) =>
    adminApi<ChildAdminSummary>(`/admin/system/child-admins/${encodeURIComponent(id)}`),
  updateChildAdmin: (id: string, body: { serviceKeys?: string[]; status?: string; newPassword?: string }) =>
    adminApi<ChildAdminSummary>(`/admin/system/child-admins/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  // Invitation flow (email-based, OTP-verified)
  inviteChildAdmin: (body: { email: string; serviceKeys: string[] }) =>
    adminApi<AdminInvitationSummary>("/admin/system/child-admins/invite", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listPendingInvitations: () =>
    adminApi<AdminInvitationSummary[]>("/admin/system/invitations"),
  cancelInvitation: (id: string) =>
    adminApi<void>(`/admin/system/invitations/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// ── Public invitation acceptance API (no JWT) ────────────────────────────────

export interface InvitationDetails {
  email: string;
  serviceKeys: string[];
  expiresAt: string;
}

export interface InviteAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; role: string };
}

export const adminInvitationApi = {
  getDetails: (token: string) =>
    publicFetch<InvitationDetails>(`/auth/admin-invite/${encodeURIComponent(token)}`),
  setPassword: (token: string, password: string) =>
    publicFetch<void>(`/auth/admin-invite/${encodeURIComponent(token)}/set-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  verify: (token: string, otp: string) =>
    publicFetch<InviteAuthResponse>(`/auth/admin-invite/${encodeURIComponent(token)}/verify`, {
      method: "POST",
      body: JSON.stringify({ otp }),
    }),
};

/** Main-admin only (`/admin/users`); full account + privacy snapshot. */
export interface AdminUserSummary {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  profileKey: string | null;
  role: string;
  status: string;
  kycStatus: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  parentAdmin: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminUserPageResponse {
  content: AdminUserSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AdminUserFullDetail {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  kycStatus: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  parentAdmin: boolean;
  adminServiceKeysCsv: string | null;
  passwordSet: boolean;
  googleId: string | null;
  metadata: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  fullName: string | null;
  profileKey: string | null;
  bio: string | null;
  city: string | null;
  profession: string | null;
  bloodGroup: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  settingsShowPhone: boolean;
  settingsShowInDirectory: boolean;
  settingsEmergencyAlerts: boolean;
  settingsTwoFactorEnabled: boolean;
  settingsLoginAlertsEnabled: boolean;
  privacyShowEmail: boolean;
  privacyShowBloodGroup: boolean;
  privacyShowPhone: boolean;
  privacyShowFamilyMembers: boolean;
  profileVisibility: string | null;
  servicePrivacyJson: string | null;
  securityTwoFactorEnabled: boolean;
  securityLoginAlertsEnabled: boolean;
  notificationEmailEnabled: boolean;
  notificationInAppEnabled: boolean;
  notificationSecurityEmailEnabled: boolean;
}

export const adminUsersApi = {
  list: (params?: { page?: number; size?: number; q?: string; role?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    if (params?.q?.trim()) query.set("q", params.q.trim());
    if (params?.role && params.role !== "all") query.set("role", params.role);
    if (params?.status && params.status !== "all") query.set("status", params.status);
    const qs = query.toString();
    return adminApi<AdminUserPageResponse>(`/admin/users${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => adminApi<AdminUserFullDetail>(`/admin/users/${encodeURIComponent(id)}`),
  create: (body: {
    name?: string | null;
    email: string;
    phone?: string | null;
    password?: string | null;
    role?: string;
    status?: string;
  }) =>
    adminApi<{ user: AdminUserSummary; tempPassword: string | null }>("/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (
    id: string,
    body: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      role?: string;
      status?: string;
      emailVerified?: boolean;
      phoneVerified?: boolean;
    }
  ) =>
    adminApi<AdminUserSummary>(`/admin/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    adminApi<void>(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// --- Community admin ---

export interface AdminCommunityTagResponse {
  id: number;
  name: string;
  slug: string;
}

export interface AdminCommunityReportResponse {
  id: number;
  postId: number;
  postAuthorUserId: string;
  reporterUserId: string;
  reason: string | null;
  details: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
}

export interface AdminCommunityReportPageResponse extends Paginated<AdminCommunityReportResponse> {}

export const adminCommunityApi = {
  listPosts: (params?: { page?: number; size?: number; authorId?: string; tag?: string; q?: string }) => {
    const query = new URLSearchParams();
    query.set("page", String(params?.page ?? 0));
    query.set("size", String(params?.size ?? 20));
    if (params?.authorId) query.set("authorId", params.authorId);
    if (params?.tag) query.set("tag", params.tag);
    if (params?.q) query.set("q", params.q);
    const qs = query.toString();
    return adminApi<Paginated<CommunityPost>>(`/admin/community/posts?${qs}`);
  },
  getPost: (id: number) => adminApi<CommunityPost>(`/admin/community/posts/${id}`),
  updatePost: (id: number, body: Partial<CreateCommunityPostBody>) =>
    adminApi<CommunityPost>(`/admin/community/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deletePost: (id: number) => adminApi<void>(`/admin/community/posts/${id}`, { method: "DELETE" }),
  deleteComment: (id: number) => adminApi<void>(`/admin/community/comments/${id}`, { method: "DELETE" }),
  createTag: (name: string) =>
    adminApi<AdminCommunityTagResponse>("/admin/community/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deleteTag: (id: number) => adminApi<void>(`/admin/community/tags/${id}`, { method: "DELETE" }),
  listReports: (params?: { page?: number; size?: number; status?: string }) => {
    const query = new URLSearchParams();
    query.set("page", String(params?.page ?? 0));
    query.set("size", String(params?.size ?? 20));
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return adminApi<AdminCommunityReportPageResponse>(`/admin/community/reports?${qs}`);
  },
  reviewReport: (id: number, status: "RESOLVED" | "DISMISSED") =>
    adminApi<AdminCommunityReportResponse>(`/admin/community/reports/${id}/review`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  /** Uses admin JWT to call the existing authenticated endpoint. */
  myAnalytics: () => adminApi<CommunityAnalytics>("/api/v1/community/me/analytics"),
  /** Tags list (same data as user endpoint, but never redirects to /login). */
  topTags: (limit = 50) =>
    adminApi<CommunityTagWithCount[]>(`/api/v1/community/tags?limit=${encodeURIComponent(String(limit))}`),
};

// --- Directory admin ---

export interface AdminDirectoryEntrySummary {
  userId: string;
  fullName: string | null;
  city: string | null;
  visible: boolean;
  showInDirectory: boolean;
  actions: DirectoryActionDto[];
}

export interface AdminDirectoryEntryDetail {
  userId: string;
  fullName: string | null;
  city: string | null;
  profession: string | null;
  phone: string | null;
  email: string | null;
  visible: boolean;
  showInDirectory: boolean;
  actions: DirectoryActionDto[];
}

export const adminDirectoryApi = {
  list: (q?: string) => {
    const search = q && q.trim().length ? `?q=${encodeURIComponent(q.trim())}` : "";
    return adminApi<AdminDirectoryEntrySummary[]>(`/admin/directory${search}`);
  },
  get: (userId: string) =>
    adminApi<AdminDirectoryEntryDetail>(`/admin/directory/${encodeURIComponent(userId)}`),
  update: (userId: string, body: { visible: boolean; showInDirectory?: boolean }) =>
    adminApi<AdminDirectoryEntryDetail>(`/admin/directory/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (userId: string) =>
    adminApi<void>(`/admin/directory/${encodeURIComponent(userId)}`, { method: "DELETE" }),
};

// --- KYC (monolith: dev headers X-User-Id / X-Admin-User-Id when JWT not wired) ---

export interface KycSubmissionDto {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  status: string;
  documentUrls: Record<string, string>;
  idDocumentType: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewerUserId: string | null;
  reviewNotes: string | null;
}

export interface KycMeResponse {
  kycStatus: string;
  latestSubmission: KycSubmissionDto | null;
}

export const userKycApi = {
  me: () => api<KycMeResponse>("/api/v1/users/me/kyc"),
  submit: (body: { documentUrls: Record<string, string>; idDocumentType?: string | null }) =>
    api<KycSubmissionDto>("/api/v1/users/me/kyc/submit", { method: "POST", body: JSON.stringify(body) }),
};

export const adminKycApi = {
  listPending: () => adminApi<KycSubmissionDto[]>("/admin/kyc/pending"),
  approve: (id: string, body?: { notes?: string | null }) =>
    adminApi<KycSubmissionDto>(`/admin/kyc/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  reject: (id: string, body?: { notes?: string | null }) =>
    adminApi<KycSubmissionDto>(`/admin/kyc/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
};

export const adminAppConfigApi = {
  getAll: () => adminApi<{ entries: Record<string, string> }>("/admin/app-config"),
  patch: (entries: Record<string, string>) =>
    adminApi<{ entries: Record<string, string> }>("/admin/app-config", {
      method: "PUT",
      body: JSON.stringify({ entries }),
    }),
  getEffectiveStorage: () =>
    adminApi<{
      provider: string;
      s3Bucket: string;
      s3Region: string;
      publicBaseUrl: string;
      s3Configured: boolean;
    }>("/admin/app-config/storage/effective"),
};

// ============================================================
// Cloud upload API (profile / background images via cloud-service)
// ============================================================

export interface CloudUploadResponse {
  url: string;
  provider: string;
}

async function uploadFile(path: string, file: File): Promise<CloudUploadResponse> {
  const url = `${API_BASE}${path}`;
  const formData = new FormData();
  formData.append("file", file);

  const doRequest = async (): Promise<Response> => {
    return fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        // Do NOT set Content-Type manually for multipart; let the browser handle it
        ...getAuthHeader(),
      },
    });
  };

  let res = await doRequest();

  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      res = await doRequest();
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      clearUserSessionExpiry();
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
  }

  const data = (await res.json().catch(() => ({}))) as Partial<CloudUploadResponse> & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.error || data.message || "Upload failed");
  }

  if (!data.url) {
    throw new Error("Upload succeeded but no URL returned");
  }

  return { url: data.url, provider: data.provider ?? "UNKNOWN" };
}

async function uploadAdminFile(path: string, file: File): Promise<CloudUploadResponse> {
  const url = `${API_BASE}${path}`;
  const formData = new FormData();
  formData.append("file", file);

  const doRequest = async (): Promise<Response> =>
    fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        ...getAdminAuthHeader(),
      },
    });

  let res = await doRequest();
  if (res.status === 401) {
    const refreshed = await refreshAdminToken();
    if (refreshed) {
      res = await doRequest();
    } else {
      clearAdminTokensClientSide();
      window.location.href = "/admin/login";
      throw new Error("Admin session expired");
    }
  }

  const data = (await res.json().catch(() => ({}))) as Partial<CloudUploadResponse> & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.error || data.message || "Upload failed");
  }
  if (!data.url) {
    throw new Error("Upload succeeded but no URL returned");
  }
  return { url: data.url, provider: data.provider ?? "UNKNOWN" };
}

export const cloudApi = {
  uploadProfileImage: (file: File) => uploadFile("/api/cloud/profile-image", file),
  uploadBackgroundImage: (file: File) => uploadFile("/api/cloud/background-image", file),
  /** Generic image/file upload (user JWT). Folder is sanitized server-side (e.g. banners, news, cms). */
  uploadToFolder: (folder: string, file: File) =>
    uploadFile(`/api/cloud/upload?folder=${encodeURIComponent(folder)}`, file),
  /** Event cover image – uses Cloud Service, folder=events */
  uploadEventImage: (file: File) => uploadFile("/api/cloud/upload?folder=events", file),
  /** Gallery album/photo – folder=gallery */
  uploadGalleryImage: (file: File) => uploadFile("/api/cloud/upload?folder=gallery", file),
  /** Document file – folder=documents */
  uploadDocument: (file: File) => uploadFile("/api/cloud/upload?folder=documents", file),
  /** Matrimony profile photos – folder=matrimony */
  uploadMatrimonyImage: (file: File) => uploadFile("/api/cloud/upload?folder=matrimony", file),
  /** Delete image by URL (e.g. when removing from gallery create step 3) */
  deleteByUrl: (url: string) =>
    api<{ message: string }>(
      `/api/cloud/delete?url=${encodeURIComponent(url)}`,
      { method: "DELETE" }
    ),
};

/** Admin JWT multipart uploads (same `/api/cloud/*` endpoints; principal is admin user). */
export const adminCloudApi = {
  uploadToFolder: (folder: string, file: File) =>
    uploadAdminFile(`/api/cloud/upload?folder=${encodeURIComponent(folder)}`, file),
};

// Auth API
export const authApi = {
  register: (body: { email: string; phone?: string; password: string }) =>
    api<{ message: string; otpRequired?: boolean }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /**
   * Password login is now a 2-step flow:
   *   1) POST /auth/login with credentials → returns either:
   *      - { otpRequired: true, identifier, type, message }  → client must call loginWithOtp
   *      - { otpRequired: false, ...AuthResponse }           → parent-admin bypass, log in directly
   *   2) POST /auth/login/otp with the 6-digit code → returns AuthResponse
   */
  login: (body: { identifier: string; password: string }) =>
    api<LoginChallenge | (AuthResponse & { otpRequired: false })>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  loginWithOtp: (body: { identifier: string; otp: string }) =>
    api<AuthResponse>("/auth/login/otp", { method: "POST", body: JSON.stringify(body) }),

  sendOtp: (body: { identifier: string; type: string; purpose: string }) =>
    api<{ message: string }>("/auth/otp/send", { method: "POST", body: JSON.stringify(body) }),

  verifyOtp: (body: { identifier: string; code: string; purpose?: string }) =>
    api<AuthResponse>("/auth/otp/verify", { method: "POST", body: JSON.stringify(body) }),

  logout: () => api("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: localStorage.getItem("refreshToken") }) }),

  me: () => api<UserResponse>("/auth/me"),

  updateProfile: (body: { name?: string; phone?: string; metadata?: Record<string, unknown> }) =>
    api<UserResponse>("/auth/me", { method: "PUT", body: JSON.stringify(body) }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api<{ message: string }>("/auth/password/change", { method: "POST", body: JSON.stringify(body) }),

  deleteAccount: () => api<{ message: string }>("/auth/account", { method: "DELETE" }),
};

// User Service API (profile, family, settings, privacy, security)
export const userApi = {
  getProfile: () => api<UserProfile>("/api/v1/users/me/profile"),
  updateProfile: (body: Partial<UserProfile>) =>
    api<UserProfile>("/api/v1/users/me/profile", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getFamily: () => api<FamilyMember[]>("/api/v1/users/me/family"),
  addFamilyMember: (body: FamilyMemberInput) =>
    api<FamilyMember>("/api/v1/users/me/family", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateFamilyMember: (id: string, body: FamilyMemberInput) =>
    api<FamilyMember>(`/api/v1/users/me/family/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteFamilyMember: (id: string) =>
    api<void>(`/api/v1/users/me/family/${id}`, { method: "DELETE" }),

  getSettings: () => api<UserSettings>("/api/v1/users/me/settings"),
  updateSettings: (body: UserSettings) =>
    api<UserSettings>("/api/v1/users/me/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getPrivacy: () => api<PrivacySettings>("/api/v1/users/me/privacy"),
  updatePrivacy: (body: Partial<PrivacySettings> & { profileVisibility?: ProfileVisibility }) =>
    api<PrivacySettings>("/api/v1/users/me/privacy", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  getPublicProfile: (userId: string) =>
    api<PublicProfileResponse>(`/api/v1/users/${userId}/profile`),
  /** Public profile by UUID or by profileKey (e.g. email local-part: rohitparit1934). */
  getPublicProfileByRef: (ref: string) =>
    isUserUuid(ref)
      ? api<PublicProfileResponse>(`/api/v1/users/${ref}/profile`)
      : api<PublicProfileResponse>(`/api/v1/users/p/${encodeURIComponent(ref)}/profile`),
  /** Contact only – when allowed, returns phone/email/bloodGroup so UI can show Call/WhatsApp directly. */
  getContactInfo: (userId: string) =>
    api<ContactInfoResponse>(`/api/v1/users/${userId}/contact`),
  getVisibleProfile: (userId: string, context?: string) => {
    const qs = context ? `?context=${encodeURIComponent(context)}` : "";
    return api<VisibleProfileResponse>(`/api/v1/users/${userId}/visible-profile${qs}`);
  },

  getSecurity: () => api<SecuritySettings>("/api/v1/users/me/security"),
  updateSecurity: (body: SecuritySettings) =>
    api<SecuritySettings>("/api/v1/users/me/security", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  search: (q: string, params?: { page?: number; size?: number }) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    const qs = query.toString();
    return api<Paginated<UserProfile>>(
      `/api/v1/users/search${qs ? `?${qs}` : ""}`,
    );
  },

  /** Contact requests (directory privacy flow) */
  createContactRequest: (targetUserId: string, message?: string) =>
    api<ContactRequestResponse>("/api/v1/users/contact-requests", {
      method: "POST",
      body: JSON.stringify({ targetUserId, message: message ?? "" }),
    }),
  getContactRequestsIncoming: () =>
    api<ContactRequestResponse[]>("/api/v1/users/contact-requests/incoming"),
  getContactRequestsOutgoing: () =>
    api<ContactRequestResponse[]>("/api/v1/users/contact-requests/outgoing"),
  respondContactRequest: (id: string, approve: boolean) =>
    api<ContactRequestResponse>(`/api/v1/users/contact-requests/${id}/respond`, {
      method: "PUT",
      body: JSON.stringify({ approve }),
    }),

  /** Directory: members who opted in, with privacy-respected phone and blood group */
  getDirectory: (params?: { page?: number; size?: number }) => {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size ?? 100));
    const qs = query.toString();
    return api<Paginated<DirectoryEntry>>(
      `/api/v1/users/directory${qs ? `?${qs}` : ""}`,
    );
  },

  /**
   * Public directory – full list of all members (name, phone, email, userId). No auth required.
   * Used when the directory page opens.
   */
  // Legacy public directory (User Service) – kept for compatibility but not used by the new Directory service.
  // getPublicDirectory: () =>
  //   api<PublicDirectoryMember[]>(`/api/v1/users/directory/public`),
};

/**
 * Admin-safe wrappers for public profile/contact endpoints (no redirects).
 * These endpoints are `permitAll` in backend SecurityConfig.
 */
export const publicUserLookupApi = {
  profileByUserId: (userId: string) =>
    publicFetch<PublicProfileResponse>(`/api/v1/users/${encodeURIComponent(userId)}/profile`),
  contactByUserId: (userId: string) =>
    publicFetch<ContactInfoResponse>(`/api/v1/users/${encodeURIComponent(userId)}/contact`),
};

// Gallery API (auth only; only approved albums visible)
export interface GalleryAlbumDto {
  id: string;
  name: string;
  coverPhotoUrl: string | null;
  createdBy: string;
  createdAt: string;
  photoCount: number;
  approved: boolean;
}

export interface GalleryAlbumDetailDto {
  id: string;
  name: string;
  coverPhotoUrl: string | null;
  createdBy: string;
  createdAt: string;
  photoUrls: string[];
  approved: boolean;
}

export const galleryApi = {
  listAlbums: () => api<GalleryAlbumDto[]>("/api/v1/gallery/albums"),
  listMyAlbums: () => api<GalleryAlbumDto[]>("/api/v1/gallery/albums/me"),
  getAlbum: (id: string) => api<GalleryAlbumDetailDto>(`/api/v1/gallery/albums/${id}`),
  createAlbum: (body: { name: string; coverPhotoUrl: string; photoUrls: string[] }) =>
    api<GalleryAlbumDto>("/api/v1/gallery/albums", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export interface AdminGalleryAlbumDto {
  id: string;
  name: string;
  coverPhotoUrl: string | null;
  /** Creator email from backend */
  createdByName: string;
  createdById: string;
  createdAt: string;
  photoCount: number;
  approved: boolean;
  /** All image URLs in album order (admin list/detail) */
  photoUrls?: string[];
}

export interface AdminGalleryAlbumUpdateRequest {
  name?: string;
  coverPhotoUrl?: string;
  photoUrls?: string[];
  approved?: boolean;
}

export const adminGalleryApi = {
  list: () => adminApi<AdminGalleryAlbumDto[]>("/admin/gallery"),
  get: (id: string) => adminApi<AdminGalleryAlbumDto>(`/admin/gallery/${encodeURIComponent(id)}`),
  update: (id: string, body: AdminGalleryAlbumUpdateRequest) =>
    adminApi<AdminGalleryAlbumDto>(`/admin/gallery/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    adminApi<void>(`/admin/gallery/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// Documents API (auth; approved only on main list; My Documents for user's uploads)
export interface DocumentDto {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  fileType: string | null;
  category: string;
  visibility: "PRIVATE" | "PUBLIC";
  createdBy: string;
  createdAt: string;
  approved: boolean;
  rejectionReason: string | null;
  downloadCount: number;
}

export const documentsApi = {
  list: (params?: { search?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
    const qs = query.toString();
    return api<DocumentDto[]>(`/api/v1/documents${qs ? `?${qs}` : ""}`);
  },
  listMine: () => api<DocumentDto[]>("/api/v1/documents/me"),
  get: (id: string) => api<DocumentDto>(`/api/v1/documents/${id}`),
  create: (body: {
    title: string;
    description?: string;
    fileUrl: string;
    fileName: string;
    fileSize?: number | null;
    fileType?: string | null;
    category: string;
    visibility?: "PRIVATE" | "PUBLIC";
  }) =>
    api<DocumentDto>("/api/v1/documents", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  recordDownload: (id: string) =>
    api<{ fileUrl: string }>(`/api/v1/documents/${id}/download`, { method: "POST" }),
  /** Preferred: permission-checked download stream from Documents service */
  downloadFile: async (id: string) => {
    const url = `${API_BASE}/api/v1/documents/${id}/file`;
    const doRequest = async (): Promise<Response> =>
      fetch(url, {
        method: "GET",
        headers: {
          ...getAuthHeader(),
        },
      });

    let res = await doRequest();
    if (res.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        res = await doRequest();
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        clearUserSessionExpiry();
        window.location.href = "/login";
        throw new Error("Unauthorized");
      }
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as any));
      throw new Error(data?.error || data?.message || "Download failed");
    }
    return res;
  },
};

/** Document moderation — requires admin JWT (ADMIN / MODERATOR). */
export type DocumentAdminUpdateBody = {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  visibility?: "PUBLIC" | "PRIVATE" | null;
  approved?: boolean | null;
  rejectionReason?: string | null;
};

export const adminDocumentsApi = {
  listPending: () => adminApi<DocumentDto[]>("/admin/documents/pending"),
  list: (params?: { q?: string; category?: string; approved?: boolean }) => {
    const search = new URLSearchParams();
    if (params?.q?.trim()) search.set("q", params.q.trim());
    if (params?.category?.trim()) search.set("category", params.category.trim());
    if (params?.approved !== undefined) search.set("approved", String(params.approved));
    const qs = search.toString();
    return adminApi<DocumentDto[]>(`/admin/documents${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => adminApi<DocumentDto>(`/admin/documents/${encodeURIComponent(id)}`),
  setApproval: (id: string, approved: boolean, rejectionReason?: string | null) =>
    adminApi<DocumentDto>(`/admin/documents/${encodeURIComponent(id)}/approval`, {
      method: "PATCH",
      body: JSON.stringify({ approved, rejectionReason: rejectionReason ?? null }),
    }),
  update: (id: string, body: DocumentAdminUpdateBody) =>
    adminApi<DocumentDto>(`/admin/documents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    adminApi<void>(`/admin/documents/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export interface DirectoryEntry {
  userId: string;
  fullName: string | null;
  city: string | null;
  profession: string | null;
  avatarUrl: string | null;
  phone: string | null;
  bloodGroup: string | null;
}

export interface PublicDirectoryMember {
  userId: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  city: string | null;
  memberSince: string | null;
}

// Directory Service

export interface DirectoryActionDto {
  type: string;   // CALL, WHATSAPP, EMAIL, LINK
  label: string;  // display text
  value: string;  // phone/email/url
  sortOrder: number;
}

export interface DirectoryProfileSummary {
  userId: string;
  fullName: string | null;
  photoUrl: string | null;
  city: string | null;
  actions: DirectoryActionDto[];
}

export interface DirectoryProfileDetail {
  userId: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  city: string | null;
  profession: string | null;
  bio: string | null;
  bloodGroup: string | null;
  actions: DirectoryActionDto[];
}

export interface DirectorySettings {
  visible: boolean;
  actions: DirectoryActionDto[];
}

export const directoryApi = {
  list: () => api<DirectoryProfileSummary[]>("/api/v1/directory"),
  get: (userId: string) => api<DirectoryProfileDetail>(`/api/v1/directory/${encodeURIComponent(userId)}`),
  getMySettings: () => api<DirectorySettings>("/api/v1/directory/me/settings"),
  updateMySettings: (settings: DirectorySettings) =>
    api<DirectorySettings>("/api/v1/directory/me/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
};

export interface ContactRequestResponse {
  id: string;
  requesterUserId: string;
  targetUserId: string;
  requesterName: string;
  requesterAvatarUrl: string | null;
  targetName: string;
  targetAvatarUrl: string | null;
  status: "PENDING" | "APPROVED" | "DENIED";
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
}

// Notifications API
export const notificationApi = {
  getNotifications: (params?: { page?: number; size?: number; unreadOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    if (params?.unreadOnly) query.set("unreadOnly", "true");
    const qs = query.toString();
    return api<Paginated<NotificationDto>>(
      `/api/v1/notifications${qs ? `?${qs}` : ""}`,
    );
  },
  getUnreadCount: () => api<{ unread: number }>("/api/v1/notifications/unread"),
  markRead: (id: string) =>
    api<void>(`/api/v1/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () => api<void>("/api/v1/notifications/read-all", { method: "PUT" }),
  delete: (id: string) =>
    api<void>(`/api/v1/notifications/${id}`, { method: "DELETE" }),
  clearAll: () =>
    api<void>("/api/v1/notifications/clear-all", { method: "DELETE" }),

  getPreferences: () =>
    api<NotificationPreferences>("/api/v1/notifications/preferences"),
  updatePreferences: (body: NotificationPreferences) =>
    api<NotificationPreferences>("/api/v1/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

export interface AdminBroadcastNotificationRequest {
  title: string;
  body: string;
  type?: string | null;
  link?: string | null;
}

export interface AdminBroadcastNotificationResponse {
  message: string;
  recipientCountEstimate: number;
}

/** Admin: queue in-app notification to all active members (async fan-out). */
export const adminNotificationsApi = {
  broadcast: (body: AdminBroadcastNotificationRequest) =>
    adminApi<AdminBroadcastNotificationResponse>("/admin/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// News API — BackendServiceV2 samaj: user GET /api/v1/news/*, admin /admin/news/*
export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content: string;
  categoryId: number;
  categoryName: string;
  categorySlug?: string;
  imageUrl?: string | null;
  pinned: boolean;
  publishedAt: string | null;
  views: number;
  /** Present on admin responses */
  active?: boolean;
}

export interface NewsCategory {
  id: number;
  name: string;
  slug: string;
}

export interface NewsStats {
  total: number;
  pinned: number;
  totalViews: number;
  lastPublishedAt: string | null;
}

/** Backend PageResponse matches Paginated<T> shape */
function newsListQuery(params?: { page?: number; size?: number; categoryId?: number }) {
  const query = new URLSearchParams();
  if (params?.page != null) query.set("page", String(params.page));
  if (params?.size != null) query.set("size", String(params.size));
  if (params?.categoryId != null) query.set("categoryId", String(params.categoryId));
  return query.toString();
}

export const newsApi = {
  list: (params?: { page?: number; size?: number; categoryId?: number; q?: string }) => {
    const qs = newsListQuery(params);
    return api<Paginated<NewsItem>>(`/api/v1/news/articles${qs ? `?${qs}` : ""}`);
  },
  /** Loads article and increments view count (backend). */
  get: (id: number) => api<NewsItem>(`/api/v1/news/articles/${id}`),
  getCategories: () => api<NewsCategory[]>("/api/v1/news/categories"),
  /** Other articles (same list API); filter client-side. */
  getRecommendations: async (excludeId: number, limit = 4) => {
    const page = await api<Paginated<NewsItem>>("/api/v1/news/articles?page=0&size=30");
    return page.content.filter((a) => a.id !== excludeId).slice(0, limit);
  },
  /** No-op: views counted in {@link get}. */
  trackView: (_id: number) => Promise.resolve(),
  /** Derived from a list call (no dedicated stats endpoint). */
  getStats: async (): Promise<NewsStats> => {
    const page = await api<Paginated<NewsItem>>("/api/v1/news/articles?page=0&size=500");
    const content = page.content;
    let last: string | null = null;
    for (const a of content) {
      if (!a.publishedAt) continue;
      if (!last || a.publishedAt > last) last = a.publishedAt;
    }
    return {
      total: content.length,
      pinned: content.filter((a) => a.pinned).length,
      totalViews: content.reduce((s, a) => s + (a.views ?? 0), 0),
      lastPublishedAt: last,
    };
  },
};

export type NewsArticleAdminPayload = {
  title: string;
  summary: string;
  content: string;
  categoryId: number;
  imageUrl: string | null;
  pinned: boolean;
  active: boolean;
  publishedAt: string | null;
};

function adminNewsListQuery(params?: {
  page?: number;
  size?: number;
  categoryId?: number;
  active?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.page != null) query.set("page", String(params.page));
  if (params?.size != null) query.set("size", String(params.size));
  if (params?.categoryId != null) query.set("categoryId", String(params.categoryId));
  if (params?.active !== undefined) query.set("active", String(params.active));
  return query.toString();
}

/** News admin — JWT with ROLE_ADMIN or ROLE_MODERATOR; uses adminApi (admin tokens). */
export const adminNewsApi = {
  list: (params?: { page?: number; size?: number; categoryId?: number; active?: boolean }) => {
    const qs = adminNewsListQuery(params);
    return adminApi<Paginated<NewsItem>>(`/admin/news/articles${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => adminApi<NewsItem>(`/admin/news/articles/${id}`),
  create: (body: NewsArticleAdminPayload) =>
    adminApi<NewsItem>("/admin/news/articles", { method: "POST", body: JSON.stringify(body) }),
  put: (id: number, body: NewsArticleAdminPayload) =>
    adminApi<NewsItem>(`/admin/news/articles/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (id: number) => adminApi<void>(`/admin/news/articles/${id}`, { method: "DELETE" }),
  listCategories: () => adminApi<NewsCategory[]>("/admin/news/categories"),
  createCategory: (body: { name: string; slug?: string }) =>
    adminApi<NewsCategory>("/admin/news/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: number, body: { name: string; slug: string }) =>
    adminApi<NewsCategory>(`/admin/news/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteCategory: (id: number) =>
    adminApi<void>(`/admin/news/categories/${id}`, { method: "DELETE" }),
  getStats: async (): Promise<NewsStats> => {
    const page = await adminApi<Paginated<NewsItem>>("/admin/news/articles?page=0&size=1000");
    const content = page.content;
    let last: string | null = null;
    for (const a of content) {
      if (!a.publishedAt) continue;
      if (!last || a.publishedAt > last) last = a.publishedAt;
    }
    return {
      total: content.length,
      pinned: content.filter((a) => a.pinned).length,
      totalViews: content.reduce((s, a) => s + (a.views ?? 0), 0),
      lastPublishedAt: last,
    };
  },
  /** Full PUT required by backend — load, merge, save. */
  update: async (
    id: number,
    patch: Partial<NewsArticleAdminPayload>
  ): Promise<NewsItem> => {
    const cur = await adminNewsApi.get(id);
    const body: NewsArticleAdminPayload = {
      title: patch.title ?? cur.title,
      summary: patch.summary ?? cur.summary,
      content: patch.content ?? cur.content,
      categoryId: patch.categoryId ?? cur.categoryId,
      imageUrl:
        patch.imageUrl !== undefined ? patch.imageUrl : (cur.imageUrl ?? null),
      pinned: patch.pinned ?? cur.pinned,
      active: patch.active ?? cur.active ?? true,
      publishedAt:
        patch.publishedAt !== undefined ? patch.publishedAt : (cur.publishedAt ?? null),
    };
    return adminNewsApi.put(id, body);
  },
  pin: (id: number) => adminNewsApi.update(id, { pinned: true }),
  unpin: (id: number) => adminNewsApi.update(id, { pinned: false }),
};

// Emergency API
export type EmergencyStatus = "OPEN" | "IN_PROGRESS" | "HELP_RECEIVED" | "RESOLVED" | "CANCELLED" | "CLOSED";

export interface EmergencyContactPreferences {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  allowPhone: boolean;
  allowWhatsapp: boolean;
  allowEmail: boolean;
}

export interface EmergencyItem {
  id: number;
  creatorUserId: string;
  creatorDisplayName?: string | null;
  creatorPhotoUrl?: string | null;
  type: "MEDICAL" | "ACCIDENT" | "FINANCIAL" | "BLOOD" | "OTHER";
  title: string;
  description: string;
  area: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  landmark: string | null;
  locationDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  status: EmergencyStatus;
  emergencyAt: string;
  createdAt: string;
  updatedAt: string;
  helperCount: number;
  viewCount: number;
  contactClickCount: number;
  resolvedByExternal: boolean;
  externalHelperNote: string | null;
  contactPreferences: EmergencyContactPreferences;
}

export interface EmergencyHelpItem {
  emergencyId: number;
  helperUserId: string;
  helpedAt: string;
  note: string | null;
}

export interface DashboardStats {
  totalEmergenciesCreated: number;
  activeEmergencies: number;
  resolvedEmergencies: number;
  totalContactClicks: number;
  totalViews: number;
  totalPeopleHelped: number;
}

export const emergencyApi = {
  listAll: (params?: { creatorUserId?: string }) => {
    const query = new URLSearchParams();
    if (params?.creatorUserId) query.set("creatorUserId", params.creatorUserId);
    const qs = query.toString();
    return api<EmergencyItem[]>(`/api/v1/emergencies${qs ? `?${qs}` : ""}`);
  },
  listMine: () => api<EmergencyItem[]>("/api/v1/emergencies/me"),
  getById: (id: number) => api<EmergencyItem>(`/api/v1/emergencies/${id}`),
  create: (body: {
    type?: string;
    title: string;
    description: string;
    area?: string;
    city?: string;
    state?: string;
    country?: string;
    landmark?: string;
    locationDescription?: string;
    latitude?: number | null;
    longitude?: number | null;
    emergencyAt?: string;
    contactPhone?: string;
    contactWhatsapp?: string;
    contactEmail?: string;
    allowPhone?: boolean;
    allowWhatsapp?: boolean;
    allowEmail?: boolean;
  }) =>
    api<EmergencyItem>("/api/v1/emergencies", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: number, body: {
    type?: string;
    title?: string;
    description?: string;
    area?: string;
    city?: string;
    state?: string;
    country?: string;
    landmark?: string;
    locationDescription?: string;
    latitude?: number | null;
    longitude?: number | null;
    emergencyAt?: string;
    contactPhone?: string;
    contactWhatsapp?: string;
    contactEmail?: string;
    allowPhone?: boolean;
    allowWhatsapp?: boolean;
    allowEmail?: boolean;
  }) =>
    api<EmergencyItem>(`/api/v1/emergencies/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (id: number) =>
    api<void>(`/api/v1/emergencies/${id}`, { method: "DELETE" }),
  updateStatus: (id: number, status: EmergencyStatus) =>
    api<EmergencyItem>(`/api/v1/emergencies/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  resolve: (id: number, body: {
    helperUserId?: string;
    externalHelper: boolean;
    externalHelperNote?: string;
    note?: string;
  }) =>
    api<EmergencyItem>(`/api/v1/emergencies/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getHelpers: (id: number) =>
    api<EmergencyHelpItem[]>(`/api/v1/emergencies/${id}/helpers`),
  trackView: (id: number) =>
    api<void>(`/api/v1/emergencies/${id}/view`, { method: "POST" }),
  trackContactClick: (id: number) =>
    api<void>(`/api/v1/emergencies/${id}/contact-click`, { method: "POST" }),
  getDashboardStats: () =>
    api<DashboardStats>("/api/v1/emergencies/dashboard"),
  getHelperStats: (userId: string) =>
    api<{ helperUserId: string; totalHelps: number; distinctPeopleHelped: number; firstHelpAt: string | null; lastHelpAt: string | null }>(
      `/api/v1/emergencies/helpers/${userId}/stats`
    ),
};

/** Admin emergency list / status — uses admin JWT. */
export const adminEmergencyApi = {
  listAll: () => adminApi<EmergencyItem[]>("/admin/emergencies"),
  patchStatus: (id: number, status: EmergencyStatus) =>
    adminApi<EmergencyItem>(`/admin/emergencies/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  delete: (id: number) => adminApi<void>(`/admin/emergencies/${id}`, { method: "DELETE" }),
};

// Events API
export interface EventOrganizerInfo {
  userId: string;
  displayName: string | null;
  photoUrl: string | null;
}

export interface EventScheduleItem {
  time: string;
  activity: string;
}

export interface EventItem {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string | null;
  location: string;
  description: string | null;
  imageUrl: string | null;
  organizer: EventOrganizerInfo;
  scheduleJson: string | null;
  goingCount: number;
  interestedCount: number;
  notGoingCount: number;
  currentUserRsvpStatus: string | null;
  createdAt: string;
}

export interface EventAttendeeInfo {
  userId: string;
  displayName: string | null;
  photoUrl: string | null;
  status: string;
  email?: string | null;
  phone?: string | null;
}

export interface EventDetailItem extends EventItem {
  schedule: EventScheduleItem[];
  goingAttendees: EventAttendeeInfo[];
  isOrganizer: boolean;
}

export interface EventAnalyticsItem {
  eventId: number;
  goingCount: number;
  interestedCount: number;
  notGoingCount: number;
  goingAttendees: EventAttendeeInfo[];
  interestedAttendees: EventAttendeeInfo[];
  notGoingAttendees: EventAttendeeInfo[];
}

export const eventsApi = {
  list: (params?: { sort?: string; type?: string; organizerId?: string }) => {
    const query = new URLSearchParams();
    if (params?.sort) query.set("sort", params.sort);
    if (params?.type) query.set("type", params.type);
    if (params?.organizerId) query.set("organizerId", params.organizerId);
    const qs = query.toString();
    return api<EventItem[]>(`/api/v1/events${qs ? `?${qs}` : ""}`);
  },
  getById: (id: number) => api<EventDetailItem>(`/api/v1/events/${id}`),
  create: (body: {
    title: string;
    type: string;
    date: string;
    time?: string;
    location: string;
    description?: string;
    imageUrl?: string;
    organizerDisplayName?: string;
    organizerPhotoUrl?: string;
    schedule?: EventScheduleItem[];
  }) =>
    api<EventItem>("/api/v1/events", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  rsvp: (eventId: number, body: { status: string; displayName?: string; photoUrl?: string }) =>
    api<EventItem>(`/api/v1/events/${eventId}/rsvp`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAnalytics: (eventId: number) =>
    api<EventAnalyticsItem>(`/api/v1/events/${eventId}/analytics`),
};

/** Events — admin list/detail/analytics use `/admin/events`; create uses same organizer JWT on user API. */
export const adminEventsApi = {
  list: (params?: { sort?: string; type?: string; organizerId?: string }) => {
    const query = new URLSearchParams();
    if (params?.sort) query.set("sort", params.sort);
    if (params?.type) query.set("type", params.type);
    if (params?.organizerId) query.set("organizerId", params.organizerId);
    const qs = query.toString();
    return adminApi<EventItem[]>(`/admin/events${qs ? `?${qs}` : ""}`);
  },
  getById: (id: number) => adminApi<EventDetailItem>(`/admin/events/${id}`),
  create: (body: {
    title: string;
    type: string;
    date: string;
    time?: string;
    location: string;
    description?: string;
    imageUrl?: string;
    organizerDisplayName?: string;
    organizerPhotoUrl?: string;
    schedule?: EventScheduleItem[];
  }) =>
    adminApi<EventItem>("/api/v1/events", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAnalytics: (eventId: number) =>
    adminApi<EventAnalyticsItem>(`/admin/events/${eventId}/analytics`),
};

// Community / Posts API

export interface CommunityPostMedia {
  id: number;
  url: string;
  type: "IMAGE" | "VIDEO";
  sortOrder: number;
}

export interface CommunityPostTag {
  id: number;
  name: string;
  slug: string;
}

export interface CommunityPost {
  id: number;
  authorUserId: string;
  authorDisplayName?: string | null;
  authorPhotoUrl?: string | null;
  content: string;
  location?: string | null;
  emojiCodes: string[];
  mentionedUserIds: string[];
  tags: CommunityPostTag[];
  media: CommunityPostMedia[];
  likeCount: number;
  commentCount: number;
  saveCount: number;
  shareCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  likedByCurrentUser: boolean;
  savedByCurrentUser: boolean;
}

export interface CommunityTagWithCount {
  id: number;
  name: string;
  slug: string;
  postCount: number;
}

export interface CommunityAnalytics {
  totalPosts: number;
  totalLikesGiven: number;
  totalLikesReceived: number;
  totalSaves: number;
  totalViews: number;
}

export interface CommunityComment {
  id: number;
  postId: number;
  authorUserId: string;
  content: string;
  createdAt: string;
}

export interface CreateCommunityPostBody {
  content: string;
  location?: string;
  emojiCodes?: string[];
  mentionedUserIds?: string[];
  tags?: string[];
  media?: {
    url: string;
    type: "IMAGE" | "VIDEO";
    sortOrder?: number;
  }[];
  authorDisplayName?: string;
  authorPhotoUrl?: string;
}

export const communityApi = {
  list: (params?: { page?: number; size?: number; tag?: string; authorId?: string; savedOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    if (params?.tag) query.set("tag", params.tag);
    if (params?.authorId) query.set("authorId", params.authorId);
    if (params?.savedOnly) query.set("savedOnly", "true");
    const qs = query.toString();
    return api<Paginated<CommunityPost>>(`/api/v1/community/posts${qs ? `?${qs}` : ""}`);
  },
  create: (body: CreateCommunityPostBody) =>
    api<CommunityPost>("/api/v1/community/posts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: number, body: Partial<CreateCommunityPostBody>) =>
    api<CommunityPost>(`/api/v1/community/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  remove: (id: number) =>
    api<void>(`/api/v1/community/posts/${id}`, { method: "DELETE" }),
  toggleLike: (id: number) =>
    api<CommunityPost>(`/api/v1/community/posts/${id}/like`, { method: "POST" }),
  toggleSave: (id: number) =>
    api<CommunityPost>(`/api/v1/community/posts/${id}/save`, { method: "POST" }),
  trackView: (id: number) =>
    api<void>(`/api/v1/community/posts/${id}/view`, { method: "POST" }),
  trackShare: (id: number) =>
    api<void>(`/api/v1/community/posts/${id}/share`, { method: "POST" }),
  addComment: (postId: number, body: { content: string }) =>
    api<CommunityComment>(`/api/v1/community/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listComments: (postId: number, params?: { page?: number; size?: number }) => {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    const qs = query.toString();
    return api<Paginated<CommunityComment>>(
      `/api/v1/community/posts/${postId}/comments${qs ? `?${qs}` : ""}`,
    );
  },
  report: (id: number, body: { reason: string; details?: string }) =>
    api<void>(`/api/v1/community/posts/${id}/report`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getTopTags: (limit = 20) =>
    api<CommunityTagWithCount[]>(`/api/v1/community/tags?limit=${limit}`),
  getMyAnalytics: () =>
    api<CommunityAnalytics>("/api/v1/community/me/analytics"),
};

export interface UserResponse {
  id: string;
  email: string | null;
  phone: string | null;
  googleId: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: string;
  role: string;
  kycStatus?: string;
  metadata?: Record<string, unknown>;
  /** Public URL segment: /profile/{profileKey} (from email local-part, unique on server). */
  profileKey?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserResponse;
}

/** Returned by POST /auth/login when the server is challenging the user for an OTP. */
export interface LoginChallenge {
  otpRequired: true;
  identifier: string;
  type: string; // "EMAIL" | "PHONE"
  message?: string;
}

/** Returned by POST /auth/google/id-token — either a live session (existing user) or a signup temp token (new user). */
export interface GoogleSignInResult {
  kind: "login" | "signup";
  // login
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: UserResponse;
  // signup (new user)
  tempToken?: string;
  email?: string;
  name?: string;
  picture?: string;
}

export const googleApi = {
  verifyIdToken: (idToken: string) =>
    publicFetch<GoogleSignInResult>("/auth/google/id-token", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),
  completeSignup: (body: { tempToken: string; name: string; phone?: string }) =>
    publicFetch<AuthResponse>("/auth/google/complete", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// User Service types
export interface UserProfile {
  userId: string;
  profileKey?: string | null;
  fullName: string | null;
  city: string | null;
  profession: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  bloodGroup?: string | null;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface FamilyMemberInput {
  name: string;
  relation: string;
  city?: string;
  phone?: string;
  email?: string;
}

export interface UserSettings {
  showPhone: boolean;
  showInDirectory: boolean;
  emergencyAlerts: boolean;
}

export type ProfileVisibility = "PUBLIC" | "MEMBERS_ONLY" | "PRIVATE";

export interface ServicePrivacyOverrides {
  showName?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showFamily?: boolean;
  showLocation?: boolean;
  /** When true, this section (events/community/emergency) appears on your global profile page */
  showOnProfile?: boolean;
}

export interface PrivacySettings {
  showEmail: boolean;
  showBloodGroup: boolean;
  showPhone?: boolean;
  showFamilyMembers?: boolean;
  profileVisibility: ProfileVisibility;
  servicePrivacy?: Record<string, ServicePrivacyOverrides>;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginAlertsEnabled: boolean;
}

export interface FamilyMemberSummaryDto {
  name: string;
  relation: string;
}

export interface PublicProfileResponse {
  userId: string;
  profileKey?: string | null;
  fullName: string | null;
  city: string | null;
  profession: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  email: string | null;
  phone: string | null;
  bloodGroup: string | null;
  familyMembers: FamilyMemberSummaryDto[];
  privateProfile: boolean;
  showEventsOnProfile: boolean;
  showCommunityOnProfile: boolean;
  showEmergenciesOnProfile: boolean;
}

export interface ContactInfoResponse {
  phone: string | null;
  email: string | null;
  bloodGroup: string | null;
}

export interface VisibleProfileResponse {
  userId: string;
  displayName: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  profession: string | null;
  familyMembers: FamilyMemberSummaryDto[];
  showLocation: boolean | null;
}

// Notifications types
export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  /** Backend may send COMMUNITY, EVENT, NEWS, ALERT, SYSTEM, etc. */
  type: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  securityEmailEnabled: boolean;
  /** Types the user has individually silenced, e.g. ["COMMUNITY", "EVENT"]. */
  disabledTypes?: string[];
}

export interface Paginated<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// Global Search API — backend: GET /api/v1/search, /api/v1/search/{service} (EXAMS wired; others may return empty).
export type SearchServiceType = "USERS" | "NEWS" | "EVENTS" | "EXAMS" | "MATRIMONY" | "EMERGENCIES";

const SEARCH_SERVICE_TYPES = new Set<string>([
  "USERS",
  "NEWS",
  "EVENTS",
  "EXAMS",
  "MATRIMONY",
  "EMERGENCIES",
]);

export function isSearchServiceType(s: string): s is SearchServiceType {
  return SEARCH_SERVICE_TYPES.has(s);
}

export interface SearchResultDto {
  service: string;
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string | null;
  link: string;
}

export interface SearchCategoryResponse {
  service: string;
  total: number;
  results: SearchResultDto[];
}

export interface SearchAllResponse {
  query: string;
  categories: SearchCategoryResponse[];
}

export const searchApi = {
  searchAll: (params: { q: string; page?: number; size?: number }) => {
    const query = new URLSearchParams();
    query.set("q", params.q);
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 15));
    const qs = query.toString();
    return api<SearchAllResponse>(`/api/v1/search?${qs}`);
  },
  searchByService: (service: SearchServiceType, params: { q: string; page?: number; size?: number }) => {
    const query = new URLSearchParams();
    query.set("q", params.q);
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));
    const qs = query.toString();
    return api<SearchCategoryResponse>(`/api/v1/search/${encodeURIComponent(service)}?${qs}`);
  },
};

// Suggestions API — backend: /api/v1/suggestions (POST), /me (GET paged), /{id} (GET, owner only).
export type SuggestionStatus = "PENDING" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";

export interface SuggestionDto {
  id: string;
  title: string;
  description: string;
  /** Lowercase slug from server (e.g. general, website). */
  category: string;
  status: SuggestionStatus | string;
  response: string | null;
  createdAt: string;
  updatedAt: string;
}

export const suggestionsApi = {
  create: (body: { title: string; description: string; category: string }) =>
    api<SuggestionDto>("/api/v1/suggestions", { method: "POST", body: JSON.stringify(body) }),

  listMine: (params?: { page?: number; size?: number; q?: string; status?: SuggestionStatus | "ALL" }) => {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    if (params?.q) query.set("q", params.q);
    if (params?.status && params.status !== "ALL") query.set("status", params.status);
    const qs = query.toString();
    return api<Paginated<SuggestionDto>>(`/api/v1/suggestions/me${qs ? `?${qs}` : ""}`);
  },

  getMine: (id: string) => api<SuggestionDto>(`/api/v1/suggestions/${encodeURIComponent(id)}`),
};

// Exams API — backend: /api/v1/exams (+ /saved, /alerts, /{id}/save, /{id}/alert).
export interface ExamDto {
  id: string;
  title: string;
  description: string;
  type: string;
  notificationDate: string | null;
  lastDate: string | null;
  examDate: string | null;
  eligibility: string | null;
  applyUrl: string | null;
  expired: boolean;
  saved: boolean;
  alertEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  /** Present on GET /api/v1/exams/{id} when an admin-defined paper exists */
  paper?: ExamPaperDocument | null;
}

export const examsApi = {
  list: (params?: { page?: number; size?: number; q?: string; type?: string; filter?: "new" | "old" | "" }) => {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    if (params?.q) query.set("q", params.q);
    if (params?.type) query.set("type", params.type);
    if (params?.filter) query.set("filter", params.filter);
    const qs = query.toString();
    return api<Paginated<ExamDto>>(`/api/v1/exams${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => api<ExamDto>(`/api/v1/exams/${encodeURIComponent(id)}`),
  listSaved: (params?: { page?: number; size?: number }) => {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    const qs = query.toString();
    return api<Paginated<ExamDto>>(`/api/v1/exams/saved${qs ? `?${qs}` : ""}`);
  },
  listAlerts: (params?: { page?: number; size?: number }) => {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    const qs = query.toString();
    return api<Paginated<ExamDto>>(`/api/v1/exams/alerts${qs ? `?${qs}` : ""}`);
  },
  save: (id: string) =>
    api<{ message: string }>(`/api/v1/exams/${encodeURIComponent(id)}/save`, { method: "POST" }),
  unsave: (id: string) =>
    api<{ message: string }>(`/api/v1/exams/${encodeURIComponent(id)}/save`, { method: "DELETE" }),
  enableAlert: (id: string) =>
    api<{ message: string }>(`/api/v1/exams/${encodeURIComponent(id)}/alert`, { method: "POST" }),
  disableAlert: (id: string) =>
    api<{ message: string }>(`/api/v1/exams/${encodeURIComponent(id)}/alert`, { method: "DELETE" }),
};

// Banners (Public)
export const bannersApi = {
  listActive: () => api<CmsMobileBannerDto[]>("/api/banners/active"),
};

export interface AdminExamDto {
  id: string;
  title: string;
  description: string;
  type: string;
  notificationDate: string | null;
  lastDate: string | null;
  examDate: string | null;
  eligibility: string | null;
  applyUrl: string | null;
  expired: boolean;
  createdAt: string;
  updatedAt: string;
  /** Full paper on GET /admin/exam/{id}; omitted on list responses */
  paper?: ExamPaperDocument | null;
}

export interface AdminExamCreateRequest {
  title: string;
  description: string;
  type: string;
  notificationDate?: string;
  lastDate?: string;
  examDate?: string;
  eligibility?: string;
  applyUrl?: string;
  expired?: boolean;
  paper?: ExamPaperDocument | null;
}

export const adminExamApi = {
  list: (params?: { page?: number; size?: number; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    if (params?.q) qs.set("q", params.q);
    const s = qs.toString();
    return adminApi<Paginated<AdminExamDto>>(`/admin/exam${s ? `?${s}` : ""}`);
  },
  get: (id: string) => adminApi<AdminExamDto>(`/admin/exam/${encodeURIComponent(id)}`),
  create: (body: AdminExamCreateRequest) =>
    adminApi<AdminExamDto>("/admin/exam", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<AdminExamCreateRequest>) =>
    adminApi<AdminExamDto>(`/admin/exam/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    adminApi<void>(`/admin/exam/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// --- Matrimony module (dedicated profiles, interests, in-module chat) ---
export type MatrimonyProfileStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
export type MatrimonyProfileSubject = "SELF" | "RELATIVE";
export type MatrimonyGender = "MALE" | "FEMALE" | "OTHER";
export type MatrimonyInterestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export interface MatrimonyProfileSummaryItem {
  id: string;
  displayName: string;
  status: MatrimonyProfileStatus;
  draftStep: number;
  profileSubject: MatrimonyProfileSubject;
  relativeRelation: string | null;
  completionPercent: number;
}

export interface MatrimonyMeSummary {
  canBrowse: boolean;
  activeProfileCount: number;
  draftProfileCount: number;
  profiles: MatrimonyProfileSummaryItem[];
}

export interface MatrimonyProfileCard {
  id: string;
  displayName: string;
  age: number;
  gender: MatrimonyGender;
  profession: string | null;
  education: string | null;
  city: string | null;
  heightCm: number | null;
  primaryPhotoUrl: string | null;
  bioShort: string;
  verified: boolean;
  favorited?: boolean;
}

export type MatrimonyPhotoVisibility = "ALL" | "AFTER_ACCEPTANCE";
export type MatrimonyMessagePolicy = "ALL_ACTIVE" | "ACCEPTED_ONLY";
export type MatrimonySmokingHabit = "NO" | "OCCASIONALLY" | "YES" | "PREFER_NOT_TO_SAY";
export type MatrimonyDrinkingHabit = "NO" | "OCCASIONALLY" | "YES" | "PREFER_NOT_TO_SAY";

export interface MatrimonyPrivacySettings {
  visibleInSearch: boolean;
  photoVisibility: MatrimonyPhotoVisibility;
  showContactDetails: boolean;
  hideLastSeen: boolean;
  messagePolicy: MatrimonyMessagePolicy;
  primaryPhotoIndex: number;
}

export interface MatrimonyDashboard {
  interestsSent: number;
  interestsReceived: number;
  interestsAccepted: number;
  profileViewsTotal: number;
  shortlistCount: number;
  blockedUsersCount: number;
}

export interface MatrimonyProfileDetail {
  id: string;
  ownerUserId: string | null;
  profileSubject: MatrimonyProfileSubject;
  relativeRelation: string | null;
  displayName: string;
  age: number;
  gender: MatrimonyGender;
  dateOfBirth: string;
  heightCm: number | null;
  weightKg: number | null;
  maritalStatus: string | null;
  religion: string | null;
  motherTongue: string | null;
  caste: string | null;
  profession: string | null;
  company: string | null;
  education: string | null;
  college: string | null;
  incomeBracket: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  nativePlace: string | null;
  bio: string | null;
  hobbies: string[];
  smoking: MatrimonySmokingHabit | null;
  drinking: MatrimonyDrinkingHabit | null;
  photoUrls: string[];
  photosLimited: boolean;
  family: {
    father: string | null;
    mother: string | null;
    siblings: string | null;
    familyType: string | null;
    familyValues: string | null;
  };
  partnerPreferences: {
    ageMin: number | null;
    ageMax: number | null;
    heightMinCm: number | null;
    heightMaxCm: number | null;
    educationNote: string | null;
    professionNote: string | null;
    locationNote: string | null;
  };
  partnerOtherExpectations: string | null;
  privacy: MatrimonyPrivacySettings | null;
  status: MatrimonyProfileStatus;
  draftStep: number;
  verified: boolean;
  completionPercent: number | null;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
}

export interface MatrimonyInterest {
  id: string;
  fromProfileId: string;
  toProfileId: string;
  message: string | null;
  status: MatrimonyInterestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MatrimonyConversation {
  id: string;
  profileIdLower: string;
  profileIdHigher: string;
  createdAt: string;
}

export interface MatrimonyChatMessage {
  id: string;
  conversationId: string;
  senderProfileId: string;
  senderUserId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export const matrimonyApi = {
  meSummary: () => api<MatrimonyMeSummary>("/api/v1/matrimony/me/summary"),

  dashboard: () => api<MatrimonyDashboard>("/api/v1/matrimony/me/dashboard"),

  recordProfileView: (profileId: string) =>
    api<void>(`/api/v1/matrimony/profiles/${profileId}/view`, { method: "POST" }),

  toggleFavorite: (profileId: string) =>
    api<{ favorited: boolean }>(`/api/v1/matrimony/profiles/${profileId}/favorite`, { method: "POST" }),

  listFavorites: () => api<MatrimonyProfileCard[]>("/api/v1/matrimony/favorites"),

  listBlocks: () => api<string[]>("/api/v1/matrimony/blocks"),

  blockUser: (userId: string) =>
    api<void>(`/api/v1/matrimony/blocks/${userId}`, { method: "POST" }),

  unblockUser: (userId: string) =>
    api<void>(`/api/v1/matrimony/blocks/${userId}`, { method: "DELETE" }),

  searchProfiles: (params?: {
    gender?: MatrimonyGender;
    city?: string;
    minAge?: number;
    maxAge?: number;
    profession?: string;
    /** Search by display name */
    q?: string;
    page?: number;
    size?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.gender) q.set("gender", params.gender);
    if (params?.city) q.set("city", params.city);
    if (params?.minAge != null) q.set("minAge", String(params.minAge));
    if (params?.maxAge != null) q.set("maxAge", String(params.maxAge));
    if (params?.profession) q.set("profession", params.profession);
    if (params?.q && params.q.trim()) q.set("q", params.q.trim());
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.size != null) q.set("size", String(params.size));
    const qs = q.toString();
    return api<Paginated<MatrimonyProfileCard>>(`/api/v1/matrimony/profiles${qs ? `?${qs}` : ""}`);
  },

  getProfile: (id: string) => api<MatrimonyProfileDetail>(`/api/v1/matrimony/profiles/${id}`),

  createProfile: (body: {
    displayName: string;
    gender: MatrimonyGender;
    dateOfBirth: string;
    profileSubject: MatrimonyProfileSubject;
    relativeRelation?: string;
    heightCm?: number;
    city?: string;
    state?: string;
    country?: string;
  }) =>
    api<MatrimonyProfileDetail>("/api/v1/matrimony/profiles", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateProfile: (id: string, body: Record<string, unknown>) =>
    api<MatrimonyProfileDetail>(`/api/v1/matrimony/profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  activateProfile: (id: string) =>
    api<MatrimonyProfileDetail>(`/api/v1/matrimony/profiles/${id}/activate`, { method: "POST" }),

  archiveProfile: (id: string) =>
    api<void>(`/api/v1/matrimony/profiles/${id}`, { method: "DELETE" }),

  sendInterest: (body: { fromProfileId: string; toProfileId: string; message?: string }) =>
    api<MatrimonyInterest>("/api/v1/matrimony/interests", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listInterestsSent: (params?: { page?: number; size?: number }) => {
    const q = new URLSearchParams();
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.size != null) q.set("size", String(params.size));
    const qs = q.toString();
    return api<Paginated<MatrimonyInterest>>(`/api/v1/matrimony/interests/sent${qs ? `?${qs}` : ""}`);
  },

  listInterestsReceived: (params?: { page?: number; size?: number }) => {
    const q = new URLSearchParams();
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.size != null) q.set("size", String(params.size));
    const qs = q.toString();
    return api<Paginated<MatrimonyInterest>>(`/api/v1/matrimony/interests/received${qs ? `?${qs}` : ""}`);
  },

  acceptInterest: (id: string) =>
    api<MatrimonyInterest>(`/api/v1/matrimony/interests/${id}/accept`, { method: "PUT" }),

  rejectInterest: (id: string) =>
    api<MatrimonyInterest>(`/api/v1/matrimony/interests/${id}/reject`, { method: "PUT" }),

  withdrawInterest: (id: string) =>
    api<MatrimonyInterest>(`/api/v1/matrimony/interests/${id}/withdraw`, { method: "PUT" }),

  openConversation: (body: { myProfileId: string; otherProfileId: string }) =>
    api<MatrimonyConversation>("/api/v1/matrimony/conversations", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listConversations: () => api<MatrimonyConversation[]>("/api/v1/matrimony/conversations"),

  listMessages: (conversationId: string, params?: { page?: number; size?: number }) => {
    const q = new URLSearchParams();
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.size != null) q.set("size", String(params.size));
    const qs = q.toString();
    return api<Paginated<MatrimonyChatMessage>>(
      `/api/v1/matrimony/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`
    );
  },

  sendMessage: (conversationId: string, body: { senderProfileId: string; content: string }) =>
    api<MatrimonyChatMessage>(`/api/v1/matrimony/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ─── Samaj Chat (WhatsApp-style general chat) ───────────────────────

export interface ChatParticipantSummary {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  /** ISO timestamp — other user read up to here (for ticks / receipts) */
  lastReadAt?: string | null;
}

export interface ChatConversationItem {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string | null;
  avatarUrl: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  participants: ChatParticipantSummary[];
}

export interface ChatReplySnippet {
  id: string;
  senderId: string;
  senderDisplayName: string;
  content: string | null;
  type: string;
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderDisplayName: string;
  senderAvatarUrl: string | null;
  content: string | null;
  type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  replyTo: ChatReplySnippet | null;
  deleted: boolean;
  createdAt: string;
}

export const chatApi = {
  listConversations: () =>
    api<ChatConversationItem[]>("/api/v1/chat/conversations"),

  openDirect: (otherUserId: string) =>
    api<ChatConversationItem>("/api/v1/chat/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ otherUserId }),
    }),

  createGroup: (body: { name: string; avatarUrl?: string; memberUserIds: string[] }) =>
    api<ChatConversationItem>("/api/v1/chat/conversations/group", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateGroup: (id: string, body: { name?: string; avatarUrl?: string }) =>
    api<ChatConversationItem>(`/api/v1/chat/conversations/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  addMembers: (id: string, userIds: string[]) =>
    api<void>(`/api/v1/chat/conversations/${id}/members`, {
      method: "POST",
      body: JSON.stringify({ userIds }),
    }),

  leaveGroup: (id: string) =>
    api<void>(`/api/v1/chat/conversations/${id}/leave`, { method: "DELETE" }),

  mute: (id: string, muted: boolean) =>
    api<void>(`/api/v1/chat/conversations/${id}/mute`, {
      method: "PUT",
      body: JSON.stringify({ muted }),
    }),

  listMessages: (id: string, params?: { page?: number; size?: number }) => {
    const q = new URLSearchParams();
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.size != null) q.set("size", String(params.size));
    const qs = q.toString();
    return api<Paginated<ChatMessageItem>>(
      `/api/v1/chat/conversations/${id}/messages${qs ? `?${qs}` : ""}`
    );
  },

  sendMessage: (conversationId: string, body: {
    content?: string;
    type?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    replyToId?: string;
  }) =>
    api<ChatMessageItem>(`/api/v1/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  markRead: (id: string) =>
    api<void>(`/api/v1/chat/conversations/${id}/read`, { method: "PUT" }),

  deleteMessage: (messageId: string) =>
    api<void>(`/api/v1/chat/messages/${messageId}`, { method: "DELETE" }),
};

// ==================== ADMIN MATRIMONY API ====================

export interface AdminMatrimonyProfileDto {
  id: string;
  ownerEmail: string;
  ownerUserId: string;
  displayName: string;
  gender: string;
  age: number;
  city: string;
  state: string;
  profileStatus: string;
  verified: boolean;
  visibleInSearch: boolean;
  completionPercent: number;
  photoCount: number;
  createdAt: string;
  lastActiveAt: string;
}

export interface AdminMatrimonyProfileDetailDto extends AdminMatrimonyProfileDto {
  dateOfBirth: string;
  heightCm: number;
  weightKg: number;
  profileSubject: string;
  relativeRelation: string;
  country: string;
  bio: string;
  hobbies: string[];
  photoUrls: string[];
  updatedAt: string;
}

export interface AdminMatrimonyAnalyticsDto {
  totalProfiles: number;
  activeProfiles: number;
  draftProfiles: number;
  pausedProfiles: number;
  verifiedProfiles: number;
  verificationRate: number;
  hiddenProfiles: number;
  totalInterests: number;
  totalConversations: number;
  blockCount: number;
}

export interface PaginatedAdminMatrimonyProfiles {
  content: AdminMatrimonyProfileDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const adminMatrimonyApi = {
  listProfiles: (params?: {
    page?: number;
    size?: number;
    q?: string;
    status?: string;
    gender?: string;
    minAge?: number;
    maxAge?: number;
    city?: string;
    verified?: boolean;
    visibleInSearch?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    if (params?.q) qs.set("q", params.q);
    if (params?.status) qs.set("status", params.status);
    if (params?.gender) qs.set("gender", params.gender);
    if (params?.minAge != null) qs.set("minAge", String(params.minAge));
    if (params?.maxAge != null) qs.set("maxAge", String(params.maxAge));
    if (params?.city) qs.set("city", params.city);
    if (params?.verified != null) qs.set("verified", String(params.verified));
    if (params?.visibleInSearch != null) qs.set("visibleInSearch", String(params.visibleInSearch));
    const s = qs.toString();
    return adminApi<PaginatedAdminMatrimonyProfiles>(
      `/admin/matrimony/profiles${s ? `?${s}` : ""}`
    );
  },

  getProfile: (profileId: string) =>
    adminApi<AdminMatrimonyProfileDetailDto>(
      `/admin/matrimony/profiles/${encodeURIComponent(profileId)}`
    ),

  verifyProfile: (profileId: string) =>
    adminApi<AdminMatrimonyProfileDto>(
      `/admin/matrimony/profiles/${encodeURIComponent(profileId)}/verify`,
      { method: "POST" }
    ),

  toggleVisibility: (profileId: string) =>
    adminApi<AdminMatrimonyProfileDto>(
      `/admin/matrimony/profiles/${encodeURIComponent(profileId)}/visibility`,
      { method: "POST" }
    ),

  getAnalytics: () =>
    adminApi<AdminMatrimonyAnalyticsDto>("/admin/matrimony/analytics"),
};

// ==================== ADMIN MATRIMONY SAFETY API ====================

export interface AdminMatrimonyInterestDto {
  id: string;
  fromProfileId: string;
  fromProfileName: string;
  fromUserEmail: string;
  toProfileId: string;
  toProfileName: string;
  toUserEmail: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface AdminMatrimonyBlockDto {
  id: string;
  ownerEmail: string;
  ownerUserId: string;
  blockedEmail: string;
  blockedUserId: string;
  createdAt: string;
}

export interface PaginatedAdminMatrimonyInterests {
  content: AdminMatrimonyInterestDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface PaginatedAdminMatrimonyBlocks {
  content: AdminMatrimonyBlockDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const adminMatrimonySafetyApi = {
  listInterests: (params?: {
    page?: number;
    size?: number;
    q?: string;
    status?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    if (params?.q) qs.set("q", params.q);
    if (params?.status) qs.set("status", params.status);
    const s = qs.toString();
    return adminApi<PaginatedAdminMatrimonyInterests>(
      `/admin/matrimony/safety/interests${s ? `?${s}` : ""}`
    );
  },

  listBlocks: (params?: { page?: number; size?: number; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    if (params?.q) qs.set("q", params.q);
    const s = qs.toString();
    return adminApi<PaginatedAdminMatrimonyBlocks>(
      `/admin/matrimony/safety/blocks${s ? `?${s}` : ""}`
    );
  },

  forceBlockUser: (blockingUserId: string, blockedUserId: string) =>
    adminApi<AdminMatrimonyBlockDto>(
      `/admin/matrimony/safety/blocks/${encodeURIComponent(blockingUserId)}/${encodeURIComponent(blockedUserId)}`,
      { method: "POST" }
    ),

  unblockUser: (blockingUserId: string, blockedUserId: string) =>
    adminApi<void>(
      `/admin/matrimony/safety/blocks/${encodeURIComponent(blockingUserId)}/${encodeURIComponent(blockedUserId)}`,
      { method: "DELETE" }
    ),
};

// ==================== ADMIN MATRIMONY CONTENT MODERATION API ====================

export interface AdminMatrimonyPhotoDto {
  profileId: string;
  profileName: string;
  ownerEmail: string;
  photoUrl: string;
  flagged: boolean;
  createdAt: string;
}

export interface AdminMatrimonyBioDto {
  profileId: string;
  profileName: string;
  ownerEmail: string;
  bio: string;
  flagged: boolean;
  createdAt: string;
}

export interface PaginatedAdminMatrimonyPhotos {
  content: AdminMatrimonyPhotoDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface PaginatedAdminMatrimonyBios {
  content: AdminMatrimonyBioDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ==================== ADMIN SETTINGS API ====================

export interface SmtpConfigDto {
  host: string;
  port: number;
  username: string;
  /**
   * Optional. Leave blank to keep the existing stored password on the server.
   * Server never returns the current password.
   */
  password?: string;
  fromEmail: string;
  fromName: string;
  configured: boolean;
}

export interface MaintenanceModeDto {
  enabled: boolean;
  message: string;
  endTime?: string | null;
}

export interface CmsMobileBannerDto {
  id: string;
  title: string;
  imageUrl: string;
  redirectType: "INTERNAL" | "EXTERNAL";
  redirectTarget: string;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageConfigDto {
  provider: string;
  s3Bucket: string;
  s3Region: string;
  s3PublicBaseUrl: string;
  s3Endpoint: string;
  s3Configured: boolean;
  localRoot: string;
  localPublicBaseUrl: string;
  localConfigured: boolean;
}

export interface AdminAuditLogDto {
  id: string;
  action: string;
  resource: string;
  changesBefore: string;
  changesAfter: string;
  adminUserId: string;
  createdAt: string;
  ipAddress: string;
}

export interface AdminAuditLogsPageDto {
  content: AdminAuditLogDto[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface AdminSettingsDto {
  smtp: SmtpConfigDto;
  maintenanceMode: MaintenanceModeDto;
  storageConfig: StorageConfigDto;
  cmsBanners: CmsMobileBannerDto[];
}

export const adminSettingsApi = {
  getAll: () => adminApi<AdminSettingsDto>("/admin/settings"),

  updateSmtp: (data: SmtpConfigDto) =>
    adminApi<SmtpConfigDto>("/admin/settings/smtp", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateMaintenanceMode: (data: MaintenanceModeDto) =>
    adminApi<MaintenanceModeDto>("/admin/settings/maintenance-mode", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateStorageConfig: (data: Partial<StorageConfigDto>) =>
    adminApi<StorageConfigDto>("/admin/settings/storage", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  listBanners: () =>
    adminApi<CmsMobileBannerDto[]>("/admin/settings/cms/banners"),

  createBanner: (data: Omit<CmsMobileBannerDto, "id" | "createdAt" | "updatedAt" | "active">) =>
    adminApi<CmsMobileBannerDto>("/admin/settings/cms/banners", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateBanner: (bannerId: string, data: Partial<CmsMobileBannerDto>) =>
    adminApi<CmsMobileBannerDto>(
      `/admin/settings/cms/banners/${encodeURIComponent(bannerId)}`,
      { method: "PUT", body: JSON.stringify(data) }
    ),

  deleteBanner: (bannerId: string) =>
    adminApi<void>(`/admin/settings/cms/banners/${encodeURIComponent(bannerId)}`, {
      method: "DELETE",
    }),

  listAuditLogs: (params?: { page?: number; size?: number; resource?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    if (params?.resource) qs.set("resource", params.resource);
    const s = qs.toString();
    return adminApi<AdminAuditLogsPageDto>(
      `/admin/settings/audit-logs${s ? `?${s}` : ""}`
    );
  },
};

// ==================== ACHIEVERS ====================

export type AchievementFieldType = "TEXT" | "LONG_TEXT" | "DATE" | "LINK" | "IMAGE";

export interface AchievementFieldItem {
  id: string;
  type: string;
  label: string;
  value: string;
}

export interface AchievementMarqueeCardDto {
  id: string;
  headline: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
}

export interface AchievementDetailDto {
  id: string;
  headline: string;
  fields: AchievementFieldItem[];
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  userProfileKey: string | null;
  marqueeEnabled: boolean;
  marqueeStart: string | null;
  marqueeEnd: string | null;
}

export interface AchievementPageDto {
  content: AchievementDetailDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AchievementFieldTemplateDto {
  id: string;
  name: string;
  schemaJson: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementAdminSummaryDto {
  id: string;
  headline: string;
  status: string;
  userId: string;
  userEmail: string;
  userName: string;
  marqueeEnabled: boolean;
  marqueeStart: string | null;
  marqueeEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementAdminPageDto {
  content: AchievementAdminSummaryDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const achieversApi = {
  marquee: () => api<AchievementMarqueeCardDto[]>("/api/v1/achievements/marquee"),

  fieldTemplates: () => api<AchievementFieldTemplateDto[]>("/api/v1/achievements/field-templates"),

  list: (params?: { view?: "approved" | "mine"; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    qs.set("view", params?.view ?? "approved");
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    return api<AchievementPageDto>(`/api/v1/achievements?${qs.toString()}`);
  },

  get: (id: string) => api<AchievementDetailDto>(`/api/v1/achievements/${encodeURIComponent(id)}`),

  create: (body: { headline: string; fields: AchievementFieldItem[] }) =>
    api<AchievementDetailDto>("/api/v1/achievements", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: string, body: { headline: string; fields: AchievementFieldItem[] }) =>
    api<AchievementDetailDto>(`/api/v1/achievements/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

export const adminAchieversApi = {
  list: (params?: { status?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    const s = qs.toString();
    return adminApi<AchievementAdminPageDto>(`/admin/achievements${s ? `?${s}` : ""}`);
  },

  get: (id: string) => adminApi<AchievementDetailDto>(`/admin/achievements/${encodeURIComponent(id)}`),

  fullUpdate: (
    id: string,
    body: {
      headline: string;
      fields: AchievementFieldItem[];
      status: string;
      marqueeEnabled?: boolean | null;
      marqueeStart?: string | null;
      marqueeEnd?: string | null;
      rejectionReason?: string | null;
    }
  ) =>
    adminApi<AchievementDetailDto>(`/admin/achievements/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    adminApi<void>(`/admin/achievements/${encodeURIComponent(id)}`, { method: "DELETE" }),

  approve: (id: string, body?: { marqueeDays?: number; marqueeEnabled?: boolean | null }) =>
    adminApi<AchievementDetailDto>(`/admin/achievements/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  reject: (id: string, reason: string) =>
    adminApi<AchievementDetailDto>(`/admin/achievements/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  patchMarquee: (id: string, body: { marqueeEnabled?: boolean; marqueeEnd?: string | null }) =>
    adminApi<AchievementDetailDto>(`/admin/achievements/${encodeURIComponent(id)}/marquee`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  listTemplates: (activeOnly?: boolean) => {
    const qs = new URLSearchParams();
    if (activeOnly) qs.set("activeOnly", "true");
    const s = qs.toString();
    return adminApi<AchievementFieldTemplateDto[]>(
      `/admin/achievement-templates${s ? `?${s}` : ""}`
    );
  },

  createTemplate: (body: { name: string; schemaJson: string }) =>
    adminApi<AchievementFieldTemplateDto>("/admin/achievement-templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateTemplate: (id: string, body: { name?: string; schemaJson?: string; active?: boolean }) =>
    adminApi<AchievementFieldTemplateDto>(`/admin/achievement-templates/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteTemplate: (id: string) =>
    adminApi<void>(`/admin/achievement-templates/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const adminMatrimonyContentApi = {
  listPhotos: (params?: { page?: number; size?: number; q?: string; flagged?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    if (params?.q) qs.set("q", params.q);
    if (params?.flagged != null) qs.set("flagged", String(params.flagged));
    const s = qs.toString();
    return adminApi<PaginatedAdminMatrimonyPhotos>(
      `/admin/matrimony/content/photos${s ? `?${s}` : ""}`
    );
  },

  listBios: (params?: { page?: number; size?: number; q?: string; flagged?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    if (params?.q) qs.set("q", params.q);
    if (params?.flagged != null) qs.set("flagged", String(params.flagged));
    const s = qs.toString();
    return adminApi<PaginatedAdminMatrimonyBios>(
      `/admin/matrimony/content/bios${s ? `?${s}` : ""}`
    );
  },
};

// ── Samaj History ────────────────────────────────────────────────────────────

export interface HistoryDto {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string | null;
  location: string;
  description: string | null;
  imageUrl: string | null;
  createdByUserId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface HistoryPageResponse {
  content: HistoryDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type HistoryCreateBody = {
  title: string;
  type: string;
  date: string;
  time?: string | null;
  location: string;
  description?: string | null;
  imageUrl?: string | null;
};

export type HistoryUpdateBody = HistoryCreateBody;

export const adminHistoryApi = {
  list: (params?: { page?: number; size?: number; type?: string; fromDate?: string; toDate?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    if (params?.type) qs.set("type", params.type);
    if (params?.fromDate) qs.set("fromDate", params.fromDate);
    if (params?.toDate) qs.set("toDate", params.toDate);
    if (params?.q) qs.set("q", params.q);
    const s = qs.toString();
    return adminApi<HistoryPageResponse>(`/admin/history${s ? `?${s}` : ""}`);
  },
  get: (id: number) => adminApi<HistoryDto>(`/admin/history/${id}`),
  create: (body: HistoryCreateBody) =>
    adminApi<HistoryDto>("/admin/history", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: HistoryUpdateBody) =>
    adminApi<HistoryDto>(`/admin/history/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) =>
    adminApi<void>(`/admin/history/${id}`, { method: "DELETE" }),
};

/** Logged-in members: read-only Samaj timeline (same entries as admin curates). */
export const samajHistoryApi = {
  list: (params?: { page?: number; size?: number; type?: string; fromDate?: string; toDate?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    if (params?.type) qs.set("type", params.type);
    if (params?.fromDate) qs.set("fromDate", params.fromDate);
    if (params?.toDate) qs.set("toDate", params.toDate);
    if (params?.q) qs.set("q", params.q);
    const s = qs.toString();
    return api<HistoryPageResponse>(`/api/v1/history${s ? `?${s}` : ""}`);
  },
  get: (id: number) => api<HistoryDto>(`/api/v1/history/${encodeURIComponent(String(id))}`),
};

// Device Token API — registers/unregisters FCM tokens so the backend can send targeted push notifications
export const deviceTokenApi = {
  register: (token: string, platform = "ANDROID") =>
    api<void>("/api/v1/device-tokens", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    }),
  unregister: (token: string) =>
    api<void>("/api/v1/device-tokens", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    }),
};

// ==================== DONATIONS ====================

export interface DonationPublicConfigDto {
  enabled: boolean;
  minAmountPaise: number;
  maxAmountPaise: number;
  keyId: string;
}

export interface DonationAdminConfigDto {
  enabled: boolean;
  minAmountPaise: number;
  maxAmountPaise: number;
  keyId: string;
  configured: boolean;
}

export interface DonationConfigUpdateDto {
  keyId?: string;
  keySecret?: string;
  enabled?: boolean;
  minAmountPaise?: number;
  maxAmountPaise?: number;
}

export interface CreateOrderResponseDto {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}

export interface DonationItemDto {
  id: number;
  userId: string | null;
  userName: string | null;
  amountPaise: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  notes: string | null;
  createdAt: string | null;
}

export interface DonationPageDto {
  content: DonationItemDto[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface DonationStatsDto {
  totalSuccessAmountPaise: number;
  thisMonthSuccessAmountPaise: number;
  totalDonors: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
}

export const donationApi = {
  config: () => api<DonationPublicConfigDto>("/api/v1/donations/config"),

  createOrder: (amountPaise: number, notes?: string) =>
    api<CreateOrderResponseDto>("/api/v1/donations/order", {
      method: "POST",
      body: JSON.stringify({ amountPaise, notes }),
    }),

  verifyPayment: (body: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    notes?: string;
  }) =>
    api<DonationItemDto>("/api/v1/donations/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  myDonations: (params?: { page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    const s = qs.toString();
    return api<DonationPageDto>(`/api/v1/donations/my${s ? `?${s}` : ""}`);
  },
};

export const adminDonationApi = {
  list: (params?: { page?: number; size?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.size != null) qs.set("size", String(params.size));
    if (params?.status) qs.set("status", params.status);
    const s = qs.toString();
    return adminApi<DonationPageDto>(`/admin/donations${s ? `?${s}` : ""}`);
  },

  stats: () => adminApi<DonationStatsDto>("/admin/donations/stats"),

  getConfig: () => adminApi<DonationAdminConfigDto>("/admin/donations/config"),

  updateConfig: (body: DonationConfigUpdateDto) =>
    adminApi<DonationAdminConfigDto>("/admin/donations/config", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

// ---- Business Listings ----

export interface BusinessSummaryDto {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  phone: string | null;
  firstPhoto: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "BANNED";
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  featured: boolean;
  viewCount: number;
  createdAt: string;
}

export interface BusinessDetailDto {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  photos: string[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "BANNED";
  rejectionReason: string | null;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  ownerProfileKey: string | null;
  featured: boolean;
  viewCount: number;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessPageDto {
  content: BusinessSummaryDto[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface BusinessAdminSummaryDto {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "BANNED";
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessAdminPageDto {
  content: BusinessAdminSummaryDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface BusinessFormData {
  name: string;
  description?: string;
  category?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  website?: string;
  photos?: string[];
}

export const businessApi = {
  list: (params?: { category?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.size !== undefined) qs.set("size", String(params.size));
    const q = qs.toString();
    return api<BusinessPageDto>(`/api/v1/business${q ? "?" + q : ""}`);
  },
  get: (id: string) => api<BusinessDetailDto>(`/api/v1/business/${id}`),
  listMine: (params?: { page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.size !== undefined) qs.set("size", String(params.size));
    const q = qs.toString();
    return api<BusinessPageDto>(`/api/v1/business/my${q ? "?" + q : ""}`);
  },
  getMine: (id: string) => api<BusinessDetailDto>(`/api/v1/business/my/${id}`),
  create: (data: BusinessFormData) =>
    api<BusinessDetailDto>("/api/v1/business", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: BusinessFormData) =>
    api<BusinessDetailDto>(`/api/v1/business/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => api<void>(`/api/v1/business/${id}`, { method: "DELETE" }),
};

export const adminBusinessApi = {
  list: (params?: { status?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== "ALL") qs.set("status", params.status);
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.size !== undefined) qs.set("size", String(params.size));
    const q = qs.toString();
    return adminApi<BusinessAdminPageDto>(`/admin/business${q ? "?" + q : ""}`);
  },
  get: (id: string) => adminApi<BusinessDetailDto>(`/admin/business/${id}`),
  approve: (id: string, featured?: boolean) =>
    adminApi<BusinessDetailDto>(`/admin/business/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ featured: featured ?? false }),
    }),
  reject: (id: string, reason: string) =>
    adminApi<BusinessDetailDto>(`/admin/business/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  ban: (id: string) =>
    adminApi<BusinessDetailDto>(`/admin/business/${id}/ban`, { method: "POST" }),
  toggleFeatured: (id: string) =>
    adminApi<BusinessDetailDto>(`/admin/business/${id}/toggle-featured`, { method: "POST" }),
  delete: (id: string) => adminApi<void>(`/admin/business/${id}`, { method: "DELETE" }),
};

// ---- Job Listings ----

export interface JobSummaryDto {
  id: string;
  title: string;
  company: string;
  location: string | null;
  jobType: string | null;
  category: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  featured: boolean;
  postedByAdmin: boolean;
  deadline: string | null;
  viewCount: number;
  createdAt: string;
}

export interface JobDetailDto {
  id: string;
  title: string;
  company: string;
  location: string | null;
  jobType: string | null;
  category: string | null;
  description: string;
  requirements: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  applyUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  featured: boolean;
  postedByAdmin: boolean;
  submittedById: string | null;
  submittedByName: string | null;
  deadline: string | null;
  viewCount: number;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobPageDto {
  content: JobSummaryDto[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface JobAdminSummaryDto {
  id: string;
  title: string;
  company: string;
  location: string | null;
  jobType: string | null;
  category: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  postedByAdmin: boolean;
  featured: boolean;
  submittedById: string | null;
  submittedByName: string | null;
  submittedByEmail: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobAdminPageDto {
  content: JobAdminSummaryDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface JobFormData {
  title: string;
  company: string;
  description: string;
  location?: string;
  jobType?: string;
  category?: string;
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  applyUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  deadline?: string;
}

export const jobApi = {
  list: (params?: { category?: string; jobType?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.jobType) qs.set("jobType", params.jobType);
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.size !== undefined) qs.set("size", String(params.size));
    const q = qs.toString();
    return api<JobPageDto>(`/api/v1/jobs${q ? "?" + q : ""}`);
  },
  get: (id: string) => api<JobDetailDto>(`/api/v1/jobs/${id}`),
  listMine: (params?: { page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.size !== undefined) qs.set("size", String(params.size));
    const q = qs.toString();
    return api<JobPageDto>(`/api/v1/jobs/my${q ? "?" + q : ""}`);
  },
  getMine: (id: string) => api<JobDetailDto>(`/api/v1/jobs/my/${id}`),
  submit: (data: JobFormData) =>
    api<JobDetailDto>("/api/v1/jobs", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: JobFormData) =>
    api<JobDetailDto>(`/api/v1/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => api<void>(`/api/v1/jobs/${id}`, { method: "DELETE" }),
};

export const adminJobApi = {
  list: (params?: { status?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== "ALL") qs.set("status", params.status);
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.size !== undefined) qs.set("size", String(params.size));
    const q = qs.toString();
    return adminApi<JobAdminPageDto>(`/admin/jobs${q ? "?" + q : ""}`);
  },
  get: (id: string) => adminApi<JobDetailDto>(`/admin/jobs/${id}`),
  create: (data: JobFormData) =>
    adminApi<JobDetailDto>("/admin/jobs", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: JobFormData) =>
    adminApi<JobDetailDto>(`/admin/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  approve: (id: string, featured?: boolean) =>
    adminApi<JobDetailDto>(`/admin/jobs/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ featured: featured ?? false }),
    }),
  reject: (id: string, reason: string) =>
    adminApi<JobDetailDto>(`/admin/jobs/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  toggleFeatured: (id: string) =>
    adminApi<JobDetailDto>(`/admin/jobs/${id}/toggle-featured`, { method: "POST" }),
  delete: (id: string) => adminApi<void>(`/admin/jobs/${id}`, { method: "DELETE" }),
};
