import {runActions} from '../dist/engine.mjs';
export function evaluate(policy,tasks){
 const results=tasks.map(task=>{const s=runActions(policy,task.actions);return {id:task.id,holdout:task.holdout,stopped:s.status==='caught',outcome:s.status,turns:s.turn,relicStolen:s.hasRelic};});
 const score=rows=>rows.length?Math.round(10000*rows.filter(r=>r.stopped).length/rows.length)/100:0;
 return {score:score(results),developmentScore:score(results.filter(r=>!r.holdout)),holdoutScore:score(results.filter(r=>r.holdout)),results};
}
