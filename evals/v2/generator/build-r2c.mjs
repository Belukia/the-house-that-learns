// Usage: node evals/v2/generator/build-r2c.mjs evals/v2/R2b evals/v2/R2c
// Round 2c (8 Nov): a confirmation round. Same 10 development heists as round 2b, and 4 FRESH holdout heists the agent
// has never seen (same scripted families, a new seed range, none equal to any heist of rounds 2 or 2b).
// It exists to check whether 85.71 (round 2b, Skill 5bf0891) holds on thieves the agent never met. No improve step runs here.
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FAMILIES,record,rng} from './thieves.mjs';
import {createGame,step,DEFAULT_POLICY} from '../../../dist/engine.mjs';
const exitOf=actions=>{const s=createGame({...DEFAULT_POLICY,dwell:0},{round:2,tutorial:true});for(const a of actions)for(let i=0;i<a.frames&&s.status==='playing';i++)step(s,a.input);return s.message.includes('window')?'window':'door';};
const WANT={groundDoor:'door',upperWindow:'window',feintDoorWindow:'window',feintVaultDoor:'door'};
const [src,out]=process.argv.slice(2);
mkdirSync(out,{recursive:true});
const sums=[],seen=new Set();
const load=d=>readdirSync(d).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(readFileSync(`${d}/${f}`,'utf8')));
for(const t of [...load(src),...load(src.replace(/R2b$/,'R2'))])seen.add(JSON.stringify(t.actions));
const write=(task,seconds)=>{const text=JSON.stringify(task,null,2)+'\n';writeFileSync(`${out}/${task.id}.json`,text);
 sums.push(`${createHash('sha256').update(text).digest('hex')}  R2c/${task.id}.json  ${task.title}${seconds?` ${seconds}s`:''}`);};
load(src).filter(t=>!t.holdout).forEach((t,i)=>write({...t,id:`r2c-${String(i+1).padStart(2,'0')}`,holdout:false,from:t.id}));
['groundDoor','upperWindow','feintDoorWindow','feintVaultDoor'].forEach((fam,j)=>{
 let k=0,res,family;
 for(;k<50;k++){const seed=960000+4000+j*37+k*7919;({family}=FAMILIES[fam](rng(seed)));const {script}=FAMILIES[fam](rng(seed));res=record(script,2);if(!seen.has(JSON.stringify(res.actions))&&exitOf(res.actions)===WANT[fam])break;}
 if(k>=50)throw Error('no fresh '+fam);
 seen.add(JSON.stringify(res.actions));
 write({id:`r2c-${11+j}`,title:`${family} · exits by the ${WANT[fam]} (holdout)`,holdout:true,engine:'realtime-platformer-v3',round:2,actions:res.actions},res.seconds);
});
writeFileSync(`${out}/SHA256SUMS.txt`,sums.join('\n')+'\n');console.log(sums.join('\n'));
