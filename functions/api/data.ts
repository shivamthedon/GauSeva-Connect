import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "./_lib/auth";

// Collections that are safe to expose in full to the public.
const PUBLIC_COLLECTIONS = [
  "listings",
  "gaushalas",
  "alerts",
  "transports",
  "vets",
  "sponsorships",
];

// Collections that must never be returned to non-admin callers.
const ADMIN_ONLY_COLLECTIONS = ["tickets", "reports", "comments", "contacts"];

async function loadTable(db: any, table: string, limit?: number): Promise<any[]> {
  try {
    const sql =
      typeof limit === "number"
        ? `SELECT data FROM ${table} ORDER BY rowid DESC LIMIT ${limit}`
        : `SELECT data FROM ${table}`;
    const rows = await db.prepare(sql).all();
    return (rows.results || []).map((row: any) => {
      try {
        return JSON.parse(row.data);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    const db = context.env.DB;
    const url = new URL(context.request.url);
    // lite=1: skip heavy listings dump (homepage uses /api/listings pagination)
    const lite = url.searchParams.get("lite") === "1";
    const admin = await isValidAdmin(context.env, context.request);

    const tablesForPublic = lite
      ? ["gaushalas", "alerts", "transports", "vets", "sponsorships", "verificationRequests", "users"]
      : [...PUBLIC_COLLECTIONS, "verificationRequests", "users"];

    const tables = admin
      ? [...PUBLIC_COLLECTIONS, "verificationRequests", "users", ...ADMIN_ONLY_COLLECTIONS]
      : tablesForPublic;

    // Parallel D1 reads — sequential for-loop was a major source of API lag
    const loaded = await Promise.all(
      tables.map(async (table) => {
        // Cap public listings dump; admins get full set for moderation
        const limit =
          !admin && table === "listings" ? 150 : !admin && table === "users" ? 500 : undefined;
        const rows = await loadTable(db, table, limit);
        return [table, rows] as const;
      }),
    );

    const result: Record<string, any[]> = {};
    for (const [table, rows] of loaded) {
      result[table] = rows;
    }

    // Ensure keys exist even when lite skipped them
    for (const t of [...PUBLIC_COLLECTIONS, "verificationRequests", "users", ...ADMIN_ONLY_COLLECTIONS]) {
      if (!result[t]) result[t] = [];
    }

    if (admin) {
      return Response.json(result, {
        headers: {
          "Cache-Control": "private, no-store",
        },
      });
    }

    // --- Sanitize sensitive data for public/non-admin callers ---
    result.users = (result.users || []).map((u: any) => ({
      id: u.id,
      onboarded: u.onboarded ?? false,
      banned: u.banned ?? false,
    }));

    result.verificationRequests = (result.verificationRequests || []).map((r: any) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      status: r.status,
      submittedAt: r.submittedAt,
    }));

    // Short CDN/browser cache for public snapshot (reduces lag on repeat loads)
    return Response.json(result, {
      headers: {
        "Cache-Control": "public, max-age=15, stale-while-revalidate=45",
      },
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
