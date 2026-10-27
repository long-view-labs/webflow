'use strict';
// This sender is intentionally restricted to the owner's verified Slack identity.
// A GitHub runner needs its own approved Slack bot connection; the assistant's
// interactive connector is not available inside Actions. Never print the token.
const OWNER = 'U02V72HAFV4';
function requireConfig(env) {
  if (!env.SLACK_BOT_TOKEN) throw new Error('Missing SLACK_BOT_TOKEN: owner DM alerts are NOT configured');
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
async function sendOwnerDM(text, env = process.env, fetcher = fetch) {
  const token = await verifyConnection(env, fetcher);
  const dm = await slack('conversations.open', token, {users:OWNER,return_im:true}, fetcher);
  if (!/^D[A-Z0-9]+$/.test(dm.channel?.id || '') || (dm.channel.user && dm.channel.user !== OWNER)) throw new Error('Slack did not return the verified owner DM');
  const sent = await slack('chat.postMessage', token, {channel:dm.channel.id,text,unfurl_links:false,unfurl_media:false}, fetcher);
  if (!sent.ts || sent.channel !== dm.channel.id) throw new Error('Slack did not confirm message delivery to owner DM');
  return {channel:sent.channel,ts:sent.ts};
}
module.exports = { OWNER, requireConfig, verifyConnection, sendOwnerDM };
