# ROB ME AGAIN

A real-time pixel-art midnight heist. Steal Blackthorn's emerald and escape. Its keeper remembers your tactics and changes his defenses for the next night.

Original game for Stranger Builds / TrueForge, started 3 November 2026. This is a new project, not a fork. It uses original canvas artwork and game code. The TrueForge integration follows the official SDK and NERDCONF starter's documented session/improvement pattern; it does not copy the code-review benchmark.

## Play locally

Node.js 22.14+ required. The playable offline edition has no installed runtime dependencies:

```sh
node server.mjs
# http://127.0.0.1:4173
```

Hold A/D or the arrow keys to run. Space/W/Up jumps, Down drops through platforms, Shift sprints, F throws a decoy, and H hides near a blue wardrobe. On mobile, hold the touch controls. The side-view world scrolls with the player. Time advances continuously at 60 simulation ticks per second; switching tabs or opening a dialog pauses play. First visit: a nonlethal courtesy round. After the first escape, steal the emerald and return left to the entrance within 90 seconds.

Field Notes exports the actual heist trace and resets local memory. No account, tracking, or camera. The static hosted edition stores its memory in the browser only.

## Two learning modes — keep the evidence separate

- **Playable local adaptation:** after each heist the in-browser keeper reads what you did and learns **one** habit of yours (your route, your wardrobe, your decoys, your exit), says it in plain words, and acts on it next night. Your last heist is drawn on the board as he remembers it. These are explicit, deterministic game rules (`learnLocal` in `dist/engine.mjs`): a working game mechanic, **not a TrueForge model-learning result**. Habits are ignored by the scorer, so the TrueForge runs are unaffected (`npx tsx scripts/rescore-runs.ts` re-scores every saved run with today's engine; all match).
- **TrueForge candidate learning:** the local bridge loads a registered git-backed warden skill with sandbox support, opens a real TrueForge session, and requests an agent-authored skill/policy rewrite. Candidate files and raw stream events are saved locally. A subsequent fixed evaluation establishes whether the candidate is actually better. Results: see "Run 1 vs run N" below.

Install the official SDK and runtime for the second mode:

```sh
npm ci
cp .env.example .env
# Configure your runtime, model and token in .env; do not commit credentials.
# SKILL_REPO_URL=https://github.com/Belukia/the-house-that-learns
# SKILL_GIT_REF=<an immutable commit already pushed to that repo>
node --env-file=.env server.mjs
```

The server binds loopback only and does not expose .env, agent files, or run evidence. Model calls use the operator's configured provider and may be billable. Do not set configuration until that runtime and its budget are ready. The hosted static preview makes no TrueForge calls.

## Evaluation: the TrueForge loop

The contest loop follows the [NERDCONF TrueForge starter](https://github.com/nerdconf/trueforge-starter): one run is one TrueForge session, the agent rewrites its own `agent/` files, and every run lands in `runs/summary.csv`.

```sh
npx @truefoundry/trueforge@latest   # its own terminal; add the model in Settings → Models
npm ci && cp .env.example .env      # set TF_MODEL=provider/model
npm run setup                       # create the "blackthorn-keeper" agent from agent/
npm run run-evals                   # run 1: one session, one root turn per heist, scored and committed
npm run improve                     # the keeper rewrites its warden skill from the heists it lost; commit ends with Agent-Session: <id>
git show                            # review it; keep it, or drop it with git reset --hard HEAD~1
npm run run-evals                   # run 2: same tasks, same scorer
```

- **Tasks** (`evals/tasks/*.json`): eight fixed thief traces at 60 ticks per second. Tasks marked `"holdout": true` count in the score, but `improve` never shows them to the agent. The four holdout heists (05–08) are different routes from the four development ones, built once by `scripts/make-holdout.mjs` and frozen before run 1.
- **Scorer** (`evals/score.ts`): the agent's reply must end with a legal defense policy as JSON. Each trace is replayed against it in `dist/engine.mjs`, the same engine the game uses. Score = 100 × the share of heists stopped (caught by contact, or still inside at dawn). `npm run score -- --selftest` checks it.
- **Skills and sandbox:** `agent/agent.json` uses `"skill_mode": "git"`, so the warden skill is a real TrueForge skill cloned into the sandbox from this public repo, pinned to the commit that runs. Push before each `run-evals`.
- After run 1, `evals/` does not change again.

`npm test` and `node scripts/evaluate.mjs` are offline engine checks. They are not TrueForge runs and never go into `runs/summary.csv`.

## Run 1 vs run N

Play it: **https://belukia.github.io/the-house-that-learns/**

- **Task and score:** stop 8 fixed heists (4 of them holdout) by choosing a defense policy before seeing the thief; score = 100 × heists stopped / heists.
- **Run 1 → run N:** run 03 (baseline, starting Skill) **50** → run 04 **62.5** → run 05 **100**. Same 8 heists, same scorer, each Skill written by the agent itself. Runs 01–02 did not load the Skill and do not count ([runs/NOTES.md](runs/NOTES.md)).

  | Run | Skill | Development (4) | Holdout (4) | Score |
  |---|---|---|---|---|
  | 03 | starting Skill | 2/4 | 2/4 | 50 |
  | 04 | `82da2c6` agent: learn from run 03 | 2/4 | 3/4 | 62.5 |
  | 05 | `9dd5c2d` agent: learn from run 04 | 4/4 | 4/4 | 100 |
  | 06 | same as 05, run again | 4/4 | 4/4 | 100 |

- **The changes that did it:** two agent commits, each with its `Agent-Session` trailer. `82da2c6` (session `01m6j5pyh9egfy5zex0cs1d7gq`): the thief is faster, so stop chasing and camp the entrance. `9dd5c2d` (session `01m6m5qyphh2k5pgw7bv3tx0yw`): it measured why the camp still leaked ("waypoints are tiles, x*16 px") and moved the camp onto the exit tile itself.
- **Holdout:** the agent never saw the 4 holdout heists while learning; they went 2/4 → 3/4 → 4/4.
- **Repeat:** run 06 re-ran run 05's Skill unchanged and scored the same 100, so the last step is not one lucky run.
- **What this does not prove:** the 8 fixed heists now saturate. Every one of them has to leave through the front door, and a keeper standing on it stops them all. After run 05 `improve` had nothing left to learn from. A harder set (thieves who wait him out, or a second exit) is the next step. The hosted game's keeper, who chases you on both floors, is browser game rules and is not what these runs score.

## What this could be used for

ROB ME AGAIN is a game, not a security tool. It is a small, playable picture of a loop that matters outside games: **watch how you were beaten, rewrite your own rules, test again on attacks you have not seen.** For example, the same loop could help:

- **adaptive defenses** that update their rules after each intrusion attempt, as attackers (increasingly, other AIs) change tactics;
- **fraud or abuse filters** that learn from the cases they missed, checked against held-out cases before a new rule ships;
- **red-team / blue-team practice**, where one agent attacks and the other rewrites its playbook between rounds.

None of these is built here. What is shown is the loop itself, with a scorer, a holdout set and the agent's own commits.

## Project structure

`dist/`: playable game, canvas renderer and shared engine. `agent/`: the keeper's agent definition (`agent.json`), instructions, warden skill and seed policy. `evals/`: fixed heists (`tasks/`) and scorer. `scripts/`: the starter loop (`setup`, `run-evals`, `improve`, `export-session`) plus the game's TrueForge bridge. `runs/`: one folder per counted run and `summary.csv`; `runs/private/` stays ignored.

The private Sites preview is separate from this public source repository. Deployment is not a contest submission or an announcement of public launch.

## Credits

Built by Tamara Rienzi with AI-assisted coding. Original code-drawn artwork; no downloaded image assets. Google Fonts serves DM Sans and Playfair Display, with system fallbacks. TrueForge SDK: TrueFoundry, under its upstream license. THE HOUSE's voice (dist/voice/, 49 lines) was generated with ElevenLabs text-to-speech, voice "James - English Butler" from the ElevenLabs voice library, under ElevenLabs' terms; it plays only after SOUND ON, and subtitles stay on screen. No real tester or user results are claimed.

## Runtime and current proof status

- **Runtime:** the official TrueForge 0.182.0 local runtime (`node scripts/start-trueforge.mjs`, bound to `127.0.0.1:8790`, database in ignored `.runtime/`) with a TrueFoundry-hosted model. Credentials live in an ignored `.env`, never in `dist/` or source control.
- **Measured:** the baseline (run 03) and the agent-rewritten Skills (runs 04 and 05, repeated as 06) above, on the same frozen 8 heists and scorer. `scripts/rescore-runs.ts` re-scores every saved run with the current engine and still reports the same numbers.
- **Variance:** only the final Skill was repeated (run 06 = run 05). Runs 03 and 04 were scored once each.
- **Hosted game vs evaluation:** the hosted game's five nights (a keeper who chases you on both floors, learns one habit per heist and says what he knows) are browser game rules. Evaluations never pass those options, so the frozen benchmark is unchanged.
