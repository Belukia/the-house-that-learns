# Exam v2: the house gets a second exit

TrueFoundry's feedback on exam v1 was *"harder the better"*. Exam v1 saturated: by run 05 the agent stopped all 8 heists, because every thief had to leave through the front door. So exam v2 changes the house.

**Round 2 adds a window upstairs, above the door.** A thief holding the emerald can stand at it and press the action key to climb out. Now there are two exits on two floors, and a keeper who camps on one of them loses to thieves who use the other one.

Everything from exam v1 stays as it was: `evals/tasks`, `evals/score.ts` and `runs/run-01…06` are untouched, and those runs still re-score the same with this engine.

## How it is built

| Piece | Where |
|---|---|
| Engine: rounds sit behind a `{round}` flag. Without it the engine is exactly exam v1. | `dist/engine.mjs` (`EXAM_V2`, `ROUNDS`, `WINDOW`, `validatePolicyV2`, `runRound`) |
| Round 2 tasks: 6 development + 4 holdout, frozen with SHA-256 sums before the first round-2 run | `evals/v2/R2/` |
| Round 2b tasks: 10 development + 4 fresh holdout, frozen before the first round-2b run | `evals/v2/R2b/` |
| Scorer (same contract as exam v1) | `evals/v2/score.ts` |
| Scripted thief generator (no AI) | `evals/v2/generator/` |
| `run-evals` and `improve` with `--round 2` / `--round 2b` | `scripts/` |
| Tests | `tests/exam-v2.test.mjs` |
| Runs | `runs/v2/R2/`, `runs/v2/R2b/` |

The thieves are scripted bots (wait, run, climb, hide, throw glass, leave by an exit). Each bot is played once with the keeper asleep, and its keys are frozen as a trace. The traces are open-loop, like in exam v1: a thief does not react to the keeper.

The agent sees only the rules of the round (two exits, upper-floor waypoints, a `dwell` time at each waypoint). It never sees a tactic, a task id or a holdout heist. `improve` only shows the development heists it lost.

**Before any run:** 5000 random legal keepers were simulated. 0 of them stop all 10 round-2 heists *and* all round-3 heists, and only 0.4% stop all 10 round-2 heists. The exam-v1 winning policy (camp on the door) stops 4 of the 6 round-2 development heists.

## Results

### Round 2 (6 development + 4 holdout)

| Run | Skill (agent commit) | Score | Development | Holdout |
|---|---|---|---|---|
| R2 run 01 | `72579b9`, exam v1's final Skill | 70 | 4/6 | 3/4 |
| *improve* | `8b531e1` "agent: learn from exam v2 R2 run 01" | | | |
| R2 run 02 | `8b531e1` | 70 | **6/6** | 1/4 |
| R2 run 03 | `8b531e1` (same Skill, repeated) | 70 | 6/6 | 1/4 |

The agent learned to camp at the upstairs window and solved every development heist. But it dropped to 1/4 on the holdout. That is overfitting, and it happened in both runs. The holdout caught it.

Note: two round-2 holdout heists (`r2-08`, `r2-09`) are titled as window thieves, but their traces leave by the **door**. So all 4 round-2 holdout heists are door escapes, and only 3 development heists use the window. Round 2 stays frozen as it is. Round 2b titles name the exit each trace really uses.

### Round 2b (the used-up holdout becomes development; 4 fresh holdout)

Once the agent's runs had shown the round-2 holdout, it could no longer serve as a holdout. Round 2b moves those 4 heists into development and generates 4 new holdout heists (2 door, 2 window) from the same scripted thieves, with a new seed range. They were frozen on GitHub (`7c3c98f`) before run 2b-01.

| Run | Skill (agent commit) | Score | Development | Holdout | What the agent tried |
|---|---|---|---|---|---|
| 2b run 01 | `a1fd2ff` (round 2's Skill) | 71.43 | 7/10 | 3/4 | camp at the window |
| *improve* | `22b0ac6` | | | | "cover both exits by cycling door ↔ window" |
| 2b run 02 | `22b0ac6` | 50 | 6/10 | 1/4 | door first, then window, short waits |
| *improve* | `8de9a90` | | | | "window first, long dwell, try protectRelic" |
| 2b run 03 | `8de9a90` | 71.43 | 8/10 | 2/4 | guard the vault, then window, then door |
| *improve* | `16f6ef4` | | | | "protectRelic arrives too late: window first, then door" |
| 2b run 04 | `16f6ef4` | 71.43 | 7/10 | 3/4 | window, then the door |
| 2b run 05 | `16f6ef4` (same Skill, repeated) | 71.43 | 7/10 | 3/4 | window, then the door |

**What this shows, and what it does not.**

- Every agent commit is the agent's own rewrite of its Skill, made in a TrueForge session (see `Agent-Session` in each commit message). Each rule is general, and the overfitting guard in `improve` found no copied positions or task names.
- In round 2, the agent fixed every development heist it saw, and the holdout exposed that the fix was overfitted.
- In round 2b, three learning cycles tried three different strategies. The score went 71 → 50 → 71 → 71, so there was **no net gain on this round**. The repeated run confirms 71.43.
- The simulation predicted this round would be hard: very few simple patrols stop both exits. A higher score probably needs a richer patrol, more learning cycles or a different policy language. I don't claim it.

Each run folder holds `results.json` (every reply and policy, which is what the scorer re-scores) and `score.json`. `summary.csv` lists each run's TrueForge session id.

**Correction:** the commit message of `0372b64` (2b run 05) names the wrong TrueForge session. The right one is `01m6rm9qa8skksa0gerhy3qdx0`, as `summary.csv` and `score.json` show.

### Round 2b, continued: a richer lesson after each loss

After run 05, `improve` was changed once (`c9607a8`), before any new run. The rounds, tasks, scorer and holdout stayed frozen. For exam v2 rounds only, the agent's lesson now includes two new parts:

- **Key moments of each lost heist**, measured on a replay of the agent's own policy: when the thief took the emerald, when the keeper first saw the thief, the closest the keeper came, and where the keeper was when the thief left, with his distance to that exit.
- **The training heists it stopped**, with the policy that stopped each one. The rule: a fix that would let one of these through is not progress.

It still gets no tactic, no task id and no holdout heist. `npx tsx scripts/improve.ts --round 2b --run 5 --print-prompt` prints the exact prompt without opening a session.

| Run | Skill (agent commit) | Score | Development | Holdout | What the agent learned |
|---|---|---|---|---|---|
| 2b run 05 | `16f6ef4` | 71.43 | 7/10 | 3/4 | (baseline, from above) |
| *improve* | `5bf0891` | | | | "a long window dwell leaves the door open: keep it short, be on the ground when the thief comes home" |
| 2b run 06 | `5bf0891` | **85.71** | 8/10 | **4/4** | |
| *improve* | `bcaf3d1` | | | | "dwell 0, land on the door tile" |
| 2b run 07 | `bcaf3d1` | 71.43 | 8/10 | 2/4 | |
| *improve* | `d76de72` | | | | "move the window post nearer the stairs" |
| 2b run 08 | `d76de72` | 64.29 | 8/10 | 1/4 | |
| 2b run 09 | `5bf0891` (repeat of run 06) | **85.71** | 8/10 | **4/4** | |
| 2b run 10 | `5bf0891` (second repeat) | **85.71** | 8/10 | **4/4** | |

**What this shows, and what it does not.**

- With the richer lesson, one learning cycle took the agent from 71.43 to 85.71, and the holdout from 3/4 to 4/4. The same Skill scored 85.71 three times out of three (runs 06, 09, 10). This is the first exam v2 gain that holds on heists the agent never saw.
- For scale: of 5000 random legal keepers (one policy for all 14 heists), about 1% score 85.71 or more on this round, and 0.2% score 100. The most common random score is 71.43.
- The two next cycles made things worse: 71.43, then 64.29. Each one over-tuned timing for the two door heists it still lost (`r2b-09`, `r2b-10`), and lost holdout heists in exchange. The loop stopped after two cycles without a gain, as planned.
- Runs 07 and 08 show that more learning cycles do not always help. The best Skill is `5bf0891`. The branch head still carries the later Skill `d76de72`, kept as the agent wrote it.
- Choosing `5bf0891` as "best" uses the total score, which includes the holdout. So 85.71 is the best measured result, not an untouched estimate of a fresh holdout. A new frozen holdout would be needed to confirm it.

**Correction:** the commit message for 2b run 07 names the wrong TrueForge session (`01m6s9n8s1q0kqhzwdc9a3d3gr`). The right one is `01m6s9qct9bf3xf71knaa0y3w4`, as `summary.csv` and `score.json` show. The data is unaffected.

## Cost

The first 12 TrueForge sessions (8 evals, 4 improves) cost US$ 3.05 on the model gateway (`totalCostInUsd` in each `session.json`). The continuation (5 evals, 3 improves) cost US$ 2.07. Exam v2 so far: US$ 5.12. Exam v1 cost about US$ 1.30.

## Re-check it yourself

```bash
npm install
npm test                                  # 36 tests, including exam v2 and the game's window
npx tsx evals/v2/score.ts --selftest
npx tsx scripts/rescore-runs.ts           # exam v1 runs: all "same"
shasum -a 256 -c <(sed 's/  /  evals\/v2\//' evals/v2/R2/SHA256SUMS.txt | awk '{print $1"  "$2}')
node evals/v2/generator/build-r2b.mjs evals/v2/R2 /tmp/R2b-check   # regenerates evals/v2/R2b byte for byte
```

## The game

The playable game now uses the same window. From night 3 a window is open upstairs, above the door. If you escape through it, the in-browser keeper learns that ("You climbed out the window. Tonight I wait beside it.") and waits there the next night. The in-browser keeper learns with simple game rules, not with TrueForge. The TrueForge agent learns between eval runs, as shown above.
