// Re-scores every counted run's saved replies with today's engine and prints any difference.
import { readdirSync, readFileSync } from "node:fs";
import { loadScoredTasks, scoreTask, scoreRun } from "../evals/score.ts";
const tasks = new Map(loadScoredTasks().map((t) => [t.id, t]));
for (const d of readdirSync("runs").filter((d) => /^run-\d+$/.test(d)).sort()) {
  const saved = JSON.parse(readFileSync(`runs/${d}/results.json`, "utf8"));
  const now = saved.map((r: any) => scoreTask(tasks.get(r.task_id)!, r.reply));
  const diff = saved.filter((r: any, i: number) => r.score !== now[i].score).map((r: any) => r.task_id);
  console.log(d, "saved", scoreRun(saved).score, "now", scoreRun(now).score, diff.length ? "DIFF " + diff : "same");
}
