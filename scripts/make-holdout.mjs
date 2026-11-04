// Builds the held-out heists from a few readable thief plans. Run once; the output is frozen in evals/tasks/.
//   node scripts/make-holdout.mjs            print a summary and check every plan escapes
//   node scripts/make-holdout.mjs --write    also write evals/tasks/05..08 and evals/tasks.json
// A plan is played by a simple autopilot in the clockless courtesy round (the thief ignores the keeper),
// and the inputs the engine recorded become the frozen trace, exactly like the development heists.
import {writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createGame,step,DEFAULT_POLICY,BLOCKS,INPUT_KEYS} from '../dist/engine.mjs';
const PLANS=[
 {id:'realtime-5',title:'Ground floor walk with a wardrobe wait',route:'ground',waits:[{x:528,frames:150,hide:true}]},
 {id:'realtime-6',title:'Upper floor walk with a decoy on the way out',route:'upper',decoysOut:[600]},
 {id:'realtime-7',title:'Ground floor sprint in, two decoys, walk out',route:'ground',sprintIn:true,decoysIn:[300,700]},
 {id:'realtime-8',title:'Upper floor sprint in, decoys in and out',route:'upper',sprintIn:true,decoysIn:[700],decoysOut:[400]},
];
export function play(plan){
 const s=createGame(DEFAULT_POLICY,{tutorial:true}),done=new Set();let wait=null,f=0;
 while(s.status==='playing'&&s.turn<5400){
  const p=s.player,out=s.hasRelic,dir=out?-1:1,input={};
  const w=(plan.waits||[]).find((w,i)=>!done.has('w'+i)&&Boolean(w.out)===out&&(out?p.x<=w.x:p.x>=w.x)&&p.grounded);
  if(!wait&&w){wait={left:w.frames,hide:w.hide,key:'w'+(plan.waits.indexOf(w))};}
  // Standing still; a hiding wait steps into the wardrobe on its first tick (moving again steps out).
  if(wait){if(wait.hide&&f===0)input.hide=true;f++;if(--wait.left<=0){done.add(wait.key);wait=null;f=0;}step(s,input);continue;}
  input[out?'left':'right']=true;
  if(out?false:plan.sprintIn)input.sprint=true;
  const upper=plan.route==='upper';
  if(!upper&&out&&p.y<250)input.down=true;
  const ahead=BLOCKS.some(o=>{const edge=dir>0?o.x-(p.x+p.w):p.x-(o.x+o.w);return edge>=0&&edge<14&&p.y+p.h>o.y;});
  // Upper route: climb the stairs until the long floor (top at y176), then run it without jumping.
  const climb=upper&&p.y+p.h>177&&(out?p.x>224:p.x<800);
  if(p.grounded&&(ahead||climb))input.jump=true;
  for(const [k,list] of [['in',plan.decoysIn],['out',plan.decoysOut]])(list||[]).forEach((x,i)=>{const key=k+i;if(!done.has(key)&&(k==='out')===out&&(out?p.x<=x:p.x>=x)){input.decoy=true;done.add(key);}});
  step(s,input);
 }
 return s;
}
const dev=JSON.parse(readFileSync(new URL('../evals/tasks.json',import.meta.url),'utf8')).filter(t=>!t.holdout);
const made=PLANS.map(plan=>{const s=play(plan);if(s.status!=='escaped')throw Error(`${plan.id} did not escape (${s.status} at tick ${s.turn})`);
 const actions=s.inputs.map(({frames,input})=>({frames,input:Object.fromEntries(INPUT_KEYS.map(k=>[k,Boolean(input[k])]))}));
 return {id:plan.id,title:plan.title,holdout:true,engine:'realtime-platformer-v2',actions,ticks:s.turn,decoys:s.decoysThrown};});
for(const t of made)console.log(`${t.id}  ${String(t.ticks).padStart(4)} ticks  ${t.actions.length} segments  ${t.decoys} decoys  ${t.title}`);
if(process.argv.includes('--write')){
 const dir=new URL('../evals/tasks/',import.meta.url),names=readdirSync(dir).filter(f=>f.endsWith('.json')).sort();
 made.forEach((t,i)=>{const name=names.find(n=>n.endsWith(t.id+'.json'));const {ticks,decoys,...task}=t;writeFileSync(new URL(name,dir),JSON.stringify(task,null,2)+'\n');});
 const legacy=[...dev,...made.map(({ticks,decoys,...t})=>({id:t.id,holdout:true,engine:t.engine,actions:t.actions}))];
 writeFileSync(new URL('../evals/tasks.json',import.meta.url),JSON.stringify(legacy,null,2)+'\n');
 console.log('wrote evals/tasks/05..08 and evals/tasks.json');
}
