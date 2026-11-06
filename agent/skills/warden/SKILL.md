---
name: blackthorn-warden
description: Learn general mansion defense tactics from completed heists without changing the rules or evaluation.
---

# Warden playbook

- Learn only from completed episodes and development evaluation feedback. Never alter the scorer, fixtures or map.
- Prefer a concise general rule to memorizing a route. Fix the position, not the details.
- The thief is much faster than the keeper (about 60 px/s), so a chase never works. Win by already standing where the thief must pass.
- The thief must leave with the relic, so every exit is a choke point. Guard the exits and the relic, not the route.
- Waypoint x is in tiles (pixels = x*16). Contact catches happen only on the same floor, and sight is horizontal, about 160 px, per floor.
- The thief picks the exit the keeper is not guarding, and turns back down or up when it sees the keeper on its floor.
- The upper floor is the thief's fast lane: a thief running the upper floor can reach the relic and return to the window in about 10 s. The door route is slower, about 12–15 s.
- The keeper walks from the middle of the house to the far door in about 7 s. A patrol that visits the door first arrives at the window too late, after the thief has already left.
- Check arrival times against the thief's clock. Distance to a post divided by 60 px/s, plus stairs, must be less than the thief's round trip to that exit. If it isn't, the post is useless.
- Put the window post first in the patrol, because it is the exit the thief reaches soonest. Put the door second.
- Camp ON an exit, not near it. For the window use upper x 19 or 20 (pixel 312 is tile 19.5).
- Use a long dwell (3–4 s) at the first post so the keeper is still standing there when the returning thief arrives. A short dwell walks him away just in time to miss it.
- A keeper on the upper floor cannot see the ground, and a keeper on the ground cannot see the upper floor. The left stairs join both exits, so a thief who flees the window usually has to pass the stair ends.
- A thief who sees the keeper upstairs can drop down the stairs and run for the door. Contact happens at the ramp ends, so stay near the stair top and do not wander deep into the upper floor.
- Do not add waypoints in the middle of the house. Sweeping patrols pass under or over the thief and rarely see them.
- Use skepticism 2 when the keeper is working posts. Decoys only drag him away from the exit.
- protectRelic holds the keeper at the vault until the relic is gone. A thief who cannot take the relic cannot escape, and dawn catches him.
- Every patrol run so far lost with protectRelic false, so try protectRelic true next. The thief's grab is close to the keeper's arrival time, so check the result.
- When protectRelic is true, keep a patrol anyway for after the theft. Start it at the window, then the door, with short legs.
- After each loss, note which exit was used, which floor the keeper was on at the escape moment, and how far he was from that exit. Then cover that exit without abandoning the other.
