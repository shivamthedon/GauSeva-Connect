import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "../../_lib/auth";
import { verifyFirebaseIdToken } from "../../_lib/firebase-admin";

const VALID_COLLECTIONS = [
  "listings",
  "gaushalas",
  "alerts",
  "transports",
  "vets",
  "sponsorships",
  "verificationRequests",
  "users",
  "reports",
  "reviews",
  "contacts",
];

function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

/** Admin session or Firebase owner of the record. */
async function authorizeWrite(
  env: any,
  request: { headers: { get(name: string): string | null } },
  existingData: any,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (await isValidAdmin(env, request)) return { ok: true };

  const authHeader = request.headers.get("Authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!idToken) {
    return { ok: false, status: 401, error: "Unauthorized. Sign in or provide admin session." };
  }

  const user = await verifyFirebaseIdToken(env, idToken);
  if (!user) {
    return { ok: false, status: 401, error: "Invalid or expired session." };
  }

  const ownerId = existingData?.userId || existingData?.id;
  if (ownerId && ownerId === user.uid) return { ok: true };

  return { ok: false, status: 403, error: "Forbidden. You can only modify your own content." };
}

export async function onRequestPut(context: EventContext<any, string, any>) {
  try {
    const collection = paramStr(context.params.collection);
    const id = paramStr(context.params.id);
    if (!VALID_COLLECTIONS.includes(collection)) {
      return Response.json({ error: `Invalid collection` }, { status: 400 });
    }

    // Auth first — no ID enumeration via 404
    if (!(await isValidAdmin(context.env, context.request))) {
      return Response.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const db = context.env.DB;
    const existing = await db
      .prepare(`SELECT data FROM ${collection} WHERE id = ?`)
      .bind(id)
      .first();

    if (!existing) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const parsed = JSON.parse(existing.data as string);
    const body = await context.request.json().catch(() => ({}));
    // Never let client rewrite primary id
    const merged = { ...parsed, ...(body as object), id };

    await db
      .prepare(`INSERT OR REPLACE INTO ${collection} (id, data) VALUES (?, ?)`)
      .bind(id, JSON.stringify(merged))
      .run();

    return Response.json(merged);
  } catch {
    return Response.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function onRequestDelete(context: EventContext<any, string, any>) {
  try {
    const collection = paramStr(context.params.collection);
    const id = paramStr(context.params.id);
    if (!VALID_COLLECTIONS.includes(collection)) {
      return Response.json({ error: `Invalid collection` }, { status: 400 });
    }

    // Auth before existence check — avoid ID enumeration via 404 vs 401.
    const adminOnlyDelete = ["reports", "contacts", "users", "verificationRequests", "reviews"];
    const admin = await isValidAdmin(context.env, context.request);

    if (adminOnlyDelete.includes(collection)) {
      if (!admin) {
        return Response.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
      }
    } else if (!admin) {
      // Require some form of auth before looking up the row (owner check after load).
      const authHeader = context.request.headers.get("Authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      if (!idToken) {
        return Response.json(
          { error: "Unauthorized. Sign in or provide admin session." },
          { status: 401 },
        );
      }
    }

    const db = context.env.DB;
    const existing = await db
      .prepare(`SELECT data FROM ${collection} WHERE id = ?`)
      .bind(id)
      .first();

    if (!existing) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(existing.data as string);
    } catch {
      parsed = {};
    }

    if (!adminOnlyDelete.includes(collection) && !admin) {
      const authz = await authorizeWrite(context.env, context.request, parsed);
      if (authz.ok === false) {
        return Response.json({ error: authz.error }, { status: authz.status });
      }
    }

    const result = await db
      .prepare(`DELETE FROM ${collection} WHERE id = ?`)
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    return Response.json({ message: "Item deleted successfully" });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
