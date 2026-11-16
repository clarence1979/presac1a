# The pipeline step by step

Each step names the tool to call, the check that closes the step, and the mistake to avoid. The tools are in the camera-control MCP. Every one of them is read-only.

## 1. Understand what they want (start_here)

Ask these seven questions, one at a time, and skip any the person has already answered. The first two decide whether anything can be sent: the goal, and whether the person has the project's files. If they do not, say at once that the clip file cannot be downloaded yet, and list what they can still do now (choose a template, write and check the prompt, see the plan and the cost).

1. What do you want to make, and where will it be used?
2. Is there a person or a product in it, and do you have a clear photo?
3. Does anyone speak, and do you have a short clean recording of that voice?
4. How long should it be?
5. Should the picture be wide like a cinema screen, or tall like a phone video? (Every clip is wide, 21:9. Tall is untested.)
6. Do you have a Tein account and key?
7. Can you run Node and ffmpeg on this machine, and do you have the repo?

The answers choose the path. Path A uses a ready template as it is. Path B changes a template's lens, move or place and renders it. Path C builds a new scene. Without Node and ffmpeg the person can only take path A.

Close the step when you can say the shot in one sentence. If the person arrives with a problem, a prompt or a clip, call `start_here` with `situation` set to problem, has_prompt or has_clip: a problem goes to `diagnose` first, then the prompt goes to `qa_prompt`; a prompt goes to `qa_prompt`; a clip goes to `get_template` and `plan_payload`.

The mistake to avoid is asking all the questions at once.

## 2. Pick the move (recommend_template, list_templates, compare_routes)

Give `recommend_template` the person's own words, including the move if they named one. It reads the move, the number of people, whether anyone speaks, the length, the lens and whether the subject is a person or a product. It shows up to 3 options and never picks: ask the person which fits. It returns three templates with the reason, the route (video, sketch sheet or camera-only) and the cautions. Templates with a fixed camera are left out because the method does not make them.

- The video route is the default. It lands cuts on the frame (9 of 9 on the 30 second film).
- The sketch route costs less and can feel more natural, but it has no clock, so cuts drift by about half a second (1 to 3 of 9 landed).
- The camera-only route moves most naturally and cannot place people.

The mistake to avoid is promising that the result will match a famous scene.

## 3. Open the template (get_template, show_template_code)

`get_template` says where the grey clip is. If the repo is on the machine it gives the path under `templates/<ID>/pill.mp4`. The repo is public (github.com/sirioberati/ai-filmmaking-camera-control-seedance-2-5). A locked-asset id on Tein (a request that names the clip so nobody uploads it) is coming soon, for the 5 famous shots first.

It also says if no prompt was ever sent for the template. At the time of writing, 44 templates are in that state. They have never been tried with the video model. Start `build_prompt` from a neighbour with `base_template` and say that the result is untested.

`show_template_code` walks through the code by line group: actors, shots, rig, lens and timing. The numbers to change are the lens in the rig's frame, the distance and angle after it, the start and end times, and where the actor stands.

## 4. Make and check the clip

Path A skips rendering. For paths B and C render on the person's machine:

```
cd engine/cinematic && npm install
tools/render-pill.sh <TEMPLATE-ID>
```

The stand-ins in the clip are striped, the set is grey, and nothing is lit with mood colour. Then check:

- one video stream and no audio stream, 24 fps, 1280 by 534, under 29 seconds (28.92 seconds is proven safe; 30.00 was refused once);
- the camera moves: three frames (0.3 seconds in, the middle, 0.3 seconds from the end) differ by at least 8.0 mean grey levels;
- no bar or text on the picture, and no stand-in inside a wall;
- every shot holds at least 2 seconds.

A stills-first rule applies: look at a still of the hero before rendering the video. Stop for approval on a one-per-shot sheet before the full render. Fix faults in the clip, not in the prompt.

## 5. Write the prompt (build_prompt)

Give it the scene (with a motive and a change; it goes into the acting only), one person for every stand-in in the clip (a template with 2 stand-ins needs 2 people, with names, descriptions, outfits and pronouns, and `photo: false` for a person with no photo) or, for an object template, the product and a one-word `product_name`. Add the place in words, the light, and spoken lines if any. Set `set_mapping` to replace the template's description of its grey shapes. Use `replace_words` for the template's own words in its kept camera text (for example plaza to pier) and `allow_words` for template words that really belong in the shot. Speech needs about 2.5 to 3 words a second, so a long line needs a long shot. Read `prompt-blocks.md` for what is locked.

The mistake to avoid is writing time stamps or camera words into the acting.

## 6. Check the prompt (qa_prompt)

Pass the template id and the allowed words (or the `prompt_check` from `build_prompt`) so the template-specific checks run the same way everywhere: camera numbers, leftover template words and acting, whether the kept camera paragraph fits the scene, whether a line fits its shot. Fix the failures one by one, then run it again. An advice item is not a gate, but read it. A pass means the mechanical checks pass. It does not mean the prompt is right for the shot.

## 7. Plan the send (plan_payload, estimate_cost)

Pass `plan_payload` the prompt and its `prompt_check`. It runs the same gates again and returns the request body, or a body marked blocked with the failing gates. It returns in Tein's field names, the uploads to make first, the Tein tool steps in order, a checklist and the finalize body. It sends nothing. `estimate_cost` takes a rate from Tein's own price list and does the sum. The server stores no prices.

## 8. Send a draft

Only on a clear yes to this exact send. See `sending-through-tein.md`.

## 9. Judge the draft

Look at real frames of the new file, with the grey clip beside it. Compare the camera path, the framing, the cuts, the people's size and place, and whether a stripe, a pill or a grey shape leaked. For speech, transcribe each take and compare it with the exact lines, and check that the mouth moves. Say plainly that you cannot judge voice likeness or lip-sync.

## 10. Fix and repeat

`diagnose` maps a symptom to a cause, a fix and an example. Change one thing per round. A re-run of the same request is a new take because there is no seed. To keep a take, finalize its draft.

## 11. Finalize

Only after the person says the draft is right. A final re-draws the same take at 1080p by default, or at 4k if the person asks, and fine detail can change. A draft can be finalized for 7 days.
