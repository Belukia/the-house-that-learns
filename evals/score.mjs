import {runActions} from '../dist/engine.mjs';
// Frozen rule: the thief's motion ignores the keeper, so every fixture must escape the
// clockless courtesy round before dawn (90s). Under a real policy a run then ends either
// `caught` (stopped, dawn included) or `escaped`. A run left `playing` is a broken fixture,
// never a silent escape, and it aborts the evaluation instead of being scored.
export const SCORING_RULE='stopped = caught (contact or dawn at 90s); escaped = not stopped; playing = invalid fixture';
export function evaluate(policy,tasks){
 const results=tasks.map(task=>{const s=runActions(policy,task.actions);if(s.status==='playing')throw Error(`Fixture ${task.id} ended unresolved at tick ${s.turn}.`);return {id:task.id,holdout:task.holdout,stopped:s.status==='caught',outcome:s.status,turns:s.turn,relicStolen:s.hasRelic};});
 const score=rows=>rows.length?Math.round(10000*rows.filter(r=>r.stopped).length/rows.length)/100:0;
 return {score:score(results),developmentScore:score(results.filter(r=>!r.holdout)),holdoutScore:score(results.filter(r=>r.holdout)),results};
}
