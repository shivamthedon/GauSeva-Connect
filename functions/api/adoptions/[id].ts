import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "../_lib/auth";
import { verifyFirebaseIdToken } from "../_lib/firebase-admin";

function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

/** PUT /api/adoptions/:id — owner/admin updates status */
export async function onRequestPut(context: EventContext<any, string, any>) {
  try {
    const db = context.env.DB;
    const id = paramStr(context.params.id);
    const body = (await context.request.json().catch(() => ({}))) as Record<string, any>;

    const row = await db.prepare("SELECT data FROM adoption_requests WHERE id = ?").bind(id).first();
    if (!row) return Response.json({ error: "Request not found" }, { status: 404 });
    const record = JSON.parse(row.data as string);

    const admin = await isValidAdmin(context.env, context.request);
    const authHeader = context.request.headers.get("Authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const user = idToken ? await verifyFirebaseIdToken(context.env, idToken) : null;

    const isOwner = !!(user && record.ownerId && user.uid === record.ownerId);
    const isRequester = !!(user && user.uid === record.requesterId);
    if (!admin && !isOwner && !isRequester) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedStatuses = ["pending", "in_discussion", "rejected", "completed", "cancelled"];
    let status = body.status as string | undefined;

    // Requesters may only cancel their own pending request
    if (isRequester && !isOwner && !admin) {
      if (status !== "cancelled") {
        return Response.json({ error: "You can only cancel your own request." }, { status: 403 });
      }
      if (record.status !== "pending" && record.status !== "in_discussion") {
        return Response.json({ error: "This request can no longer be cancelled." }, { status: 400 });
      }
    }

    // Owners/admins can accept (in_discussion), reject, complete
    if ((isOwner || admin) && status && !allowedStatuses.includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = {
      ...record,
      status: status || record.status,
      ownerNote: body.ownerNote !== undefined ? String(body.ownerNote).slice(0, 1000) : record.ownerNote,
      updatedAt: new Date().toISOString(),
    };

    await db
      .prepare("UPDATE adoption_requests SET data = ? WHERE id = ?")
      .bind(JSON.stringify(updated), id)
      .run();

    // When completed, mark listing as adopted so it drops out of active marketplace intent
    if (updated.status === "completed" && updated.listingId) {
      try {
        const listingRow = await db
          .prepare("SELECT data FROM listings WHERE id = ?")
          .bind(updated.listingId)
          .first();
        if (listingRow) {
          const listing = JSON.parse(listingRow.data as string);
          const merged = {
            ...listing,
            adoptionStatus: "completed",
            status: "adopted",
            featured: false,
          };
          await db
            .prepare("INSERT OR REPLACE INTO listings (id, data) VALUES (?, ?)")
            .bind(updated.listingId, JSON.stringify(merged))
            .run();
        }
      } catch {
        // non-fatal
      }
    }

    return Response.json(updated);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
