/**
 * Per-browser sign-in counter, persisted in localStorage.
 *
 * Honest scope: this counts successful logins from THIS browser only —
 * not the admin's lifetime count, not anything tracked by IP. The backend
 * doesn't store sign-in counts, and we don't want to fake the number.
 *
 * Returns 0 for "first time on this device" — the caller decides whether
 * to render anything in that state.
 */

const STORAGE_KEY = "pb.signin.count";

export function readSigninCount() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const n = raw == null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function bumpSigninCount() {
  if (typeof window === "undefined") return 0;
  try {
    const current = readSigninCount();
    const next = current + 1;
    window.localStorage.setItem(STORAGE_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}
