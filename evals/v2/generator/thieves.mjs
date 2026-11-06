// Thief bots for exam v2. A bot is a short script (wait, run, climb, hide, throw glass, leave by an exit).
// It is played once with the keeper asleep (courtesy rules) and its held keys are frozen as a task:
// the same open-loop trace every time, like the v1 tasks. No AI is involved.
import {createGame,step,upstairs,downstairs,BLOCKS,HIDING,DEFAULT_POLICY,WINDOW} from '../../../dist/engine.mjs';

const SLEEPER={...DEFAULT_POLICY,dwell:0};

// Each command returns the input for this tick, or null when it is done.
const near=(a,b,d=4)=>Math.abs(a-b)<=d;
function crateAhead(p,dir){return BLOCKS.some(o=>dir>0?o.x-(p.x+p.w)>0&&o.x-(p.x+p.w)<14:p.x-(o.x+o.w)>0&&p.x-(o.x+o.w)<14);}
const cmd={
 wait:(sec)=>{let t=Math.round(sec*60);return()=>t-->0?{}:null;},
 // Walk or sprint along the floor you are on, hopping crates.
 go:(x,sprint=false)=>s=>{const p=s.player;if(near(p.x,x,3))return null;const dir=x>p.x?1:-1;return {[dir>0?'right':'left']:true,sprint,jump:p.grounded&&downstairs(p)&&crateAhead(p,dir)&&s.turn%2===0};},
 // Hop up the stairs at one end until standing on the upper floor.
 climb:(side,sprint=false)=>{let n=0;return s=>{const p=s.player;if(upstairs(p)&&p.grounded)return null;if(++n>900)throw Error('climb stuck');return {[side==='left'?'right':'left']:true,jump:p.grounded&&s.turn%2===0,sprint};};},
 // Leave the upper floor at one end, dropping down the steps.
 descend:(side)=>{let n=0;return s=>{const p=s.player;if(downstairs(p)&&p.grounded)return null;if(++n>900)throw Error('descend stuck');return {[side==='left'?'left':'right']:true,down:true};};},
 grab:()=>s=>s.hasRelic?null:{[s.player.x<944?'right':'left']:true},
 face:(dir)=>{let d=false;return()=>{if(d)return null;d=true;return {[dir>0?'right':'left']:true};};},
 decoy:()=>{let n=0;return()=>n++===0?{decoy:true}:null;},
 hide:(sec)=>{let n=0,t=Math.round(sec*60);return s=>{if(n===0){n=1;return {hide:true};}if(n===1){n=2;return {};}if(t-->0)return {};if(s.hidden){if(n===2){n=3;return {hide:true};}}return null;};},
 door:(sprint=false)=>s=>s.status!=='playing'?null:{left:true,sprint,jump:s.player.grounded&&crateAhead(s.player,-1)&&s.turn%2===0},
 // Press the action key at the window (an edge, so release first).
 action:()=>{let n=0;return s=>s.status!=='playing'||n>3?null:(n++%2?{hide:true}:{});},
};

// Run a script with the keeper asleep and return the frozen trace.
export function record(script,round){
 const s=createGame(SLEEPER,{round,tutorial:true});
 for(const make of script){
  const c=make();
  for(let guard=0;guard<4000&&s.status==='playing';guard++){const input=c(s);if(input===null)break;step(s,input);}
  if(s.status!=='playing')break;
 }
 if(s.status!=='escaped')throw Error(`bot did not escape (${s.status}) at ${Math.round(s.player.x)},${Math.round(s.player.y)}`);
 if(s.time>55)throw Error(`bot too slow: ${s.time.toFixed(1)}s`);
 return {actions:s.inputs.map(a=>({frames:a.frames,input:{...a.input}})),seconds:Math.round(s.time*10)/10};
}

// Up the left stairs, along the upper floor, down by the vault and grab the emerald.
const UPPER_TO_VAULT=(r,grab=true)=>[()=>cmd.climb('left',r()<.5),()=>cmd.go(780,r()<.6),()=>cmd.descend('right'),...(grab?[()=>cmd.grab()]:[])];
// Families. `r` is a seeded random in [0,1). Each returns {family, script}.
const pick=(r,a)=>a[Math.floor(r()*a.length)];
export const FAMILIES={
 // Round 1 families: everyone leaves by the front door.
 groundDoor:r=>({family:'ground→door',script:[()=>cmd.wait(r()*3),()=>cmd.go(930,r()<.5),()=>cmd.grab(),()=>cmd.door(r()<.5)]}),
 upperDoor:r=>({family:'upper→door',script:[()=>cmd.wait(r()*3),...UPPER_TO_VAULT(r),()=>cmd.climb('right'),()=>cmd.go(240,r()<.6),()=>cmd.descend('left'),()=>cmd.door()]}),
 decoyDoor:r=>({family:'ground→door + glass',script:[()=>cmd.go(300+r()*200),()=>cmd.face(1),()=>cmd.decoy(),()=>cmd.go(930,true),()=>cmd.grab(),()=>cmd.door(true)]}),
 // Round 2 families: the window upstairs. Window thieves keep to the upper floor; glass goes to the exit they will NOT use.
 upperWindow:r=>({family:'upper→window',script:[()=>cmd.wait(r()*3),...UPPER_TO_VAULT(r),()=>cmd.climb('right'),()=>cmd.go(WINDOW.x,r()<.6),()=>cmd.action()]}),
 groundWindow:r=>({family:'ground→window',script:[()=>cmd.wait(r()*3),()=>cmd.go(930,r()<.5),()=>cmd.grab(),()=>cmd.climb('right'),()=>cmd.go(WINDOW.x,r()<.5),()=>cmd.action()]}),
 feintDoorWindow:r=>({family:'glass at the door → window',script:[()=>cmd.climb('left'),()=>cmd.go(250+r()*30),()=>cmd.face(-1),()=>cmd.decoy(),()=>cmd.go(780,true),()=>cmd.descend('right'),()=>cmd.grab(),()=>cmd.climb('right'),()=>cmd.go(WINDOW.x,true),()=>cmd.action()]}),
 feintVaultDoor:r=>({family:'glass at the vault → door',script:[...UPPER_TO_VAULT(r),()=>cmd.climb('right'),()=>cmd.go(640+r()*80),()=>cmd.face(1),()=>cmd.decoy(),()=>cmd.go(240,true),()=>cmd.descend('left'),()=>cmd.door(true)]}),
 // Round 3 families: patience and real noise.
 lateDoor:r=>({family:'waits, then upper→door',script:[()=>cmd.wait(8+r()*12),...UPPER_TO_VAULT(r),()=>cmd.climb('right'),()=>cmd.go(240,true),()=>cmd.descend('left'),()=>cmd.door(true)]}),
 hideThenDoor:r=>({family:'hides mid-hall, then door',script:[()=>cmd.go(HIDING[1].x),()=>cmd.hide(4+r()*10),()=>cmd.go(930,true),()=>cmd.grab(),()=>cmd.door(true)]}),
 hideThenWindow:r=>({family:'hides by the vault, then window',script:[...UPPER_TO_VAULT(r,false),()=>cmd.go(HIDING[2].x),()=>cmd.hide(4+r()*10),()=>cmd.grab(),()=>cmd.climb('right'),()=>cmd.go(WINDOW.x),()=>cmd.action()]}),
 sneakWindow:r=>({family:'walks quietly, upper→window',script:[()=>cmd.wait(r()*6),...UPPER_TO_VAULT(r),()=>cmd.climb('right'),()=>cmd.go(WINDOW.x,false),()=>cmd.action()]}),
 fastWindow:r=>({family:'sprints upper→window',script:[()=>cmd.climb('left',true),()=>cmd.go(780,true),()=>cmd.descend('right'),()=>cmd.grab(),()=>cmd.climb('right',true),()=>cmd.go(WINDOW.x,true),()=>cmd.action()]}),
 sprintDoor:r=>({family:'sprints the hall (it creaks) → door',script:[()=>cmd.go(930,true),()=>cmd.grab(),()=>cmd.door(true)]}),
};

export function rng(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
