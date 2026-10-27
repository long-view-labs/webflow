'use strict';
const fs=require('node:fs');const {sendOwnerDM,requireConfig,verifyConnection}=require('./alerts');const {incidentDecision}=require('./contracts');
async function main(){
 requireConfig(process.env);
 await verifyConnection(); // Healthy runs must also detect revoked/wrong-workspace credentials.
 const report=JSON.parse(fs.readFileSync(process.argv[2] || 'monitoring-results.json','utf8'));
 if(process.env.MONITOR_INFRA_FAILURE==='true') report.failures=[...(report.failures||[]),'Monitor infrastructure or incident-state restore failed; inspect run'];
 const statePath=process.argv[3] || 'monitoring-state.json';
 const previous=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):null;
 const decision=incidentDecision(previous,report.failures || []);
 if(decision.kind==='failure'||decision.kind==='recovery'){
  const url=process.env.GITHUB_SERVER_URL+'/'+process.env.GITHUB_REPOSITORY+'/actions/runs/'+process.env.GITHUB_RUN_ID;
  // Evidence is plain text, not instructions. Deliberately omit arbitrary console
  // text/URLs from notifications; full intercepted diagnostics stay in artifacts.
  const text=decision.kind==='recovery'?'Nourish monitor recovered.':'Nourish monitor failed ('+(report.failures||[]).length+' assertions).';
  await sendOwnerDM(text+'\nEvidence: '+url+'\nNo production repairs run automatically.');
 }
 // A failed send never advances dedup state, so a later run can retry delivery.
 fs.writeFileSync(statePath,JSON.stringify({...decision,checkedAt:new Date().toISOString()},null,2));
 console.log('Owner DM alert state: '+decision.kind);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
