import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {prepareAgent,ROOT} from './trueforge.mjs';
import {validatePolicy,MAP,ENTRY,RELIC,runActions} from '../dist/engine.mjs';
import {SCORING_RULE} from '../evals/score.mjs';
const source=await readFile(join(ROOT,'evals/tasks.json'),'utf8'),tasks=JSON.parse(source);
const {tf,spec,skill}=await prepareAgent();
const {data:session}=await tf.sessions.create({agent:{spec},metadata:{purpose:'blackthorn-fixed-evaluation',skill_ref:process.env.SKILL_GIT_REF}});
const runId=new Date().toISOString().replace(/[:.]/g,'-'),dir=join(ROOT,'runs/private','tf-'+runId);
await mkdir(dir,{recursive:true});
const results=[],allEvents=[];
for(const task of tasks){
 // Deliberately omit task id, split, action trace and future thief positions.
 const prompt=`EVALUATE_POLICY. Load blackthorn-warden. Choose a policy for a new heist. All thieves start at ${JSON.stringify(ENTRY)} and seek the emerald at ${JSON.stringify(RELIC)}, then escape. The keeper starts at pixel (480,282). This is a 60Hz real-time platformer with 16px tiles. Patrol waypoints must have x integer 2–61 and y=18. The upper floor spans pixel x224–800 at y176; the player can jump and sprint. You do not know this thief's route. Map:\n${MAP.join('\n')}\nReturn only the policy JSON, following your skill.`;
 let reply='',complete=false;const events=[];
 try{
  const stream=await tf.sessions.createTurnStream(session.id,{input:[{type:'user.message',content:prompt}],previousTurnId:'none'},{maxRetries:0});
  for await(const {data:e} of stream.withMetadata()){
   events.push(e);
   if(e.type==='turn.done'){
    if(e.state.status!=='done')throw Error('Turn did not complete: '+e.state.status);
    const c=e.state.output?.content;reply=typeof c==='string'?c:(c||[]).map(p=>p.text||'').join('');complete=true;
   }
  }
  if(!complete)throw Error('Incomplete stream');
  const policy=validatePolicy(JSON.parse(reply.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')));
  const game=runActions(policy,task.actions);
  if(game.status==='playing')throw Error(`Fixture ${task.id} ended unresolved.`);
  results.push({id:task.id,holdout:task.holdout,policy,outcome:game.status,stopped:game.status==='caught',turns:game.turn});
 }catch(e){results.push({id:task.id,holdout:task.holdout,error:e.message,stopped:null});}
 allEvents.push({taskId:task.id,reply,events});
 // Save incrementally so a partial or failed evaluation remains visible.
 await writeFile(join(dir,'events.json'),JSON.stringify({sessionId:session.id,tasks:allEvents},null,2));
}
// A run with any failed decision has no score: it must never be compared against a valid run.
const valid=results.every(r=>!r.error),score=rows=>valid&&rows.length?100*rows.filter(r=>r.stopped).length/rows.length:null;
let commit='uncommitted';try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();}catch{}
const evidence={valid,errors:results.filter(r=>r.error).length,scoringRule:SCORING_RULE,mode:'trueforge-policy-evaluation',sessionId:session.id,model:process.env.TF_MODEL,skillRef:process.env.SKILL_GIT_REF,sourceCommit:commit,fixtureSha256:createHash('sha256').update(source).digest('hex'),skillSha256:createHash('sha256').update(skill).digest('hex'),score:score(results),developmentScore:score(results.filter(r=>!r.holdout)),holdoutScore:score(results.filter(r=>r.holdout)),results};
await writeFile(join(dir,'score.json'),JSON.stringify(evidence,null,2));
await writeFile(join(dir,'development.json'),JSON.stringify({policy:results.find(r=>!r.holdout&&r.policy)?.policy,score:evidence.developmentScore,cases:results.filter(r=>!r.holdout).map(r=>({...r,actions:tasks.find(t=>t.id===r.id).actions}))},null,2));
console.log(JSON.stringify({sessionId:session.id,score:evidence.score,development:evidence.developmentScore,holdout:evidence.holdoutScore,evidenceDirectory:dir},null,2));
