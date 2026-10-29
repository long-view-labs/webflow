// Publish the latest report to Cloudflare Pages (nourish-web-report.pages.dev),
// noindex like the Unify report. Only HTML and images go out: run JSON, logs and
// configs carry local paths. Traffic/conversion numbers and charts (between the
// analytics markers render.mjs writes) are removed unless site-audit's
// config/daily.json sets nourish.publishAnalytics: the URL has no login.
// Uses the operator's existing wrangler login.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const STORE = process.env.NOURISH_DAILY_DIR || path.join(REPO, 'monitoring-local/daily-report');
export const PROJECT = 'nourish-web-report';
// The report's first home (Oct 27–29 2026); it now only redirects here (see README).
export const OLD_PROJECT = 'nourish-visual-report';
export const REPORT_URL = `https://${PROJECT}.pages.dev/`;
const PUBLISHABLE = /\.(html|css|png|jpe?g|webp|gif|svg)$/i;

const START = '<!--analytics:start-->', END = '<!--analytics:end-->';
// The first removed block says where the numbers are; later ones (one per page card) leave nothing.
export function stripAnalytics(html) {
  return html.split(START).map((part, i) => (i === 0 ? part : part.includes(END) ? (i === 1 ? '<p class="muted">Traffic and conversion numbers are in the local copy of this report and the Slack DM.</p>' : '') + part.slice(part.indexOf(END) + END.length) : '')).join('');
}

function publishAnalytics() {
  const file = path.join(process.env.SITE_AUDIT_DIR || path.join(os.homedir(), 'Documents/Github-Webflow/site-audit'), 'config/daily.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')).nourish?.publishAnalytics === true; } catch { return false; }
}

export function stage(src, out, {keepAnalytics = false} = {}) {
  fs.rmSync(out, {recursive: true, force: true});
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const from = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(from);
      else if (entry.isFile() && PUBLISHABLE.test(entry.name)) {
        const to = path.join(out, path.relative(src, from));
        fs.mkdirSync(path.dirname(to), {recursive: true});
        if (/\.html$/i.test(entry.name) && !keepAnalytics) fs.writeFileSync(to, stripAnalytics(fs.readFileSync(from, 'utf8')));
        else fs.copyFileSync(from, to);
      }
    }
  };
  walk(src);
  fs.writeFileSync(path.join(out, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-cache\n');
  fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  const leaks = [];
  const scan = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(p);
      else if (/\.html$/.test(entry.name)) {
        const html = fs.readFileSync(p, 'utf8');
        // A stray start marker means the strip failed: refuse rather than publish numbers.
        if (html.includes('/Users/') || (!keepAnalytics && html.includes(START))) leaks.push(path.relative(out, p));
      }
    }
  };
  scan(out);
  if (leaks.length) throw new Error('Refusing to publish: local paths or analytics numbers in ' + leaks.slice(0, 3).join(', '));
  return out;
}

function deploy(dir, project) {
  const npx = ['/opt/homebrew/bin/npx', '/usr/local/bin/npx', path.join(path.dirname(process.execPath), 'npx')].find((p) => fs.existsSync(p));
  if (!npx) throw new Error('npx not found');
  const r = spawnSync(npx, ['-y', 'wrangler@3', 'pages', 'deploy', dir, '--project-name', project, '--branch', 'main', '--commit-dirty=true'], {
    cwd: os.tmpdir(), encoding: 'utf8', timeout: 5 * 60 * 1000,
    env: {...process.env, PATH: [path.dirname(process.execPath), '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'].join(':')},
  });
  if (r.status !== 0) throw new Error('wrangler deploy failed: ' + String((r.stderr || '') + (r.stdout || '') || r.error?.message).trim().slice(-300));
}

export function publish(runDir = path.join(STORE, 'latest')) {
  deploy(stage(fs.realpathSync(runDir), path.join(STORE, 'publish'), {keepAnalytics: publishAnalytics()}), PROJECT);
  return REPORT_URL;
}

// The old address keeps working for links already in Slack: every path 301s to the same path on
// the new site, and none of the old report's pages or screenshots stay up there.
export function stageRedirect(out) {
  fs.rmSync(out, {recursive: true, force: true});
  fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, '_redirects'), `/* ${REPORT_URL}:splat 301\n`);
  fs.writeFileSync(path.join(out, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n');
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=${REPORT_URL}"><title>Moved</title><p>The Nourish daily report moved to <a href="${REPORT_URL}">${REPORT_URL}</a>.</p>\n`);
  return out;
}
export function publishRedirect() {
  deploy(stageRedirect(path.join(STORE, 'publish-redirect')), OLD_PROJECT);
  return `https://${OLD_PROJECT}.pages.dev/ → ${REPORT_URL}`;
}

//   node monitoring/daily-report/publish.mjs [runDir]      publish a run (default: latest)
//   node monitoring/daily-report/publish.mjs --redirect-old point the old address at this one
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(process.argv[2] === '--redirect-old' ? publishRedirect() : publish(process.argv[2]));
