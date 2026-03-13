/**
 * auth.mail.ts — E-Mail via Resend (primary) mit nodemailer als Fallback
 *
 * Env vars:
 *   RESEND_API_KEY   → Resend nutzen  (empfohlen)
 *   SMTP_HOST        → nodemailer Fallback
 *   SMTP_FROM        → Absender für beide
 */
import { appConfig } from "../../config.js";

function buildResetUrl(token: string): string {
  const base = appConfig.webAppUrl.replace(/\/$/, "");
  return `${base}/?${new URLSearchParams({ mode: "reset", token }).toString()}`;
}

function resetHtml(resetUrl: string, logoUrl: string): string {
  return `
<div style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,system-ui,sans-serif;color:#f2f2f2">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
        style="max-width:560px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:14px;overflow:hidden">
        <tr><td style="padding:32px 32px 16px;text-align:center">
          <img src="${logoUrl}" alt="Chat-Net" width="56" height="56"
            style="display:block;margin:0 auto 14px" />
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#444">chat-net.tech</p>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#f2f2f2;letter-spacing:-.02em">Passwort zurücksetzen</h1>
        </td></tr>
        <tr><td style="padding:0 32px;font-size:15px;line-height:1.65;color:#888">
          Für dein Chat-Net Konto wurde ein Passwort-Reset angefordert.
          Klicke auf den Button, um ein neues Passwort zu vergeben.
        </td></tr>
        <tr><td style="padding:24px 32px 8px;text-align:center">
          <a href="${resetUrl}"
            style="display:inline-block;padding:12px 28px;border-radius:9px;background:#fff;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:14px">
            Neues Passwort festlegen
          </a>
        </td></tr>
        <tr><td style="padding:8px 32px 0;font-size:12px;color:#555;line-height:1.6">
          Der Link ist <strong style="color:#a0a0a0">30 Minuten</strong> gültig und kann nur einmal verwendet werden.
        </td></tr>
        <tr><td style="padding:12px 32px 0;font-size:11px;color:#444;line-height:1.6;word-break:break-all">
          Falls der Button nicht funktioniert:<br />
          <a href="${resetUrl}" style="color:#888;text-decoration:underline">${resetUrl}</a>
        </td></tr>
        <tr><td style="padding:16px 32px 28px;font-size:12px;color:#333;line-height:1.6">
          Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;
}

async function sendViaResend(input: { to: string; token: string }): Promise<{ delivered: boolean; resetUrl: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { delivered: false, resetUrl: buildResetUrl(input.token) };

  const resetUrl = buildResetUrl(input.token);
  const logoUrl = `${appConfig.webAppUrl.replace(/\/$/, "")}/chat-net-logo.svg`;
  const from = appConfig.smtpFrom ?? "Chat-Net <noreply@chat-net.tech>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Passwort zurücksetzen – Chat-Net",
      html: resetHtml(resetUrl, logoUrl),
      text: `Chat-Net Passwort zurücksetzen\n\nLink: ${resetUrl}\n\nGültig 30 Minuten.`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[resend] HTTP ${res.status}: ${body}`);
    return { delivered: false, resetUrl };
  }

  const data = (await res.json()) as { id?: string };
  console.info(`[resend] Sent to ${input.to} id=${data.id}`);
  return { delivered: true, resetUrl };
}

async function sendViaSmtp(input: { to: string; token: string }): Promise<{ delivered: boolean; resetUrl: string }> {
  const resetUrl = buildResetUrl(input.token);

  if (!appConfig.smtpHost || !appConfig.smtpFrom) {
    console.info(`[auth] No mail provider. Reset link for ${input.to}: ${resetUrl}`);
    return { delivered: false, resetUrl };
  }

  // Dynamic import to avoid loading nodemailer when Resend is used
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: appConfig.smtpHost,
    port: appConfig.smtpPort,
    secure: appConfig.smtpSecure,
    auth: appConfig.smtpUser && appConfig.smtpPass
      ? { user: appConfig.smtpUser, pass: appConfig.smtpPass }
      : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  const logoUrl = `${appConfig.webAppUrl.replace(/\/$/, "")}/chat-net-logo.svg`;

  const result = await transporter.sendMail({
    from: appConfig.smtpFrom,
    to: input.to,
    subject: "Passwort zurücksetzen – Chat-Net",
    html: resetHtml(resetUrl, logoUrl),
    text: `Chat-Net Passwort zurücksetzen\n\nLink: ${resetUrl}\n\nGültig 30 Minuten.`,
  });

  console.info(`[smtp] Sent to ${input.to} messageId=${result.messageId}`);
  return { delivered: true, resetUrl };
}

/**
 * Sends a password reset e-mail.
 * Tries Resend first (RESEND_API_KEY), then SMTP, then logs the link.
 */
export async function sendPasswordResetEmail(
  input: { to: string; token: string }
): Promise<{ delivered: boolean; resetUrl: string }> {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(input);
  }
  return sendViaSmtp(input);
}
