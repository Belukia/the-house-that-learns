import {createGame,step,summarize,learnLocal,validatePolicy,DEFAULT_POLICY,NIGHTS,NIGHT_NEWS,floor,distance,upstairs,knownLabels} from './engine.mjs';
import {draw,tileAt} from './render.mjs';
import {opening,commentary,aftermath,taunt} from './narrator.mjs';
import {VOICE_LINES} from './voice.mjs';
const $=id=>document.getElementById(id), canvas=$('game');
const KEY='blackthorn-platformer-v4',LAST=10;let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
const H={habits:true};let policy;try{policy=validatePolicy(saved.policy||DEFAULT_POLICY,H)}catch{policy=validatePolicy(DEFAULT_POLICY,H)}
let ghost=Array.isArray(saved.ghost)?saved.ghost.slice(0,400):null;
let memories=Array.isArray(saved.memories)?saved.memories.slice(-12):[],night=Number.isInteger(saved.night)?Math.max(1,saved.night):1;
let courtesyCompleted=Boolean(saved.courtesyCompleted??memories.some(m=>m.outcome==='escaped'));
const newGame=()=>createGame(policy,{tutorial:!courtesyCompleted,habits:true,night:Math.min(LAST,night)});
const NEXT={2:'HE WAKES UP AND HUNTS YOU · 55 SECONDS',3:'A WINDOW OPENS UPSTAIRS · FASTER · 2 DECOYS · 50 S',4:'FASTER STILL · 1 DECOY · 45 S',5:'FASTEST HUNTER · NO DECOYS · 40 S',6:'THE LONG HALL CREAKS IF YOU RUN · 45 S',7:'THE CANDLES ARE OUT · 45 S',8:'THE FRONT DOOR IS LOCKED · 45 S',9:'THE EMERALD HAS BEEN MOVED UPSTAIRS · 45 S',10:'ALL OF IT, AT ONCE · 50 S'};
// The status line on the new nights: what changed, in one sentence.
const NEWS_LINE={6:'The long hall creaks if you run across it. Walk, and he hears nothing.',7:'The candles are out. You see a little. So does he.',8:'The front door is locked. Take the emerald out through the window upstairs: stand at it and press H.',9:'The emerald has been moved upstairs. The vault is empty.',10:'Creaky hall, no candles, locked door, emerald upstairs. Out through the window: stand at it and press H.'};
let state=newGame(),started=false,aiming=false,aim={x:9,y:7},replay=null,replayTimer=null,learning=false,epoch=0,runtime={configured:false},sound=false,audio,usedLines=new Set(),briefUntil=0,lastLine='',lastLineAt=0,stillSince=0;
function save(){try{localStorage.setItem(KEY,JSON.stringify({policy,memories,night,courtesyCompleted,ghost}))}catch{}}
let clip=null;
function speak(line){if(!('speechSynthesis' in window))return;speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(line);voice.lang='en-GB';voice.rate=.9;voice.pitch=.85;voice.voice=speechSynthesis.getVoices().find(v=>v.lang==='en-GB'&&v.localService)||null;speechSynthesis.speak(voice);}
function hush(){if(clip){clip.pause();clip=null;}if('speechSynthesis' in window)speechSynthesis.cancel();}
function narrate(line){$('narrator').textContent=line;lastLine=line;lastLineAt=performance.now();if(!sound)return;hush();// Lines not recorded yet stay on screen only: a robot voice would break the butler.
 const file=VOICE_LINES[line];if(!file)return;clip=new Audio('voice/'+file);clip.play().catch(()=>speak(line));}
function text(tag,content){const e=document.createElement(tag);e.textContent=content;return e;}
function tone(f=220,d=.07){if(!sound)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch{}}
function showKnown(){const k=policy.habits?.known||[];$('known').replaceChildren(...(k.length?[text('li','WHAT HE KNOWS ABOUT YOU'),...k.map((n,i)=>{const li=text('li',n.line);if(i===k.length-1&&memories.at(-1)?.newKey===n.key)li.className='new';return li;})]:[]));}
// On phones there is no keyboard: the board talks about buttons, not keys.
const touch=matchMedia('(max-width:750px),(pointer:coarse)').matches;
function forScreen(m){if(!touch||!m)return m;return m.replace('A/D to run, Space to jump, F throws a decoy ahead of you, H hides you in a wardrobe. The emerald is to the right.','Arrows to run, ↑ to jump. The emerald is to the right.').replace(' Shift sprints.','').replace('press H to climb out','tap HIDE to climb out').replace('stand at it and press H','stand at it and tap HIDE');}
function refresh(){
 $('night').textContent=`NIGHT ${Math.min(LAST,night)} / ${LAST}`;
 $('turns').textContent=`${Math.floor(state.time)}s / ${state.tutorial?'∞':state.rules.limit+'s'}`;$('turns').style.color=!state.tutorial&&state.rules.limit-state.time<=10?'#e8604c':'';
 $('message').textContent=forScreen(state.message);$('decoy-count').textContent=`PRESS F OR TAP · ${state.decoys} LEFT`;$('t-decoy-count').textContent=`${state.decoys} LEFT`;
 $('suspicion').style.width=`${state.suspicion}%`;$('suspicion-label').textContent=state.suspicion>=68?'ON YOUR HEELS':state.suspicion?'SUSPICIOUS':'UNAWARE';
 $('suspicion-label').style.color=state.suspicion?'#b95b45':'#36584b';
 $('keeper-name').textContent=memories.length?policy.name:'A creature of habit.';
 $('phase-label').textContent=!started?'YOUR EGO IS EXPECTED':aiming?'CHOOSE A DISTRACTION':state.tutorial?'THE COURTESY ROUND':state.hasRelic?'GET BACK TO THE ENTRANCE':'THE HOUSE DID ITS HOMEWORK';
 $('inventory').textContent=state.hasRelic?'One priceless emerald.\nOne way out.':'A suspicious lack\nof emeralds.';
 $('inventory').style.whiteSpace='pre-line';$('relic-icon').textContent=state.hasRelic?'◆':'◇';document.querySelector('.inventory').classList.toggle('acquired',state.hasRelic);
 $('decoy').classList.toggle('active',aiming);
 for(const id of ['decoy','wait','hide','restart','t-decoy','t-hide'])$(id).disabled=!started||state.status!=='playing';
 document.querySelectorAll('[data-move]').forEach(e=>e.disabled=!started||state.status!=='playing');
 $('memory-count').textContent=String(memories.length).padStart(2,'0');
 if(memories.length){$('memories').replaceChildren(...memories.slice(-2).reverse().map(m=>{const d=document.createElement('div');d.className='memory';d.append(text('b',`NIGHT ${String(m.night).padStart(2,'0')} / ${m.outcome==='escaped'?'OUTWITTED':'ENCOUNTER'}`),text('p',m.lesson),text('small',m.mode==='trueforge'?'TRUEFORGE SESSION':'LOCAL MEMORY'));return d;}));}
 $('policy-view').textContent=`Behavior: ${policy.name}\nWhat he knows about you:\n${(policy.habits?.known||[]).map(k=>'· '+k.line).join('\n')||'· Nothing yet.'}\nCompleted heists remembered: ${memories.length}`;
 $('runtime-label').textContent=runtime.configured?'TrueForge bridge configured. Completed heists will request a candidate skill revision.':'In this browser the keeper learns with game rules. The TrueForge agent learned to guard the door (exam v1), and is now learning the window (exam v2).';
}
const held=new Set();let accumulator=0,lastTime=0;
function begin(){if(night>LAST)return startOver();held.clear();accumulator=0;clearInterval(replayTimer);replay=null;aiming=false;usedLines=new Set();state=newGame();if(!state.tutorial&&NEWS_LINE[Math.min(LAST,night)])state.message=NEWS_LINE[Math.min(LAST,night)];else if(!state.tutorial&&state.rules.exits?.includes('window'))state.message='A window is open upstairs, above the door. Stand at it with the emerald and press H to climb out.';started=true;$('intro').classList.add('hidden');$('result').classList.add('hidden');refresh();
 // Before nights 2–5 the board holds for three seconds to show what he knows about you.
 briefUntil=!state.tutorial&&(knownLabels(policy.habits,policy,state.rules).length||NIGHT_NEWS[Math.min(LAST,night)])?performance.now()+3200:0;
 stillSince=performance.now()+3200;narrate(opening(state.tutorial,night,!state.tutorial&&policy.habits?.known?.length?policy.lesson:null));canvas.focus();tone(330,.2);}
function tick(){if(!started||state.status!=='playing'||learning||document.querySelector('dialog[open]')||performance.now()<briefUntil)return;
 const a={left:held.has('a')||held.has('arrowleft'),right:held.has('d')||held.has('arrowright'),jump:held.has(' ')||held.has('w')||held.has('arrowup'),down:held.has('s')||held.has('arrowdown'),sprint:held.has('shift'),hide:held.has('h'),decoy:held.has('f')};
 const before={events:state.events.length,turn:state.turn,hasRelic:state.hasRelic,suspicion:state.suspicion,hidden:state.hidden,sees:state.sees,playerUp:upstairs(state.player),guardUp:upstairs(state.guard)};step(state,a);
 const now=performance.now();if(a.left||a.right||a.jump||a.down)stillSince=now;
 let line=commentary({state,before,action:a,night,used:usedLines});
 // Quiet for 6 seconds? The house finds something to say.
 if(!line&&state.status==='playing'&&now-lastLineAt>6000)line=taunt({state,stillFor:(now-stillSince)/1000,last:lastLine});
 if(line)narrate(line);
 if(state.turn%6===0||state.status!=='playing')refresh();if(state.status!=='playing')finish();
}
async function finish(){
 // Hold the CAUGHT card on the board for a beat before the results cover it.
 if(state.status==='caught'){const e=epoch;await new Promise(r=>setTimeout(r,1400));if(e!==epoch)return;}
 aiming=false;learning=true;const thisEpoch=epoch,episode=summarize(state),prior=validatePolicy(policy,H);
 const ending=aftermath(episode,night,state.tutorial);
 // The last night closes the game: the house keeps score.
 if(night>=LAST){const wins=memories.filter(m=>!m.courtesy&&m.outcome==='escaped').length+(episode.outcome==='escaped'?1:0);Object.assign(ending,episode.outcome==='escaped'?{kicker:`NIGHT ${LAST}. YOU WON IT.`,title:'Impossible.',copy:'The burglar beat the last night. The house is quietly rewriting its rules.',button:'START OVER →'}:{kicker:`${LAST} NIGHTS. YOU GOT OUT ${wins===1?'ONCE':wins+' TIMES'}.`,title:'The house wins.',copy:'Every night the keeper learned one more thing about the burglar. On the last night, he knew enough.',button:'START OVER →'});}
 $('result').querySelector('.result-card').classList.toggle('final',night>=LAST);$('result-title').textContent=ending.title;$('result-kicker').textContent=ending.kicker;$('result-copy').textContent=ending.copy;$('challenge-line').textContent=ending.challenge;$('again').textContent=ending.button;narrate(ending.challenge);
 $('result-stats').replaceChildren(text('span',`${Math.round(state.time)} SECONDS`),text('span',`${state.decoysThrown} DECOYS`),text('span',state.hasRelic?'RELIC TAKEN':'RELIC UNTOUCHED'),...(NEXT[night+1]?[text('span',`NEXT · NIGHT ${night+1}: ${NEXT[night+1]}`)]:[]));
 $('lesson').textContent='“Let me think about what you just did…”';$('known').replaceChildren();$('learn-status').textContent=runtime.configured?'The keeper is consulting his TrueForge playbook.':'The keeper is updating his local memory.';
 $('again').disabled=true;$('replay').disabled=true;$('result').classList.remove('hidden');refresh();tone(state.status==='escaped'?440:120,.4);
 let next,mode='local',sessionId;
 if(runtime.configured){try{const response=await fetch('/api/learn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({episode,policy:prior})});const data=await response.json();if(!response.ok)throw Error(data.error||'Learning request failed');next=validatePolicy(data.policy,H);mode='trueforge';sessionId=data.sessionId;}
 catch(e){$('learn-status').textContent='TrueForge was unavailable. This lesson uses local game rules.';}}
 if(thisEpoch!==epoch)return;
 policy=next||learnLocal(prior,state);ghost=state.history.filter((h,i)=>i%3===0).map(h=>({x:Math.round(h.player.x),y:Math.round(h.player.y)})).slice(0,400);if(state.tutorial&&episode.outcome==='escaped')courtesyCompleted=true;memories.push({night,outcome:episode.outcome,courtesy:state.tutorial,lesson:policy.lesson,mode,sessionId,newKey:(policy.habits?.known||[]).find(k=>k.line===policy.lesson)?.key});memories=memories.slice(-12);night++;save();
 $('lesson').textContent=`“${policy.lesson}”`;showKnown();if(mode==='trueforge')$('learn-status').textContent=`TrueForge proposed a skill revision · candidate, not yet active · ${sessionId}`;else if(!runtime.configured)$('learn-status').textContent='Local game adaptation. Your next heist will use this lesson.';
 $('again').disabled=false;$('replay').disabled=false;learning=false;refresh();
}
const controlKeys=new Set(['a','d','w','s','arrowleft','arrowright','arrowup','arrowdown',' ','shift','h','f']);
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA/.test(e.target.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;const k=e.key.toLowerCase();if(controlKeys.has(k)&&started&&state.status==='playing'){e.preventDefault();held.add(k);}});
window.addEventListener('keyup',e=>held.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{held.clear();accumulator=0;});
document.addEventListener('visibilitychange',()=>{held.clear();lastTime=0;});
canvas.addEventListener('pointerdown',()=>canvas.focus());
// A quick tap still counts: the key stays held for at least 120 ms.
function bindHold(el,key){let downAt=0;el.addEventListener('pointerdown',e=>{e.preventDefault();if(el.disabled)return;try{el.setPointerCapture(e.pointerId)}catch{}downAt=performance.now();held.add(key);});for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,()=>setTimeout(()=>held.delete(key),Math.max(0,120-(performance.now()-downAt))));}
$('start').onclick=begin;$('again').onclick=begin;
bindHold($('decoy'),'f');bindHold($('wait'),' ');bindHold($('hide'),'h');bindHold($('t-decoy'),'f');bindHold($('t-hide'),'h');
// Restarting mid-heist teaches the keeper nothing and does not use up the night.
$('restart').onclick=()=>{held.clear();epoch++;learning=false;begin();};
document.querySelectorAll('[data-move]').forEach(b=>bindHold(b,b.dataset.move==='-1,0'?'a':b.dataset.move==='1,0'?'d':b.dataset.move==='0,1'?'s':' '));
$('replay').onclick=()=>{clearInterval(replayTimer);$('result').classList.add('hidden');let i=0;replay=[];$('message').textContent='The burglar’s footsteps, retraced. The keeper was watching all of them.';replayTimer=setInterval(()=>{if(i>=state.history.length){clearInterval(replayTimer);$('result').classList.remove('hidden');return;}replay.push(state.history[i++].player);},95);};
for(const [b,d] of [['lab','notes-dialog'],['how','help-dialog'],['privacy','privacy-dialog']])$(b).onclick=()=>{refresh();held.clear();$(d).showModal();};
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
function startOver(){epoch++;learning=false;memories=[];night=1;courtesyCompleted=false;ghost=null;policy=validatePolicy(DEFAULT_POLICY,H);save();$('memories').innerHTML='<div class="empty-memory"><span>“</span><p>Nothing to remember.<br>How fortunate for you.</p></div>';begin();refresh();}
$('forget').onclick=()=>{$('notes-dialog').close();startOver();};
$('download').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,mode:memories.at(-1)?.mode||'local',policy,memories,episode:summarize(state),history:state.history},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='blackthorn-field-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♩ NARRATOR ON':'♩ SOUND OFF';$('sound').setAttribute('aria-pressed',String(sound));$('sound-hint').innerHTML=sound?'🔊 SOUND IS ON. THE HOUSE IS LISTENING TOO.':'🔊 BEST WITH SOUND ON. THE HOUSE TALKS. <u>TURN IT ON</u>';$('sound-hint').setAttribute('aria-pressed',String(sound));if(sound){tone(330,.15);narrate($('narrator').textContent);}else hush();};
fetch('/api/status').then(r=>r.ok?r.json():{}).then(d=>{runtime=d;refresh();}).catch(()=>{});
refresh();
function frame(time){if(!lastTime)lastTime=time;const dt=Math.min(.05,(time-lastTime)/1000);lastTime=time;
 if(!document.hidden&&document.hasFocus()){accumulator+=dt;while(accumulator>=1/60){tick();accumulator-=1/60;}}else{accumulator=0;held.clear();}
 draw(canvas,state,{time,started,replay,ghost:started&&!state.tutorial?ghost:null,briefing:started&&performance.now()<briefUntil?{night:Math.min(LAST,night),news:NIGHT_NEWS[Math.min(LAST,night)],lines:knownLabels(policy.habits,policy,state.rules)}:null});requestAnimationFrame(frame);}requestAnimationFrame(frame);

$('sound-hint').onclick=()=>$('sound').click();
