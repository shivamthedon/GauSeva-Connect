import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "./_lib/auth";
import { checkRateLimit, rateLimitResponse } from "./_lib/security";
import { verifyTurnstile } from "./_lib/turnstile";
import { json, jsonError } from "./_lib/secure-response";

export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    if (!(await isValidAdmin(context.env, context.request))) {
      return json({ error: "Unauthorized. Admin session required." }, 401);
    }
    const db = context.env.DB;
    const rows = await db.prepare("SELECT data FROM contacts ORDER BY rowid DESC LIMIT 500").all();
    const contacts = rows.results.map((row: any) => JSON.parse(row.data));
    return json(contacts);
  } catch (error: any) {
    const msg = String(error?.message || "");
    if (msg.includes("no such table") || msg.includes("SQLITE_ERROR")) {
      return json([]);
    }
    return jsonError("Failed to load contacts", 500, error);
  }
}

export async function onRequestPost(context: EventContext<any, string, any>) {
  try {
    // Tight rate limit for public form
    const rl = await checkRateLimit(context.request, "contacts", 5, 600);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const body = (await context.request.json().catch(() => ({}))) as Record<string, any>;

    // Honeypot: bots fill hidden fields
    if (body.website || body.hp || body._gotcha || body.company) {
      return json({ message: "Message sent successfully" }, 201);
    }

    const ip =
      context.request.headers.get("CF-Connecting-IP") ||
      (context.request.headers.get("x-forwarded-for") || "").split(",")[0].trim();

    const captcha = await verifyTurnstile(context.env, body.turnstileToken || body.cfTurnstileResponse, ip);
    if (captcha.ok === false) {
      return json({ error: captcha.error }, 403);
    }

    const name = String(body.name || "").trim().slice(0, 120);
    const email = String(body.email || "").trim().slice(0, 200);
    const subject = String(body.subject || "").trim().slice(0, 200);
    const message = String(body.message || "").trim().slice(0, 5000);

    if (!name || !email || !subject || !message) {
      return json({ error: "name, email, subject, and message are required" }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Invalid email address" }, 400);
    }

    // Reject obvious injection / control chars in subject
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(subject + name)) {
      return json({ error: "Invalid characters in input" }, 400);
    }

    const db = context.env.DB;
    const id = `contact_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const contact = {
      id,
      name,
      email,
      subject,
      message,
      status: "unread",
      createdAt: new Date().toISOString(),
    };

    await db
      .prepare("INSERT INTO contacts (id, data) VALUES (?, ?)")
      .bind(id, JSON.stringify(contact))
      .run();

    return json({ message: "Message sent successfully" }, 201);
  } catch (error: any) {
    return jsonError("Failed to send message", 500, error);
  }
}
