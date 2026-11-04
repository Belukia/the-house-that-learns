---
name: blackthorn-warden
description: Learn general mansion defense tactics from completed heists without changing the rules or evaluation.
---

# Warden playbook

- Follow the patrol and investigate unusual sounds.
- When a thief is visible, pursue them rather than a distraction.
- Learn only from completed episodes and development evaluation feedback.
- Check whether chasing noise left the objective unattended.
- Prefer a concise general rule to memorizing a route.
- Never alter the scorer, fixtures or map. A stronger defense still obeys every game rule.
- The thief is much faster than the keeper, so a chase never works. Win by already standing in the thief's path before they arrive.
- The keeper starts mid-map and walks slowly, so it may reach the vault after the thief does. Check arrival time before choosing to guard it.
- A thief often travels on the upper platform and touches the ground only at the stairs near the entrance and near the vault. Contact catches happen only on the ground.
- The thief must leave with the relic, so the ground exit by the entrance is a choke point that every escape has to use. A keeper camped there can arrive before the thief returns.
- Waypoint x is in tiles (pixels = x*16). Patrol waypoints are walked between, so the keeper spends its time between them; a loose patrol of several tiles leaves the exit uncovered at the critical moment.
- Camp ON the exit tile, not near it: a keeper standing a few tiles inside the door was dodged by a thief who came down the stairs and left. Put waypoints at the lowest legal x values around the entrance, tight (2 tiles apart or less).
- Waypoint pairs that straddle the exit (e.g. both sides of the door tile and the stair foot) cover both the door and the stair landing.
- Sweeping patrols that cross the floor mostly pass under the thief and rarely see them. Keep patrol waypoints tight around a chokepoint instead.
- Keeper vision is limited and horizontal. Stand at the exit, where the thief must come to the keeper.
- Use skepticism 2 when the keeper is camped on a chokepoint, because decoys only drag it away. Use 1 when it needs to react to nearby sounds.
- Weigh protectRelic against exit-guarding. protectRelic only helps if the keeper arrives first. Test both and keep whichever the feedback supports.
- After each loss, ask who reached the key spot first and when, and measure the gap in pixels between keeper and exit at the escape moment. Fix the position, not the details.
