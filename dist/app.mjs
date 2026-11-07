import {createGame,step,summarize,learnLocal,validatePolicy,DEFAULT_POLICY,upstairs,knownLabels} from './engine.mjs';
import {draw} from './render.mjs';
import {opening,commentary,aftermath,taunt,retryLine} from './narrator.mjs';
import {VOICE_LINES} from './voice.mjs';
import {sound} from './sound.mjs';
const $=id=>document.getElementById(id), canvas=$('game');
const KEY='blackthorn-platformer-v4',LAST=10;let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
const H={habits:true};let policy;try{policy=validatePolicy(saved.policy||DEFAULT_POLICY,H)}catch{policy=validatePolicy(DEFAULT_POLICY,H)}
let memories=Array.isArray(saved.memories)?saved.memories.slice(-12):[],night=Number.isInteger(saved.night)?Math.max(1,saved.night):1;
let courtesyCompleted=Boolean(saved.courtesyCompleted??memories.some(m=>m.outcome==='escaped'));
// You stay on a night until you escape it. attempt = the try you are on tonight; tries = every try so far.
let attempt=Number.isInteger(saved.attempt)?Math.max(1,saved.attempt):1,tries=Number.isInteger(saved.tries)?Math.max(0,saved.tries):0;
const newGame=()=>createGame(policy,{tutorial:!courtesyCompleted,habits:true,night:Math.min(LAST,night)});
// Before every night: the goal, in one or two sentences. How to do it is the player's problem.
const GOAL={1:'Take the emerald from the vault (far right) and bring it back out of the green door. He is asleep tonight.',
 2:'Same job. Now he is awake: he chases what he sees, on both floors. Get out before dawn, in 55 seconds.',
 3:'A window has opened upstairs, above the door: a second way out. Stand at it with the emerald and press H. 50 seconds.',
 4:'He is faster and sees further. 45 seconds.',5:'The fastest he has been. 40 seconds.',
 6:'The long hall downstairs creaks if you sprint across it, and he comes to the noise. 45 seconds.',
 7:'The candles are out. You only see what is near you, and so does he. 45 seconds.',
 8:'The front door is padlocked, and there is no key. Out through the window upstairs: stand at it with the emerald and press H. 45 seconds.',
 9:'The emerald has been moved upstairs. Find it, then get out. 45 seconds.',
 10:'All of it at once: the hall creaks, the candles are out, the door is padlocked and the emerald is upstairs. 50 seconds.'};
// The status line while you play: the goal, shorter.
const SHORT={1:'Emerald: far right. Way out: the green door.',2:'Get the emerald out before dawn.',3:'Two ways out: the door, or the window upstairs (H).',4:'Two ways out: the door, or the window upstairs (H).',5:'Two ways out: the door, or the window upstairs (H).',6:'Walk across the long hall. Sprinting creaks.',7:'Candles out. Stay out of his lantern.',8:'Door padlocked. Out through the window upstairs (H).',9:'The emerald is upstairs now.',10:'Window only. Emerald upstairs. Walk the hall.'};
// What the keeper says when he catches you: he has nothing to learn, so he changes nothing.
const HOLD={seen:'I saw you coming. I will not change a thing.',heard:'The floor told me where you were. I will not change a thing.',waiting:'I was right where I said I would be. I will not change a thing.',exit:'You ran for the door. So did I. I will not change a thing.',patrol:'You walked right into me. I will not change a thing.',glass:'I came to the noise, and there you were. I will not change a thing.',dawn:'The sun did my job for me. Same plan tonight.'};
const CAUSE={seen:'He saw you.',heard:'He heard the floor creak.',waiting:'He was waiting for you there.',exit:'He ran to the exit the moment the emerald moved.',patrol:'You walked into his rounds.',glass:'He came to the noise.',dawn:'The sun came up.'};
let shownBook='';
let state=newGame(),started=false,briefing=false,replay=null,replayTimer=null,learning=false,epoch=0,runtime={configured:false},soundChosen=false,usedLines=new Set(),lastLine='',lastLineAt=0,stillSince=0,walked=0;
state.message=SHORT[Math.min(LAST,night)]||state.message;
function save(){try{localStorage.setItem(KEY,JSON.stringify({policy,memories,night,courtesyCompleted,attempt,tries}))}catch{}}
// On phones there is no keyboard: the text talks about buttons, not keys.
const touch=matchMedia('(max-width:750px),(pointer:coarse)').matches;
// Touch screens get the touch controls at any width (a phone on its side is wider than 750 px).
if(matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');
const forScreen=m=>!touch||!m?m:m.replace(/A\/D to run, Space to jump, F throws a decoy ahead of you, H hides you in a wardrobe\./,'Arrows to run, ↑ to jump, HIDE at a wardrobe.').replace(' Shift sprints.','').replace(/press H/g,'tap HIDE').replace(/\(H\)/g,'(HIDE)');
const shownNight=()=>Math.min(LAST,night);
// ---- Voice: the recorded lines (ElevenLabs) play as recorded; any other line is read by the browser's own voice.
let clip=null,utter=null;
function hush(){if(clip){clip.pause();clip=null;}if('speechSynthesis' in window)speechSynthesis.cancel();sound.duck(false);}
function speak(line){if(!('speechSynthesis' in window))return;speechSynthesis.cancel();utter=new SpeechSynthesisUtterance(line);utter.lang='en-GB';utter.rate=.95;utter.pitch=.9;
 const v=speechSynthesis.getVoices();utter.voice=v.find(x=>/Daniel|Arthur|Oliver|George/.test(x.name)&&x.lang.startsWith('en-GB'))||v.find(x=>x.lang==='en-GB')||null;
 utter.onend=()=>sound.duck(false);sound.duck(true);speechSynthesis.speak(utter);}
function narrate(line){$('narrator').textContent=line;lastLine=line;lastLineAt=performance.now();if(!sound.on)return;hush();
 const file=VOICE_LINES[line];if(!file)return speak(line);clip=new Audio('voice/'+file);clip.volume=1;sound.duck(true);clip.onended=()=>sound.duck(false);clip.play().catch(()=>speak(line));}
function setSound(on){soundChosen=true;if(on)sound.enable();else{sound.disable();hush();}
 $('sound').textContent=on?'🔊 Sound on':'🔇 Sound off';$('sound').setAttribute('aria-pressed',String(on));
 $('sound-hint').innerHTML=on?'Sound is on · <u>turn it off</u>':'Sound is off · <u>turn it on</u>';}
function text(tag,content){const e=document.createElement(tag);e.textContent=content;return e;}
function showKnown(){const k=policy.habits?.known||[];$('known').replaceChildren(...(k.length?[text('li','WHAT HE KNOWS ABOUT YOU'),...k.map((n,i)=>{const li=text('li',n.line);if(i===k.length-1&&memories.at(-1)?.newKey===n.key)li.className='new';return li;})]:[]));}
function refresh(){
 const label=`Night ${shownNight()} / ${LAST}`+(attempt>1?` · try ${attempt}`:'');$('night').textContent=label;$('board-night').textContent=label;
 $('turns').textContent=`${Math.floor(state.time)}s / ${state.tutorial?'∞':state.rules.limit+'s'}`;$('turns').style.color=!state.tutorial&&state.rules.limit-state.time<=10?'#e8604c':'';
 $('message').textContent=forScreen(state.message);
 $('suspicion').style.width=`${state.suspicion}%`;$('suspicion-label').textContent=state.suspicion>=68?'ON YOUR HEELS':state.suspicion?'SUSPICIOUS':'UNAWARE';
 $('suspicion-label').style.color=state.suspicion?'#b95b45':'#36584b';
 $('keeper-name').textContent=memories.length?policy.name:'A creature of habit.';
 const live=started&&!briefing&&state.status==='playing';
 for(const id of ['wait','hide','restart','t-hide','t-restart'])$(id).disabled=!live;
 document.querySelectorAll('[data-move]').forEach(e=>e.disabled=!live);
 $('memory-count').textContent=String(memories.length).padStart(2,'0');
 // The black book is redrawn only when he writes something new (redrawing it ten times a second made it flicker).
 const bookKey=memories.map(m=>m.night+':'+m.lesson).join('|');if(memories.length&&bookKey!==shownBook){shownBook=bookKey;$('memories').replaceChildren(...memories.slice(-2).reverse().map(m=>{const d=document.createElement('div');d.className='memory';d.append(text('b',`NIGHT ${String(m.night).padStart(2,'0')} · OUTWITTED${m.tries>1?` ON TRY ${m.tries}`:''}`),text('p',m.lesson));return d;}));}
 $('policy-view').textContent=`Behavior: ${policy.name}\nWhat he knows about you:\n${(policy.habits?.known||[]).map(k=>'· '+k.line).join('\n')||'· Nothing yet.'}\nCompleted heists remembered: ${memories.length}`;
 $('runtime-label').textContent=runtime.configured?'TrueForge bridge configured. Completed heists will request a candidate skill revision.':'In this browser the keeper learns with simple game rules. The TrueForge agent learned in a separate exam (see the article below the game).';
}
const held=new Set();let accumulator=0,lastTime=0;
// A night starts with its goal on screen, and waits for GO.
function begin(){if(night>LAST)return startOver();held.clear();accumulator=0;clearInterval(replayTimer);replay=null;usedLines=new Set();state=newGame();state.message=SHORT[shownNight()]||state.message;started=true;briefing=true;
 $('intro').classList.add('hidden');$('result').classList.add('hidden');
 $('brief-night').textContent=`Night ${shownNight()} of ${LAST}`+(attempt>1?` · try ${attempt}`:'');$('brief-goal').textContent=forScreen(GOAL[shownNight()]);
 const k=state.tutorial?[]:knownLabels(policy.habits,policy,state.rules);$('brief-known').replaceChildren(...k.map(l=>text('li',l.toLowerCase())));$('brief-known-wrap').classList.toggle('hidden',!k.length);
 $('brief').classList.remove('hidden');refresh();$('go').focus();}
function go(){briefing=false;$('brief').classList.add('hidden');stillSince=performance.now();walked=0;sound.play('go');
 narrate(attempt>1?retryLine(attempt):opening(state.tutorial,shownNight(),!state.tutorial&&policy.habits?.known?.length?policy.lesson:null));refresh();canvas.focus();}
function sfx(before,a){
 const fresh=state.events.slice(before.events);
 if(fresh.some(e=>e.type==='creak'))sound.play('creak');
 if(fresh.some(e=>e.type==='locked'))sound.play('locked');
 if(state.hasRelic&&!before.hasRelic)sound.play('relic');
 if(state.hidden&&!before.hidden)sound.play('hide');
 if(state.sees&&!before.sees)sound.play('spotted');
 if(a.jump&&state.player.vy<0&&before.vy>=0)sound.play('jump');
 if(state.player.grounded&&Math.abs(state.player.vx)>.1){walked+=Math.abs(state.player.vx);if(walked>(a.sprint?26:20)){walked=0;sound.play('step',{loud:a.sprint});}}
 sound.chasing(!state.tutorial&&(state.sees||state.lastSeen?.ttl>0));
}
function tick(){if(!started||briefing||state.status!=='playing'||learning||document.querySelector('dialog[open]'))return;
 const a={left:held.has('a')||held.has('arrowleft'),right:held.has('d')||held.has('arrowright'),jump:held.has(' ')||held.has('w')||held.has('arrowup'),down:held.has('s')||held.has('arrowdown'),sprint:held.has('shift'),hide:held.has('h'),decoy:false};
 const before={events:state.events.length,turn:state.turn,hasRelic:state.hasRelic,suspicion:state.suspicion,hidden:state.hidden,sees:state.sees,vy:state.player.vy,playerUp:upstairs(state.player),guardUp:upstairs(state.guard)};step(state,a);
 sfx(before,a);
 const now=performance.now();if(a.left||a.right||a.jump||a.down)stillSince=now;
 let line=commentary({state,before,action:a,night:shownNight(),used:usedLines});
 // Quiet for 6 seconds? The narrator finds something to say.
 if(!line&&state.status==='playing'&&now-lastLineAt>6000)line=taunt({state,stillFor:(now-stillSince)/1000,last:lastLine});
 if(line)narrate(line);
 if(state.turn%6===0||state.status!=='playing')refresh();if(state.status!=='playing')finish();
}
async function finish(){
 sound.chasing(false);
 if(state.status==='caught')sound.play(state.cause==='dawn'?'dawn':'caught');else if(state.status==='escaped')sound.play(state.events.some(e=>e.type==='window')?'window':'escape');
 // Hold the CAUGHT frame on the board for a beat, so you can see why, before the card covers it.
 if(state.status==='caught'){const e=epoch;await new Promise(r=>setTimeout(r,1700));if(e!==epoch)return;}
 learning=true;const thisEpoch=epoch,episode=summarize(state),prior=validatePolicy(policy,H),won=episode.outcome==='escaped';tries++;
 const ending=aftermath(episode,shownNight(),state.tutorial),lastWin=won&&night>=LAST;
 // The last night closes the game: the house keeps score.
 if(lastWin)Object.assign(ending,{kicker:`${LAST} NIGHTS · ${tries} TRIES`,title:'Impossible.',copy:`The burglar beat all ${LAST} nights, in ${tries} tries. The house is quietly rewriting its rules.`});
 $('result').querySelector('.result-card').classList.toggle('final',lastWin);$('result-title').textContent=ending.title;$('result-kicker').textContent=ending.kicker;$('result-copy').textContent=ending.copy;$('challenge-line').textContent=ending.challenge;
 $('result-cause').textContent=state.status==='caught'?CAUSE[state.cause]||'':won?(state.events.some(e=>e.type==='window')?'Out through the window.':'Out through the front door.'):'';
 narrate(ending.challenge);$('known').replaceChildren();$('learn-status').textContent='';
 // Caught: you stay on this night. He learns nothing from catching you, so you can learn his pattern.
 if(!won){attempt++;save();$('lesson').textContent=`“${HOLD[state.cause]||'I will not change a thing.'}”`;
  $('again').innerHTML='TRY AGAIN <span>→</span>';$('again').disabled=false;$('replay').disabled=false;$('result').classList.remove('hidden');learning=false;refresh();return;}
 $('lesson').textContent='“Let me think about what you just did…”';
 $('again').disabled=true;$('replay').disabled=true;$('result').classList.remove('hidden');refresh();
 // Escaped: he learns how you did it, and the next night uses it.
 let next,mode='local',sessionId;
 if(runtime.configured){try{const response=await fetch('/api/learn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({episode,policy:prior})});const data=await response.json();if(!response.ok)throw Error(data.error||'Learning request failed');next=validatePolicy(data.policy,H);mode='trueforge';sessionId=data.sessionId;}
 catch(e){$('learn-status').textContent='TrueForge was unavailable. This lesson uses local game rules.';}}
 if(thisEpoch!==epoch)return;
 policy=next||learnLocal(prior,state);if(state.tutorial)courtesyCompleted=true;memories.push({night,outcome:episode.outcome,courtesy:state.tutorial,tries:attempt,lesson:policy.lesson,mode,sessionId,newKey:(policy.habits?.known||[]).find(k=>k.line===policy.lesson)?.key});memories=memories.slice(-12);night++;attempt=1;save();
 $('lesson').textContent=`“${policy.lesson}”`;showKnown();if(mode==='trueforge')$('learn-status').textContent=`TrueForge proposed a skill revision · candidate, not yet active · ${sessionId}`;
 // Buttons say what they do.
 $('again').innerHTML=night>LAST?'PLAY AGAIN <span>→</span>':`NIGHT ${Math.min(LAST,night)} <span>→</span>`;
 $('again').disabled=false;$('replay').disabled=false;learning=false;refresh();
}
const controlKeys=new Set(['a','d','w','s','arrowleft','arrowright','arrowup','arrowdown',' ','shift','h']);
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA/.test(e.target.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;const k=e.key.toLowerCase();
 if(briefing&&(k==='enter'||k===' ')){e.preventDefault();return go();}
 if(controlKeys.has(k)&&started&&!briefing&&state.status==='playing'){e.preventDefault();held.add(k);}});
window.addEventListener('keyup',e=>held.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{held.clear();accumulator=0;});
document.addEventListener('visibilitychange',()=>{held.clear();lastTime=0;});
canvas.addEventListener('pointerdown',()=>canvas.focus());
// A quick tap still counts: the key stays held for at least 120 ms.
function bindHold(el,key){let downAt=0;el.addEventListener('pointerdown',e=>{e.preventDefault();if(el.disabled)return;try{el.setPointerCapture(e.pointerId)}catch{}downAt=performance.now();held.add(key);});for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,()=>setTimeout(()=>held.delete(key),Math.max(0,120-(performance.now()-downAt))));}
// Sound comes on with the first ROB THE HOUSE, unless the player turned it off first. The tap is what lets the browser play it.
$('start').onclick=()=>{if(!soundChosen)setSound(true);else if(sound.on)sound.enable();begin();};
$('again').onclick=begin;$('go').onclick=go;
bindHold($('wait'),' ');bindHold($('hide'),'h');bindHold($('t-hide'),'h');
// Restarting mid-heist teaches the keeper nothing and does not use up the night.
const restart=()=>{held.clear();epoch++;learning=false;begin();};$('restart').onclick=restart;$('t-restart').onclick=restart;
document.querySelectorAll('[data-move]').forEach(b=>bindHold(b,b.dataset.move==='-1,0'?'a':b.dataset.move==='1,0'?'d':b.dataset.move==='0,1'?'s':' '));
$('replay').onclick=()=>{clearInterval(replayTimer);$('result').classList.add('hidden');let i=0;replay=[];$('message').textContent='The burglar’s footsteps, retraced. The keeper was watching all of them.';replayTimer=setInterval(()=>{if(i>=state.history.length){clearInterval(replayTimer);$('result').classList.remove('hidden');return;}replay.push(state.history[i++].player);},95);};
for(const [b,d] of [['lab','notes-dialog'],['how','help-dialog'],['privacy','privacy-dialog']])$(b).onclick=()=>{refresh();held.clear();$(d).showModal();};
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
function startOver(){epoch++;learning=false;memories=[];night=1;attempt=1;tries=0;shownBook='';courtesyCompleted=false;policy=validatePolicy(DEFAULT_POLICY,H);save();$('memories').innerHTML='<div class="empty-memory"><span>“</span><p>Nothing to remember.<br>How fortunate for you.</p></div>';begin();refresh();}
$('forget').onclick=()=>{$('notes-dialog').close();startOver();};
$('download').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,mode:memories.at(-1)?.mode||'local',policy,memories,episode:summarize(state),history:state.history},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='blackthorn-field-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('sound').onclick=()=>{setSound(!sound.on);if(sound.on)narrate($('narrator').textContent);};
$('sound-hint').onclick=()=>setSound(!(soundChosen?sound.on:true));
// Full screen: the real thing where the browser allows it (Android, computers); elsewhere (iPhone) a game mode that covers the page.
const column=document.querySelector('.board-column');
const fsElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
function setFullLabel(){const full=fsElement()||document.body.classList.contains('game-mode');$('fullscreen').textContent=full?'✕ Exit full screen':'⤢ Full screen';}
function gameMode(on){document.body.classList.toggle('game-mode',on);if(on)window.scrollTo(0,0);setFullLabel();}
$('fullscreen').onclick=()=>{
 if(fsElement()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);return;}
 if(document.body.classList.contains('game-mode'))return gameMode(false);
 // The request must happen inside the click itself, before anything is awaited, or the browser refuses it.
 const req=column.requestFullscreen||column.webkitRequestFullscreen;
 if(!req)return gameMode(true);
 try{const p=req.call(column);if(p&&p.then)p.then(()=>{setFullLabel();try{screen.orientation?.lock?.('landscape').catch(()=>{})}catch{}},()=>gameMode(true));}catch{gameMode(true);}
 // Some browsers neither open full screen nor refuse it. If nothing happened after a moment, cover the page instead.
 setTimeout(()=>{if(!fsElement())gameMode(true);},900);
};
document.addEventListener('fullscreenchange',setFullLabel);document.addEventListener('webkitfullscreenchange',setFullLabel);
fetch('/api/status').then(r=>r.ok?r.json():{}).then(d=>{runtime=d;refresh();}).catch(()=>{});
refresh();
function frame(time){if(!lastTime)lastTime=time;const dt=Math.min(.05,(time-lastTime)/1000);lastTime=time;
 if(!document.hidden&&document.hasFocus()){accumulator+=dt;while(accumulator>=1/60){tick();accumulator-=1/60;}}else{accumulator=0;held.clear();}
 draw(canvas,state,{time,started:started&&!briefing,replay,touch});requestAnimationFrame(frame);}requestAnimationFrame(frame);
