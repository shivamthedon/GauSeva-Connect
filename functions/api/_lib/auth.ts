// Shared admin-authentication helper.
// Files/folders prefixed with `_` are ignored by Cloudflare Pages routing,
// so this is a plain importable module, not an endpoint.

const MAX_IDLE_MS = 24 * 60 * 60 * 1000; // 24h sliding window (matches admin-session.ts)

/**
 * Extracts the admin token from the request, either from an
 * `Authorization: Bearer <token>` header or an `X-Admin-Token` header.
 */
type AnyRequest = { headers: { get(name: string): string | null } };

export function getAdminToken(request: AnyRequest & { headers: { get(name: string): string | null } }): string | null {
  const authHeader = request.headers.get("Authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const b = authHeader.slice(7).trim();
    // Firebase JWTs have 3 segments — don't treat them as admin session UUIDs
    if (b && b.split(".").length !== 3) return b;
    if (b && !b.includes(".")) return b;
  }
  const custom = request.headers.get("X-Admin-Token");
  if (custom) return custom.trim();
  // HttpOnly cookie set on admin login
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(/(?:^|;\s*)gauseva_admin=([^;]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
  return null;
}

/**
 * Returns true when the request carries a valid, non-expired admin session
 * token that matches the one currently stored in the database.
 */
/** Brief in-memory cache so admin checks don't hit D1 on every API call in a burst. */
const adminTokenCache = new Map<string, { ok: boolean; exp: number }>();
const ADMIN_CACHE_TTL_MS = 15_000;

export async function isValidAdmin(env: any, request: AnyRequest): Promise<boolean> {
  try {
    const token = getAdminToken(request);
    if (!token || !env?.DB) return false;

    const cached = adminTokenCache.get(token);
    if (cached && cached.exp > Date.now()) return cached.ok;

    const row = await env.DB
      .prepare("SELECT value FROM site_settings WHERE key = 'admin_session'")
      .first();
    if (!row?.value) {
      adminTokenCache.set(token, { ok: false, exp: Date.now() + ADMIN_CACHE_TTL_MS });
      return false;
    }

    const session = JSON.parse(row.value);
    if (!session?.token || session.token !== token) {
      adminTokenCache.set(token, { ok: false, exp: Date.now() + ADMIN_CACHE_TTL_MS });
      return false;
    }

    const last = Date.parse(session.lastActive || session.createdAt || "");
    if (!Number.isNaN(last) && Date.now() - last > MAX_IDLE_MS) {
      adminTokenCache.set(token, { ok: false, exp: Date.now() + ADMIN_CACHE_TTL_MS });
      return false;
    }

    adminTokenCache.set(token, { ok: true, exp: Date.now() + ADMIN_CACHE_TTL_MS });
    return true;
  } catch {
    return false;
  }
}
