"use strict";

const env = require("../config/env");

/**
 * Brevo (formerly Sendinblue) transactional email client.
 *
 * One function: sendEmail({ to, subject, html, text }). Returns a Promise
 * that resolves to { ok, providerId } on success or rejects on failure.
 *
 * In dev with no BREVO_API_KEY set, this logs the email payload to the
 * console instead of failing — so local "publish results" still works
 * end-to-end, but you don't need a Brevo account to develop.
 *
 * Why Brevo's REST API and not SMTP:
 *   - No port 25/465/587 dance with the host firewall
 *   - No retry/queue logic to write ourselves — Brevo handles bounces
 *   - One HTTP call, idempotent on the network layer
 *
 * Why native fetch and not nodemailer/axios:
 *   - Node 22 has a stable global fetch
 *   - No extra dependency for a single endpoint
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

function isConfigured() {
  return Boolean(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL);
}

/**
 * @param {object} args
 * @param {Array<{ email: string, name?: string }>|string} args.to
 *   A single email string, or an array of recipients.
 * @param {string} args.subject
 * @param {string} args.html  HTML body.
 * @param {string} [args.text]  Optional plain-text body. Recommended.
 * @param {string} [args.replyTo]  Optional reply-to email.
 */
async function sendEmail({ to, subject, html, text, replyTo }) {
  const recipients = Array.isArray(to)
    ? to
    : [{ email: typeof to === "string" ? to : to.email, name: to.name }];

  const payload = {
    sender: {
      email: env.BREVO_SENDER_EMAIL || "noreply@pulse-board.local",
      name: env.BREVO_SENDER_NAME || "Pulse Board",
    },
    to: recipients.map((r) =>
      typeof r === "string" ? { email: r } : { email: r.email, name: r.name }
    ),
    subject,
    htmlContent: html,
    textContent: text,
    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
  };

  if (!isConfigured()) {
    // Dev fallback. Print enough to verify wiring without spamming logs.
    console.log(
      `[email] Brevo not configured — would have sent to ${recipients.length} recipient(s):`
    );
    console.log(`[email]   subject: ${subject}`);
    console.log(`[email]   first to: ${payload.to[0]?.email}`);
    return { ok: true, providerId: null, simulated: true };
  }

  let res;
  try {
    res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Network / DNS failure. Don't crash the caller — they typically
    // fire-and-forget. Surface enough to debug.
    console.error("[email] Brevo request failed:", err.message);
    return { ok: false, error: err.message };
  }

  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    console.error(
      `[email] Brevo returned ${res.status} ${res.statusText} — ${body.slice(0, 300)}`
    );
    return { ok: false, status: res.status, body };
  }

  const data = await res.json().catch(() => ({}));
  return { ok: true, providerId: data?.messageId || null };
}

module.exports = { sendEmail, isConfigured };
