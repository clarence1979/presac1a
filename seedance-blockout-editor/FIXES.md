# Fixes and improvements (16 Nov 2026)

Tested against `sirioberati/seedance-blockout-editor` at commit `da359cd` (15 Nov 2026), with paid calls and the network switched off (`TEIN_SEND=0 TEIN_NETWORK=0`).

Run the new regression test with `npm run test:editor`. It passes on this copy. On the original code it fails 9 of its 14 checks.

## Round 3: Generate from the web address, with no helper

**Generate works from the hosted link (`generate-web.js`).** When the helper cannot be reached, Generate and Generations open an in-page panel instead of being greyed out.
- **Step 1, Replicate token.** Paste it once. With **Remember me** it is kept in this browser (localStorage); without it, it is forgotten when the tab closes (sessionStorage). Test, Change and Remove sit next to it. It only ever goes to Replicate.
- **Step 2, Describe the video.** Type a line about the look, or use the chips. The prompt is written by the same writer the helper uses (`prompt-simple.js`, now shared), from the scenes, the notes and the project files, and can be edited.
- **Step 3, Record the blockout.** The page records it itself: the project page runs in a frame in render mode, every frame is drawn with `renderAt` and encoded to H.264 MP4 with the browser's video encoder and `vendor/mp4-muxer.mjs` (MIT). It is the same 1280x720 at 24 fps as the helper's render, and kept under 5.7 MB. The recording shows live, with a progress bar and the time left.
  - It is reused after a reload, but only while it still matches the camera, the look and the people. If the camera changed, the panel says so and asks for a new recording.
- **Step 4, Send.** Pick 480p, 720p or 1080p and sound on or off. The blockout and the request go to Seedance 2.5 on your Replicate account through the relay.
  - Progress shows under the picture: upload, start, Seedance making it (with its status and the time so far), bring it back.
  - **Stop it** cancels the job.
  - If the page is closed or reloaded while Seedance works, the job is picked up again when Generate is reopened.
- **Your videos.** The finished video is fetched back at once (Replicate deletes it after an hour) and kept in this browser, with its prompt. Download or Delete (Delete asks first).
- **Greyed out until ready.** Send stays greyed until there is a token, a recording and a prompt, and the take is 4 to 30 s. A click on it says what is missing. Wrong or refused tokens, missing credit and failed jobs are explained in plain words, with whether anything was charged.
- **The rest of the editor.** Settings shows the browser's token in web mode. The ? help for Generate, Generations and Settings describes the web mode. The editor stops drawing its own views while the panel covers it (`ED_PAUSE`), which leaves more of the computer for the recording.

**The relay (`relay/worker.js`, deployed as seedance-relay.clarence17.workers.dev).** Replicate's API does not answer web pages directly, so the page talks to it through this small Cloudflare Worker.
- It answers only the editor's own pages (materials.teachingtools.dev, *.teachingtools.dev, clarence1979.github.io and localhost). Other sites get 403.
- It passes on only five calls: account (test), files (upload), Seedance 2.5 predictions (start), prediction status, and cancel. It also fetches Replicate download links back.
- It forwards the visitor's own token and stores nothing. Request logging is switched off.

`npm run test:web` checks the relay and the whole page flow against stand-ins (29 checks, no real call, no cost).

## Round 2: a clearer layout, ? help everywhere, and Replicate

**Layout (`ui-guide.js`, mounted by `editor.js`).** The top bar is now two tidy rows.
- Row 1 holds the project and the things you do with it: Back, Undo/Redo, Generations, File, Panel, Help, Settings, Generate.
- Row 2 holds the tools, grouped under small names: Camera (Tool, Set key, Animate, Keys, Moves, Track subject), Shot (Split here, Zoom in, Reset zoom) and Screen (Layout, View). The group names hide on screens narrower than 1360 px so everything still fits in two rows at 1280 px.
- Icon-only menus now have words: Tool, Keys, View, File, Generations, Panel.
- The side panel tabs show their names (Camera, Scenes, Speed, Layers) under the icons.
- Plainer names: "3D view" (was "Editor: 3D"), "Plan (from above)" (was "Editor: Plan"), "Your keys" (was the "Camera" track), "Zoom in" (was "Zoom into frame").
- A Help ▾ menu holds the ? marks switch, the keyboard shortcuts and the tour.
- Fixed: the View menu opened off the right edge of the screen. Menus now open to the left when they would not fit.
- Fixed: the Tein button stretched to fill empty space (the editor treats any styled span as a spacer).

**? marks.** A small ? sits on the corner of every main control: 20 in the top bar, the three views, the four panel tabs, the play controls, Speed / timing, + Note, Assist, Fix notes, Fit 30 s, timeline zoom, the timeline mode, and every track. The panel's own "i" marks became ? marks too.
- Clicking a ? opens a pop-up below the control (never over it). It says what the control is, how to use it in a few steps, and its keyboard shortcut. Clicking the ? does not use the control.
- Esc closes the pop-up and puts focus back on the ?. The marks work with Tab, Enter and Space.
- The marks can be switched off under Help ▾. The choice is kept in this browser.

**Greyed out when they cannot work.** Generate, Generations, Fix notes and the Claude helpers in Assist need the helper program. When it cannot be reached they are greyed out, and a click explains why and what to do. On the hosted copy that means: download it and run `npm start`. They come back by themselves when the helper starts. Autosave also says plainly that the hosted copy keeps your changes in the browser.

**Replicate.** Seedance 2.5 can now be made through `bytedance/seedance-2.5` on Replicate, as well as through Tein.
- Settings → Replicate account: paste a token (`r8_…`) and tick **Remember me on this computer** to keep it (macOS Keychain, or a private file with mode 600). Unticked, the helper forgets it when it stops. Test, Replace and Remove are there too. The page only ever sees the last four characters.
- Generate → Check it and send has a **Make it with Tein / Make it with Replicate** choice. With Replicate:
  - The video comes back at 720p, final. There is no draft or Finalize step for a Replicate video.
  - Replicate charges your account at its own price.
  - The editor's @Video1 / @image1 / @audio1 tags become [Video1] / [Image1] / [Audio1] when sent.
  - "Exactly what is sent" shows the Replicate request.
- The helper uploads the blockout (and any reference pictures or sound) to Replicate's file store, starts the prediction, and polls it. It never pays twice for the same request.
- `npm run test:replicate` checks the whole route against a local stand-in for Replicate: no real call, no cost.

## Data loss and lost edits (editor.js)

1. **Undo after the first edit wiped the project on disk.** When a project opens, its `editor-project.json` arrives a moment after the editor has drawn the empty camera. The undo history kept that empty state as its starting point. So the first Ctrl+Z after any edit went back to "no project": all the cuts were gone, and speed and focus went back to their defaults. Autosave then wrote that empty state to `projects/<id>/editor-project.json`. On Midnight Courier 2 this removed all 19 cuts and 3,587 lines of the file. *Fix:* the undo history starts again once the file is loaded (`resetHistory()`).
2. **Two saves could overlap and reload the page.** Autosave runs every 5 s. If a save was still waiting for an answer, the next one was sent with the old file time. The helper refused it as stale (409), and the page reloaded with "The shots were changed by a fix or rebuild", losing the newest edits. *Fix:* only one save runs at a time. A change made during a save is sent straight after it, with the new file time.
3. **Edits made while the project was loading were overwritten.** A key set in the first seconds after opening was replaced by the file when it arrived. *Fix:* until the file has loaded, the editor holds input behind an "Opening the project…" cover (it shows after 0.4 s, so a fast load does not flash it).
4. **A save that failed was dropped.** A save refused for any reason other than 409 (or sent while the helper was not running) was never tried again, and nothing told the user. *Fix:* the save is tried again on the next tick. The user is told once ("The local helper is not answering…") and sees "Saved" when it works again.
5. **Leaving the page could cancel the last save.** Back, the logo and the Build pill started a save and then left at once. A save over 60 kB is not a keepalive request, so the browser cancelled it. *Fix:* these now wait for the save, for at most 2 s.

## Prompt (bridge.mjs)

6. **The simple prompt said "natural daylight" for night stories.** The light line came only from `prompt-style.json`, which `.gitignore` keeps out of the repo. So Midnight Courier (marked Night, "before the clock strikes twelve") and directions like "Rainy night" were sent as daylight. *Fix:* when there is no `prompt-style.json`, the light line follows the project's `idea.json` (idea and styles) and the draft's directions: night, other times of day, or daylight.
7. **Claude Code's error message became the note text.** When Claude Code was not signed in, "Write what happens" filled the note with "Not logged in · Please run /login". *Fix:* error answers (`is_error`) are treated as errors, and the shot names are used instead, with the reason given.

## The local helper and the page server (bridge.mjs, serve.mjs)

8. **No Host check (DNS rebinding).** Both servers listen on 127.0.0.1, but they answered any Host name. A web page could point its own domain at 127.0.0.1 and read the projects and drafts. *Fix:* both servers answer only `localhost`, `127.0.0.1` and `[::1]`.
9. **A bad `x-based-on` passed the stale check.** A non-numeric value made the comparison `NaN > 50`, which is false, so the save went through. *Fix:* only a matching file time is accepted.
10. **Bad requests returned 500 errors.** Broken JSON, a `null` body, a non-object approval or upgrade, or a wrong key format all returned 500 with a JavaScript TypeError message. *Fix:* these return 400 with a plain message. A sweep of every endpoint now returns no 500s.
11. **Claude Code was not found on Windows, and the messages named the Mac.** The PATH search split on `:` and looked only for `claude`. *Fix:* it uses `path.delimiter` and also looks for `claude.exe` and `claude.cmd`. The messages now say "this computer".

## Console noise and small UI fixes

12. **Every project editor logged a 404** for `projects/<id>/moves.json`. *Fix:* project moves now load through the helper, which answers `[]` when there are none.
13. **Every new project logged a 404** for its camera file on first open. *Fix:* the helper answers 204 (nothing to load yet).
14. **notes.json was written again and again with the same content** (the shot lines saved every few seconds). *Fix:* unchanged notes are not sent.
15. **The Home key did not do what the help said.** The help listed Home as both "start" (timeline) and "whole route" (views), but the key only framed the route. *Fix:* Home goes to the start, Shift+Home frames the whole route, and the help says so.
16. **Cut times overlapped on the Shots row** when cuts were close together (11.00s and 11.70s printed over each other). *Fix:* a label shows only where it fits before the next cut. Every cut keeps its line and tooltip, and a selected cut shows its time.

## Left as they were (content, not code)

- `npm run check:street-pov` fails on the shipped Street POV camera keys (`editor-project.json` in the root). The camera turns up to 13° per frame in the first second, against a 4° limit. Without those keys (`PROJECT=none node check.mjs`) the check passes. This looks like an authoring choice (a fast snap at the start), so the keys are unchanged.
- `demo/demo.html` asks for `demo/seedance-street-pov.mp4`, which `.gitignore` excludes. This is a page for making the demo reel only.
