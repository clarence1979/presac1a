# Draft flow: what the agent (the user's own Claude) does

The blockout editor (`index.html?editor=1`) has a "Generate draft" button on the Main view. The page itself never talks to Claude, Seedance or Tein, and it never sees a key. It only writes small files into `drafts/<id>/` through the local bridge (`bridge.mjs`, port 5812) and waits for answer files to appear in the same folder. The agent does the rest in the chat, with the user's own Claude subscription and the user's own Tein account.

Status on 14 Nov 2026: the agent steps below are NOT automated yet. In the page they are placeholders ("Placeholder for testing"): one copies `seedance/prompt.txt` as the prompt, one copies `seedance/street-pov-draft4-neutral.mp4` as the result. A draft made that way contains `DEV-PLACEHOLDER.txt`. Nothing is sent and nothing costs money in that mode.

## The folder

```
drafts/<id>/
  request.json        written by the page (step 2, "Generate prompt")
  prompt.txt          written by the agent (answer to request.json); the page lets the user edit it and saves edits back to this file
  approved.json       written by the page (step 3, after "Send draft (costs money)" and the confirm)
  blockout.mp4        written by the agent (the rendered reference video, step 4)
  result.mp4          written by the agent (the Seedance draft, 480p)
  notes.json          written by the page (review notes: [{ t: playback seconds, text }])
  upgrade.json        written by the page ("Upgrade to 1080p")
  result-1080p.mp4    written by the agent (answer to upgrade.json) or by the bridge (Finalize · 1080p)
  result-4k.mp4       written by the bridge (Finalize · 4K)
  refs.json           written by the page through the bridge: the optional reference pictures and sounds, in tag order (see below)
  refs/               the reference files themselves (refs/woman.jpg, refs/woman.wav, refs/style-place.jpg, refs/gen-c-woman-1.jpg ...)
  gen/                Seedream 5.5 pictures: log.json (every run, its job id, cost and status), the blockout guides sent with them, replaced or removed pictures (kept, never deleted)
  script.json         written by the page: the dialogue, [{ speaker, words, at, note }], at = seconds into the take
  error.txt           written by the agent if a step fails (plain words; the page keeps waiting)
  DEV-PLACEHOLDER.txt only when a placeholder button was used
```

`<id>` looks like `d20261114-171413`. The page polls the folder every 2 seconds and moves on by itself when the next file appears.

## Step A: write the prompt (request.json -> prompt.txt)

The user pastes "Please write the Seedance 2.5 prompt for my draft ..." into the chat.

Read `drafts/<id>/request.json`:

| Field | Meaning |
|---|---|
| `directions.general` | the user's own words: place, people, mood, style |
| `directions.scenes[]` | one entry per scene: `name`, `at` (playback seconds), `subject`, `notes` (may be empty) |
| `look` | `neutral`, `sketch` or `depth`: how the blockout reference video will be rendered |
| `take` | `seconds`, `fps`, `draftResolution` (480p) |
| `project` | the full editor project (camera keys, base keys, speed, tracking, pace, layers), same format as `editor-project.json` |
| `skills.cameraControl` | folder of the camera-control skill to read first |
| `skills.promptAnatomy` | the prompt anatomy document to follow |
| `folder` | absolute path of this draft folder |
| `page` | the page to render: `index.html` (Street POV) or `projects/<id>/index.html` (a project built from an idea) |

Read before writing:
1. The camera-control skill: the camera-control skill folder named under `skills.cameraControl` in the request (optional, see `local-config.example.json`) and its `references/`.
2. The prompt anatomy: the prompt anatomy guide named under `skills.promptAnatomy` in the request (optional) (a second copy is in `previs-templates/open-source-draft/docs/prompt-anatomy.md`).
3. `seedance/prompt.txt` in this project, as an example of a finished prompt for this take.

Write `drafts/<id>/prompt.txt`: plain text, the complete Seedance 2.5 prompt, nothing else in the file. The scene times in the prompt must match `directions.scenes[].at`. Do not send anything.

### References and dialogue (when the folder has refs.json or script.json)

`refs.json` lists the optional references the user added on the Directions step, already in tag order:

```json
[{ "tag": "@image1", "kind": "image", "role": "character", "character": "Woman", "description": "white dress, red scarf", "file": "refs/woman.jpg", "w": 1280, "h": 720 },
 { "tag": "@image2", "kind": "image", "role": "style", "character": "", "file": "refs/style-place.jpg" },
 { "tag": "@audio1", "kind": "audio", "role": "voice", "character": "Woman", "file": "refs/woman.wav", "seconds": 3.0 }]
```

- A picture with `"source": "seedream-5.5"` was made on Tein by the page (see "Reference pictures made with Seedream 5.5" below); treat it like an uploaded one. `role: "scene"` (with `scene` and `at`) is the first look at one scene: write its role line as "@image3 is the first look at the scene <name> at <at> s: the place, light, colours and composition there; ignore anything that contradicts the camera of @video1".
- `@video1` is always the blockout. Use the tags exactly as listed; never renumber them (the bridge sends the files in this order).
- In the 【Reference Asset Roles】 block write one line per tag, saying what to take from it and what to ignore, for example: "@image1 is the look of the woman in the white dress: face, hair and clothing only; ignore its background and lighting." "@image2 is the look of the place: colours, materials, light." "@audio1 is the voice of the woman: timbre and accent only, not the words."
- Use the tag wherever that character appears in the beats ("the woman (@image1) strides over the crosswalk").
- `script.json` holds the dialogue: `[{ "speaker": "Woman", "words": "Morning! Watch out for the bike.", "at": 5.0, "note": "cheerful" }]`. Add a 【Dialogue, exact words】 block near the top with every line, its speaker and its time, and the sentence "The film holds exactly these lines and no other words." Repeat each line in its beat, with the delivery note. Set the sound line to match: speech plus natural sound, no music unless the directions ask for it.
- A line needs about 2.5 words per second before the next line; if one is too long for its gap, say so to the user instead of rushing it.
- Only voices the user has the right to use belong here; the page tells the user this next to the upload.

Limits (checked by the bridge before anything is uploaded): up to 30 pictures (JPG, PNG, WebP, up to 10 MB, at least 300 px a side; shapes outside 0.40 to 2.50 are sent with `auto_fit_images: true`), up to 10 sound clips (MP3, WAV, M4A) of at most 30 s together. The REST call carries them as `reference_image` and `reference_audio` next to `reference_video`; the MCP call as `images` and `audios` next to `videos`. `GET /api/drafts/<id>/dry-run` shows the exact request a send would make, with the key redacted, without sending anything.

## Reference pictures made with Seedream 5.5 (the page does this itself)

On the Directions step every character tile and every scene has **Generate · $0.02**: one click makes a real-photo reference picture with Seedream 5.5 through the user's Tein key (no key saved: the button opens Connect Tein). The page writes the prompt from the tile's description (filled in automatically from `projects/<id>/cast.json`, editable), the description at the top and the look; the blockout crop of that subject (or the frame at that scene's time) always goes with it as the image-to-image guide, and the prompt says the other blockout shapes are placeholders. The picture lands in `refs/` and `refs.json` as the next `@imageN` with `source: "seedream-5.5"`, `prompt`, `seed: null` (Seedream 5.5 on Tein takes no seed), `cost`, `job`, `via`, `guide`. "Try again" replaces it (the old file goes to `gen/`); the trash icon deletes a picture from the draft (the file and its entry go to `refs/deleted/`, the tags close up to @image1..N and `prompt.txt` follows; Undo for 5 seconds puts it back). A scene frame's prompt says what the film shows at that moment (the project's `beats.json`, or the "A to B s:" blocks of its prompt) and keeps the blockout's layout; the viewer (click the picture) shows it whole next to the blockout, with Try again, Upload instead, Edit prompt and Download. The spend is in `gen/log.json` and in the draft's cost (Approve step, Generations). A run whose job exists but whose picture did not arrive (network trouble, helper restart) is fetched again for free, never generated again.

Price (public price list, 14 Nov 2026, Starter): $0.016 per 1.5K picture + $0.0064 per input image (the blockout guide) = **$0.0224 per picture** (Plus $0.0212, Scale $0.019). The real cost is `usage.cost` on the job (the first runs read $0.0218).

## Characters' descriptions (cast.json)

`projects/<id>/cast.json` = `[{ "name", "kind": "person" | "animal" | "object", "look": "one line" }]`. The build agent writes it (BUILD-PROMPT.md). When a project has none, or it misses names, the bridge asks the user's own Claude Code once (Read tool only) to describe them from the idea, beats, plan and prompt text, and caches the answer there. Street POV ships one made from `seedance/prompt.txt`. The page shows these as "auto" until the user edits them; edits stay in the page's own storage.

## Step B: send the draft

In the page this is one click: after the prompt is written, **Send to Seedance · $X** writes `approved.json` and the bridge sends at once (the page adds `{ confirm: "send" }` to the request by itself; the idempotency key `street-pov-<id>` stops a double click from paying twice). The steps below are for an agent sending it from the chat. (approved.json -> blockout.mp4, result.mp4)

The user pastes "Please send my approved draft ..." into the chat. Only do this when `approved.json` exists; that file is the user's go-ahead from the page. Tell the user the real cost and wait for a clear yes in the chat before sending.

Read `drafts/<id>/approved.json`: `prompt` (the approved text, use this, not prompt.txt), `look`, `resolution` (480p), `seconds`, `estimate` (the user's own estimate; it is not a price).

1. Write the camera project for the renderer: save `request.json`'s `project` as `drafts/<id>/project.json`.
2. Render the blockout in the chosen look (from the project folder). If `request.json` has a `page` other than `index.html` (a project with its own page), put `PAGE=<that page>` in front of the command:
   - neutral: `PROJECT=drafts/<id>/project.json NEUTRAL=1 node render.mjs video drafts/<id>/blockout.mp4 24`
   - depth: `PROJECT=drafts/<id>/project.json SKETCH=1 node render.mjs video drafts/<id>/blockout.mp4 24`
   - sketch: `PROJECT=drafts/<id>/project.json STYLE=sketch node render.mjs video drafts/<id>/blockout.mp4 24`
3. Upload `blockout.mp4` and send it with the approved prompt to Seedance 2.5 through the Tein MCP, at 480p, with the user's own Tein account. The key stays in the MCP; never write it into a file, a request or the chat.
4. Save the returned video as `drafts/<id>/result.mp4`. The page shows it next to the blockout as soon as the file exists.
5. If anything fails, write the reason in plain words to `drafts/<id>/error.txt` and tell the user.

## Frames mode

If the request has `"ref": { "mode": "frames", "max": 12, "look": "sketch" }`, the helper sends a frames sheet (`frames-sheet.jpg`, built by `tools/frames-sheet.mjs`) as the first reference picture (`@image1`) and no video. Write the prompt for that: `@image1` is a storyboard contact sheet in story order; any user pictures in `refs.json` become `@image2` and up.

## Step C: review notes (notes.json)

In the review the user adds notes at times. `notes.json` is `[{ "t": 20.5, "text": "..." }]`, `t` in playback seconds. When the user asks for another version, read the notes, and either change the prompt or tell the user which camera change in the editor would fix it. "Generate again" in the page starts a new draft folder with the same directions.

## Step D: upgrade (upgrade.json -> result-1080p.mp4)

The user pastes "Please upgrade my draft ... to 1080p". Read `upgrade.json` (`resolution`, `seconds`). Tell the user the real cost and wait for a clear yes. Finalize the draft job (`finalize: <draft job id>`, `resolution: "1080p"` or `"4k"`, nothing else) through Tein and save the video as `drafts/<id>/result-1080p.mp4` or `result-4k.mp4`. When the draft was sent by the bridge itself, the Generations page has "Finalize · 1080p" and "Finalize · 4K" (one click, the price is on the button).

## The bridge (bridge.mjs)

`node bridge.mjs` listens on `http://127.0.0.1:5812`. It only reads and writes inside `drafts/` and `projects/`, and accepts requests only from pages on localhost. With a Tein key saved it can send, finalize and make pictures itself (each costs money on that Tein account); `TEIN_SEND=0` (tests only) turns paid calls off, `TEIN_NETWORK=0` every Tein call.

| Call | What it does |
|---|---|
| `GET /api/info` | project and drafts folder paths |
| `GET /api/drafts` | list of drafts with their step |
| `POST /api/drafts` | new draft, writes `request.json`, returns its state |
| `GET /api/drafts/<id>` | state: request, prompt, approved, notes, upgrade, which result files exist, `step` |
| `PUT /api/drafts/<id>/prompt` | saves the user's edited prompt text |
| `POST /api/drafts/<id>/approve` | writes `approved.json` |
| `POST /api/drafts/<id>/notes` | writes `notes.json` |
| `POST /api/drafts/<id>/upgrade` | writes `upgrade.json` |
| `GET /api/drafts/<id>/result.mp4` | serves the video with byte ranges (so it can be scrubbed); also `result-1080p.mp4`, `blockout.mp4` |
| `POST /api/drafts/<id>/refs` | adds a reference `{ kind: image or audio, role: character, style, voice or sound, character, description, name, type, data (base64) }`; checks the limits, writes `refs/<name>` and `refs.json` |
| `POST /api/drafts/<id>/refs/<file>/meta` | changes its description or character |
| `PUT /api/drafts/<id>/script` | writes `script.json` |
| `PUT /api/drafts/<id>/request` | fills in a draft that was made early to hold references (`pending: true`) |
| `POST /api/drafts/<id>/image` | `{ confirm: "generate-image", kind: character or scene, name, at, description, prompt, guide (JPEG data URL), plan }`: one Seedream 5.5 picture (costs money; refused with TEIN_SEND=0) |
| `POST /api/drafts/<id>/image/dry-run` | the same body without confirm: the exact upload + generate requests (REST and MCP), key redacted, price; sends nothing |
| `POST /api/drafts/<id>/image/resume` | `{ slot }`: fetch a paid picture whose job exists (free: status + download) |
| `GET /pricing/image` | Seedream 5.5 price per picture and per input image (public list, cached an hour) |
| `DELETE /api/drafts/<id>/refs/<file>` · `POST .../refs/<file>/restore` | delete a reference (kept in `refs/deleted/`, tags re-flow, prompt.txt follows) · Undo |
| `GET /api/projects/<id>/beats` | what the film shows when: `beats.json`, or the time blocks of the project's prompt |
| `GET/POST /api/projects/<id>/cast` | the characters' descriptions; POST `{ names }` asks the user's Claude once for the missing ones |
| `GET /api/drafts/<id>/dry-run` | the exact uploads and generate request (REST and MCP) a send would make, key redacted; sends nothing |
| `POST /api/drafts/<id>/finalize` | `{ confirm: "finalize", resolution: "1080p" or "4k" }`; only with sending switched on |
| `POST /api/drafts/<id>/dev-prompt` | placeholder: copies `seedance/prompt.txt` to `prompt.txt` |
| `POST /api/drafts/<id>/dev-result` | placeholder: copies `seedance/street-pov-draft4-neutral.mp4` to `result.mp4` |

## Rules

- Never send to Seedance or spend money without the user's clear yes in the chat; `approved.json` alone is not enough.
- No key, token or email in any file.
- Never delete a draft folder; the user may want to compare versions.

## The first line of every prompt
The bridge puts this line first in every Seedance prompt (when Claude writes it and again when it is approved), so Seedance follows the blockout exactly:

> This is a coarse blockout video (@video1): a rough 3D previs of the exact shot. Follow its motion exactly, second by second: the same camera path, speed, height, angles, turns, lens and timing, and every subject in the same place, size and action at the same moment. Reference pictures (@image) only show what things look like, never the camera, framing or timing.
