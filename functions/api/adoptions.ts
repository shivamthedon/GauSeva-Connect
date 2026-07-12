import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "./_lib/auth";
import { verifyFirebaseIdToken } from "./_lib/firebase-admin";
import { isUserBanned } from "./_lib/ban";

async function ensureTable(db: any) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS adoption_requests (
        id TEXT PRIMARY KEY,
        listingId TEXT NOT NULL,
        requesterId TEXT NOT NULL,
        ownerId TEXT,
        data TEXT NOT NULL
      )`,
    )
    .run();
}

/** GET /api/adoptions?mine=1 | ?listingId= | ?owner=1 | all (admin) */
export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    const db = context.env.DB;
    await ensureTable(db);
    const url = new URL(context.request.url);
    const listingId = url.searchParams.get("listingId");
    const mine = url.searchParams.get("mine") === "1";
    const owner = url.searchParams.get("owner") === "1";
    const admin = await isValidAdmin(context.env, context.request);

    let uid: string | null = null;
    if (mine || owner) {
      const authHeader = context.request.headers.get("Authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      if (!idToken) return Response.json({ error: "Unauthorized" }, { status: 401 });
      const user = await verifyFirebaseIdToken(context.env, idToken);
      if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
      uid = user.uid;
    }

    let rows: any;
    if (listingId) {
      rows = await db
        .prepare("SELECT data FROM adoption_requests WHERE listingId = ? ORDER BY rowid DESC")
        .bind(listingId)
        .all();
    } else if (mine && uid) {
      rows = await db
        .prepare("SELECT data FROM adoption_requests WHERE requesterId = ? ORDER BY rowid DESC")
        .bind(uid)
        .all();
    } else if (owner && uid) {
      rows = await db
        .prepare("SELECT data FROM adoption_requests WHERE ownerId = ? ORDER BY rowid DESC")
        .bind(uid)
        .all();
    } else if (admin) {
      rows = await db.prepare("SELECT data FROM adoption_requests ORDER BY rowid DESC LIMIT 200").all();
    } else {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = (rows.results || []).map((r: any) => JSON.parse(r.data));
    // Privacy: non-admins viewing by listing only get counts + own request, not all contact details
    if (listingId && !admin && !owner) {
      const authHeader = context.request.headers.get("Authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const me = idToken ? await verifyFirebaseIdToken(context.env, idToken) : null;
      const safe = items.map((it: any) => {
        if (me && it.requesterId === me.uid) return it;
        return {
          id: it.id,
          listingId: it.listingId,
          status: it.status,
          createdAt: it.createdAt,
        };
      });
      return Response.json(safe);
    }

    return Response.json(items);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/** POST /api/adoptions — create adoption request (signed-in user) */
export async function onRequestPost(context: EventContext<any, string, any>) {
  try {
    const db = context.env.DB;
    await ensureTable(db);
    const body = (await context.request.json().catch(() => ({}))) as Record<string, any>;

    const authHeader = context.request.headers.get("Authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) return Response.json({ error: "Please sign in to request adoption." }, { status: 401 });
    const user = await verifyFirebaseIdToken(context.env, idToken);
    if (!user) return Response.json({ error: "Invalid session." }, { status: 401 });
    if (!user.emailVerified) {
      return Response.json(
        { error: "Please verify your email before requesting adoption." },
        { status: 403 },
      );
    }
    if (await isUserBanned(db, user.uid)) {
      return Response.json({ error: "Your account has been suspended." }, { status: 403 });
    }

    const listingId = body.listingId;
    if (!listingId) return Response.json({ error: "listingId is required" }, { status: 400 });

    const listingRow = await db.prepare("SELECT data FROM listings WHERE id = ?").bind(listingId).first();
    if (!listingRow) return Response.json({ error: "Listing not found" }, { status: 404 });
    const listing = JSON.parse(listingRow.data as string);

    if (listing.status === "adopted" || listing.adoptionStatus === "completed") {
      return Response.json({ error: "This gaumata is already adopted." }, { status: 400 });
    }
    if (listing.userId && listing.userId === user.uid) {
      return Response.json({ error: "You cannot request adoption on your own listing." }, { status: 400 });
    }

    // Prevent duplicate open requests
    const existing = await db
      .prepare("SELECT data FROM adoption_requests WHERE listingId = ? AND requesterId = ?")
      .bind(listingId, user.uid)
      .all();
    const openDup = (existing.results || []).some((r: any) => {
      const d = JSON.parse(r.data);
      return d.status === "pending" || d.status === "in_discussion";
    });
    if (openDup) {
      return Response.json({ error: "You already have an open request for this listing." }, { status: 409 });
    }

    const id = `adopt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id,
      listingId,
      listingTitle: listing.title || "",
      listingImage: listing.imageUrl || "",
      ownerId: listing.userId || "",
      ownerName: listing.sellerName || "",
      requesterId: user.uid,
      requesterName: body.requesterName || user.email || "User",
      requesterPhone: body.requesterPhone || "",
      requesterCity: body.requesterCity || "",
      shelterType: body.shelterType || "home",
      experience: body.experience || "",
      message: String(body.message || "").slice(0, 2000),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db
      .prepare(
        "INSERT INTO adoption_requests (id, listingId, requesterId, ownerId, data) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(id, listingId, user.uid, listing.userId || "", JSON.stringify(record))
      .run();

    return Response.json(record, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
