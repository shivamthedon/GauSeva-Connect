import type { EventContext } from "@cloudflare/workers-types";
import { isUserBanned, BANNABLE_COLLECTIONS } from "../../_lib/ban";
import { isValidAdmin } from "../../_lib/auth";
import {
  requireFirebaseUser,
  stripPrivilegeFields,
  checkRateLimit,
  rateLimitResponse,
} from "../../_lib/security";

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

// Collections that require a signed-in Firebase user (or admin).
const AUTH_REQUIRED = new Set([
  "listings",
  "gaushalas",
  "alerts",
  "transports",
  "vets",
  "sponsorships",
  "verificationRequests",
  "reports",
  "reviews",
  "users",
]);

// Must use dedicated endpoints (rate limits / honeypot / validation) — block generic dump path.
const DEDICATED_ONLY = new Set(["contacts", "reports", "reviews", "comments"]);

// Collections where non-admins may never set privileged moderation fields.
const FORCE_UNVERIFIED = new Set([
  "listings",
  "gaushalas",
  "vets",
  "transports",
]);

function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export async function onRequestPost(context: EventContext<any, string, any>) {
  try {
    const rl = await checkRateLimit(context.request, "data-create", 60, 60);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const collection = paramStr(context.params.collection);
    if (!VALID_COLLECTIONS.includes(collection)) {
      return Response.json({ error: `Invalid collection: ${collection}` }, { status: 400 });
    }

    const admin = await isValidAdmin(context.env, context.request);

    // Prevent unauthenticated spam/bypass of /api/contacts, /api/reports, etc.
    if (DEDICATED_ONLY.has(collection) && !admin) {
      return Response.json(
        {
          error: `Use the dedicated /api/${collection === "comments" ? "comments" : collection} endpoint.`,
        },
        { status: 405 },
      );
    }

    let body = (await context.request.json().catch(() => ({}))) as Record<string, any>;
    const db = context.env.DB;
    let firebaseUser: { uid: string; email: string; emailVerified: boolean } | null = null;

    if (AUTH_REQUIRED.has(collection) && !admin) {
      const authz = await requireFirebaseUser(context.env, context.request, {
        requireEmailVerified: true,
      });
      if (authz.ok === false) {
        return Response.json({ error: authz.error }, { status: authz.status });
      }
      firebaseUser = authz.user;
    }

    // Never allow clients to choose or overwrite an existing id (prevents content takeover).
    // Server always generates a fresh id for creates.
    delete body.id;

    // Strip privilege / moderation fields for non-admins.
    if (!admin) {
      body = stripPrivilegeFields(body);
    }

    // Force ownership for normal users so they cannot spoof another userId.
    if (firebaseUser && !admin) {
      body.userId = firebaseUser.uid;
      if (collection === "users") {
        body.id = firebaseUser.uid;
        if (firebaseUser.email) body.email = firebaseUser.email;
      }
    }

    // Force safe defaults for trust badges / verification.
    if (!admin) {
      if (FORCE_UNVERIFIED.has(collection)) {
        body.verified = false;
        body.featured = false;
      }
      if (collection === "verificationRequests") {
        body.status = "pending";
        body.userId = firebaseUser?.uid || body.userId;
      }
      if (collection === "alerts") {
        body.status = body.status === "resolved" ? "active" : body.status || "active";
      }
      if (collection === "sponsorships") {
        body.status = "pending";
      }
      if (collection === "reports") {
        body.status = "pending";
      }
      if (collection === "reviews") {
        // reviews go through /api/reviews primarily; keep safe if posted here
        body.rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
        body.comment = String(body.comment || "").slice(0, 2000);
      }
    }

    const actorId = body.userId || (admin ? "admin" : null);
    if (BANNABLE_COLLECTIONS.includes(collection) && actorId && actorId !== "admin") {
      if (await isUserBanned(db, actorId)) {
        return Response.json({ error: "Your account has been suspended." }, { status: 403 });
      }
    }

    // users collection: prefer /api/users; if used here, never INSERT OR REPLACE by attacker id
    const id =
      collection === "users" && body.id
        ? String(body.id)
        : crypto.randomUUID();

    // For non-users collections, reject if client somehow still tried to overwrite
    // by checking existence when an id was forced (should not happen after delete body.id).
    if (collection !== "users") {
      const existing = await db
        .prepare(`SELECT id FROM ${collection} WHERE id = ?`)
        .bind(id)
        .first()
        .catch(() => null);
      if (existing) {
        // Extremely unlikely with UUID; fail closed.
        return Response.json({ error: "Conflict creating resource." }, { status: 409 });
      }
    }

    const item = { ...body, id };
    await db
      .prepare(`INSERT OR REPLACE INTO ${collection} (id, data) VALUES (?, ?)`)
      .bind(id, JSON.stringify(item))
      .run();

    return Response.json(item, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
