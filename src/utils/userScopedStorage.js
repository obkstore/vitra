/**
 * Per-user localStorage namespacing.
 *
 * Plans and profiles were stored under single global keys, so every account
 * on one browser shared the last generated plan. These helpers scope each
 * slot by username: guests keep the legacy un-suffixed key (preserving
 * existing guest data), logged-in users get `<base>:<username>`.
 *
 * All helpers accept an explicit `store` (defaulting to window.localStorage
 * when available) so they stay testable under node, which has no DOM.
 */

/**
 * Derives the storage key for an identity.
 * @param {string} base Base key (e.g. "healthplan_generated_plan").
 * @param {(string|null|undefined)} username Authenticated username, or null for guests.
 * @returns {string} Namespaced key.
 */
export function scopedKey(base, username) {
  if (typeof username === "string" && username.length > 0) {
    return `${base}:${username}`;
  }
  return base;
}

/**
 * Reads and JSON-parses a namespaced slot.
 * One-time legacy adoption: an authenticated user with no namespaced slot
 * yet inherits the pre-namespacing global slot (then the global is removed
 * so the next account starts blank instead of inheriting it).
 * @param {string} base Base key.
 * @param {(string|null|undefined)} username Authenticated username, or null for guests.
 * @param {{ getItem: (k: string) => (string|null), setItem: (k: string, v: string) => void, removeItem: (k: string) => void } | null} [store] Storage backend.
 * @returns {any|null} Parsed value or null.
 */
export function readScoped(base, username, store = null) {
  const storage = store ?? getDefaultStore();
  if (!storage) return null;

  const key = scopedKey(base, username);
  try {
    const raw = storage.getItem(key);
    if (raw) return JSON.parse(raw);

    // Legacy adoption for signed-in users only — guests ARE the legacy slot.
    if (key !== base) {
      const legacy = storage.getItem(base);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        try {
          storage.setItem(key, legacy);
        } catch {
          // Quota failure: still return the data for this session.
        }
        try {
          storage.removeItem(base);
        } catch {
          // Non-fatal: worst case the next account adopts a copy too,
          // which the namespace switch then isolates per user anyway.
        }
        return parsed;
      }
    }
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore removal failures.
    }
  }
  return null;
}

/**
 * JSON-serializes a value into a namespaced slot.
 * @param {string} base Base key.
 * @param {(string|null|undefined)} username Authenticated username, or null for guests.
 * @param {any} value Value to persist.
 * @param {{ setItem: (k: string, v: string) => void } | null} [store] Storage backend.
 * @returns {void}
 */
export function writeScoped(base, username, value, store = null) {
  const storage = store ?? getDefaultStore();
  if (!storage) return;
  try {
    storage.setItem(scopedKey(base, username), JSON.stringify(value));
  } catch {
    console.warn("localStorage quota exceeded");
  }
}

/**
 * Removes a namespaced slot.
 * @param {string} base Base key.
 * @param {(string|null|undefined)} username Authenticated username, or null for guests.
 * @param {{ removeItem: (k: string) => void } | null} [store] Storage backend.
 * @returns {void}
 */
export function removeScoped(base, username, store = null) {
  const storage = store ?? getDefaultStore();
  if (!storage) return;
  try {
    storage.removeItem(scopedKey(base, username));
  } catch {
    // Ignore removal failures.
  }
}

function getDefaultStore() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}
