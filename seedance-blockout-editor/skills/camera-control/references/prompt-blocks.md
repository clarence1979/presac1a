# The prompt blocks

A prompt has six blocks, in this order. A speaking shot adds the dialogue block near the top.

| Order | Block | What goes in it |
|---|---|---|
| 1 | Generation Goal | One or two sentences: a live-action shot in one take, then the place, the person and what the moment is about. |
| 2 | Dialogue, exact words | Only when someone speaks. Each line with its shot, and the statement that the film holds exactly these lines and no other words. |
| 3 | Reference Asset Roles | What the grey clip is for, the set-rebuild lines, the stripes-are-labels line, and what the photo is for. |
| 4 | Subjects and Relationships | Which stand-in is which person or object, what each person wears, and the place. |
| 5 | Camera and Event Script | The camera paragraph from the template's own numbers, then the acting, the human-motion line, the sound line and the look line. |
| 6 | Maintain Consistency | What must not change: face, clothing, place, light, camera move, size and position. |

## What is locked

Keep these sentences word for word, with only the person's name and the stripe colours swapped in:

- The sentence that says the clip is a coarse-blockout reference, what it is for, and that no stand-in ever shows ("Never show a capsule").
- The set-rebuild sentence: rebuild every wall, window, piece of furniture, vehicle and prop as a real object of the same size in the same place, and no cone, sphere, plain box or untextured surface appears in the final video.
- The stripes-are-labels sentence: no clothing, skin, prop or surface takes those colours, and no striped capsule appears at any moment.
- The human-motion sentence and the photoreal look sentence.
- The Maintain Consistency block, ending with the sentence that keeps the light and time of day constant.

The three realism lines are the set rebuild, the stripes as labels and the photoreal look. Without them the first tests came back with cone pines, ball trees, a stray striped shape and magenta stripes on a jacket.

## What may not survive from the template

The template's sent prompt describes its own place, objects, clothes and characters. None of those words may be left in a prompt for another shot unless the person's own words use them. `build_prompt` and `qa_prompt` fail the leftover_template_words gate and list the words. Fix them with `replace_words`, `set_mapping`, or by hand, and say in `allow_words` which template words truly belong. A product photo is about the product's identity only (shape, colours, materials, logo), never a face.

## What may change

The goal, the person's description and clothing, the place paragraph, the camera numbers (taken from the template), the acting, the sound list, the dialogue lines and their delivery notes.

## Naming every stand-in

Each person gets one capsule colour, and one sentence maps colour to person: "The red-and-black striped capsule in @video1 corresponds to Alex." Colours in order of use: red, yellow, green, blue, magenta, orange, cyan. Name each grey shape as the real thing. A prop that acts gets one flat label colour, and the prompt says what it really is and that the colour is only a label.

## Clothing

Say what people wear and which colours must not appear: "a plain, solid faded grey t-shirt with no stripes, no pattern and no red or navy anywhere on his clothing". Clothing in the photo does not carry over.

## The camera paragraph

Write each move as start side, direction and arrival, with the lens in millimetres and the template's own distances and speeds. One named move per shot. Say "the camera is locked off" for a locked hold, never "on a tripod". Do not write a ban line that names equipment.

## Acting

Write what the person does, why, and how it changes. Keep it small. A word that sounds like a body action is filmed as that action, so say "no tears" if tears are not wanted. Do not write "still", "motionless" or "stands very still". Do not write time stamps. Write the order of events.

## Dialogue

- One block near the top, one line per row, with shot and time.
- The same line repeated inside its shot.
- "No other words" in the block, and silent shots named.
- Delivery notes of 6 words or fewer.
- Punctuation is literal: an ellipsis makes a pause.
- The voice clip goes in only on shots where someone speaks.
- Say outright that the mouth moves on camera.

## Words that cause trouble

These words and settings cause trouble:

- Settings: aspect ratio, duration, resolution and round brackets (they mean music).
- Risk words: unclothed, naked, nude, blood, gun, shoot, kill, dead body, corpse.
- Limp and tear words: dragging, bad leg, slow and labored, eyes wet, streaming.
- Film and franchise names.
- Music words outside the "There is no music" sentence.

## Length

The gallery format ran 500 to 1,100 words, and sent prompts reached 1,715 words. A roughly 3,000 word prompt had its dialogue paraphrased. The best length is UNPROVEN.
