// Exam v2 scorer. Same contract as evals/score.ts (exam v1, unchanged), for the harder rounds:
//   score 1 = the keeper stopped the thief (caught by contact, or still inside at dawn, 60 s)
//   score 0 = the thief escaped through the door or the window, or the reply had no legal policy
// Run score = 100 × the mean task score. Deterministic: same reply in, same number out.
// The tasks (evals/v2/R<n>/*.json) are frozen with SHA256SUMS.txt before the first run of each round.
//
//   npx tsx evals/v2/score.ts --selftest        check the scorer on fixed policies
//   npx tsx evals/v2/score.ts runs/v2/R2/run-01 re-score a saved run

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runRound, validatePolicyV2 } from "../../dist/engine.mjs";
import type { TaskScore } from "../score.ts";

export interface PolicyV2 {
  name: string;
  lesson: string;
  decoySkepticism: number;
  protectRelic: boolean;
  dwell: number;
  patrol: { x: number; y: number }[];
}
export interface RoundTask {
  id: string;
  title: string;
  holdout?: boolean;
  round: number;
  actions: { frames: number; input: Record<string, boolean> }[];
}

export function parsePolicy(reply: string): { policy: PolicyV2 | null; error?: string } {
  const blocks = [...reply.matchAll(/```json\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  const candidate = blocks.length ? blocks[blocks.length - 1] : reply;
  let obj: unknown;
  try {
    obj = JSON.parse(candidate.trim());
  } catch {
    return { policy: null, error: "no JSON policy in the reply" };
  }
  try {
    return { policy: validatePolicyV2(obj) as PolicyV2 };
  } catch (e) {
    return { policy: null, error: (e as Error).message };
  }
}

export function simulate(task: RoundTask, policy: PolicyV2) {
  const s = runRound(policy, task.actions, task.round);
  if (s.status === "playing") throw new Error(`Fixture ${task.id} ended unresolved at tick ${s.turn}.`);
  const exit = s.status === "escaped" ? (s.message.includes("window") ? "window" : "door") : null;
  return { outcome: s.status as "caught" | "escaped", ticks: s.turn as number, relic_stolen: Boolean(s.hasRelic), exit };
}

export function scoreTask(task: RoundTask, reply: string): TaskScore & { exit?: string | null } {
  const base = { task_id: task.id, holdout: !!task.holdout };
  const { policy, error } = parsePolicy(reply);
  if (!policy) {
    return { ...base, score: 0, passed: false, parsed: false, invalid: error, policy: null, outcome: "no-policy", ticks: 0, relic_stolen: false };
  }
  const run = simulate(task, policy);
  const stopped = run.outcome === "caught";
  return { ...base, score: stopped ? 1 : 0, passed: stopped, parsed: true, policy: policy as any, ...run };
}

export function scoreRun(tasks: { score: number; passed: boolean }[]): { score: number; tasks_passed: number; tasks_total: number } {
  const mean = tasks.length ? tasks.reduce((s, t) => s + t.score, 0) / tasks.length : 0;
  return { score: Math.round(10000 * mean) / 100, tasks_passed: tasks.filter((t) => t.passed).length, tasks_total: tasks.length };
}

// ---------- CLI ----------

const here = dirname(fileURLToPath(import.meta.url));

export function loadRoundTasks(round: number): RoundTask[] {
  const dir = join(here, `R${round}`);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}

const reply = (p: unknown) => "Tonight.\n\n```json\n" + JSON.stringify(p, null, 2) + "\n```\n";

/** Fixed reference policies with their known round-2 scores (from the 5000-policy simulation). */
export const REFERENCE = {
  // Exam v1's seed policy, with dwell 0.
  seed: { name: "The trusting keeper", decoySkepticism: 0, protectRelic: false, dwell: 0, patrol: [{ x: 29, y: 18 }, { x: 43, y: 18 }], lesson: "Every sound deserves my attention." },
};

function selftest(): void {
  const tasks = loadRoundTasks(2);
  let fail = 0;
  const check = (name: string, ok: boolean, got: unknown) => {
    console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${JSON.stringify(got)}`);
    if (!ok) fail++;
  };
  check("10 tasks, 4 holdout", tasks.length === 10 && tasks.filter((t) => t.holdout).length === 4, tasks.length);
  const a = scoreRun(tasks.map((t) => scoreTask(t, reply(REFERENCE.seed)))).score;
  const b = scoreRun(tasks.map((t) => scoreTask(t, reply(REFERENCE.seed)))).score;
  check("same reply, same score", a === b, [a, b]);
  check("garbage scores 0", scoreRun(tasks.map((t) => scoreTask(t, "no policy here"))).score === 0, 0);
  const illegal = { ...REFERENCE.seed, patrol: [{ x: 5, y: 10 }, { x: 6, y: 10 }] }; // upper floor starts at x 14
  check("illegal upper waypoint rejected", scoreTask(tasks[0], reply(illegal)).parsed === false, scoreTask(tasks[0], reply(illegal)).invalid);
  const escapes = tasks.map((t) => scoreTask(t, reply({ ...REFERENCE.seed, patrol: [{ x: 60, y: 18 }, { x: 61, y: 18 }] })));
  const exits = new Set(escapes.filter((e) => e.outcome === "escaped").map((e) => (e as any).exit));
  check("thieves use both exits", exits.has("door") && exits.has("window"), [...exits]);
  if (fail) process.exitCode = 1;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === "--selftest") selftest();
  else if (arg) {
    const results = JSON.parse(readFileSync(join(arg, "results.json"), "utf8"));
    const tasks = new Map(loadRoundTasks(2).map((t) => [t.id, t]));
    const re = results.map((r: any) => scoreTask(tasks.get(r.task_id)!, r.reply));
    const saved = JSON.parse(readFileSync(join(arg, "score.json"), "utf8")).score;
    const now = scoreRun(re).score;
    console.log(`${arg}: saved ${saved}, re-scored ${now} → ${saved === now ? "same" : "DIFFERENT"}`);
    if (saved !== now) process.exitCode = 1;
  } else console.log("usage: tsx evals/v2/score.ts --selftest | <run dir>");
}
