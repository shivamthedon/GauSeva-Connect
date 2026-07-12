import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "./_lib/auth";
import { verifyFirebaseIdToken } from "./_lib/firebase-admin";

export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    // Defense in depth (middleware also requires admin).
    if (!(await isValidAdmin(context.env, context.request))) {
      return Response.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }
    const db = context.env.DB;
    const rows = await db.prepare("SELECT data FROM reports ORDER BY rowid DESC").all();
    const reports = rows.results.map((row: any) => JSON.parse(row.data));
    return Response.json(reports);
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
    const body = (await context.request.json().catch(() => ({}))) as Record<string, any>;
    const db = context.env.DB;

    const admin = await isValidAdmin(context.env, context.request);
    let reporterId = body.reporterId as string | undefined;
    let reporterName = body.reporterName as string | undefined;

    if (!admin) {
      const authHeader = context.request.headers.get("Authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      if (!idToken) {
        return Response.json({ error: "Unauthorized. Please sign in to report." }, { status: 401 });
      }
      const user = await verifyFirebaseIdToken(context.env, idToken);
      if (!user) {
        return Response.json({ error: "Invalid or expired session." }, { status: 401 });
      }
      if (!user.emailVerified) {
        return Response.json(
          { error: "Please verify your email before filing a report." },
          { status: 403 },
        );
      }
      reporterId = user.uid;
      reporterName = reporterName || user.email || "User";
    }

    if (!body.targetType || !body.targetId || !body.reason) {
      return Response.json({ error: "targetType, targetId, and reason are required" }, { status: 400 });
    }

    const id = `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const report = {
      id,
      reporterId: reporterId || "anonymous",
      reporterName: reporterName || "User",
      targetType: body.targetType,
      targetId: body.targetId,
      reason: String(body.reason).slice(0, 200),
      description: String(body.description || "").slice(0, 2000),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await db
      .prepare("INSERT INTO reports (id, data) VALUES (?, ?)")
      .bind(id, JSON.stringify(report))
      .run();

    return Response.json(report, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
