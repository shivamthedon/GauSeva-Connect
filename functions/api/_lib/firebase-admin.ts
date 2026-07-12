// Verifies a Firebase ID token via Google Identity Toolkit + local JWT claim checks.
// Cached briefly per-token to cut latency on repeated API calls.

const FALLBACK_API_KEY = "AIzaSyC_V9CuYJr-UNQS6vz_qEYvhOb8iby8htA";
const FALLBACK_PROJECT = "gauseva-connect-87e8d";

const TOKEN_CACHE_TTL_MS = 4 * 60 * 1000;
const TOKEN_CACHE_MAX = 200;
const tokenCache = new Map<string, { user: VerifiedFirebaseUser; expires: number }>();

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

function cacheKey(idToken: string): string {
  if (idToken.length <= 64) return idToken;
  return `${idToken.slice(0, 24)}…${idToken.slice(-24)}:${idToken.length}`;
}

function getCached(idToken: string): VerifiedFirebaseUser | null {
  const key = cacheKey(idToken);
  const hit = tokenCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    tokenCache.delete(key);
    return null;
  }
  return hit.user;
}

function setCached(idToken: string, user: VerifiedFirebaseUser): void {
  if (tokenCache.size >= TOKEN_CACHE_MAX) {
    const first = tokenCache.keys().next().value;
    if (first) tokenCache.delete(first);
  }
  tokenCache.set(cacheKey(idToken), {
    user,
    expires: Date.now() + TOKEN_CACHE_TTL_MS,
  });
}

/**
 * Local structural + claim checks before calling Google.
 * Rejects obviously forged / expired / wrong-project tokens cheaply.
 */
function assertJwtClaims(idToken: string, projectId: string): boolean {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return false;
    // base64url decode payload
    let payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payloadB64.length % 4) payloadB64 += "=";
    // atob available on Workers
    const json = atob(payloadB64);
    const claims = JSON.parse(json) as Record<string, any>;
    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp === "number" && claims.exp < now - 30) return false;
    if (typeof claims.iat === "number" && claims.iat > now + 300) return false;
    // Firebase ID tokens: aud === projectId, iss === https://securetoken.google.com/<projectId>
    if (claims.aud && String(claims.aud) !== projectId) return false;
    if (claims.iss && String(claims.iss) !== `https://securetoken.google.com/${projectId}`) {
      return false;
    }
    if (!claims.user_id && !claims.sub) return false;
    return true;
  } catch {
    return false;
  }
}

export async function verifyFirebaseIdToken(
  env: any,
  idToken: string,
): Promise<VerifiedFirebaseUser | null> {
  if (!idToken || typeof idToken !== "string" || idToken.length > 4096) return null;

  const projectId =
    env?.FIREBASE_PROJECT_ID ||
    env?.VITE_FIREBASE_PROJECT_ID ||
    FALLBACK_PROJECT;

  if (!assertJwtClaims(idToken, projectId)) return null;

  const cached = getCached(idToken);
  if (cached) return cached;

  const apiKey = env?.FIREBASE_API_KEY || env?.VITE_FIREBASE_API_KEY || FALLBACK_API_KEY;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const user = data?.users?.[0];
    if (!user || !user.localId || !user.email) return null;
    // Reject disabled accounts
    if (user.disabled === true) return null;
    const verified: VerifiedFirebaseUser = {
      uid: user.localId,
      email: String(user.email).toLowerCase(),
      emailVerified: !!user.emailVerified,
    };
    setCached(idToken, verified);
    return verified;
  } catch {
    return null;
  }
}
