// The visual/health engine is the Unify page checker (BackstopJS + Playwright),
// used as-is from its own checkout: same capture freeze, 2% change threshold,
// health rules and human-approved baselines. Nothing in that checkout is edited.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';

export const CHECKER_DIR = process.env.NOURISH_PAGE_CHECKER_DIR
  || path.join(os.homedir(), 'Documents/Codex/2026-10-27/task/unify-page-checker');

export async function checker(module) {
  const file = path.join(CHECKER_DIR, module);
  if (!fs.existsSync(file)) throw new Error(`Page checker module missing: ${module} (set NOURISH_PAGE_CHECKER_DIR)`);
  return import(pathToFileURL(file).href);
}

// Performance, SEO/AEO, GA4 and GSC lines are shared with Unify's daily DM and live
// in the site-audit tool (src/daily/), next to the weekly audit they summarize.
export const SITE_AUDIT_DIR = process.env.SITE_AUDIT_DIR || path.join(os.homedir(), 'Documents/Github-Webflow/site-audit');
export async function siteAudit(module) {
  const file = path.join(SITE_AUDIT_DIR, module);
  if (!fs.existsSync(file)) throw new Error(`site-audit module missing: ${module} (set SITE_AUDIT_DIR)`);
  return import(pathToFileURL(file).href);
}
