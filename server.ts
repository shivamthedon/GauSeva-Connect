import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import cors from "cors";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

dotenv.config();

const dbPath = path.join(process.cwd(), "data", "db.json");

function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      return {
        listings: [],
        gaushalas: [],
        alerts: [],
        transports: [],
        vets: [],
        sponsorships: [],
        verificationRequests: [],
        users: []
      };
    }
    const data = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading db.json:", error);
    return {};
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing db.json:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize S3-compatible client for Cloudflare R2
  const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });

  // --- Security Hardening ---
  
  // 1. Set security HTTP headers
  // We disable CSP, Cross-Origin-Embedder-Policy, and frameguard because this app needs to run smoothly inside the AI Studio iframe/sandbox and might load external images or fonts.
  app.use(helmet({ 
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    frameguard: false
  }));

  // 2. Enable CORS — restrict to known origins in production
  const allowedOrigins = (process.env.CORS_ORIGINS || process.env.APP_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow same-origin / non-browser tools (no Origin header)
        if (!origin) return cb(null, true);
        if (process.env.NODE_ENV !== "production" && !allowedOrigins.length) {
          return cb(null, true); // dev: permissive when no allowlist set
        }
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          return cb(null, true);
        }
        // Local Vite defaults
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return cb(null, true);
        }
        return cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }),
  );

  // 3. Rate limiting (Protect against DDoS and Brute Force attacks)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    message: "Too many requests from this IP, please try again in 15 minutes.",
  });
  app.use('/api', limiter);

  // 4. Body size limits (prevent large payload POST request DOS attacks)
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  // 5. Prevent HTTP Parameter Pollution
  app.use(hpp());

  // --- Admin authorization (mirrors functions/api/_middleware.ts for local dev) ---
  const isValidAdminReq = (req: express.Request): boolean => {
    try {
      const headerToken = (req.headers["x-admin-token"] as string) || "";
      const bearer = (req.headers["authorization"] as string || "").replace(/^Bearer\s+/i, "");
      const token = headerToken || bearer;
      if (!token) return false;
      const session = readDb().adminSession;
      if (!session || session.token !== token) return false;
      const last = Date.parse(session.lastActive || session.createdAt || "");
      if (!Number.isNaN(last) && Date.now() - last > 24 * 60 * 60 * 1000) return false;
      return true;
    } catch {
      return false;
    }
  };

  const ADMIN_RULES: { method: string; test: (p: string) => boolean }[] = [
    { method: "GET", test: (p) => p === "/api/reports" },
    { method: "GET", test: (p) => p === "/api/contacts" },
    { method: "GET", test: (p) => p === "/api/audit-log" },
    { method: "POST", test: (p) => p === "/api/audit-log" },
    { method: "PUT", test: (p) => p === "/api/settings" },
    { method: "DELETE", test: (p) => p === "/api/users" || p.startsWith("/api/users/") },
    { method: "PUT", test: (p) => p.startsWith("/api/data/") },
    // PUT/DELETE /api/tickets/:id intentionally NOT gated (users manage own tickets).
  ];

  app.use((req, res, next) => {
    const needsAdmin = ADMIN_RULES.some((r) => r.method === req.method.toUpperCase() && r.test(req.path));
    if (needsAdmin && !isValidAdminReq(req)) {
      return res.status(401).json({ error: "Unauthorized. Admin session required." });
    }
    next();
  });

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- Local Database JSON API ---
  app.get("/api/data", (req, res) => {
    try {
      const db = readDb();

      // Admins (valid token) get the full dataset; everyone else gets a
      // sanitized view with PII and admin-only collections stripped.
      if (isValidAdminReq(req)) {
        const { adminSession, adminEmail, deletedUsers, ...full } = db;
        return res.json(full);
      }

      const result: Record<string, any[]> = {};
      for (const c of ["listings", "gaushalas", "alerts", "transports", "vets", "sponsorships"]) {
        result[c] = db[c] || [];
      }
      result.users = (db.users || []).map((u: any) => ({
        id: u.id,
        onboarded: u.onboarded ?? false,
        banned: u.banned ?? false,
      }));
      result.verificationRequests = (db.verificationRequests || []).map((r: any) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        status: r.status,
        submittedAt: r.submittedAt,
      }));
      // Admin-only collections are never exposed to non-admins.
      for (const c of ["tickets", "reports", "comments", "contacts"]) {
        result[c] = [];
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Paginated + filtered listings (mirrors functions/api/listings.ts for local dev)
  app.get("/api/listings", (req, res) => {
    try {
      const db = readDb();
      let items: any[] = Array.isArray(db.listings) ? [...db.listings] : [];

      const type = req.query.type as string | undefined;
      const status = req.query.status as string | undefined;
      const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
      const search = (req.query.search as string | undefined)?.trim().toLowerCase();
      const sort = (req.query.sort as string | undefined) || "newest";
      const page = Math.max(1, parseInt((req.query.page as string) || "1"));
      const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "20")));

      if (type && type !== "all") items = items.filter((l) => l.type === type);
      if (status && status !== "all") items = items.filter((l) => l.milkingStatus === status);
      if (maxPrice !== undefined) items = items.filter((l) => l.type !== "sell" || (Number(l.price) || 0) <= maxPrice);
      if (search) {
        items = items.filter((l) =>
          [l.title, l.breed, l.location, l.description]
            .some((f) => String(f || "").toLowerCase().includes(search))
        );
      }

      if (sort === "priceAsc") items.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
      else if (sort === "priceDesc") items.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      else if (sort === "age") items.sort((a, b) => (parseFloat(a.age) || 0) - (parseFloat(b.age) || 0));
      else items.reverse(); // newest first (insertion order)

      const total = items.length;
      const offset = (page - 1) * limit;
      const paged = items.slice(offset, offset + limit);

      res.json({
        listings: paged,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + limit < total,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const BANNABLE_COLLECTIONS = ["listings", "gaushalas", "alerts", "vets", "transports", "sponsorships"];
  const AUTH_REQUIRED_COLLECTIONS = new Set([
    "listings", "gaushalas", "alerts", "transports", "vets", "sponsorships",
    "verificationRequests", "reports", "reviews", "users",
  ]);
  const FORCE_UNVERIFIED = new Set(["listings", "gaushalas", "vets", "transports"]);
  const PRIVILEGE_FIELDS = ["verified", "featured", "banned", "banReason", "bannedAt", "status", "adminUser", "isAdmin"];

  const stripPrivilege = (body: Record<string, any>) => {
    const out = { ...body };
    for (const k of PRIVILEGE_FIELDS) delete out[k];
    return out;
  };

  const getBearer = (req: express.Request) => {
    const h = (req.headers.authorization as string) || "";
    return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  };

  // verifyFirebaseIdToken is defined later; use a forward declaration via lazy call after init.
  let verifyFirebaseIdToken: (idToken: string) => Promise<{ uid: string; email: string; emailVerified: boolean } | null>;

  app.post("/api/data/:collection", async (req, res) => {
    try {
      const { collection } = req.params;
      const dbData = readDb();
      if (!dbData[collection]) {
        dbData[collection] = [];
      }

      const admin = isValidAdminReq(req);
      let body = { ...(req.body || {}) } as Record<string, any>;
      delete body.id; // never allow client-chosen ids (prevents content takeover)

      let firebaseUser: { uid: string; email: string; emailVerified: boolean } | null = null;
      if (AUTH_REQUIRED_COLLECTIONS.has(collection) && !admin) {
        const token = getBearer(req);
        if (!token) return res.status(401).json({ error: "Unauthorized. Please sign in to create content." });
        firebaseUser = await verifyFirebaseIdToken(token);
        if (!firebaseUser) return res.status(401).json({ error: "Invalid or expired session." });
        if (!firebaseUser.emailVerified) {
          return res.status(403).json({ error: "Please verify your email before performing this action." });
        }
        body.userId = firebaseUser.uid;
        if (collection === "users") {
          body.id = firebaseUser.uid;
          body.email = firebaseUser.email;
        }
      }

      if (!admin) {
        body = stripPrivilege(body);
        if (FORCE_UNVERIFIED.has(collection)) {
          body.verified = false;
          body.featured = false;
        }
        if (collection === "verificationRequests") body.status = "pending";
        if (collection === "sponsorships" || collection === "reports") body.status = "pending";
        if (collection === "alerts") body.status = "active";
      }

      const actorId = body.userId || (admin ? "admin" : null);
      if (BANNABLE_COLLECTIONS.includes(collection) && actorId && actorId !== "admin") {
        const actor = (dbData.users || []).find((u: any) => u.id === actorId);
        const isDeleted = Array.isArray(dbData.deletedUsers) && dbData.deletedUsers.includes(actorId);
        if (actor?.banned === true || isDeleted) {
          return res.status(403).json({ error: "Your account has been suspended." });
        }
      }

      const newItem = {
        ...body,
        id: collection === "users" && body.id ? body.id : randomUUID(),
      };

      dbData[collection].push(newItem);
      writeDb(dbData);
      res.status(201).json(newItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/data/:collection/:id", (req, res) => {
    try {
      const { collection, id } = req.params;
      const dbData = readDb();
      if (!dbData[collection]) {
        return res.status(404).json({ error: `Collection ${collection} not found` });
      }
      
      const index = dbData[collection].findIndex((item: any) => item.id === id);
      if (index === -1) {
        return res.status(404).json({ error: `Item ${id} not found in ${collection}` });
      }
      
      dbData[collection][index] = {
        ...dbData[collection][index],
        ...req.body
      };
      
      writeDb(dbData);
      res.json(dbData[collection][index]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/data/:collection/:id", async (req, res) => {
    try {
      const { collection, id } = req.params;
      const dbData = readDb();
      if (!dbData[collection]) {
        return res.status(404).json({ error: `Collection ${collection} not found` });
      }

      const item = (dbData[collection] || []).find((i: any) => i.id === id);
      if (!item) return res.status(404).json({ error: `Item ${id} not found in ${collection}` });

      const adminOnlyDelete = ["reports", "contacts", "users", "verificationRequests", "reviews"];
      if (adminOnlyDelete.includes(collection)) {
        if (!isValidAdminReq(req)) {
          return res.status(401).json({ error: "Unauthorized. Admin session required." });
        }
      } else if (!isValidAdminReq(req)) {
        const token = getBearer(req);
        const user = token ? await verifyFirebaseIdToken(token) : null;
        const ownerId = item.userId || item.id;
        if (!user || user.uid !== ownerId) {
          return res.status(403).json({ error: "Forbidden. You can only modify your own content." });
        }
      }

      dbData[collection] = dbData[collection].filter((i: any) => i.id !== id);
      writeDb(dbData);
      res.json({ message: "Item deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check if phone number is already registered (do not leak email)
  app.get("/api/users/check-phone/:phone", (req, res) => {
    try {
      const { phone } = req.params;
      const dbData = readDb();
      const users = dbData.users || [];
      const existing = users.find((u: any) => u.phone === phone || u.phone === `+91${phone}`);
      return res.json({ taken: !!existing });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const USER_PROFILE_ALLOW = new Set([
    "name", "displayName", "phone", "phoneNumber", "photoURL", "imageUrl",
    "address", "fullAddress", "city", "state", "pincode", "onboarded",
    "location", "bio", "gender", "role", "updatedAt",
  ]);

  // Special endpoint for users (ensure exists or merge/update profile)
  app.post("/api/users", async (req, res) => {
    try {
      const admin = isValidAdminReq(req);
      let body = { ...(req.body || {}) } as Record<string, any>;
      let id = body.id as string | undefined;
      let email = body.email as string | undefined;
      let name = body.name as string | undefined;

      const banFields = ["banned", "banReason", "bannedAt"];
      if (banFields.some((k) => Object.prototype.hasOwnProperty.call(body, k)) && !admin) {
        return res.status(401).json({ error: "Unauthorized. Admin session required to ban/unban users." });
      }

      if (!admin) {
        const token = getBearer(req);
        if (!token) return res.status(401).json({ error: "Unauthorized. Please sign in." });
        const user = await verifyFirebaseIdToken(token);
        if (!user) return res.status(401).json({ error: "Invalid or expired session." });
        id = user.uid;
        email = user.email;
        const allowed: Record<string, any> = { id, email };
        for (const k of USER_PROFILE_ALLOW) {
          if (Object.prototype.hasOwnProperty.call(body, k)) allowed[k] = body[k];
        }
        body = allowed;
      }

      if (!id) {
        return res.status(400).json({ error: "User ID (id) is required" });
      }

      const dbData = readDb();
      if (!dbData.users) dbData.users = [];

      if (Array.isArray(dbData.deletedUsers) && dbData.deletedUsers.includes(id)) {
        return res.status(403).json({ error: "This account has been removed by an administrator." });
      }

      const index = dbData.users.findIndex((u: any) => u.id === id);
      if (index === -1) {
        const newUser: Record<string, any> = {
          ...body,
          id,
          email: email || "",
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
        dbData.users.push(newUser);
        writeDb(dbData);
        return res.json(newUser);
      } else {
        const prev = dbData.users[index];
        const merged = admin
          ? { ...prev, ...body, id }
          : { ...prev, ...body, id, banned: prev.banned, banReason: prev.banReason, bannedAt: prev.bannedAt };
        dbData.users[index] = merged;
        writeDb(dbData);
        return res.json(merged);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Admin read/list endpoints (mirror Cloudflare Functions for local dev) ---
  app.get("/api/reports", (req, res) => {
    try { res.json(readDb().reports || []); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/reports", (req, res) => {
    try {
      const dbData = readDb();
      if (!dbData.reports) dbData.reports = [];
      const report = { id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, status: "pending", createdAt: new Date().toISOString(), ...req.body };
      dbData.reports.push(report);
      writeDb(dbData);
      res.status(201).json(report);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/contacts", (req, res) => {
    try {
      if (!isValidAdminReq(req)) {
        return res.status(401).json({ error: "Unauthorized. Admin session required." });
      }
      res.json(readDb().contacts || []);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/contacts", (req, res) => {
    try {
      const body = req.body || {};
      if (body.website || body.hp || body._gotcha) {
        return res.status(201).json({ message: "Message sent successfully" });
      }
      const name = String(body.name || "").trim().slice(0, 120);
      const email = String(body.email || "").trim().slice(0, 200);
      const subject = String(body.subject || "").trim().slice(0, 200);
      const message = String(body.message || "").trim().slice(0, 5000);
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "name, email, subject, and message are required" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      const dbData = readDb();
      if (!dbData.contacts) dbData.contacts = [];
      const contact = {
        id: `contact_${Date.now()}_${randomUUID().slice(0, 8)}`,
        name, email, subject, message,
        status: "unread",
        createdAt: new Date().toISOString(),
      };
      dbData.contacts.push(contact);
      writeDb(dbData);
      res.status(201).json({ message: "Message sent successfully" });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/reviews", (req, res) => {
    try {
      const dbData = readDb();
      let reviews = dbData.reviews || [];
      const listingId = req.query.listingId as string | undefined;
      if (listingId) reviews = reviews.filter((r: any) => r.listingId === listingId);
      res.json([...reviews].reverse());
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/reviews", (req, res) => {
    try {
      const dbData = readDb();
      if (!dbData.reviews) dbData.reviews = [];
      const actor = (dbData.users || []).find((u: any) => u.id === req.body?.userId);
      if (actor?.banned === true) return res.status(403).json({ error: "Your account has been suspended." });
      const review = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        listingId: req.body.listingId,
        userId: req.body.userId,
        userName: req.body.userName,
        rating: Math.min(5, Math.max(1, Number(req.body.rating) || 5)),
        comment: String(req.body.comment || "").slice(0, 2000),
        createdAt: new Date().toISOString(),
      };
      dbData.reviews.push(review);
      writeDb(dbData);
      res.status(201).json(review);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/comments", (req, res) => {
    try {
      const listingId = req.query.listingId as string | undefined;
      if (!listingId) {
        return res.status(400).json({ error: "listingId query parameter is required" });
      }
      const dbData = readDb();
      let comments = (dbData.comments || []).filter((c: any) => c.listingId === listingId);
      res.json([...comments].reverse().slice(0, 200));
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/comments", (req, res) => {
    try {
      const dbData = readDb();
      if (!dbData.comments) dbData.comments = [];
      const actor = (dbData.users || []).find((u: any) => u.id === req.body?.userId);
      if (actor?.banned === true) return res.status(403).json({ error: "Your account has been suspended." });
      const comment = {
        id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        listingId: req.body.listingId,
        userId: req.body.userId,
        userName: req.body.userName,
        text: req.body.text,
        createdAt: new Date().toISOString(),
      };
      dbData.comments.push(comment);
      writeDb(dbData);
      res.status(201).json(comment);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/audit-log", (req, res) => {
    try { res.json([...(readDb().auditLog || [])].reverse()); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/audit-log", (req, res) => {
    try {
      const dbData = readDb();
      if (!dbData.auditLog) dbData.auditLog = [];
      const entry = { id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, timestamp: new Date().toISOString(), ...req.body };
      dbData.auditLog.push(entry);
      // Keep only the most recent 500 entries
      if (dbData.auditLog.length > 500) dbData.auditLog = dbData.auditLog.slice(-500);
      writeDb(dbData);
      res.status(201).json(entry);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/settings", (req, res) => {
    try { res.json(readDb().settings || {}); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.put("/api/settings", (req, res) => {
    try {
      if (!isValidAdminReq(req)) {
        return res.status(401).json({ error: "Unauthorized. Admin session required." });
      }
      const blocked = new Set(["admin_session", "admin_email", "deleted_users", "adminSession", "adminEmail", "deletedUsers"]);
      const body = { ...(req.body || {}) };
      for (const k of blocked) delete body[k];
      const dbData = readDb();
      dbData.settings = { ...(dbData.settings || {}), ...body };
      writeDb(dbData);
      res.json({ message: "Settings updated" });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- Tickets (mirror functions/api/tickets for local dev) ---
  app.post("/api/tickets", (req, res) => {
    try {
      const { userId, subject, description } = req.body || {};
      if (!userId || !subject || !description) return res.status(400).json({ error: "userId, subject, and description are required" });
      const dbData = readDb();
      if (!dbData.tickets) dbData.tickets = [];
      const ticket = {
        id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId,
        userName: req.body.userName || "User",
        userEmail: req.body.userEmail || "",
        category: req.body.category || "general",
        subject,
        description,
        status: "open",
        attachmentUrl: req.body.attachmentUrl || "",
        createdAt: new Date().toISOString(),
      };
      dbData.tickets.push(ticket);
      writeDb(dbData);
      res.status(201).json(ticket);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // GET /api/tickets/:id returns tickets for a given userId (self or admin only)
  app.get("/api/tickets/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      if (!isValidAdminReq(req)) {
        const token = getBearer(req);
        if (!token) return res.status(401).json({ error: "Unauthorized." });
        const me = await verifyFirebaseIdToken(token);
        if (!me || me.uid !== userId) {
          return res.status(403).json({ error: "Forbidden. You can only view your own tickets." });
        }
      }
      const tickets = (readDb().tickets || []).filter((t: any) => t.userId === userId);
      res.json(tickets);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // PUT/DELETE /api/tickets/:id operate on the ticket id
  app.put("/api/tickets/:id", async (req, res) => {
    try {
      const dbData = readDb();
      const tickets = dbData.tickets || [];
      const index = tickets.findIndex((t: any) => t.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: "Ticket not found" });
      const ticket = tickets[index];
      const admin = isValidAdminReq(req);
      if (!admin) {
        const token = getBearer(req);
        const me = token ? await verifyFirebaseIdToken(token) : null;
        if (!me || me.uid !== ticket.userId) return res.status(401).json({ error: "Unauthorized." });
        const patch: Record<string, any> = {};
        if (typeof req.body?.userComment === "string") patch.userComment = String(req.body.userComment).slice(0, 5000);
        if (req.body?.status === "closed") patch.status = "closed";
        tickets[index] = { ...ticket, ...patch, userId: ticket.userId, updatedAt: new Date().toISOString() };
      } else {
        tickets[index] = { ...ticket, ...req.body, userId: ticket.userId, updatedAt: new Date().toISOString() };
      }
      dbData.tickets = tickets;
      writeDb(dbData);
      res.json(tickets[index]);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.delete("/api/tickets/:id", async (req, res) => {
    try {
      const dbData = readDb();
      const tickets = dbData.tickets || [];
      const ticket = tickets.find((t: any) => t.id === req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (!isValidAdminReq(req)) {
        const token = getBearer(req);
        const me = token ? await verifyFirebaseIdToken(token) : null;
        if (!me || me.uid !== ticket.userId) return res.status(401).json({ error: "Unauthorized." });
      }
      dbData.tickets = tickets.filter((t: any) => t.id !== req.params.id);
      writeDb(dbData);
      res.json({ message: "Ticket deleted" });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // GET a single user — full profile for owner/admin, public projection otherwise
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = (readDb().users || []).find((u: any) => u.id === req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (isValidAdminReq(req)) return res.json(user);
      const token = getBearer(req);
      if (token) {
        const me = await verifyFirebaseIdToken(token);
        if (me && me.uid === req.params.id) return res.json(user);
      }
      return res.json({
        id: user.id,
        name: user.name || user.displayName,
        displayName: user.displayName || user.name,
        photoURL: user.photoURL || user.imageUrl,
        imageUrl: user.imageUrl || user.photoURL,
        onboarded: user.onboarded ?? false,
        banned: user.banned ?? false,
        city: user.city,
        state: user.state,
      });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // DELETE a user (?id=) and cascade-delete their content
  app.delete("/api/users", (req, res) => {
    try {
      const id = req.query.id as string | undefined;
      if (!id) return res.status(400).json({ error: "User ID is required" });
      const dbData = readDb();
      dbData.users = (dbData.users || []).filter((u: any) => u.id !== id);
      for (const col of ["listings", "gaushalas", "alerts", "vets", "transports", "sponsorships", "verificationRequests", "reviews", "comments", "tickets"]) {
        if (Array.isArray(dbData[col])) dbData[col] = dbData[col].filter((item: any) => item.userId !== id);
      }
      // Tombstone so the still-logged-in client can't recreate the record.
      if (!Array.isArray(dbData.deletedUsers)) dbData.deletedUsers = [];
      if (!dbData.deletedUsers.includes(id)) dbData.deletedUsers.push(id);
      writeDb(dbData);
      res.json({ message: "User and their content deleted" });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- Admin Session (mirrors functions/api/admin-session.ts for local dev) ---
  // No default credentials — password fallback only works when secrets are set.
  const getAdminCreds = () => {
    const user = process.env.ADMIN_USER || process.env.VITE_ADMIN_USER || "";
    const pass = process.env.ADMIN_PASS || process.env.VITE_ADMIN_PASS || "";
    return { user, pass };
  };

  // Verify a Firebase ID token via Google's Identity Toolkit REST API.
  verifyFirebaseIdToken = async (idToken: string) => {
    if (!idToken) return null;
    const apiKey =
      process.env.FIREBASE_API_KEY ||
      process.env.VITE_FIREBASE_API_KEY ||
      "AIzaSyC_V9CuYJr-UNQS6vz_qEYvhOb8iby8htA";
    try {
      const r = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        },
      );
      if (!r.ok) return null;
      const data: any = await r.json();
      const u = data?.users?.[0];
      if (!u || !u.email) return null;
      return { uid: u.localId, email: String(u.email).toLowerCase(), emailVerified: !!u.emailVerified };
    } catch {
      return null;
    }
  };

  // --- Admin Account (first-time setup, mirrors functions/api/admin-account.ts) ---
  app.get("/api/admin-account", (req, res) => {
    try {
      const dbData = readDb();
      return res.json({ exists: !!dbData.adminEmail });
    } catch {
      return res.json({ exists: true });
    }
  });

  app.post("/api/admin-account", async (req, res) => {
    try {
      const { idToken } = req.body || {};
      if (!idToken) return res.status(400).json({ error: "Missing idToken" });

      const dbData = readDb();
      if (dbData.adminEmail) {
        return res.status(409).json({ error: "An admin account already exists." });
      }
      const user = await verifyFirebaseIdToken(idToken);
      if (!user) return res.status(401).json({ error: "Invalid or expired token." });

      dbData.adminEmail = user.email;
      writeDb(dbData);
      return res.json({ success: true, email: user.email });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin-session", async (req, res) => {
    try {
      const { idToken, username, password } = req.body || {};
      let sessionUser: string;

      if (idToken) {
        const user = await verifyFirebaseIdToken(idToken);
        if (!user) return res.status(401).json({ error: "Invalid or expired session token." });
        const dbData = readDb();
        const adminEmail = dbData.adminEmail ? String(dbData.adminEmail).toLowerCase() : "";
        if (!adminEmail) {
          return res.status(403).json({ error: "No admin configured yet. Complete first-time setup." });
        }
        if (user.email !== adminEmail) {
          return res.status(403).json({ error: "This account is not an admin." });
        }
        sessionUser = user.email;
      } else {
        const { user: adminUser, pass: adminPass } = getAdminCreds();
        if (!adminUser || !adminPass) {
          return res.status(401).json({
            error: "Password fallback disabled. Use Firebase admin login, or set ADMIN_USER/ADMIN_PASS secrets.",
          });
        }
        if (username !== adminUser || password !== adminPass) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
        sessionUser = username;
      }

      const token = randomUUID();
      const sessionData = {
        token,
        username: sessionUser,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };

      const dbData = readDb();
      dbData.adminSession = sessionData;
      writeDb(dbData);

      return res.json({ token, username: sessionUser });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin-session", (req, res) => {
    try {
      const headerToken = (req.headers["x-admin-token"] as string) || "";
      const bearer = ((req.headers.authorization as string) || "").replace(/^Bearer\s+/i, "").trim();
      const queryToken = (req.query.token as string) || "";
      const token = headerToken || bearer || queryToken;
      if (!token) {
        return res.status(401).json({ valid: false });
      }

      const dbData = readDb();
      const session = dbData.adminSession;
      if (!session) {
        return res.status(401).json({ valid: false });
      }

      if (session.token !== token) {
        return res.status(401).json({ valid: false, message: "Session expired - logged in from another browser" });
      }

      // Sliding session expiry: invalidate after 24h of inactivity
      const MAX_IDLE_MS = 24 * 60 * 60 * 1000;
      const last = Date.parse(session.lastActive || session.createdAt || "");
      if (!Number.isNaN(last) && Date.now() - last > MAX_IDLE_MS) {
        delete dbData.adminSession;
        writeDb(dbData);
        return res.status(401).json({ valid: false, message: "Session expired due to inactivity" });
      }

      session.lastActive = new Date().toISOString();
      dbData.adminSession = session;
      writeDb(dbData);

      return res.json({ valid: true, username: session.username });
    } catch (error: any) {
      return res.status(500).json({ valid: false });
    }
  });

  app.delete("/api/admin-session", (req, res) => {
    try {
      const headerToken = (req.headers["x-admin-token"] as string) || "";
      const bearer = ((req.headers.authorization as string) || "").replace(/^Bearer\s+/i, "").trim();
      const queryToken = (req.query.token as string) || "";
      const provided = headerToken || bearer || queryToken;
      if (!provided) {
        return res.status(401).json({ error: "Unauthorized. Session token required." });
      }
      const dbData = readDb();
      const session = dbData.adminSession;
      if (session?.token && session.token !== provided) {
        return res.status(401).json({ error: "Unauthorized. Invalid session token." });
      }
      delete dbData.adminSession;
      writeDb(dbData);
      return res.json({ message: "Logged out" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
  const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
  const MAX_UPLOAD = 5 * 1024 * 1024;

  const requireUploadAuth = async (req: express.Request) => {
    if (isValidAdminReq(req)) return { ok: true as const, prefix: "admin" };
    const token = getBearer(req);
    if (!token) return { ok: false as const, status: 401, error: "Unauthorized. Please sign in." };
    const user = await verifyFirebaseIdToken(token);
    if (!user) return { ok: false as const, status: 401, error: "Invalid or expired session." };
    if (!user.emailVerified) {
      return { ok: false as const, status: 403, error: "Please verify your email before performing this action." };
    }
    return { ok: true as const, prefix: user.uid };
  };

  const safeExt = (fileName: string) => {
    const dot = fileName.lastIndexOf(".");
    const ext = (dot >= 0 ? fileName.slice(dot) : ".jpg").toLowerCase();
    return ALLOWED_EXTS.has(ext) ? ext : ".jpg";
  };

  // API Route to generate Cloudflare R2 presigned upload URL
  app.post("/api/upload-url", async (req, res) => {
    try {
      const authz = await requireUploadAuth(req);
      if (!authz.ok) return res.status(authz.status).json({ error: authz.error });

      const { fileName, contentType } = req.body || {};
      if (!fileName || !contentType) {
        return res.status(400).json({ error: "fileName and contentType are required" });
      }
      const ct = String(contentType).split(";")[0].trim().toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(ct)) {
        return res.status(400).json({ error: "Only image uploads are allowed (jpeg, png, webp, gif)." });
      }

      if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
        return res.status(500).json({
          error: "Cloudflare R2 credentials/bucket name are not fully configured on the backend server.",
        });
      }

      const fileExtension = safeExt(fileName);
      const uniqueName = `${Date.now()}-${randomUUID()}${fileExtension}`;
      const fileKey = `uploads/${authz.prefix}/${uniqueName}`;

      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        ContentType: ct,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
      const publicPrefix = process.env.R2_PUBLIC_URL_PREFIX || `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}`;
      const publicUrl = `${publicPrefix.replace(/\/$/, "")}/${fileKey}`;

      res.json({ uploadUrl, publicUrl });
    } catch (error: any) {
      console.error("Error generating presigned URL:", error);
      res.status(500).json({ error: error.message || "Failed to generate upload URL" });
    }
  });

  // API Route to directly upload to Cloudflare R2 or fall back to local disk storage
  app.post("/api/upload", express.raw({ type: "*/*", limit: "5mb" }), async (req, res) => {
    try {
      const authz = await requireUploadAuth(req);
      if (!authz.ok) return res.status(authz.status).json({ error: authz.error });

      const fileNameHeader = (req.headers["x-file-name"] as string) || "cattle.jpg";
      const contentType = (req.headers["content-type"] || "image/jpeg").split(";")[0].trim().toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
        return res.status(400).json({ error: "Only image uploads are allowed (jpeg, png, webp, gif)." });
      }

      if (!req.body || req.body.length === 0) {
        return res.status(400).json({ error: "Empty file payload" });
      }
      if (req.body.length > MAX_UPLOAD) {
        return res.status(413).json({ error: "File too large. Maximum size is 5MB." });
      }

      const fileExtension = safeExt(fileNameHeader);
      const uniqueName = `${Date.now()}-${randomUUID()}${fileExtension}`;
      const fileKey = `uploads/${authz.prefix}/${uniqueName}`;

      const hasR2 =
        process.env.R2_ENDPOINT &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_ACCESS_KEY_ID !== "PLACE_YOUR_ACCESS_KEY_ID_HERE" &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_SECRET_ACCESS_KEY !== "PLACE_YOUR_SECRET_ACCESS_KEY_HERE" &&
        process.env.R2_BUCKET_NAME;

      if (hasR2) {
        const command = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileKey,
          Body: req.body,
          ContentType: contentType,
        });
        await s3Client.send(command);
        const publicPrefix =
          process.env.R2_PUBLIC_URL_PREFIX || `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}`;
        const publicUrl = `${publicPrefix.replace(/\/$/, "")}/${fileKey}`;
        return res.json({ publicUrl });
      } else {
        const uploadsDir = path.join(process.cwd(), "public", "uploads", authz.prefix);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, uniqueName);
        fs.writeFileSync(filePath, req.body);
        const publicUrl = `/uploads/${authz.prefix}/${uniqueName}`;
        return res.json({ publicUrl });
      }
    } catch (error: any) {
      console.error("Error in upload endpoint:", error);
      res.status(500).json({ error: error.message || "Failed to upload image" });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
