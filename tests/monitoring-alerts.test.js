'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {OWNER,requireConfig,verifyConnection,sendOwnerDM}=require('../monitoring/alerts');
test('missing alert config is an explicit failure, never a silent skip',()=>assert.throws(()=>requireConfig({}),/NOT configured/));
test('only verified owner DM can receive messages, HTTP and Slack failures fail visibly',async()=>{
 let calls=[]; const mock=async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});return {ok:true,json:async()=>url.endsWith('auth.test')?{ok:true,bot_id:'BFIXTURE',url:'https://gemin.slack.com/'}:url.endsWith('conversations.open')?{ok:true,channel:{id:'DTEST',user:OWNER}}:{ok:true,channel:'DTEST',ts:'123'}}};
 assert.deepEqual(await sendOwnerDM('test',{SLACK_BOT_TOKEN:'fixture'},mock),{channel:'DTEST',ts:'123'});
 assert.equal(calls[1].body.users,OWNER);assert.equal(calls[2].body.channel,'DTEST');
 await assert.rejects(()=>sendOwnerDM('test',{SLACK_BOT_TOKEN:'fixture'},async()=>({ok:false,status:403})),/HTTP 403/);
 await assert.rejects(()=>sendOwnerDM('test',{SLACK_BOT_TOKEN:'fixture'},async()=>({ok:true,json:async()=>({ok:false,error:'missing_scope'})})),/missing_scope/);
 await assert.rejects(()=>sendOwnerDM('test',{SLACK_BOT_TOKEN:'fixture'},async(url)=>({ok:true,json:async()=>url.endsWith('auth.test')?{ok:true,bot_id:'BFIXTURE',url:'https://gemin.slack.com/'}:{ok:true,channel:{id:'CWRONG'}}})),/verified owner DM/);
});

test('healthy-run connection validation rejects revoked and wrong-workspace tokens without sending',async()=>{
 await assert.rejects(()=>verifyConnection({SLACK_BOT_TOKEN:'fixture'},async()=>({ok:true,json:async()=>({ok:true,bot_id:'BOTHER',url:'https://other.slack.com/'})})),/verified owner workspace/);
 await assert.rejects(()=>verifyConnection({SLACK_BOT_TOKEN:'fixture'},async()=>({ok:true,json:async()=>({ok:false,error:'token_revoked'})})),/token_revoked/);
});
