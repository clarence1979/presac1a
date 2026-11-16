# Tein integration for the Generate draft flow (from the TEIN session, read from TeinAI-Server origin/prod 2e13dc31, 14 Nov 2026)

## Direct API or MCP: both work today
Correction (author, 14 Nov 2026, and the server code): the direct-API gate (`requireDirectApi`) exists but its launch switch `directApiGate` is OFF (src/workflows/launch.ts line 38: `directApiGate: false`). While it is off, every key can call `POST /v1/generate` and `/v1/jobs` directly. So the bridge may use either the REST API or the MCP. Handle a 403 `direct_api_not_enabled` gracefully in case the switch is ever turned on (then fall back to the MCP, which stays open to every key).

## MCP (recommended)
- Server: `https://mcp.tein.ai/mcp` (all models) or `https://mcp.tein.ai/seedance-2-5`. Streamable HTTP JSON-RPC (`tools/list`, `tools/call`), header `Authorization: Bearer sk_live_...`.
- `upload_asset` (local file up to 100 MB): call `{ filename, byte_size, content_type: "video/mp4" }` -> presigned PUT link; PUT the exact bytes with that Content-Type before it expires; call again with `{ upload_key }` -> signed Tein URL. Also `{ url }` (public link) or `{ data }` (<= 4 MB).
- `generate_video`: `prompt`, `model: "seedance-2-5"`, `mode` (multi_reference for a reference video), `duration` (4-30 or -1), `aspect_ratio`, `videos[]`, `images[]`, `audios[]`, `draft`, `finalize`, `pass_faces` (default on), `generate_audio` (default true), `watermark`, `return_last_frame`, `priority`, `creative_mode`, `callback_url`.
- `get_generation_status { request_id }` -> status and output URLs.
- `get_pricing { model: "seedance-2-5" }` needs no key (same as public `GET https://api.tein.ai/v1/pricing/models?model=seedance-2-5`).
- Alternative: user deploys Seedance 2.5 as a workflow and the bridge calls `POST /v1/workflows/... runs` (also not gated); workflow finalize is `POST /v1/workflows/runs/{runId}/finalize { step?, resolution }`.

## Draft rules
- `draft: true` always renders 480p; not with `priority`; `return_last_frame` not with draft (422).
- Reference limits: up to 10 videos with combined length <= 30 s, 30 images, 10 audio clips.
- Finalize: `{ model: "seedance-2-5", finalize: "<draft job id>", resolution: "1080p" | "4k" }`, only those fields + callback_url. Same take at 1080p (10-bit HEVC) or 4K. Drafts expire after 7 days (410 `draft_expired`).
- Statuses: queued, running, succeeded, failed, expired, cancelled; failed/expired/cancelled cost 0.
- Always send an `idempotency_key` so a retry cannot double-charge.

## Price (live public GET, board 2026-10-01), per billed second, with a reference video
| | Starter | Plus | Scale |
|---|---|---|---|
| 480p normal | $0.0779 | $0.0740 | $0.0702 |
| 480p draft | $0.0755 | $0.0717 | $0.0702 |
| 1080p normal | $0.4349 | $0.4132 | $0.3780 |
| 1080p draft row (finalize, to confirm) | $0.4218 | $0.4008 | $0.3780 |

Billed seconds with a video input = max(reference seconds rounded up to 0.1 + output seconds, output + ceil(2/3 x output)). 30 s out with a 30 s reference = 60 s billed: Starter draft about $4.53, Starter 1080p finalize about $25.31 (estimates; read `usage.cost` on the job). Read the price live from `get_pricing` rather than hardcoding.

## Keys
- Format `sk_live_` or `sk_test_` + 64 hex. Scopes: `all` | `inference` | `read` (read cannot upload or run: 403 `read_only_key`). Ask users for an **inference** key.
- Keys can carry their own spending limit (`402 key_limit_reached`); suggest users set one.
- `sk_test_` keys return a dummy succeeded job at $0 with no model called: use them to test the bridge (the MCP workflow tools refuse test keys for runs).
- Store in the OS keychain, never log, never in URLs, send only to api.tein.ai / mcp.tein.ai, bridge bound to 127.0.0.1; users can revoke at tein.ai/dashboard/keys.

## Errors (`{ error: { code, message } }`)
- 401 `missing_api_key` / `invalid_api_key`.
- 402 `insufficient_credits` {required, balance} or `key_limit_reached` {limit, used, period, resets_at} (nothing charged).
- 403 `direct_api_not_enabled`, `read_only_key`, `account_suspended`, `workspace_paused`, `creative_mode_restricted`, `role_cannot_run`.
- 409 `request_in_progress` (same idempotency_key still being admitted, retry), `not_cancellable`.
- 410 `draft_expired`.
- 422 `invalid_params` (names the field; unknown fields too; same idempotency_key with a different body).
- 429 `rate_limited` / `concurrency_limit_exceeded` with Retry-After (Starter 60/min, 10 concurrent; Plus 120/25; Scale 240/40). Back off on Retry-After.
- 503 `capacity` (nothing charged).
- Job `error.code`: content_blocked, face_detected, copyright_blocked, task_type_mismatch, invalid_input, expired, capacity, server_error, cancelled (all cost 0).

## Seedream 5.5 (reference pictures), read 14 Nov 2026 without spending (MCP tools/list + get_pricing, public price list, server source origin/stg)
- Model id `seedream-5-5` ("Seedream 5.5", image, BytePlus only). MCP: `https://mcp.tein.ai/seedream-5-5` (tools `seedream-5-5`, `generate_image`, `upload_asset`, `get_generation_status`, `get_pricing`); on the unified `https://mcp.tein.ai/mcp` the tool is `seedream-5-5` (`generate_image` there defaults to gpt-image-2 unless `model` is given). REST: `POST /v1/generate { model: "seedream-5-5", ... }`, `GET /v1/jobs/{id}` -> `data[0].url`, `usage.cost`.
- Fields: `prompt` (required), `mode` text_to_image | image_to_image | layer_decomposition, `images` (http(s) links only, no data URIs, up to 10, each billed), `resolution` 1K | 1.5K | 2K (or `size` WxH, 1280x720 to ~2150x2150), `aspect_ratio` 1:1 4:3 3:4 16:9 9:16 3:2 2:3 21:9 adaptive, `background` auto | transparent | opaque, `output_format` png (default) | jpeg, `creative_mode` (+5%), `callback_url`. No seed. 16:9 sizes: 1K 1424x800, 1.5K 2048x1152, 2K 2816x1584.
- Price per picture: 1K and 1.5K Starter $0.016 / Plus $0.0152 / Scale $0.0136; 2K $0.028 / $0.0266 / $0.0238; each input image + $0.0064 / $0.006 / $0.0054. The bridge uses 1.5K 16:9 JPEG with the blockout as one input image: **$0.0224 Starter**. First real runs (author, 14 Nov): `usage.cost` 0.0218 each, about 25 s from request to picture.
- MCP answers are Markdown text (`- **Request ID:** \`gen_...\``, `- **Status:** Succeeded`, `**Image URL:** ...`, `- **Cost:** $...`; upload_asset: a curl PUT link and `upload_key: "..."`, then `- **URL:** ...`). The bridge reads both JSON and this text.
- Input images are screened by content moderation before credits are held.
