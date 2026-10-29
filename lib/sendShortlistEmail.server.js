import "server-only";
import nodemailer from "nodemailer";
import { SITE } from "./site";

let transporter;
function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      pool: true,
      maxConnections: 3,
    });
  }
  return transporter;
}

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/**
 * Emails an applicant that they were shortlisted. Never includes the WhatsApp link:
 * that stays behind the /status lookup (SRN + email).
 * Returns { sent, reason? }. Throws on SMTP failure (caller catches; shortlisting must not fail).
 * @param {{id:string,name:string,email:string,domainName?:string,domainId:string,srn:string}} application
 */
export async function sendShortlistEmail(application) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "smtp-not-configured" };

  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://eclub-web.vercel.app"
  ).replace(/\/$/, "");
  const statusUrl = `${base}/status`;
  const domain = application.domainName || application.domainId;
  const subject = `You're shortlisted for ${domain} — ${SITE.shortName}`;

  const text = [
    `Hi ${application.name},`,
    ``,
    `Congratulations! You have been shortlisted for ${domain} at ${SITE.name}, ${SITE.campus}.`,
    ``,
    `Check your application status and next steps here (use your SRN and the email you applied with):`,
    statusUrl,
    ``,
    `— ${SITE.shortName} team`,
  ].join("\n");

  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;line-height:1.5">
<p>Hi ${esc(application.name)},</p>
<p>Congratulations! You have been shortlisted for <strong>${esc(domain)}</strong> at ${esc(SITE.name)}, ${esc(SITE.campus)}.</p>
<p>Check your application status and next steps (use your SRN and the email you applied with):</p>
<p><a href="${esc(statusUrl)}">${esc(statusUrl)}</a></p>
<p>— ${esc(SITE.shortName)} team</p></div>`;

  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: application.email,
    subject,
    text,
    html,
  });
  return { sent: true };
}
