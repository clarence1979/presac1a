<p align="center"><a href="https://tein.ai"><picture><source media="(prefers-color-scheme: dark)" srcset="brand/tein-logo-dark.svg"><img src="brand/tein-logo-light.svg" alt="Tein" height="44"></picture></a></p>

**New to Tein?** [Join Tein](https://tein.ai) to get your API key. **Questions or want to show your work?** [Join the community](https://www.skool.com/publicai).

# Seedance 3D Blockout Editor

Direct a 30-second three.js take with flat placeholder props, then use it as the camera reference for **Seedance 2.5** (through the Tein API). You plan the shots, the camera and the timing yourself, the model makes the pictures.

<p align="center"><img src="docs/media/chase-before-after.gif" alt="Left: the blockout sketch. Right: the real Seedance video made from it. A night chase with several cameras." width="900"></p>
<p align="center"><sub>Left: the blockout the editor sends. Right: the real Seedance video made from it. <a href="docs/media/chase-blockout-vs-seedance.mp4">Full quality (MP4)</a></sub></p>

<p align="center"><img src="docs/media/city-before-after.gif" alt="Left: the Street POV blockout. Right: the real Seedance video made from it." width="900"></p>
<p align="center"><sub>Same idea, first person: a camera down a skyscraper to the street. <a href="docs/media/city-blockout-vs-seedance.mp4">Full quality (MP4)</a></sub></p>

<p align="center"><img src="docs/media/farm-example.gif" alt="Top: the Seedance video. Bottom: the blockout in the editor that it follows." width="400"></p>
<p align="center"><sub>Another example. Top: the Seedance video. Bottom: the editor it follows. <a href="docs/media/farm-example.mp4">Full quality</a></sub></p>

**Jump to:** [What it is](#what-it-is) · [Quick start](#quick-start) · [See it](#see-it) · [Features](#features) · [Notes and Generate](#notes-prompt-and-generate) · [License](#license)

---

## What it is

It has three parts:

1. **The editor** (`index.html`): a timeline, a 3D view, a plan view and the final-shot view. Drag camera keys, add cuts and slow motion, write notes on any seconds of the film.
2. **Shot sheets** (`tools/previs/`): describe a story as a small JSON file (one line per shot, 21 camera presets) and build it with one command.
3. **The local helper** (`bridge.mjs`): saves projects and drafts on your computer, renders the blockout video, and talks to Tein when you press Generate.

---

## Quick start

You need **Node 20+**, **Chrome or Chromium** (used for rendering) and **ffmpeg**.

```bash
npm install
npm start            # serves the editor on http://localhost:5811 and starts the helper on :5812
```

Open http://localhost:5811. Pick a story to start from (Midnight Courier is a good one) and press **Edit**.

Both servers listen on `127.0.0.1` only. Nothing is reachable from other computers.

---

## See it

### 1. The editor

A 3D view, a floor plan, the final-shot view and a timeline of shots, notes and speed.

<img src="docs/media/editor.png" alt="The editor: 3D view, final shot, plan view, timeline with shots and notes">

Press Play and the final-shot view (top right) shows what the camera sees, shot by shot, while the plan view traces the path.

<img src="docs/media/editor-playing.gif" alt="The editor playing the chase: final-shot view with the courier, the SUV and flying fruit, plan view with the camera path" width="720">

**3D view and floor plan.** The same moment in two views. The 3D view shows the camera, its cone and the path through the city. The floor plan shows that path from above, with a key at every point you can drag.

<img src="docs/media/editor-3d-plan.gif" alt="The 3D view, the final-shot view and the floor plan moving together while the timeline plays" width="900">

---

### 2. Before and after

**What Seedance gets.** Left: the blockout as you see it. Right: the sketch look the helper sends as the reference. The model keeps the camera, the framing and the timing, and replaces the placeholders with real people, vehicles and places.

<img src="docs/media/before-after.gif" alt="Blockout look on the left, sketch reference look on the right, same shots">

**Real results.** Top row: what the editor gave Seedance (a flat grey blockout, a sketch, a depth mask). Bottom row: what Seedance made from each one.

<img src="docs/media/before-after-seedance.gif" alt="Three reference looks (grey blockout, sketch, depth) above the Seedance videos made from them" width="800">

**Stand-ins become people.** A stand-in figure in the blockout becomes a real person doing the action you described.

<img src="docs/media/before-after-pose.gif" alt="Blockout stand-ins on the left, the Seedance result on the right" width="640">

---

### 3. Many cameras, one city

**The chase.** The same blockout city with a new camera every shot: tracking behind the scooter, a close side shot, a front drift, a high crane. Left: the sketch reference. Right: the Seedance video made from it.

<img src="docs/media/chase-before-after.gif" alt="Chase blockout sketch on the left, the Seedance video on the right, cutting between several cameras" width="800">

**The aerial finale.** The spiral and pull-back over the blockout city that close the chase.

<img src="docs/media/city-finale.gif" alt="Aerial spiral and pull-back over the blockout city" width="720">

**POV.** First-person and window shots work the same way. Left: the Street POV blockout that ships with the editor. Right: the Seedance video made from it.

<img src="docs/media/city-before-after.gif" alt="Street POV blockout on the left, the Seedance video made from it on the right" width="800">

---

### 4. One sheet instead of a video

You can send Seedance a storyboard sheet of key frames in story order (see "Send frames instead of a video" below).

<img src="docs/media/contact-sheet.png" alt="Contact sheet of twelve numbered key frames, with titles and times" width="720">

---

### 5. First run

A welcome screen asks for your Tein key (kept on your computer only), then a short tour shows where everything is.

<img src="docs/media/welcome.png" alt="Welcome screen with the Tein key field and Join links" width="49%"> <img src="docs/media/tour1.png" alt="The editor tour" width="49%">

---

## Features

### Plan the camera

| Feature | What it does |
| --- | --- |
| 3D view | Fly around the blockout city. The camera, its view cone and its path are drawn in the scene. |
| Floor plan | The same path seen from above. Drag a key to move the camera. |
| Final shot | What the camera sees right now, with lens angle, focus and depth of field. |
| Shots and cuts | Hard cuts on the timeline, 21 camera presets, slow motion and speed blocks. |
| Track subject (the selector) | Press it, then click any subject in any view or in the Scenes list. The camera keeps that subject in frame from the playhead on. |

### Agentic features

_these run [Claude Code](https://claude.com/claude-code) on your computer; the rest of the editor works without it_

| Feature | What it does |
| --- | --- |
| Notes | Drag across the seconds a note is about. Three kinds, one tab each: Camera fixes, What happens, Camera description. |
| Camera fixes | Write what to change ("closer", "lower", "stay on him"). Press Fix and Claude edits the camera keys, then shows a before and after still for every change. |
| What happens | What must happen in the video, in plain words. It goes into the prompt. |
| Camera description | A lens, angle and height line for every shot, made from the camera itself. It goes into the prompt. |
| Review my shots | Claude looks at a picture of every shot and adds Camera fixes for any problems it finds. |
| Write what happens | Claude writes a "What happens" note for every shot that has none. |
| Fix history and undo | Every fix is kept with its before and after stills. Undo puts the camera back. |
| Preview the prompt | Shows everything that goes into the prompt and checks it for conflicts. |
| Check pacing | Finds shots that are too short or too long. |
| Seedance skill | Every prompt is written through the bundled Seedance camera skill (`skills/camera-control/`). |
| Frames sheet | One picture with a key frame of every shot, to send instead of a video. |

### Make the video

| Feature | What it does |
| --- | --- |
| Generate | Sends the blockout video (or the frames sheet) and the prompt to Seedance 2.5 through Tein. It asks first and shows the price on the button. |
| Welcome and tour | First run asks for your Tein key, then a one-minute tour. Assist, then Take the tour, runs it again. |

### Features in action

A picture of each one.

| Feature | See it | What it does |
| --- | --- | --- |
| **3D view** | <img src="docs/media/features/3d-view.gif" width="360" alt="3D view"> | Fly around the scene. The camera, its view cone and its path are drawn in it. |
| **Floor plan** | <img src="docs/media/features/floor-plan.gif" width="360" alt="Floor plan"> | The same path from above. Drag a key to move the camera. |
| **Final shot** | <img src="docs/media/features/final-shot.gif" width="360" alt="Final shot"> | What the camera sees right now, shot by shot. |
| **Shots, cuts and speed** | <img src="docs/media/features/timeline.gif" width="360" alt="Shots, cuts and speed"> | Hard cuts, slow motion and the playhead on one timeline. |
| **Track subject** | <img src="docs/media/features/track-subject.png" width="360" alt="Track subject"> | Press the button, then click a person or prop. The camera keeps it in frame. |
| **Notes** | <img src="docs/media/features/notes-tabs.png" width="360" alt="Notes"> | Three kinds of notes: Camera fixes, What happens, Camera description. |
| **Assist menu** | <img src="docs/media/features/assist-menu.png" width="360" alt="Assist menu"> | Review my shots, Write what happens, Preview the prompt, Check pacing, Take the tour, Export frames sheet, Fix history. |
| **Fix history and undo** | <img src="docs/media/features/fix-history.png" width="360" alt="Fix history and undo"> | Every fix with its before and after pictures. Undo the last one. |
| **Preview the prompt** | <img src="docs/media/features/prompt-preview.png" width="360" alt="Preview the prompt"> | Everything that goes into the prompt, checked for conflicts. |
| **Check pacing** | <img src="docs/media/features/pacing.png" width="360" alt="Check pacing"> | Finds shots that are too short or too long and can add a Camera fix. |
| **Frames sheet** | <img src="docs/media/features/frames-sheet.png" width="360" alt="Frames sheet"> | One picture with a key frame of every shot, to send instead of a video. |

### Questions and answers

<details><summary>What is a note, and which kind do I need?</summary>

A note is a short sentence tied to some seconds of the film. Use *Camera fixes* to change the camera, *What happens* for the action, and *Camera description* when you want the lens line written for you.

</details>

<details><summary>How do Camera fixes work?</summary>

You write the note, press Fix, and Claude changes the camera keys to match. You see a before and after still for each change. If you do not like one, open Assist, then Fix history, and undo it.

</details>

<details><summary>How is the camera description made?</summary>

From the camera itself: the lens angle, the height and the move in that shot become a short line, so it always matches what you set. It is not a guess.

</details>

<details><summary>What does Track subject do?</summary>

It keeps a person or a prop in frame. Press it, click the subject, and from the playhead on the camera aims at it.

</details>

<details><summary>What does Review my shots do?</summary>

Claude looks at one picture of every shot and adds Camera fixes where it sees a problem. Nothing changes until you press Fix.

</details>

<details><summary>Does any of this cost money?</summary>

Only Generate does. Claude Code runs on your own account. Run `TEIN_SEND=0 npm start` and the helper refuses every paid call.

</details>

<details><summary>Where does my Tein key go?</summary>

To the macOS Keychain, or to a private file in `~/.config/street-pov`. It is never written into the project folder.

</details>

---

## Notes, prompt and Generate

- **Notes** (below the timeline). *Camera fixes* are things to change in the camera. *What happens* is what must happen in the video. *Camera description* is an automatic lens/angle/height line for every shot. "What happens" and "Camera description" go into the video prompt.
- **✦ Fix notes** and **✦ Assist** (review the shots, write what happens, preview the prompt, check pacing, fix history) run [Claude Code](https://claude.com/claude-code) on your computer. They need the `claude` command to be installed and signed in. Everything else works without it.
- **Generate** sends the blockout video and the prompt to Tein. **This costs money on your Tein account.** Create an inference key at tein.ai/dashboard/keys and paste it under Connect Tein in the editor. The key is kept in the macOS Keychain, or in `~/.config/street-pov/tein-key` (mode 600) on other systems. It is never written into this folder.
- To try everything without paying: `TEIN_SEND=0 npm start`. The helper then refuses to make any paid call.

## The Seedance 2.5 skill (every prompt goes through it)

The prompt for every draft is written by Claude Code **through the Seedance 2.5 skill that ships in this repo** (`skills/camera-control/`: `SKILL.md`, its `references/` and the `docs/` it points to). The skill's six prompt blocks and locked sentences are used word for word. The writer also reads your project's `cast.json` (what each subject looks like), your **What happens** notes (required actions at their seconds) and your **Camera description** lines.

- Claude Code has to be installed and signed in. Without it Generate stops with a clear message instead of sending a prompt that did not go through the skill.
- `PROMPT_WRITER=simple npm start` switches to the plain built-in prompt builder. It is for tests only and does not use the skill.
- To use your own copy of the skill, copy `local-config.example.json` to `local-config.json` and set the two paths.

## Send frames instead of a video

On the Generate draft page, **Send Seedance** can be **The blockout video** (default) or **A frames sheet**. A frames sheet is one picture of up to 16 key frames in story order, each with its number, camera type and time. Seedance gets the shots and their order and invents the motion between them. The prompt is written for frames (the sheet is `@image1`; your other pictures start at `@image2`).

You can also just export the sheet: **Assist → Export frames sheet** downloads it, or run `node tools/frames-sheet.mjs <project> out.png --look sketch --max 12`.

## The tour

The first time you open the editor it walks you through each part. **Assist → Take the tour** opens it again (add `?notour=1` to the URL to switch it off).

## Settings you may want

| What | How |
|---|---|
| Another page port / helper port | `PORT=5900 BRIDGE_PORT=5822 npm start` |
| Chrome in an unusual place | `CHROME_PATH=/path/to/chrome` |
| A Seedance prompt guide for the prompt writer (optional) | copy `local-config.example.json` to `local-config.json` and fill in the two paths |

## Make a story

Write a shot sheet in `tools/previs/sheets/<name>.json` and run:

```bash
node tools/previs/build.mjs tools/previs/sheets/<name>.json
node tools/previs/check-sheet.mjs projects/<name>
```

`tools/previs/README.md` explains the format, the presets and the world files. Run `npm test` to check the example sheet. `render.mjs` makes still pictures or the full blockout video from any project (`node render.mjs --help`).

## Your data stays yours

Drafts, generated pictures and videos, your notes and fix history are written to `drafts/` and `projects/<name>/` on your computer. They are listed in `.gitignore`, so they are not committed by accident. The example projects under `projects/` are included so you can start from them.

## Known limits

- The live editor preview can show the figure jittering during playback in the Depth look. Exports and renders are not affected.
- Rendering uses a headless browser, so a clean install needs Chrome or Chromium.
- `npm run check:street-pov` (the original one-take example) currently reports a camera turn above the 4 degrees per frame limit in a few frames. The shot-sheet example passes (`npm test`).

## License

Apache License 2.0. Copyright 2026 Sirio Berati. See `LICENSE` and `NOTICE`.

Built on the Tein API. "Tein" and its logo are trademarks of their owner; see `TEIN-BRANDING.md`.
