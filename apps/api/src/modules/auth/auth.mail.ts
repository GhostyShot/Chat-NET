import nodemailer from "nodemailer";
import { appConfig } from "../../config.js";

function buildResetUrl(token: string): string {
  const base = appConfig.webAppUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ mode: "reset", token });
  return `${base}/?${params.toString()}`;
}

function hasSmtpConfig(): boolean {
  return Boolean(appConfig.smtpHost && appConfig.smtpFrom);
}

export async function sendPasswordResetEmail(input: { to: string; token: string }) {
  const resetUrl = buildResetUrl(input.token);

  if (!hasSmtpConfig()) {
    console.info(`[auth] SMTP not configured. Password reset link for ${input.to}: ${resetUrl}`);
    return { delivered: false as const, resetUrl };
  }

  const transporter = nodemailer.createTransport({
    host: appConfig.smtpHost,
    port: appConfig.smtpPort,
    secure: appConfig.smtpSecure,
    auth: appConfig.smtpUser && appConfig.smtpPass ? { user: appConfig.smtpUser, pass: appConfig.smtpPass } : undefined
  });

  await transporter.sendMail({
    from: appConfig.smtpFrom,
    to: input.to,
    subject: "Passwort zurücksetzen – Chat-Net",
    text: `Hallo,\n\nklicke auf diesen Link, um dein Passwort zurückzusetzen:\n${resetUrl}\n\nDer Link ist 30 Minuten gültig.\n\nFalls du das nicht angefordert hast, ignoriere diese E-Mail.`,
    html: `<p>Hallo,</p><p>klicke auf diesen Link, um dein Passwort zurückzusetzen:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Der Link ist <strong>30 Minuten</strong> gültig.</p><p>Falls du das nicht angefordert hast, ignoriere diese E-Mail.</p>`
  });

  return { delivered: true as const, resetUrl };
}
