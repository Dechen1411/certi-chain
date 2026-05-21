const nodemailer = require("nodemailer");

const isSmtpConfigured = ({ host, user, pass }) => {
  return Boolean(host && user && pass);
};

const createSignupOtpSender = ({
  appName = "CertiChain",
  from,
  host,
  port,
  secure,
  user,
  pass,
  allowPreview,
}) => {
  const configured = isSmtpConfigured({ host, user, pass });
  const transporter = configured
    ? nodemailer.createTransport({
        host,
        port: Number(port || 587),
        secure: Boolean(secure),
        auth: { user, pass },
      })
    : null;

  return async ({
    email,
    name,
    otp,
    expiresInMinutes,
    subject,
    intro,
    ignoreText,
  }) => {
    if (!transporter) {
      if (allowPreview) {
        return { delivered: false, previewOtp: otp };
      }

      throw new Error("Email verification is not configured");
    }

    const emailSubject = subject || `${appName} verification code`;
    const introText = intro || `Your ${appName} verification code is`;
    const fallbackIgnoreText = ignoreText || "If you did not request this account, you can ignore this email.";

    await transporter.sendMail({
      from: from || `${appName} <${user}>`,
      to: email,
      subject: emailSubject,
      text: [
        `Hi ${name || "there"},`,
        "",
        `${introText} ${otp}.`,
        `It expires in ${expiresInMinutes} minutes.`,
        "",
        fallbackIgnoreText,
      ].join("\n"),
      html: `
        <div style="font-family: Inter, Arial, sans-serif; color: #101828; line-height: 1.5;">
          <p>Hi ${escapeHtml(name || "there")},</p>
          <p>${escapeHtml(introText)}:</p>
          <p style="font-size: 28px; font-weight: 800; letter-spacing: 6px; margin: 20px 0;">${escapeHtml(otp)}</p>
          <p>This code expires in ${escapeHtml(String(expiresInMinutes))} minutes.</p>
          <p style="color: #64748b;">${escapeHtml(fallbackIgnoreText)}</p>
        </div>
      `,
    });

    return { delivered: true };
  };
};

const escapeHtml = (value) => {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

module.exports = {
  createSignupOtpSender,
};
