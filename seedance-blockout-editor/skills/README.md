# Skills

`camera-control/` is the **Seedance 2.5 camera-control skill**: the method and the prompt rules for giving Seedance a rough 3D camera so it films your shot as planned. The local helper (`bridge.mjs`) makes Claude Code read it every time a prompt is written for a draft.

- `camera-control/SKILL.md`: the skill itself.
- `camera-control/references/`: the prompt blocks, the rules, the failure ladder and the Tein sending notes.
- `camera-control/docs/`: the longer notes the skill points to (prompt anatomy, camera language, known limits, costs).

You can also use it directly in Claude Code: copy the folder to `~/.claude/skills/camera-control/`.
