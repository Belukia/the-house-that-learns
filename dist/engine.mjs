// All movement is continuous. The simulation advances at 60 fixed ticks/second.
export const TILE=16, WIDTH=1024, HEIGHT=352, GROUND=304;
export const ENTRY={x:48,y:282}, RELIC={x:944,y:280};
export const HIDING=[{x:160,y:304},{x:528,y:304},{x:816,y:304}];
export const PLATFORMS=[{x:96,y:272,w:96},{x:144,y:240,w:96},{x:192,y:208,w:96},{x:224,y:176,w:576},{x:800,y:208,w:48},{x:848,y:240,w:48},{x:896,y:272,w:48}];
export const BLOCKS=[{x:368,y:272,w:32,h:32},{x:688,y:288,w:32,h:16}];
export const MAP=Array.from({length:22},(_,y)=>Array.from({length:64},(_,x)=>y>=19||x===0||x===63?'#':'.').join(''));
export const DEFAULT_POLICY=Object.freeze({name:'The trusting keeper',decoySkepticism:0,protectRelic:false,patrol:[{x:29,y:18},{x:43,y:18}],lesson:'Every sound deserves my attention.'});
export const equal=(a,b)=>Math.abs(a.x-b.x)<1&&Math.abs(a.y-b.y)<1;
export const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const floor=p=>Boolean(p&&Number.isInteger(p.x)&&p.x>=2&&p.x<=61&&p.y===18);
export const path=(a,b)=>[b];
export function validatePolicy(p){
 if(!p||!Array.isArray(p.patrol)||p.patrol.length<2||p.patrol.length>12||!p.patrol.every(floor))throw Error('Patrol needs 2–12 ground-floor waypoints (x:2–61, y:18).');
 if(!Number.isInteger(p.decoySkepticism)||p.decoySkepticism<0||p.decoySkepticism>2||typeof p.protectRelic!=='boolean')throw Error('Invalid guard behavior.');
 if(typeof p.lesson!=='string'||p.lesson.length>240||typeof p.name!=='string'||p.name.length>80)throw Error('Invalid lesson.');
 return {name:p.name,decoySkepticism:p.decoySkepticism,protectRelic:p.protectRelic,patrol:p.patrol.map(({x,y})=>({x,y})),lesson:p.lesson};
}
const actor=(x,y)=>({x,y,vx:0,vy:0,w:10,h:22,grounded:false,facing:1});
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function sight(a,b,radius=160){return Math.hypot(a.x-b.x,a.y-b.y)<radius&&Math.abs(a.y-b.y)<38&&!BLOCKS.some(o=>o.h>=30&&o.x>Math.min(a.x,b.x)&&o.x<Math.max(a.x,b.x)&&a.y+10>o.y);}
export function createGame(policy=DEFAULT_POLICY,options={}){
 return {player:actor(ENTRY.x,ENTRY.y),guard:actor(options.tutorial?600:480,282),tutorial:Boolean(options.tutorial),turn:0,time:0,patrolIndex:0,policy:validatePolicy(policy),suspicion:0,decoys:3,noise:null,hidden:false,hasRelic:false,status:'playing',message:'A/D to run, Space to jump, F throws a decoy ahead of you, H hides you in a wardrobe. The emerald is to the right.',history:[],inputs:[],events:[],decoysThrown:0,seen:0,lastJump:false,lastDecoy:false,lastHide:false};
}
function physics(a,dir,jump,drop=false,speed=2.15){
 a.vx=dir*speed;if(dir)a.facing=Math.sign(dir);
 if(jump&&a.grounded){a.vy=-6.7;a.grounded=false;}
 a.vy=Math.min(7,a.vy+.32);
 a.x+=a.vx;a.x=Math.max(18,Math.min(WIDTH-28,a.x));
 for(const o of BLOCKS)if(overlaps(a,o)){if(a.vx>0)a.x=o.x-a.w;else if(a.vx<0)a.x=o.x+o.w;}
 const oldBottom=a.y+a.h;a.y+=a.vy;a.grounded=false;
 const surfaces=[{x:0,y:GROUND,w:WIDTH},...BLOCKS,...(drop?[]:PLATFORMS)];
 for(const o of surfaces)if(a.vy>=0&&oldBottom<=o.y+.01&&a.y+a.h>=o.y&&a.x+a.w>o.x&&a.x<o.x+o.w){a.y=o.y-a.h;a.vy=0;a.grounded=true;}
}
export function step(s,input={}){
 if(s.status!=='playing')return s;
 s.turn++;s.time=s.turn/60;
 // Every tick's input, run-length encoded, so a server can replay the exact heist.
 const held=pickInput(input),last=s.inputs.at(-1);if(last&&INPUT_KEYS.every(k=>last.input[k]===held[k]))last.frames++;else s.inputs.push({frames:1,input:held});
 let dir=(input.right?1:0)-(input.left?1:0);
 if(input.hide&&!s.lastHide){if(HIDING.some(h=>Math.abs(s.player.x-h.x)<26&&Math.abs(s.player.y+22-h.y)<8)){s.hidden=!s.hidden;s.message=s.hidden?'In the wardrobe. Hold still.':'Back in the open.';}else s.message='Get close to a blue wardrobe to hide.';}
 if(dir||input.jump)s.hidden=false;
 physics(s.player,s.hidden?0:dir,Boolean(input.jump&&!s.lastJump),Boolean(input.down),input.sprint?2.65:2.15);
 if(input.decoy&&!s.lastDecoy&&s.decoys){s.decoys--;s.decoysThrown++;s.noise={x:Math.max(22,Math.min(990,s.player.x+s.player.facing*135)),y:282,ttl:240};s.message=s.policy.decoySkepticism?'The keeper remembers broken glass.':'Glass shatters. That got his attention.';}
 s.lastJump=Boolean(input.jump);s.lastDecoy=Boolean(input.decoy);s.lastHide=Boolean(input.hide);
 if(!s.hasRelic&&Math.abs(s.player.x-RELIC.x)<22&&Math.abs(s.player.y-RELIC.y)<34){s.hasRelic=true;s.events.push({type:'relic',turn:s.turn});s.message='Emerald acquired! Run LEFT to the green door.';}
 if(s.hasRelic&&s.player.x<68&&s.player.y>250){s.status='escaped';s.message='You escaped. The house remembers.';}
 if(!s.tutorial&&s.status==='playing'){
  const visible=!s.hidden&&sight(s.guard,s.player);let target;
  if(visible){target=s.player;s.seen++;s.suspicion=Math.min(100,s.suspicion+.65);s.message='He sees you! Jump, hide, or take the upper floor.';}
  else{s.suspicion=Math.max(0,s.suspicion-.35);
   if(s.noise&&(!s.policy.decoySkepticism||(s.policy.decoySkepticism===1&&Math.abs(s.guard.x-s.noise.x)<70)))target=s.noise;
   else if(s.policy.protectRelic&&!s.hasRelic)target={x:900};
   else {target={x:s.policy.patrol[s.patrolIndex%s.policy.patrol.length].x*16};if(Math.abs(s.guard.x-target.x)<6){s.patrolIndex++;target={x:s.policy.patrol[s.patrolIndex%s.policy.patrol.length].x*16};}}
  }
  const gd=Math.abs(target.x-s.guard.x)>4?Math.sign(target.x-s.guard.x):0;
  const obstacle=BLOCKS.some(o=>Math.abs((gd>0?o.x:o.x+o.w)-(gd>0?s.guard.x+s.guard.w:s.guard.x))<12&&s.guard.y+s.guard.h>o.y);
  physics(s.guard,gd,obstacle&&s.guard.grounded,false,visible?1.85:1.05);
  if(!s.hidden&&overlaps(s.player,s.guard)){s.status='caught';s.message='Caught. The keeper has your number.';}
  if(s.time>=90){s.status='caught';s.message='Dawn. The house seals its doors.';}
 }
 if(s.noise&&--s.noise.ttl<=0)s.noise=null;
 // Sample a trace at 10Hz, rather than writing every animation frame.
 if(s.turn%6===0||s.status!=='playing')s.history.push({turn:s.turn,player:{x:s.player.x,y:s.player.y},guard:{x:s.guard.x,y:s.guard.y},hidden:s.hidden,hasRelic:s.hasRelic,action:{...input},suspicion:s.suspicion,status:s.status});
 return s;
}
export const INPUT_KEYS=['left','right','sprint','jump','down','decoy','hide'];
const pickInput=i=>Object.fromEntries(INPUT_KEYS.map(k=>[k,Boolean(i&&i[k])]));
// Courtesy rounds have no clock, so cap them at ten minutes of play.
export const EPISODE_LIMITS=Object.freeze({maxFrames:36000,maxSegments:3000,maxRoute:400,maxBytes:262144});
export function summarize(s){
 const every=Math.max(1,Math.ceil(s.history.length/EPISODE_LIMITS.maxRoute));
 const route=s.history.filter((h,i)=>i%every===0||i===s.history.length-1).map(h=>({x:Math.round(h.player.x),y:Math.round(h.player.y)}));
 return {outcome:s.status,courtesyRound:s.tutorial,turns:s.turn,seconds:Math.round(s.time*10)/10,relicStolen:s.hasRelic,relicTurn:s.events.find(e=>e.type==='relic')?.turn??null,decoys:s.decoysThrown,timesSeen:s.seen,route,actions:s.inputs.map(a=>({frames:a.frames,input:{...a.input}})),engine:'realtime-platformer-v2'};
}
export function validateEpisode(ep){
 const L=EPISODE_LIMITS;
 if(!ep||!['escaped','caught','abandoned'].includes(ep.outcome)||typeof ep.courtesyRound!=='boolean')throw Error('A completed game trace is required.');
 if(!Array.isArray(ep.actions)||!ep.actions.length||ep.actions.length>L.maxSegments)throw Error(`Actions must be 1–${L.maxSegments} run-length segments.`);
 let frames=0;const actions=ep.actions.map(a=>{if(!a||!Number.isInteger(a.frames)||a.frames<1||!a.input||typeof a.input!=='object'||Object.keys(a.input).some(k=>!INPUT_KEYS.includes(k)||typeof a.input[k]!=='boolean'))throw Error('Invalid action segment.');frames+=a.frames;return {frames:a.frames,input:pickInput(a.input)};});
 if(frames>L.maxFrames)throw Error(`Episodes are limited to ${L.maxFrames} ticks.`);
 if(!Array.isArray(ep.route)||ep.route.length>L.maxRoute||!ep.route.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)))throw Error(`Route must have at most ${L.maxRoute} points.`);
 return {outcome:ep.outcome,courtesyRound:ep.courtesyRound,turns:frames,seconds:Math.round(frames/6)/10,relicStolen:Boolean(ep.relicStolen),relicTurn:Number.isInteger(ep.relicTurn)?ep.relicTurn:null,decoys:Number(ep.decoys)||0,timesSeen:Number(ep.timesSeen)||0,route:ep.route.map(({x,y})=>({x:Math.round(x),y:Math.round(y)})),actions,engine:'realtime-platformer-v2'};
}
// Re-simulates the trace under the policy it was played against; the client's claimed outcome is not trusted.
export function replayEpisode(policy,ep){
 const s=createGame(policy,{tutorial:ep.courtesyRound});
 for(const a of ep.actions)for(let n=0;n<a.frames;n++){if(s.status!=='playing')break;step(s,a.input);}
 const expected=ep.outcome==='abandoned'?'playing':ep.outcome;
 if(s.status!==expected||s.turn!==ep.turns)throw Error(`Trace does not replay to its claimed outcome (${s.status} at tick ${s.turn}).`);
 return {...summarize(s),outcome:ep.outcome};
}
export function learnLocal(policy,episode){const p=validatePolicy(policy);if(episode.decoys){p.decoySkepticism=Math.min(2,p.decoySkepticism+1);p.name='The skeptical keeper';p.lesson='Broken glass can wait. I have a thief to catch.';}else{p.protectRelic=true;p.patrol=[{x:48,y:18},{x:59,y:18}];p.name='The vault keeper';p.lesson='You went straight for the emerald. Next time, so will I.';}return validatePolicy(p);}
export function runActions(policy,actions){const s=createGame(policy);for(const a of actions){for(let n=0;n<(a.frames||1);n++){step(s,a.input||a);if(s.status!=='playing')return s;}}return s;}
