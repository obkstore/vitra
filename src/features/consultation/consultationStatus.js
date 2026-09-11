import { CONSULTATION_STATUSES } from "../../services/consultationService.js";

/**
 * Shared status metadata for consultation requests.
 * Single source of truth for Arabic labels + badge colors used by the
 * admin dashboard (table badges and per-row status selects).
 */

export const STATUS_META = {
  pending: {
    value: "pending",
    label: "قيد الانتظار",
    badgeClass: "bg-energy-100 text-energy-800",
  },
  forwarded_to_trainer: {
    value: "forwarded_to_trainer",
    label: "محالة إلى المدرّب",
    badgeClass: "bg-mental-100 text-mental-700",
  },
  resolved: {
    value: "resolved",
    label: "تم الحل",
    badgeClass: "bg-brand-100 text-brand-800",
  },
};

/** Ordered status values matching the backend enum. */
export const ORDERED_STATUSES = CONSULTATION_STATUSES.filter((status) => STATUS_META[status]);

/**
 * Formats an ISO date string for Arabic display.
 * @param {unknown} value createdAt value.
 * @returns {string} Localized date-time or a dash when invalid.
 */
export function formatRequestDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Resolves the requester's display name from the populated userId field.
 * @param {object} request Request document.
 * @returns {string} Username or a dash when unavailable.
 */
export function getRequesterName(request) {
  const userId = request?.userId;
  if (userId && typeof userId === "object" && typeof userId.username === "string") {
    return userId.username;
  }
  return "—";
}
