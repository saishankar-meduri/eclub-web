export const YEARS = ["1", "2", "3", "4"];
export const BRANCHES = ["CSE", "CSE (AIML)", "ECE", "EEE", "ME", "Other"]; // edit to match your campus
export const SRN_RE = /^PES2UG\d{2}(CS|AM|EC)\d{3}$/;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const PHONE_RE = /^[0-9]{10}$/;
export const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;
export const WA_RE = /^https:\/\/(chat\.whatsapp\.com|wa\.me)\/\S+$/;
export const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
