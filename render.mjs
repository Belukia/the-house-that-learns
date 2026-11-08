import {WIDTH,GROUND,PLATFORMS,BLOCKS,HIDING,RELIC,WINDOW,upstairs} from './engine.mjs';
const buffer=typeof document==='undefined'?null:document.createElement('canvas');if(buffer){buffer.width=480;buffer.height=288;}
// Nights 7 and 10: the candles are out. A second canvas holds the dark, with holes cut for the light.
const shade=typeof document==='undefined'?null:document.createElement('canvas');if(shade){shade.width=480;shade.height=288;}
// On phones there is no keyboard: hints talk about buttons, not keys.
const touch=typeof matchMedia!=='undefined'&&matchMedia('(max-width:750px),(pointer:coarse)').matches;
let camera=0;
export function draw(canvas,s,{time=0,started=false,replay=null,ghost=null,briefing=null,night=0}={}){
 const c=buffer.getContext('2d');c.imageSmoothingEnabled=false;
 camera=Math.max(0,Math.min(WIDTH-480,Math.round(s.player.x-180)));
 const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x-camera),Math.round(y-48),w,h);};
 // Small drawing helpers for the visual hints: a pulsing ring, a soft glow, a twinkle.
 // Pixel-art hints, stepped at 12 frames a second like the rest of the game (no smooth circles or gradients).
 const T=Math.floor(time/83),step=(n,frames)=>Math.floor(T/frames)%n;
 const px=(x,y,col)=>rect(Math.round(x),Math.round(y),1,1,col);
 const glyph=(rows,x,y,col)=>rows.forEach((r,dy)=>[...r].forEach((ch,dx)=>{if(ch==='#')rect(Math.round(x)+dx,Math.round(y)+dy,1,1,col);}));
 // Corner brackets around a thing; they breathe 2 px in and out.
 const ring=(x,y,r,col)=>{const R=Math.round(r)+(step(2,4)?2:0),x0=Math.round(x),y0=Math.round(y);for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const cx=x0+sx*R,cy=y0+sy*R;rect(cx-(sx>0?3:0),cy,4,1,col);rect(cx,cy-(sy>0?3:0),1,4,col);}};
 // A diamond of light pixels around the emerald that blinks on and off.
 const glow=(x,y,r,col)=>{if(step(3,3)===2)return;const R=Math.round(r/3);for(let d=0;d<=R;d++){px(x-R+d,y-d,col);px(x+R-d,y-d,col);px(x-R+d,y+d,col);px(x+R-d,y+d,col);}};
 const pulse=()=>step(2,4);
 const windowOpen=Boolean(s.rules.exits?.includes('window')),doorLocked=Boolean(s.rules.exits&&!s.rules.exits.includes('door')),relic=s.relic||RELIC,moved=relic!==RELIC&&relic.x!==RELIC.x;
 c.fillStyle='#131827';c.fillRect(0,0,480,288);
 // Wallpaper, stone foundation and repeating original architectural details.
 for(let x=0;x<WIDTH;x+=16){rect(x,48,1,256,'#2e2838');for(let y=64;y<290;y+=32)rect(x+7,y,2,3,'#383040');}
 for(let x=64;x<WIDTH;x+=144){
  rect(x,66,50,76,'#514458');rect(x+3,69,44,70,'#101b32');
  rect(x+5,71,40,65,'#24344e');rect(x+24,71,3,68,'#5d5061');rect(x+4,103,44,3,'#5d5061');
  rect(x+10,80,3,3,'#adb8c5');rect(x+37,91,2,2,'#e6d7a4');
  // moon and tiny silhouettes beyond the glass
  rect(x+8,75,10,11,'#c9cfb1');rect(x+12,73,8,10,'#24344e');
  rect(x+3,138,46,5,'#776270');
 }
 for(let x=0;x<WIDTH;x+=96){rect(x,48,7,256,'#574552');rect(x+2,48,2,256,'#74606a');rect(x-3,295,13,9,'#8a7267');}
 rect(0,GROUND,WIDTH,48,'#37303b');rect(0,GROUND,WIDTH,4,'#af8665');
 for(let x=0;x<WIDTH;x+=32){rect(x,310,30,2,'#5b4550');rect(x+16,328,30,2,'#5b4550');}
 // Upper floor, climbable one-way ledges and furniture.
 // Nights 6 and 10: the long hall's boards creak under a sprint. Lighter, warped boards show where.
 if(s.rules.creaky){rect(400,GROUND,240,4,'#d3a274');for(let x=404;x<640;x+=22)rect(x,GROUND+1,9,1,'#6e4a3a');}
 for(const p of PLATFORMS){rect(p.x,p.y,p.w,5,'#a57d61');rect(p.x,p.y+5,p.w,5,'#4b3440');for(let x=p.x+4;x<p.x+p.w;x+=16)rect(x,p.y+1,1,3,'#d0a47a');}
 for(let x=245;x<790;x+=40){rect(x,151,2,25,'#715262');rect(x-7,151,16,2,'#92717a');}
 for(let x=275;x<770;x+=150){if(windowOpen&&x===275)continue;rect(x,117,37,40,'#ab855a');rect(x+3,120,31,34,'#343447');rect(x+13,126,10,12,'#8c766d');rect(x+9,138,18,16,'#514553');}
 for(const o of BLOCKS){rect(o.x,o.y,o.w,o.h,'#805b47');rect(o.x+2,o.y+2,o.w-4,3,'#bc8b5a');rect(o.x+3,o.y+6,2,o.h-8,'#4f3c38');rect(o.x+o.w-5,o.y+6,2,o.h-8,'#4f3c38');}
 for(const h of HIDING){rect(h.x-9,h.y-35,27,35,'#283344');rect(h.x-7,h.y-33,23,31,'#435473');rect(h.x+4,h.y-32,1,31,'#26374b');rect(h.x+1,h.y-19,2,3,'#d5b87b');rect(h.x+7,h.y-19,2,3,'#d5b87b');}
 // Bookshelves on both floors.
 for(const [x,y] of [[304,303],[576,303],[440,175],[656,175]]){rect(x,y-36,35,36,'#543c38');for(let row=0;row<2;row++)for(let b=0;b<7;b++)rect(x+3+b*4,y-31+row*17,3,12,['#836052','#6f7d6d','#9d8557','#69586e'][b%4]);rect(x,y-18,35,2,'#a37f59');}
 const dim=s.rules.dark?Math.min(1,s.time/2.5):0;
 for(let x=120;x<WIDTH;x+=192){const flicker=Math.sin(time/140+x)>.1;rect(x,249,3,12,'#b69966');if(dim<1){rect(x-1,245,5,5,flicker?'#f2c76d':'#d9894c');rect(x+1,243,2,4,'#fff1b6');}else rect(x,246,3,2,'#5a5550');}
 // From night 3: a window left open upstairs, above the door. Moonlight spills onto the upper floor.
 if(windowOpen){const wx=WINDOW.x;rect(wx-14,120,28,52,'#6b5a4a');rect(wx-11,123,22,46,'#0d1a2e');rect(wx-11,123,22,46,'rgba(170,200,230,.18)');rect(wx-1,123,2,46,'#6b5a4a');rect(wx-11,145,22,2,'#6b5a4a');rect(wx-6,128,6,6,'#d9dcc0');rect(wx-18,172,36,4,'rgba(200,220,240,.22)');
  // The sash is up: the bottom pane is open.
  rect(wx-11,158,22,11,'#04070d');}
 // Entrance and vault dais.
 rect(31,261,27,43,'#1c4e49');rect(34,264,21,40,'#326d5e');rect(48,283,3,3,'#d4c38b');
 // Night 8 and 10: the front door is locked. Boards across it and a padlock.
 if(doorLocked){const tried=s.events.findLast?.(e=>e.type==='locked');const glint=tried&&s.turn-tried.turn<90&&Math.floor(s.turn/6)%2===0;rect(29,270,31,4,'#8a6a4c');rect(29,290,31,4,'#8a6a4c');if(glint)rect(37,272,16,17,'rgba(255,230,140,.55)');rect(41,278,8,7,glint?'#ffe08a':'#c9a34a');rect(43,274,4,5,glint?'#ffe08a':'#c9a34a');rect(44,276,2,3,'#1c4e49');}
 rect(932,293,33,11,'#7d7180');rect(938,288,21,5,'#b1a19c');
 // Night 9 and 10: the emerald has been moved upstairs. A small stand marks its new place.
 if(moved){rect(relic.x-8,relic.y+17,17,7,'#7d7180');rect(relic.x-5,relic.y+13,11,4,'#b1a19c');}
 // The emerald bobs as before; every two seconds a white glint sweeps across it (4 frames, pixel art).
 if(!s.hasRelic){const y=relic.y-5+(step(2,8)?1:0);rect(relic.x-4,y,8,3,'#a8f2bf');rect(relic.x-6,y+3,12,5,'#48bda1');rect(relic.x-3,y+8,6,3,'#268d83');rect(relic.x-1,y+11,2,2,'#a8f2bf');
  const g=T%24;if(g<4){const gx=relic.x-6+g*3;for(let d=0;d<10;d++){const xx=gx+Math.floor(d/2),yy=y+9-d;if(xx>=relic.x-6&&xx<relic.x+6&&yy>=y&&yy<y+11)rect(xx,yy,1,1,'#ffffff');}}}
 if(s.noise){rect(s.noise.x,298,7,2,'#b8d8da');rect(s.noise.x+9,296,3,3,'#e2ece0');}
 if(s.rules.dark&&shade){const d=shade.getContext('2d');d.globalCompositeOperation='source-over';d.clearRect(0,0,480,288);d.fillStyle=`rgba(4,6,12,${(.9*dim).toFixed(3)})`;d.fillRect(0,0,480,288);d.globalCompositeOperation='destination-out';
  const hole=(x,y,r)=>{const g=d.createRadialGradient(x-camera,y-48,0,x-camera,y-48,r);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.6,'rgba(0,0,0,.85)');g.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=g;d.fillRect(x-camera-r,y-48-r,r*2,r*2);};
  hole(s.player.x+5,s.player.y+11,72);if(!s.tutorial)hole(s.guard.x+5,s.guard.y+11,46);if(!s.hasRelic)hole(relic.x,relic.y,22);if(s.noise)hole(s.noise.x+5,298,24);
  c.drawImage(shade,0,0);}
 if(!s.tutorial&&s.status==='playing'){const r=s.rules.vision||160,gx=s.guard.x+5,gy=s.guard.y+11,col=s.sees?'#e8604c':'rgba(255,186,110,.55)',n=72;for(let i=step(2,3);i<n;i+=2){const a=i/n*Math.PI*2;px(gx+Math.cos(a)*r,gy+Math.sin(a)*r/1.5,col);}}
 const sprite=(a,guard=false)=>{
  const x=Math.round(a.x),y=Math.round(a.y),walk=Math.abs(a.vx)>.1&&a.grounded?Math.sin(time/65)*3:0;
  if(!guard&&s.hidden)return;
  // The keeper carries a lantern: a soft warm halo keeps him readable against the dark wallpaper.
  if(guard){rect(x-9,y-8,29,34,'rgba(238,125,88,.10)');rect(x-5,y-5,21,28,'rgba(238,125,88,.12)');}
  rect(x-2,y+21,15,2,'#0b101c');
  rect(x+1,y+15,3,7+Math.round(walk),guard?'#3b1f28':'#242a40');rect(x+7,y+15,3,7-Math.round(walk),guard?'#3b1f28':'#242a40');
  rect(x,y+7,11,10,guard?'#c4473c':'#cfc196');rect(x+2,y+7,6,9,guard?'#ee7d58':'#f1e5bd');
  rect(x+1,y+1,8,7,'#d3a083');rect(x+(a.facing>0?8:1),y+3,2,2,'#191c2a');
  rect(x-1,y,12,3,guard?'#7b2630':'#5d7bab');rect(x+1,y-3,8,4,guard?'#7b2630':'#5d7bab');
  // Five-night game: once he has learned to reach up, his arms go up when the burglar is close and above him.
  const reaching=guard&&s.rules.same&&s.policy.habits?.reach&&!s.tutorial&&Math.abs(s.player.x-a.x)<70&&s.player.y+s.player.h<a.y+14&&!s.hidden;
  if(reaching){rect(x-3,y-12,3,15,'#c48f79');rect(x+11,y-12,3,15,'#c48f79');rect(x-4,y-14,5,3,'#d3a083');rect(x+10,y-14,5,3,'#d3a083');}
  else rect(x+(a.facing>0?10:-2),y+10,3,5,'#c48f79');
  if(!guard&&s.hasRelic)rect(x-4,y+9,4,5,'#65d7b2');
 };
 if(!s.tutorial&&s.status==='playing'){const bob=step(2,4);
  if(s.sees){rect(s.guard.x+3,s.guard.y-22-bob,3,6,'#ff8a70');rect(s.guard.x+3,s.guard.y-14-bob,3,2,'#ff8a70');}
  else if(s.lastSeen?.ttl>0)glyph(['.##.','#..#','..#.','.#..','....','.#..'],s.guard.x+2,s.guard.y-21-bob,'#f5d281');}
 // What the keeper has learned about you, drawn where it happens.
 const H=s.policy.habits;
 if(!s.tutorial&&H){
  const mark=(x,str)=>{rect(x-4,296,9,2,'#e8604c');rect(x-1,289,3,9,'#e8604c');c.font='bold 7px monospace';c.fillStyle='#ff8a70';c.textAlign='center';c.fillText(str,Math.round(x-camera),229);c.textAlign='left';};
  // One sign only: the spot he is waiting at (or walking to) right now. When he has learned two spots, it moves with him.
  const w=s.waitStop;if(w){if(w.up){const x=Math.round(w.x);rect(x-4,168,9,2,'#e8604c');rect(x-1,161,3,9,'#e8604c');c.font='bold 7px monospace';c.fillStyle='#ff8a70';c.textAlign='center';c.fillText('HE WAITS HERE',Math.round(x-camera),104);c.textAlign='left';}else mark(w.x+5,'HE WAITS HERE');}

  if(H.wardrobe!=null){const w=HIDING[H.wardrobe];rect(w.x-9,w.y-37,27,2,'#e8604c');c.font='bold 7px monospace';c.fillStyle='#ff8a70';c.fillText('HE OPENS IT',Math.round(w.x-14-camera),w.y-108);}
  // (the window sign is covered by the single sign above)
  // (the door sign is covered by the single sign too: when he checks the door, the sign is there)
 }
 // Your last heist, as the keeper remembers it.
 if(ghost?.length){for(const p of ghost)rect(p.x+3,p.y+10,3,3,'rgba(238,125,88,.75)');}
 if(replay?.length){for(const p of replay)rect(p.x+4,p.y+20,2,2,'#e8d4a0');}
 sprite(s.guard,true);sprite(s.player);
 const label=(str,x,y,color='#e3d6af')=>{c.font='7px monospace';c.fillStyle=color;c.fillText(str,Math.round(x-camera),y-48);};
 if(s.tutorial)for(let i=0;i<3;i++){const ph=(T+i*6)%18,big=ph>9;glyph(big?['####','..#.','.#..','####']:['###','.#.','###'],s.guard.x+8+Math.floor(ph/2),s.guard.y-6-ph,ph>14?'#7d8fb0':'#a9c4ec');}
  label(doorLocked?'LOCKED':'EXIT',doorLocked?26:30,253,doorLocked?'#e8a25c':'#8bddb5');
 // Prompts only where they apply: at a wardrobe, at the window, at the locked door.
 if(s.status==='playing'&&started){const p=s.player,key=k=>touch?k.replace('H · ','').replace('HIDE · ',''):k;
  const prompt=(str,x,y,col='#fff4d6')=>{c.font='bold 8px monospace';const w=c.measureText(str).width+8,px=Math.round(x-camera-w/2),py=Math.round(y-48);c.fillStyle='rgba(16,18,26,.85)';c.fillRect(px,py-9,w,12);c.fillStyle=col;c.fillText(str,px+4,py);};
  const atWardrobe=HIDING.some(h=>Math.abs(p.x-h.x)<26&&Math.abs(p.y+22-h.y)<8);
  const atWindow=windowOpen&&upstairs(p)&&Math.abs(p.x-WINDOW.x)<WINDOW.reach+14;
  // Night 1 only: little pixel signs on both staircases, so nobody mistakes them for shelves.
  if(s.tutorial){const sign=(str,x,wy)=>{const y=wy-48;c.font='bold 8px monospace';const w=Math.ceil(c.measureText(str).width)+8,px=Math.round(x-camera-w/2);c.fillStyle='rgba(16,18,26,.9)';c.fillRect(px,y-10,w,13);c.strokeStyle='#e3d6af';c.lineWidth=1;c.strokeRect(px+.5,y-9.5,w-1,12);c.fillStyle='#f5d281';c.fillText(str,px+4,y);};
   sign('STAIRS ↗ UP',122,266);sign('UP ↖ STAIRS',918,266);
   const blink=Math.floor(time/400)%2;c.fillStyle='#f5d281';if(blink)for(const st of PLATFORMS)if(st.w<=96){const cx=Math.round(st.x+st.w/2-camera);c.fillRect(cx-1,st.y-55,3,2);c.fillRect(cx-2,st.y-53,5,2);}}
  if(s.tutorial){const pulse=.55+.45*Math.sin(time/260);for(const o of BLOCKS){c.save();c.globalAlpha=pulse;c.strokeStyle='#f5d281';c.lineWidth=2;c.strokeRect(Math.round(o.x-camera)-2,o.y-50,o.w+4,o.h+4);c.restore();}}
  if(s.hidden)prompt('HIDDEN · MOVE TO LEAVE',p.x+5,p.y-8,'#a9bbd8');
  else if(atWindow)prompt(s.hasRelic?key('H · CLIMB OUT'):'A WAY OUT · BRING THE EMERALD',p.x+5,p.y-8,s.hasRelic?'#8bddb5':'#fff4d6');
  else if(atWardrobe)prompt(touch?'HIDE':'H · HIDE',p.x+5,p.y-8,'#a9bbd8');
  else if(doorLocked&&s.hasRelic&&p.x<110&&!upstairs(p))prompt('LOCKED · THE WINDOW IS UPSTAIRS',p.x+40,p.y-8,'#e8a25c');
  // Night 1 (builder feedback, 7 Nov): the crates you must jump glow, with a JUMP tag, so nobody gets stuck on them.
  else if(s.tutorial&&!s.hasRelic&&!upstairs(p)&&p.x+(p.w||10)>BLOCKS[0].x-64&&p.x<BLOCKS[0].x)prompt(touch?'JUMP ↑':'SPACE · JUMP',BLOCKS[0].x+BLOCKS[0].w/2,BLOCKS[0].y-12,'#f5d281');
  // and "a brief cue toward the stairs/nearest wardrobe": on the first nights he is awake (2 and 3), when he spots you
  // downstairs, which way the nearest wardrobe is; once he chases, the stairs too. Explained once, then left to you.
  else if(!s.tutorial&&night>=2&&night<=3&&s.sees&&!upstairs(p)){const h=HIDING.reduce((b,w)=>Math.abs(w.x-p.x)<Math.abs(b.x-p.x)?w:b),l=h.x<p.x;
   if(Math.abs(h.x-p.x)<240)prompt((s.rules.chase?'↑ STAIRS · ':'')+(l?'◂ ':'')+'WARDROBE · '+(touch?'HIDE':'H')+(l?'':' ▸'),p.x+5,p.y-8,'#ffb199');}}if(s.rules.creaky&&s.time<6)label('CREAKY FLOOR · WALK',474,318,'#d3a274');
 // (No control hints on the board: they are under it.)
 if(started&&s.status==='playing'){
  const gold='#f2c27b',r=13;
  // Night 1, first seconds: point at the three things that matter (the sleeping keeper, the emerald, the way out).
  if(s.tutorial&&s.time<7){ring(s.guard.x+5,s.guard.y+11,r+4,gold,2);ring(relic.x,relic.y+3,r,gold,2);ring(46,283,r+6,gold,2);}
  // What is new tonight glows for the first seconds.
  if(s.time<6){
   if(night===3||night===8||night===10){if(windowOpen)ring(WINDOW.x,150,r+8,gold,2);}
   if(doorLocked&&(night===8||night===10))ring(45,282,r+2,gold,2);
   if(s.rules.creaky&&(night===6||night===10)&&pulse())for(let x=402;x<640;x+=8)rect(x,GROUND-3,4,1,'#f2c27b');
   if(moved&&(night===9||night===10)&&!s.hasRelic)ring(relic.x,relic.y+3,r+4,gold,2);}
  // Where to go when it is off screen: the emerald first, then the way out.
  const target=!s.hasRelic?{x:relic.x,y:relic.y,icon:'◆',col:'#8bddb5'}:(doorLocked||(windowOpen&&upstairs(s.player)))?{x:WINDOW.x,y:150,icon:'⌂',col:'#8bddb5'}:{x:46,y:280,icon:'⌂',col:'#8bddb5'};
  const tx=target.x-camera;if(tx<4||tx>476){const left=tx<4,ax=left?10:470,ay=Math.max(26,Math.min(270,target.y-48)),nudge=(step(2,4)?3:0)*(left?-1:1);
   c.fillStyle='rgba(16,18,26,.75)';c.fillRect(ax-9+nudge,ay-9,18,18);c.fillStyle=target.col;c.font='bold 10px monospace';c.textAlign='center';c.fillText(left?'◀':'▶',ax+nudge+(left?-2:2),ay+4);c.font='7px monospace';c.fillText(target.icon,ax+nudge+(left?5:-5),ay+3);c.textAlign='left';}
  // Taking the emerald: a burst of sparkles.
  const got=s.events.find(e=>e.type==='relic');if(got&&s.turn-got.turn<36){const k=Math.floor((s.turn-got.turn)/5),bx=s.player.x+5,by=s.player.y+8;for(let i=0;i<8;i++){const a=i*Math.PI/4,d=6+k*4;rect(bx+Math.round(Math.cos(a)*d),by+Math.round(Math.sin(a)*d),2,2,k>4?'#7fe6bd':'#eafff4');}}
 }
 if(s.status==='caught'&&s.cause==='seen'&&s.spotted){const x=s.spotted.x+5-camera,y=s.spotted.y-48;ring(s.spotted.x+5,s.spotted.y+6,11,'#ff8a70');c.font='bold 8px monospace';c.fillStyle='#ff8a70';c.textAlign='center';c.fillText('SPOTTED HERE',x,y-10);c.textAlign='left';}
 if(s.status==='caught'){c.fillStyle='rgba(10,8,14,.55)';c.fillRect(0,0,480,288);c.fillStyle='rgba(122,24,32,.92)';c.fillRect(0,112,480,50);c.textAlign='center';c.font='bold 30px Georgia,serif';c.fillStyle='#f4e7c8';c.fillText(s.time>=s.rules.limit?'DAWN. CAUGHT.':'CAUGHT.',240,146);c.font='bold 10px monospace';c.fillStyle='#ffd9c9';c.fillText({seen:'HE SAW YOU',heard:'HE HEARD THE FLOOR CREAK',waiting:'HE WAS WAITING FOR YOU HERE',exit:'HE RAN TO THE EXIT WHEN THE EMERALD MOVED',patrol:'YOU WALKED INTO HIS ROUNDS',glass:'HE CAME TO THE NOISE',dawn:'THE SUN CAME UP'}[s.cause]||(s.time>=s.rules.limit?'THE SUN CAME UP':'THE KEEPER HAS YOUR NUMBER'),240,158);c.textAlign='left';}
 if(briefing){c.fillStyle='rgba(10,8,14,.78)';c.fillRect(0,16,480,272);c.textAlign='center';c.font='bold 22px Georgia,serif';c.fillStyle='#f4e7c8';c.fillText(`NIGHT ${briefing.night}`,240,70);
  let top=92;if(briefing.news){c.font='7px monospace';c.fillStyle='#8bddb5';c.fillText('NEW TONIGHT',240,top);c.font='bold 9px monospace';c.fillText(briefing.news,240,top+14);top+=36;}
  if(briefing.lines.length){c.font='7px monospace';c.fillStyle='#d9bd80';c.fillText('TONIGHT HE KNOWS',240,top);c.fillStyle='#ff8a70';c.font='bold 8px monospace';briefing.lines.forEach((l,i)=>c.fillText(l,240,top+20+i*14));}
  c.font='7px monospace';c.fillStyle='#b1b9bd';c.fillText('GET READY…',240,248);c.textAlign='left';}
 const out=canvas.getContext('2d');out.imageSmoothingEnabled=false;out.clearRect(0,0,canvas.width,canvas.height);out.drawImage(buffer,0,0,canvas.width,canvas.height);
}
export function tileAt(canvas,e){const r=canvas.getBoundingClientRect();return {x:Math.floor(((e.clientX-r.left)/r.width*480+camera)/16),y:18};}
