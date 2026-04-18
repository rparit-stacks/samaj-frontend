/**
 * Build-time flags (Vite). Set in `.env` / `.env.production`.
 */
export function isAdminKycEnabled(): boolean {
  return import.meta.env.VITE_ADMIN_KYC_ENABLED === "true";
}
