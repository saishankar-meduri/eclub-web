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

const siteBase = () =>
  (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://eclub-web.vercel.app"
  ).replace(/\/$/, "");

const when = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "";

/**
 * kind: "received" (paid event, receipt awaiting verification) | "confirmed" | "rejected"
 * reg:   { name, email, team_name? }
 * event: { title, date?: Date, venue? }
 * Returns { sent:false } if SMTP is not configured; throws on SMTP failure (callers catch).
 */
export async function sendEventEmail(kind, reg, event) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "smtp-not-configured" };

  const url = `${siteBase()}/registration-status`;
  const title = event.title;
  const details = [
    event.date ? `When: ${when(event.date)}` : null,
    event.venue ? `Where: ${event.venue}` : null,
    reg.team_name ? `Team: ${reg.team_name}` : null,
  ].filter(Boolean);

  let subject;
  let body;
  if (kind === "received") {
    subject = `Registration received: ${title}`;
    body = [
      `We've received your registration and payment receipt for ${title}.`,
      `Our team will verify the receipt and email you once your registration is confirmed.`,
      ...details,
    ];
  } else if (kind === "confirmed") {
    subject = `You're registered: ${title}`;
    body = [`Your registration for ${title} is confirmed.`, ...details, `Carry your college ID for check-in on the day.`];
  } else {
    subject = `Action needed: ${title} registration`;
    body = [
      `We couldn't verify the payment receipt you submitted for ${title}.`,
      `Please register again with a clear screenshot of the receipt showing all details, or reply to this email if you think this is a mistake.`,
    ];
  }

  const text = [`Hi ${reg.name},`, "", ...body, "", `Check your registration status: ${url}`, "", `— ${SITE.shortName} team`].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;line-height:1.5">
<p>Hi ${esc(reg.name)},</p>
${body.map((l) => `<p>${esc(l)}</p>`).join("\n")}
<p>Check your registration status: <a href="${esc(url)}">${esc(url)}</a></p>
<p>— ${esc(SITE.shortName)} team</p></div>`;

  await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: reg.email, subject, text, html });
  return { sent: true };
}
