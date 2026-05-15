import axios from "axios";
import { readCsrfCookie } from "../lib/csrf";

const baseURL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let csrfPrimed = false;
let primingPromise = null;

async function primeCsrf() {
  if (csrfPrimed) return;
  // De-dupe concurrent priming requests (e.g. two mutations firing on mount).
  if (primingPromise) return primingPromise;
  primingPromise = api
    .get("/api/auth/csrf-token")
    .then(() => {
      csrfPrimed = true;
    })
    .finally(() => {
      primingPromise = null;
    });
  return primingPromise;
}

/**
 * Request interceptor — attaches X-CSRF-Token to every state-changing
 * request. Reads the token from the non-HttpOnly cookie set by the server.
 */
api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return config;

  if (!readCsrfCookie()) await primeCsrf();
  const token = readCsrfCookie();
  if (token) config.headers["x-csrf-token"] = token;
  return config;
});

/**
 * Response interceptor — when a state-changing request returns 403 with
 * "Invalid CSRF token", transparently re-prime the token and retry the
 * original request exactly once. The user shouldn't have to refresh just
 * because their tab was idle while the session rotated.
 *
 * If the retry also fails, the error is rewritten with friendly,
 * actionable copy that names the recovery action ("refresh the page").
 */
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    const status = err.response?.status;
    const isCsrfError =
      status === 403 && err.response?.data?.error === "Invalid CSRF token";

    if (isCsrfError && original && !original.__csrfRetried) {
      original.__csrfRetried = true;
      csrfPrimed = false;
      try {
        await primeCsrf();
        const fresh = readCsrfCookie();
        if (fresh) {
          original.headers = { ...(original.headers || {}), "x-csrf-token": fresh };
        }
        return api.request(original);
      } catch {
        // fall through and surface a friendlier message
      }
    }

    if (isCsrfError && original?.__csrfRetried) {
      err.response.data = {
        ...(err.response.data || {}),
        error:
          "Your session expired or another tab signed out. Please refresh the page and try again.",
      };
    }

    return Promise.reject(err);
  }
);
