import {upstairs,downstairs,WINDOW} from './engine.mjs';
// THE NARRATOR: original lines in the style of a storybook narrator who tells the story as it should go,
// then turns to the player when they ignore it. Short and ironic. No model calls or borrowed game dialogue.
// The keeper's own lessons (in engine.mjs) stay in his voice: they are his notes.
// What the keeper learned last night, said as what the burglar did (five-night game). Keys are the keeper's note keys.
const RECALL={'route-up':'Last night the burglar went upstairs. Tonight, the keeper is already up there.',
 'route-hall':'Last night the burglar ran the long hall. Tonight the keeper is standing in it.',
 'route-crates':'Last night the burglar lingered by the crates. Tonight, so does the keeper.',
 'route-vault':'Last night the burglar lingered by the vault. Tonight the keeper got there first.',
 reach:'Last night the burglar jumped over the keeper’s head. He has been practising reaching up.',
 exit:'Last night the burglar ran for the door. Tonight, the moment the emerald moves, so will he.',
 door:'The keeper has started checking the door. Rude, but fair.',
 pace:'The burglar did the same thing again. The keeper did some stretching.'};
export const recall=key=>key?.startsWith('wardrobe')?'Last night the burglar hid in a wardrobe. Tonight the keeper is opening wardrobes.':RECALL[key]||null;
export function opening(courtesy,night,lesson,total=10,key=null){
 if(courtesy)return 'The burglar took the emerald and left. Simple. Let’s see.';
 if(total===5&&night===5)return 'The last night. Four nights of notes, and he has read every one.';
 // Eight nights: James opens with what is new tonight (the card shows what he remembers).
 const NEW8={2:'Night two. The keeper woke up. He has a lantern, and opinions.',3:'Night three. Now he chases. The stairs are your friend. Possibly.',
  4:'Night four. A window opened upstairs. The burglar took it as a compliment. It wasn’t.',5:'Night five. He has been practising.',
  6:'Night six. Someone blew out the candles. I suspect the keeper.',7:'Night seven. The front door was locked. The burglar took it personally.',
  8:'The final night. Everything at once. The keeper knew everything. The burglar knew where the window was. Roughly.'};
 if(total===8&&NEW8[night])return NEW8[night];
 if(total===5&&recall(key))return recall(key);
 // Nights 6-10 open with what is new in the house; the briefing already shows what he knows.
 const NEW={6:'Night six. The floorboards had been waiting for this.',7:'Night seven. Someone blew out the candles. I suspect the keeper.',8:'Night eight. The front door was locked. The burglar took it personally.',9:'Night nine. The emerald had been moved. Nobody told the burglar.',10:'The final night. Everything at once. The keeper knew everything. The burglar knew where the window was. Roughly.'};
 if(NEW[night])return NEW[night];
 if(lesson)return `The keeper opened his little black book. “${lesson}”`;
 if(night===5)return 'Night five. Halfway. The keeper was just getting started.';
 return ['The burglar came back. The keeper, who keeps notes, had been expecting that.','Night three. A window opened upstairs. The burglar took it as a compliment. It wasn’t.','Night four. The burglar returned, convinced that this time was different.'][Math.min(2,Math.max(0,night-2))];
}
// The emerald line changes from try to try (playtest 8 Nov: "Enjoy it" six times in a row).
// Taking the emerald (Tami, 8 Nov: "siempre dice la misma frase"): a few plain lines, mixed; the sharper ones join after a
// catch on the same night, so the more you lose, the more he has to say. Never the line he said last time.
const RELIC_PLAIN=['Lovely. You have the emerald. Now comes the small matter of leaving.','Emerald taken. Feeling clever? Enjoy it.','Great. You found it. Good job.'];
const RELIC_SHARP=['The emerald, again. The hard part was never the taking.','Emerald in hand. Now comes the part he studied.','The burglar had the emerald. The keeper had a plan.','Keep it moving. The emerald is not a personality.'];
export function relicLine(tutorial,attempt=1){if(tutorial)return pickNew(['Great. You found it. Good job.','The burglar found the emerald. I genuinely didn’t expect that.'],'relic-t');return pickNew(attempt>=2?[...RELIC_PLAIN,...RELIC_SHARP,...RELIC_SHARP]:RELIC_PLAIN,'relic');}
const either=(a,b)=>Math.random()<.5?a:b;
export function commentary({state,before,action,night,used,exitNew=false,attempt=1}){
 const once=(key,line)=>{if(used.has(key))return null;used.add(key);return line;};
 const sharp=night>=3;
 const fresh=state.events.slice(before.events??state.events.length);
 if(fresh.some(e=>e.type==='creak'))return once('creak','The floor creaked. So did the plan.');
 if(fresh.some(e=>e.type==='locked'))return once('locked','Front door. Locked. As announced.');
 if(state.relic&&state.relic.y<200&&!state.hasRelic&&state.player.x>900&&!upstairs(state.player))return once('empty-vault','Empty vault. The emerald is upstairs. Do keep up.');
 // New tonight, said once in play (Tami, 8 Nov): the window on night 4, the dark on night 6, and the night after he learned your way out.
 if(state.rules.same&&night===6&&state.rules.dark&&state.time>=2)return once('lights','Lights out. He knows this house in the dark. You don’t.');
 if(exitNew&&state.time>=3&&!state.hasRelic)return once('exit-new','He won’t chase you all night. He knows how you got out. Take the emerald, and he’ll be waiting there.');
 if(state.rules.same&&night===4&&state.rules.exits?.includes('window')&&upstairs(state.player)&&!state.hasRelic)return once('window-new','Look. A window. Easier. Or maybe not.');
 if(action.left&&!state.hasRelic&&state.time<4)return once('wrong-way','Wrong way. I’ll call it a warm-up.');
 if(state.hasRelic&&!before.hasRelic)return once('relic',relicLine(state.tutorial,attempt));
 if(state.rules?.chase&&!state.tutorial){
  const near=Math.abs(state.guard.x-state.player.x)<34&&Math.abs(state.guard.y-state.player.y)<30;
  if(action.sprint&&state.sees&&state.hasRelic)return once('sprint','Running indoors. In this house. Unbelievable.');
  if(fresh.some(e=>e.type==='over'))return once('over',either('Clean over his head. He did not enjoy that.','Oh, well done.'));
  if(action.jump&&state.sees)return once('jump','Jumping. Bold. Let’s see.');
  if(state.sees&&before.playerUp===false&&upstairs(state.player))return once('climb','Upstairs. Surely he’d never think of that.');
  if(state.sees&&!before.guardUp&&upstairs(state.guard))return once('follow','He is coming up. Cardio was never in his contract.');
  // Lost him only when he has really stopped hunting (a chasing keeper keeps looking for 6 s after he loses sight of you).
  if(!state.hidden&&!state.sees&&(state.rules.chase?before.hunting&&!(state.lastSeen?.ttl>0):before.sees))return once('lost',either('You lost him. He has not lost interest.','Lost him. Lucky.'));
  if(state.hidden&&!before.hidden&&state.lastSeen?.ttl>0)return once('hide-hunted','Hiding while he watches. Bold. Let us see if it works.');
  if(near&&!state.hidden)return once('close','Close enough to smell his lantern.');
 }
 if(state.suspicion>before.suspicion&&before.suspicion===0)return once('seen',night>=2?either('A bold interpretation of the word stealth.','He saw that. Obviously.'):'You thought he was asleep. Adorable.');
 if(action.decoy&&state.turn>before.turn)return once('decoy-'+state.decoys,state.policy.decoySkepticism?'Another glass. He didn’t even turn. He’s read this part.':'The burglar threw a glass, as if the keeper had never heard of glass.');
 if(action.hide&&state.hidden)return once('hide',sharp?'A wardrobe. You do know he can open doors?':'A wardrobe. At last, a strategy with doors.');
 if((action.left||action.right)&&state.turn===before.turn)return once('wall','The burglar walked into a wall. The wall won.');
 if(state.time>=28&&!state.hasRelic)return once('slow',sharp?'Half the night gone. In my version, you’d be home by now.':'The emerald was to the right. It still is.');
 if(state.time>=6&&state.tutorial)return once('tutorial','The keeper slept. The burglar mistook this for talent.');
 return null;
}
// Filler while you play: when the narrator has been quiet for a few seconds, he finds something to say.
const POOL={
 still:['The burglar stood perfectly still. The story, sadly, did not.','I can wait. The keeper, unfortunately, will not.'],
 dawn:['Dawn was coming. So was the keeper.','The burglar thought there was more time. There wasn’t.'],
 chased:['He’s gaining. I’d mention it, but you’ve noticed.','The burglar ran faster. The keeper ran smarter.'],
 carrying:['The exit is the other way. I’m just the narrator.','The emerald was getting heavier. Guilt, probably.'],
 empty:['The keeper wrote it all down. Every step.','The burglar thought nobody was watching. Two of us are.'],
 courtesy:['The keeper snored. The burglar tiptoed anyway. Very theatrical.','The emerald. Big. Green. Glowing. Hard to miss, apparently.']
};
// Playtest 8 Nov (Tami): a filler line must still be true when it is said. "The exit is the other way" only while the burglar
// carries the emerald AWAY from the way out; "Big. Green. Glowing." only before the emerald is taken, and not when it is about to be.
const STILL_TRUE={'The exit is the other way. I’m just the narrator.':(s,a)=>Boolean(a?.right&&!a?.left)&&!((s.rules.exits||[]).includes('window')&&upstairs(s.player)&&s.player.x<WINDOW.x),
 'The emerald. Big. Green. Glowing. Hard to miss, apparently.':s=>!s.hasRelic&&Math.hypot(s.player.x-(s.relic?.x??944),s.player.y-(s.relic?.y??280))>450};
export function taunt({state,stillFor,last,action}){
 const left=state.rules.limit-state.time;
 const kind=state.tutorial?'courtesy':stillFor>=3?'still':left<=12?'dawn':state.sees?'chased':state.hasRelic?'carrying':'empty';
 const options=POOL[kind].filter(l=>l!==last&&(!STILL_TRUE[l]||STILL_TRUE[l](state,action)));
 return options[Math.floor(Math.random()*options.length)]||null;
}
// Caught screens rotate, so a run of catches never reads the same twice in a row.
let caughtCount=0;
// Catches on the same night get more sarcastic each try (try 1, 2, 3...).
const MOCK=['Well. Maybe you could try again.','Twice. The keeper is starting to feel sorry for you.','Third time lucky? Apparently not.','Have you considered team sports? A nice walk? Anything outdoors, really?','Well. You are just being stubborn now.','Six tries. At this point the emerald is just being polite.','The keeper has put the kettle on. He knows you will be back.','Truly inspiring persistence. Truly uninspiring results.'];
const CAUGHT_TITLES=['How predictable.','There it is.','Again?','Oh dear. Again?','Well, well.','Gotcha.'];
const KICKERS=['THE NARRATOR WOULD LIKE A WORD.','A WORD FROM THE NARRATOR.','THE NARRATOR SIGHS.','FOR THE RECORD.'];
// A random line from the pool, never the one said last time from that pool.
const lastSaid={};function pickNew(pool,key){const opts=pool.filter(l=>l!==lastSaid[key]);const l=opts[Math.floor(Math.random()*opts.length)];lastSaid[key]=l;return l;}
// Escaping (Tami, 8 Nov: "siempre la misma frase"): the lines rotate, never the one said last time; all already recorded.
const ESCAPED=['The burglar escaped. That was not in the script. The keeper is rewriting it.','You beat him. Nobody will believe you.','I guess you got lucky.','Well. This is unexpected.','You won. It’s not a big thing to brag about.'];
export function aftermath(episode,night,courtesy,total=10,attempt=1){
 if(episode.outcome==='escaped'&&courtesy)return {kicker:'CONGRATULATIONS ON THE TUTORIAL.',title:'Too easy.',copy:'',challenge:'The burglar escaped and decided it was talent. It was the tutorial.',button:'FINE. WATCH ME. →'};
 if(episode.outcome==='escaped')return {kicker:'AN INCONVENIENT RESULT.',title:night>=3?'Well. Damn.':'A minor oversight.',copy:'',challenge:pickNew(ESCAPED,'escaped'),button:'ONE MORE. OBVIOUSLY. →'};
 if(episode.outcome==='abandoned')return {kicker:'A STRATEGIC RETREAT. APPARENTLY.',title:'Leaving so soon?',copy:'',challenge:'The burglar left without the emerald. That’s just a walk.',button:'I WAS JUST WARMING UP. →'};
 // Nights 3 and 4: a wink at the people who asked for a harder house (TrueForge said "the harder the better").
  const caught=(total===5||total===8)&&night===3?'Caught again. Nobody made it harder. He just remembers you.':total===5&&night===5?'Caught on the last night. He had notes. A lot of notes.':total===8&&night===8?'Caught on the last night. He had notes. A lot of notes.':night===3?'Caught again. Nobody made it harder. He just remembers you.':night===4?`There are ${{5:'five',8:'eight',10:'ten'}[total]||total} nights. And you are still on this one.`:'Well. Maybe you could try again.';
 caughtCount++;
 // First catch of a night may get its special line; every retry on the same night mocks a little harder.
 // After the last mock, they rotate (never the line just said) instead of repeating the last one forever (playtest 8 Nov).
 const line=attempt<=1?caught:attempt-1<MOCK.length?MOCK[attempt-1]:pickNew(MOCK.filter(l=>!/^(Twice|Third|Six)/.test(l)),'mock');
 return {kicker:KICKERS[caughtCount%KICKERS.length],title:CAUGHT_TITLES[Math.min(attempt,CAUGHT_TITLES.length)-1],copy:'',challenge:line,button:'THAT DID NOT COUNT. →'};
}
// Another try at the same night: the keeper has not moved, and the narrator has noticed.
const RETRY=['Again. The keeper had not moved an inch.','The burglar tried again. The house had seen this before.','Once more. The narrator has stopped counting. The keeper has not.'];
const where=a=>a.up?'upstairs':a.x<400?'by the crates':a.x<700?'in the long hall':'by the vault';
export function retryLine(attempt,last){
 const line=retryCore(attempt,last);if(line===lastSaid.retry&&attempt>2){lastSaid.retry=pickNew(RETRY,'retryAlt');return lastSaid.retry;}lastSaid.retry=line;return line;
}
function retryCore(attempt,last){
 const n=attempt===2?'Again.':attempt<6?['Third','Fourth','Fifth'][attempt-3]+' try.':'Another try.';
 if(last?.outcome!=='caught')return RETRY[(attempt-2)%RETRY.length];
 if(last.found)return `${n} Last time he opened the burglar’s wardrobe. He remembers which one.`;
 if(last.cause==='dawn')return `${n} Last time the sun did the catching. Walk faster.`;
 if(last.cause==='exit')return `${n} Last time he beat the burglar to the door. He has not slowed down.`;
 if(last.cause==='waiting')return `${n} Last time he was waiting exactly where he said he would be. He still is.`;
 return last.at?`${n} Last time he caught the burglar ${where(last.at)}. Same way again?`:RETRY[(attempt-2)%RETRY.length];
}
// THE NARRATOR REMEMBERS: what the burglar did on earlier tries (trail, newest last), said when they are about to do it again.
// Every line checks the record first, so it never claims a repeat that did not happen.
const knowsUp=h=>Boolean(h&&(h.waitAt===52||h.routes?.includes(52)));
const knowsHall=h=>Boolean(h&&[h.waitAt,...(h.routes||[])].some(t=>t!=null&&t!==52&&t*16>=400&&t*16<700));
const knowsWardrobe=(h,k)=>Boolean(h&&(h.wardrobe===k||h.wardrobes?.includes(k)));
const wentUp=state=>upstairs(state.player)||state.history.some(h=>!h.hasRelic&&h.player.y<170&&h.player.x>200&&h.player.x<820);
export function remember({state,before,trail,habits,used,night=null}){
 if(state.tutorial||!trail?.length||state.status!=='playing')return null;
 const once=(key,line)=>{if(used.has(key))return null;used.add(key);return line;};
 const past=trail.at(-1),fresh=state.events.slice(before.events??state.events.length);
 // Up the stairs on the way to the emerald.
 if(!state.hasRelic&&before.playerUp===false&&upstairs(state.player)){
  let streak=0;for(let i=trail.length-1;i>=0&&trail[i].up;i--)streak++;
  if(streak>=2)return once('mem-up',['Upstairs. Again. He’s not even surprised anymore.','The upper floor, as usual. He has a chair up there now.','Upstairs again. That’s not a route, it’s a habit.'][Math.min(2,streak-2)]);
  if(past.up&&knowsUp(habits))return once('mem-up','Upstairs again. He wrote that down, you know.');
  if(past.up&&past.outcome==='caught'&&past.at?.up)return once('mem-up','Upstairs again? That’s where he caught you last time.');
  if(past.up)return once('mem-up',past.outcome==='escaped'?'Upstairs again. It worked last time. Are you sure?':'Upstairs again. Are you sure?');
  if(!trail.some(t=>t.up)&&!knowsUp(habits))return once('mem-up','Upstairs? That’s new. He hasn’t seen that one.');
 }
 // Along the long hall on the ground, like last time.
 if(!state.hasRelic&&downstairs(state.player)&&state.player.x>440&&state.player.x<660&&past.hall&&!wentUp(state)){
  if(knowsHall(habits)&&!upstairs(state.guard))return once('mem-hall','The long hall again. He is waiting in it. He remembers.');
  if(past.outcome==='caught'&&past.at&&!past.at.up&&past.at.x>=400&&past.at.x<700)return once('mem-hall','The long hall again. That’s where he caught you last time.');
  return once('mem-hall','Same hall as last time. Are you sure?');
 }
 // Into a wardrobe.
 const hid=fresh.find(e=>e.type==='hide');
 if(hid){const k=hid.spot,ever=trail.some(t=>t.hid?.includes(k));
  if(ever&&knowsWardrobe(habits,k))return once('mem-ward','Your wardrobe again. He’s started knocking.');
  if(past.hid?.includes(k))return once('mem-ward','Same wardrobe. He thinks you live there now.');
  if(!trail.some(t=>t.hid?.length))return once('mem-ward','A wardrobe. That’s new. He’ll remember it, if you get out.');
 }
 // Heading for the window with the emerald, after getting out that way before (playtest 8 Nov: the narrator should notice what you do).
 if(state.hasRelic&&upstairs(state.player)&&Math.abs(state.player.x-WINDOW.x)<140&&trail.some(t=>t.window))return once('mem-window','The window again. He has noticed.');
 // Back at the spot where he caught you last time.
 if(past.outcome==='caught'&&past.at&&past.cause!=='dawn'&&(night==null||past.night===night)&&state.time>2&&upstairs(state.player)===past.at.up&&Math.abs(state.player.x-past.at.x)<14)
  return once('mem-spot','Right where he caught you last time. Just saying.');
 return null;
}
// One line for what a finished try looked like, kept so the narrator can bring it up later.
export function record(state,night,attempt){
 const way=state.history.filter(h=>!h.hasRelic);
 return {night,attempt,outcome:state.status,cause:state.cause||null,
  up:way.some(h=>h.player.y<170&&h.player.x>200&&h.player.x<820),
  hall:way.some(h=>h.player.y>250&&h.player.x>440&&h.player.x<660),
  hid:[...new Set(state.events.filter(e=>e.type==='hide').map(e=>e.spot))],
  found:state.events.some(e=>e.type==='found'),
  window:state.events.some(e=>e.type==='window'),
  at:state.status==='caught'&&state.cause!=='dawn'?{x:Math.round(state.player.x),up:upstairs(state.player)}:null};
}
