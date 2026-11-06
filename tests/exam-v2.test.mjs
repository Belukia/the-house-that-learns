// Exam v2, round 2: the engine flag, the window, upper-floor patrols and the frozen tasks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {createGame, step, runRound, runActions, validatePolicyV2, DEFAULT_POLICY, WINDOW, upstairs} from '../dist/engine.mjs';

const dir = new URL('../evals/v2/R2/', import.meta.url);
const tasks = readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
const v2 = p => validatePolicyV2({dwell: 0, ...p});
const door = {name: 'Door warden', decoySkepticism: 2, protectRelic: false, patrol: [{x: 3, y: 18}, {x: 5, y: 18}, {x: 3, y: 18}, {x: 2, y: 18}], lesson: 'Hold the door.'};

test('round 2 tasks match their frozen hashes', () => {
  const sums = readFileSync(new URL('SHA256SUMS.txt', dir), 'utf8').trim().split('\n').map(l => l.split(/\s+/));
  assert.equal(sums.length, 10);
  for (const [hash, file] of sums) {
    const got = createHash('sha256').update(readFileSync(new URL(file.replace('R2/', ''), dir))).digest('hex');
    assert.equal(got, hash, file);
  }
  assert.equal(tasks.filter(t => t.holdout).length, 4);
});

test('round 2 thieves escape through both exits against exam v1\'s seed keeper', () => {
  const seed = v2(DEFAULT_POLICY);
  const out = tasks.map(t => runRound(seed, t.actions, 2));
  const exits = out.filter(s => s.status === 'escaped').map(s => s.message.includes('window') ? 'window' : 'door');
  assert.ok(exits.includes('window') && exits.includes('door'), JSON.stringify(exits));
  assert.equal(out.filter(s => s.status === 'caught').length, 6); // 60, as the 5000-policy simulation found
});

test('without {round} the engine is exam v1: no window, ground waypoints only', () => {
  const s = createGame(DEFAULT_POLICY);
  assert.equal(s.rules.exits, undefined);
  assert.throws(() => createGame({...DEFAULT_POLICY, patrol: [{x: 20, y: 10}, {x: 30, y: 10}]}));
});

test('the window needs the emerald, the upper floor and the action key', () => {
  const s = createGame(v2({...door, patrol: [{x: 60, y: 18}, {x: 61, y: 18}]}), {round: 2});
  Object.assign(s.player, {x: WINDOW.x, y: 154});
  s.player.grounded = true;
  step(s, {hide: true});
  assert.equal(s.status, 'playing', 'no emerald, no escape');
  s.hasRelic = true; s.lastHide = false;
  step(s, {});
  assert.equal(s.status, 'playing', 'walking past is not an escape');
  step(s, {hide: true});
  assert.equal(s.status, 'escaped');
  assert.match(s.message, /window/);
});

test('an upper waypoint takes the keeper upstairs', () => {
  const s = createGame(v2({...door, patrol: [{x: 20, y: 10}, {x: 22, y: 10}]}), {round: 2});
  s.hidden = true; // the thief stays in a wardrobe, so the keeper just patrols
  let up = false;
  for (let i = 0; i < 60 * 20 && !up; i++) { step(s, {}); up = upstairs(s.guard); }
  assert.ok(up, 'keeper reached the upper floor within 20 s');
});

test('dwell and waypoint legality', () => {
  assert.throws(() => v2({...door, dwell: 5}));
  assert.throws(() => v2({...door, dwell: 1.5}));
  assert.throws(() => v2({...door, patrol: [{x: 13, y: 10}, {x: 20, y: 10}]}));
  assert.equal(v2({...door, dwell: 4, patrol: [{x: 14, y: 10}, {x: 49, y: 10}]}).dwell, 4);
});

test('the run 05 keeper (100 in exam v1) no longer stops every round 2 thief', () => {
  const p = v2(door);
  const dev = tasks.filter(t => !t.holdout).map(t => runRound(p, t.actions, 2).status === 'caught');
  assert.equal(dev.filter(Boolean).length, 4); // 4 of 6 = 67
  // And exam v1 with the same policy still stops all 8 v1 heists.
  const v1 = readdirSync(new URL('../evals/tasks/', import.meta.url)).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(new URL(`../evals/tasks/${f}`, import.meta.url), 'utf8')));
  assert.ok(v1.every(t => runActions(door, t.actions).status === 'caught'));
});

test('round 2 replays are deterministic', () => {
  const p = v2(door);
  const a = tasks.map(t => runRound(p, t.actions, 2).turn), b = tasks.map(t => runRound(p, t.actions, 2).turn);
  assert.deepEqual(a, b);
});

// Round 2b: round 2 after its holdout was used up (runs 01-03).
const dirB = new URL('../evals/v2/R2b/', import.meta.url);
const tasksB = readdirSync(dirB).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(readFileSync(new URL(f, dirB), 'utf8')));
const exitAsleep = t => { const s = createGame({...DEFAULT_POLICY, dwell: 0}, {round: 2, tutorial: true}); for (const a of t.actions) for (let i = 0; i < a.frames && s.status === 'playing'; i++) step(s, a.input); return s.status === 'escaped' ? (s.message.includes('window') ? 'window' : 'door') : s.status; };

test('round 2b: frozen hashes; the 10 round-2 heists are development, 4 fresh ones are holdout', () => {
  const sums = readFileSync(new URL('SHA256SUMS.txt', dirB), 'utf8').trim().split('\n').map(l => l.split(/\s+/));
  assert.equal(sums.length, 14);
  for (const [hash, file] of sums) assert.equal(createHash('sha256').update(readFileSync(new URL(file.replace('R2b/', ''), dirB))).digest('hex'), hash, file);
  const dev = tasksB.filter(t => !t.holdout), hold = tasksB.filter(t => t.holdout);
  assert.equal(dev.length, 10); assert.equal(hold.length, 4);
  assert.deepEqual(dev.map(t => JSON.stringify(t.actions)), tasks.map(t => JSON.stringify(t.actions)));
  const seen = new Set(dev.map(t => JSON.stringify(t.actions)));
  for (const t of hold) assert.ok(!seen.has(JSON.stringify(t.actions)), `${t.id} repeats a development heist`);
});

test('round 2b: every title names the exit its trace really uses; holdout is 2 door + 2 window', () => {
  for (const t of tasksB) assert.ok(t.title.includes(`exits by the ${exitAsleep(t)}`), `${t.id}: ${t.title} vs ${exitAsleep(t)}`);
  assert.deepEqual(tasksB.filter(t => t.holdout).map(exitAsleep).sort(), ['door', 'door', 'window', 'window']);
});
