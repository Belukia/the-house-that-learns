# The House That Learns

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

## Evaluation

```sh
npm test
node scripts/evaluate.mjs --policy agent/policy.json --output runs/private/baseline
node --env-file=.env scripts/learn.mjs --feedback runs/private/baseline/development.json
# Re-evaluate the saved candidate policy against the exact same frozen tasks.
node scripts/evaluate.mjs --policy <candidate-policy.json> --output runs/private/candidate
```

The local evaluator replays fixed thief action traces against a policy. It measures guard defense, not real people or feedback. Development and reserved cases are scored separately. The learner receives development feedback only. Neither the agent nor the game may alter the scorer or frozen task set after baseline. Policy files and evidence directories are explicit; scripts do not automatically commit or promote model changes.

For the actual contest baseline, use `npm run eval:trueforge` after configuration. This asks the registered TrueForge warden for a defense policy in fresh root turns without showing the thief's action traces, then scores the decisions against the frozen traces. It saves streamed session events and separate development/holdout scores. Use only its development.json for learning. Review the proposed skill, commit it with its real `Agent-Session:` trailer, push it, set SKILL_GIT_REF to that new immutable commit, and repeat the same TrueForge evaluation. Do not rename offline engine runs as TrueForge runs. The SDK integration is implemented but remains unverified against a configured live model.

## Run 1 vs run N

- Task: stop fixed heist traces under identical mansion rules and time budget.
- Score: percentage of traces stopped; report development and holdout separately.
- TrueForge baseline: **not run**.
- Agent-authored skill revision / session: **not yet established**.
- Later TrueForge run and improvement: **not yet established**.

Offline engine checks and local rule-based demonstrations are never entered as TrueForge scores. Contest readiness still requires genuine runtime sessions, an agent-authored revision, a comparable scored improvement, the required platform capabilities, a public repo, a short English demo, and final evidence review/submission by the owner.

## Project structure

`dist/`: playable game, canvas renderer and shared engine. `agent/`: keeper's seed instructions, skill and policy. `evals/`: fixed scenarios and scorer. `scripts/`: evaluation and TrueForge adapter. `runs/private/`: ignored raw evidence.

The private Sites preview is separate from this public source repository. Deployment is not a contest submission or an announcement of public launch.

## Credits

Built by Tamara Rienzi with AI-assisted coding. Original code-drawn artwork; no downloaded image assets. Google Fonts serves DM Sans and Playfair Display, with system fallbacks. TrueForge SDK: TrueFoundry, under its upstream license. No real tester or user results are claimed.

## Runtime and current proof status

The official TrueForge 0.182.0 local runtime can be started with `node scripts/start-trueforge.mjs`. It binds `127.0.0.1:8790` and stores its database in ignored `.runtime/`. Its capabilities endpoint was checked successfully: Skills and Sandbox are enabled. The configured model list was empty at that check. This verifies infrastructure, not an agent run or improvement. Configure a provider in Settings → Models before attempting inference. Never put provider credentials in frontend files or source control.

The real-time engine replaces the original grid prototype. Its new fixed timelines have not been used for a real TrueForge baseline. Earlier turn-based results are obsolete and cannot be compared to these tasks. The current automated checks cover running, jumping, solid collisions, platform drop-through, all courtesy routes, contact capture, hiding and memory behavior. The evaluation set still needs a deliberate benchmark-quality review and freeze before the first measured agent run.
