// The visual/health engine is the Unify page checker (BackstopJS + Playwright),
// used as-is from its own checkout: same capture freeze, 2% change threshold,
// health rules and human-approved baselines. Nothing in that checkout is edited.
//
// Nourish runs a pinned copy, not the live checkout: on Oct 30 2026 the checker moved to an
// allowlist of Unify's hosts, which blocked www.nourish.com itself (0/86 captures) and counted
// nourish.com, OneTrust and the app hosts as analytics leaks, so the report would not publish.
// The pin is an export of checker commit 6ef138e (Oct 29) with its node_modules, under the
// git-ignored monitoring-local/. To move the pin, export a new commit there and update PINNED.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PINNED = '6ef138e';
export const PINNED_CHECKER_DIR = path.join(ROOT, 'monitoring-local', `page-checker-${PINNED}`);
export const CHECKER_DIR = process.env.NOURISH_PAGE_CHECKER_DIR
  || (fs.existsSync(PINNED_CHECKER_DIR) ? PINNED_CHECKER_DIR
    : path.join(os.homedir(), 'Documents/Codex/2026-10-27/task/unify-page-checker'));

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
