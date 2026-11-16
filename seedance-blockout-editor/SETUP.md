# Setup

0. Install: `npm install` (needs Node 20+, Chrome or Chromium, and ffmpeg).
1. Serve this folder (`npm start` does this and step 2 together) and open `index.html`: the start screen.
2. Start the local helper: `node bridge.mjs` (http://127.0.0.1:5812, this computer only). It saves projects in `projects/<name>/`, drafts in `drafts/<id>/`, and keeps the Tein API key in the macOS Keychain, or in `~/.config/street-pov/tein-key` (mode 600) on other systems.
3. Connect Tein (top right): create an inference key on tein.ai/dashboard/keys, paste it, Save. Remove it any time under Settings.
4. Optional, for Claude chat: `claude mcp add --transport http tein-seedance-2-5 https://mcp.tein.ai/seedance-2-5 --header "Authorization: Bearer $TEIN_API_KEY"`.

With a Tein key saved, the helper generates (Seedream pictures about $0.02 each, drafts, Finalize; charged to the Tein account). Tests only: `TEIN_SEND=0` makes no paid call. See DRAFT-FLOW.md for the draft steps.

Built on the Tein API.
