// Music and sound effects, all made in code with the Web Audio API. No recordings, no downloads.
// A music-box loop in A minor, a heartbeat layer while the keeper chases you, and short effects.
// Browsers only allow sound after a tap or key press, so enable() must run inside one.
let ctx=null,master,music,sfxBus,timer=null,nextNote=0,step=0,chase=0,duck=false,on=false,musicOn=true,sfxOn=true;
const midi=n=>440*2**((n-69)/12);
// Eight bars of eighth notes (0 = rest). A minor, a little crooked, like a cheap music box.
const MELODY=[69,72,76,81,79,76,72,76, 65,69,72,77,76,72,69,72, 67,71,74,79,77,74,71,74, 64,68,71,76,74,71,68,0,
              69,72,76,81,83,81,76,72, 65,69,72,77,79,77,72,69, 64,67,71,76,74,72,71,68, 69,0,64,0,69,0,0,0];
const BASS=[45,41,43,40,45,41,40,45];
const EIGHTH=.3;
function voice(freq,t,dur,{type='sine',gain=.2,bus=music,attack=.005,glide=0}={}){
 const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);
 if(glide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*glide),t+dur);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
 o.connect(g);g.connect(bus);o.start(t);o.stop(t+dur+.05);
}
function noise(t,dur,{gain=.2,freq=1200,q=1,type='bandpass',bus=sfxBus,sweep=0}={}){
 const len=Math.max(1,Math.floor(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
 for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
 const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=buf;f.type=type;f.frequency.setValueAtTime(freq,t);f.Q.value=q;
 if(sweep)f.frequency.exponentialRampToValueAtTime(sweep,t+dur);
 g.gain.setValueAtTime(gain,t);src.connect(f);f.connect(g);g.connect(bus);src.start(t);
}
function schedule(){
 if(!ctx)return;
 while(nextNote<ctx.currentTime+.25){
  const n=MELODY[step%MELODY.length],t=nextNote;
  if(n){voice(midi(n),t,.9,{type:'sine',gain:.16});voice(midi(n+12),t,.35,{type:'triangle',gain:.035});}
  if(step%8===0)voice(midi(BASS[(step/8)%BASS.length]),t,EIGHTH*7,{type:'triangle',gain:.09,attack:.04});
  // While he hunts you: a heartbeat under the music, two beats every bar.
  if(chase&&(step%4===0||step%4===1))voice(step%4===0?62:55,t,.18,{type:'sine',gain:.32*chase,glide:.6,bus:music});
  nextNote+=chase?EIGHTH*.82:EIGHTH;step++;
 }
}
function level(){if(!ctx)return;const t=ctx.currentTime;music.gain.cancelScheduledValues(t);music.gain.setTargetAtTime(on&&musicOn?(duck?.07:.22):0,t,.15);}
export const sound={
 get on(){return on;},
 get musicOn(){return musicOn;},
 get sfxOn(){return sfxOn;},
 setMusic(v){musicOn=v;level();},
 setSfx(v){sfxOn=v;},
 enable(){
  if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ctx=new C();master=ctx.createGain();master.gain.value=.9;master.connect(ctx.destination);
   music=ctx.createGain();music.gain.value=0;music.connect(master);sfxBus=ctx.createGain();sfxBus.gain.value=.8;sfxBus.connect(master);}
  ctx.resume();on=true;if(!timer){nextNote=ctx.currentTime+.1;timer=setInterval(schedule,60);}level();
 },
 disable(){on=false;level();},
 duck(v){duck=v;level();},
 chasing(v){chase=v?1:0;},
 play(name,opt={}){
  if(!ctx||!on||!sfxOn)return;const t=ctx.currentTime+.01;
  switch(name){
   case 'step':noise(t,.05,{gain:opt.loud?.5:.3,freq:opt.loud?900:1300,q:1.2});break;
   case 'creak':voice(190,t,.45,{type:'sawtooth',gain:.12,glide:.55,bus:sfxBus,attack:.03});noise(t,.4,{gain:.25,freq:700,q:6});break;
   case 'jump':voice(300,t,.09,{type:'square',gain:.05,glide:1.8,bus:sfxBus});break;
   case 'hide':noise(t,.14,{gain:.6,freq:260,type:'lowpass'});voice(140,t+.05,.25,{type:'sawtooth',gain:.05,glide:.7,bus:sfxBus,attack:.02});break;
   case 'relic':[88,91,95,100].forEach((n,i)=>voice(midi(n),t+i*.07,.9,{gain:.16,bus:sfxBus}));break;
   case 'locked':[0,.08,.16].forEach(d=>noise(t+d,.035,{gain:.6,freq:2600,q:4}));voice(110,t,.2,{type:'square',gain:.04,bus:sfxBus});break;
   case 'window':noise(t,.45,{gain:.35,freq:400,q:.8,sweep:2400});break;
   case 'spotted':voice(midi(71),t,.12,{type:'square',gain:.07,bus:sfxBus});voice(midi(72),t+.12,.25,{type:'square',gain:.07,bus:sfxBus});break;
   case 'caught':[45,51,57].forEach(n=>voice(midi(n),t,1.1,{type:'sawtooth',gain:.09,bus:sfxBus,attack:.01}));noise(t,.3,{gain:.4,freq:180,type:'lowpass'});break;
   case 'dawn':[72,79,84].forEach((n,i)=>voice(midi(n),t+i*.02,1.8,{gain:.12,bus:sfxBus}));break;
   case 'escape':[72,76,79,84].forEach((n,i)=>voice(midi(n),t+i*.09,.6,{type:'triangle',gain:.15,bus:sfxBus}));break;
   case 'go':voice(midi(57),t,.5,{type:'triangle',gain:.12,bus:sfxBus});voice(midi(64),t+.08,.5,{type:'triangle',gain:.1,bus:sfxBus});break;
  }
 }
};
