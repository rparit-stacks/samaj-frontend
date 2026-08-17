import type { DirectoryActionDto } from "@/lib/api";

/** Normalises an Indian phone number to the international form wa.me expects. */
function toWhatsAppNumber(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.startsWith("0") && d.length === 11) return `91${d.slice(1)}`;
  return d;
}

/** Builds the href a directory action button should navigate to. */
export function getActionHref(action: DirectoryActionDto): string {
  const t = (action.type ?? "").toUpperCase();
  const value = (action.value ?? "").trim();
  if (!value) return "#";
  switch (t) {
    case "CALL":
      return `tel:${value.replace(/[^\d+]/g, "")}`;
    case "EMAIL":
      return `mailto:${value}`;
    case "WHATSAPP":
      return `https://wa.me/${toWhatsAppNumber(value)}`;
    default:
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }
}

/**
 * Opens a directory action.
 *
 * `tel:` and `mailto:` must be assigned to location rather than passed to
 * window.open — inside the Capacitor WebView window.open leaves a blank tab and
 * the dialler/mail app never launches. http(s) targets still open externally.
 */
export function openAction(action: DirectoryActionDto): void {
  const href = getActionHref(action);
  if (href === "#") return;
  const t = (action.type ?? "").toUpperCase();
  if (t === "CALL" || t === "EMAIL") {
    window.location.href = href;
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}
