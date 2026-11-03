export const MAP = [
 '###################',
 '#.....#.....#.....#',
 '#.....#.....#.....#',
 '#.....#.....#.....#',
 '#.................#',
 '#.....#.....#.....#',
 '###.#####.#####.###',
 '#.................#',
 '###.#####.#####.###',
 '#.....#.....#.....#',
 '#.................#',
 '#.....#.....#.....#',
 '#.....#.....#.....#',
 '#.....#.....#.....#',
 '###################'
];
export const ENTRY = {x:3,y:13}, RELIC = {x:15,y:2};
export const HIDING = [{x:1,y:3},{x:5,y:11},{x:13,y:11},{x:17,y:3}];
export const DEFAULT_POLICY = Object.freeze({
 name:'The trusting keeper', decoySkepticism:0, protectRelic:false,
 patrol:[{x:9,y:4},{x:9,y:7},{x:3,y:7},{x:3,y:10},{x:9,y:10},{x:15,y:10},{x:15,y:7},{x:15,y:4}],
 lesson:'Every sound deserves my attention.'
});
export const equal=(a,b)=>a.x===b.x&&a.y===b.y;
export const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const floor=(p)=>Boolean(p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&MAP[p.y]?.[p.x]==='.');
export function neighbors(p){return [{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}].filter(floor);}
export function path(from,to){
 if(!floor(from)||!floor(to))return [];
 const key=p=>`${p.x},${p.y}`, q=[[from]], seen=new Set([key(from)]);
 for(let i=0;i<q.length;i++){
  const route=q[i], here=route[route.length-1]; if(equal(here,to))return route.slice(1);
  for(const n of neighbors(here))if(!seen.has(key(n))){seen.add(key(n));q.push([...route,n]);}
 }
 return [];
}
export function sight(a,b,radius=4){
 if(distance(a,b)>radius)return false;
 let x=a.x,y=a.y,dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1,e=dx-dy;
 while(true){if(!floor({x,y}))return false;if(x===b.x&&y===b.y)return true;const e2=2*e;if(e2>-dy){e-=dy;x+=sx;}if(e2<dx){e+=dx;y+=sy;}}
}
export function validatePolicy(p){
 if(!p||typeof p!=='object'||!Array.isArray(p.patrol)||p.patrol.length<2||p.patrol.length>12)throw Error('A patrol needs 2–12 floor positions.');
 if(!p.patrol.every(floor))throw Error('Patrol positions must be on the floor.');
 if(!Number.isInteger(p.decoySkepticism)||p.decoySkepticism<0||p.decoySkepticism>2||typeof p.protectRelic!=='boolean')throw Error('Invalid guard behavior.');
 if(typeof p.lesson!=='string'||p.lesson.length>240||typeof p.name!=='string'||p.name.length>80)throw Error('Invalid lesson.');
 return {name:p.name,decoySkepticism:p.decoySkepticism,protectRelic:p.protectRelic,patrol:p.patrol.map(({x,y})=>({x,y})),lesson:p.lesson};
}
export function createGame(policy=DEFAULT_POLICY){
 return {player:{...ENTRY},guard:{x:9,y:4},turn:0,patrolIndex:0,policy:validatePolicy(policy),
  suspicion:0,decoys:3,noise:null,hidden:false,hasRelic:false,status:'playing',
  message:'The keeper follows a routine. Find the gaps.',history:[],events:[],decoysThrown:0,seen:0};
}
export function step(s,action){
 if(s.status!=='playing')return s;
 if(!action||!['move','wait','hide','decoy'].includes(action.type))return s;
 let message='Keep quiet. Keep moving.';
 if(action.type==='move'){
  if(!Number.isInteger(action.dx)||!Number.isInteger(action.dy)||Math.abs(action.dx)+Math.abs(action.dy)!==1)return s;
  const n={x:s.player.x+action.dx,y:s.player.y+action.dy};
  if(!floor(n)){s.message='A wall. Look for a doorway.';return s;}
  s.player=n;s.hidden=false;
 }else if(action.type==='hide'){
  if(!HIDING.some(p=>distance(p,s.player)<=1)){s.message='Hide beside a wardrobe — look for the striped tiles.';return s;}
  s.hidden=true;message='You slip into the shadows.';
 }else if(action.type==='decoy'){
  if(s.decoys<=0){s.message='Your pockets are empty.';return s;}
  if(!floor(action.target)||distance(s.player,action.target)>7){s.message='Choose a floor tile within seven squares.';return s;}
  s.decoys--;s.decoysThrown++;s.noise={...action.target,ttl:6};
  message=s.policy.decoySkepticism?'The keeper hesitates. He remembers that trick.':'A broken glass. The keeper takes the bait.';
 }
 s.turn++;s.message=message;
 if(!s.hasRelic&&equal(s.player,RELIC)){s.hasRelic=true;s.events.push({type:'relic',turn:s.turn});s.message='The emerald is yours. Get back to the entrance.';}
 if(s.hasRelic&&equal(s.player,ENTRY)){s.status='escaped';s.message='You escaped. But the house was watching.';}
 if(s.status==='playing'){
  const visible=!s.hidden&&sight(s.guard,s.player);
  let target;
  if(visible){target=s.player;s.seen++;}
  else if(s.noise&&s.noise.ttl>0&&s.policy.decoySkepticism===0)target=s.noise;
  else if(s.noise&&s.noise.ttl>0&&s.policy.decoySkepticism===1&&distance(s.guard,s.noise)<=3)target=s.noise;
  else if(s.policy.protectRelic&&!s.hasRelic&&s.turn%8<5)target={x:15,y:4};
  else{
   target=s.policy.patrol[s.patrolIndex%s.policy.patrol.length];
   if(equal(s.guard,target)){s.patrolIndex++;target=s.policy.patrol[s.patrolIndex%s.policy.patrol.length];}
  }
  const next=path(s.guard,target)[0];if(next)s.guard=next;
  if(!s.hidden&&sight(s.guard,s.player)){s.suspicion=Math.min(100,s.suspicion+34);s.message='He sees you. Break his line of sight!';}
  else s.suspicion=Math.max(0,s.suspicion-20);
  if(equal(s.guard,s.player)||s.suspicion>=100){s.status='caught';s.message='Caught. The keeper has your number.';}
  if(s.turn>=100&&s.status==='playing'){s.status='caught';s.message='Dawn. The house seals its doors.';}
 }
 if(s.noise&&--s.noise.ttl<=0)s.noise=null;
 s.history.push({turn:s.turn,player:{...s.player},guard:{...s.guard},hidden:s.hidden,hasRelic:s.hasRelic,action:JSON.parse(JSON.stringify(action)),suspicion:s.suspicion,status:s.status});
 return s;
}
export function summarize(s){
 return {outcome:s.status,turns:s.turn,relicStolen:s.hasRelic,decoys:s.decoysThrown,timesSeen:s.seen,
  route:s.history.map(h=>h.player),actions:s.history.map(h=>h.action)};
}
// Transparent offline adaptation. This is game logic, never TrueForge evidence.
export function learnLocal(policy,episode){
 const p=validatePolicy(policy);
 if(episode.decoys>0){p.decoySkepticism=Math.min(2,p.decoySkepticism+1);p.lesson=p.decoySkepticism===1?'A sound can be bait. I will only inspect nearby distractions.':'No more chasing broken glass. I will hold my route.';p.name='The skeptical keeper';}
 else if(episode.relicStolen){p.protectRelic=true;p.lesson='I left the emerald exposed. I will return to the vault more often.';p.name='The vault keeper';}
 else{
  const far=episode.route?.filter(x=>floor(x)&&distance(x,{x:9,y:7})>5);
  const point=far?.[Math.floor(far.length/2)];
  if(point&&!p.patrol.some(x=>equal(x,point))){p.patrol=[point,...p.patrol].slice(0,12);p.lesson='You favored the outer rooms. I have added them to my rounds.';}
  else{p.protectRelic=true;p.lesson='The corridors tell a story. I will keep a closer watch on the vault.';}
  p.name='The watchful keeper';
 }
 return validatePolicy(p);
}
export function runActions(policy,actions){const s=createGame(policy);for(const a of actions){step(s,a);if(s.status!=='playing')break;}return s;}
