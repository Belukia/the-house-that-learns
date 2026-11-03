import {MAP,ENTRY,RELIC,HIDING,floor,equal,distance,sight} from './engine.mjs';
export const TILE=44, OX=82, OY=60;
export function tileAt(canvas,event){const r=canvas.getBoundingClientRect();return {x:Math.floor(((event.clientX-r.left)*1000/r.width-OX)/TILE),y:Math.floor(((event.clientY-r.top)*790/r.height-OY)/TILE)};}
const rooms=[{x:3,y:2,name:'THE STUDY'},{x:9,y:2,name:'THE ATRIUM'},{x:15,y:2,name:'THE VAULT'},{x:3,y:11,name:'THE LIBRARY'},{x:9,y:11,name:'THE GALLERY'},{x:15,y:11,name:'WINTER GARDEN'}];
function rect(c,x,y,w,h,fill){c.fillStyle=fill;c.fillRect(x,y,w,h);}
function circle(c,x,y,r,fill){c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);}
function diamond(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.7,y);c.lineTo(x,y+r);c.lineTo(x-r*.7,y);c.closePath();c.fill();}
function person(c,p,type,t,hidden){const x=OX+(p.x+.5)*TILE,y=OY+(p.y+.5)*TILE;
 c.save();c.globalAlpha=hidden?.4:1;
 c.fillStyle='#0006';c.beginPath();c.ellipse(x,y+9,12,6,0,0,7);c.fill();
 rect(c,x-7,y+1,5,13,'#171820');rect(c,x+3,y+1,5,13,'#171820');
 c.fillStyle=type==='guard'?'#a15950':'#c8bd98';c.beginPath();c.moveTo(x-7,y-8);c.lineTo(x+7,y-8);c.lineTo(x+11,y+8);c.lineTo(x-11,y+8);c.closePath();c.fill();
 circle(c,x,y-13,7,type==='guard'?'#bc9380':'#c9b18c');
 rect(c,x-10,y-20,20,5,type==='guard'?'#392c31':'#343e3a');rect(c,x-6,y-25,12,8,type==='guard'?'#593b3c':'#414e43');
 rect(c,x-6,y-14,12,3,'#242930');rect(c,x+1,y-14,2,2,'#e8d49e');
 if(type==='guard'){rect(c,x+13,y-1,4,8,'#9c7950');glow(c,x+15,y+1,25,'#e9a94833');circle(c,x+15,y+1,3,'#f0c477');}
 c.restore();}
export function draw(canvas,state,options={}){
 const c=canvas.getContext('2d'), t=options.time||0;
 rect(c,0,0,1000,790,'#181c25');
 // A subtle garden outside the mansion walls.
 for(let i=0;i<65;i++){const x=(i*173+21)%1000,y=(i*239+43)%790;circle(c,x,y,1+(i%2),'#525e4230');}
 rect(c,OX-8,OY+12,MAP[0].length*TILE+16,MAP.length*TILE+2,'#06080d70');
 for(let y=0;y<MAP.length;y++)for(let x=0;x<MAP[0].length;x++){
  const px=OX+x*TILE,py=OY+y*TILE,open=MAP[y][x]==='.';
  if(open){
   const corridor=y===7||y===4||y===10;
   rect(c,px,py,TILE,TILE,corridor?'#383b39':y<7?'#43453d':'#42403b');
   rect(c,px+1,py+1,TILE-2,TILE-2,(x+y)%2?'#ffffff04':'#00000006');
   c.strokeStyle='#181b2045';c.lineWidth=1;c.beginPath();c.moveTo(px,py+TILE/2);c.lineTo(px+TILE,py+TILE/2);c.stroke();
   if(y!==7){c.beginPath();c.moveTo(px+TILE/2,py);c.lineTo(px+TILE/2,py+TILE/2);c.stroke();}
  }
 }
 // Worn rugs; all are walkable.
 for(const r of rooms){const x=OX+(r.x-1.45)*TILE,y=OY+(r.y-.1)*TILE,w=2.9*TILE,h=2.2*TILE;
  rect(c,x,y,w,h,r.x===9?'#68504470':r.y<7?'#4c605270':'#5c4b4970');c.strokeStyle='#b29a6a44';c.strokeRect(x+5,y+5,w-10,h-10);
  c.strokeStyle='#b29a6a22';c.strokeRect(x+10,y+10,w-20,h-20);
  diamond(c,x+w/2,y+h/2,16,'#b29a6a24');
 }
 if(state&&options.started){
  for(let y=1;y<14;y++)for(let x=1;x<18;x++)if(floor({x,y})&&sight(state.guard,{x,y}))rect(c,OX+x*TILE+1,OY+y*TILE+1,TILE-2,TILE-2,'#b4554135');
 }
 // The previous escape becomes a faint, visible memory.
 const trail=options.replay||options.trail;
 if(trail?.length){c.beginPath();c.strokeStyle=options.replay?'#debd78aa':'#b4c1ad30';c.lineWidth=3;c.setLineDash([4,7]);trail.forEach((p,i)=>{const x=OX+(p.x+.5)*TILE,y=OY+(p.y+.5)*TILE;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();c.setLineDash([]);}
 if(options.aiming&&state){for(let y=1;y<14;y++)for(let x=1;x<18;x++)if(floor({x,y})&&distance(state.player,{x,y})<=7)rect(c,OX+x*TILE+2,OY+y*TILE+2,TILE-4,TILE-4,'#b9c89b20');
  const a=options.aim;c.strokeStyle='#dbca95';c.lineWidth=2;c.strokeRect(OX+a.x*TILE+4,OY+a.y*TILE+4,TILE-8,TILE-8);}
 // Raised stone wall tops and the shaded inner edge.
 for(let y=0;y<MAP.length;y++)for(let x=0;x<MAP[0].length;x++)if(MAP[y][x]==='#'){
  const px=OX+x*TILE,py=OY+y*TILE;
  rect(c,px,py,TILE,TILE,'#272c32');rect(c,px+2,py+2,TILE-4,TILE-4,'#363b3e');
  rect(c,px+2,py+2,TILE-4,3,'#62645b');rect(c,px+2,py+TILE-5,TILE-4,3,'#161c25');
  c.strokeStyle='#1e252b';c.lineWidth=2;c.strokeRect(px+2,py+2,TILE-4,TILE-4);
  if(MAP[y+1]?.[x]==='.')rect(c,px,py+TILE,TILE,7,'#0d111c66');
 }
 // Warm brass wall sconces.
 for(const p of [{x:3,y:6},{x:9,y:6},{x:15,y:6},{x:3,y:8},{x:9,y:8},{x:15,y:8},{x:0,y:4},{x:18,y:4},{x:0,y:10},{x:18,y:10}]){
  const x=OX+(p.x+.5)*TILE,y=OY+(p.y+.5)*TILE;glow(c,x,y,75,'#ce9b4435');rect(c,x-2,y-3,4,8,'#b49a60');circle(c,x,y-5,2.5+Math.sin(t/400+p.x)*.3,'#edc97e');
 }
 // Wardrobes are the only hiding furniture, marked to match the legend.
 for(const p of HIDING){const x=OX+p.x*TILE+5,y=OY+p.y*TILE-2;rect(c,x+3,y+7,34,38,'#0b101650');rect(c,x,y,34,38,'#55566b');rect(c,x+3,y+3,28,30,'#3e4355');
  rect(c,x+16,y+3,2,30,'#9394a0');circle(c,x+13,y+19,1.5,'#c7b78d');circle(c,x+21,y+19,1.5,'#c7b78d');
  c.strokeStyle='#a3a3ac88';c.setLineDash([2,3]);c.strokeRect(OX+p.x*TILE+1,OY+p.y*TILE+1,TILE-2,TILE-2);c.setLineDash([]);
 }
 // Plants and bookcases stay on the raised perimeter.
 for(const p of [{x:0,y:1},{x:18,y:1},{x:0,y:13},{x:18,y:13},{x:6,y:2},{x:12,y:11}]){
  const x=OX+(p.x+.5)*TILE,y=OY+(p.y+.5)*TILE;circle(c,x,y+4,8,'#685248');for(let i=0;i<5;i++)circle(c,x+Math.cos(i*1.7)*7,y-3+Math.sin(i*1.7)*6,6,'#506456');
 }
 c.textAlign='center';c.font='8px Arial';c.fillStyle='#c5c0a667';
 for(const r of rooms){c.fillText(r.name,OX+(r.x+.5)*TILE,OY+(r.y-1)*TILE+7);}
 const ex=OX+(ENTRY.x+.5)*TILE,ey=OY+(ENTRY.y+.5)*TILE;
 glow(c,ex,ey,40,'#65ad8735');c.strokeStyle='#8cb092';c.lineWidth=2;c.strokeRect(ex-14,ey-14,28,28);c.font='15px Georgia';c.fillStyle='#98b59b';c.fillText('↟',ex,ey+5);
 if(!state?.hasRelic){const x=OX+(RELIC.x+.5)*TILE,y=OY+(RELIC.y+.5)*TILE;glow(c,x,y,50+Math.sin(t/600)*5,'#48c7a25c');rect(c,x-12,y+8,24,9,'#837b67');diamond(c,x,y-3,13,'#83cfac');diamond(c,x-3,y-6,7,'#d6f2cb');c.strokeStyle='#c9efd0';c.lineWidth=1;c.beginPath();c.moveTo(x-8,y-3);c.lineTo(x+7,y-3);c.lineTo(x,y+10);c.stroke();}
 if(state?.noise){const x=OX+(state.noise.x+.5)*TILE,y=OY+(state.noise.y+.5)*TILE;c.strokeStyle='#d1bd87aa';c.lineWidth=2;c.beginPath();c.arc(x,y,7+(t/90)%15,0,Math.PI*2);c.stroke();c.font='18px Georgia';c.fillStyle='#dbc38a';c.fillText('♧',x,y+5);}
 if(state){person(c,state.guard,'guard',t,false);person(c,state.player,'player',t,state.hidden);}
 const v=c.createRadialGradient(500,380,200,500,380,610);v.addColorStop(0,'transparent');v.addColorStop(1,'#060911aa');c.fillStyle=v;c.fillRect(0,0,1000,790);
 // Fine estate border and compass.
 c.strokeStyle='#8b825c33';c.lineWidth=1;c.strokeRect(25,22,950,744);c.font='10px Georgia';c.textAlign='center';c.fillStyle='#9d9478';c.fillText('N',954,54);c.beginPath();c.moveTo(954,62);c.lineTo(954,88);c.moveTo(947,76);c.lineTo(961,76);c.stroke();
 c.font='8px Arial';c.fillStyle='#a2a18b66';c.fillText('BLACKTHORN ESTATE  /  GROUND FLOOR',500,750);
}
