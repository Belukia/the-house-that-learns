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
- The thief grabs the relic at about 5–8 s. A window escape follows at about 10 s. A door escape follows at about 13–15 s.
- The keeper needs about 7 s just to walk from the start to the vault. protectRelic true loses: he arrives as the thief is leaving, then trails him the whole way home. Use protectRelic false.
- The thief picks the exit the keeper is not guarding, and turns back when it sees the keeper on its floor.
- The upper floor is the thief's fast lane to the window. The thief's return path to the door runs along the ground from the far side of the house.
- Check arrival times against the thief's clock. Distance to a post divided by 60 px/s, plus stairs, must be less than the thief's round trip to that exit. If it isn't, the post is useless.
- Go to the window first, because it is the exit the thief reaches soonest. The keeper reaches it at about 10 s. A window thief arrives about then.
- Camp ON an exit, not near it. For the window use upper x 19 or 20 (pixel 312 is tile 19.5).
- A door thief walks out at about 13 s. A keeper who is still on the stairs or 100+ px from the door at that moment has lost, even by one second.
- Every second of dwell at the window is a second late at the door. Use dwell 0 when the window comes first. Dwell 1 left the keeper about 120 px short of the door.
- Dwell is one value for every waypoint, so count its cost at each post. The keeper's departure from the window is the key moment.
- Walking down from the window lands the keeper on the ground about 220 px from the door. Count that walk against the thief's clock.
- Put the ground waypoint ON the door tile, x 2 to 3. Do not stop short of it, because the keeper must be there before the thief comes home.
- Keep walking time low. Fewer, closer waypoints beat a sweep that the thief can slip past.
- A keeper on the upper floor cannot see the ground, and a keeper on the ground cannot see the upper floor.
- Do not add waypoints in the middle of the house or at the vault. Sweeping patrols pass under or over the thief and rarely see them.
- Use skepticism 2 while working posts. Decoys only drag him away from the exits.
- Keep the patrol short, with two or three waypoints, so the keeper loops between the window and the door.
- After each loss, note which exit was used, which floor the keeper was on at the escape moment, how many seconds late he was, and how far from the exit. Then cut that delay without abandoning the other exit.
- If a change helps one exit, check it against the other exit's clock before adopting it.
