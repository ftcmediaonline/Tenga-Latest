import { Resend } from "resend";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Default sender when TRANSACTIONAL_FROM_EMAIL / PROMO_FROM_EMAIL are not set in secrets. */
export const DEFAULT_FROM_EMAIL = "Tenga Virtual Mall <info@tengavm.co.zw>";

let resendClient: Resend | null = null;

/** Resend client using `RESEND_API_KEY` from Supabase Edge Function secrets. */
export function getResend(): Resend | null {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function requireResendKey(): string | null {
  return Deno.env.get("RESEND_API_KEY") ?? null;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/** Production: set `TRANSACTIONAL_FROM_EMAIL` to a verified domain (see resend.com/domains). */
export function transactionalFrom(): string {
  return (
    Deno.env.get("TRANSACTIONAL_FROM_EMAIL") ||
    Deno.env.get("FROM_EMAIL") ||
    Deno.env.get("PROMO_FROM_EMAIL") ||
    DEFAULT_FROM_EMAIL
  );
}

/** Production: set `PROMO_FROM_EMAIL` to a verified domain. */
export function promoFrom(): string {
  return (
    Deno.env.get("PROMO_FROM_EMAIL") ||
    Deno.env.get("FROM_EMAIL") ||
    DEFAULT_FROM_EMAIL
  );
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Send a single email via the Resend SDK (`resend.emails.send`).
 * Uses `{ data, error }` — does not throw on API errors.
 */
export async function sendEmail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
  tags?: { name: string; value: string }[];
}): Promise<SendEmailResult> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const { data, error } = await resend.emails.send({
    from: params.from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    ...(params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {}),
    ...(params.tags ? { tags: params.tags } : {}),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id ?? "" };
}

/** @deprecated Use `sendEmail` — kept for existing imports. */
export const sendResendEmail = sendEmail;

const BATCH_SIZE = 100;

/**
 * Send the same message to many recipients via `resend.batch.send`.
 */
export async function sendBatchEmails(params: {
  from: string;
  subject: string;
  html: string;
  recipients: string[];
  idempotencyKeyPrefix: string;
}): Promise<{ ok: true; sent: number } | { ok: false; error: string; sent: number }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not configured", sent: 0 };
  }

  let sent = 0;
  const { recipients, from, subject, html, idempotencyKeyPrefix } = params;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const payload = chunk.map((to, idx) => ({
      from,
      to: [to],
      subject,
      html,
      idempotencyKey: `${idempotencyKeyPrefix}/${i + idx}/${to}`,
    }));

    const { data, error } = await resend.batch.send(payload);

    if (error) {
      return { ok: false, error: error.message, sent };
    }

    sent += Array.isArray(data) ? data.length : chunk.length;
  }

  return { ok: true, sent };
}
