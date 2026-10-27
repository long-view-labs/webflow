'use strict';
const fs=require('node:fs');const {staleFailures}=require('./contracts');
async function main(){
 const repo=process.env.GITHUB_REPOSITORY;if(!/^[\w.-]+\/[\w.-]+$/.test(repo||''))throw new Error('Missing repository');
 const response=await fetch('https://api.github.com/repos/'+repo+'/actions/workflows/synthetic-rudderstack.yml/runs?per_page=30',{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Cannot inspect monitor heartbeat: HTTP '+response.status);
 const data=await response.json();const failures=staleFailures(data.workflow_runs||[]);
 fs.writeFileSync('heartbeat-results.json',JSON.stringify({checkedAt:new Date().toISOString(),failures},null,2));
 if(failures.length)process.exitCode=1;
}
main().catch(e=>{fs.writeFileSync('heartbeat-results.json',JSON.stringify({failures:[e.message]},null,2));console.error(e.message);process.exitCode=1});
