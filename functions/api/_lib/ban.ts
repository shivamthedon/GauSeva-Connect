// Shared helper to check whether a user is banned.
// Files/folders prefixed with `_` are ignored by Cloudflare Pages routing,
// so this is a plain importable module, not an endpoint.

export async function isUserBanned(db: any, userId?: string | null): Promise<boolean> {
  if (!db || !userId) return false;
  try {
    // A tombstoned (admin-deleted) user is treated as blocked too.
    if (await isUserDeleted(db, userId)) return true;
    const row = await db
      .prepare("SELECT data FROM users WHERE id = ?")
      .bind(userId)
      .first();
    if (!row?.data) return false;
    const user = JSON.parse(row.data);
    return user?.banned === true;
  } catch {
    return false;
  }
}

// --- Deleted-user tombstones ---------------------------------------------
// When an admin deletes a user we keep their id in a blocklist so an active
// session cannot resurrect the account by re-POSTing to /api/users.

async function getDeletedUsers(db: any): Promise<string[]> {
  try {
    const row = await db
      .prepare("SELECT value FROM site_settings WHERE key = 'deleted_users'")
      .first();
    if (!row?.value) return [];
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function isUserDeleted(db: any, userId?: string | null): Promise<boolean> {
  if (!db || !userId) return false;
  const list = await getDeletedUsers(db);
  return list.includes(userId);
}

export async function tombstoneUser(db: any, userId: string): Promise<void> {
  if (!db || !userId) return;
  try {
    const list = await getDeletedUsers(db);
    if (!list.includes(userId)) list.push(userId);
    await db
      .prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('deleted_users', ?)")
      .bind(JSON.stringify(list))
      .run();
  } catch {
    // Non-fatal: deletion still succeeded even if the tombstone write fails.
  }
}

// Collections where the `userId` in the request body represents the actor
// (the person creating content), so a ban should block creation.
// NOTE: intentionally excludes `verificationRequests` (an admin may create one
// on behalf of another user) and `users` (managed via /api/users).
export const BANNABLE_COLLECTIONS = [
  "listings",
  "gaushalas",
  "alerts",
  "vets",
  "transports",
  "sponsorships",
];
