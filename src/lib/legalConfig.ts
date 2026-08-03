/**
 * Single source of truth for Play Console / legal pages.
 * URLs used in Google Play Console → App content / Data safety:
 *   Privacy Policy:  https://web.suryavanshisamaj.online/privacy
 *   Account deletion: https://web.suryavanshisamaj.online/delete-account
 *   Terms of Service: https://web.suryavanshisamaj.online/terms
 */
export const LEGAL = {
  appName: "Samaj",
  orgName: "Suryavanshi Samaj",
  developerName: "Suryavanshi Samaj",
  packageId: "com.rps.samajapp",
  website: "https://web.suryavanshisamaj.online",
  lastUpdated: "3 August 2026",
  /** Minimum age — matrimony / community features are adult-oriented */
  minimumAge: 18,
  support: {
    email: "help@suryavanshisamaj.online",
    phoneDisplay: "+91 91118 11117",
    phoneE164: "+919111811117",
    phoneTel: "tel:+919111811117",
    whatsappUrl: "https://wa.me/919111811117",
    officeHours: "Mon–Sat, 10:00 AM – 6:00 PM IST",
    addressLines: [
      "401, Heritage Building, 582, MG Road",
      "Opposite Hukumchand Ghanta Ghar, New Palasia",
      "Indore, Madhya Pradesh 452001",
      "India",
    ],
    addressOneLine:
      "401, Heritage Building, 582, MG Road, Opposite Hukumchand Ghanta Ghar, New Palasia, Indore, Madhya Pradesh, 452001, India",
  },
  urls: {
    privacy: "/privacy",
    terms: "/terms",
    help: "/help",
    deleteAccount: "/delete-account",
  },
} as const;
