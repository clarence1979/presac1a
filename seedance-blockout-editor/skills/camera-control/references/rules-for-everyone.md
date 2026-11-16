# The rules for everyone

Generated from docs/rules.md by mcp/build_knowledge.py. Only the rules marked for everyone are here. Run the script again after the docs change.
Each line is the rule, then the reason where there is one.


## The pill

- Every person in the blockout is a striped pill with no body to copy. Reason: A clay mannequin made the camera right and the bodies stiff, like a game character.
- The pill uses loud colours, a pattern and its own shape so it cannot be mistaken for the set. Reason: A stand-in that looks like the set's boxes is read as part of the set.
- A white dot at eye height shows which way the pill faces. Do not add a black facing bar. Reason: The dot is enough to show facing. The black bar was an unexplained mark and was dropped; that it read as a door is UNPROVEN.
- One colour pair per character, the same across all templates, so a prompt can name it. Reason: The prompt maps a colour to a person in one sentence.
- A prop that acts gets one flat label colour, not stripes. Reason: The prompt then says what it really is (an orange box is a brown leather case).
- A product is the same pill, 24 cm tall. Never a bottle, a box or a shoe shape. A person-sized pill is 1.75 m. Reason: A product-shaped stand-in is copied as that shape. One pill carries position, size and facing only.
- The pill has no legs, arms, hands or boots. Feet, hands, limp and stumble come from the prompt. Reason: A limbed stand-in is copied as stiff motion, and ground marks were read as real objects.
- The pill has no ground marks standing in for a gait either. Reason: Footprints and drag scrapes tried as a limbless gait cue were read as real objects.
- The pill is as wide as a person's shoulders, not a dome. Build the human first to find proportions, then replace it by the pill. Reason: The fitted capsule was about 0.9 m wide, so close shots read as a giant dome. The slim pin replaced it.
- The pill stays a real lit 3D object even when the environment is drawn in ink. Reason: The sheet route fills each pill with its own colour, so the model still gets position, size and facing.
- Never let a mannequin appear in a pill render, including the extra blend frames used for motion blur. Reason: Anything with a body in the reference has that body copied, and blend sub-frames drew ghost heads.
- A prop in the blockout must read as what it is. A plain sphere for a fist and an orange block for a lock confuse the viewer and the model. Reason: In the dust film's blockout the last shot showed a huge circle where the fist and the lock were; a brass plate with a keyhole and a small key fixed it.
- Two overlapping pills need their own outlines, and a pill in front of the lens still needs its colour (sketch route). Reason: Without them two pills merge into one colour.

## The set

- The blockout set is coarse and colourless grey. Reason: The more detailed the set is, the more of it the result copies.
- No coloured light, halos, shafts or grade in the blockout. Mood comes from the prompt. Reason: Coloured light and thick cut-in shapes made the blockout read as a finished set, and it must read as a blockout.
- The result never keeps the clay set. It is a hyper-real, cinematic render. Reason: Cone pines and ball trees came back in the result until the prompt said to rebuild every object.
- Describe every set piece as a real object with a colour and a material. Reason: A set piece that is only named comes back grey.
- Leave trees, rocks, bushes, lamps and benches out of drawn sheets and out of object-shot previs. Reason: Drawn scenery came back as game-like cone trees.
- No tracking marks, no checker floor, no rendered shadows or colour wash on sheets. Plain line is best. Reason: A still frame is a picture to copy: tracking marks became a real chequerboard floor.
- A picture of the place is a mood reference only, never a map. One panel at most. Reason: A four-panel sheet was copied as layout and put the person inside the table.
- Do not define the place too hard in the blockout. Let the prompt decide. Reason: A detailed place picture was copied as layout: in the first send the person stood inside the table.
- Choose a place that fits the story, not the same plaza every time. Reason: The prompt rebuilds the place, so a fitting layout gives it a better start.
- The place feels large and the person small. Reason: The dust set read as too small and was rebuilt at a larger scale.
- One environment per move, and the 24 environments and moods are all used across the library. Reason: A variety of places stops every result from sharing one look.
- Bodies stand on the real floor. Feet are locked. No slow-motion gait, no merging into props, no ghost heads. Measure before showing. Reason: Sliding feet, slow gaits and bodies passing through props were measured and fixed in the engine.

## The camera

- Move the camera in every clip you send. Locked-off templates (CAM01, CAM26, CAM29, CAM30, CAM46, FAM03 and the ANG family) are kept as camera studies: the drafts from four of them (ANG06, 07, 10, 13) were stiff, so they are not recommended. Reason: The static drafts were the stiff ones.
- Give every shot and camera effect at least 2 seconds; nine shots in older templates (ACT07, SC06, SC07, SC09, SC10, STORY03) are shorter, built before the rule. A crash zoom locks on the eyes for about 2 s; SHOW01 meets 2.0 s for the shot and locks for 1.35 s. Reason: A one-frame zoom read as a cut.
- A cut is fine if the action carries across it. Write the action across each cut, not inside each shot. Reason: A cut fails when the state changes: an arm, a scarf, a prop, clothes.
- The 3D clip drives the motion and the cuts. The prompt is only a backstop. Reason: With video input 9 of 9 cuts landed on the frame; a sheet landed 1 to 3 of 9.
- Spell out each camera move: start side, direction, arrival, height, feel. One named move per shot. Reason: "Orbits a half circle" alone left sheet runs with a locked camera.
- Camera moves are slow, eased and start early. Speed problems are fixed in the three.js camera, not in the prompt. Reason: The dust film's first camera move was too fast and started late; one eased arc fixed it.
- Keep the story object in frame. Aim between the person and the goal. Reason: The key and the lock were out of frame until the aim was changed.
- Bridge two different shots with the same camera pose at the join. Reason: A cut that jumped from a high arc to a low follow was fixed by starting the follow from the pose the arc ended on.
- Do not put slow motion on a part that is real speed in the film. Reason: In the leap of faith the fall was slowed to 14 percent although the film plays it at about real speed.
- Put focus pulls and apertures in the blockout like a director would. Reason: The engine works depth of field out from the lens, stop and focus distance, so the blockout can show a focus pull.
- Name a real camera body and a lens per shot, not one millimetre for all. Reason: Lens choice changes how space and faces read.
- Do not transition by rotating the camera unless the move is motivated. Cut with match cuts. Reason: A match cut holds the subject at the same frame position on both sides.
- A camera-only clip (no people) is the right route when the subject's position does not matter. Reason: It gave the freest movement, and the subjects landed in the wrong places.

## Prompts and claims

- Name every stand-in in the prompt, say no pill ever shows, and rebuild every grey object as a real one. Reason: A stray capsule and capsule stripes on clothing leaked into results without these lines.
- Say plainly what people wear and which colours must not appear. Reason: A striped sweater appeared when the garment was not stated.
- Say who holds what, because pills have no hands. Reason: The pill has no hands, so nothing in the clip shows who holds what.
- A conversation needs real spoken lines in the prompt, in an exact-words block near the top, and again in the shot. Reason: Lines buried in a long prompt were paraphrased; scenes without lines had closed mouths.
- If a person speaks, the mouth must speak. A voice over a closed mouth fails. Reason: The mouth opening was 0.032 of face height on the voice-over take against 0.097 to 0.138 on spoken takes.
- Write dialogue punctuation as you want it heard. An ellipsis makes a pause. Say the line once, and name the shot where it is said. Reason: "Hi... friend" made a pause, and a line said in two shots was spoken twice.
- Say "there is no music". Reason: Music slipped in once when a song was named.
- Never name equipment in a ban line, and say "locked off", not "on a tripod". Reason: The model draws what it is told about, so a ban line put equipment in the picture.
- Do not write "still", "motionless" or "stands very still". The person moves, breathes and blinks. Reason: The person turned into a statue. The gate refuses these words.
- Keep acting small. A word that sounds like a body action is filmed as that action. Say no tears if you do not want tears. Reason: "Breath through his nose" was filmed as sniffing and tear words triggered crying.
- Every action must make sense in its place: what is held, where the person is going, what they feel, what the shot is for. Story first, then the three.js. Reason: The prompt gate requires a motive and a change over the shot, and a story plan gives both.
- Reuse the exact wording of a prompt that worked. Do not paraphrase it. Reason: The 30 s dust prompt rebuilt from two liked prompts, word for word, was followed in order.
- Describe the shape and size of every key prop, and say the key goes all the way in. Reason: The key came back thick and hovering beside a narrow slot until it was described in full.
- Make the place dirty and real. Nothing polished. Reason: Without wear and dirt wording, rocks and buildings came back polished.
- Do not pack many actions into a short window. Each hand-over of an object is a morph risk. Reason: About ten actions in 15 s made the scarf morph.
- State the visible state of scarf, mouth, cup and key in every shot. Reason: Props and clothes changed after a cut when the state was not restated.
- Change one thing per round. Do not rewrite a good draft. Reason: A re-run is a new take, so a rewrite loses what was liked.
- When the copyright filter refuses, retry once, then change the place, clothes and names. Do not use film or franchise names. Reason: The filter judges the finished video, and some refusals are random.
- Do not put aspect ratio, duration, resolution, round brackets or narration in the prompt. Reason: Those are settings, and round brackets mean music in Seedance syntax.
- Write the camera paragraph from the template's own numbers, keep the acting lean, and keep the full protective paragraphs. Reason: The fully lean version fixed stiffness but loosened the framing; the camera script followed the blockout better.
- A line that describes a clip must match the clip and the run's own request. Document only runs that exist. Reason: A "plain boxes" try was described that never ran; the file named for boxes held the striped capsules.
- Dialogue must be plain and in character, never explaining the backstory. Reason: The first draft of the reunion explained the backstory. The final has none and six lines.

## Spending and sending

- Never queue anything that was not asked. A queued job cannot be cancelled. Reason: Four test drafts were queued after a "no" and could not be stopped.
- Re-run exactly the variant named. Do not re-run what already passed. Reason: The wrong variant was re-run once, at the full cost of a draft.
- Send in batches of 4, not 54 at once. Reason: A fault shows up in the first batch, before it is paid for everywhere.
- Draft first. A final re-renders the same take at 1080p for about 5.5 times the draft cost. Say that before finalizing. Reason: A final re-renders the same generation, and small details change.
- Spend nothing on a guess. A request for "the exact video" means prove the match first. Reason: Two fresh 4K generations on the wrong take were not the video that had been chosen.
- When more than one draft could be meant, ask which. Reason: A hospital approval was read as the silent version when the phone call was meant.
- Say what has not been sent. Reason: `sent.json` records what went out; anything not in it was not sent.
- Send only the reference files you chose. Use a voice clip only of a person who agreed. Reason: The model copies the face and voice it is given.
- Failed jobs are refunded, and a random copyright or content-filter hit costs nothing. Do not re-queue it unasked. Reason: A rejected job is not charged.

## Showing results

- Look at what was generated, not at an old status note. Reason: An old "blocked" note hid a finished result.
- In a gallery, every pair of videos starts and loops together. Reason: Out-of-sync pairs make a fault look like a difference. The measured drift was at most 0.09 s.
- Show the overview of all looks first, then the detail. Reason: A viewer needs the whole before the part.
- Keep sketches in their own section, and show the file that was actually sent. Reason: Mixing the routes hides which input made which result.
- Label comparisons by input and output: the clip that was sent beside what Seedance made. Each take carries its own sound, or the label says whose sound it is. Reason: A side-by-side with one shared audio track made one panel's lips look wrong.
- Show the move first and explain "pill" in one line. Reason: A first screen of text boxes does not teach.
- State honestly what you cannot check. An agent cannot hear audio or judge lip-sync. Measure what can be measured and ask a person to listen. Reason: The mouth check shows movement, not sync.

## Files and renders

- Delete only files you made yourself. Reason: A clean-up of "old renders" once removed files that belonged to someone else.
- Keep at least 3 GB free before a long render; the scripts do not check. Reason: A full disk stalls a render with no frames written.
- After a render, check the file's time and look at frames. A crashed render can leave an old video that looks new. Reason: An old video was sent as a new take once.
- Match a downloaded file to a request by size or hash, never by file name. Reason: A retry overwrote the first run's file, and the log showed the retry under the first run's id.
- Do not leave a template file edited after a one-off test. Restore it. Reason: A one-off edit stays in the file and changes every later render of that template.
