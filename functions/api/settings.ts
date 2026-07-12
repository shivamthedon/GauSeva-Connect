import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "./_lib/auth";

// Keys that must never be exposed via the public settings endpoint.
const SENSITIVE_SETTINGS = new Set(["admin_session", "admin_email", "deleted_users"]);

// Keys that must never be written via the settings API (use dedicated endpoints).
const WRITE_BLOCKED_SETTINGS = new Set(["admin_session", "admin_email", "deleted_users"]);

export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    const db = context.env.DB;
    const rows = await db.prepare("SELECT key, value FROM site_settings").all();
    const settings: Record<string, any> = {};
    for (const row of rows.results) {
      if (SENSITIVE_SETTINGS.has(row.key)) continue;
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return Response.json(settings, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    const msg = String(error?.message || "");
    if (msg.includes("no such table") || msg.includes("SQLITE_ERROR")) {
      return Response.json({});
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPut(context: EventContext<any, string, any>) {
  try {
    // Defense in depth (middleware also requires admin).
    if (!(await isValidAdmin(context.env, context.request))) {
      return Response.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const body = (await context.request.json().catch(() => ({}))) as Record<string, any>;
    const db = context.env.DB;

    for (const [key, value] of Object.entries(body)) {
      if (WRITE_BLOCKED_SETTINGS.has(key)) continue;
      // Basic key hygiene
      if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(key)) continue;
      await db
        .prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)")
        .bind(key, JSON.stringify(value))
        .run();
    }

    return Response.json({ message: "Settings updated" });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
