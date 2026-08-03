/**
 * Location permission helpers for Play-compliant, on-demand GPS.
 * Never call geolocation until the user opts in (and sees a rationale when needed).
 */

export type GeoPermissionState = "granted" | "denied" | "prompt" | "unknown";

export async function getGeolocationPermissionState(): Promise<GeoPermissionState> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "denied";
  try {
    if (!navigator.permissions?.query) return "unknown";
    const result = await navigator.permissions.query({ name: "geolocation" });
    if (result.state === "granted" || result.state === "denied" || result.state === "prompt") {
      return result.state;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function detectDeviceLocation(options?: {
  timeoutMs?: number;
}): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      {
        // Approximate is enough for city labels — matches COARSE_LOCATION only.
        enableHighAccuracy: false,
        timeout: options?.timeoutMs ?? 12_000,
        maximumAge: 60_000,
      },
    );
  });
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=12`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        state?: string;
        state_district?: string;
      };
    };
    const a = data.address ?? {};
    const place = a.city || a.town || a.village || a.suburb || data.name;
    const region = a.state || a.state_district;
    const label = [place, region].filter(Boolean).join(", ");
    return label || null;
  } catch {
    return null;
  }
}
