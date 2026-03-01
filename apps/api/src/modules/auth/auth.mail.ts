import nodemailer from "nodemailer";
import { appConfig } from "../../config.js";

let cachedTransporter: nodemailer.Transporter | null = null;

function buildResetUrl(token: string): string {
  const base = appConfig.webAppUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ mode: "reset", token });
  return `${base}/?${params.toString()}`;
}

function buildLogoUrl(): string {
  const base = appConfig.webAppUrl.replace(/\/$/, "");
  return `${base}/chat-net-logo.svg`;
}

function hasSmtpConfig(): boolean {
  return Boolean(appConfig.smtpHost && appConfig.smtpFrom);
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: appConfig.smtpHost,
    port: appConfig.smtpPort,
    secure: appConfig.smtpSecure,
    auth: appConfig.smtpUser && appConfig.smtpPass ? { user: appConfig.smtpUser, pass: appConfig.smtpPass } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000
  });

  return cachedTransporter;
}

export async function sendPasswordResetEmail(input: { to: string; token: string }) {
  const resetUrl = buildResetUrl(input.token);
  const logoUrl = buildLogoUrl();

  if (!hasSmtpConfig()) {
    console.info(`[auth] SMTP not configured. Password reset link for ${input.to}: ${resetUrl}`);
    return { delivered: false as const, resetUrl };
  }

  const transporter = getTransporter();

  const sendResult = await transporter.sendMail({
    from: appConfig.smtpFrom,
    replyTo: appConfig.smtpFrom,
    to: input.to,
    subject: "Passwort zurücksetzen – Chat-Net",
    text: `Chat-Net Passwort zurücksetzen\n\nDu hast ein Zurücksetzen deines Passworts angefordert.\n\nÖffne diesen persönlichen Link:\n${resetUrl}\n\nDer Link ist 30 Minuten gültig und kann nur einmal verwendet werden.\n\nFalls du das nicht warst, kannst du diese E-Mail ignorieren.`,
    html: `
      <div style="margin:0;padding:0;background:#0b0b0f;font-family:Inter,Segoe UI,Roboto,sans-serif;color:#ececf3;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0b0f;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:linear-gradient(180deg,#17181f 0%,#12131a 100%);border:1px solid #2f313d;border-radius:16px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.35);">
                <tr>
                  <td style="padding:26px 26px 12px 26px;text-align:center;">
                    <img src="${logoUrl}" alt="Chat-Net" width="78" height="78" style="display:block;margin:0 auto 10px auto;" />
                    <div style="font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:#9a9cad;">chat-net.tech</div>
                    <h1 style="margin:8px 0 0 0;font-size:28px;line-height:1.2;color:#f5f5fb;">Passwort zurücksetzen</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 26px 0 26px;color:#cbccd7;font-size:15px;line-height:1.6;">
                    Für dein Chat-Net Konto wurde ein Passwort-Reset angefordert.
                    Klicke auf den Button, um ein neues Passwort zu vergeben.
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 26px 8px 26px;text-align:center;">
                    <a href="${resetUrl}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:linear-gradient(135deg,#ff9f1a 0%,#ff4e70 45%,#b209b8 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">Neues Passwort festlegen</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 26px 0 26px;color:#a7a8b3;font-size:13px;line-height:1.6;">
                    Der Link ist <strong style="color:#e4e4ee;">30 Minuten</strong> gültig und kann nur einmal verwendet werden.
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 26px 0 26px;color:#8f91a1;font-size:12px;line-height:1.6;word-break:break-all;">
                    Falls der Button nicht funktioniert, nutze diesen Link:<br />
                    <a href="${resetUrl}" style="color:#c8b8ff;text-decoration:underline;">${resetUrl}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 26px 26px 26px;color:#7e8091;font-size:12px;line-height:1.6;">
                    Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail sicher ignorieren.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
  });

  return {
    delivered: true as const,
    resetUrl,
    messageId: sendResult.messageId,
    accepted: sendResult.accepted,
    rejected: sendResult.rejected
  };
}
