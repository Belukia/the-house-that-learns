// The fully trained keeper (8 Nov, Tami asked for "the AI at full strength, almost impossible").
// Game rules, not TrueForge: every lesson of the eight nights at once, faster, and a random start each try (see engine BOSS_*).
import {createGame,step,BOSS_POLICY,BOSS_DRAWS} from './engine.mjs';
import {draw} from './render.mjs';
import {sound} from './sound.mjs';
import {VOICE_LINES} from './voice.mjs';
const $=id=>document.getElementById(id),canvas=$('game');
let state=null,playing=false,wins=0,tries=0,streak=0;const held=new Set();
// Win lines rotate, never the same one twice in a row (Tami, 8 Nov).
const WINS=['You beat him. Nobody will believe you.','I guess you got lucky.','Well. This is unexpected.','You won. It’s not a big thing to brag about.'];let lastWin=-1;
function winLine(){let i=lastWin<0?0:Math.floor(Math.random()*(WINS.length-1));if(lastWin>=0&&i>=lastWin)i++;lastWin=i;return WINS[i];}
// After the last mock they rotate (no counts, never the same twice in a row) instead of repeating the last one (playtest 8 Nov).
let lastMock=null;const mockLine=()=>{if(streak<=MOCK.length)return lastMock=MOCK[streak-1];const o=MOCK.filter(l=>!/^(Twice|Third|Six)/.test(l)&&l!==lastMock);return lastMock=o[Math.floor(Math.random()*o.length)];};
const MOCK=['Well. Maybe you could try again.','Twice. The keeper is starting to feel sorry for you.','Third time lucky? Apparently not.','Have you considered team sports? A nice walk? Anything outdoors, really?','Well. You are just being stubborn now.','Six tries. At this point the emerald is just being polite.','The keeper has put the kettle on. He knows you will be back.','Truly inspiring persistence. Truly uninspiring results.'];
// James says it (the recorded lines, same as the eight-night game).
let clip=null;const say=line=>{const f=VOICE_LINES[line];if(clip){clip.pause();clip=null;}if(!f||!sound.sfxOn)return;const c=new Audio('voice/'+f);clip=c;sound.duck(true);c.onended=()=>{if(clip===c)clip=null;sound.duck(false);};c.play().catch(()=>sound.duck(false));};
// The end-of-run line waits for a line James is still saying (e.g. "Found you…" right before the catch), at most 4 s.
const sayAfter=line=>{const c=clip;if(!c||c.paused||c.ended)return say(line);const t=setTimeout(()=>say(line),4000);c.addEventListener('ended',()=>{clearTimeout(t);say(line);},{once:true});};
// While you play (Tami, 8 Nov): a dry remark when you hide, and when he opens your wardrobe. Each at most once per run.
const QUIPS={hide:'A wardrobe. How original.',found:'Found you. He always checks that one.'};let quipped=new Set();
const draw0=()=>Math.floor(Math.random()*BOSS_DRAWS);
function start(){quipped=new Set();state=createGame(BOSS_POLICY,{boss:true,habits:true,draw:draw0()});playing=true;$('card').classList.add('hidden');sound.enable();sound.play('go');canvas.focus();if(tries===0)setTimeout(()=>say('He has read every one of your nights. Pick one.'),600);}
$('c-go').onclick=start;
const map={a:'left',arrowleft:'left',d:'right',arrowright:'right',' ':'jump',w:'jump',arrowup:'jump',s:'down',arrowdown:'down',shift:'sprint',h:'hide'};
addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(map[key]){held.add(map[key]);if(playing)e.preventDefault();}
 else if(key==='enter'&&!playing&&!$('card').classList.contains('hidden'))start();});
addEventListener('keyup',e=>{const key=e.key.toLowerCase();if(map[key])held.delete(map[key]);});
addEventListener('blur',()=>held.clear());
function tick(){if(!playing)return;const a={left:held.has('left'),right:held.has('right'),jump:held.has('jump'),down:held.has('down'),sprint:held.has('sprint'),hide:held.has('hide'),decoy:false};
 const had=state.hasRelic,ev0=state.events.length;step(state,a);for(const e of state.events.slice(ev0))if(QUIPS[e.type]&&!quipped.has(e.type)){quipped.add(e.type);say(QUIPS[e.type]);}if(!had&&state.hasRelic)sound.play('relic');sound.chasing(state.sees||state.lastSeen?.ttl>0);
 $('m-time').textContent=`${Math.floor(state.time)}s / ${state.rules.limit}s`;
 if(state.status!=='playing'){playing=false;tries++;sound.chasing(false);const won=state.status==='escaped';
  if(state.status==='caught')sound.play(state.cause==='dawn'?'dawn':'caught');else sound.play(state.events.some(e=>e.type==='window')?'window':'escape');
  if(won){wins++;streak=0;}else streak++;$('m-score').textContent=`${wins} of ${tries}`;
  setTimeout(()=>{$('c-kick').textContent=won?'IMPOSSIBLE. ALMOST.':`TRY ${tries} · CAUGHT`;
   const mock=won?null:mockLine();$('c-title').textContent=won?'You beat the fully trained keeper.':`“${mock}”`;
   $('c-result').textContent=won?'Screenshot this. Nobody will believe you.':'He will start somewhere else next time.';$('c-go').textContent='AGAIN';$('card').classList.remove('hidden');sayAfter(won?winLine():mock);},1100);}}
let last=0,acc=0;function frame(t){if(!last)last=t;acc+=Math.min(.05,(t-last)/1000);last=t;while(acc>=1/60){tick();acc-=1/60;}
 if(state)draw(canvas,state,{time:t,started:playing||state.status!=='playing',night:8});requestAnimationFrame(frame);}
state=createGame(BOSS_POLICY,{boss:true,habits:true,draw:0});requestAnimationFrame(frame);
