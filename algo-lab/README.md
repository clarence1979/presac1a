# Algo Lab

Algo Lab by Dilum Sanjaya ([@DilumSanjaya](https://x.com/DilumSanjaya)): 86 short lessons on data structures and algorithms, each a step-by-step walkthrough with an isometric diagram.

- Original: https://byte-sized-algorithms.vercel.app
- This copy: https://materials.teachingtools.dev/algo-lab/

Mirrored here with the author's permission. All rights remain with the author.

## Changes from the original build

Only the paths were changed so the site runs from this subfolder:

- `index.html`: asset, icon and font links made relative; `og:url` and `og:image` point here (canonical still points to the original).
- `assets/index-*.css`: font `url(/assets/…)` made relative.
- `assets/index-BKyL8mWK.js`: Vite's preload helper returns `../assets/…` instead of `/assets/…`.

Routing is hash-based (`#/lesson-id/step`), so lesson links work on GitHub Pages without a server fallback.
