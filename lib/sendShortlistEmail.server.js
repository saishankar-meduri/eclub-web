import "server-only";

/**
 * ============================================================
 *  STUB — NOT IMPLEMENTED YET (planned for a later version)
 * ============================================================
 * Called from app/api/admin/applications/status/route.js after an application is
 * set to "shortlisted". Currently a deliberate no-op.
 *
 * @param {{id:string,name:string,email:string,domainId:string,srn:string}} application
 * TODO: pick provider (Resend / Nodemailer+SMTP), build template, include /status link.
 */
export async function sendShortlistEmail(application) {
  void application;
  return { sent: false, reason: "not-implemented" };
}
