import {WIDTH,GROUND,PLATFORMS,BLOCKS,HIDING,RELIC} from './engine.mjs';
const buffer=typeof document==='undefined'?null:document.createElement('canvas');if(buffer){buffer.width=480;buffer.height=288;}
let camera=0;
export function draw(canvas,s,{time=0,started=false,replay=null}={}){
 const c=buffer.getContext('2d');c.imageSmoothingEnabled=false;
 camera=Math.max(0,Math.min(WIDTH-480,Math.round(s.player.x-180)));
 const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x-camera),Math.round(y-48),w,h);};
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
 for(const p of PLATFORMS){rect(p.x,p.y,p.w,5,'#a57d61');rect(p.x,p.y+5,p.w,5,'#4b3440');for(let x=p.x+4;x<p.x+p.w;x+=16)rect(x,p.y+1,1,3,'#d0a47a');}
 for(let x=245;x<790;x+=40){rect(x,151,2,25,'#715262');rect(x-7,151,16,2,'#92717a');}
 for(let x=275;x<770;x+=150){rect(x,117,37,40,'#ab855a');rect(x+3,120,31,34,'#343447');rect(x+13,126,10,12,'#8c766d');rect(x+9,138,18,16,'#514553');}
 for(const o of BLOCKS){rect(o.x,o.y,o.w,o.h,'#805b47');rect(o.x+2,o.y+2,o.w-4,3,'#bc8b5a');rect(o.x+3,o.y+6,2,o.h-8,'#4f3c38');rect(o.x+o.w-5,o.y+6,2,o.h-8,'#4f3c38');}
 for(const h of HIDING){rect(h.x-9,h.y-35,27,35,'#283344');rect(h.x-7,h.y-33,23,31,'#435473');rect(h.x+4,h.y-32,1,31,'#26374b');rect(h.x+1,h.y-19,2,3,'#d5b87b');rect(h.x+7,h.y-19,2,3,'#d5b87b');}
 // Bookshelves on both floors.
 for(const [x,y] of [[304,303],[576,303],[440,175],[656,175]]){rect(x,y-36,35,36,'#543c38');for(let row=0;row<2;row++)for(let b=0;b<7;b++)rect(x+3+b*4,y-31+row*17,3,12,['#836052','#6f7d6d','#9d8557','#69586e'][b%4]);rect(x,y-18,35,2,'#a37f59');}
 for(let x=120;x<WIDTH;x+=192){const flicker=Math.sin(time/140+x)>.1;rect(x,249,3,12,'#b69966');rect(x-1,245,5,5,flicker?'#f2c76d':'#d9894c');rect(x+1,243,2,4,'#fff1b6');}
 // Entrance and vault dais.
 rect(31,261,27,43,'#1c4e49');rect(34,264,21,40,'#326d5e');rect(48,283,3,3,'#d4c38b');
 rect(932,293,33,11,'#7d7180');rect(938,288,21,5,'#b1a19c');
 if(!s.hasRelic){const y=RELIC.y-5+Math.round(Math.sin(time/260)*2);rect(RELIC.x-4,y,8,3,'#a8f2bf');rect(RELIC.x-6,y+3,12,5,'#48bda1');rect(RELIC.x-3,y+8,6,3,'#268d83');rect(RELIC.x-1,y+11,2,2,'#a8f2bf');}
 if(s.noise){rect(s.noise.x,298,7,2,'#b8d8da');rect(s.noise.x+9,296,3,3,'#e2ece0');}
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
  rect(x+(a.facing>0?10:-2),y+10,3,5,'#c48f79');
  if(!guard&&s.hasRelic)rect(x-4,y+9,4,5,'#65d7b2');
 };
 if(!s.tutorial&&!s.hidden&&Math.abs(s.guard.x-s.player.x)<160){rect(s.guard.x-3,s.guard.y-13,15,1,'#d17a65');rect(s.guard.x+3,s.guard.y-21,3,6,'#f5ba81');rect(s.guard.x+3,s.guard.y-13,3,2,'#f5ba81');}
 if(replay?.length){for(const p of replay)rect(p.x+4,p.y+20,2,2,'#e8d4a0');}
 sprite(s.guard,true);sprite(s.player);
 const label=(str,x,y,color='#e3d6af')=>{c.font='7px monospace';c.fillStyle=color;c.fillText(str,Math.round(x-camera),y-48);};
 if(s.tutorial)label('zzz',s.guard.x,s.guard.y-10,'#a5a1b7');
 label('EXIT',30,253,'#8bddb5');label('HIDE',150,260,'#a9bbd8');label('VAULT',929,254,'#d9bd80');
 c.fillStyle='#101622';c.fillRect(0,0,480,16);c.font='7px monospace';c.fillStyle='#b1b9bd';c.fillText(s.tutorial?'COURTESY ROUND • SECURITY IS DECORATIVE':'A / D RUN   SPACE JUMP   H HIDE   F DECOY',10,11);
 if(s.status==='caught'){c.fillStyle='rgba(10,8,14,.55)';c.fillRect(0,0,480,288);c.fillStyle='rgba(122,24,32,.92)';c.fillRect(0,112,480,50);c.textAlign='center';c.font='bold 30px Georgia,serif';c.fillStyle='#f4e7c8';c.fillText(s.time>=90?'DAWN. CAUGHT.':'CAUGHT.',240,146);c.font='7px monospace';c.fillStyle='#f0b9a6';c.fillText(s.time>=90?'THE HOUSE SEALED ITS DOORS':'THE KEEPER HAS YOUR NUMBER',240,158);c.textAlign='left';}
 const out=canvas.getContext('2d');out.imageSmoothingEnabled=false;out.clearRect(0,0,canvas.width,canvas.height);out.drawImage(buffer,0,0,canvas.width,canvas.height);
}
export function tileAt(canvas,e){const r=canvas.getBoundingClientRect();return {x:Math.floor(((e.clientX-r.left)/r.width*480+camera)/16),y:18};}
