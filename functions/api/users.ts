import type { EventContext } from "@cloudflare/workers-types";
import { isUserDeleted, tombstoneUser } from "./_lib/ban";
import { isValidAdmin } from "./_lib/auth";
import { verifyFirebaseIdToken } from "./_lib/firebase-admin";
import {
  pickUserProfileFields,
  stripPrivilegeFields,
  checkRateLimit,
  rateLimitResponse,
} from "./_lib/security";

export async function onRequestPost(context: EventContext<any, string, any>) {
  try {
    const rl = await checkRateLimit(context.request, "users-write", 40, 60);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const rawBody = (await context.request.json()) as Record<string, any>;
    let { id, email, name } = rawBody;
    let body = { ...rawBody };

    const admin = await isValidAdmin(context.env, context.request);

    // Ban / unban is admin-only.
    const banFields = ["banned", "banReason", "bannedAt"] as const;
    const touchesBan = banFields.some((k) => Object.prototype.hasOwnProperty.call(body, k));
    if (touchesBan && !admin) {
      return Response.json(
        { error: "Unauthorized. Admin session required to ban/unban users." },
        { status: 401 },
      );
    }

    // Non-admin callers must prove identity via Firebase ID token.
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
      // Users may only create/update their own profile.
      id = user.uid;
      body.id = user.uid;
      if (user.email) {
        email = user.email;
        body.email = user.email;
      }
      // Mass-assignment protection: only allowlisted profile fields + id/email.
      const allowed = pickUserProfileFields(body);
      body = {
        ...allowed,
        id: user.uid,
        email: user.email || email || "",
      };
      if (name && !body.name) body.name = String(name).slice(0, 120);
      // Strip any privilege fields that slipped through
      body = stripPrivilegeFields(body);
      body.id = user.uid;
      if (user.email) body.email = user.email;
    }

    if (!id) {
      return Response.json({ error: "User ID (id) is required" }, { status: 400 });
    }

    const db = context.env.DB;

    // Prevent a deleted user's still-active client from recreating their record.
    if (await isUserDeleted(db, id)) {
      return Response.json(
        { error: "This account has been removed by an administrator." },
        { status: 403 },
      );
    }

    const existing = await db
      .prepare("SELECT data FROM users WHERE id = ?")
      .bind(id)
      .first();

    if (existing) {
      const prev = JSON.parse(existing.data as string);
      // Non-admins cannot re-introduce privilege fields via merge
      const merged = admin
        ? { ...prev, ...body, id }
        : {
            ...prev,
            ...body,
            id,
            // Preserve server-controlled fields
            banned: prev.banned,
            banReason: prev.banReason,
            bannedAt: prev.bannedAt,
          };
      await db
        .prepare("INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)")
        .bind(id, JSON.stringify(merged))
        .run();
      return Response.json(merged);
    } else {
      const newUser: Record<string, any> = {
        ...body,
        id,
        email: email || body.email || "",
        name: name || body.name || "Unknown User",
        createdAt: new Date().toISOString(),
      };
      if (!admin) {
        delete newUser.banned;
        delete newUser.banReason;
        delete newUser.bannedAt;
        delete newUser.verified;
        delete newUser.isAdmin;
      }
      await db
        .prepare("INSERT INTO users (id, data) VALUES (?, ?)")
        .bind(id, JSON.stringify(newUser))
        .run();
      return Response.json(newUser);
    }
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestDelete(context: EventContext<any, string, any>) {
  try {
    // Defense in depth (middleware also requires admin).
    if (!(await isValidAdmin(context.env, context.request))) {
      return Response.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const db = context.env.DB;

    await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
    await tombstoneUser(db, id);

    const cascadeCollections = [
      "listings",
      "gaushalas",
      "alerts",
      "vets",
      "transports",
      "sponsorships",
      "verificationRequests",
      "reviews",
      "comments",
      "tickets",
    ];
    for (const col of cascadeCollections) {
      try {
        await db
          .prepare(`DELETE FROM ${col} WHERE json_extract(data, '$.userId') = ?`)
          .bind(id)
          .run();
      } catch {
        // Table may not exist in some environments; ignore and continue.
      }
    }

    return Response.json({ message: "User and their content deleted" });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
