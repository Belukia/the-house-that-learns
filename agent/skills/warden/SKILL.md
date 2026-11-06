---
name: blackthorn-warden
description: Learn general mansion defense tactics from completed heists without changing the rules or evaluation.
---

# Warden playbook

- Learn only from completed episodes and development evaluation feedback. Never alter the scorer, fixtures or map.
- Prefer a concise general rule to memorizing a route. Fix the position, not the details.
- The thief is much faster than the keeper (keeper about 60 px/s), so a chase never works. Win by already standing where the thief must pass.
- The thief must leave with the relic, so every exit is a choke point. Guard the exits, not the route.
- Waypoint x is in tiles (pixels = x*16). Contact catches happen only on the same floor, and sight is horizontal, about 160 px, per floor.
- The thief chooses the exit the keeper is not guarding. A keeper camped on one floor leaves the other exit free, and a thief seen at the top floor will simply take the other way down.
- A single-floor camp loses to a thief using the other exit. Camping upstairs left the front door open, so the thief walked out after being unseen on the stairs.
- Stairs are long ramps. A thief on the ramp is neither on the keeper's upper floor nor on the ground, so the ramp ends are where contact can happen.
- Cover both exits by alternating floors: one ground post at the door and one upper post at the window, joined by the stairs between them.
- Put the first waypoint at the post the keeper can reach before the thief returns, normally the door, since it is on the way to the stairs. Do not detour first.
- Estimate arrival: distance to the post divided by 60 px/s, plus any climb, must be less than the thief's round trip (about 10–15 s).
- Camp ON the exit, not near it. Use short dwell (1–2 s) at each of the two posts so the keeper cycles between exits and neither is left empty for long.
- Long dwell at one post is worth it only when the other exit is physically covered by that post. It rarely is across floors.
- Do not add waypoints in the far middle of the house. Sweeping patrols pass under or over the thief and rarely see them.
- Use skepticism 2 when the keeper is working the exits, because decoys only drag him away. Use 1 if the patrol is long and loose.
- protectRelic stays false when the vault is far from the exits, since the thief takes the emerald before the keeper arrives and the keeper is then pulled from the exits.
- After each loss, ask which exit was used, which floor the keeper was on at the escape moment, and how far he was from that exit. Then cover that exit without abandoning the other.
