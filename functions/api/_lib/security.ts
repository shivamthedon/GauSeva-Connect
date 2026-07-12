// Shared security helpers for Cloudflare Pages Functions.
// Files/folders prefixed with `_` are ignored by routing.

import type { VerifiedFirebaseUser } from "./firebase-admin";
import { verifyFirebaseIdToken } from "./firebase-admin";
import { isValidAdmin, getAdminToken } from "./auth";

/** Privilege / moderation fields users must never set themselves. */
export const PRIVILEGE_FIELDS = [
  "verified",
  "featured",
  "banned",
  "banReason",
  "bannedAt",
  "status", // collection-specific statuses forced server-side where needed
  "adminUser",
  "isAdmin",
] as const;

/** Fields a non-admin may write on their own user profile. */
export const USER_PROFILE_ALLOWLIST = [
  "name",
  "displayName",
  "phone",
  "phoneNumber",
  "photoURL",
  "imageUrl",
  "address",
  "fullAddress",
  "city",
  "state",
  "pincode",
  "onboarded",
  "location",
  "bio",
  "gender",
  "role", // app role (e.g. sevak), not platform admin
  "updatedAt",
] as const;

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export function stripPrivilegeFields(body: Record<string, any>): Record<string, any> {
  const out = { ...body };
  for (const key of PRIVILEGE_FIELDS) {
    delete out[key];
  }
  return out;
}

/** Keep only allowlisted profile fields for non-admin user updates. */
export function pickUserProfileFields(body: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of USER_PROFILE_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      out[key] = body[key];
    }
  }
  return out;
}

/** Public-safe user projection (no email/phone/ban reason). */
export function sanitizePublicUser(u: any): Record<string, any> {
  if (!u || typeof u !== "object") return {};
  return {
    id: u.id,
    name: u.name || u.displayName || undefined,
    displayName: u.displayName || u.name || undefined,
    photoURL: u.photoURL || u.imageUrl || undefined,
    imageUrl: u.imageUrl || u.photoURL || undefined,
    onboarded: u.onboarded ?? false,
    banned: u.banned ?? false,
    city: u.city || undefined,
    state: u.state || undefined,
  };
}

// Use a loose request type so Cloudflare Workers Request is accepted.
type AnyRequest = { headers: { get(name: string): string | null }; url?: string };

export function getBearerToken(request: AnyRequest): string | null {
  const authHeader = request.headers.get("Authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7).trim() || null;
  return null;
}

export async function requireFirebaseUser(
  env: any,
  request: AnyRequest,
  opts?: { requireEmailVerified?: boolean },
): Promise<
  | { ok: true; user: VerifiedFirebaseUser }
  | { ok: false; status: number; error: string }
> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return { ok: false, status: 401, error: "Unauthorized. Please sign in." };
  }
  const user = await verifyFirebaseIdToken(env, idToken);
  if (!user) {
    return { ok: false, status: 401, error: "Invalid or expired session." };
  }
  if (opts?.requireEmailVerified !== false && !user.emailVerified) {
    return {
      ok: false,
      status: 403,
      error: "Please verify your email before performing this action.",
    };
  }
  return { ok: true, user };
}

export async function requireAdminOrFirebase(
  env: any,
  request: AnyRequest,
  opts?: { requireEmailVerified?: boolean },
): Promise<
  | { ok: true; admin: true; user: null }
  | { ok: true; admin: false; user: VerifiedFirebaseUser }
  | { ok: false; status: number; error: string }
> {
  if (await isValidAdmin(env, request as any)) {
    return { ok: true, admin: true, user: null };
  }
  const result = await requireFirebaseUser(env, request, opts);
  if (result.ok === false) {
    return { ok: false, status: result.status, error: result.error };
  }
  return { ok: true, admin: false, user: result.user };
}

/** Safe image extension from a file name (defaults to .jpg). */
export function safeImageExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const ext = (dot >= 0 ? fileName.slice(dot) : ".jpg").toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.has(ext)) return ".jpg";
  // Block path tricks
  if (ext.includes("/") || ext.includes("\\") || ext.includes("\0")) return ".jpg";
  return ext;
}

export function isAllowedImageContentType(contentType: string): boolean {
  const base = (contentType || "").split(";")[0].trim().toLowerCase();
  return ALLOWED_IMAGE_TYPES.has(base);
}

/** Magic-byte sniff so attackers cannot rename .html/.svg as .jpg. */
export function looksLikeImageBytes(buf: ArrayBuffer): boolean {
  const u8 = new Uint8Array(buf);
  if (u8.length < 12) return false;
  // JPEG
  if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return true;
  // PNG
  if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) return true;
  // GIF
  if (u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46) return true;
  // WEBP: RIFF....WEBP
  if (
    u8[0] === 0x52 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x46 &&
    u8[8] === 0x57 &&
    u8[9] === 0x45 &&
    u8[10] === 0x42 &&
    u8[11] === 0x50
  ) {
    return true;
  }
  return false;
}

/**
 * Lightweight rate limit via Cache API (best-effort on CF Workers).
 * Returns false when the caller should be rejected.
 */
export async function checkRateLimit(
  request: AnyRequest,
  bucket: string,
  max: number,
  windowSec: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const ip =
      request.headers.get("CF-Connecting-IP") ||
      (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      "unknown";
    const cacheKey = new Request(
      `https://gauseva-rate-limit.internal/${bucket}/${encodeURIComponent(ip)}`,
    );
    // @ts-ignore — caches.default exists on CF Workers
    const cache = typeof caches !== "undefined" ? caches.default : null;
    if (!cache) return { allowed: true };

    const now = Date.now();
    let count = 0;
    let expires = now + windowSec * 1000;

    const hit = await cache.match(cacheKey);
    if (hit) {
      try {
        const data = (await hit.json()) as { count: number; expires: number };
        if (data.expires > now) {
          count = data.count;
          expires = data.expires;
        }
      } catch {
        /* reset */
      }
    }

    count += 1;
    if (count > max) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((expires - now) / 1000)) };
    }

    const ttl = Math.max(1, Math.ceil((expires - now) / 1000));
    await cache.put(
      cacheKey,
      new Response(JSON.stringify({ count, expires }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `max-age=${ttl}`,
        },
      }),
    );
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export function rateLimitResponse(retryAfter = 60): Response {
  return Response.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}

/** Ensure admin session token is present and matches for destructive session ops. */
export function requireMatchingAdminToken(request: AnyRequest, sessionToken: string | undefined): boolean {
  const provided = getAdminToken(request as any);
  if (!provided || !sessionToken) return false;
  return provided === sessionToken;
}
