// npm run improve [-- --run NN] [-- --coach] [-- --no-commit]
//
// Adapted from nerdconf/trueforge-starter for ROB ME AGAIN: the feedback is the heists the keeper lost.
//
// The agent reads what went wrong in a run and rewrites its own instructions and skill.
//   1. Takes the run's failed tasks (never the holdout ones) with the scorer's feedback.
//   2. Opens a TrueForge session with the agent itself (or, with --coach, an inline coach agent on the same model)
//      and asks it for new versions of agent/instructions.md and agent/skills/*/SKILL.md.
//   3. Writes the files and commits them with the trailer "Agent-Session: <session_id>".
// You review the commit (git show) and keep it or drop it (git reset --hard HEAD~1). You don't edit it.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import type { TaskScore } from "../evals/score.ts";
import {
  client,
  die,
  exportSession,
  flag,
  git,
  isClean,
  loadTasks,
  option,
  readAgent,
  ROOT,
  runDir,
  runTurn,
  SUMMARY_CSV,
  writeJson,
  type Task,
  ROUND,
  ROUND_ID,
  roundRules,
} from "./lib.ts";
import { createGame, step } from "../dist/engine.mjs";

// ---------- which run ----------

const rows = existsSync(SUMMARY_CSV) ? readFileSync(SUMMARY_CSV, "utf8").trim().split("\n").slice(1).filter(Boolean) : [];
if (!rows.length) die("No runs yet. Run npm run run-evals first.");
const run = Number(option("run") ?? rows.length);
const dir = runDir(run);
const nn = String(run).padStart(2, "0");
if (!existsSync(join(dir, "results.json"))) die(`No results for run ${nn} in ${dir}`);
if (!isClean("agent")) die("agent/ has uncommitted changes. Commit or discard them first: the agent's change must be its own.");

type Result = TaskScore & { reply: string };
const results = JSON.parse(readFileSync(join(dir, "results.json"), "utf8")) as Result[];
const tasks = new Map(loadTasks().map((t) => [t.id, t]));
const failed = results.filter((r) => !r.passed && !r.holdout);
if (!failed.length) {
  console.log(`Nothing to learn from run ${nn}: every training task passed. Add harder tasks before run 1 next time.`);
  process.exit(0);
}

// ---------- the prompt ----------

const { agent, instructions, skills } = readAgent();
const currentFiles = [
  { path: "agent/instructions.md", text: instructions },
  ...skills.map((s) => ({ path: `${s.path}/SKILL.md`, text: readFileSync(join(ROOT, s.path, "SKILL.md"), "utf8") })),
];

/** What happened in one lost heist, replayed under the policy the agent chose: once per second. */
function heistReport(t: Task, r: Result): string[] {
  if (!r.policy) return [`Your reply had no legal policy (${r.invalid ?? "unknown reason"}), so the thief walked out.`];
  // dist/engine.mjs is plain JS; its inferred types do not describe a game in progress.
  const s: any = ROUND ? createGame(r.policy as any, { round: ROUND }) : createGame(r.policy as any);
  const lines: string[] = [];
  outer: for (const a of t.actions) {
    for (let n = 0; n < a.frames; n++) {
      step(s, a.input);
      if (s.turn % 60 === 0 || s.status !== "playing") {
        const p = s.player, g = s.guard;
        const floor = p.y < 170 ? "upper floor" : p.y < 270 ? "stairs" : "ground";
        lines.push(`  t=${(s.turn / 60).toFixed(1)}s thief (${Math.round(p.x)},${Math.round(p.y)}) ${floor}${s.hidden ? ", hidden" : ""}${s.hasRelic ? ", has emerald" : ""} · keeper (${Math.round(g.x)},${Math.round(g.y)})${s.noise ? `, glass at x ${Math.round(s.noise.x)}` : ""}`);
      }
      if (s.status !== "playing") break outer;
    }
  }
  // Exam v2 traces that run out are padded with stillness until dawn, exactly as the scorer does.
  if (ROUND) while (s.status === "playing") step(s, {});
  const how = s.status === "escaped" ? (String(s.message).includes("window") ? " through the upper window" : " through the front door") : "";
  return [
    `Outcome: ${s.status}${how} at ${(s.turn / 60).toFixed(1)}s. The keeper saw the thief for ${(s.seen / 60).toFixed(1)}s; decoys thrown: ${s.decoysThrown}.`,
    "Positions in pixels (x right, y down; ground y 282, upper floor y 154):",
    ...lines,
  ];
}

const feedback = failed
  .map((r, i) => {
    const t = tasks.get(r.task_id)!;
    return [
      `### Lost heist ${i + 1}`,
      "Your reply ended with:",
      "```",
      r.reply.slice(-1500) || "(empty reply)",
      "```",
      ...heistReport(t, r),
    ].join("\n");
  })
  .join("\n\n");

const roundSection = ROUND
  ? `\n## The exam you are improving for\n\n${roundRules().join("\n")}\nYour policy JSON must include dwell (0–4). Your playbook must cover both exits.\n`
  : "";

const prompt = `This message is not an EVALUATE_POLICY turn. Ignore the Output section of your instructions for this reply.

You are improving your own playbook. Below are your current instruction files, then the heists you lost in your last evaluation run: the policy you chose and what the thief did against it.

Rewrite your files so that next time you choose a policy that stops thieves like these, without knowing their route in advance.

Rules:
- Write general defense rules that would help against thieves you have never seen. Never mention these heists by number, never copy their position lists, and never claim scores.
- Keep what works. Change only what the losses show is wrong or missing. Keep the Output section of instructions.md exactly as it is: the scorer depends on it.
- Never change the game rules, the map, the scorer or the tasks. Your policy must stay legal.
- Short beats long: a playbook item is one line.
- You may edit agent/instructions.md and any agent/skills/<name>/SKILL.md (keep the frontmatter). Leave out files you don't change.

Reply with each changed file in full, in this format, and nothing else:

<<<FILE ${skills[0]?.path ?? "agent/skills/warden"}/SKILL.md
(the whole new file)
>>>
<<<LEARNED
(one sentence: what you learned)
>>>

${roundSection}
## Your current files

${currentFiles.map((f) => `<<<FILE ${f.path}\n${f.text.trim()}\n>>>`).join("\n\n")}

## What went wrong in run ${nn}

${feedback}
`;

// ---------- ask the agent ----------

const tf = client();
const coach = flag("coach");
const { data: session } = await tf.sessions.create({
  // The agent itself (by name), or a coach: an inline TrueForge agent on the same model.
  agent: coach
    ? { spec: { model: agent.model, instructions: "You coach the keeper of a mansion heist game: you rewrite its instruction files from the heists it lost.", config: { askUserQuestions: { enabled: false }, generativeUi: { enabled: false } } } }
    : { name: agent.name },
  metadata: { purpose: "improve", learned_from_run: nn, ...(ROUND ? { exam: "v2", round: ROUND_ID } : {}) },
});
await tf.sessions.update(session.id, { title: `${ROUND ? `exam v2 R${ROUND_ID} ` : ""}improve from run ${nn}` });
console.log(`Asking ${coach ? "the coach" : `"${agent.name}"`} to rewrite its playbook from ${failed.length} failed tasks (session ${session.id})…`);

const turn = await runTurn(tf, session.id, prompt, false);
if (turn.status !== "done") die(`The turn ended with status ${turn.status}${turn.error ? `: ${turn.error}` : ""}`);

// ---------- parse and check the change ----------

const files = [...turn.text.matchAll(/<<<FILE ([^\n]+)\n([\s\S]*?)\n>>>/g)].map((m) => ({ path: normalize(m[1].trim()), text: m[2].trimEnd() + "\n" }));
const learned = turn.text.match(/<<<LEARNED\n([\s\S]*?)\n>>>/)?.[1].trim() ?? "";
if (!files.length) die(`The agent proposed no files. Its reply:\n\n${turn.text}`);

const allowed = /^agent\/(instructions\.md|skills\/[a-z0-9][a-z0-9-]*\/SKILL\.md)$/;
for (const f of files) {
  if (!allowed.test(f.path)) die(`The agent tried to write ${f.path}. Only agent/instructions.md and agent/skills/<name>/SKILL.md are allowed.`);
}

// Overfitting guard: the new playbook must not quote the eval tasks.
const leaks: string[] = [];
for (const t of loadTasks()) {
  for (const f of files) for (const q of [t.id, t.title]) if (f.text.includes(q)) leaks.push(`${f.path} quotes "${q}"`);
}
// Copying three or more positions from the heist reports is memorising a route, not learning a defense.
const reported = new Set(feedback.match(/\(\d+,\d+\)/g) ?? []);
for (const f of files) {
  const copied = [...new Set(f.text.replace(/\s+/g, "").match(/\(\d+,\d+\)/g) ?? [])].filter((p) => reported.has(p));
  if (copied.length >= 3) leaks.push(`${f.path} copies ${copied.length} positions from the heist reports`);
}
if (leaks.length && !flag("allow-leaks")) die(`The change quotes the eval tasks, so it would overfit:\n  ${leaks.join("\n  ")}\nRun improve again (or pass --allow-leaks to keep it anyway).`);

for (const f of files.filter((f) => f.path.endsWith("/SKILL.md"))) {
  if (!/^---\n[\s\S]*?\bname:[\s\S]*?\bdescription:[\s\S]*?\n---\n/.test(f.text) || f.text.split("\n").length < 6) {
    die(`${f.path} lost its frontmatter (name, description) or its body. Run improve again.`);
  }
}
const newInstructions = files.find((f) => f.path === "agent/instructions.md");
if (newInstructions && !(newInstructions.text.includes("EVALUATE_POLICY") && newInstructions.text.includes("decoySkepticism"))) {
  die("The new instructions.md dropped the JSON output format the scorer needs. Run improve again.");
}

// ---------- write and commit ----------

for (const f of files) {
  mkdirSync(dirname(join(ROOT, f.path)), { recursive: true });
  writeFileSync(join(ROOT, f.path), f.text);
}
writeJson(join(dir, "improve-session.json"), await exportSession(tf, session.id));

if (isClean("agent")) {
  console.log("The agent sent back its files unchanged. Nothing to commit.");
  process.exit(0);
}
console.log(git("diff", "--stat", "--", "agent"));

const message = `agent: learn from ${ROUND ? `exam v2 R${ROUND_ID} ` : ""}run ${nn}\n\n${learned || "(no summary given)"}\n\nAgent-Session: ${session.id}`;
if (flag("no-commit")) {
  console.log(`\nFiles written, not committed. To commit:\n  git add agent runs && git commit -F- <<'EOF'\n${message}\nEOF`);
} else {
  git("add", "agent", join(dir, "improve-session.json"));
  git("commit", "-q", "-m", message);
  console.log(`\n✓ Committed the agent's change (Agent-Session: ${session.id}).`);
  console.log("  Review it: git show    Drop it: git reset --hard HEAD~1    Then: npm run run-evals");
}
