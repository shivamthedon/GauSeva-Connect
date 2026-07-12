import type { EventContext } from "@cloudflare/workers-types";
import { isUserBanned } from "./_lib/ban";
import { isValidAdmin } from "./_lib/auth";
import { verifyFirebaseIdToken } from "./_lib/firebase-admin";
import { checkRateLimit, rateLimitResponse } from "./_lib/security";

export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    const url = new URL(context.request.url);
    const listingId = url.searchParams.get("listingId");
    const db = context.env.DB;

    // Require listingId so clients cannot dump every comment in the system.
    if (!listingId) {
      return Response.json({ error: "listingId query parameter is required" }, { status: 400 });
    }

    const rows = await db
      .prepare("SELECT data FROM comments WHERE listingId = ? ORDER BY rowid DESC LIMIT 200")
      .bind(listingId)
      .all();
    const comments = rows.results.map((row: any) => JSON.parse(row.data));
    return Response.json(comments);
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
    const rl = await checkRateLimit(context.request, "comments", 30, 60);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const body = (await context.request.json().catch(() => ({}))) as Record<string, any>;
    const db = context.env.DB;

    const admin = await isValidAdmin(context.env, context.request);
    let uid = body.userId as string | undefined;
    let userName = body.userName as string | undefined;

    if (!admin) {
      const authHeader = context.request.headers.get("Authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      if (!idToken) {
        return Response.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
      }
      const user = await verifyFirebaseIdToken(context.env, idToken);
      if (!user) {
        return Response.json({ error: "Invalid or expired session." }, { status: 401 });
      }
      if (!user.emailVerified) {
        return Response.json(
          { error: "Please verify your email before commenting." },
          { status: 403 },
        );
      }
      uid = user.uid;
      userName = userName || user.email || "User";
    }

    if (!uid || !body.listingId || !body.text) {
      return Response.json(
        { error: "listingId, text, and signed-in user are required" },
        { status: 400 },
      );
    }

    if (await isUserBanned(db, uid)) {
      return Response.json({ error: "Your account has been suspended." }, { status: 403 });
    }

    const id = `cmt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const comment = {
      id,
      listingId: String(body.listingId).slice(0, 128),
      userId: uid,
      userName: String(userName || "User").slice(0, 120),
      text: String(body.text).slice(0, 2000),
      createdAt: new Date().toISOString(),
    };

    await db
      .prepare("INSERT INTO comments (id, listingId, userId, data) VALUES (?, ?, ?, ?)")
      .bind(id, comment.listingId, comment.userId, JSON.stringify(comment))
      .run();

    return Response.json(comment, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
