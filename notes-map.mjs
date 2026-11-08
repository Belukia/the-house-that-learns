// HIS NOTES (Tami, 8 Nov): a button that shows, on a map of the whole house, everything the keeper has learned about you:
// where he waits, which wardrobes he opens, where he runs when the emerald moves, and the escape routes he learned it from.
// Only what the policy really holds is drawn, so the map never claims a lesson he has not learned.
import {WIDTH,GROUND,PLATFORMS,BLOCKS,HIDING,RELIC,WINDOW,ENTRY,UPPER_PATH,knownLabels} from './engine.mjs';
const S=1,TOP=40,RED='#e8604c',GOLD='#d9bd80',INK='#efe4cc',DIM='#5d5061';
const X=x=>Math.round(x*S),Y=y=>Math.round((y-TOP)*S);

// Escape routes, sampled small enough to keep in localStorage: one point every 1/3 s.
export function samplePath(state){
  const pts=[];state.history.forEach((h,i)=>{if(i%20===0)pts.push([Math.round(h.player.x),Math.round(h.player.y)]);});
  const last=state.history.at(-1);if(last)pts.push([Math.round(last.player.x),Math.round(last.player.y)]);
  return pts;
}

export function drawNotes(canvas,{state,habits,policy,paths=[]}){
  const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height,rules=state.rules||{};
  c.clearRect(0,0,W,H);c.fillStyle='#131827';c.fillRect(0,0,W,H);
  const box=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(X(x),Y(y),Math.max(1,Math.round(w*S)),Math.max(1,Math.round(h*S)));};
  const text=(t,x,y,col,align='center')=>{c.font='bold 21px ui-monospace,Menlo,monospace';c.textAlign=align;c.fillStyle=col;c.fillText(t,x,y);};
  // The house: floor, upper floor, stairs, crates, wardrobes, door, window, vault.
  box(0,GROUND,WIDTH,4,DIM);for(const p of PLATFORMS)box(p.x,p.y,p.w,3,DIM);for(const b of BLOCKS)box(b.x,b.y,b.w,b.h,'#6e4a3a');
  HIDING.forEach(h=>box(h.x-12,h.y-44,24,44,'#2f4f7a'));
  const doorLocked=Boolean(rules.exits&&!rules.exits.includes('door')),windowOpen=Boolean(rules.exits?.includes('window'));
  box(ENTRY.x-28,GROUND-48,14,48,doorLocked?'#444':'#3f7f5a');text(doorLocked?'DOOR (LOCKED)':'DOOR',X(ENTRY.x-28),Y(GROUND)+24,doorLocked?'#888':'#7fc59a','left');
  if(windowOpen){box(WINDOW.x-10,176-34,20,30,'#7fa6c5');text('WINDOW',X(WINDOW.x),Y(176)+22,'#9fc3dd');}
  const relic=state.relic||RELIC;if(!state.hasRelic){box(relic.x-5,relic.y-10,10,10,'#45d483');}text('EMERALD',X(relic.x),Y(relic.y+24)+(relic.y<200?0:16),'#45d483');
  // Your escapes he learned from: faint dotted lines, newest brightest.
  paths.slice(-3).forEach((p,i,a)=>{c.globalAlpha=.35+.25*(i===a.length-1);c.fillStyle=GOLD;
    for(const [x,y] of p.pts)c.fillRect(X(x+6)-2,Y(y+10)-2,4,4);
    const end=p.pts.at(-1);if(end)text(`NIGHT ${p.night}`,X(end[0])+8,Y(end[1]+4),GOLD,'left');c.globalAlpha=1;});
  // What he learned, in red.
  const h=habits||{},same=Boolean(rules.same);
  const routes=same&&h.routes?.length?h.routes:h.waitAt!=null?[h.waitAt]:[];
  const stacks={};const say=(x,y,label)=>{const k=Math.round(x/120)+':'+Math.round(y/60);const n=(stacks[k]=(stacks[k]||0)+1);text(label,X(x),Y(y)-16-24*(n-1),RED);};
  const mark=(x,y,label)=>{const cx=X(x),cy=Y(y);c.strokeStyle=RED;c.lineWidth=3;c.beginPath();c.moveTo(cx-8,cy-8);c.lineTo(cx+8,cy+8);c.moveTo(cx+8,cy-8);c.lineTo(cx-8,cy+8);c.stroke();say(x,y,label);};
  for(const t of routes){if(t===52)mark(rules.ambush??UPPER_PATH,176-14,'WAITS HERE');else mark(t*16,GROUND-14,'WAITS HERE');}
  const wards=same&&h.wardrobes?.length?h.wardrobes:h.wardrobe!=null?[h.wardrobe]:[];
  for(const w of new Set(wards)){const d=HIDING[w];if(!d)continue;c.strokeStyle=RED;c.lineWidth=2;c.strokeRect(X(d.x-14),Y(d.y-46),Math.round(28*S),Math.round(48*S));say(d.x,d.y-50,'OPENS IT');}
  if(h.window&&windowOpen&&same)mark(WINDOW.x,176-14,'WAITS AT THE WINDOW');
  if(h.exit){const toWindow=windowOpen&&(doorLocked||h.window);const x=toWindow?WINDOW.x:ENTRY.x+40,y=toWindow?176-14:GROUND-50;say(x,y,'RUNS HERE WHEN THE EMERALD MOVES');}
  // Right now: you and him.
  const dot=(x,y,col,label)=>{c.fillStyle=col;c.beginPath();c.arc(X(x),Y(y),10,0,Math.PI*2);c.fill();c.font='bold 14px ui-monospace,Menlo,monospace';c.textAlign='center';c.fillStyle='#131827';c.fillText(label[0],X(x),Y(y)+5);};
  dot(state.guard.x+8,state.guard.y+11,RED,'K');dot(state.player.x+6,state.player.y+11,INK,'Y');
  return knownLabels(habits,policy||{},rules);
}
