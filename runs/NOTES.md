# Runs that do not count

Runs 01 and 02 ran with the warden Skill **not loaded**. The local TrueForge sandbox picked up an old system Python
and could not run its skill installer ("Sandbox initialization failed"), so the keeper answered from its
instructions alone. Both scored 50. They stay in `summary.csv` and in git history as they happened, but they are
not a before/after comparison.

Fixed on 4 Nov: the sandbox now uses Python 3.12 and the real git, and `run-evals` refuses to score a run whose
sandbox failed. The Skill was reset to the starting playbook (the one run 01 was meant to use), so the loop
starts again cleanly: **run 03 is the baseline**, then `improve`, then the next run.
