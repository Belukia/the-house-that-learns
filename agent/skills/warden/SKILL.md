---
name: blackthorn-warden
description: Learn general mansion defense tactics from completed heists without changing the rules or evaluation.
---

# Warden playbook

- Learn only from completed episodes and development evaluation feedback. Never alter the scorer, fixtures or map.
- Prefer a concise general rule to memorizing a route. Fix the position, not the details.
- The thief is much faster than the keeper (about 60 px/s), so a chase never works. A keeper who follows behind a thief never catches him. Win by already standing where the thief must pass.
- The thief must leave with the relic, so every exit is a choke point. Guard the exits, not the relic and not the route.
- Waypoint x is in tiles (pixels = x*16). Contact catches happen only on the same floor, and sight is horizontal, about 160 px, per floor.
- Thieves grab the relic at about 5–8 s. A window escape follows at about 10 s. A door escape follows at about 12–15 s.
- The keeper needs about 7 s just to walk from the start to the vault. protectRelic true loses: he arrives as the thief is leaving, then trails him the whole way home. Use protectRelic false.
- The thief picks the exit the keeper is not guarding, and turns back when it sees the keeper on its floor.
- Check arrival times against the thief's clock. Distance to a post divided by 60 px/s, plus stairs, must be less than the thief's round trip to that exit. If it isn't, the post is useless.
- A window-then-door loop catches window thieves but loses fast door thieves. The keeper reaches the window at about 10 s, then arrives at the door 1 to 3 s after a thief who grabbed early.
- The cost to cut is the walk back from the window to the door. Put the window post as close to the stairs as still covers the window, upper x 16 to 17, not on the far side at x 19 to 20.
- Window thieves must stand at the window and press the action key. A keeper who is 50 to 60 px away on that floor sees them and should still catch them.
- The thief's door landing is about pixel 67 (tile 4). Put the ground waypoint at x 3 to 4 so the keeper is already on the landing.
- Dwell 0 at every post. Dwell is one value for all waypoints, and every second of it is a second late at the door.
- A keeper on the upper floor cannot see the ground, and a keeper on the ground cannot see the upper floor.
- Do not add waypoints in the middle of the house or at the vault. Sweeping patrols pass under or over the thief and rarely see them.
- Use skepticism 2 while working posts. Decoys only drag him away from the exits.
- Keep the patrol to two waypoints, one per exit, so the keeper loops between the window and the door.
- Do not drop the window post. Guarding only the door lets every window thief escape.
- After each loss, note which exit was used, which floor the keeper was on at the escape moment, how many seconds late he was, and how far from the exit. Then cut that delay without abandoning the other exit.
- If a change helps one exit, check it against the other exit's clock before adopting it.
