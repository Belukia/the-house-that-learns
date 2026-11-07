// Can each night of the game be won? A beam search plays as the thief (no AI, no network) against
// several keepers: a fresh one, and keepers who already learned common habits. It is a feasibility check,
// not a difficulty score: a human may find a night harder or easier than the search does.
// Usage: node scripts/check-nights.mjs [night ...]
import {createGame,step,validatePolicy,DEFAULT_POLICY,NIGHTS,WINDOW,upstairs} from '../dist/engine.mjs';

const H={habits:true};
const keeper=(habits,extra={})=>validatePolicy({...DEFAULT_POLICY,...extra,habits:{waitAt:null,wardrobe:null,exit:false,door:false,window:false,known:[],...habits}},H);
export const KEEPERS={
 fresh:keeper({}),
 'waits halfway':keeper({waitAt:34}),
 'waits upstairs':keeper({waitAt:52}),
 'waits at the window':keeper({window:true}),
 'runs for the exit':keeper({exit:true,door:true}),
 'knows everything':keeper({waitAt:52,wardrobe:1,exit:true,door:true,window:true},{decoySkepticism:2}),
};
const F=12; // frames per macro step
const MOVES=[{right:true},{left:true},{right:true,sprint:true},{left:true,sprint:true},{right:true,jump:true},{left:true,jump:true},{jump:true},{down:true},{left:true,down:true},{right:true,down:true},{},{hide:true},{decoy:true}];
const STAIRS=[{foot:100,top:240},{foot:930,top:790}];
let STYLE={climb:true,wary:true}; // the search tries three styles; any escape it finds is a real, simulated escape
function pathDist(a,t){
 const up=upstairs(a);
 if(up===t.up)return Math.abs(a.x-t.x);
 if(up&&!t.up)return Math.abs(a.x-t.x)+40;
 // Going up: walk to the foot of a staircase, climb (height left to climb), then walk along the upper floor.
 if(!STYLE.climb)return Math.min(...STAIRS.map(s=>Math.abs(a.x-s.foot)+150+Math.abs(s.top-t.x)));
 const climb=(a.y+a.h-176)*1.2,onGround=a.y+a.h>=300;
 return Math.min(...STAIRS.map(s=>(onGround?Math.abs(a.x-s.foot):0)+climb+Math.abs(s.top-t.x)));
}
function goal(s){
 if(!s.hasRelic)return {x:s.relic.x,up:s.relic.y<200};
 const exits=s.rules.exits||['door'],c=[];
 if(exits.includes('door'))c.push({x:50,up:false});
 if(exits.includes('window'))c.push({x:WINDOW.x,up:true});
 // Prefer the exit that is near and that the keeper is not standing next to.
 const cost=e=>pathDist(s.player,e)+(STYLE.wary?Math.max(0,300-pathDist(s.guard,e))*2:0);
 return c.sort((a,b)=>cost(a)-cost(b))[0];
}
function score(s){
 const phase=s.hasRelic?3000:0,d=pathDist(s.player,goal(s));
 const gap=Math.min(250,Math.hypot(s.guard.x-s.player.x,(s.guard.y-s.player.y)*1.5));
 return phase-d+gap*.4-(s.sees?60:0);
}
const clone=s=>({...structuredClone({...s,history:[],inputs:[],events:[]}),history:[],inputs:[],events:s.events.slice()});
export function search(night,policy,opts={}){
 for(const style of [{climb:false,wary:false},{climb:true,wary:false},{climb:true,wary:true}]){STYLE=style;const r=searchOnce(night,policy,opts);if(r.won)return r;}
 return {won:false,why:'no escape found (not a proof that none exists)'};
}
function searchOnce(night,policy,{beam=160,setup}={}){
 const first=createGame(policy,{habits:true,night});if(setup)setup(first);
 let frontier=[first];
 const maxSteps=Math.ceil(NIGHTS[night].limit*60/F)+2;
 for(let depth=0;depth<maxSteps;depth++){
  const next=new Map();
  for(const s of frontier)for(const [mi,m] of MOVES.entries()){
   const t=clone(s);t.trail=[...(s.trail||[]),mi];for(let i=0;i<F&&t.status==='playing';i++)step(t,i===F-1&&(m.hide||m.decoy)?{}:m);
   if(t.status==='escaped')return {won:true,seconds:Math.round(t.time),how:t.events.some(e=>e.type==='window')?'window':'door',trail:t.trail};
   if(t.status!=='playing')continue;
   const key=[Math.round(t.player.x/10),Math.round(t.player.y/10),t.hasRelic,t.hidden,Math.round(t.guard.x/40)].join();
   const sc=score(t);if(!next.has(key)||next.get(key).sc<sc)next.set(key,{s:t,sc});
  }
  // Most of the beam goes to progress; a quarter is kept for the safest states, so waiting for him to pass survives.
  const all=[...next.values()],best=all.sort((a,b)=>b.sc-a.sc).slice(0,Math.ceil(beam*.75));
  const safe=all.filter(v=>!best.includes(v)).map(v=>({v,gap:Math.hypot(v.s.guard.x-v.s.player.x,(v.s.guard.y-v.s.player.y)*1.5)+(v.s.hidden?400:0)})).sort((a,b)=>b.gap-a.gap).slice(0,beam-best.length).map(x=>x.v);
  frontier=[...best,...safe].map(v=>v.s);
  if(!frontier.length)return {won:false,why:'caught every time'};
 }
 return {won:false,why:'ran out of time'};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const nights=process.argv.slice(2).map(Number).filter(Boolean);
 for(const n of nights.length?nights:[2,3,4,5,6,7,8,9,10]){
  const row=Object.entries(KEEPERS).map(([name,p])=>{const r=search(n,p);return `${name}: ${r.won?`WON ${r.seconds}s (${r.how})`:'no win ('+r.why+')'}`;});
  console.log(`night ${n} · ${row.join(' | ')}`);
 }
}
