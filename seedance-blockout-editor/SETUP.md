# Setup

0. Install: `npm install` (needs Node 20+, Chrome or Chromium, and ffmpeg).
1. Serve this folder (`npm start` does this and step 2 together) and open `index.html`: the start screen.
2. Start the local helper: `node bridge.mjs` (http://127.0.0.1:5812, this computer only). It saves projects in `projects/<name>/`, drafts in `drafts/<id>/`, and keeps the Tein API key in the macOS Keychain, or in `~/.config/street-pov/tein-key` (mode 600) on other systems.
3. Connect Tein (top right): create an inference key on tein.ai/dashboard/keys, paste it, Save. Remove it any time under Settings.
3b. Or use Replicate instead of Tein: Settings → Replicate account, paste a token from replicate.com/account/api-tokens (it starts with `r8_`). Tick **Remember me on this computer** to keep it (macOS Keychain, or `~/.config/street-pov/replicate-key`, mode 600); leave it unticked and the helper forgets it when it stops. In Generate → Check it and send, choose **Make it with Replicate**: the video is made by `bytedance/seedance-2.5` at 720p and charged to your Replicate account at Replicate's price.
3c. **From a web address (no helper)**: Generate still works, in the page, through Replicate. Paste a token in Generate (tick Remember me only on your own computer); the page records the blockout itself (WebCodecs, H.264, 1280x720, 24 fps), sends it through the relay, and keeps the finished videos in the browser under Your videos. Tein, Fix notes and the Claude helpers stay greyed out (they need the helper).
   The relay is `relay/worker.js`, a Cloudflare Worker; to use your own, change the URL in `generate-web.js` or set `window.SEEDANCE_RELAY`. It answers only the editor's pages, passes on only the five Replicate calls Generate needs, and keeps nothing. To deploy your own: Cloudflare dashboard → Workers & Pages → Create → Start with Hello World → name it → Deploy → Edit code → paste `relay/worker.js` → Deploy; then add your page's address to `ORIGINS` in it. `npm run test:web` checks the relay and the page with stand-ins (no real call).
4. Optional, for Claude chat: `claude mcp add --transport http tein-seedance-2-5 https://mcp.tein.ai/seedance-2-5 --header "Authorization: Bearer $TEIN_API_KEY"`.

With a Tein key saved, the helper generates (Seedream pictures about $0.02 each, drafts, Finalize; charged to the Tein account). Tests only: `TEIN_SEND=0` makes no paid call. See DRAFT-FLOW.md for the draft steps.

Built on the Tein API.
