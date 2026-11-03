import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {evaluate} from '../evals/score.mjs';
import {validatePolicy} from '../dist/engine.mjs';
const option=(key,fallback)=>{const i=process.argv.indexOf('--'+key);return i>=0?process.argv[i+1]:fallback;};
const policy=validatePolicy(JSON.parse(await readFile(option('policy','agent/policy.json'),'utf8')));
const taskSource=await readFile('evals/tasks.json','utf8'),tasks=JSON.parse(taskSource);
const result=evaluate(policy,tasks),output=resolve(option('output','runs/private/offline-check'));
await mkdir(output,{recursive:true});
await writeFile(output+'/score.json',JSON.stringify({...result,mode:'offline-engine-evaluation',trueforgeSession:null,fixtureSha256:createHash('sha256').update(taskSource).digest('hex'),policy},null,2));
// The improvement input intentionally excludes holdout ids, traces and scores.
await writeFile(output+'/development.json',JSON.stringify({policy,score:result.developmentScore,cases:result.results.filter(r=>!r.holdout).map(r=>({...r,actions:tasks.find(t=>t.id===r.id).actions}))},null,2));
console.log(JSON.stringify({mode:'offline-engine-evaluation',score:result.score,development:result.developmentScore,holdout:result.holdoutScore,output},null,2));
