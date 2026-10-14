// Turns what the probe saw into the one name that gets saved: an app name
// ("Visual Studio Code") or, for browsers, just the site ("YouTube").
//
// It's strict on purpose: a site is only recognised from a known list or a
// domain-looking word ("example.com"). Anything else becomes "Other websites",
// so a page or video title can never end up in the database.

import { BROWSERS } from "./probe";

export type Activity = { kind: "app" | "site"; name: string };

/** Popular sites, keyed by how they appear (lowercase) at the end of a tab title. */
const KNOWN_SITES: Record<string, string> = {
  youtube: "YouTube",
  "youtube music": "YouTube Music",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X (Twitter)",
  twitter: "X (Twitter)",
  reddit: "Reddit",
  tiktok: "TikTok",
  netflix: "Netflix",
  "prime video": "Prime Video",
  twitch: "Twitch",
  discord: "Discord",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  spotify: "Spotify",
  gmail: "Gmail",
  outlook: "Outlook",
  "google docs": "Google Docs",
  "google sheets": "Google Sheets",
  "google slides": "Google Slides",
  "google drive": "Google Drive",
  "google search": "Google Search",
  "google calendar": "Google Calendar",
  "google meet": "Google Meet",
  github: "GitHub",
  "stack overflow": "Stack Overflow",
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  notion: "Notion",
  figma: "Figma",
  canva: "Canva",
  wikipedia: "Wikipedia",
  medium: "Medium",
  coursera: "Coursera",
  udemy: "Udemy",
  "khan academy": "Khan Academy",
  duolingo: "Duolingo",
  leetcode: "LeetCode",
  "mdn web docs": "MDN Web Docs",
  amazon: "Amazon",
  flipkart: "Flipkart",
  upwork: "Upwork",
  fiverr: "Fiverr",
  vercel: "Vercel",
};

/** Window titles end with the browser's name, e.g. "... - Google Chrome". */
const BROWSER_SUFFIX =
  /\s*[-–—]\s*(google chrome|microsoft​?\s*edge|mozilla firefox|firefox|brave|opera|vivaldi|arc)\s*$/i;

/** Edge adds e.g. " - Personal" (the profile) and " and 3 more pages". */
const EDGE_EXTRAS = /\s+and \d+ more pages?|\s*[-–—]\s*(personal|work|profile \d+)\s*$/gi;

const DOMAIN = /^(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})$/i;

/** Names a tick: the app, or for a browser, the site in the active tab. */
export function activityFor(processName: string, appDescription: string, title: string): Activity {
  if (BROWSERS.includes(processName.toLowerCase())) return { kind: "site", name: siteFromTitle(title) };
  return { kind: "app", name: appName(processName, appDescription) };
}

/** A readable app name: the program's description if it has a sensible one. */
export function appName(processName: string, description: string): string {
  const desc = description.trim();
  if (desc && desc.length <= 40) return desc;
  return processName || "Unknown app";
}

/** Just the site from a browser tab title, e.g. "Lo-fi beats - YouTube - Google Chrome" → "YouTube". */
export function siteFromTitle(title: string): string {
  const cleaned = title.replace(BROWSER_SUFFIX, "").replace(EDGE_EXTRAS, "").trim();
  if (!cleaned || /^new tab$/i.test(cleaned)) return "New tab";

  // Sites usually put their name last: "Page - Site", "Page | Site", "Home / X".
  const parts = cleaned.split(/\s+[-–—|·•/]\s+/).map((p) => p.trim().toLowerCase());
  for (const part of [...parts].reverse().slice(0, 2)) {
    if (KNOWN_SITES[part]) return KNOWN_SITES[part];
    const domain = part.match(DOMAIN);
    if (domain) return domain[1].toLowerCase();
  }
  // Some sites put their name first: "YouTube - Broadcast Yourself".
  if (KNOWN_SITES[parts[0]]) return KNOWN_SITES[parts[0]];
  return "Other websites";
}
