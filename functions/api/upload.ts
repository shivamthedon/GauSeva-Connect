import type { EventContext } from "@cloudflare/workers-types";
import {
  requireAdminOrFirebase,
  isAllowedImageContentType,
  safeImageExtension,
  looksLikeImageBytes,
  MAX_UPLOAD_BYTES,
  checkRateLimit,
  rateLimitResponse,
} from "./_lib/security";

export async function onRequestPost(context: EventContext<any, string, any>) {
  try {
    const rl = await checkRateLimit(context.request, "upload", 20, 60);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const authz = await requireAdminOrFirebase(context.env, context.request, {
      requireEmailVerified: true,
    });
    if (authz.ok === false) {
      return Response.json({ error: authz.error }, { status: authz.status });
    }

    const env = context.env;
    const bucket = env.R2_BUCKET;
    if (!bucket) {
      return Response.json({ error: "R2 bucket not bound" }, { status: 500 });
    }

    const publicPrefix = env.R2_PUBLIC_URL_PREFIX;
    if (!publicPrefix) {
      return Response.json({ error: "R2_PUBLIC_URL_PREFIX not configured" }, { status: 500 });
    }

    const contentType = context.request.headers.get("Content-Type") || "image/jpeg";
    if (!isAllowedImageContentType(contentType)) {
      return Response.json(
        { error: "Only image uploads are allowed (jpeg, png, webp, gif)." },
        { status: 400 },
      );
    }

    const fileNameHeader = context.request.headers.get("X-File-Name") || "cattle.jpg";
    const body = await context.request.arrayBuffer();
    if (!body || body.byteLength === 0) {
      return Response.json({ error: "Empty file payload" }, { status: 400 });
    }
    if (body.byteLength > MAX_UPLOAD_BYTES) {
      return Response.json(
        { error: `File too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` },
        { status: 413 },
      );
    }
    if (!looksLikeImageBytes(body)) {
      return Response.json(
        { error: "File content is not a valid image (jpeg/png/webp/gif)." },
        { status: 400 },
      );
    }

    const fileExtension = safeImageExtension(fileNameHeader);
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${fileExtension}`;
    const ownerPrefix = authz.admin ? "admin" : authz.user!.uid;
    const fileKey = `uploads/${ownerPrefix}/${uniqueName}`;

    const normalizedType = contentType.split(";")[0].trim().toLowerCase();
    await bucket.put(fileKey, body, {
      httpMetadata: { contentType: normalizedType },
    });

    const publicUrl = `${publicPrefix.replace(/\/$/, "")}/${fileKey}`;
    return Response.json({ publicUrl });
  } catch (error: any) {
    return Response.json({ error: error.message || "Failed to upload" }, { status: 500 });
  }
}
