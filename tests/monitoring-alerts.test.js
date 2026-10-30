'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {CHANNEL,requireConfig,verifyConnection,sendOwnerDM}=require('../monitoring/alerts');
const identity={ok:true,bot_id:'BFIXTURE',url:'https://gemin.slack.com/'};
const response=body=>({ok:true,json:async()=>body});
test('missing alert config is an explicit failure, never a silent skip',()=>assert.throws(()=>requireConfig({}),/NOT configured/));
test('hourly failure, recovery and daily messages use only the approved Nourish channel',async()=>{
 assert.equal(CHANNEL,'C0CCQNCRYG6');
 for (const text of ['Nourish tracking monitor: 1 failure(s)','Nourish tracking monitor recovered','Nourish daily report']) {
  const calls=[];
  const mock=async(url,opts)=>{
   calls.push({url,body:JSON.parse(opts.body)});
   return response(url.endsWith('auth.test')?identity:{ok:true,channel:CHANNEL,ts:'123'});
  };
  assert.deepEqual(await sendOwnerDM(text,{SLACK_BOT_TOKEN:'fixture',SLACK_CHANNEL:'COTHER'},mock),{channel:CHANNEL,ts:'123'});
  assert.deepEqual(calls.map(c=>c.url),['https://slack.com/api/auth.test','https://slack.com/api/chat.postMessage']);
  assert.deepEqual(calls[1].body,{channel:CHANNEL,text,unfurl_links:false,unfurl_media:false});
 }
});
test('HTTP, Slack rejection and unconfirmed delivery fail visibly without a fallback destination',async()=>{
 for (const [reply,pattern] of [
  [{ok:false,status:403},/HTTP 403/],
  [response({ok:false,error:'missing_scope'}),/missing_scope/],
  [response({ok:false,error:'not_in_channel'}),/not_in_channel/],
  [response({ok:true,channel:'CWRONG',ts:'123'}),/approved Nourish channel/],
  [response({ok:true,channel:CHANNEL}),/approved Nourish channel/],
 ]) {
  const calls=[];
  const mock=async url=>{calls.push(url);return url.endsWith('auth.test')?response(identity):reply;};
  await assert.rejects(()=>sendOwnerDM('test',{SLACK_BOT_TOKEN:'fixture'},mock),pattern);
  assert.equal(calls.length,2);
 }
});
test('wrong-workspace, non-bot and revoked tokens cannot send',async()=>{
 for (const [auth,pattern] of [
  [{ok:true,bot_id:'BOTHER',url:'https://other.slack.com/'},/verified owner workspace/],
  [{ok:true,url:'https://gemin.slack.com/'},/verified owner workspace/],
  [{ok:false,error:'token_revoked'},/token_revoked/],
 ]) {
  const calls=[];
  const mock=async url=>{calls.push(url);return response(auth);};
  await assert.rejects(()=>sendOwnerDM('test',{SLACK_BOT_TOKEN:'fixture'},mock),pattern);
  assert.deepEqual(calls,['https://slack.com/api/auth.test']);
 }
});
test('healthy-run validation still rejects revoked and wrong-workspace tokens',async()=>{
 await assert.rejects(()=>verifyConnection({SLACK_BOT_TOKEN:'fixture'},async()=>response({ok:true,bot_id:'BOTHER',url:'https://other.slack.com/'})),/verified owner workspace/);
 await assert.rejects(()=>verifyConnection({SLACK_BOT_TOKEN:'fixture'},async()=>response({ok:false,error:'token_revoked'})),/token_revoked/);
});
