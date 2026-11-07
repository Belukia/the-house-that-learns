// All movement is continuous. The simulation advances at 60 fixed ticks/second.
export const TILE=16, WIDTH=1024, HEIGHT=352, GROUND=304;
export const ENTRY={x:48,y:282}, RELIC={x:944,y:280}, UPPER_RELIC=Object.freeze({x:580,y:152});
export const HIDING=[{x:160,y:304},{x:528,y:304},{x:816,y:304}];
export const PLATFORMS=[{x:96,y:272,w:96},{x:144,y:240,w:96},{x:192,y:208,w:96},{x:224,y:176,w:576},{x:800,y:208,w:48},{x:848,y:240,w:48},{x:896,y:272,w:48}];
export const BLOCKS=[{x:368,y:272,w:32,h:32},{x:688,y:288,w:32,h:16}];
export const MAP=Array.from({length:22},(_,y)=>Array.from({length:64},(_,x)=>y>=19||x===0||x===63?'#':'.').join(''));
export const DEFAULT_POLICY=Object.freeze({name:'The trusting keeper',decoySkepticism:0,protectRelic:false,patrol:[{x:29,y:18},{x:43,y:18}],lesson:'Every sound deserves my attention.'});
export const equal=(a,b)=>Math.abs(a.x-b.x)<1&&Math.abs(a.y-b.y)<1;
export const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const floor=p=>Boolean(p&&Number.isInteger(p.x)&&p.x>=2&&p.x<=61&&p.y===18);
export const path=(a,b)=>[b];
// Habits are the in-browser keeper's notes on one player. Evaluations never pass {habits:true}, so they are dropped there.
const tileX=v=>v==null?null:(Number.isInteger(v)&&v>=2&&v<=61?v:(()=>{throw Error('Invalid habit.')})());
function validHabits(h){
 if(!h||typeof h!=='object')throw Error('Invalid habits.');
 const wardrobe=h.wardrobe==null?null:(Number.isInteger(h.wardrobe)&&h.wardrobe>=0&&h.wardrobe<HIDING.length?h.wardrobe:(()=>{throw Error('Invalid habit.')})());
 const known=Array.isArray(h.known)?h.known.slice(-6).filter(k=>k&&typeof k.key==='string'&&k.key.length<=20&&typeof k.line==='string'&&k.line.length<=160).map(({key,line})=>({key,line})):[];
 return {waitAt:tileX(h.waitAt),wardrobe,exit:Boolean(h.exit),door:Boolean(h.door),window:Boolean(h.window),known};
}
export function validatePolicy(p,{habits=false}={}){
 if(!p||!Array.isArray(p.patrol)||p.patrol.length<2||p.patrol.length>12||!p.patrol.every(floor))throw Error('Patrol needs 2–12 ground-floor waypoints (x:2–61, y:18).');
 if(!Number.isInteger(p.decoySkepticism)||p.decoySkepticism<0||p.decoySkepticism>2||typeof p.protectRelic!=='boolean')throw Error('Invalid guard behavior.');
 if(typeof p.lesson!=='string'||p.lesson.length>240||typeof p.name!=='string'||p.name.length>80)throw Error('Invalid lesson.');
 const out={name:p.name,decoySkepticism:p.decoySkepticism,protectRelic:p.protectRelic,patrol:p.patrol.map(({x,y})=>({x,y})),lesson:p.lesson};
 if(habits&&p.habits)out.habits=validHabits(p.habits);
 return out;
}
const actor=(x,y)=>({x,y,vx:0,vy:0,w:10,h:22,grounded:false,facing:1});
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function sight(a,b,radius=160){return Math.hypot(a.x-b.x,a.y-b.y)<radius&&Math.abs(a.y-b.y)<38&&!BLOCKS.some(o=>o.h>=30&&o.x>Math.min(a.x,b.x)&&o.x<Math.max(a.x,b.x)&&a.y+10>o.y);}
// The hosted game's five nights. Evaluations never pass {night}, so they keep the frozen exam rules.
export const EXAM_RULES=Object.freeze({limit:90,speed:1,vision:160,decoys:3,door:false});
// From night 2 he hunts: he chases what he sees, remembers where he last saw you, and takes the stairs.
// From night 3 the house opens a window upstairs, above the door: a second way out (the same window as exam v2).
export const NIGHTS=Object.freeze({2:{limit:55,speed:1,vision:170,decoys:3,door:false,chase:true},3:{limit:50,speed:1.1,vision:200,decoys:2,door:false,chase:true,exits:['door','window']},4:{limit:45,speed:1.2,vision:230,decoys:1,door:false,chase:true,exits:['door','window']},5:{limit:40,speed:1.3,vision:260,decoys:0,door:false,chase:true,exits:['door','window']},
 // Nights 6-10: each adds ONE new thing. 6 the long hall creaks under a sprint; 7 the candles are out (you see a small circle,
 // he sees less); 8 the front door is locked (window only); 9 the emerald has been moved upstairs; 10 all of it at once.
 6:{limit:45,speed:1.25,vision:240,decoys:1,door:false,chase:true,exits:['door','window'],creaky:true},
 7:{limit:45,speed:1.25,vision:150,decoys:1,door:false,chase:true,exits:['door','window'],dark:true},
 8:{limit:45,speed:1.3,vision:240,decoys:1,door:false,chase:true,exits:['window']},
 9:{limit:45,speed:1.3,vision:240,decoys:1,door:false,chase:true,exits:['door','window'],relic:UPPER_RELIC},
 10:{limit:50,speed:1.3,vision:150,decoys:1,door:false,chase:true,exits:['window'],creaky:true,dark:true,relic:UPPER_RELIC}});
// What each new night adds, for the briefing and the status line.
export const NIGHT_NEWS=Object.freeze({6:'THE LONG HALL CREAKS IF YOU RUN',7:'THE CANDLES ARE OUT',8:'THE FRONT DOOR IS LOCKED',9:'THE EMERALD HAS BEEN MOVED UPSTAIRS',10:'ALL OF IT, AT ONCE'});
// Exam v2 (prototype): rounds that get harder. A round only adds rules; rounds never change what earlier rounds meant.
// Evaluations of exam v1 never pass {round}, so they keep EXAM_RULES exactly.
// Same keeper as exam v1 (no hunting memory, sees only on his own floor); the only new ability is walking to upper waypoints.
export const EXAM_V2=Object.freeze({limit:60,speed:1,vision:160,decoys:3,door:false,chase:false,v2:true});
export const ROUNDS=Object.freeze({1:{exits:['door']},2:{exits:['door','window']},3:{exits:['door','window'],creaky:true}});
// The window is on the upper floor, above the front door: one exit per floor. Climbing out is deliberate:
// the thief stands at it and presses the action key (the hide key), so walking past it is not an escape.
export const WINDOW={x:312,reach:20};
const upperTile=p=>Boolean(p&&Number.isInteger(p.x)&&p.x>=14&&p.x<=49&&p.y===10);
export function validatePolicyV2(p){
 if(!p||!Array.isArray(p.patrol)||p.patrol.length<2||p.patrol.length>12||!p.patrol.every(w=>floor(w)||upperTile(w)))throw Error('Patrol needs 2–12 waypoints: ground (x 2–61, y 18) or upper floor (x 14–49, y 10).');
 const dwell=p.dwell??0;
 if(!Number.isInteger(dwell)||dwell<0||dwell>4)throw Error('dwell is whole seconds at each waypoint, 0–4.');
 if(!Number.isInteger(p.decoySkepticism)||p.decoySkepticism<0||p.decoySkepticism>2||typeof p.protectRelic!=='boolean')throw Error('Invalid guard behavior.');
 if(typeof p.lesson!=='string'||p.lesson.length>240||typeof p.name!=='string'||p.name.length>80)throw Error('Invalid lesson.');
 return {name:p.name,decoySkepticism:p.decoySkepticism,protectRelic:p.protectRelic,dwell,patrol:p.patrol.map(({x,y})=>({x,y})),lesson:p.lesson};
}
export const upstairs=a=>a.y+a.h<=180, UPPER_AMBUSH=704, downstairs=a=>a.y+a.h>=300;
// Seeing across floors is harder: the height difference counts against his range. Crates still block him on the ground.
const huntSight=(g,p,r)=>Math.hypot(g.x-p.x,(g.y-p.y)*1.5)<r&&(upstairs(g)!==upstairs(p)||sight(g,p,r));
// One-way ledges: he climbs the stairs at either end by jumping, and drops through the floor to come down.
function route(g,t){
 const up=t.up??(t.y!=null&&t.y+22<=180),toward=Math.abs(t.x-g.x)>4?Math.sign(t.x-g.x):0;
 if(up&&!upstairs(g)){
  const left=Math.abs(g.x-90)+Math.abs(t.x-240)<=Math.abs(g.x-950)+Math.abs(t.x-790);
  // Walk to the foot of the stairs (stepping off any crate), then hop up step by step.
  if(left)return g.x>(downstairs(g)?92:260)?{dir:-1}:{dir:1,jump:true};
  return g.x<(downstairs(g)?950:770)?{dir:1}:{dir:-1,jump:true};
 }
 return {dir:toward,drop:!up&&!downstairs(g)};
}
export function createGame(policy=DEFAULT_POLICY,options={}){
 const rules=options.round?{...EXAM_V2,...ROUNDS[options.round]}:NIGHTS[options.night]||EXAM_RULES;
 return {rules,player:actor(ENTRY.x,ENTRY.y),guard:actor(options.tutorial?600:480,282),tutorial:Boolean(options.tutorial),turn:0,time:0,patrolIndex:0,dwell:0,policy:options.round?validatePolicyV2(policy):validatePolicy(policy,{habits:Boolean(options.habits)}),suspicion:0,decoys:rules.decoys,noise:null,hidden:false,hasRelic:false,relic:rules.relic||RELIC,status:'playing',message:'A/D to run, Space to jump, F throws a decoy ahead of you, H hides you in a wardrobe. The emerald is to the right.',history:[],inputs:[],events:[],decoysThrown:0,seen:0,lastJump:false,lastDecoy:false,lastHide:false};
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
 if(input.hide&&!s.lastHide){const spot=HIDING.findIndex(h=>Math.abs(s.player.x-h.x)<26&&Math.abs(s.player.y+22-h.y)<8);if(spot>=0){s.hidden=!s.hidden;if(s.hidden)s.events.push({type:'hide',spot,turn:s.turn});s.message=s.hidden?'In the wardrobe. Hold still.':'Back in the open.';}else s.message='Get close to a blue wardrobe to hide.';}
 if(dir||input.jump)s.hidden=false;
 physics(s.player,s.hidden?0:dir,Boolean(input.jump&&!s.lastJump),Boolean(input.down),input.sprint?2.65:2.15);
 if(input.decoy&&!s.lastDecoy&&s.decoys){s.decoys--;s.decoysThrown++;s.noise={x:Math.max(22,Math.min(990,s.player.x+s.player.facing*135)),y:282,ttl:240};s.message=s.policy.decoySkepticism?'The keeper remembers broken glass.':'Glass shatters. That got his attention.';}
 s.lastJump=Boolean(input.jump);s.lastDecoy=Boolean(input.decoy);s.lastHide=Boolean(input.hide);
 if(!s.hasRelic&&Math.abs(s.player.x-s.relic.x)<22&&Math.abs(s.player.y-s.relic.y)<34){s.hasRelic=true;s.events.push({type:'relic',turn:s.turn});s.message='Emerald acquired! Run LEFT to the green door.';}
 const doorOpen=!s.rules.exits||s.rules.exits.includes('door');
 if(s.hasRelic&&s.player.x<68&&s.player.y>250){if(doorOpen){s.status='escaped';s.message='You escaped. The house remembers.';}else if(!s.triedDoor){s.triedDoor=true;s.events.push({type:'locked',turn:s.turn});s.message='Locked. The way out tonight is the window upstairs.';}}
 if(s.status==='playing'&&s.hasRelic&&s.rules.exits?.includes('window')&&input.hide&&upstairs(s.player)&&Math.abs(s.player.x-WINDOW.x)<WINDOW.reach){s.status='escaped';s.message='Out through the window.';s.events.push({type:'window',turn:s.turn});}
 // Round 3: the long hall creaks under a sprint. That noise is real: it is where the thief is.
 if(s.rules.creaky&&input.sprint&&dir&&s.player.grounded&&downstairs(s.player)&&s.player.x>400&&s.player.x<640&&!s.noise){s.noise={x:s.player.x,y:282,ttl:90,real:true};s.events.push({type:'creak',turn:s.turn});}
 if(!s.tutorial&&s.status==='playing'){
  let visible=!s.hidden&&(s.rules.chase?huntSight(s.guard,s.player,s.rules.vision):sight(s.guard,s.player,s.rules.vision)),target;const H=s.policy.habits,R=s.rules;
  // A keeper who knows your wardrobe opens it when he walks past.
  if(!visible&&H&&H.wardrobe!=null&&s.hidden&&Math.abs(s.player.x-HIDING[H.wardrobe].x)<26&&Math.abs(s.guard.x-s.player.x)<30){s.hidden=false;visible=true;s.events.push({type:'found',turn:s.turn});}
  // On the last night he will not be drawn away from the door.
  if(visible&&R.door&&s.player.x>160){s.seen++;s.suspicion=Math.min(100,s.suspicion+.65);s.message='He sees you. He stays by the door.';target={x:s.patrolIndex%2?64:32};if(Math.abs(s.guard.x-target.x)<6)s.patrolIndex++;visible=false;}
  else if(visible){target=s.player;s.seen++;s.suspicion=Math.min(100,s.suspicion+.65);if(R.chase)s.lastSeen={x:s.player.x,y:s.player.y,h:s.player.h,ttl:360};s.message=R.chase?'He sees you! Run, hide, or lose him on the stairs. Shift sprints.':'He sees you! Jump, hide, or take the upper floor.';}
  else{s.suspicion=Math.max(0,s.suspicion-.35);
   // A hunter goes to where he last saw you for six seconds before giving up.
   if(R.chase&&s.lastSeen?.ttl>0){target=s.lastSeen;s.lastSeen.ttl--;if(Math.abs(s.guard.x-target.x)<8&&upstairs(s.guard)===upstairs(target))s.lastSeen.ttl=0;s.message='He lost you. He is looking.';}
   else if(s.noise&&((s.noise.real&&!R.v2)||!s.policy.decoySkepticism||(s.policy.decoySkepticism===1&&Math.abs(s.guard.x-s.noise.x)<70)))target=s.noise;
   else if(R.door){target={x:s.patrolIndex%2?64:32};if(Math.abs(s.guard.x-target.x)<6)s.patrolIndex++;}
   else if(H&&H.exit&&s.hasRelic)target=(H.window||(R.exits&&!R.exits.includes('door')))&&R.exits?.includes('window')?{x:WINDOW.x,up:true}:{x:92};
   else if(s.policy.protectRelic&&!s.hasRelic)target={x:900};
   else if(H&&(H.waitAt!=null||H.wardrobe!=null||(H.door&&(!R.exits||R.exits.includes('door')))||(H.window&&R.exits?.includes('window')))){
    // Wait where this player was last time; check their wardrobe on the way. Two seconds at each stop.
    // A hunter who saw you take the upper floor waits for you up there.
    const stops=[...(H.waitAt!=null?[R.chase&&H.waitAt===52?{x:UPPER_AMBUSH,up:true}:{x:H.waitAt*16,up:false}]:[]),...(H.wardrobe!=null?[{x:HIDING[H.wardrobe].x,up:false}]:[]),...(H.door&&(!R.exits||R.exits.includes('door'))?[{x:80,up:false}]:[]),...(H.window&&R.exits?.includes('window')?[{x:WINDOW.x,up:true}]:[])];
    target=stops[s.patrolIndex%stops.length];
    if(Math.abs(s.guard.x-target.x)<6&&(!R.chase||upstairs(s.guard)===target.up)&&++s.dwell>=(stops.length>1?120:1e9)){s.dwell=0;s.patrolIndex++;}
   }
   else if(R.v2){
    // Exam v2 patrol: waypoints on either floor, with a wait (dwell) at each one.
    const stops=s.policy.patrol.map(p=>({x:p.x*16,up:p.y===10}));
    target=stops[s.patrolIndex%stops.length];
    if(Math.abs(s.guard.x-target.x)<6&&upstairs(s.guard)===target.up&&++s.dwell>s.policy.dwell*60){s.dwell=0;s.patrolIndex++;}
   }
   else if(R.chase){
    // His rounds take in the upper floor too.
    const stops=[...s.policy.patrol.map(p=>({x:p.x*16,up:false})),{x:512,up:true}];
    target=stops[s.patrolIndex%stops.length];if(Math.abs(s.guard.x-target.x)<6&&upstairs(s.guard)===target.up)s.patrolIndex++;
   }
   else {target={x:s.policy.patrol[s.patrolIndex%s.policy.patrol.length].x*16};if(Math.abs(s.guard.x-target.x)<6){s.patrolIndex++;target={x:s.policy.patrol[s.patrolIndex%s.policy.patrol.length].x*16};}}
  }
  s.sees=visible;
  const way=R.chase||R.v2?route(s.guard,target):{dir:Math.abs(target.x-s.guard.x)>4?Math.sign(target.x-s.guard.x):0};
  const gd=way.dir;
  const obstacle=BLOCKS.some(o=>Math.abs((gd>0?o.x:o.x+o.w)-(gd>0?s.guard.x+s.guard.w:s.guard.x))<12&&s.guard.y+s.guard.h>o.y);
  const hunting=visible||(R.chase&&s.lastSeen?.ttl>0)||(H&&H.exit&&s.hasRelic);
  // Stair hops are short and careful, so each one lands on the next step.
  physics(s.guard,gd,(obstacle||way.jump)&&s.guard.grounded,Boolean(way.drop),way.jump?1:(hunting?1.85:R.chase?1.3:1.05)*R.speed);
  if(!s.hidden&&overlaps(s.player,s.guard)){s.status='caught';s.message='Caught. The keeper has your number.';}
  if(s.time>=R.limit){s.status='caught';s.message='Dawn. The house seals its doors.';}
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
// The in-browser keeper: after each heist he learns ONE new thing about this player, and says what.
const PLACES=x=>x<400?'by the crates':x<700?'in the long hall':'by the vault';
const WARDROBES=['the first wardrobe','the middle wardrobe','the wardrobe by the vault'];
// Short labels for the briefing before each night.
export function knownLabels(h,p,rules={}){if(!h)return [];const locked=Boolean(rules.exits&&!rules.exits.includes('door'));return [h.waitAt!=null&&(h.waitAt===52?'HE WAITS FOR YOU UPSTAIRS':`HE WAITS ${PLACES(h.waitAt*16).toUpperCase()}`),h.wardrobe!=null&&`HE OPENS ${WARDROBES[h.wardrobe].toUpperCase()}`,p.decoySkepticism===1&&'HE ONLY CHECKS DECOYS NEARBY',p.decoySkepticism===2&&'HE IGNORES DECOYS',h.window&&'HE WAITS AT THE WINDOW',h.exit&&(locked?'HE RUNS FOR THE WINDOW WHEN THE EMERALD MOVES':'HE RUNS FOR THE DOOR WHEN THE EMERALD MOVES'),h.door&&!locked&&'HE CHECKS THE DOOR'].filter(Boolean);}
export function readHeist(s){
 const way=s.history.filter(h=>!h.hasRelic);
 const upper=way.some(h=>h.player.y<170&&h.player.x>260&&h.player.x<780);
 const ground=way.filter(h=>h.player.y>250&&h.player.x>200&&h.player.x<880);
 // Where the player lingered on the ground floor, in 4-tile buckets.
 const counts={};for(const h of ground){const b=Math.floor(h.player.x/64);counts[b]=(counts[b]||0)+1;}
 const sorted=Object.values(counts).sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)]||0;
 const best=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
 // Walking past is about 5 samples per bucket; lingering means 1.5 s or twice the usual.
 const lingered=best&&best[1]>=15&&best[1]>=2*median;
 const hides=s.events.filter(e=>e.type==='hide').map(e=>e.spot);
 return {window:s.events.some(e=>e.type==='window'),upper,straight:!upper&&!lingered&&ground.length>=10,linger:lingered&&ground.length>=10?Math.min(61,Math.max(2,Math.round((Number(best[0])*64+32)/16))):null,hide:hides.length?hides.at(-1):null,decoys:s.decoysThrown,stole:s.hasRelic,outcome:s.status};
}
export function learnLocal(policy,s){
 const p=validatePolicy(policy,{habits:true}),h=p.habits||{waitAt:null,wardrobe:null,exit:false,door:false,known:[]},r=readHeist(s);
 const note=(key,line)=>{h.known=[...h.known.filter(k=>k.key!==key),{key,line}];p.lesson=line;};
 // Lessons add up: route, wardrobe, decoys, exit and door are separate notes, so learning one never undoes another.
 const routeAt=r.upper?52:r.linger??(r.straight?34:null);
 const sameRoute=h.waitAt!=null&&(r.upper?h.waitAt===52:h.waitAt!==52&&PLACES(h.waitAt*16)===PLACES((routeAt??0)*16));
 if(r.window&&!h.window){h.window=true;note('window','You climbed out the window. Tonight I wait beside it.');}
 else if(routeAt!=null&&!sameRoute){
  const was=h.waitAt;h.waitAt=routeAt;
  note('route',r.upper?(was==null?'You took the upper floor. Tonight I will be waiting up there.':'Upstairs again? I will be waiting up there.'):r.linger!=null?`You took your time ${PLACES(routeAt*16)}. I will be waiting there.`:'You ran straight along the ground floor. I will meet you halfway.');}
 else if(r.hide!=null&&h.wardrobe!==r.hide){h.wardrobe=r.hide;note('wardrobe',`You hid in ${WARDROBES[r.hide]}. I will be opening it.`);}
 else if(r.decoys&&p.decoySkepticism<2){p.decoySkepticism++;note('decoys',p.decoySkepticism===1?'You threw glass to move me. Now I only check it if it is close.':'Broken glass again? I am not coming.');}
 else if(r.stole&&!h.exit){h.exit=true;note('exit','Everyone leaves through the front door. The moment the emerald moves, so do I.');}
 else if(r.outcome==='escaped'&&h.exit&&!h.door){h.door=true;note('door','You got out through the front door again. From now on I check the door too.');}
 else if(r.outcome==='escaped')p.lesson='Nothing new to learn from that. Tomorrow I am simply faster.';
 else if(s.time>=s.rules.limit)p.lesson='Dawn caught you before I did. Next time, be quicker.';
 else p.lesson=`I caught you ${PLACES(s.player.x)}. Same road, same ending. Maybe not the obvious way?`;
 p.habits=h;p.protectRelic=false;
 p.name=['A creature of habit','The note-taker','The note-taker','The student of you','The student of you','He knows you'][Math.min(5,h.known.length)];
 return validatePolicy(p,{habits:true});
}
export function runActions(policy,actions){const s=createGame(policy);for(const a of actions){for(let n=0;n<(a.frames||1);n++){step(s,a.input||a);if(s.status!=='playing')return s;}}return s;}

export function runRound(policy,actions,round){const s=createGame(policy,{round});for(const a of actions){for(let n=0;n<(a.frames||1);n++){step(s,a.input||a);if(s.status!=='playing')return s;}}
 // A trace that runs out is padded with stillness until dawn: the rule is frozen, never a silent escape.
 while(s.status==='playing')step(s,{});return s;}
