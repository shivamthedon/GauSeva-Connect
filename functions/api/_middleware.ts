import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "./_lib/auth";
import { checkRateLimit, rateLimitResponse } from "./_lib/security";
import { json } from "./_lib/secure-response";

// Endpoints that require a valid admin session token.
const ADMIN_RULES: { method: string; test: (path: string) => boolean }[] = [
  { method: "GET", test: (p) => p === "/api/reports" },
  { method: "GET", test: (p) => p === "/api/contacts" },
  { method: "GET", test: (p) => p === "/api/audit-log" },
  { method: "POST", test: (p) => p === "/api/audit-log" },
  { method: "PUT", test: (p) => p === "/api/settings" },
  { method: "DELETE", test: (p) => p === "/api/users" || p.startsWith("/api/users/") },
  { method: "PUT", test: (p) => p.startsWith("/api/data/") },
];

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function withSecurityHeaders(res: Response): Response {
  const headers = new Headers(res.headers as Headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export async function onRequest(context: EventContext<any, string, any>) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // Block non-standard methods on API
  if (path.startsWith("/api/") && !["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"].includes(method)) {
    return withSecurityHeaders(json({ error: "Method not allowed" }, 405));
  }

  // Minimal CORS preflight for same-origin SPA (no wide-open *)
  if (method === "OPTIONS" && path.startsWith("/api/")) {
    return withSecurityHeaders(
      new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token, X-File-Name",
          "Access-Control-Max-Age": "86400",
        },
      }),
    );
  }

  // Brute-force protection on admin login
  if (method === "POST" && path === "/api/admin-session") {
    const rl = await checkRateLimit(request, "admin-login", 10, 300);
    if (!rl.allowed) return withSecurityHeaders(rateLimitResponse(rl.retryAfter));
  }

  // Brute-force protection on admin account claim
  if (method === "POST" && path === "/api/admin-account") {
    const rl = await checkRateLimit(request, "admin-claim", 5, 600);
    if (!rl.allowed) return withSecurityHeaders(rateLimitResponse(rl.retryAfter));
  }

  const needsAdmin = ADMIN_RULES.some((r) => r.method === method && r.test(path));
  if (needsAdmin) {
    const ok = await isValidAdmin(context.env, request);
    if (!ok) {
      return withSecurityHeaders(
        json({ error: "Unauthorized. Admin session required." }, 401),
      );
    }
  }

  const res = await context.next();
  return withSecurityHeaders(res as unknown as Response);
}
