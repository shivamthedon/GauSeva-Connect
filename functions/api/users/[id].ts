import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "../_lib/auth";
import { verifyFirebaseIdToken } from "../_lib/firebase-admin";
import { sanitizePublicUser } from "../_lib/security";

function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    const id = paramStr(context.params.id);
    const db = context.env.DB;
    const existing = await db
      .prepare("SELECT data FROM users WHERE id = ?")
      .bind(id)
      .first();

    if (!existing) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const userData = JSON.parse(existing.data as string);
    const admin = await isValidAdmin(context.env, context.request);

    // Owner or admin gets full profile; everyone else gets public projection only.
    if (admin) {
      return Response.json(userData);
    }

    const authHeader = context.request.headers.get("Authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (idToken) {
      const me = await verifyFirebaseIdToken(context.env, idToken);
      if (me && me.uid === id) {
        return Response.json(userData);
      }
    }

    return Response.json(sanitizePublicUser(userData));
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestDelete(context: EventContext<any, string, any>) {
  try {
    if (!(await isValidAdmin(context.env, context.request))) {
      return Response.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const id = paramStr(context.params.id);
    const db = context.env.DB;

    await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
    await db
      .prepare("DELETE FROM listings WHERE json_extract(data, '$.userId') = ?")
      .bind(id)
      .run();

    return Response.json({ message: "User and their listings deleted" });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
