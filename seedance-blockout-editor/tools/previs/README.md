# tools/previs: build a 30-second blockout story from a shot sheet

The previs we admire is flat boxes and spheres; the camera work and the cuts carry it. So a story is two things kept apart:

- **the world**: actors, their paths over time, events (the SUV hits the stall at 12.6 s). It does not change when you change the cuts. One JS file per world in `worlds/`.
- **the cameras**: a small JSON **shot sheet**. Each shot = a start time, a camera preset, a subject, and a few optional numbers.

```
node tools/previs/build.mjs tools/previs/sheets/<id>.json      # about 2 s: writes projects/<id>/
node tools/previs/check-sheet.mjs projects/<id>                # about 1 s: checks + contact sheets in out/<id>-stills/
```
Then open `http://localhost:5811/projects/<id>/index.html?editor=1&project=<id>` (the editor loads `editor-project.json` the first time it opens the project).

## Build a story in 5 minutes (worked example)

1. Copy `sheets/midnight-courier-2.json` to `sheets/<new-id>.json`. Change `id` (folder name, lower case with dashes), `name`, `logline`.
2. List the shots. Cuts come from the starts: shot 1 starts at 0, each next start is the previous shot's cut.
```json
{ "id": "courier-short", "name": "Courier short", "world": "midnight-courier", "length": 30,
  "speed": [{ "t": 16.1, "dur": 2.0, "speed": 0.3, "in": 0.35, "out": 0.35 }],
  "shots": [
    { "start": 0,    "preset": "lockedWide",   "subject": "Bike", "look": "Clock tower", "name": "She waits, 11:59" },
    { "start": 5.5,  "preset": "lowChase",     "subject": "Bike", "track": true },
    { "start": 12.1, "preset": "sideTracking", "subject": "Bike", "track": true, "name": "The SUV hits the stall" },
    { "start": 15.1, "preset": "frontWide",    "subject": "Bike", "params": { "ahead0": 6, "fov": 58 } },
    { "start": 18.6, "preset": "topDown",      "subject": "SUV",  "params": { "h0": 18, "h1": 15.5 } },
    { "start": 22.0, "preset": "fpv",          "subject": "Bike" },
    { "start": 28.0, "preset": "aerialPullback", "subject": "Bike", "look": "Clock tower", "focus": "Clock tower" } ] }
```
3. `node tools/previs/build.mjs tools/previs/sheets/courier-short.json`
4. `node tools/previs/check-sheet.mjs projects/courier-short`. Every FAIL line says the shot, the time and why. Look at `out/courier-short-stills/contact-shots.png` (each shot's middle, normal | depth) and `contact-seconds.png` (one frame per second).
5. Fix a shot by changing its preset, its start or a param, then build + check again (about 4 s together).

Times are **playback seconds** of the 30.00 s take. Inside the speed block (slow motion) story time runs slower; the generator converts.

## Shot fields
| field | meaning |
|---|---|
| `start` | playback second the shot starts (the cut). Shot 1 = 0. |
| `preset` | one of the presets below |
| `subject` | what the camera is about (must be in the world's `ENTS`, below). The check keeps it in frame and big enough. |
| `look` | optional second thing to keep in frame (lockedWide, aerialPullback, craneHigh, quarterClose lean the aim toward it, `mix` 0..1) |
| `params` | numbers that override the preset's defaults (table below) |
| `track` | `true` or `{subj, ox, oy, sm}`: adds a tracking bar in the editor. ox/oy (frame position of the subject, -1..1) default to where the preset puts it, so tracking keeps the preset's framing. |
| `focus` | default: the subject. A name (`"Clock tower"`) for manual focus on it, or a rack `{ "from": "Package", "to": "Gloves", "at": [0.3, 0.65] }` (0..1 of the shot). `fstop` optional (default 2). |
| `name`, `what` | go into beats.json and the editor's scene list |
| `minSize`, `maxTurn`, `smooth`, `check` | override the check's minimum subject height (fraction of frame), turn limit (deg/frame, default 4), the bake smoothing (s), or switch the framing check off |

Sheet level: `speed` (slow-motion blocks `{t, dur, speed, in, out}`, playback s; they become the editor's Speed block too), `thumb` (playback second for thumb.png), `logline`, `cast`, `sound`, `lines` (else taken from the world's json).

## Presets (and their main params; defaults in `lib/presets.js`)
| preset | what it is | params |
|---|---|---|
| `lockedWide` | fixed lens placed from where the subject is at the shot start | back, side, h, fov, push, mix |
| `faceCloseProfile` | beside the face, lead room ahead of the eyes | dist, side (1 right / -1 left of travel), h, lead, fov |
| `faceCloseFront` | ahead of the face, looking back at it | dist, side, h, fov |
| `overShoulder` | close behind his back, over one shoulder, looking down the road | back, h, side, lead, drop, fov |
| `lowChase` | behind and to one side at wheel height | back, back1, side, h, ahead, fov |
| `craneHigh` | high behind, slow push-in and down | h0, h1, back0, back1, side, mix (to `look`), fov |
| `sideTracking` | wheel height, to one side, looking across | dist, side, h, lead, aimBack, aimSide, fov |
| `frontLowTracking` | handlebar height in front; he comes at the lens | ahead0, ahead1, h, side, aimY, fov |
| `frontWide` | ahead on its line, rising | ahead0, ahead1, h0, h1, rise [u0,u1], side, fov |
| `wormsEye` | lens on the ground, looking up | atU, ahead, side, h, fov |
| `topDown` | straight down | h0, h1, follow (0 fixed .. 1 follows), dx, dz, roll, fov |
| `wheelClose` | mounted beside the front wheel | mount [x,y,z], aim [x,y,z] in the vehicle frame, fov |
| `fpv` | the rider's eyes | mount, aim, fov (no framing check) |
| `aerialSpiral` | round from the front, radius and height growing | R0, R1, H0, H1, ph0, sweep, dir, fov |
| `aerialPullback` | behind the subject on the line to `look`, pulling back and up | D0, D1, h0, h1, mix, until (story s), fov |
| `quarterClose` | a detail from a quarter angle, slow push | dist, ang (deg from front), side, h, push, mix, fov |
| `orbit` | bullet-time orbit (act01) | R, h, ph0, sweep, dir, fov |
| `snorricam` | rigidly on the subject, facing it (act02) | mount, aim, fov |
| `crashZoom` | fixed lens, lens punches in (act03) | back, side, h, fov0, fov1, at, dur |
| `dollyZoom` | moves while the lens keeps the subject the same size (act04) | d0, d1, fov0, h, ang |
| `heroLowArc` | low, arcing from the side to the front (act06) | R, h, ph0, ph1, side, fov |

After any preset, the bake keeps the subject inside 82 % of the frame, the lens 0.25 m above the ground, and pushes it out of any solid box toward the subject. Each shot is sampled a little beyond its cut so the smoothing does not drift at the first frame.

## Subjects in the `midnight-courier` world
Bike, Courier, Face, Package, Gloves, Front wheel, SUV, SUV driver, Clock tower, Helipad. Events (playback s): stall crash 12.6, bridge rises 13.4-17.4, launch 15.6, peak 17.22, SUV nose over the edge 18.8, splash 20.33, tunnel 20.07-24.34, brake 27.28, stop + clock 12:00 at 28.39.

## What is a sheet edit and what still needs code
**Sheet edit only (seconds):** cut times, shot order, any preset, lens, distances, heights, subject, second subject, tracking, focus and racks, slow-motion blocks, names, beats, thumb time.

**Hand-written (a new world file):** a new place (layout of streets, rooms, fields), new actors and their paths over time, new events (crash, jump, explosion), new props beyond `lib/props.js`, lighting per place, and the cast/sound json. Copy `worlds/midnight-courier.js` + `.json` and keep its interface:
- build the scene with `bx/box/put`, `PROPS.*` (building, street, tree, lamp, fence, car, bike, suv, person, bridgeLeaf, tunnel, ramp, helipad, clockTower, hay, barn, silo, particles). People (`PROPS.person` / `mkRig`) must be made while the world is built, before the page builds the pill look.
- define `gy(x, z)` (ground height), `placeActors(t)` (everything that moves, story seconds), `updateWorld(t)` (background traffic), `worldLight(t, camera)` (sun, sky light, shadow box), `SET` / `BGM` (things that move: the looks keep their colours), `FLAT` (flat colours in the depth look), `SUBJ` (editor tracking subjects), `ENTS` (sheet subjects: `{obj, root(t), y, size, frame}` or `{point, size}`).

## Files
- `build.mjs` generator, `check-sheet.mjs` fast check, `sheets/` shot sheets, `worlds/` worlds (`.js` code + `.json` cast/sound/logline)
- `lib/core.js` renderer, materials, pill people (rigs, facing marks, IK), spline/timing helpers; `lib/time.js` speed blocks; `lib/props.js` props; `lib/presets.js` cameras; `lib/shots.js` sheet → shots, guards, bake; `lib/glue.js` the editor contract (camera keys, layers, cuts, speed, tracking, looks, player); `lib/api.js` what build/check ask the page.
- All of it is copied out of `projects/midnight-courier/index.html` (and the props from the aliens page), not rewritten. The generated `index.html` is one page with these pieces in order; do not edit it by hand, rebuild it.
- Safety: both scripts run one headless Chrome on a private local server and block the Tein bridge (port 5812). Nothing is sent anywhere.
