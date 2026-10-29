// Daily coordinator (launchd runs this with node; launchd's bash can't read ~/Documents).
// Runs worker.mjs in its own process group with a hard timeout, keeps the last 30
// runs, publishes the report (only when the speed test proved it reached no analytics)
// and posts the compact summary through the shared sender in alerts.js, quiet on
// no-change days.
//   node monitoring/daily-report/daily.mjs            scheduled: at most one completed run per PT day
//   node monitoring/daily-report/daily.mjs --now      run regardless of today's run
//   --no-slack     skip the post (prints it, and whether it would have posted)
//   --no-publish   don't update nourish-visual-report.pages.dev
import fs from 'node:fs';
import path from 'node:path';
import {spawn, execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dailyNotification, renderDailyMessage, shouldPost, neededAttention} from './summary.mjs';
import {leakProof} from './performance.mjs';
import {checker} from './checker.mjs';
import {publish} from './publish.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const STORE = process.env.NOURISH_DAILY_DIR || path.join(REPO, 'monitoring-local/daily-report');
const RUNS = path.join(STORE, 'runs');
const STATE = path.join(STORE, 'state.json');
const TIMEOUT_MS = 120 * 60 * 1000; // 86 page states, repeat captures, nav + form checks, 86 Lighthouse loads
const RETAIN_RUNS = 30;
const RETAIN_BYTES = 2 * 1024 ** 3;

const args = new Set(process.argv.slice(2));
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), {recursive: true}); fs.writeFileSync(f + '.tmp', JSON.stringify(v, null, 2) + '\n'); fs.renameSync(f + '.tmp', f); };
const ptDate = (d = new Date()) => d.toLocaleString('en-CA', {timeZone: 'America/Los_Angeles'}).slice(0, 10);

function lock() {
  const file = path.join(STORE, 'daily.lock');
  fs.mkdirSync(STORE, {recursive: true});
  try { fs.writeFileSync(file, String(process.pid), {flag: 'wx'}); }
  catch {
    const pid = Number(fs.readFileSync(file, 'utf8'));
    try { process.kill(pid, 0); return null; } catch {} // still running: no overlapping run
    fs.writeFileSync(file, String(process.pid));
  }
  return () => fs.rmSync(file, {force: true});
}

function runWorker(runDir, previous) {
  return new Promise((resolve) => {
    const log = fs.openSync(path.join(runDir, 'worker.log'), 'w');
    const child = spawn(process.execPath, [path.join(HERE, 'worker.mjs'), runDir, ...(previous ? [previous] : [])],
      {cwd: REPO, stdio: ['ignore', log, log], detached: true});
    let timedOut = false;
    // Kill the whole group: the worker's browsers are its children.
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, TIMEOUT_MS);
    child.on('exit', (code) => { clearTimeout(timer); fs.closeSync(log); resolve({code: timedOut ? 124 : code, timedOut}); });
  });
}

function prune(keep) {
  const runs = fs.existsSync(RUNS) ? fs.readdirSync(RUNS).filter((d) => /^\d{4}-/.test(d)).sort().reverse() : [];
  let total = 0;
  runs.forEach((d, i) => {
    const dir = path.join(RUNS, d);
    if (dir === keep) return;
    const size = Number(execFileSync('/usr/bin/du', ['-sk', dir], {encoding: 'utf8'}).split('\t')[0]) * 1024;
    if (i >= RETAIN_RUNS || total + size > RETAIN_BYTES) fs.rmSync(dir, {recursive: true, force: true});
    else total += size;
  });
}

async function slackPost(text) {
  const token = (() => {
    try { return execFileSync('/usr/bin/security', ['find-generic-password', '-s', 'nourish-monitor-slack', '-w'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim() || null; }
    catch { return null; }
  })();
  if (!token) return 'skipped: no nourish-monitor-slack Keychain item';
  const {sendOwnerDM} = createRequire(import.meta.url)('../alerts.js');
  try { await sendOwnerDM(text, {SLACK_BOT_TOKEN: token}); return 'sent'; }
  catch (e) { return 'failed: ' + e.message; } // alerts.js never includes the token in errors
}

async function main() {
  const state = readJson(STATE) ?? {};
  if (!args.has('--now') && state.lastCompletedDate === ptDate()) { console.log('Already ran today'); return; }
  const release = lock();
  if (!release) { console.log('Another daily run is in progress'); return; }
  try {
    const started = new Date();
    const runDir = path.join(RUNS, started.toISOString().replace(/[:.]/g, '-'));
    fs.mkdirSync(runDir, {recursive: true});
    const previous = state.lastCompletedDirectory && fs.existsSync(path.join(state.lastCompletedDirectory, 'report.json')) ? state.lastCompletedDirectory : null;
    Object.assign(state, {status: 'running', startedAt: started.toISOString(), runDirectory: runDir, pid: process.pid});
    writeJson(STATE, state);

    const {code, timedOut} = await runWorker(runDir, previous);
    const report = readJson(path.join(runDir, 'report.json')) ?? {errors: ['worker wrote no report'], outcome: 'execution-error'};
    if (timedOut) (report.errors ??= []).push(`timed out after ${TIMEOUT_MS / 60000} minutes`);
    if (code !== 0 && !timedOut && report.outcome !== 'execution-error') (report.errors ??= []).push(`worker exited ${code}`);
    const completed = !!report.finishedAt && !timedOut && report.runs?.length > 0;
    if (completed) Object.assign(state, {lastCompletedDirectory: runDir, lastCompletedDate: ptDate(started)});

    const latest = path.join(STORE, 'latest');
    fs.rmSync(latest + '.tmp', {force: true});
    fs.symlinkSync(path.relative(STORE, runDir), latest + '.tmp');
    fs.renameSync(latest + '.tmp', latest);

    const {deriveIssues} = await checker('src/report-html.mjs');
    // Published copy (noindex, HTML/images only), and only when every Lighthouse load's network
    // log shows zero answered analytics requests; the message falls back to the local file otherwise.
    const proof = leakProof(report.performance);
    let link = path.join(latest, 'index.html');
    if (args.has('--no-publish')) state.published = {ok: false, detail: 'skipped: --no-publish'};
    else if (!proof.ok) state.published = {ok: false, detail: `not published: ${proof.reason}; see monitoring-local/daily-report/latest/index.html`};
    else {
      try { link = publish(runDir); state.published = {ok: true, url: link, at: new Date().toISOString()}; }
      catch (e) { state.published = {ok: false, detail: e.message.slice(0, 300)}; }
    }
    const model = dailyNotification(report, deriveIssues(report), {link, published: state.published.ok,
      publishError: state.published.ok || args.has('--no-publish') ? null : state.published.detail});
    const text = renderDailyMessage(model);
    // Quiet on a no-change day unless the previous run needed attention, so a problem is seen to clear once.
    const post = shouldPost(model, state.lastNotification?.neededAttention ?? null);
    let delivery;
    if (args.has('--no-slack')) { delivery = 'skipped: --no-slack'; console.log(text); console.log(post ? '[would post to Slack]' : '[would stay quiet: no change]'); }
    else if (!post) delivery = 'skipped: no change (the channel hears about problems and when one clears)';
    else delivery = await slackPost(text);
    state.lastNotification = {at: new Date().toISOString(), code: model.status.code, neededAttention: neededAttention(model), delivery};
    Object.assign(state, {status: completed ? 'completed' : 'failed', finishedAt: new Date().toISOString(), exitCode: code, outcome: report.outcome ?? null, delivery});
    writeJson(STATE, state);
    prune(runDir);
    console.log(`${state.finishedAt} ${state.status} ${state.outcome}; published ${state.published.ok ? 'yes' : state.published.detail}; slack ${delivery}`);
    if (!completed) process.exitCode = 2;
  } finally { release(); }
}

await main();
