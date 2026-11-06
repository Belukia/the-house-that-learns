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
- The keeper starts mid-map and walks slowly (about 60 px/s), so it may reach the vault after the thief does. Check arrival time before choosing to guard it.
- A thief often travels on the upper platform and touches the ground only at the stairs. Contact catches happen only on the same floor.
- The thief must leave with the relic, so every exit is a choke point. Guard the exit, not the route.
- Waypoint x is in tiles (pixels = x*16). The keeper spends its time walking between waypoints, so loose patrols leave exits uncovered at the critical moment.
- Camp ON the exit, not near it. Keep waypoints tight (3 tiles apart or less) and use dwell so the keeper stays put.
- Sweeping patrols that cross the floor mostly pass under the thief and rarely see them.
- Keeper vision is limited, horizontal and per floor. A keeper on the ground cannot see or catch a thief on the upper floor.
- Use skepticism 2 when the keeper is camped on a chokepoint, because decoys only drag it away.
- Weigh protectRelic against exit-guarding. protectRelic only helps if the keeper arrives first, and it pulls him away from the exits.
- After each loss, ask who reached the key spot first and when, and measure the gap between keeper and exit at the escape moment. Fix the position, not the details.
- With two exits, find the one the thief can reach without passing the keeper, and guard that one. A window exit on the upper floor needs an upper-floor keeper.
- Ground waypoints at a door are useless against a window escape. A ground patrol never meets a thief running along the upper floor.
- Pick the post that also covers the other exit. The stair top near the window lies on the route down to the door, so one upper post covers both.
- Do not detour. The first waypoint sets where the keeper walks first, so make it the final post. Wasted early walking, such as going to the far door first, arrives too late.
- Estimate arrival: keeper distance to the nearest stairs, divided by 60 px/s, plus the climb, must be less than the thief's round trip, which was about 10 s. Choose the post reachable in time.
- Use dwell 3–4 at a post, with 2 waypoints a few tiles apart that span the window and the stair top. This stops the keeper from walking away from the post.
- Keep protectRelic false when the exits are far from the vault, because the thief takes the emerald before the keeper arrives.
