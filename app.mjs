import {createGame,step,summarize,learnLocal,validatePolicy,DEFAULT_POLICY,floor,distance} from './engine.mjs';
import {draw,tileAt} from './render.mjs';
const $=id=>document.getElementById(id), canvas=$('game');
const KEY='blackthorn-v1';let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
let policy;try{policy=validatePolicy(saved.policy||DEFAULT_POLICY)}catch{policy=validatePolicy(DEFAULT_POLICY)}
let memories=Array.isArray(saved.memories)?saved.memories.slice(-12):[],night=Number.isInteger(saved.night)?Math.max(1,saved.night):1;
let state=createGame(policy),started=false,aiming=false,aim={x:9,y:7},replay=null,replayTimer=null,learning=false,epoch=0,runtime={configured:false},sound=false,audio;
function save(){try{localStorage.setItem(KEY,JSON.stringify({policy,memories,night}))}catch{}}
function text(tag,content){const e=document.createElement(tag);e.textContent=content;return e;}
function tone(f=220,d=.07){if(!sound)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch{}}
function refresh(){
 $('night').textContent=`NIGHT ${String(night).padStart(2,'0')}`;
 $('turns').textContent=`${String(state.turn).padStart(2,'0')} / 100`;
 $('message').textContent=state.message;$('decoy-count').textContent=`${state.decoys} LEFT · F`;
 $('suspicion').style.width=`${state.suspicion}%`;$('suspicion-label').textContent=state.suspicion>=68?'ON YOUR HEELS':state.suspicion?'SUSPICIOUS':'UNAWARE';
 $('suspicion-label').style.color=state.suspicion?'#b95b45':'#36584b';
 $('keeper-name').textContent=memories.length?policy.name:'A creature of habit.';
 $('phase-label').textContent=!started?'AWAITING YOUR ARRIVAL':aiming?'CHOOSE A DISTRACTION':state.hasRelic?'GET BACK TO THE ENTRANCE':'THE EMERALD IS WAITING';
 $('inventory').textContent=state.hasRelic?'One priceless emerald.\nOne way out.':'A suspicious lack\nof emeralds.';
 $('inventory').style.whiteSpace='pre-line';$('relic-icon').textContent=state.hasRelic?'◆':'◇';document.querySelector('.inventory').classList.toggle('acquired',state.hasRelic);
 $('decoy').classList.toggle('active',aiming);
 for(const id of ['decoy','wait','hide','restart'])$(id).disabled=!started||state.status!=='playing';
 document.querySelectorAll('[data-move]').forEach(e=>e.disabled=!started||state.status!=='playing');
 $('memory-count').textContent=String(memories.length).padStart(2,'0');
 if(memories.length){$('memories').replaceChildren(...memories.slice(-2).reverse().map(m=>{const d=document.createElement('div');d.className='memory';d.append(text('b',`NIGHT ${String(m.night).padStart(2,'0')} / ${m.outcome==='escaped'?'OUTWITTED':'ENCOUNTER'}`),text('p',m.lesson),text('small',m.mode==='trueforge'?'TRUEFORGE SESSION':'LOCAL MEMORY'));return d;}));}
 $('policy-view').textContent=`Behavior: ${policy.name}\nDecoy skepticism: ${policy.decoySkepticism}/2\nProtects the vault: ${policy.protectRelic?'yes':'no'}\nPatrol stops: ${policy.patrol.length}\nCompleted heists remembered: ${memories.length}`;
 $('runtime-label').textContent=runtime.configured?'TrueForge bridge configured. Completed heists will request a skill rewrite.':'Offline adaptation — not a TrueForge evaluation.';
}
function begin(){clearInterval(replayTimer);replay=null;aiming=false;state=createGame(policy);started=true;$('intro').classList.add('hidden');$('result').classList.add('hidden');refresh();canvas.focus();tone(330,.2);}
function act(a){if(!started||state.status!=='playing'||learning||document.querySelector('dialog[open]'))return;step(state,a);tone(state.suspicion?180:270,.04);refresh();if(state.status!=='playing')finish();}
async function finish(){
 aiming=false;learning=true;const thisEpoch=epoch,episode=summarize(state),prior=validatePolicy(policy);
 $('result-title').textContent=state.status==='escaped'?'A beautiful little theft.':'Caught in the act.';
 $('result-kicker').textContent=state.status==='escaped'?'ONE EMERALD. ONE WOUNDED EGO.':'THE HOUSE REMEMBERS';
 $('result-copy').textContent=state.status==='escaped'?'You got out. The keeper is going over your footsteps.':'The keeper won this round. He is still taking notes.';
 $('result-stats').replaceChildren(text('span',`${state.turn} TURNS`),text('span',`${state.decoysThrown} DECOYS`),text('span',state.hasRelic?'RELIC TAKEN':'RELIC UNTOUCHED'));
 $('lesson').textContent='“Let me think about what you just did…”';$('learn-status').textContent=runtime.configured?'The keeper is consulting his TrueForge playbook.':'The keeper is updating his local memory.';
 $('again').disabled=true;$('replay').disabled=true;$('result').classList.remove('hidden');refresh();tone(state.status==='escaped'?440:120,.4);
 let next,mode='local',sessionId;
 if(runtime.configured){try{const response=await fetch('/api/learn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({episode,policy:prior})});const data=await response.json();if(!response.ok)throw Error(data.error||'Learning request failed');next=validatePolicy(data.policy);mode='trueforge';sessionId=data.sessionId;}
 catch(e){$('learn-status').textContent='TrueForge was unavailable. This lesson uses local game rules.';}}
 if(thisEpoch!==epoch)return;
 policy=next||learnLocal(prior,episode);memories.push({night,outcome:episode.outcome,lesson:policy.lesson,mode,sessionId});memories=memories.slice(-12);night++;save();
 $('lesson').textContent=`“${policy.lesson}”`;if(mode==='trueforge')$('learn-status').textContent=`Skill rewritten in TrueForge · ${sessionId}`;else if(!runtime.configured)$('learn-status').textContent='Local game adaptation. Your next heist will use this lesson.';
 $('again').disabled=false;$('replay').disabled=false;learning=false;refresh();
}
function decoy(){if(!started||state.status!=='playing'||state.decoys<=0)return;aiming=!aiming;aim={...state.player};state.message=aiming?'Choose a floor tile within seven squares. Arrows + Enter, or tap.':'Distraction cancelled.';refresh();canvas.focus();}
function move(dx,dy){if(aiming){const n={x:aim.x+dx,y:aim.y+dy};if(n.x>=1&&n.x<=17&&n.y>=1&&n.y<=13&&distance(n,state.player)<=7)aim=n;}else act({type:'move',dx,dy});}
window.addEventListener('keydown',e=>{
 if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA/.test(e.target.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;
 const k=e.key.toLowerCase(),dirs={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
 if(dirs[k]){if(!started||state.status!=='playing')return;e.preventDefault();move(...dirs[k]);}
 else if(k===' '){if(started){e.preventDefault();act({type:'wait'});}}
 else if(k==='f'){e.preventDefault();decoy();}else if(k==='h')act({type:'hide'});
 else if(k==='enter'&&aiming){e.preventDefault();if(floor(aim)){aiming=false;act({type:'decoy',target:{...aim}});}}
 else if(k==='escape'&&aiming){aiming=false;refresh();}
});
canvas.addEventListener('pointerdown',e=>{canvas.focus();if(!aiming)return;const p=tileAt(canvas,e);if(floor(p)&&distance(state.player,p)<=7){aiming=false;act({type:'decoy',target:p});}});
canvas.addEventListener('pointermove',e=>{if(aiming){const p=tileAt(canvas,e);if(floor(p)&&distance(state.player,p)<=7)aim=p;}});
$('start').onclick=begin;$('again').onclick=begin;$('decoy').onclick=decoy;$('wait').onclick=()=>act({type:'wait'});$('hide').onclick=()=>act({type:'hide'});
$('restart').onclick=()=>{if(state.turn&&state.status==='playing'){state.status='abandoned';state.message='You retreat. The keeper reviews what he saw.';finish();}else begin();};
document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>move(...b.dataset.move.split(',').map(Number)));
$('replay').onclick=()=>{clearInterval(replayTimer);$('result').classList.add('hidden');let i=0;replay=[];$('message').textContent='Your footsteps, retraced. The keeper was watching.';replayTimer=setInterval(()=>{if(i>=state.history.length){clearInterval(replayTimer);$('result').classList.remove('hidden');return;}replay.push(state.history[i++].player);},95);};
for(const [b,d] of [['lab','notes-dialog'],['how','help-dialog'],['privacy','privacy-dialog']])$(b).onclick=()=>{refresh();$(d).showModal();};
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('forget').onclick=()=>{epoch++;learning=false;memories=[];night=1;policy=validatePolicy(DEFAULT_POLICY);save();$('notes-dialog').close();begin();$('memories').innerHTML='<div class="empty-memory"><span>“</span><p>Nothing to remember.<br>How fortunate for you.</p></div>';refresh();};
$('download').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,mode:memories.at(-1)?.mode||'local',policy,memories,episode:summarize(state),history:state.history},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='blackthorn-field-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♩ SOUND ON':'♩ SOUND OFF';$('sound').setAttribute('aria-pressed',String(sound));tone(330,.15);};
fetch('/api/status').then(r=>r.ok?r.json():{}).then(d=>{runtime=d;refresh();}).catch(()=>{});
refresh();
function frame(time){draw(canvas,state,{time,started,aiming,aim,replay});requestAnimationFrame(frame);}requestAnimationFrame(frame);
