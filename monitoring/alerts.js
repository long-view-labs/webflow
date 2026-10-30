'use strict';
// Nourish alerts go only to the approved channel in the verified owner workspace.
// A GitHub runner needs its own approved Slack bot connection; the assistant's
// interactive connector is not available inside Actions. Never print the token.
const OWNER = 'U02V72HAFV4'; // Retained for compatibility with existing callers.
const CHANNEL = 'C0CCQNCRYG6'; // #nourish-web-alerts
function requireConfig(env) {
  if (!env.SLACK_BOT_TOKEN) throw new Error('Missing SLACK_BOT_TOKEN: Nourish channel alerts are NOT configured');
  return env.SLACK_BOT_TOKEN;
}
async function slack(method, token, payload, fetcher) {
  const response = await fetcher('https://slack.com/api/' + method, {
    method:'POST', headers:{Authorization:'Bearer '+token,'Content-Type':'application/json; charset=utf-8'},
    body:JSON.stringify(payload), signal:AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Slack ' + method + ' HTTP ' + response.status);
  const body = await response.json();
  if (!body.ok) throw new Error('Slack ' + method + ' rejected the request: ' + (body.error || 'unknown error'));
  return body;
}
async function verifyConnection(env = process.env, fetcher = fetch) {
  const token = requireConfig(env);
  const identity = await slack('auth.test', token, {}, fetcher);
  if (!identity.bot_id || new URL(identity.url || 'https://invalid').hostname !== 'gemin.slack.com') throw new Error('Slack connection is not a bot in the verified owner workspace');
  return token;
}
// Keep the existing function name so hourly, recovery and daily callers share routing.
async function sendOwnerDM(text, env = process.env, fetcher = fetch) {
  const token = await verifyConnection(env, fetcher);
  const sent = await slack('chat.postMessage', token, {channel:CHANNEL,text,unfurl_links:false,unfurl_media:false}, fetcher);
  if (!sent.ts || sent.channel !== CHANNEL) throw new Error('Slack did not confirm message delivery to the approved Nourish channel');
  return {channel:sent.channel,ts:sent.ts};
}
module.exports = { OWNER, CHANNEL, requireConfig, verifyConnection, sendOwnerDM };
