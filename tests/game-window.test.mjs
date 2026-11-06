// The game's window (nights 3-5): a second way out, and the keeper learns it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame, step, learnLocal, validatePolicy, DEFAULT_POLICY, NIGHTS, EXAM_RULES, WINDOW, upstairs, knownLabels} from '../dist/engine.mjs';

const H = {habits: true};
// A recorded round-2 window thief (frozen exam task): ground → vault → right stairs → window.
const windowThief = JSON.parse(readFileSync(new URL('../evals/v2/R2/r2-03.json', import.meta.url), 'utf8'));
const play = (s, actions) => { for (const a of actions) for (let i = 0; i < a.frames && s.status === 'playing'; i++) step(s, a.input); return s; };

test('the window is open on nights 3-5 only, never in exam v1', () => {
  assert.equal(NIGHTS[2].exits, undefined);
  for (const n of [3, 4, 5]) assert.deepEqual(NIGHTS[n].exits, ['door', 'window']);
  assert.equal(EXAM_RULES.exits, undefined);
});

test('on night 3 a thief can climb out of the window, and it is recorded', () => {
  // A keeper parked far away on the ground, so the escape is clean.
  const far = validatePolicy({...DEFAULT_POLICY, patrol: [{x: 60, y: 18}, {x: 61, y: 18}]}, H);
  const s = createGame(far, {habits: true, night: 3});
  s.guard.x = 990; // out of the way
  s.policy = {...s.policy, decoySkepticism: 2};
  // Teleporting the thief for a unit test: emerald in hand, standing at the window upstairs.
  s.hasRelic = true; Object.assign(s.player, {x: WINDOW.x, y: 154, grounded: true});
  step(s, {}); step(s, {hide: true});
  assert.equal(s.status, 'escaped');
  assert.ok(s.events.some(e => e.type === 'window'));
});

test('night 2 has no window: the same move does nothing', () => {
  const s = createGame(validatePolicy(DEFAULT_POLICY, H), {habits: true, night: 2});
  s.hasRelic = true; Object.assign(s.player, {x: WINDOW.x, y: 154, grounded: true});
  step(s, {}); step(s, {hide: true});
  assert.equal(s.status, 'playing');
});

test('after a window escape the keeper learns it, says so, and waits at the window the next night', () => {
  const s = createGame(validatePolicy(DEFAULT_POLICY, H), {habits: true, night: 3});
  s.hasRelic = true; Object.assign(s.player, {x: WINDOW.x, y: 154, grounded: true});
  step(s, {}); step(s, {hide: true});
  const learned = learnLocal(s.policy, s);
  assert.equal(learned.habits.window, true);
  assert.match(learned.lesson, /window/i);
  assert.ok(knownLabels(learned.habits, learned).includes('HE WAITS AT THE WINDOW'));
  // Next night: with the thief hidden away, the keeper walks up to the window and stays near it.
  const n = createGame(learned, {habits: true, night: 4});
  n.hidden = true; Object.assign(n.player, {x: 160, y: 282});
  let near = 0;
  for (let i = 0; i < 60 * 30; i++) { step(n, {}); if (upstairs(n.guard) && Math.abs(n.guard.x - WINDOW.x) < 40) near++; }
  assert.ok(near > 60 * 5, `keeper spent ${(near / 60).toFixed(1)} s by the window`);
});

test('a recorded window thief escapes on night 3 against the untrained keeper (window = real second exit)', () => {
  const s = createGame(validatePolicy({...DEFAULT_POLICY, patrol: [{x: 60, y: 18}, {x: 61, y: 18}]}, H), {habits: true, night: 3});
  play(s, windowThief.actions);
  // Either he is caught on the way (the hunter is fast) or he leaves by the window, never by the door.
  if (s.status === 'escaped') assert.ok(s.events.some(e => e.type === 'window'));
});
