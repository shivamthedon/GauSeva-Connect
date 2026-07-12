/**
 * Admin session helpers — prefer headers over query-string tokens
 * so session tokens do not appear in server access logs / Referer.
 */

const TOKEN_KEY = "adminToken";
const AUTH_FLAG_KEY = "adminAuth";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  const t = localStorage.getItem(TOKEN_KEY);
  return t && t.trim() ? t.trim() : null;
}

/** True only when a non-empty session token exists (not the weak adminAuth flag alone). */
export function hasAdminSessionToken(): boolean {
  return !!getAdminToken();
}

export function setAdminSession(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(AUTH_FLAG_KEY, "true");
}

export function clearAdminSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_FLAG_KEY);
}

/** Headers for admin API calls — never put the token in the URL. */
export function adminAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getAdminToken();
  if (token) {
    headers["X-Admin-Token"] = token;
    // Also send Bearer for endpoints that only read Authorization
    if (!headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}
