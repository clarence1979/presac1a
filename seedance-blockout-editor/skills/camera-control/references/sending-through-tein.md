# Sending through Tein, draft first

This skill and the MCP never send. This page says what a send is, so the person can say yes with their eyes open. The facts are from `docs/tein-endpoint.md`, `docs/seedance-notes.md` and `docs/costs.md`.

## The rule

Nothing is uploaded, queued or paid for until the person has seen what will happen and what it costs and has said yes to that exact send. After a no, send nothing. After an interrupted command, check what it already queued. A queued job cannot be cancelled. A job that a filter refuses, or that fails, is not charged.

## What to say before asking

1. Which files go up: the grey clip, the person's own photo, and a voice clip only if someone speaks.
2. That it makes a cheap 480p preview called a draft, about 3 to 8 minutes of waiting.
3. The cost from Tein's `get_pricing`, and the sum from `estimate_cost`.
4. That a final costs about 5 to 7 times the draft and comes later, only if the draft is right.

Then ask: "Shall I send this draft? Yes or no."

## The request body

Use only these names. They are the ones in `docs/tein-endpoint.md`.

```
model            "seedance-2-5"
prompt           the checked prompt
reference_video  [the grey clip, uploaded first]
reference_image  [the person's photo]
reference_audio  [the person's voice clip, only if someone speaks]
duration         whole seconds, 4 to 30 (the clip length rounded up)
resolution       "480p" for a draft
ratio            "21:9"
draft            true
pass_faces       true
output_format    "mp4"
callback_url     optional
```

Two old names break a request. `is_draft` is silently ignored, so the run bills at full price. `webhook_url` is refused with a 422. Use `draft` and `callback_url`. There is no seed.

## The Tein tools, in order

1. `get_pricing`. Show the person the price and what will be uploaded (the clip, their photo, a voice clip if someone speaks). Wait for the yes: an upload puts their photo on Tein.
2. After the yes, `upload_asset` for the grey clip. It returns a URL for `reference_video`.
3. `upload_asset` for the photo. It returns a URL for `reference_image`.
4. `upload_asset` for the voice clip, only if someone speaks.
5. `generate_video`.
6. `get_generation_status` until the job succeeds.

The MCP's `plan_payload` returns these steps with the body filled in. Check each Tein tool's own schema before calling it, because this server cannot see it.

## Limits

- A reference video is 2 to 30 seconds, and the total stays under 29 seconds. 28.92 seconds is proven safe. 29.3 seconds was accepted once. 30.00 seconds was refused on one route, and Tein's docs say it accepts exactly 30.00, so trim to be safe.
- MP4 or MOV, H.264 or H.265, 24 to 60 fps, no sound track.
- Images: each side 300 to 6000 pixels, at most 30 MB, aspect 0.40 to 2.50.
- Audio: 2 to 30 seconds a clip, mp3 or wav.
- Output: 4 to 30 seconds.
- A file upload is up to 100 MB.

## After the draft arrives

Look at the real frames beside the grey clip before saying anything. A draft can be finalized for 7 days, then the answer is `draft_expired`.

## Finalize

```
{ "model": "seedance-2-5", "finalize": "<draft id>" }
```

This gives 1080p. Add `"resolution": "4k"` for 4K. It re-draws the same take, so small details can change, and it costs about 5 to 7 times the draft. Do it only when the person says the draft is right. Match the draft id to the right file first: one 4K run was paid for on the wrong take.

## Cost

Never quote a past credit number as a price. Ask the person to read the price for one second of the 480p preview with a reference video off tein.ai/pricing, or use Tein's `get_pricing` tool if you have it, and pass that rate to `estimate_cost`. The sums below were observed in the first tests and are past bills, not prices.

A video reference bills the clip seconds plus the output seconds, or output plus two thirds of the output rounded up if that is more. A sheet or text request bills output seconds only. Images and audio add nothing. Prices are on tein.ai/pricing and change, so use the rate Tein gives. The sums that were observed: a 7 second draft from a 7 second clip came to 1,020.6 credits at 72.9 credits a second, and a 30 second extend from a 12 second tail billed the 50 second minimum.

## Filters

A refusal for copyright or content is not charged. Retry once. Then change the setting, the clothes and the names. Never send the same prompt a third time.

## The key

The key lives in an environment variable on the person's own machine. Never ask for it in chat and never write it into a file in the repo.
