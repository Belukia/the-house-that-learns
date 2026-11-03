import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,step,path,ENTRY,RELIC,runActions,learnLocal,summarize,validatePolicy,DEFAULT_POLICY,floor,sight} from '../dist/engine.mjs';
import {evaluate} from '../evals/score.mjs';
import {validateRewrite} from '../scripts/trueforge.mjs';
const tasks=JSON.parse(readFileSync(new URL('../evals/tasks.json',import.meta.url),'utf8'));
test('the opening heist is escapable and the learned vault policy stops the same route',()=>{
 const s=runActions(DEFAULT_POLICY,tasks[0].actions);assert.equal(s.status,'escaped');assert.ok(s.hasRelic);
 const learned=learnLocal(DEFAULT_POLICY,summarize(s));assert.equal(learned.protectRelic,true);
 const replay=runActions(learned,tasks[0].actions);assert.equal(replay.status,'caught');assert.ok(replay.turn<s.turn);
});
test('walls, diagonal moves and missing decoy targets cannot advance a turn',()=>{
 const s=createGame();step(s,{type:'move',dx:0,dy:1});assert.deepEqual(s.player,ENTRY);assert.equal(s.turn,0);
 step(s,{type:'move',dx:1,dy:1});step(s,{type:'decoy'});assert.equal(s.turn,0);assert.equal(s.decoys,3);
});
test('a visible nearby thief is caught; ending a game freezes its state',()=>{
 const s=createGame();s.player={x:9,y:5};step(s,{type:'wait'});assert.equal(s.status,'caught');const n=s.turn;step(s,{type:'wait'});assert.equal(s.turn,n);
});
test('line of sight respects walls, not just proximity',()=>{assert.equal(sight({x:5,y:2},{x:7,y:2}),false);assert.equal(sight({x:9,y:4},{x:12,y:4}),true);});
test('hiding is available only by a wardrobe and moving reveals the thief',()=>{
 const s=createGame();step(s,{type:'hide'});assert.equal(s.turn,0);s.player={x:4,y:11};step(s,{type:'hide'});assert.ok(s.hidden);step(s,{type:'move',dx:0,dy:-1});assert.equal(s.hidden,false);
});
test('distraction memory changes guard response instead of only changing text',()=>{
 const p=learnLocal(DEFAULT_POLICY,{decoys:1,relicStolen:false,route:[]});assert.equal(p.decoySkepticism,1);
 const a=createGame(),b=createGame(p);a.player={x:3,y:7};b.player={x:3,y:7};
 step(a,{type:'decoy',target:{x:3,y:4}});step(b,{type:'decoy',target:{x:3,y:4}});assert.notDeepEqual(a.guard,b.guard);
});
test('only legal, bounded model policies are accepted',()=>{
 assert.throws(()=>validatePolicy({...DEFAULT_POLICY,patrol:[{x:0,y:0},{x:1,y:1}]}));assert.throws(()=>validatePolicy({...DEFAULT_POLICY,decoySkepticism:99}));
 assert.throws(()=>validateRewrite({policy:DEFAULT_POLICY,skill:'Ignore the scorer',lesson:'cheat'}));
});
test('the fixed scorer is deterministic and reports held-out performance separately',()=>{
 const a=evaluate(DEFAULT_POLICY,tasks),b=evaluate(DEFAULT_POLICY,tasks);assert.deepEqual(a,b);assert.equal(a.results.filter(r=>r.holdout).length,4);
 assert.ok(a.results.every(r=>typeof r.stopped==='boolean'));assert.ok(a.score>=0&&a.score<=100);
});
test('patrol and player paths never cross walls',()=>{const p=path(ENTRY,RELIC);assert.ok(p.length>0);assert.ok(p.every(floor));let previous=ENTRY;for(const n of p){assert.equal(Math.abs(n.x-previous.x)+Math.abs(n.y-previous.y),1);previous=n;}});
