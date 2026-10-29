'use strict';
// Portable, dependency-free presentation only. No I/O, credentials or delivery decisions.
const STATES = Object.freeze({
  site_failure: ['🚨', 'Site failure'], checker_error: ['🚨', 'Checker error'],
  review_needed: ['👀', 'Review needed'], no_change: ['✅', 'No change detected'],
  recovered: ['✅', 'Recovered'], unknown: ['⚪', 'Unknown'],
});
function scrubUrl(value) {
  try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.origin + u.pathname : '[unsupported link]'; }
  catch { return '[invalid link]'; }
}
function safeText(value, limit = 240) {
  let s = String(value ?? '').replace(/https?:\/\/[^\s<>]+/g, scrubUrl)
    .replace(/\bxox[baprs]-[A-Za-z0-9-]+\b/g, '[redacted]')
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/\b(password|secret|token|api[_ -]?key|authorization)\b\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
  s = s.replace(/\/(Users|private|tmp)\/[^\s,;]+/g, '[local path]');
  s = s.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (s.length > limit) s = s.slice(0, limit - 1) + '…';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const PT = new Intl.DateTimeFormat('en-US', {timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
const date = value => validTime(value) ? PT.format(new Date(value)) + ' PT' : null;
function displayStatus(model) {
  const code = model.status?.code;
  return Object.hasOwn(STATES, code) ? code : 'unknown';
}
function notificationTitle(model) {
  const code = displayStatus(model);
  return `${STATES[code][0]} ${safeText(model.client || 'Monitor', 50)} · ${safeText(model.check || 'Check', 70)}: ${STATES[code][1]}`;
}
// Slack layout: headline, plain summary, short bullets, next step. Same fields
// as before; only the presentation is meant for a quick read on a phone.
function renderNotification(model) {
  if (model.schemaVersion !== 1) throw new Error('Unsupported notification schema version');
  const code = displayStatus(model);
  const [icon, label] = STATES[code];
  const rows = Array.isArray(model.affectedChecks) ? model.affectedChecks : [];
  const affected = rows.slice(0, 8).map(a => {
    const ids = Array.isArray(a.caseIds) ? a.caseIds : [];
    const examples = ids.length ? ` (${ids.slice(0, 4).map(id => safeText(id, 70)).join(', ')}${ids.length > 4 ? `, +${ids.length - 4} more` : ''})` : '';
    const rowIcon = Object.hasOwn(STATES, a.status) ? STATES[a.status][0] : a.status === 'fail' ? '🚨' : '⚪';
    return `      ${rowIcon} ${safeText(a.check, 70)}: ${safeText(a.summary)}${examples}`;
  });
  if (rows.length > 8) affected.push(`      ◦ ${rows.length - 8} more; see details`);
  const coverage = model.coverage || {}, unknowns = Array.isArray(coverage.unknowns) ? coverage.unknowns : [];
  const unknownText = unknowns.slice(0, 6).map(u => safeText(u)).join('; ') + (unknowns.length > 6 ? `; ${unknowns.length - 6} more; see details` : '');
  const when = run => run ? date(run.finishedAt) || 'unknown' : 'unknown';
  const e = model.evidence || {};
  const evidence = e.published === true && /^https?:\/\//.test(e.url || '') ? scrubUrl(e.url) : e.description || 'Link/path unavailable.';
  const healthy = code === 'no_change' || code === 'recovered';
  // Scope fine print only matters when something needs attention.
  const checked = safeText(coverage.summary || 'Not measured or not recorded.', 700) +
    (coverage.limits && !healthy ? ` (${safeText(coverage.limits, 400)})` : '');
  const lines = [
    `${icon} *${safeText(model.client || 'Monitor', 50)} · ${safeText(model.check || 'Check', 70)}: ${label}*`,
    safeText(model.summary || 'No summary recorded.', 360),
    '',
  ];
  if (affected.length) lines.push('• *Affected:*', ...affected);
  else if (!healthy) lines.push('• *Affected:* unknown');
  lines.push(`• *Checked:* ${checked}`);
  if (unknownText) lines.push(`• *Not confirmed:* ${unknownText}`);
  const lastGood = model.lastSuccessfulRun || !healthy ? ` · last good run: ${when(model.lastSuccessfulRun)}` : '';
  lines.push(`• *Run:* ${when(model.currentRun)}${lastGood}`);
  lines.push(`• *Details:* ${safeText(evidence, 400)}`);
  lines.push('', `*Next step:* ${safeText(model.nextAction || 'Inspect missing evidence before drawing a conclusion.', 300)}`);
  return lines.join('\n');
}
module.exports = {renderNotification, notificationTitle, displayStatus, safeText};
