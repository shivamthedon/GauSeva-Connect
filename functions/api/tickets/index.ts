import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "../_lib/auth";
import { verifyFirebaseIdToken } from "../_lib/firebase-admin";
import { isUserBanned } from "../_lib/ban";

export async function onRequestPost(context: EventContext<any, string, any>) {
  try {
    // Auth first (never leak validation details to anonymous callers).
    const admin = await isValidAdmin(context.env, context.request);
    let userId: string | undefined;
    let userName: string | undefined;
    let userEmail: string | undefined;

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
          { error: "Please verify your email before opening a ticket." },
          { status: 403 },
        );
      }
      userId = user.uid;
      userEmail = user.email || "";
      userName = user.email || "User";
    }

    const body = (await context.request.json().catch(() => ({}))) as Record<string, any>;
    const { subject, description } = body;

    if (!subject || !description) {
      return Response.json({ error: "subject and description are required" }, { status: 400 });
    }

    if (admin) {
      userId = (body.userId as string | undefined) || userId;
      userName = (body.userName as string | undefined) || userName;
      userEmail = (body.userEmail as string | undefined) || userEmail;
    }

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    // Only allow https attachments (block javascript: / data: XSS vectors)
    let attachmentUrl = String(body.attachmentUrl || "").slice(0, 500);
    if (attachmentUrl && !/^https:\/\//i.test(attachmentUrl)) {
      attachmentUrl = "";
    }

    const db = context.env.DB;
    if (await isUserBanned(db, userId)) {
      return Response.json({ error: "Your account has been suspended." }, { status: 403 });
    }

    const id = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const ticket = {
      id,
      userId,
      userName: userName || "User",
      userEmail: userEmail || "",
      category: body.category || "general",
      subject: String(subject).slice(0, 200),
      description: String(description).slice(0, 5000),
      status: "open",
      attachmentUrl,
      createdAt: new Date().toISOString(),
    };

    await db
      .prepare("INSERT INTO tickets (id, userId, data) VALUES (?, ?, ?)")
      .bind(id, userId, JSON.stringify(ticket))
      .run();

    return Response.json(ticket, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
