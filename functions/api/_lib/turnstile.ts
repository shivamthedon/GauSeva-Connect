/**
 * Cloudflare Turnstile server verification.
 * If TURNSTILE_SECRET_KEY is not configured, verification is skipped (dev-friendly)
 * but production should set the secret for bot protection.
 */

export async function verifyTurnstile(
  env: any,
  token: string | undefined | null,
  remoteip?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = env?.TURNSTILE_SECRET_KEY || env?.TURNSTILE_SECRET;
  // If not configured, do not break the form — log and allow.
  if (!secret) {
    return { ok: true };
  }
  if (!token || typeof token !== "string" || token.length < 10) {
    return { ok: false, error: "Bot check required. Please complete the captcha." };
  }
  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (remoteip) body.set("remoteip", remoteip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return { ok: false, error: "Bot check failed. Try again." };
    const data: any = await res.json();
    if (data?.success === true) return { ok: true };
    return { ok: false, error: "Bot check failed. Please try again." };
  } catch {
    return { ok: false, error: "Bot check unavailable. Try again shortly." };
  }
}
