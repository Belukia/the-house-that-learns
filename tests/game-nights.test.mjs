// The game's nights 6-10: each adds one new thing. Exam rules (v1 and v2 rounds) must not change.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, step, validatePolicy, DEFAULT_POLICY, NIGHTS, NIGHT_NEWS, EXAM_RULES, ROUNDS, RELIC, UPPER_RELIC, WINDOW} from '../dist/engine.mjs';
import {opening} from '../dist/narrator.mjs';

const H = {habits: true};
const keeper = (habits = {}, extra = {}) => validatePolicy({...DEFAULT_POLICY, ...extra, habits: {waitAt: null, wardrobe: null, exit: false, door: false, window: false, known: [], ...habits}}, H);
const park = s => { s.guard.x = 990; s.guard.y = 282; return s; }; // keeper out of the way for a unit test

test('nights 6-10 exist, each with its one new rule, and every new night has a briefing line', () => {
  assert.equal(NIGHTS[6].creaky, true);
  assert.equal(NIGHTS[7].dark, true);
  assert.deepEqual(NIGHTS[8].exits, ['window']);
  assert.deepEqual(NIGHTS[9].relic, UPPER_RELIC);
  for (const k of ['creaky', 'dark']) assert.equal(NIGHTS[10][k], true);
  assert.deepEqual(NIGHTS[10].exits, ['window']);
  assert.deepEqual(NIGHTS[10].relic, UPPER_RELIC);
  for (const n of [6, 7, 8, 9, 10]) { assert.ok(NIGHT_NEWS[n], `news for night ${n}`); assert.ok(opening(false, n, 'a lesson').length > 0); }
});

test('exam rules are untouched by the new nights', () => {
  for (const k of ['dark', 'relic']) { assert.equal(EXAM_RULES[k], undefined); for (const r of Object.values(ROUNDS)) assert.equal(r[k], undefined); }
  assert.deepEqual(createGame(DEFAULT_POLICY).relic, RELIC);
});

test('night 8: the front door is locked, so reaching it with the emerald is not an escape', () => {
  const s = park(createGame(keeper(), {habits: true, night: 8}));
  s.hasRelic = true; Object.assign(s.player, {x: 60, y: 282, grounded: true});
  for (let i = 0; i < 30; i++) step(s, {left: true});
  assert.equal(s.status, 'playing');
  assert.ok(s.events.some(e => e.type === 'locked'));
  // The same move escapes on night 3, where the door is open.
  const open = park(createGame(keeper(), {habits: true, night: 3}));
  open.hasRelic = true; Object.assign(open.player, {x: 60, y: 282, grounded: true});
  for (let i = 0; i < 30 && open.status === 'playing'; i++) step(open, {left: true});
  assert.equal(open.status, 'escaped');
});

test('night 8: the window still works', () => {
  const s = park(createGame(keeper(), {habits: true, night: 8}));
  s.hasRelic = true; Object.assign(s.player, {x: WINDOW.x, y: 154, grounded: true});
  step(s, {}); step(s, {hide: true});
  assert.equal(s.status, 'escaped');
});

test('night 8: a keeper who learned to check the door does not crash the game (regression)', () => {
  const s = createGame(keeper({exit: true, door: true}), {habits: true, night: 8});
  for (let i = 0; i < 600 && s.status === 'playing'; i++) step(s, {});
  assert.ok(['playing', 'caught'].includes(s.status));
});

test('nights 9 and 10: the emerald is upstairs, and the vault is empty', () => {
  for (const n of [9, 10]) {
    const s = park(createGame(keeper(), {habits: true, night: n}));
    Object.assign(s.player, {x: RELIC.x, y: 282, grounded: true}); step(s, {});
    assert.equal(s.hasRelic, false, `night ${n}: nothing in the vault`);
    Object.assign(s.player, {x: UPPER_RELIC.x, y: 154, grounded: true}); step(s, {});
    assert.equal(s.hasRelic, true, `night ${n}: the emerald is upstairs`);
  }
});

test('night 6: sprinting across the long hall creaks, and he goes to the creak even if he ignores glass', () => {
  const s = createGame(keeper({}, {decoySkepticism: 2}), {habits: true, night: 6});
  Object.assign(s.guard, {x: 900, y: 282}); Object.assign(s.player, {x: 420, y: 282, grounded: true});
  step(s, {right: true, sprint: true});
  assert.ok(s.noise?.real, 'a sprint in the hall makes a real noise');
  assert.ok(s.events.some(e => e.type === 'creak'));
  const before = s.guard.x;
  for (let i = 0; i < 20; i++) step(s, {});
  assert.ok(s.guard.x < before, 'he walks toward the creak');
  // Walking makes no noise.
  const quiet = createGame(keeper(), {habits: true, night: 6});
  Object.assign(quiet.player, {x: 420, y: 282, grounded: true});
  for (let i = 0; i < 20; i++) step(quiet, {right: true});
  assert.equal(quiet.noise, null);
});

test('night 7: in the dark he sees less far than on night 5', () => {
  assert.ok(NIGHTS[7].vision < NIGHTS[5].vision);
  assert.ok(NIGHTS[10].vision < NIGHTS[5].vision);
});
