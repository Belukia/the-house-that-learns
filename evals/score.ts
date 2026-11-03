// The scorer. Deterministic: same reply in, same number out. Higher is better.
// Don't change it (or evals/tasks/) after run 1: every run must be scored the same way.
//
//   npm run score -- runs/run-01     re-score a saved run from its results.json
//   npm run score -- --selftest      check the scorer on the seed policy and on broken replies
//
// Per task: the agent's reply must end with a legal defense policy as JSON. The fixed thief trace in the
// task is replayed under that policy in the game engine (dist/engine.mjs, the same code the game runs).
//   score 1 = the keeper stopped the thief (caught by contact, or still inside at dawn, 90 s)
//   score 0 = the thief escaped, or the reply had no legal policy
// Run score = 100 × the mean task score → 0..100. A task "passes" when its score is 1.
// A trace that ends with the heist unresolved (`playing`) is a broken fixture: it aborts scoring, never counts as an escape.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_POLICY, runActions, validatePolicy } from "../dist/engine.mjs";

export interface Policy {
  name: string;
  lesson: string;
  decoySkepticism: number;
  protectRelic: boolean;
  patrol: { x: number; y: number }[];
}
export interface ScoredTask {
  id: string;
  title: string;
  holdout?: boolean;
  actions: { frames: number; input: Record<string, boolean> }[];
}
export interface TaskScore {
  task_id: string;
  holdout: boolean;
  score: number; // 0 or 1
  passed: boolean;
  parsed: boolean;
  /** Why the reply had no usable policy, when parsed is false. */
  invalid?: string;
  policy: Policy | null;
  outcome: "caught" | "escaped" | "no-policy";
  /** Engine ticks until the heist ended (60 per second). */
  ticks: number;
  relic_stolen: boolean;
}

/** The policy in the agent's reply: the last ```json block, or the whole reply if it is bare JSON. */
export function parsePolicy(reply: string): { policy: Policy | null; error?: string } {
  const blocks = [...reply.matchAll(/```json\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  const candidate = blocks.length ? blocks[blocks.length - 1] : reply;
  let obj: unknown;
  try {
    obj = JSON.parse(candidate.trim());
  } catch {
    return { policy: null, error: "no JSON policy in the reply" };
  }
  try {
    return { policy: validatePolicy(obj) as Policy };
  } catch (e) {
    return { policy: null, error: (e as Error).message };
  }
}

/** Replays the task's thief under a policy. */
export function simulate(task: ScoredTask, policy: Policy) {
  const s = runActions(policy, task.actions);
  if (s.status === "playing") throw new Error(`Fixture ${task.id} ended unresolved at tick ${s.turn}.`);
  return { outcome: s.status as "caught" | "escaped", ticks: s.turn as number, relic_stolen: Boolean(s.hasRelic) };
}

export function scoreTask(task: ScoredTask, reply: string): TaskScore {
  const base = { task_id: task.id, holdout: !!task.holdout };
  const { policy, error } = parsePolicy(reply);
  if (!policy) {
    return { ...base, score: 0, passed: false, parsed: false, invalid: error, policy: null, outcome: "no-policy", ticks: 0, relic_stolen: false };
  }
  const run = simulate(task, policy);
  const stopped = run.outcome === "caught";
  return { ...base, score: stopped ? 1 : 0, passed: stopped, parsed: true, policy, ...run };
}

export function scoreRun(tasks: TaskScore[]): { score: number; tasks_passed: number; tasks_total: number } {
  const mean = tasks.length ? tasks.reduce((s, t) => s + t.score, 0) / tasks.length : 0;
  return { score: round(100 * mean, 2), tasks_passed: tasks.filter((t) => t.passed).length, tasks_total: tasks.length };
}

function round(x: number, d: number): number {
  const k = 10 ** d;
  return Math.round(x * k) / k;
}

// ---------- CLI ----------

const here = dirname(fileURLToPath(import.meta.url));

export function loadScoredTasks(): ScoredTask[] {
  const dir = join(here, "tasks");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}

function reply(policy: unknown): string {
  return "My defense for tonight.\n\n```json\n" + JSON.stringify(policy, null, 2) + "\n```\n";
}

function selftest(): void {
  const tasks = loadScoredTasks();
  const check = (name: string, got: number, want: number) => {
    const ok = got === want;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${got}${ok ? "" : ` (want ${want})`}`);
    if (!ok) process.exitCode = 1;
  };
  const seed = tasks.map((t) => scoreTask(t, reply(DEFAULT_POLICY)));
  check("seed policy scores", scoreRun(seed).score, 50);
  check("same reply, same score", scoreRun(tasks.map((t) => scoreTask(t, reply(DEFAULT_POLICY)))).score, scoreRun(seed).score);
  check("bare JSON reply parses", scoreRun(tasks.map((t) => scoreTask(t, JSON.stringify(DEFAULT_POLICY)))).score, 50);
  check("unparseable replies score", scoreRun(tasks.map((t) => scoreTask(t, "I will guard the house."))).score, 0);
  const illegal = { ...DEFAULT_POLICY, patrol: [{ x: 0, y: 0 }, { x: 99, y: 3 }] };
  check("illegal policies score", scoreRun(tasks.map((t) => scoreTask(t, reply(illegal)))).score, 0);
}

function rescore(dir: string): void {
  const results = JSON.parse(readFileSync(join(resolve(dir), "results.json"), "utf8")) as { task_id: string; reply: string }[];
  const tasks = new Map(loadScoredTasks().map((t) => [t.id, t]));
  const scored = results.map((r) => {
    const t = tasks.get(r.task_id);
    if (!t) throw new Error(`unknown task ${r.task_id}`);
    return scoreTask(t, r.reply);
  });
  for (const s of scored) console.log(`${s.passed ? "pass" : "    "} ${s.task_id.padEnd(24)} ${s.score}  ${s.outcome}${s.invalid ? ` (${s.invalid})` : ""}`);
  console.log(JSON.stringify(scoreRun(scored)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === "--selftest") selftest();
  else if (arg) rescore(arg);
  else console.log("usage: npm run score -- runs/run-NN | --selftest");
}
