import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "../../_lib/auth";
import { verifyFirebaseIdToken } from "../../_lib/firebase-admin";

function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

async function canManageTicket(env: any, request: { headers: { get(name: string): string | null } }, ticket: any): Promise<boolean> {
  if (await isValidAdmin(env, request)) return true;

  const authHeader = request.headers.get("Authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!idToken) return false;

  const user = await verifyFirebaseIdToken(env, idToken);
  if (!user) return false;
  return !!(ticket?.userId && ticket.userId === user.uid);
}

// GET /api/tickets/:userId — list tickets for a user (self or admin only).
export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    const userId = paramStr(context.params.id);
    const db = context.env.DB;
    const admin = await isValidAdmin(context.env, context.request);

    if (!admin) {
      const authHeader = context.request.headers.get("Authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      if (!idToken) {
        return Response.json({ error: "Unauthorized." }, { status: 401 });
      }
      const user = await verifyFirebaseIdToken(context.env, idToken);
      if (!user || user.uid !== userId) {
        return Response.json({ error: "Forbidden. You can only view your own tickets." }, { status: 403 });
      }
    }

    const rows = await db
      .prepare("SELECT data FROM tickets WHERE userId = ? ORDER BY rowid DESC")
      .bind(userId)
      .all();

    const tickets = rows.results.map((row: any) => JSON.parse(row.data));
    return Response.json(tickets);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPut(context: EventContext<any, string, any>) {
  try {
    const id = paramStr(context.params.id);
    const body = (await context.request.json().catch(() => ({}))) as Record<string, any>;
    const db = context.env.DB;

    const existing = await db
      .prepare("SELECT data FROM tickets WHERE id = ?")
      .bind(id)
      .first();

    if (!existing) {
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    }

    const ticket = JSON.parse(existing.data as string);
    const admin = await isValidAdmin(context.env, context.request);
    const allowed = await canManageTicket(context.env, context.request, ticket);
    if (!allowed) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Non-admins may only add a user comment or close their own ticket.
    let patch = body;
    if (!admin) {
      patch = {};
      if (typeof body.userComment === "string") {
        patch.userComment = String(body.userComment).slice(0, 5000);
      }
      if (body.status === "closed") patch.status = "closed";
    }

    const updated = {
      ...ticket,
      ...patch,
      userId: ticket.userId,
      updatedAt: new Date().toISOString(),
    };

    await db
      .prepare("INSERT OR REPLACE INTO tickets (id, userId, data) VALUES (?, ?, ?)")
      .bind(id, updated.userId, JSON.stringify(updated))
      .run();

    return Response.json(updated);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestDelete(context: EventContext<any, string, any>) {
  try {
    const id = paramStr(context.params.id);
    const db = context.env.DB;

    const existing = await db
      .prepare("SELECT data FROM tickets WHERE id = ?")
      .bind(id)
      .first();

    if (!existing) {
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    }

    const ticket = JSON.parse(existing.data as string);
    const allowed = await canManageTicket(context.env, context.request, ticket);
    if (!allowed) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    await db.prepare("DELETE FROM tickets WHERE id = ?").bind(id).run();

    return Response.json({ message: "Ticket deleted" });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
