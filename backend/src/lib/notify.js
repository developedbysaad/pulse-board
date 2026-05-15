"use strict";

const env = require("../config/env");
const { Subscriber, Election } = require("../models");
const { sendEmail } = require("./email");

/**
 * High-level notifier — translates domain events ("results published")
 * into actual outbound emails. Controllers call notifyResultsPublished
 * fire-and-forget (no await) so the API responds instantly.
 *
 * Failures are logged, not propagated. We never want a flaky email
 * provider to take down the publish action.
 */

function publicOrigin() {
  if (env.PUBLIC_ORIGIN) return env.PUBLIC_ORIGIN.replace(/\/$/, "");
  if (env.FRONTEND_ORIGIN) return env.FRONTEND_ORIGIN.replace(/\/$/, "");
  return "http://localhost:5173";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resultsEmail({ election, origin, recipientEmail }) {
  const url = `${origin}/e/${election.customUrl}/results`;
  const safeName = escapeHtml(election.name);
  const safeUrl = escapeHtml(url);

  const subject = `Results are in: ${election.name}`;

  const text = [
    `The poll you subscribed to has published its final results.`,
    ``,
    `Poll: ${election.name}`,
    `View results: ${url}`,
    ``,
    `— Pulse Board`,
    `https://x.com/developedbysaad`,
    ``,
    `You're receiving this because you subscribed to results updates`,
    `for this poll. Reply to this email if that wasn't you.`,
    ``,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#FAF7EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#22201D;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7EE;padding:32px 16px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#FAF7EE;">
        <tr><td style="padding-bottom:24px;font-family:'Iowan Old Style',Garamond,Georgia,serif;font-size:28px;font-weight:600;letter-spacing:-0.01em;color:#22201D;">
          Pulse Board
        </td></tr>

        <tr><td style="padding:24px;background:#FAF7EE;border:1px solid #22201D;box-shadow:6px 6px 0 0 #22201D;">
          <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#5C5854;font-family:'JetBrains Mono',ui-monospace,monospace;">
            Results published
          </p>
          <h1 style="margin:0 0 16px 0;font-family:'Iowan Old Style',Garamond,Georgia,serif;font-size:32px;line-height:1.1;font-weight:600;letter-spacing:-0.01em;color:#22201D;">
            ${safeName}
          </h1>
          <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;color:#3A3733;">
            The poll you subscribed to has wrapped. The final tally is now public — open it whenever you're ready.
          </p>
          <p style="margin:0;">
            <a href="${safeUrl}" style="display:inline-block;background:#C53D1F;color:#FAF7EE;text-decoration:none;padding:14px 28px;border:2px solid #22201D;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;">
              View results &rarr;
            </a>
          </p>
        </td></tr>

        <tr><td style="padding-top:24px;font-size:12px;color:#5C5854;line-height:1.6;">
          You're receiving this because you subscribed to results updates for
          <strong>${safeName}</strong>. Reply to this email if that wasn't you.
        </td></tr>

        <tr><td style="padding-top:16px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#827F7B;font-family:'JetBrains Mono',ui-monospace,monospace;">
          Pulse Board · made by Saad · x.com/developedbysaad
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { to: recipientEmail, subject, text, html };
}

async function notifyResultsPublished(electionId) {
  try {
    const election = await Election.findByPk(electionId);
    if (!election) return;

    const subscribers = await Subscriber.findAll({
      where: { electionId },
      attributes: ["email"],
    });
    if (subscribers.length === 0) return;

    const origin = publicOrigin();
    const sends = subscribers.map((s) =>
      sendEmail(
        resultsEmail({ election, origin, recipientEmail: s.email })
      ).catch((err) => {
        console.error(
          `[notify] Failed to send results email to ${s.email}:`,
          err?.message || err
        );
        return { ok: false };
      })
    );

    const results = await Promise.allSettled(sends);
    const ok = results.filter(
      (r) => r.status === "fulfilled" && r.value?.ok !== false
    ).length;
    console.log(
      `[notify] results published for election #${electionId} (${election.customUrl}) — sent ${ok}/${subscribers.length}`
    );
  } catch (err) {
    console.error(
      `[notify] Failed to notify subscribers for #${electionId}:`,
      err?.message || err
    );
  }
}

function passwordResetEmail({ admin, rawToken, origin, expiresAt }) {
  const url = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const safeUrl = escapeHtml(url);
  const safeName = escapeHtml(admin.name || "there");

  const subject = "Reset your Pulse Board password";

  const expiresMins = Math.round((expiresAt.getTime() - Date.now()) / 60000);

  const text = [
    `Hi ${admin.name || "there"},`,
    ``,
    `We received a request to reset the password for the Pulse Board admin`,
    `account tied to this email address. To set a new password, open the link`,
    `below within the next ${expiresMins} minutes:`,
    ``,
    url,
    ``,
    `If you didn't request this, you can safely ignore this email — your`,
    `password stays the same and no one else has access to your account.`,
    ``,
    `— Pulse Board`,
    `https://x.com/developedbysaad`,
    ``,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#FAF7EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#22201D;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7EE;padding:32px 16px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#FAF7EE;">
        <tr><td style="padding-bottom:24px;font-family:'Iowan Old Style',Garamond,Georgia,serif;font-size:28px;font-weight:600;letter-spacing:-0.01em;color:#22201D;">
          Pulse Board
        </td></tr>

        <tr><td style="padding:24px;background:#FAF7EE;border:1px solid #22201D;box-shadow:6px 6px 0 0 #22201D;">
          <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#5C5854;font-family:'JetBrains Mono',ui-monospace,monospace;">
            Reset password
          </p>
          <h1 style="margin:0 0 16px 0;font-family:'Iowan Old Style',Garamond,Georgia,serif;font-size:32px;line-height:1.1;font-weight:600;letter-spacing:-0.01em;color:#22201D;">
            Hi ${safeName} —
          </h1>
          <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#3A3733;">
            We received a request to reset the password on your Pulse Board
            admin account. Open the link below within the next ${expiresMins}
            minutes to set a new one.
          </p>
          <p style="margin:0 0 24px 0;">
            <a href="${safeUrl}" style="display:inline-block;background:#C53D1F;color:#FAF7EE;text-decoration:none;padding:14px 28px;border:2px solid #22201D;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;">
              Set a new password &rarr;
            </a>
          </p>
          <p style="margin:0;font-size:13px;color:#5C5854;">
            Didn't request this? You can ignore the email — your current
            password is unchanged and the link expires on its own.
          </p>
        </td></tr>

        <tr><td style="padding-top:16px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#827F7B;font-family:'JetBrains Mono',ui-monospace,monospace;">
          Pulse Board · made by Saad · x.com/developedbysaad
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { to: admin.email, subject, text, html };
}

async function sendPasswordResetEmail({ admin, rawToken, expiresAt }) {
  const origin = publicOrigin();
  return sendEmail(passwordResetEmail({ admin, rawToken, origin, expiresAt }));
}

module.exports = { notifyResultsPublished, sendPasswordResetEmail };
