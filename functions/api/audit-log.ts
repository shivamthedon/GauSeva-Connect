import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "./_lib/auth";

export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    if (!(await isValidAdmin(context.env, context.request))) {
      return Response.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }
    const db = context.env.DB;
    const rows = await db.prepare("SELECT data FROM audit_log ORDER BY rowid DESC LIMIT 100").all();
    const logs = rows.results.map((row: any) => JSON.parse(row.data));
    return Response.json(logs);
  } catch (error: any) {
    const msg = String(error?.message || "");
    if (msg.includes("no such table") || msg.includes("SQLITE_ERROR")) {
      return Response.json([]);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPost(context: EventContext<any, string, any>) {
  try {
    if (!(await isValidAdmin(context.env, context.request))) {
      return Response.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }
    const body = (await context.request.json().catch(() => ({}))) as Record<string, any>;
    const db = context.env.DB;
    const id = `log_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const log = {
      id,
      action: String(body.action || "").slice(0, 200),
      target: String(body.target || "").slice(0, 200),
      targetId: String(body.targetId || "").slice(0, 128),
      details: String(body.details || "").slice(0, 2000),
      adminUser: String(body.adminUser || "admin").slice(0, 120),
      timestamp: new Date().toISOString(),
    };

    await db
      .prepare("INSERT INTO audit_log (id, data) VALUES (?, ?)")
      .bind(id, JSON.stringify(log))
      .run();

    return Response.json(log, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
