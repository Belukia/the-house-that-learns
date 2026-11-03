import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,step,summarize,validateEpisode,replayEpisode,DEFAULT_POLICY,EPISODE_LIMITS} from '../dist/engine.mjs';
import {evaluate} from '../evals/score.mjs';
import {createServer} from '../server.mjs';
const tasks=JSON.parse(readFileSync(new URL('../evals/tasks.json',import.meta.url),'utf8'));
// A realistic live night: wander for most of the 90s clock with frequent input changes.
function liveNight(){const s=createGame(DEFAULT_POLICY);for(let i=0;s.status==='playing';i++)step(s,{left:(i%150)>=75,right:(i%150)<75,jump:i%40===0,sprint:i%300<30});return s;}
// Controlled stand-in for TrueForge. It is test plumbing, never learning evidence.
async function withServer(improve,fn){const server=createServer({improve,configured:()=>true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;try{await fn(base);}finally{server.close();}}
const post=(base,body)=>fetch(base+'/api/learn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('a full-length live episode passes /api/learn and reaches the adapter replay-verified',async()=>{
 const s=liveNight(),episode=summarize(s);
 assert.ok(s.turn>60*80,'night should run most of the clock');assert.ok(episode.actions.length>100);assert.ok(episode.route.length<=EPISODE_LIMITS.maxRoute);
 assert.ok(JSON.stringify({episode,policy:DEFAULT_POLICY}).length<EPISODE_LIMITS.maxBytes);
 let seen;await withServer(async(ep,policy)=>{seen={ep,policy};return {policy,sessionId:'test-adapter'};},async base=>{
  const r=await post(base,{episode,policy:DEFAULT_POLICY});assert.equal(r.status,200);assert.deepEqual(await r.json(),{policy:DEFAULT_POLICY,sessionId:'test-adapter',status:'candidate'});
 });
 assert.equal(seen.ep.outcome,s.status);assert.equal(seen.ep.turns,s.turn);
});
test('a forged outcome is rejected before any model call',async()=>{
 const episode={...summarize(liveNight()),outcome:'escaped'};let called=false;
 await withServer(async()=>{called=true;},async base=>{const r=await post(base,{episode,policy:DEFAULT_POLICY});assert.equal(r.status,400);assert.match((await r.json()).error,/replay/);});
 assert.equal(called,false);
});
test('episode validation rejects unknown inputs and oversize traces',()=>{
 const ok=summarize(liveNight());
 assert.throws(()=>validateEpisode({...ok,actions:[{frames:5,input:{teleport:true}}]}));
 assert.throws(()=>validateEpisode({...ok,actions:[{frames:EPISODE_LIMITS.maxFrames+1,input:{}}]}));
 assert.throws(()=>validateEpisode({...ok,route:Array(EPISODE_LIMITS.maxRoute+1).fill({x:1,y:1})}));
});
test('an abandoned heist replays as unresolved and courtesy escapes replay exactly',()=>{
 const s=createGame(DEFAULT_POLICY);for(let i=0;i<300;i++)step(s,{right:true});s.status='abandoned';
 assert.equal(replayEpisode(DEFAULT_POLICY,validateEpisode(summarize(s))).outcome,'abandoned');
 const c=createGame(DEFAULT_POLICY,{tutorial:true});for(const a of tasks[0].actions)for(let n=0;n<a.frames;n++)step(c,a.input);
 assert.equal(replayEpisode(DEFAULT_POLICY,validateEpisode(summarize(c))).outcome,'escaped');
});
test('frozen rule: fixtures escape before dawn and an unresolved timeline aborts scoring',()=>{
 for(const t of tasks){const s=createGame(DEFAULT_POLICY,{tutorial:true});for(const a of t.actions)for(let n=0;n<a.frames;n++)step(s,a.input);assert.equal(s.status,'escaped',t.id);assert.ok(s.turn<90*60,t.id);}
 assert.throws(()=>evaluate(DEFAULT_POLICY,[{id:'cut-short',holdout:false,actions:[{frames:30,input:{right:true}}]}]),/unresolved/);
});
