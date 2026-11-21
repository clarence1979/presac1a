// Stamp a release: one version for every module the pages load, so browsers can cache them and still get a matching set after an update.
//   node tools/stamp.mjs [version]        (npm run stamp; run it before publishing a change to any .js file)
// What it does, in index.html, projects/*/index.html and the page template of tools/previs/build.mjs:
//   - sets window.POV_V (a short version string) in a small script right after the import map; the same script asks the browser to fetch the
//     editor's modules early (modulepreload) when the page opens as the editor, so they download while the 3D scene is being built
//   - the pages then load editor.js?v=<POV_V>, and editor.js loads its late modules with the same ?v (it reads it from its own address)
// Before this, every page load added ?v=<the time now>, so nothing the editor loads was ever taken from the browser's cache.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), V = (process.argv[2] || new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')).replace(/[^a-z0-9.]/gi, '');
const PRE = ['editor.js?v=V', 'deps/jsm/OrbitControls.js', 'deps/jsm/TransformControls.js', 'moves.js', 'moves-core.js', 'build.js', 'back.js', 'brand/tein-logo.js', 'tein-ui.js?v=V', 'draft.js?v=V', 'generate-web.js?v=V', 'ui-guide.js?v=V', 'studio-ui.js?v=V', 'studio-templates.js', 'models.js', 'prompt-simple.js'].filter((f) => fs.existsSync(path.join(ROOT, f.split('?')[0])));
const head = `<script>/*stamp*/window.POV_V=${JSON.stringify(V)};if(/[?&]editor=/.test(location.search))try{const B=JSON.parse(document.querySelector('script[type=importmap]').textContent).imports.three.replace('deps/three.module.js','');for(const f of ${JSON.stringify(PRE)}){const l=document.createElement('link');l.rel='modulepreload';l.href=B+f.replace('?v=V','?v='+window.POV_V);document.head.appendChild(l)}}catch(e){}</script>`;
const pages = ['index.html', ...fs.readdirSync(path.join(ROOT, 'projects')).map((d) => path.join('projects', d, 'index.html')).filter((f) => fs.existsSync(path.join(ROOT, f))), 'tools/previs/build.mjs', 'tools/previs/lib/glue.js'];
let n = 0;
for (const f of pages) { const p = path.join(ROOT, f); let s = fs.readFileSync(p, 'utf8'); const s0 = s;
  s = s.replace(/(import\('[^']*\?v=' \+ )Date\.now\(\)/g, '$1(window.POV_V || Date.now())');                       // the pages' own late imports (editor.js, start.js)
  s = s.replace(/<script>\/\*stamp\*\/[\s\S]*?<\/script>/, '');                                                   // the last stamp
  if (!/glue\.js$/.test(f)) s = s.replace(/(<script type="importmap">[^<]*<\/script>)/, (m) => m + (f.endsWith('build.mjs') ? head.replace(/\$\{/g, '\\${').replace(/`/g, '\\`') : head));
  if (s !== s0) { fs.writeFileSync(p, s); n++; } console.log((s !== s0 ? 'stamped  ' : 'unchanged') + ' ' + f); }
console.log(`version ${V}: ${n} file(s) written. The editor's own late imports follow the version of editor.js.`);
