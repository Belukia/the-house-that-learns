// Usage: node evals/v2/generator/build-r2b.mjs evals/v2/R2 /tmp/R2b-check   (then compare with evals/v2/R2b/SHA256SUMS.txt)
// Round 2b: the 4 round-2 holdout heists were used up in runs 01-03, so they join development,
// and 4 fresh holdout heists are generated (same scripted families, a new seed range) and frozen before run 04.
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FAMILIES,record,rng} from './thieves.mjs';
import {createGame,step,DEFAULT_POLICY} from '../../../dist/engine.mjs';
// The exit a trace really uses, replayed with the keeper asleep.
const exitOf=actions=>{const s=createGame({...DEFAULT_POLICY,dwell:0},{round:2,tutorial:true});for(const a of actions)for(let i=0;i<a.frames&&s.status==='playing';i++)step(s,a.input);return s.message.includes('window')?'window':'door';};
const WANT={groundDoor:'door',upperWindow:'window',feintDoorWindow:'window',feintVaultDoor:'door'};
const [src,out]=process.argv.slice(2);
mkdirSync(out,{recursive:true});
const sums=[],seen=new Set();
const r2=readdirSync(src).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(readFileSync(`${src}/${f}`,'utf8')));
for(const t of r2)seen.add(JSON.stringify(t.actions));
const write=(task,seconds)=>{const text=JSON.stringify(task,null,2)+'\n';writeFileSync(`${out}/${task.id}.json`,text);
 sums.push(`${createHash('sha256').update(text).digest('hex')}  R2b/${task.id}.json  ${task.title}${seconds?` ${seconds}s`:''}`);};
r2.forEach((t,i)=>write({...t,id:`r2b-${String(i+1).padStart(2,'0')}`,title:`${t.title.replace(' (holdout)','')} · exits by the ${exitOf(t.actions)}`,holdout:false,from:t.id}));
['groundDoor','upperWindow','feintDoorWindow','feintVaultDoor'].forEach((fam,j)=>{
 let k=0,res,family;
 for(;k<50;k++){const r=rng(950000+2000+j*37+k*7919);({family}=FAMILIES[fam](r));const {script}=FAMILIES[fam](rng(950000+2000+j*37+k*7919));res=record(script,2);if(!seen.has(JSON.stringify(res.actions))&&exitOf(res.actions)===WANT[fam])break;}
 if(k>=50)throw Error('no fresh '+fam);
 seen.add(JSON.stringify(res.actions));
 write({id:`r2b-${11+j}`,title:`${family} · exits by the ${WANT[fam]} (holdout)`,holdout:true,engine:'realtime-platformer-v3',round:2,actions:res.actions},res.seconds);
});
writeFileSync(`${out}/SHA256SUMS.txt`,sums.join('\n')+'\n');console.log(sums.join('\n'));
