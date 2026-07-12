import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { EventContext } from "@cloudflare/workers-types";
import {
  requireAdminOrFirebase,
  isAllowedImageContentType,
  safeImageExtension,
  checkRateLimit,
  rateLimitResponse,
} from "./_lib/security";

export async function onRequestPost(context: EventContext<any, string, any>) {
  try {
    const rl = await checkRateLimit(context.request, "upload-url", 20, 60);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const authz = await requireAdminOrFirebase(context.env, context.request, {
      requireEmailVerified: true,
    });
    if (authz.ok === false) {
      return Response.json({ error: authz.error }, { status: authz.status });
    }

    const body = await context.request.json().catch(() => ({})) as {
      fileName?: string;
      contentType?: string;
    };
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return Response.json({ error: "fileName and contentType are required" }, { status: 400 });
    }

    if (!isAllowedImageContentType(contentType)) {
      return Response.json(
        { error: "Only image uploads are allowed (jpeg, png, webp, gif)." },
        { status: 400 },
      );
    }

    const env = context.env;
    const bucket = env.R2_BUCKET;
    if (!bucket) {
      return Response.json({ error: "R2 bucket not bound" }, { status: 500 });
    }

    const endpoint = env.R2_ENDPOINT;
    const accessKeyId = env.R2_ACCESS_KEY_ID;
    const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
    const publicPrefix = env.R2_PUBLIC_URL_PREFIX;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      return Response.json({ error: "R2 credentials not configured" }, { status: 500 });
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    const bucketName = env.R2_BUCKET_NAME;
    if (!bucketName) {
      return Response.json({ error: "R2_BUCKET_NAME not configured" }, { status: 500 });
    }

    const fileExtension = safeImageExtension(fileName);
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${fileExtension}`;
    const ownerPrefix = authz.admin ? "admin" : authz.user!.uid;
    const fileKey = `uploads/${ownerPrefix}/${uniqueName}`;
    const normalizedType = contentType.split(";")[0].trim().toLowerCase();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: normalizedType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    const prefix = publicPrefix || `${endpoint}/${bucketName}`;
    const publicUrl = `${prefix.replace(/\/$/, "")}/${fileKey}`;

    return Response.json({ uploadUrl, publicUrl });
  } catch (error: any) {
    return Response.json({ error: error.message || "Failed to generate upload URL" }, { status: 500 });
  }
}
