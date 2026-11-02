export const YEARS = ["1", "2", "3", "4"];
export const BRANCHES = ["CSE", "CSE (AIML)", "ECE", "EEE", "ME", "Other"]; // edit to match your campus
export const SRN_RE = /^PES2UG\d{2}(CS|AM|EC)\d{3}$/;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const PHONE_RE = /^[0-9]{10}$/;
export const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;
export const WA_RE = /^https:\/\/(chat\.whatsapp\.com|wa\.me)\/\S+$/;
// Domain id of Social Media and Marketing. Its head (plus superadmins) may send marketing emails.
// Must match the document id in the `domains` collection.
export const MARKETING_DOMAIN_ID = "social-media-and-marketing";
// True for the Social Media and Marketing domain. Matches the canonical id, or any domain whose id/name
// mentions both "social" and "marketing" (so "social-media-marketing" or "Social Media & Marketing" also work).
export const isMarketingDomain = (id, name) => {
  if (id && id === MARKETING_DOMAIN_ID) return true;
  const s = `${id || ""} ${name || ""}`.toLowerCase();
  return s.includes("social") && s.includes("marketing");
};
export const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
