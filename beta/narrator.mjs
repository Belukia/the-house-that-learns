import {upstairs} from './engine.mjs';
// THE NARRATOR: original lines in the style of a storybook narrator who tells the story as it should go,
// then turns to the player when they ignore it. Short and ironic. No model calls or borrowed game dialogue.
// The keeper's own lessons (in engine.mjs) stay in his voice: they are his notes.
export function opening(courtesy,night,lesson){
 if(courtesy)return 'The burglar entered the house, took the emerald, and left. Simple. Let’s see.';
 // Nights 6-10 open with what is new in the house; the briefing already shows what he knows.
 const NEW={6:'Night six. The floorboards had been waiting for this.',7:'Night seven. Someone blew out the candles. I suspect the keeper.',8:'Night eight. The front door was locked. The burglar took it personally.',9:'Night nine. The emerald had been moved. Nobody told the burglar.',10:'The final night. Everything at once. The keeper knew everything. The burglar knew where the window was. Roughly.'};
 if(NEW[night])return NEW[night];
 if(lesson)return `The keeper opened his little black book. “${lesson}”`;
 if(night===5)return 'Night five. Halfway. The keeper was just getting started.';
 return ['The burglar came back. The keeper, who keeps notes, had been expecting that.','Night three. A window opened upstairs. The burglar took it as a compliment. It wasn’t.','Night four. The burglar returned, convinced that this time was different.'][Math.min(2,Math.max(0,night-2))];
}
export function commentary({state,before,action,night,used}){
 const once=(key,line)=>{if(used.has(key))return null;used.add(key);return line;};
 const sharp=night>=3;
 const fresh=state.events.slice(before.events??state.events.length);
 if(fresh.some(e=>e.type==='creak'))return once('creak','The floor creaked. So did the plan.');
 if(fresh.some(e=>e.type==='locked'))return once('locked','The burglar tried the front door. Locked. As announced.');
 if(state.relic&&state.relic.y<200&&!state.hasRelic&&state.player.x>900&&!upstairs(state.player))return once('empty-vault','The vault was empty. The emerald was upstairs. Do keep up.');
 if(action.left&&!state.hasRelic&&state.time<4)return once('wrong-way','The emerald was to the right. The burglar went left. I’ll call it a warm-up.');
 if(state.hasRelic&&!before.hasRelic)return once('relic',state.tutorial?'The burglar found the emerald. I genuinely didn’t expect that.':sharp?'The burglar took the emerald and felt clever. Enjoy it.':'The emerald was taken. Now the burglar would leave quietly. Wouldn’t they?');
 if(state.rules?.chase&&!state.tutorial){
  const near=Math.abs(state.guard.x-state.player.x)<34&&Math.abs(state.guard.y-state.player.y)<30;
  if(action.sprint&&state.sees)return once('sprint','The burglar walked calmly to the exit. No. The burglar ran. Of course.');
  if(action.jump&&state.sees)return once('jump','The burglar thought jumping would help. The burglar was wrong. Again.');
  if(state.sees&&before.playerUp===false&&upstairs(state.player))return once('climb','The burglar went upstairs, sure he would never think of that.');
  if(state.sees&&!before.guardUp&&upstairs(state.guard))return once('follow','Yes, he can use stairs too. Did you think he couldn’t?');
  if(before.sees&&!state.sees&&!state.hidden)return once('lost','The burglar lost him, and decided it was skill. It was luck.');
  if(state.hidden&&!before.hidden&&state.lastSeen?.ttl>0)return once('hide-hunted','The burglar hid right in front of him. You do know he has eyes?');
  if(near&&!state.hidden)return once('close','Close enough to shake hands. Don’t.');
 }
 if(state.suspicion>before.suspicion&&before.suspicion===0)return once('seen',sharp?'The burglar moved unseen. Fine. Seen. Let’s carry on.':'The burglar thought the keeper was asleep. Adorable.');
 if(action.decoy&&state.turn>before.turn)return once('decoy-'+state.decoys,state.policy.decoySkepticism?'Another glass. He didn’t even turn. He’s read this part.':'The burglar threw a glass, as if the keeper had never heard of glass.');
 if(action.hide&&state.hidden)return once('hide',sharp?'The wardrobe again. You do know he can open doors?':'The burglar hid in a wardrobe and became, briefly, a coat.');
 if((action.left||action.right)&&state.turn===before.turn)return once('wall','The burglar walked into a wall. The wall won.');
 if(state.time>=28&&!state.hasRelic)return once('slow',sharp?'Half the night gone. In my version, you’d be home by now.':'The emerald was to the right. It still is.');
 if(state.time>=6&&state.tutorial)return once('tutorial','The keeper slept. The burglar mistook this for talent.');
 if(state.time>=10&&!state.tutorial)return once('routine',sharp?'Same route as last time. He remembers. I remember. Do you?':'The burglar took the old route. The keeper smiled.');
 return null;
}
// Filler while you play: when the narrator has been quiet for a few seconds, he finds something to say.
const POOL={
 still:['The burglar stood perfectly still. The story, sadly, did not.','I can wait. The keeper, unfortunately, will not.'],
 dawn:['Dawn was coming. So was the keeper.','The burglar thought there was more time. There wasn’t.'],
 chased:['He’s gaining. I’d mention it, but you’ve noticed.','The burglar ran faster. The keeper ran smarter.'],
 carrying:['The exit is the other way. I’m just the narrator.','The emerald was getting heavier. Guilt, probably.'],
 empty:['The keeper wrote it all down. Every step.','The burglar thought nobody was watching. Two of us are.'],
 courtesy:['The keeper snored. The burglar tiptoed anyway. Very theatrical.','The emerald is to the right. Big. Green. Glowing. Hard to miss, apparently.']
};
export function taunt({state,stillFor,last}){
 const left=state.rules.limit-state.time;
 const kind=state.tutorial?'courtesy':stillFor>=3?'still':left<=12?'dawn':state.sees?'chased':state.hasRelic?'carrying':'empty';
 const options=POOL[kind].filter(l=>l!==last);
 return options[Math.floor(Math.random()*options.length)]||null;
}
export function aftermath(episode,night,courtesy){
 if(episode.outcome==='escaped'&&courtesy)return {kicker:'CONGRATULATIONS ON THE TUTORIAL.',title:'Too easy.',copy:'',challenge:'The burglar escaped and decided it was talent. It was the tutorial.',button:'FINE. WATCH ME. →'};
 if(episode.outcome==='escaped')return {kicker:'AN INCONVENIENT RESULT.',title:night>=3?'Well. Damn.':'A minor oversight.',copy:'',challenge:'The burglar escaped. That was not in the script. The keeper is rewriting it.',button:'ONE MORE. OBVIOUSLY. →'};
 if(episode.outcome==='abandoned')return {kicker:'A STRATEGIC RETREAT. APPARENTLY.',title:'Leaving so soon?',copy:'',challenge:'The burglar left without the emerald. That’s just a walk.',button:'I WAS JUST WARMING UP. →'};
 // Nights 3 and 4: a wink at the people who asked for a harder house (TrueForge said "the harder the better").
 const caught=night===3?'Caught again. The people at TrueForge asked me to make it harder. I said yes.':night===4?'There are ten nights. And you are still on this one.':'And so the burglar was caught. Exactly as written.';
 return {kicker:'THE NARRATOR WOULD LIKE A WORD.',title:night>=3?'There it is.':'How predictable.',copy:'',challenge:caught,button:'THAT DID NOT COUNT. →'};
}
// Another try at the same night: the keeper has not moved, and the narrator has noticed.
const RETRY=['Again. The keeper had not moved an inch.','The burglar tried again. The house had seen this before.','Once more. The narrator has stopped counting. The keeper has not.'];
export function retryLine(attempt){return RETRY[(attempt-2)%RETRY.length];}
