// Original reactive dialogue. No model calls or borrowed game dialogue.
export function opening(courtesy,night){
 if(courtesy)return 'The emerald is glowing. Security is decorative. I believe in you. Within reason.';
 return ['Same house. Same rules. One of us did the homework.','Back again? Wonderful. I was beginning to miss your questionable judgment.','You have mistaken persistence for a plan. A popular mistake.'][Math.min(2,Math.max(0,night-2))];
}
export function commentary({state,before,action,night,used}){
 const once=(key,line)=>{if(used.has(key))return null;used.add(key);return line;};
 const sharp=night>=3;
 if(state.hasRelic&&!before.hasRelic)return once('relic',state.tutorial?'You found the enormous glowing object. A triumph for the education system.':sharp?'Keep it moving. The emerald is not a personality.':'Lovely. You have the emerald. Now comes the small matter of leaving.');
 if(state.suspicion>before.suspicion&&before.suspicion===0)return once('seen',sharp?'He can see you. I appreciate that this complicates your invisibility strategy.':'A bold interpretation of the word stealth.');
 if(action.decoy&&state.turn>before.turn)return once('decoy-'+state.decoys,state.policy.decoySkepticism?'Broken glass. Again. Shall I notify the keeper, or has he already made his feelings clear?':'A distraction. How delightfully analog of you.');
 if(action.hide&&state.hidden)return once('hide',sharp?'Excellent. Become furniture. It has been your most convincing role so far.':'A wardrobe. At last, a strategy with doors.');
 if((action.left||action.right)&&state.turn===before.turn)return once('wall','That is a wall. It has held that position for quite some time.');
 if(state.time>=28&&!state.hasRelic)return once('slow',sharp?'Take your time. I have been here since 1893. You, presumably, have other commitments.':'The emerald remains exactly where the emerald was. A useful constant.');
 if(state.time>=6&&state.tutorial)return once('tutorial','Do not let the lack of resistance go to your head. This is a courtesy visit.');
 if(state.time>=10&&!state.tutorial)return once('routine',sharp?'You are following your old route. Sentimentality. How expensive.':'Do try the old route. I would hate for all that studying to go to waste.');
 return null;
}
export function aftermath(episode,night,courtesy){
 if(episode.outcome==='escaped'&&courtesy)return {kicker:'CONGRATULATIONS ON THE TUTORIAL.',title:'Oh. Really?',copy:'You robbed a house that practically handed you the key. Shall we find out whether that was talent?',challenge:'Try it again. I have been taking notes.',button:'FINE. WATCH ME. →'};
 if(episode.outcome==='escaped')return {kicker:'AN INCONVENIENT RESULT.',title:night>=3?'Well. Shit.':'A minor oversight.',copy:night>=3?'You found another gap. I would congratulate you, but I am busy closing it.':'The house would like to register a formal objection to your competence.',challenge:'Same emerald. New defenses. Still feeling clever?',button:'ONE MORE. OBVIOUSLY. →'};
 if(episode.outcome==='abandoned')return {kicker:'A STRATEGIC RETREAT. APPARENTLY.',title:'Leaving so soon?',copy:'An interesting way to win a robbery: decline to complete it.',challenge:'Your unfinished business has been filed. Under unfinished.',button:'I WAS JUST WARMING UP. →'};
 return {kicker:'THE HOUSE WOULD LIKE A WORD.',title:night>=3?'There it is.':'How predictable.',copy:night>=3?'You tried the old trick. The keeper tried remembering. An unfair contest, apparently.':'One of us paid attention last time. You may wish to try being that one.',challenge:'The doors are still open. Your argument is getting weaker.',button:'THAT DID NOT COUNT. →'};
}
