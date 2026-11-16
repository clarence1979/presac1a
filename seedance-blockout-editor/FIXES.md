# Fixes and improvements (16 Nov 2026)

Tested against `sirioberati/seedance-blockout-editor` at commit `da359cd` (15 Nov 2026), with paid calls and the network switched off (`TEIN_SEND=0 TEIN_NETWORK=0`).

Run the new regression test with `npm run test:editor`. It passes on this copy. On the original code it fails 9 of its 14 checks.

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
