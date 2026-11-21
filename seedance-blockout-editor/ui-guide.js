// ui-guide.js: a clearer editor layout, a "?" next to every main control, and controls that cannot work right now greyed out with the reason.
//   mountGuide() is called once by editor.js after the editor is built. It only rearranges and labels what the editor made, and adds help;
//   it changes no editing behaviour. The marks can be switched off under Help ▾ (kept in this browser).
const BR = () => window.BRIDGE_URL || 'http://127.0.0.1:5812';
const LS_MARKS = 'pov-help-marks';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MOD = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? 'Cmd' : 'Ctrl';

// ---- what every control is: t = title, w = what it is, s = how to use it, k = keys, n = a note
const H = {
  stScenes: { t: 'Build a scene by hand', w: 'Scenes you make yourself, without writing code: you place blocks, buildings, vehicles and people, and say what each one is in the film.', s: ['Start a new scene: empty, or from an example you can take apart and change.', 'Open or delete a scene you made before.', 'Scenes are kept in this browser. File ▸ Export JSON saves a copy.'] },
  stMode: { t: 'Build / Camera', w: 'Two ways of working on the same scene. Build: add, move and change the things in it. Camera: set the camera that films it (keys, moves, tracking, cuts).', s: ['Build first: put everything where it belongs and give the moving things a path.', 'Then switch to Camera and frame it. You can switch back at any time.'], n: 'While you set the camera the scene is locked, so a stray click cannot move a building.' },
  stAdd: { t: 'Add', w: 'Adds one thing to the scene, in the middle of the 3D view.', s: ['Shapes: box, ball, cylinder, cone, ramp. Stretch them to any size: a box can be a table, a wall or a tower.', 'Places: floor or road, wall, building, house, tree, street lamp.', 'Vehicles and people: they can move along a path, and a person can ride on a vehicle.'], n: 'These are stand-ins. The video model replaces each one with the real thing you describe under “What it is in the film”.' },
  stTools: { t: 'Move, Turn, Size', w: 'Chooses the handles shown on the selected object in the 3D view.', s: ['Move: drag an arrow to slide it, or a small square to slide it over the ground.', 'Turn: drag a ring.', 'Size: drag a small cube. Shapes stretch in each direction; ready-made things grow as a whole.'], k: ['W move', 'E turn', 'S size'], n: 'Every value can also be typed on the Scene tab on the right.' },
  stKey: { t: 'Path point', w: 'Makes the selected object move. A path point says: be at this place at this second.', s: ['Select the object and press Path point: it now has its starting point.', 'Move the playhead on the timeline to a later second.', 'Drag the object to where it should be by then. The next point is written by itself.', 'Play: it travels from point to point, and turns the way it goes.'], k: ['K'], n: 'The points are listed under Movement on the Scene tab, where you can change their seconds or remove them. A person walks by itself while it travels.' },
  stEdit: { t: 'Copy and Delete', w: 'Copy makes a second one of the selected object, two metres away, with the same size, colour and path. Delete removes the selected object.', k: [MOD + '+D copy', 'Delete'], n: 'Undo (' + MOD + '+Z) brings back anything you delete.' },
  stSnap: { t: 'Snap', w: 'When it is on, things move in half-metre steps, turn in 15° steps and grow in quarter steps, so they line up easily. Turn it off for fine placing.' },
  tabScene: { t: 'Scene tab', w: 'Everything about the scene you are building.', s: ['With an object selected: its name, what it is in the film, place, turn, size, colour, pose and movement.', 'Scene: its name, the ground, the light (day, golden hour, overcast, night) and what happens, in your words.', 'The list shows everything in the scene; click a line to select it.'], n: 'The names, the “what it is” texts and the story are written into the prompt for the video model.' },
  back: { t: 'Back', w: 'Leaves the editor and goes back to the start screen. Your work is saved first.' },
  tool: { t: 'Camera tool', w: 'Chooses the handle you drag on the camera in the 3D view.', s: ['Rotate: rings that turn the camera (pan, tilt, roll).', 'Move: arrows that slide the camera.', 'Local axes: the arrows follow the way the camera faces.'], k: ['E rotate', 'W move'] },
  setkey: { t: 'Set key', w: 'Saves where the camera is, where it points and its lens at this moment. The camera glides from key to key, and that glide is your camera move.', s: ['Move the playhead to a moment on the timeline.', 'Place and aim the camera (drag in the Final shot, or use the panel on the right).', 'Press Set key.'], k: ['K'] },
  animate: { t: 'Animate', w: 'Decides what dragging the camera does.', s: ['Off: the camera is placed for the whole shot, with no new key.', 'On: every drag writes a key at the playhead, so the camera moves during the shot.'], n: 'Leave it off to frame a shot; turn it on to make the camera move.' },
  keys: { t: 'Keys menu', w: 'Tools for the keys you have made.', s: ['Delete key: removes the selected key.', 'Auto-key: when on, every change writes a key by itself.', 'Smooth: evens out jerky keys. Simplify: removes keys the move does not need. Both show a preview first.'], k: ['Delete', 'A auto-key'] },
  moves: { t: 'Moves', w: 'Your library of camera moves: push-in, orbit, crane up and more. Save a move from your keys once and put it on any shot, stretched to fit.', k: ['M'] },
  track: { t: 'Track subject', w: 'Makes the camera keep a person or object in frame.', s: ['Press Track subject.', 'Click the subject in any view, or in the Scenes list on the right.', 'From the playhead on, the camera keeps it in frame.'], k: ['T', 'Esc cancels'] },
  split: { t: 'Split here', w: 'Cuts the shot in two at the playhead, like a cut in a video editor. Each side can then have its own camera.', k: ['C'] },
  zoom: { t: 'Zoom in', w: 'Zooms the shot into part of the picture, like cropping.', s: ['Press Zoom in.', 'Drag a box over the Final shot.', 'The shot zooms into that box.'] },
  zoomreset: { t: 'Reset zoom', w: 'Puts the shot under the playhead back to its original framing.' },
  layout: { t: 'Layout', w: 'Arranges the screen.', s: ['Editor: all views and the timeline.', 'Focus: one big view.', 'Player: just the film.', 'Side by side: two views next to each other.'] },
  view: { t: 'View menu', w: 'What the views show and how they move.', s: ['Big view: which view is large (3D, Plan or Camera).', 'Link views and Follow: the views move together and follow the camera.', 'Frame: brings the camera into the 3D view.', 'Show in the views: the camera path, key markers, the camera cone, subject names, see through walls.'], k: ['F frame', '1 2 3 big view'] },
  undo: { t: 'Undo and Redo', w: 'Step back or forward through your changes.', k: [MOD + '+Z undo', 'Shift+' + MOD + '+Z redo'] },
  gens: { t: 'Generations', w: 'Opens the gallery of every video you have made with Seedance, with its prompt, its length and what it cost.', helper: true },
  file: { t: 'File menu', w: 'Export the project as editor-project.json (a backup, or to share it), or Import one back in.' },
  panel: { t: 'Side panel', w: 'Shows or hides the panel on the right. It holds the settings of what you selected: position, aim, lens, focus, speed and layers.', k: ['I'] },
  tein: { t: 'Settings and API keys', w: 'Where you connect the service that makes the videos, and a few editor settings. Seedance runs through Tein or through Replicate: paste a Tein key or a Replicate token (r8_…).', s: ['Replicate: paste the token and tick Remember me to keep it on this computer.', 'Without Remember me it is forgotten when the helper stops.'], n: 'Keys are kept by the helper on your computer, never in the project or the page.', helper: true },
  generate: { t: 'Generate with Seedance', w: 'Turns your blockout into a real-looking video.', s: ['Describe the video and the look you want.', 'A prompt is written for you. Check it and change it if you like.', 'Choose Tein or Replicate to make it, then send. Nothing is charged until you press Send.'], helper: true },
  // the same three when the page runs from a web address (no helper): Generate works in the page through Replicate
  generateWeb: { t: 'Generate with Seedance', w: 'Turns your blockout into a real-looking video with Seedance 2.5, through your own Replicate account. It all happens in this page.', s: ['Paste your Replicate token once. Tick Remember me only on your own computer.', 'Describe the look and check the prompt.', 'Record the blockout, then Send. Replicate bills your account; nothing is charged before you press Send.'], n: 'The finished videos are kept in this browser under Your videos. Download the ones you want to keep.' },
  gensWeb: { t: 'Your videos', w: 'The videos you made from this browser, with their prompts. They are kept in this browser only: download the ones you want to keep.' },
  teinWeb: { t: 'Settings', w: 'Your Replicate token for this browser, and a few editor settings.', n: 'From a web address, Tein and the Claude helpers need the helper program on your computer. Seedance runs through your Replicate account instead.' },
  // views
  view3d: { t: '3D view', w: 'A free camera on the whole set. The blue line is the camera\'s path and the red cone is what the camera sees.', s: ['Drag to orbit, right-drag to pan, scroll to zoom.', 'Click a key marker to jump to it.', '⋯ opens this view\'s menu.'] },
  final: { t: 'Final shot', w: 'Exactly what the camera sees. This becomes your video.', s: ['Drag to look around, scroll to move in or out.', 'That changes the camera at the playhead (and writes a key when Animate or Auto-key is on).'] },
  plan: { t: 'Plan (from above)', w: 'A map of the set seen from above.', s: ['Drag a key to move it. Click the blue path to add a key.', 'Drag the white handles to bend the path.', 'Drag the red dot to move the camera and the ring to aim it.'] },
  // side panel tabs
  tabCamera: { t: 'Camera tab', w: 'The camera at the playhead: position, aim (pan, tilt, roll), lens angle and focus. Type a number or drag a slider; Quick moves at the bottom nudge it.' },
  tabScenes: { t: 'Scenes tab', w: 'The moments of the story, in order. Click a scene to jump there, or Track to keep its subject in frame.' },
  tabSpeed: { t: 'Speed tab', w: 'The settings of the slow motion, freeze or camera pace block you selected on the timeline.' },
  tabLayers: { t: 'Layers tab', w: 'The camera is two layers: the Original camera (blue) and Your keys (yellow) on top. Mute, solo or blend them, or merge your keys into the original.' },
  // timeline
  transport: { t: 'Play controls', w: 'From left: go to the start, previous key, back one frame, Play / Pause, forward one frame, next key.', k: ['Space play', '← → one frame', 'Shift+← → one second', '[ ] previous / next key', 'Home start'] },
  speed: { t: 'Speed / timing', w: 'Adds a change of time at the playhead.', s: ['Slow-mo, Ramp and Fast change the speed of everything.', 'Freeze time stops everything for some seconds.', 'Hold camera stops only the camera while the action keeps playing.'], n: 'They show on the Speed and Camera pace tracks, where you can drag them.' },
  note: { t: '+ Note', w: 'Adds a note on the seconds under the playhead. There are three kinds (the tabs on the Notes track): Camera fixes, What happens and Camera description.', k: ['N'] },
  assist: { t: 'Assist', w: 'Helpers. Check pacing and the tour work anywhere; the others use Claude Code through the helper on your computer.', s: ['Review my shots: Claude looks at every shot and adds Camera fixes.', 'Write what happens: Claude writes a note for each shot.', 'Preview the prompt, check pacing, export a frames sheet, fix history.'] },
  fix: { t: 'Fix notes', w: 'Claude changes the shots to do what your open Camera fixes ask, rebuilds them and checks them. The fixed notes then disappear.', helper: true },
  fit: { t: 'Fit 30 s', w: 'Seedance makes at most 30 seconds. On: the take stays exactly 30 s and the rest plays a little faster after a slow motion. Off: the take gets longer instead.' },
  zoomtl: { t: 'Timeline zoom', w: '− and + zoom the timeline in and out. Fit shows the whole take.', k: [MOD + '+scroll over the timeline'] },
  simple: { t: 'Simple or full timeline', w: 'Switches between the simple timeline (shots, your keys, speed, tracking) and every track (original camera, camera pace, speed graph).' },
  // tracks
  trBase: { t: 'Original camera', w: 'The camera move the project was built with, as blue keys. Click the name to edit this layer instead of your own keys.' },
  trShots: { t: 'Shots', w: 'Each coloured block is a shot and each orange line a hard cut, where the picture jumps.', s: ['+ Cut adds a cut at the playhead (C).', 'Drag a cut to move it.', 'Select it and press × or Delete to remove it.'] },
  trKeys: { t: 'Your keys', w: 'Your own camera keys (yellow), on top of the original camera.', s: ['Click a key to select it, drag it to change its time.', 'Double-click an empty spot to add a key.', 'Right-click a key for its easing (how it speeds up and slows down).'] },
  trPace: { t: 'Camera pace', w: 'Timing for the camera only: hold it, slow it or hurry it while the action keeps playing.' },
  trSpeed: { t: 'Speed', w: 'Slow motion, freezes and ramps for everything on screen. Drag a block to move it, drag its edges to change its length.' },
  trTrack: { t: 'Tracking', w: 'The stretches where the camera keeps a subject in frame (made with Track subject).' },
  trNotes: { t: 'Notes', w: 'Notes on the seconds of your film. Pick a kind with the tabs, then drag across the seconds it is about.', s: ['Camera fixes: what to change in the camera (Fix notes can do it for you).', 'What happens: what must happen in the video. It goes into the prompt.', 'Camera description: a lens and angle line for every shot, made for you. It goes into the prompt.'] },
  trGraph: { t: 'Speed graph', w: 'The speed of time and of the camera drawn as a curve, to spot sudden jumps.' },
};

// ---- where the marks go. mode 'after': on the top-right corner of the control (no extra width); 'in': inline at the end of a label
const T = (sel, key, mode = 'after') => ({ sel, key, mode });
const TARGETS = [
  T('#bBack', 'back'), T('#stScenes', 'stScenes'), T('#stMode', 'stMode'), T('#stAdd', 'stAdd'), T('#stTools', 'stTools'), T('#stKey', 'stKey'), T('#stDel', 'stEdit'), T('#stSnap', 'stSnap'), T('#insp .tabs [data-tab=scene]', 'tabScene'),
  T('#ddTool', 'tool'), T('#bKey', 'setkey'), T('#bAnimate', 'animate'), T('#ddKeys', 'keys'), T('#bMoves', 'moves'), T('#bTrack', 'track'),
  T('#bSplit', 'split'), T('#bZoom', 'zoom'), T('#bZoomReset', 'zoomreset'), T('#sLayout', 'layout'), T('#ddView', 'view'),
  T('#bRedo', 'undo'), T('#bGens', 'gens'), T('#ddFile', 'file'), T('#bInsp', 'panel'), T('#tnGear', 'tein'), T('#bDraftTop', 'generate'),
  T(() => tagOf('vDir'), 'view3d', 'in'), T(() => tagOf('vCam'), 'final', 'in'), T(() => tagOf('vTop'), 'plan', 'in'),
  T('#insp .tabs [data-tab=camera]', 'tabCamera'), T('#insp .tabs [data-tab=scenes]', 'tabScenes'), T('#insp .tabs [data-tab=speed]', 'tabSpeed'), T('#insp .tabs [data-tab=layers]', 'tabLayers'),
  T('#bNextK', 'transport'), T('#ddSpeed', 'speed'), T('#bNote', 'note'), T('#bAssist', 'assist'), T('#bFix', 'fix'), T(() => lab('#cFit'), 'fit'),
  T(() => [...document.querySelectorAll('#tr button')].find((b) => b.textContent.trim() === 'Fit'), 'zoomtl'), T('#bSimple', 'simple'),
  T('#lBase', 'trBase', 'in'), T('#lCut', 'trShots', 'in'), T('#lEdit', 'trKeys', 'in'), T(() => labText('Camera pace'), 'trPace', 'in'), T(() => labText('Speed'), 'trSpeed', 'in'),
  T(() => labText('Tracking'), 'trTrack', 'in'), T('#lNotes', 'trNotes', 'in'), T('#tracks .lab.g', 'trGraph', 'in'),
];
const WEB_OK = ['#bDraftTop', '#bDraft', '#bGens'];   // these work without the helper when the page can generate by itself (generate-web.js)
const NEEDS_HELPER = ['#bDraftTop', '#bDraft', '#bGens', '#bFix', '#amenu [data-k=review]', '#amenu [data-k=write]', '#amenu [data-k=preview]', '#amenu [data-k=frames]', '#amenu [data-k=history]'];
const tagOf = (id) => { const v = document.getElementById(id); return v && v.querySelector('.tag'); };
const lab = (q) => { const i = document.querySelector(q); return i && i.closest('label'); };
const labText = (t) => [...document.querySelectorAll('#tracks .lab')].find((l) => (l.firstChild && l.firstChild.nodeType === 3 ? l.firstChild.textContent.trim() : '') === t);
const find = (sel) => (typeof sel === 'function' ? sel() : document.querySelector(sel));

const CSS = `
  .ugq{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;flex:none;box-sizing:border-box;border:1px solid #5a5a66;background:#15161b;color:#d7d8df;font:700 10.5px/1 'Space Grotesk',system-ui,sans-serif;cursor:help;user-select:none;transition:background .12s,border-color .12s,color .12s;vertical-align:middle}
  .ugq:hover,.ugq:focus-visible,.ugq[aria-expanded=true]{background:#2b55f0;border-color:#2b55f0;color:#fff;outline:none}
  .uga{position:relative;flex:none;width:0;align-self:stretch;display:block;pointer-events:none;z-index:7}
  .uga .ugq{position:absolute;top:-6px;left:-11px;pointer-events:auto}
  .ugin{margin-left:5px} .vhd .ugq{margin-left:2px}
  body.ug-hide .ugq{display:none!important}
  #ugPop{position:fixed;z-index:500;display:none;width:min(320px,calc(100vw - 20px));background:#0b0c0d;border:1px solid #3a3a43;border-radius:12px;padding:14px 16px 12px;color:#e9e9ee;font:400 13.5px/1.5 'Hanken Grotesk',system-ui,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.6)}
  #ugPop .ugh{display:flex;align-items:flex-start;gap:8px;margin-bottom:6px} #ugPop .ugh b{flex:1;font:600 15.5px/1.3 'Space Grotesk',system-ui,sans-serif;color:#fff}
  #ugPop .ugx{flex:none;width:26px;height:26px;margin:-4px -6px 0 0;border:0;border-radius:8px;background:transparent;color:#9b9ca6;font:400 19px/1 system-ui;cursor:pointer} #ugPop .ugx:hover{background:#ffffff14;color:#fff}
  #ugPop p{margin:0 0 8px;color:#c9cad3} #ugPop ol{margin:0 0 8px;padding-left:20px;color:#c9cad3} #ugPop li{margin:2px 0}
  #ugPop .ugk{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 2px} #ugPop kbd{font:500 11.5px 'IBM Plex Mono',monospace;background:#15161b;border:1px solid #3a3a43;border-bottom-width:2px;border-radius:6px;padding:1px 6px;color:#e9e9ee}
  #ugPop .ugn{margin-top:8px;padding:8px 10px;border:1px solid #26262c;border-radius:9px;color:#9b9ca6;font-size:12.5px} #ugPop .ugn.off{border-color:#7a5a1e;color:#f0c46a}
  #ugPop .ugarr{position:absolute;width:12px;height:12px;background:#0b0c0d;border-left:1px solid #3a3a43;border-top:1px solid #3a3a43;transform:rotate(45deg)}
  #ugPop.up .ugarr{border:0;border-right:1px solid #3a3a43;border-bottom:1px solid #3a3a43}
  .ug-off{opacity:.42!important;filter:saturate(.3);cursor:not-allowed!important}
  /* top bar: two tidy rows, with a name above each group of tools */
  #tb{row-gap:8px!important;align-items:center!important}
  #tb > b{flex:0 1 auto;min-width:0;max-width:300px;overflow:hidden} #tb > b .sub{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;max-width:200px;vertical-align:middle}
  /* (the editor makes every span with a style attribute a stretching spacer: these rules undo that for the guide's own pieces and the Tein button) */
  #tb > span.ugsp[style]{flex:1 1 0px!important;min-width:8px;height:1px} #tb > span.ugbr[style],#tb > span.ugbr{flex:0 0 100%!important;height:0;margin:0;padding:0}
  #tb > span.uga[style],#tb > span.uga{flex:0 0 0px!important;width:0!important;min-width:0!important;padding:0!important}
  #tb > span.ugcap[style],#tb > span.ugcap{flex:0 0 auto!important}
  #tb .ugcap{font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#7d7e89;white-space:nowrap;padding:0 2px 0 12px;margin-left:4px;border-left:1px solid #26262c;height:22px;display:inline-flex;align-items:center}
  #tb .ugcap.first{border-left:0;padding-left:0;margin-left:0}
.stcap{font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#7d7e89;white-space:nowrap;padding:0 2px 0 12px;margin-left:4px;border-left:1px solid #26262c;height:22px;display:inline-flex;align-items:center;flex:0 0 auto}
  #tb .ddt.ugl,#tb button.io.ugl{width:auto!important;min-width:0!important;padding:0 11px 0 10px!important;display:inline-flex!important;align-items:center;gap:6px}
  #tb .uglbl{font:600 13px 'Space Grotesk',system-ui,sans-serif;white-space:nowrap}
  #tb > span#tnHost[style],#tb #tnHost{flex:0 0 auto!important;width:auto!important}
  #tb #sLayout{width:auto!important;max-width:150px}
  #tb > button:not(.io):not(.gen),#tb > .dd > .ddt{padding-left:11px!important;padding-right:11px!important}
  @media (max-width:1400px){ #tb .ugcap,#tb .stcap{display:none!important} #tb > b .sub{max-width:96px} }
  /* side panel tabs: a word under every icon */
  #insp .tabs button{flex-direction:column!important;height:48px!important;gap:3px!important;padding:4px 2px!important;font-size:11.5px!important;line-height:1.1}
  body #insp .tabs.icons button span,body #insp .tabs button span{display:block!important}
  /* timeline: room for the marks next to the track names */
  body.clean #tl #tracks{grid-template-columns:152px calc((100% - 152px) * var(--tz,1))!important}
  .lab .ugin{margin-left:4px}
  #insp .inf,#tracks .lab .inf{display:none!important}
  /* menus never run off the screen */
  .pop.ugfit{left:auto!important;right:0!important}
`;

export function mountGuide() {
  if (document.getElementById('ugCss')) return;
  const css = document.createElement('style'); css.id = 'ugCss'; css.textContent = CSS; document.head.appendChild(css);
  let marksOn = true; try { marksOn = localStorage.getItem(LS_MARKS) !== '0'; } catch (e) {}
  document.body.classList.toggle('ug-hide', !marksOn);
  const hosted = !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let helperUp = null;

  // ---------- the pop-up
  const pop = document.createElement('div'); pop.id = 'ugPop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-labelledby', 'ugT'); document.body.appendChild(pop);
  let openFor = null;
  const helperNote = () => hosted
    ? 'This copy runs from a web address, so it cannot reach the helper program that makes videos, keeps your keys and runs Claude. To use it: download the editor, run <b>npm install</b> then <b>npm start</b>, and open http://localhost:5811.'
    : 'The helper program is not running. In the editor\'s folder run <b>npm start</b>; this unlocks by itself within a few seconds.';
  const webMode = () => helperUp === false && !!window.WEBGEN;
  const fill = (key, off) => { if (webMode() && H[key + 'Web']) key = key + 'Web'; const h = H[key] || { t: key, w: '' };
    pop.innerHTML = `<span class="ugarr"></span><div class="ugh"><b id="ugT">${esc(off ? h.t + ': not available here' : h.t)}</b><button class="ugx" aria-label="Close">×</button></div>
      ${off ? `<p>${helperNote()}</p><p style="color:#9b9ca6">What it does: ${esc(h.w)}</p>` : `<p>${esc(h.w)}</p>${h.s ? `<ol>${h.s.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}${h.n ? `<p style="color:#9b9ca6">${esc(h.n)}</p>` : ''}`}
      ${h.k && !off ? `<div class="ugk">${h.k.map((x) => `<kbd>${esc(x)}</kbd>`).join('')}</div>` : ''}
      ${h.helper && !off && helperUp === false ? `<div class="ugn off">Not available right now: ${hosted ? 'this copy runs from a web address and cannot reach the helper on your computer.' : 'the helper program is not running (npm start).'}</div>` : ''}`;
    pop.querySelector('.ugx').onclick = () => close(true); };
  const place = (anchor) => { const r = anchor.getBoundingClientRect(), c = anchor._ctl && document.contains(anchor._ctl) ? anchor._ctl.getBoundingClientRect() : r; pop.style.display = 'block'; const w = pop.offsetWidth, h = pop.offsetHeight, cx = r.left + r.width / 2;
    // below the control the mark belongs to, so the pop-up never covers the control it explains
    let left = Math.round(Math.max(10, Math.min(innerWidth - w - 10, cx - w / 2))), top = Math.round(Math.max(r.bottom, c.bottom) + 10), up = false;
    if (top + h > innerHeight - 10 && Math.min(r.top, c.top) - h - 10 > 10) { top = Math.round(Math.min(r.top, c.top) - h - 10); up = true; }
    top = Math.max(10, Math.min(innerHeight - h - 10, top));
    pop.style.left = left + 'px'; pop.style.top = top + 'px'; pop.classList.toggle('up', up);
    const a = pop.querySelector('.ugarr'); a.style.left = Math.round(Math.max(14, Math.min(w - 26, cx - left - 6))) + 'px'; a.style.top = up ? '' : '-7px'; a.style.bottom = up ? '-7px' : ''; };
  const open = (anchor, key, off) => { if (openFor === anchor && pop.style.display === 'block') return close(true); close(); openFor = anchor; fill(key, off); place(anchor); if (anchor.classList.contains('ugq')) anchor.setAttribute('aria-expanded', 'true'); pop.querySelector('.ugx').focus({ preventScroll: true }); };
  const close = (refocus) => { if (pop.style.display !== 'block') return; pop.style.display = 'none'; const a = openFor; openFor = null; if (a && a.classList.contains('ugq')) { a.setAttribute('aria-expanded', 'false'); if (refocus) a.focus({ preventScroll: true }); } };
  for (const ev of ['pointerdown', 'wheel', 'keyup']) pop.addEventListener(ev, (e) => e.stopPropagation());
  pop.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') close(true); });
  document.addEventListener('pointerdown', (e) => { if (pop.style.display === 'block' && !pop.contains(e.target) && !e.target.closest('.ugq')) close(); }, true);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && pop.style.display === 'block') close(true); }, true);
  addEventListener('resize', () => { if (openFor && pop.style.display === 'block') { if (document.contains(openFor)) place(openFor); else close(); } });
  document.addEventListener('scroll', () => { if (openFor && pop.style.display === 'block') { if (document.contains(openFor)) place(openFor); else close(); } }, true);

  // ---------- the "?" marks
  const mark = (key) => { const q = document.createElement('span'); q.className = 'ugq'; q.textContent = '?'; q.tabIndex = 0; q.setAttribute('role', 'button'); q.dataset.ug = key;
    q.setAttribute('aria-label', 'What is ' + (H[key] ? H[key].t : key) + '?'); q.setAttribute('aria-haspopup', 'dialog'); q.setAttribute('aria-expanded', 'false'); q.title = 'What is this?';
    q.addEventListener('pointerdown', (e) => e.stopPropagation());
    q.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); open(q, key); });
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); open(q, key); } });
    return q; };
  const attach = () => {
    for (const t of TARGETS) { const el = find(t.sel); if (!el || el.dataset.ugMarked) continue;
      const host = el.closest('.dd') && el.classList.contains('ddt') ? el.closest('.dd') : el.id === 'tnGear' && el.closest('#tnHost') ? el.closest('#tnHost') : el;
      el.dataset.ugMarked = '1';
      if (t.mode === 'in') { const q = mark(t.key); q.classList.add('ugin'); q._ctl = el; if (el.classList.contains('tag')) el.after(q); else { const eye = el.querySelector('.eye'); if (eye) el.insertBefore(q, eye); else el.appendChild(q); } continue; }
      const a = document.createElement('span'); a.className = 'uga'; const mq = mark(t.key); mq._ctl = host; a.appendChild(mq);
      const par = host.parentElement, gap = par ? parseFloat(getComputedStyle(par).columnGap) || 0 : 0; a.style.marginLeft = -gap + 'px';
      if (par && par.id === 'tb') a.style.order = host.style.order;
      host.after(a); }
    // the panel's own "i" marks become "?" marks with the same pop-up
    // (the "i" stays in place but hidden: the editor puts one back whenever it is missing)
    for (const i of document.querySelectorAll('#insp .inf:not([data-ug-done])')) { i.dataset.ugDone = '1'; const txt = i.title, head = (i.parentElement.firstChild && i.parentElement.firstChild.textContent || '').trim();
      const key = 'inf:' + head; H[key] = { t: head.charAt(0).toUpperCase() + head.slice(1).toLowerCase(), w: txt }; const q = mark(key); q.classList.add('ugin'); i.after(q); }
  };

  // ---------- the top bar in two rows: [title, Back … Undo Redo Generations File Panel Help, API keys, Generate] / [CAMERA … SHOT … | SCREEN]
  const tb = document.getElementById('tb');
  const mk = (tag, cls, html) => { const e = document.createElement(tag); e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const label = (btn, text) => { if (!btn || btn.querySelector('.uglbl')) return; const s = mk('span', 'uglbl', esc(text)), car = btn.querySelector('.car'); if (car) btn.insertBefore(s, car); else btn.appendChild(s); btn.classList.add('ugl'); };
  let helpDD = null;
  const layoutBar = () => {
    if (!tb) return;
    for (const s of tb.querySelectorAll(':scope > span:not([id]):not([class])')) s.style.display = 'none';   // the editor's own spacers
    if (!tb.querySelector('.ugsp')) {
      tb.append(mk('span', 'ugsp ug1'), mk('span', 'ugbr'), mk('span', 'ugcap first', 'Camera'), mk('span', 'ugcap', 'Shot'), mk('span', 'ugsp ug2'), mk('span', 'ugcap', 'Screen'));
      // Help ▾: the ? marks on or off, the shortcuts and the tour
      helpDD = mk('div', 'dd'); helpDD.id = 'ugHelpDD';
      helpDD.innerHTML = `<button class="ddt ugl" id="ugHelp" title="Help: what everything does, shortcuts, tour"><span class="uglbl">? Help</span><span class="car">▾</span></button><div class="pop r"><div class="cap">Help</div><button id="ugMarks" class="tog" data-keep="1">Show the ? marks</button><button id="ugKeys">Keyboard shortcuts</button><button id="ugTour">Take the tour</button></div>`;
      tb.append(helpDD);
      const p = helpDD.querySelector('.pop'), b = helpDD.querySelector('#ugHelp');
      b.onclick = (e) => { e.stopPropagation(); const was = p.classList.contains('open'); for (const o of document.querySelectorAll('.pop.open,.vbar.open')) o.classList.remove('open'); if (!was) { p.classList.add('open'); fitPop(p); } };
      p.addEventListener('pointerdown', (e) => e.stopPropagation());
      const syncMarks = () => helpDD.querySelector('#ugMarks').classList.toggle('on', marksOn); syncMarks();
      helpDD.querySelector('#ugMarks').onclick = () => { marksOn = !marksOn; try { localStorage.setItem(LS_MARKS, marksOn ? '1' : '0'); } catch (e) {} document.body.classList.toggle('ug-hide', !marksOn); syncMarks(); };
      helpDD.querySelector('#ugKeys').onclick = () => { p.classList.remove('open'); const h = document.getElementById('bHelp'); if (h) h.click(); };
      helpDD.querySelector('#ugTour').onclick = () => { p.classList.remove('open'); if (window.TOUR) window.TOUR.start(); };
    }
    const ddOf = (id) => { const b = document.getElementById(id); return b && b.closest('.dd'); };
    const ORDER = [[tb.querySelector(':scope > b'), 1], ['bBack', 2], ['stScenes', 2], ['stMode', 2], [tb.querySelector('.ug1'), 3], ['bUndo', 4], ['bRedo', 5], ['bGens', 6], [ddOf('ddFile'), 7], ['bInsp', 8], [helpDD || document.getElementById('ugHelpDD'), 9], ['tnHost', 10], ['bDraftTop', 11],
      [tb.querySelector('.ugbr'), 20], [tb.querySelector('.ugcap.first'), 22], [ddOf('ddTool'), 23], ['bKey', 24], ['bAnimate', 25], [ddOf('ddKeys'), 26], ['bMoves', 27], ['bTrack', 28],
      [[...tb.querySelectorAll('.ugcap')][1], 30], ['bSplit', 31], ['bZoom', 32], ['bZoomReset', 33], [tb.querySelector('.ug2'), 40], [[...tb.querySelectorAll('.ugcap')][2], 41], ['sLayout', 42], [ddOf('ddView'), 43]];
    for (const [x, o] of ORDER) { const e = typeof x === 'string' ? document.getElementById(x) : x; if (e && e.parentElement === tb) { e.style.order = o; const n = e.nextElementSibling; if (n && n.classList.contains('uga')) n.style.order = o; } }
    for (const c of tb.children) if (!c.style.order && !c.classList.contains('uga')) c.style.order = 50;
    const h = document.getElementById('bHelp'); if (h) h.style.display = 'none';   // its job moved into Help ▾ (the ? key still works)
    label(document.getElementById('ddTool'), 'Tool'); label(document.getElementById('ddKeys'), 'Keys'); label(document.getElementById('ddView'), 'View'); label(document.getElementById('ddFile'), 'File');
    label(document.getElementById('bGens'), 'Generations'); label(document.getElementById('bInsp'), 'Panel');
    const sl = document.getElementById('sLayout'); if (sl && !sl.dataset.ugRen) { sl.dataset.ugRen = '1'; for (const o of sl.options) o.textContent = o.textContent.replace(/^Layout: /, 'Layout · '); }
    const z = document.getElementById('bZoom'); if (z && !z.dataset.ugRen) { z.dataset.ugRen = '1'; for (const n of z.childNodes) if (n.nodeType === 3 && /Zoom into frame/.test(n.textContent)) n.textContent = n.textContent.replace('Zoom into frame', 'Zoom in'); }
  };

  // ---------- plainer names for the views and the "Camera" track
  const rename = () => {
    for (const [id, name] of [['vDir', '3D view'], ['vTop', 'Plan (from above)'], ['vCam', 'Final shot']]) { const t = tagOf(id); if (t && t.dataset.full !== name) { t.dataset.full = name; t.textContent = name; t.title = name; } }
    const le = document.getElementById('lEdit'); if (le && le.firstChild && le.firstChild.nodeType === 3 && le.firstChild.textContent.trim() === 'Camera') le.firstChild.textContent = 'Your keys';
  };

  // ---------- menus that would run off the right edge open to the left instead
  const fitPop = (p) => { p.classList.remove('ugfit'); const r = p.getBoundingClientRect(); if (r.right > innerWidth - 6) p.classList.add('ugfit'); };
  document.addEventListener('click', (e) => { if (!e.target.closest('.ddt')) return; requestAnimationFrame(() => { for (const p of document.querySelectorAll('.pop.open')) fitPop(p); }); }, true);   // capture: the menu buttons stop the click from bubbling

  // ---------- controls that need the helper: greyed out while it cannot be reached, and a click says why
  const gate = () => { for (const q of NEEDS_HELPER) for (const e of document.querySelectorAll(q)) { const off = helperUp === false && !(window.WEBGEN && WEB_OK.includes(q)); e.classList.toggle('ug-off', off); if (off) e.setAttribute('aria-disabled', 'true'); else e.removeAttribute('aria-disabled'); } };
  // from a web address, Generate and Generations open the page's own Generate (generate-web.js) instead of the helper's
  document.addEventListener('click', (e) => { if (!webMode() || e.target.closest('.ugq')) return; const b = e.target.closest('#bDraftTop,#bDraft,#bGens'); if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation(); window.WEBGEN.open(b.id === 'bGens' ? 'videos' : 'new'); }, true);
  window.addEventListener('webgen-ready', () => gate());
  document.addEventListener('click', (e) => { const off = e.target.closest('.ug-off'); if (!off) return; e.preventDefault(); e.stopImmediatePropagation();
    const key = off.id === 'bDraftTop' || off.id === 'bDraft' ? 'generate' : off.id === 'bGens' ? 'gens' : off.id === 'bFix' ? 'fix' : 'assist';
    open(off, key, true); }, true);
  // (a slow answer is not a missing helper: only a refused connection or an error answer greys the controls, so a busy laptop never locks them)
  let pinging = false; const ping = async () => { if (pinging) return; pinging = true; let up = null;
    try { const r = await fetch(BR() + '/api/info', { signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined }); up = r.ok; } catch (e) { up = e && e.name === 'TimeoutError' ? null : false; }
    pinging = false; if (up !== null && up !== helperUp) { helperUp = up; gate(); window.dispatchEvent(new CustomEvent('helper-status', { detail: up })); } };
  ping(); setInterval(() => { if (!document.hidden && !(hosted && helperUp === false)) ping(); }, 10000); addEventListener('focus', ping);

  // ---------- run now and whenever the editor adds or rebuilds controls (cheap, at most twice a second)
  let due = 0; const tick = () => { due = 0; layoutBar(); rename(); attach(); gate(); };
  tick(); new MutationObserver(() => { if (!due) due = setTimeout(tick, 400); }).observe(document.getElementById('ed') || document.body, { childList: true, subtree: true });
  window.GUIDE = { open: (key, anchor) => open(anchor || document.body, key), H };
}
