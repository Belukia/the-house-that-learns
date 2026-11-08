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
 // Five-night game: he keeps every route and wardrobe you used (not just the last), and gets faster when you teach him nothing new.
 const routes=Array.isArray(h.routes)?h.routes.filter(t=>Number.isInteger(t)&&t>=2&&t<=61).slice(-3):[];
 const wardrobes=Array.isArray(h.wardrobes)?h.wardrobes.filter(w=>Number.isInteger(w)&&w>=0&&w<HIDING.length).slice(-3):[];
 const pace=Number.isInteger(h.pace)?Math.max(0,Math.min(3,h.pace)):0;
 return {waitAt:tileX(h.waitAt),wardrobe,exit:Boolean(h.exit),door:Boolean(h.door),window:Boolean(h.window),known,routes,wardrobes,pace,reach:Boolean(h.reach)};
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
// The five-night game: the same house and the same rules every night. Nothing in the house gets harder;
// only the keeper changes, because after every escape he learns one more thing about this player.
export const FIVE_RULES=Object.freeze({limit:50,speed:1.15,vision:200,decoys:0,door:false,chase:true,same:true});
// The eight-night game (8 nov, Tami + builder feedback): ONE new thing per night, explained once on that night's card,
// in small steps, and the keeper never forgets what he learned (same learning as the five-night game: learnFive).
// 1 asleep · 2 he sees you and walks his rounds, no chase; wardrobes · 3 he chases; the stairs lose him · 4 a window upstairs
// · 5 he is faster and the night is shorter (the creaking floor was cut, Tami 8 Nov: it changed nothing) · 6 the candles are out
// · 7 the front door is locked: out through the window · 8 all of it: door locked, in the dark, the emerald in the vault
// (nights 7 and 8 reworked, Tami 8 Nov: the old night 7 shut the window with no reason given. The emerald upstairs on night 8
// sat next to the window: check-eight won it in 5 s, so it stays in the vault and the last night is the long way, in the dark).
// Speeds +0.05 on nights 2-8 except 6 (Tami, 8 Nov: "un chiquitito más rápido"). Night 6 stays 1.1: at 1.15 the dark night with a keeper waiting at the window had no escape (check-eight).
export const EIGHT=Object.freeze({1:{limit:90,speed:1,vision:160,decoys:0,door:false,chase:false,same:true},
 2:{limit:70,speed:1.05,vision:170,decoys:0,door:false,chase:false,same:true,react:30},
 3:{limit:60,speed:1.1,vision:175,post:480,decoys:0,door:false,chase:true,same:true},
 4:{limit:65,speed:1,vision:200,decoys:0,door:false,chase:true,same:true,exits:['door','window']},
 5:{limit:55,speed:1.15,vision:200,decoys:0,door:false,chase:true,same:true,exits:['door','window']},
 6:{limit:45,speed:1.1,vision:175,decoys:0,door:false,chase:true,same:true,exits:['door','window'],dark:true},
 7:{limit:50,speed:1.25,vision:195,decoys:0,door:false,chase:true,same:true,exits:['window']},
 8:{limit:55,speed:1.25,vision:150,decoys:0,door:false,chase:true,same:true,exits:['window'],dark:true}});
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
// Five- and eight-night games: his upstairs post is in the middle of the upper path, where a burglar going over has to pass.
export const UPPER_PATH=560;
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
// The fully trained keeper (8 Nov, Tami): a separate, very hard mode. He knows every lesson the eight nights can teach,
// and he does not start in the same place twice: each try draws one of his learned posts and how long he holds it,
// so the burglar cannot learn one fixed route. Draws are numbered so the simulations can replay them exactly.
export const BOSS_RULES=Object.freeze({limit:55,speed:1.3,vision:185,decoys:0,door:false,chase:true,same:true,exits:['door','window'],eight:true,boss:true});
export const BOSS_STARTS=Object.freeze([{x:UPPER_PATH,up:true},{x:WINDOW.x,up:true},{x:880,up:false},{x:600,up:false}]);
export const BOSS_HOLDS=Object.freeze([360,450,540,630,720,810,900,990]);
// How long he guards the way out once the emerald moves: anywhere from 8 to 20 seconds, or until dawn.
export const BOSS_CAMPS=Object.freeze([480,600,720,840,960,1080,1200,1e9]);
export const BOSS_DRAWS=BOSS_STARTS.length*BOSS_HOLDS.length;
export const BOSS_POLICY=Object.freeze({name:'The fully trained keeper',decoySkepticism:2,protectRelic:false,patrol:[{x:29,y:18},{x:43,y:18}],lesson:'I have read every one of your nights. Pick one.',
 habits:{waitAt:52,wardrobe:1,exit:true,door:true,window:true,routes:[34,52,20],wardrobes:[0,1,2],pace:3,reach:true,known:[]}});
export function createGame(policy=DEFAULT_POLICY,options={}){
 const rules=options.boss?{...BOSS_RULES,...(options.bossRules||{})}:options.round?{...EXAM_V2,...ROUNDS[options.round]}:options.eight?{...(EIGHT[options.night]||EIGHT[1]),eight:true}:options.five?FIVE_RULES:NIGHTS[options.night]||EXAM_RULES;
 const s={rules,player:actor(ENTRY.x,ENTRY.y),guard:actor(options.tutorial?600:480,282),tutorial:Boolean(options.tutorial),turn:0,time:0,patrolIndex:0,dwell:0,policy:options.round?validatePolicyV2(policy):validatePolicy(policy,{habits:Boolean(options.habits)}),suspicion:0,decoys:rules.decoys,noise:null,hidden:false,hasRelic:false,relic:rules.relic||RELIC,status:'playing',message:rules.decoys?'A/D to run, Space to jump, F throws a decoy ahead of you, H hides you in a wardrobe. The emerald is to the right.':'A/D to run, Space to jump, H hides you in a wardrobe. The emerald is to the right.',history:[],inputs:[],events:[],decoysThrown:0,seen:0,lastJump:false,lastDecoy:false,lastHide:false};
 // In the game, a keeper who learned where to wait starts the night already standing there, under the HE WAITS HERE sign.
 // (Only with habits; exams never pass them. Never on top of the entrance.)
 const H=s.policy.habits;
 // He keeps his word: in the five- and eight-night games ('same'), "I will be waiting up there" means up there, chase or not.
 // Night 7 (eight-night game): the emerald is upstairs and he starts beside it, whatever he learned.
 // G5 (playtest 8 Nov): "I will be waiting up there" / "beside the window" are literal. In the five- and eight-night games he
 // holds an upstairs post (the upper path, the window, night 7's emerald) until he sees you, the emerald moves, or 15 s pass.
 // A ground post keeps the old 4.5 s stops: holding the long hall for 15 s on the dark nights left no way through.
 if(rules.boss){const d=((options.draw??0)%BOSS_DRAWS+BOSS_DRAWS)%BOSS_DRAWS,st=BOSS_STARTS[Math.floor(d/BOSS_HOLDS.length)],hold=BOSS_HOLDS[d%BOSS_HOLDS.length];
  s.draw=d;s.campLimit=BOSS_CAMPS[d%BOSS_HOLDS.length];s.guard.x=st.x;s.guard.y=st.up?154:282;if(st.up)s.post={x:st.x,up:true,until:hold};s.message='He knows every trick you taught him. He will not start in the same place twice.';}
 else if(rules.ambush&&!s.tutorial){s.guard.x=rules.ambush;s.guard.y=154;if(rules.same)s.post={x:rules.ambush,up:true,until:rules.post??900};}
 // G5 (playtest 8 Nov): what he says he learned is where he stands. Window first (it is where you got out), then the route.
 else if(H&&H.window&&rules.same&&rules.exits?.includes('window')&&!s.tutorial){s.guard.x=WINDOW.x;s.guard.y=154;s.post={x:WINDOW.x,up:true,until:rules.post??900};}
 else if(H&&H.waitAt!=null&&!s.tutorial){const up=Boolean(rules.chase||rules.same)&&H.waitAt===52,x=up?(rules.ambush??(rules.same?UPPER_PATH:UPPER_AMBUSH)):H.waitAt*16;if(up||Math.abs(x-ENTRY.x)>160){s.guard.x=x;s.guard.y=up?154:282;if(rules.same&&up)s.post={x,up,until:rules.post??900};}}
 return s;
}
function physics(a,dir,jump,drop=false,speed=2.15,jv=6.7){
 a.vx=dir*speed;if(dir)a.facing=Math.sign(dir);
 if(jump&&a.grounded){a.vy=-jv;a.grounded=false;}
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
 // Stairs (playtest 8 Nov): in the game, holding jump jumps again only when the last jump landed you higher (a step up),
 // so one held press climbs a staircase while a held key on flat ground does not bunny-hop.
 if(!input.jump)s.climbing=false;
 // At the foot of a staircase, facing up it, a held jump keeps hopping (shorter hops, one step each): 24/24 starts climb the
 // left stairs and 18/24 the right ones in hilo 4's stairs test (was 16 and 9).
 const zone=s.rules.same&&s.player.grounded&&((dir<0&&s.player.x>770&&s.player.x<960)||(dir>0&&s.player.x>80&&s.player.x<300));
 const wasGrounded=s.player.grounded,y0=s.player.y,rep=Boolean(input.jump&&s.lastJump&&s.rules.same&&(s.climbing||zone));physics(s.player,s.hidden?0:dir,Boolean(input.jump&&(!s.lastJump||rep)),Boolean(input.down),input.sprint?2.65:2.15,rep&&zone?5:6.7);
 if(wasGrounded&&s.player.vy<-6){s.jumping=true;s.jumpFromY=y0;}else if(s.player.grounded){if(!wasGrounded)s.climbing=s.jumpFromY!=null&&s.player.y<s.jumpFromY-4;s.jumping=false;}
 if(input.decoy&&!s.lastDecoy&&s.decoys){s.decoys--;s.decoysThrown++;s.noise={x:Math.max(22,Math.min(990,s.player.x+s.player.facing*135)),y:282,ttl:240};s.message=s.policy.decoySkepticism?'The keeper remembers broken glass.':'Glass shatters. That got his attention.';}
 s.lastJump=Boolean(input.jump);s.lastDecoy=Boolean(input.decoy);s.lastHide=Boolean(input.hide);
 if(!s.hasRelic&&Math.abs(s.player.x-s.relic.x)<22&&Math.abs(s.player.y-s.relic.y)<(s.rules.same&&s.relic.y>200?84:34)){s.hasRelic=true;s.events.push({type:'relic',turn:s.turn});const ex=s.rules.exits||['door'];s.message=!ex.includes('door')?'Emerald acquired! The door is locked: out through the window upstairs (H).':ex.includes('window')?'Emerald acquired! Out the green door, or the window upstairs (H).':'Emerald acquired! Run LEFT to the green door.';}
 const doorOpen=!s.rules.exits||s.rules.exits.includes('door');
 if(s.hasRelic&&s.player.x<68&&s.player.y>250){if(doorOpen){s.status='escaped';s.message='You escaped. The house remembers.';}else if(!s.triedDoor){s.triedDoor=true;s.events.push({type:'locked',turn:s.turn});s.message='Locked. The way out tonight is the window upstairs.';}}
 // Climbing out is done standing at the window (playtest 8 Nov: not in mid-air). The frozen exams (v2 rules) keep their rule.
 if(s.status==='playing'&&s.hasRelic&&s.rules.exits?.includes('window')&&input.hide&&upstairs(s.player)&&(s.rules.v2||s.player.grounded)&&Math.abs(s.player.x-WINDOW.x)<WINDOW.reach){s.status='escaped';s.message='Out through the window.';s.events.push({type:'window',turn:s.turn});}
 // Round 3: the long hall creaks under a sprint. That noise is real: it is where the thief is.
 if(s.rules.same&&!s.tutorial&&s.rules.limit&&s.turn===(s.rules.limit-10)*60)s.message='Ten seconds to dawn. Get out, or get caught by the sun.';
 if(s.rules.creaky&&input.sprint&&dir&&s.player.grounded&&downstairs(s.player)&&s.player.x>400&&s.player.x<640&&!s.noise){s.noise={x:s.player.x,y:282,ttl:90,real:true};s.events.push({type:'creak',turn:s.turn});s.message='CREAK. The floor gave you away. Walk across the long hall.';}
 if(!s.tutorial&&s.status==='playing'){
  // Why he is heading where he is heading; kept so the game can say why you were caught. Scores never read it.
  let why='patrol';s.waitStop=null;
  let visible=!s.hidden&&(s.rules.chase?huntSight(s.guard,s.player,s.rules.vision):sight(s.guard,s.player,s.rules.vision)),target;const H=s.policy.habits,R=s.rules;
  // A keeper who knows your wardrobe opens it when he walks past.
  const opens=!H?[]:R.same&&H.wardrobes?.length?H.wardrobes:H.wardrobe!=null?[H.wardrobe]:[];
  if(!visible&&s.hidden&&opens.some(w=>Math.abs(s.player.x-HIDING[w].x)<26)&&Math.abs(s.guard.x-s.player.x)<30){s.hidden=false;visible=true;s.events.push({type:'found',turn:s.turn});}
  // On the last night he will not be drawn away from the door.
  if(visible&&R.door&&s.player.x>160){why='waiting';s.seen++;s.suspicion=Math.min(100,s.suspicion+.65);s.message='He sees you. He stays by the door.';target={x:s.patrolIndex%2?64:32};if(Math.abs(s.guard.x-target.x)<6)s.patrolIndex++;visible=false;}
  else if(visible){why='seen';target=s.player;s.unseen=0;
   // react (eight-night game, night 2): the first time he sees you, he needs half a second (the "!") before he comes.
   if(R.react){if(s.reactUntil==null)s.reactUntil=s.turn+R.react;if(s.turn<s.reactUntil)target={x:s.guard.x,y:s.guard.y,h:s.guard.h};}
   s.seen++;s.suspicion=Math.min(100,s.suspicion+.65);if(R.chase)s.lastSeen={x:s.player.x,y:s.player.y,h:s.player.h,ttl:360};s.message=R.chase?'He sees you! Run, hide, or lose him on the stairs. Shift sprints.':'He sees you! Jump, hide, or take the upper floor.';}
  else{s.suspicion=Math.max(0,s.suspicion-.35);
   // A hunter goes to where he last saw you for six seconds before giving up.
   if(R.chase&&s.lastSeen?.ttl>0){why='seen';target=s.lastSeen;s.lastSeen.ttl--;if(Math.abs(s.guard.x-target.x)<8&&upstairs(s.guard)===upstairs(target))s.lastSeen.ttl=0;if((s.unseen=(s.unseen||0)+1)>60)s.message='He lost you. He is looking.';}
   else if(s.noise&&((s.noise.real&&!R.v2)||!s.policy.decoySkepticism||(s.policy.decoySkepticism===1&&Math.abs(s.guard.x-s.noise.x)<70))){why=s.noise.real?'heard':'glass';target=s.noise;}
   else if(R.door){why='waiting';target={x:s.patrolIndex%2?64:32};if(Math.abs(s.guard.x-target.x)<6)s.patrolIndex++;}
   // Game (same rules): the exit camp lasts about 7 s (playtest 8 Nov: camping forever made the last nights unwinnable).
   else if(H&&H.exit&&s.hasRelic&&!(R.same&&(s.camp||0)>(s.campLimit??420))){why='exit';const win=R.exits?.includes('window'),doorOk=!R.exits||R.exits.includes('door');
    // On the hunting nights he reads you: he runs to the way out nearest to you (the window if you are upstairs).
    // The fully trained keeper knows burglars love the window: with the emerald gone, he covers it first.
    target=win&&(R.boss||!doorOk||(R.chase?upstairs(s.player):H.window))?{x:WINDOW.x,up:true}:{x:92};
    if(R.same&&Math.abs(s.guard.x-target.x)<14&&upstairs(s.guard)===Boolean(target.up))s.camp=(s.camp||0)+1;}
   // The fully trained keeper, done guarding the way out, comes looking for you where the emerald was: waiting him out has a cost.
   else if(R.boss&&s.hasRelic){why='waiting';target={x:930};}
   else if(s.policy.protectRelic&&!s.hasRelic){why='waiting';target={x:900};}
   else if(H&&(H.waitAt!=null||H.wardrobe!=null||(H.door&&(!R.exits||R.exits.includes('door')))||(H.window&&R.exits?.includes('window')))){
    // Wait where this player was last time; check their wardrobe on the way. Two seconds at each stop.
    // A hunter who saw you take the upper floor waits for you up there.
    why='waiting';
    if(s.post&&(s.hasRelic||s.seen||s.turn>=s.post.until))s.post=null;
    // On his post he paces a few steps either side of it (he never stands still), always across the route.
    if(s.post){target={x:s.post.x+(Math.floor(s.turn/75)%2?40:-40),up:s.post.up};s.waitStop=s.post;}else{
    // Five-night game: he watches every route this player has used, not only the last one.
    const routes=R.same&&H.routes?.length?H.routes:H.waitAt!=null?[H.waitAt]:[];
    const stops=[...(R.ambush?[{x:R.ambush,up:true}]:[]),...routes.filter(t=>!(R.ambush&&t===52)).map(t=>(R.chase||R.same)&&t===52?{x:R.ambush??(R.same?UPPER_PATH:UPPER_AMBUSH),up:true}:{x:t*16,up:false}),...(H.wardrobe!=null?[{x:HIDING[H.wardrobe].x,up:false}]:[]),...(H.door&&(!R.exits||R.exits.includes('door'))?[{x:80,up:false}]:[]),...(H.window&&R.exits?.includes('window')?[{x:WINDOW.x,up:true}]:[])];
    const stop=stops[s.patrolIndex%stops.length];s.waitStop=stop;
    // Five-night game: he never stands still. With one place to watch, he paces up and down beside it.
    if(R.same&&stops.length===1){const x=Math.max(stop.up?250:40,Math.min(stop.up?780:980,stop.x+(s.patrolIndex%2?56:-56)));target={x,up:stop.up};
     if(Math.abs(s.guard.x-x)<6&&upstairs(s.guard)===stop.up&&++s.dwell>=40){s.dwell=0;s.patrolIndex++;}}
    else{target=stop;if(Math.abs(s.guard.x-target.x)<6&&(!(R.chase||R.same)||upstairs(s.guard)===target.up)&&++s.dwell>=(R.same?270:stops.length>1?120:1e9)){s.dwell=0;s.patrolIndex++;}}
   }}
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
  if(visible&&!s.sees)s.spotted={x:Math.round(s.player.x),y:Math.round(s.player.y)};
  s.sees=visible;s.why=why;
  const way=R.chase||R.v2||R.same?route(s.guard,target):{dir:Math.abs(target.x-s.guard.x)>4?Math.sign(target.x-s.guard.x):0};
  const gd=way.dir;
  const obstacle=BLOCKS.some(o=>Math.abs((gd>0?o.x:o.x+o.w)-(gd>0?s.guard.x+s.guard.w:s.guard.x))<12&&s.guard.y+s.guard.h>o.y);
  const hunting=visible||(R.chase&&s.lastSeen?.ttl>0)||(H&&H.exit&&s.hasRelic);
  // Stair hops are short and careful, so each one lands on the next step.
  // walkable (eight-night game, night 5: running makes the floor creak): a walk must still outpace him (playtest 8 Nov).
  physics(s.guard,gd,(obstacle||way.jump)&&s.guard.grounded,Boolean(way.drop),way.jump?1:Math.min(R.walkable?2.05:Infinity,(hunting?1.85:R.chase?1.3:1.05)*R.speed*(R.same&&H?1+.06*H.pace:1)));
  // Five-night game: he notices when the burglar jumps right over his head. Once he has learned it (reach), he grabs upward and it no longer works.
  if(R.same&&!R.eight){const p=s.player,g=s.guard;if(!p.grounded&&s.jumping&&p.x<g.x+g.w&&p.x+p.w>g.x&&p.y+p.h<=g.y+2&&g.y-(p.y+p.h)<64&&upstairs(p)===upstairs(g)&&!(s.overAt>s.turn-45)){s.overAt=s.turn;s.events.push({type:'over',turn:s.turn});}}
  // The fully trained keeper reaches higher and wider: hopping over him only works in a split-second window as he charges (playtest 8 Nov).
  const grabbed=overlaps(s.player,s.guard)||Boolean(R.same&&H?.reach&&overlaps(s.player,R.boss?{x:s.guard.x-10,y:s.guard.y-36,w:s.guard.w+20,h:s.guard.h+36}:{x:s.guard.x-3,y:s.guard.y-52,w:s.guard.w+6,h:s.guard.h+52}));
  // Game (same rules): standing right next to him for a second is a catch (playtest 8 Nov: he stood beside a burglar by the
  // crates for a minute without catching him). The exams keep overlap only.
  const close=R.same&&!s.hidden&&Math.abs(s.guard.x-s.player.x)<28&&Math.abs(s.guard.y-s.player.y)<40;s.nearFor=close?(s.nearFor||0)+1:0;
  if(!s.hidden&&(grabbed||s.nearFor>=60)){s.status='caught';s.cause=why==='patrol'?'seen':why;s.message='Caught. The keeper has your number.';}
  if(s.time>=R.limit){s.status='caught';s.cause='dawn';s.message='Dawn. The house seals its doors.';}
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
export function knownLabels(h,p,rules={}){if(!h)return [];const locked=Boolean(rules.exits&&!rules.exits.includes('door'));
 const routes=rules.same&&h.routes?.length?h.routes:h.waitAt!=null?[h.waitAt]:[],wards=rules.same&&h.wardrobes?.length?h.wardrobes:h.wardrobe!=null?[h.wardrobe]:[];
 return [...routes.map(t=>t===52?'HE WAITS FOR YOU UPSTAIRS':`HE WAITS ${PLACES(t*16).toUpperCase()}`),...wards.map(w=>`HE OPENS ${WARDROBES[w].toUpperCase()}`),rules.same&&h.reach&&'HE REACHES UP: NO JUMPING OVER HIM',rules.same&&h.pace&&'HE IS FASTER',p.decoySkepticism===1&&'HE ONLY CHECKS DECOYS NEARBY',p.decoySkepticism===2&&'HE IGNORES DECOYS',h.window&&(!rules.exits||rules.exits.includes('window'))&&'HE WAITS AT THE WINDOW',h.exit&&(locked?'HE RUNS FOR THE WINDOW WHEN THE EMERALD MOVES':'HE RUNS FOR THE DOOR WHEN THE EMERALD MOVES'),h.door&&!locked&&'HE CHECKS THE DOOR'].filter(Boolean);}
export function readHeist(s){
 const way=s.history.filter(h=>!h.hasRelic);
 const upper=way.some(h=>h.player.y<170&&h.player.x>260&&h.player.x<780);
 // Time hidden in a wardrobe is not time spent on the floor (playtest 8 Nov): only visible samples count.
 const ground=way.filter(h=>!h.hidden&&h.player.y>250&&h.player.x>200&&h.player.x<880);
 // Where the player lingered on the ground floor, in 4-tile buckets.
 const counts={};for(const h of ground){const b=Math.floor(h.player.x/64);counts[b]=(counts[b]||0)+1;}
 const sorted=Object.values(counts).sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)]||0;
 const best=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
 // Walking past is about 5 samples per bucket; lingering means 1.5 s or twice the usual.
 const lingered=best&&best[1]>=15&&best[1]>=2*median;
 const hides=s.events.filter(e=>e.type==='hide').map(e=>e.spot);
 return {window:s.events.some(e=>e.type==='window'),over:s.events.some(e=>e.type==='over'),upper,straight:!upper&&!lingered&&ground.length>=10,linger:lingered&&ground.length>=10?Math.min(61,Math.max(2,Math.round((Number(best[0])*64+32)/16))):null,hide:hides.length?hides.at(-1):null,decoys:s.decoysThrown,stole:s.hasRelic,outcome:s.status};
}
export function learnLocal(policy,s){
 const p=validatePolicy(policy,{habits:true}),h=p.habits||{waitAt:null,wardrobe:null,exit:false,door:false,known:[],routes:[],wardrobes:[],pace:0},r=readHeist(s);
 const note=(key,line)=>{h.known=[...h.known.filter(k=>k.key!==key),{key,line}];p.lesson=line;};
 if(s.rules.same)learnFive(p,h,r,s,note);else learnTen(p,h,r,s,note);
 p.habits=h;p.protectRelic=false;
 p.name=['A creature of habit','The note-taker','The note-taker','The student of you','The student of you','He knows you'][Math.min(5,h.known.length)];
 return validatePolicy(p,{habits:true});
}
// Five-night game: one new thing per escape, and nothing is forgotten. A second route is watched as well as the first.
// Five-night lessons use the exact words James already recorded (dist/voice), so every note can be heard.
function learnFive(p,h,r,s,note){
 const routeAt=r.upper?52:r.linger??(r.straight?34:null),place=t=>t===52?'up':PLACES(t*16).split(' ').at(-1);
 // Eight-night game: from night 4 there is a window; climbing out of it is the first thing he learns.
 if(r.window&&!h.window){h.window=true;note('window','You climbed out the window. Tonight I wait beside it.');}
 else if(routeAt!=null&&!h.routes.some(t=>place(t)===place(routeAt))){
  h.routes=[...h.routes,routeAt].slice(-3);h.waitAt=routeAt;
  note('route-'+place(routeAt),r.upper?'You took the upper floor. Tonight I will be waiting up there.'
   :r.linger!=null?`You took your time ${PLACES(routeAt*16)}. I will be waiting there.`
   :'You ran straight along the ground floor. I will meet you halfway.');}
 else if(r.over&&!h.reach){h.reach=true;note('reach','You jumped right over my head. Tonight I reach up.');}
 else if(r.hide!=null&&!h.wardrobes.includes(r.hide)){h.wardrobes=[...h.wardrobes,r.hide];h.wardrobe=r.hide;note('wardrobe-'+r.hide,`You hid in ${WARDROBES[r.hide]}. I will be opening it.`);}
 else if(r.stole&&!h.exit){h.exit=true;note('exit',r.window?'You went for the window the moment the emerald was yours. Now the moment it moves, so do I.':'Everyone leaves through the front door. The moment the emerald moves, so do I.');}
 else if(r.outcome==='escaped'&&!r.window&&!h.door){h.door=true;note('door','You got out through the front door again. From now on I check the door too.');}
 else if(r.outcome==='escaped'&&h.pace<3){h.pace++;note('pace',['Nothing new to learn from that. Tomorrow I am simply faster.','The same way out again. I will not learn more from it, so I will be quicker.','Still nothing new. Fine: faster again. Show me something I have not seen.'][h.pace-1]);}
 else if(r.outcome==='escaped')p.lesson='The same trick again. I have nothing left to learn from you. For now.';
}
function learnTen(p,h,r,s,note){
 // Lessons add up: route, wardrobe, decoys, exit and door are separate notes, so learning one never undoes another.
 const routeAt=r.upper?52:r.linger??(r.straight?34:null);
 const sameRoute=h.waitAt!=null&&(r.upper?h.waitAt===52:h.waitAt!==52&&PLACES(h.waitAt*16)===PLACES((routeAt??0)*16));
 if(r.window&&!h.window){h.window=true;note('window','You climbed out the window. Tonight I wait beside it.');}
 else if(routeAt!=null&&!sameRoute){
  h.waitAt=routeAt;
  note('route',r.upper?'You took the upper floor. Tonight I will be waiting up there.':r.linger!=null?`You took your time ${PLACES(routeAt*16)}. I will be waiting there.`:'You ran straight along the ground floor. I will meet you halfway.');}
 else if(r.hide!=null&&h.wardrobe!==r.hide){h.wardrobe=r.hide;note('wardrobe',`You hid in ${WARDROBES[r.hide]}. I will be opening it.`);}
 else if(r.decoys&&p.decoySkepticism<2){p.decoySkepticism++;note('decoys',p.decoySkepticism===1?'You threw glass to move me. Now I only check it if it is close.':'Broken glass again? I am not coming.');}
 else if(r.stole&&!h.exit){h.exit=true;note('exit','Everyone leaves through the front door. The moment the emerald moves, so do I.');}
 else if(r.outcome==='escaped'&&h.exit&&!h.door){h.door=true;note('door','You got out through the front door again. From now on I check the door too.');}
 else if(r.outcome==='escaped')p.lesson='Nothing new to learn from that. Tomorrow I am simply faster.';
 else if(s.time>=s.rules.limit)p.lesson='Dawn caught you before I did. Next time, be quicker.';
 else p.lesson=`I caught you ${PLACES(s.player.x)}. Same road, same ending. Maybe not the obvious way?`;
}
export function runActions(policy,actions){const s=createGame(policy);for(const a of actions){for(let n=0;n<(a.frames||1);n++){step(s,a.input||a);if(s.status!=='playing')return s;}}return s;}

export function runRound(policy,actions,round){const s=createGame(policy,{round});for(const a of actions){for(let n=0;n<(a.frames||1);n++){step(s,a.input||a);if(s.status!=='playing')return s;}}
 // A trace that runs out is padded with stillness until dawn: the rule is frozen, never a silent escape.
 while(s.status==='playing')step(s,{});return s;}
