import type { EventContext } from "@cloudflare/workers-types";
import { verifyFirebaseIdToken } from "./_lib/firebase-admin";
import { json, jsonError, timingSafeEqual } from "./_lib/secure-response";

function extractSessionToken(request: {
  headers: { get(name: string): string | null };
  url: string;
}): string | null {
  const authHeader = request.headers.get("Authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const b = authHeader.slice(7).trim();
    if (b) return b;
  }
  const custom = (request.headers.get("X-Admin-Token") || "").trim();
  if (custom) return custom;
  const q = new URL(request.url).searchParams.get("token");
  return q ? q.trim() : null;
}

export async function onRequestPost(context: EventContext<any, string, any>) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const { idToken, username, password } = body as {
      idToken?: string;
      username?: string;
      password?: string;
    };
    const db = context.env.DB;

    let sessionUser: string;

    if (idToken) {
      const user = await verifyFirebaseIdToken(context.env, idToken);
      if (!user) {
        return json({ error: "Invalid or expired session token." }, 401);
      }
      if (!user.emailVerified) {
        return json({ error: "Admin email must be verified." }, 403);
      }
      const row = await db
        .prepare("SELECT value FROM site_settings WHERE key = 'admin_email'")
        .first();
      const adminEmail = row?.value ? String(row.value).toLowerCase() : "";
      if (!adminEmail) {
        return json(
          { error: "No admin configured yet. Complete first-time setup." },
          403,
        );
      }
      if (!timingSafeEqual(user.email, adminEmail)) {
        return json({ error: "This account is not an admin." }, 403);
      }
      sessionUser = user.email;
    } else {
      // Emergency fallback only when secrets are set (never VITE_ in production ideally)
      const adminUser = String(context.env.ADMIN_USER || "").trim();
      const adminPass = String(context.env.ADMIN_PASS || "").trim();
      if (!adminUser || !adminPass) {
        return json(
          {
            error:
              "Password fallback disabled. Use Firebase admin login, or set ADMIN_USER/ADMIN_PASS secrets.",
          },
          401,
        );
      }
      const u = String(username || "");
      const p = String(password || "");
      if (!timingSafeEqual(u, adminUser) || !timingSafeEqual(p, adminPass)) {
        return json({ error: "Invalid credentials" }, 401);
      }
      sessionUser = adminUser;
    }

    // Cryptographically strong session token (UUID v4 is fine; double entropy)
    const token = `${crypto.randomUUID()}${crypto.randomUUID().replace(/-/g, "")}`;
    const sessionData = {
      token,
      username: sessionUser,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    await db
      .prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('admin_session', ?)")
      .bind(JSON.stringify(sessionData))
      .run();

    // Dual delivery: JSON token (SPA) + HttpOnly cookie (harder for XSS to steal alone)
    const isHttps = new URL(context.request.url).protocol === "https:";
    const cookie = [
      `gauseva_admin=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      "Max-Age=86400",
      isHttps ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ");

    return json(
      { token, username: sessionUser },
      200,
      { "Set-Cookie": cookie },
    );
  } catch (error: any) {
    return jsonError("Login failed", 500, error);
  }
}

export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    let token = extractSessionToken(context.request);
    // Also accept HttpOnly cookie
    if (!token) {
      const cookie = context.request.headers.get("Cookie") || "";
      const m = cookie.match(/(?:^|;\s*)gauseva_admin=([^;]+)/);
      if (m) token = decodeURIComponent(m[1]);
    }
    const db = context.env.DB;

    if (!token) {
      return json({ valid: false }, 401);
    }

    const row = await db
      .prepare("SELECT value FROM site_settings WHERE key = 'admin_session'")
      .first();
    if (!row) {
      return json({ valid: false }, 401);
    }

    const session = JSON.parse(row.value as string);
    if (!session?.token || !timingSafeEqual(String(session.token), token)) {
      return json(
        { valid: false, message: "Session expired - logged in from another browser" },
        401,
      );
    }

    const MAX_IDLE_MS = 24 * 60 * 60 * 1000;
    const last = Date.parse(session.lastActive || session.createdAt || "");
    if (!Number.isNaN(last) && Date.now() - last > MAX_IDLE_MS) {
      await db.prepare("DELETE FROM site_settings WHERE key = 'admin_session'").run();
      return json({ valid: false, message: "Session expired due to inactivity" }, 401);
    }

    session.lastActive = new Date().toISOString();
    await db
      .prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('admin_session', ?)")
      .bind(JSON.stringify(session))
      .run();

    return json({ valid: true, username: session.username });
  } catch {
    return json({ valid: false }, 500);
  }
}

export async function onRequestDelete(context: EventContext<any, string, any>) {
  try {
    const db = context.env.DB;
    let provided = extractSessionToken(context.request);
    if (!provided) {
      const cookie = context.request.headers.get("Cookie") || "";
      const m = cookie.match(/(?:^|;\s*)gauseva_admin=([^;]+)/);
      if (m) provided = decodeURIComponent(m[1]);
    }

    if (!provided) {
      return json({ error: "Unauthorized. Session token required." }, 401);
    }

    const row = await db
      .prepare("SELECT value FROM site_settings WHERE key = 'admin_session'")
      .first();
    if (!row?.value) {
      return json({ message: "Logged out" }, 200, {
        "Set-Cookie": "gauseva_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
      });
    }

    let session: { token?: string } = {};
    try {
      session = JSON.parse(row.value as string);
    } catch {
      session = {};
    }

    if (session.token && !timingSafeEqual(String(session.token), provided)) {
      return json({ error: "Unauthorized. Invalid session token." }, 401);
    }

    await db.prepare("DELETE FROM site_settings WHERE key = 'admin_session'").run();
    return json(
      { message: "Logged out" },
      200,
      { "Set-Cookie": "gauseva_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" },
    );
  } catch (error: any) {
    return jsonError("Logout failed", 500, error);
  }
}
