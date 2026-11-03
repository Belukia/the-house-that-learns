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

- **Playable local adaptation:** explicit, deterministic game rules update the guard's policy after each heist. This is a working game mechanic, **not a TrueForge model-learning result**.
- **TrueForge candidate learning:** the local bridge loads a registered git-backed warden skill with sandbox support, opens a real TrueForge session, and requests an agent-authored skill/policy rewrite. Candidate files and raw stream events are saved locally. A subsequent fixed evaluation establishes whether the candidate is actually better. No real TrueForge run or qualifying improvement has been established yet.

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

- **Tasks** (`evals/tasks/*.json`): eight fixed thief traces at 60 ticks per second. Tasks marked `"holdout": true` count in the score, but `improve` never shows them to the agent.
- **Scorer** (`evals/score.ts`): the agent's reply must end with a legal defense policy as JSON. Each trace is replayed against it in `dist/engine.mjs`, the same engine the game uses. Score = 100 × the share of heists stopped (caught by contact, or still inside at dawn). `npm run score -- --selftest` checks it.
- **Skills and sandbox:** `agent/agent.json` uses `"skill_mode": "git"`, so the warden skill is a real TrueForge skill cloned into the sandbox from this public repo, pinned to the commit that runs. Push before each `run-evals`.
- After run 1, `evals/` does not change again.

`npm test` and `node scripts/evaluate.mjs` are offline engine checks. They are not TrueForge runs and never go into `runs/summary.csv`.

## Run 1 vs run N

> Filled in after the runs. Five lines max.

- **Task and score:** stop 8 fixed heists (4 of them holdout) by choosing a defense policy before seeing the thief; score = 100 × heists stopped / heists.
- **Run 1 → run N:** _not run yet._
- **The change that did it:** _not yet: a commit with `Agent-Session:`._
- **What the agent learned:** _not yet._
- **What still fails:** _not yet._


## Project structure

`dist/`: playable game, canvas renderer and shared engine. `agent/`: the keeper's agent definition (`agent.json`), instructions, warden skill and seed policy. `evals/`: fixed heists (`tasks/`) and scorer. `scripts/`: the starter loop (`setup`, `run-evals`, `improve`, `export-session`) plus the game's TrueForge bridge. `runs/`: one folder per counted run and `summary.csv`; `runs/private/` stays ignored.

The private Sites preview is separate from this public source repository. Deployment is not a contest submission or an announcement of public launch.

## Credits

Built by Tamara Rienzi with AI-assisted coding. Original code-drawn artwork; no downloaded image assets. Google Fonts serves DM Sans and Playfair Display, with system fallbacks. TrueForge SDK: TrueFoundry, under its upstream license. No real tester or user results are claimed.

## Runtime and current proof status

The official TrueForge 0.182.0 local runtime can be started with `node scripts/start-trueforge.mjs`. It binds `127.0.0.1:8790` and stores its database in ignored `.runtime/`. Its capabilities endpoint was checked successfully: Skills and Sandbox are enabled. The configured model list was empty at that check. This verifies infrastructure, not an agent run or improvement. Configure a provider in Settings → Models before attempting inference. Never put provider credentials in frontend files or source control.

The real-time engine replaces the original grid prototype. Its new fixed timelines have not been used for a real TrueForge baseline. Earlier turn-based results are obsolete and cannot be compared to these tasks. The current automated checks cover running, jumping, solid collisions, platform drop-through, all courtesy routes, contact capture, hiding and memory behavior. The evaluation set still needs a deliberate benchmark-quality review and freeze before the first measured agent run.
