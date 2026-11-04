import {createGame,step,summarize,learnLocal,validatePolicy,DEFAULT_POLICY,floor,distance} from './engine.mjs';
import {draw,tileAt} from './render.mjs';
import {opening,commentary,aftermath} from './narrator.mjs';
import {VOICE_LINES} from './voice.mjs';
const $=id=>document.getElementById(id), canvas=$('game');
const KEY='blackthorn-platformer-v2';let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
let policy;try{policy=validatePolicy(saved.policy||DEFAULT_POLICY)}catch{policy=validatePolicy(DEFAULT_POLICY)}
let memories=Array.isArray(saved.memories)?saved.memories.slice(-12):[],night=Number.isInteger(saved.night)?Math.max(1,saved.night):1;
let courtesyCompleted=Boolean(saved.courtesyCompleted??memories.some(m=>m.outcome==='escaped'));
let state=createGame(policy,{tutorial:!courtesyCompleted}),started=false,aiming=false,aim={x:9,y:7},replay=null,replayTimer=null,learning=false,epoch=0,runtime={configured:false},sound=false,audio,usedLines=new Set();
function save(){try{localStorage.setItem(KEY,JSON.stringify({policy,memories,night,courtesyCompleted}))}catch{}}
let clip=null;
function speak(line){if(!('speechSynthesis' in window))return;speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(line);voice.lang='en-GB';voice.rate=.9;voice.pitch=.85;voice.voice=speechSynthesis.getVoices().find(v=>v.lang==='en-GB'&&v.localService)||null;speechSynthesis.speak(voice);}
function hush(){if(clip){clip.pause();clip=null;}if('speechSynthesis' in window)speechSynthesis.cancel();}
function narrate(line){$('narrator').textContent=line;if(!sound)return;hush();const file=VOICE_LINES[line];if(!file)return speak(line);clip=new Audio('voice/'+file);clip.play().catch(()=>speak(line));}
function text(tag,content){const e=document.createElement(tag);e.textContent=content;return e;}
function tone(f=220,d=.07){if(!sound)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch{}}
function refresh(){
 $('night').textContent=`NIGHT ${String(night).padStart(2,'0')}`;
 $('turns').textContent=`${Math.floor(state.time)}s / ${state.tutorial?'∞':'90s'}`;
 $('message').textContent=state.message;$('decoy-count').textContent=`PRESS F OR TAP · ${state.decoys} LEFT`;
 $('suspicion').style.width=`${state.suspicion}%`;$('suspicion-label').textContent=state.suspicion>=68?'ON YOUR HEELS':state.suspicion?'SUSPICIOUS':'UNAWARE';
 $('suspicion-label').style.color=state.suspicion?'#b95b45':'#36584b';
 $('keeper-name').textContent=memories.length?policy.name:'A creature of habit.';
 $('phase-label').textContent=!started?'YOUR EGO IS EXPECTED':aiming?'CHOOSE A DISTRACTION':state.tutorial?'THE COURTESY ROUND':state.hasRelic?'GET BACK TO THE ENTRANCE':'THE HOUSE DID ITS HOMEWORK';
 $('inventory').textContent=state.hasRelic?'One priceless emerald.\nOne way out.':'A suspicious lack\nof emeralds.';
 $('inventory').style.whiteSpace='pre-line';$('relic-icon').textContent=state.hasRelic?'◆':'◇';document.querySelector('.inventory').classList.toggle('acquired',state.hasRelic);
 $('decoy').classList.toggle('active',aiming);
 for(const id of ['decoy','wait','hide','restart'])$(id).disabled=!started||state.status!=='playing';
 document.querySelectorAll('[data-move]').forEach(e=>e.disabled=!started||state.status!=='playing');
 $('memory-count').textContent=String(memories.length).padStart(2,'0');
 if(memories.length){$('memories').replaceChildren(...memories.slice(-2).reverse().map(m=>{const d=document.createElement('div');d.className='memory';d.append(text('b',`NIGHT ${String(m.night).padStart(2,'0')} / ${m.outcome==='escaped'?'OUTWITTED':'ENCOUNTER'}`),text('p',m.lesson),text('small',m.mode==='trueforge'?'TRUEFORGE SESSION':'LOCAL MEMORY'));return d;}));}
 $('policy-view').textContent=`Behavior: ${policy.name}\nDecoy skepticism: ${policy.decoySkepticism}/2\nProtects the vault: ${policy.protectRelic?'yes':'no'}\nPatrol stops: ${policy.patrol.length}\nCompleted heists remembered: ${memories.length}`;
 $('runtime-label').textContent=runtime.configured?'TrueForge bridge configured. Completed heists will request a candidate skill revision.':'Offline adaptation — not a TrueForge evaluation.';
}
const held=new Set();let accumulator=0,lastTime=0;
function begin(){held.clear();accumulator=0;clearInterval(replayTimer);replay=null;aiming=false;usedLines=new Set();state=createGame(policy,{tutorial:!courtesyCompleted});started=true;$('intro').classList.add('hidden');$('result').classList.add('hidden');refresh();narrate(opening(state.tutorial,night));canvas.focus();tone(330,.2);}
function tick(){if(!started||state.status!=='playing'||learning||document.querySelector('dialog[open]'))return;
 const a={left:held.has('a')||held.has('arrowleft'),right:held.has('d')||held.has('arrowright'),jump:held.has(' ')||held.has('w')||held.has('arrowup'),down:held.has('s')||held.has('arrowdown'),sprint:held.has('shift'),hide:held.has('h'),decoy:held.has('f')};
 const before={turn:state.turn,hasRelic:state.hasRelic,suspicion:state.suspicion};step(state,a);
 const line=commentary({state,before,action:a,night,used:usedLines});if(line)narrate(line);
 if(state.turn%6===0||state.status!=='playing')refresh();if(state.status!=='playing')finish();
}
async function finish(){
 // Hold the CAUGHT card on the board for a beat before the results cover it.
 if(state.status==='caught'){const e=epoch;await new Promise(r=>setTimeout(r,1400));if(e!==epoch)return;}
 aiming=false;learning=true;const thisEpoch=epoch,episode=summarize(state),prior=validatePolicy(policy);
 const ending=aftermath(episode,night,state.tutorial);
 $('result-title').textContent=ending.title;$('result-kicker').textContent=ending.kicker;$('result-copy').textContent=ending.copy;$('challenge-line').textContent=ending.challenge;$('again').textContent=ending.button;narrate(ending.challenge);
 $('result-stats').replaceChildren(text('span',`${Math.round(state.time)} SECONDS`),text('span',`${state.decoysThrown} DECOYS`),text('span',state.hasRelic?'RELIC TAKEN':'RELIC UNTOUCHED'));
 $('lesson').textContent='“Let me think about what you just did…”';$('learn-status').textContent=runtime.configured?'The keeper is consulting his TrueForge playbook.':'The keeper is updating his local memory.';
 $('again').disabled=true;$('replay').disabled=true;$('result').classList.remove('hidden');refresh();tone(state.status==='escaped'?440:120,.4);
 let next,mode='local',sessionId;
 if(runtime.configured){try{const response=await fetch('/api/learn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({episode,policy:prior})});const data=await response.json();if(!response.ok)throw Error(data.error||'Learning request failed');next=validatePolicy(data.policy);mode='trueforge';sessionId=data.sessionId;}
 catch(e){$('learn-status').textContent='TrueForge was unavailable. This lesson uses local game rules.';}}
 if(thisEpoch!==epoch)return;
 policy=next||learnLocal(prior,episode);if(state.tutorial&&episode.outcome==='escaped')courtesyCompleted=true;memories.push({night,outcome:episode.outcome,courtesy:state.tutorial,lesson:policy.lesson,mode,sessionId});memories=memories.slice(-12);night++;save();
 $('lesson').textContent=`“${policy.lesson}”`;if(mode==='trueforge')$('learn-status').textContent=`TrueForge proposed a skill revision · candidate, not yet active · ${sessionId}`;else if(!runtime.configured)$('learn-status').textContent='Local game adaptation. Your next heist will use this lesson.';
 $('again').disabled=false;$('replay').disabled=false;learning=false;refresh();
}
const controlKeys=new Set(['a','d','w','s','arrowleft','arrowright','arrowup','arrowdown',' ','shift','h','f']);
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA/.test(e.target.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;const k=e.key.toLowerCase();if(controlKeys.has(k)&&started&&state.status==='playing'){e.preventDefault();held.add(k);}});
window.addEventListener('keyup',e=>held.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{held.clear();accumulator=0;});
document.addEventListener('visibilitychange',()=>{held.clear();lastTime=0;});
canvas.addEventListener('pointerdown',()=>canvas.focus());
function bindHold(el,key){el.addEventListener('pointerdown',e=>{e.preventDefault();if(el.disabled)return;el.setPointerCapture(e.pointerId);held.add(key);});for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,()=>held.delete(key));}
$('start').onclick=begin;$('again').onclick=begin;
bindHold($('decoy'),'f');bindHold($('wait'),' ');bindHold($('hide'),'h');
$('restart').onclick=()=>{held.clear();if(state.turn&&state.status==='playing'){state.status='abandoned';finish();}else begin();};
document.querySelectorAll('[data-move]').forEach(b=>bindHold(b,b.dataset.move==='-1,0'?'a':b.dataset.move==='1,0'?'d':b.dataset.move==='0,1'?'s':' '));
$('replay').onclick=()=>{clearInterval(replayTimer);$('result').classList.add('hidden');let i=0;replay=[];$('message').textContent='Your footsteps, retraced. The keeper was watching.';replayTimer=setInterval(()=>{if(i>=state.history.length){clearInterval(replayTimer);$('result').classList.remove('hidden');return;}replay.push(state.history[i++].player);},95);};
for(const [b,d] of [['lab','notes-dialog'],['how','help-dialog'],['privacy','privacy-dialog']])$(b).onclick=()=>{refresh();held.clear();$(d).showModal();};
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('forget').onclick=()=>{epoch++;learning=false;memories=[];night=1;courtesyCompleted=false;policy=validatePolicy(DEFAULT_POLICY);save();$('notes-dialog').close();begin();$('memories').innerHTML='<div class="empty-memory"><span>“</span><p>Nothing to remember.<br>How fortunate for you.</p></div>';refresh();};
$('download').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,mode:memories.at(-1)?.mode||'local',policy,memories,episode:summarize(state),history:state.history},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='blackthorn-field-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♩ NARRATOR ON':'♩ SOUND OFF';$('sound').setAttribute('aria-pressed',String(sound));if(sound){tone(330,.15);narrate($('narrator').textContent);}else hush();};
fetch('/api/status').then(r=>r.ok?r.json():{}).then(d=>{runtime=d;refresh();}).catch(()=>{});
refresh();
function frame(time){if(!lastTime)lastTime=time;const dt=Math.min(.05,(time-lastTime)/1000);lastTime=time;
 if(!document.hidden&&document.hasFocus()){accumulator+=dt;while(accumulator>=1/60){tick();accumulator-=1/60;}}else{accumulator=0;held.clear();}
 draw(canvas,state,{time,started,replay});requestAnimationFrame(frame);}requestAnimationFrame(frame);
