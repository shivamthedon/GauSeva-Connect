import type { EventContext } from "@cloudflare/workers-types";
import { verifyFirebaseIdToken } from "./_lib/firebase-admin";
import { json, jsonError } from "./_lib/secure-response";

// GET /api/admin-account -> { exists: boolean }
export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    const db = context.env.DB;
    const row = await db
      .prepare("SELECT value FROM site_settings WHERE key = 'admin_email'")
      .first();
    return json({ exists: !!(row && row.value) });
  } catch {
    // Fail closed: pretend an admin exists so setup can't be hijacked on error.
    return json({ exists: true });
  }
}

// POST /api/admin-account { idToken } -> claim the (single) admin account.
export async function onRequestPost(context: EventContext<any, string, any>) {
  try {
    const db = context.env.DB;
    const body = await context.request.json().catch(() => ({}));
    const { idToken } = body as { idToken?: string };
    if (!idToken) return json({ error: "Missing idToken" }, 400);

    const existing = await db
      .prepare("SELECT value FROM site_settings WHERE key = 'admin_email'")
      .first();
    if (existing && existing.value) {
      return json({ error: "An admin account already exists." }, 409);
    }

    const user = await verifyFirebaseIdToken(context.env, idToken);
    if (!user) return json({ error: "Invalid or expired token." }, 401);
    if (!user.emailVerified) {
      return json({ error: "Verify your email before claiming admin." }, 403);
    }

    await db
      .prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('admin_email', ?)")
      .bind(user.email)
      .run();

    return json({ success: true, email: user.email });
  } catch (error: any) {
    return jsonError("Failed to claim admin account", 500, error);
  }
}
