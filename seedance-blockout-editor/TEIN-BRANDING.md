# Tein branding for the blockout camera editor (from the TEIN session, TeinAI-Client origin/prod 27af61a, 14 Nov 2026)

## 0. Licence (decision for the maintainer)
Terms section 12: "Tein", the logo and service names are trademarks of Endpoint Studios Inc. Third-party tools may only use accurate, non-prominent references such as "Built on the Tein API". This editor shows the Tein logo because it is built on the Tein API by people who work with Tein; the maintainers decide whether that stays. If you fork this project and ship it under another name, the safe default is a small "Built on the Tein API" line instead of the logo in the header (the logo files are in `brand/`).

## 1. Logo (mark drawn in code: src/components/TeinMark.tsx, viewBox 0 0 15 15)
Dark header: ink #f4f4f6; the blue Signal block stays #1F18C0 (never recolour, never rearrange or round the blocks; no hover state; focus = thin underline).

<svg viewBox="0 0 15 15" width="18" height="18" aria-label="Tein"><g fill="#f4f4f6"><rect x="0" y="0" width="4" height="4" opacity=".5"/><rect x="5.5" y="0" width="4" height="4"/><rect x="0" y="5.5" width="4" height="4" opacity=".16"/><rect x="5.5" y="5.5" width="4" height="4" opacity=".88"/><rect x="11" y="5.5" width="4" height="4" opacity=".22"/><rect x="0" y="11" width="4" height="4" opacity=".12"/><rect x="5.5" y="11" width="2.5" height="2.5" opacity=".6"/><rect x="11" y="11" width="4" height="4" opacity=".18"/></g><rect x="11" y="0" width="4" height="4" fill="#1F18C0"/></svg>

Wordmark: lowercase "tein", 6px right of the mark, Space Grotesk 700, nav 24px, letter-spacing -1.3px (TeinMark: fontSize round(size x 1.15), letter-spacing -0.054em). Favicon: public/favicon.svg. In text: "Tein" (never "TEIN" or "TeinAI").

## 2. Tokens
Fonts (Google Fonts): Space Grotesk 500/600/700 (display, buttons, wordmark), Hanken Grotesk 400-900 (body), IBM Plex Mono 400/500 (small caps kickers, letter-spacing 0.14em), Schibsted Grotesk 600-900 (headline claims).
Dark workspace (src/components/edit/edit.css, best match for the editor): --ed-bg #000, --ed-panel #0b0b0e, --ed-soft #15151a, --ed-line #26262c, --ed-line-strong #3a3a43, --ed-ink #f4f4f6, --ed-muted #9b9ca6, --ed-faint #6d6e78, --ed-r 10px, --ed-signal #2b55f0 (blue on dark). Error border #f07574, error text #ff8d8b / #e5605f, success #6fe09a. No warning token (amber sparingly).
Dark menu (chrome.css 452-462): bg #0b0c0d, ink #f4f4f2, muted #a3a6a7, edge rgba(255,255,255,.13), fill rgba(255,255,255,.065), tile #17191a, no shadow.
Buttons (.ed-btn): min-height 38px, padding 0 16px, 1px border #3a3a43, radius 10px, Space Grotesk 600 13.5px, letter-spacing -0.01em; hover bg #ffffff14 + border #5a5a66; active scale(.97); transitions 0.16s (transform 0.12s). Primary: bg #f4f4f2, text #050606, hover #fff. Quiet: transparent border, muted text.
Light tokens (index.css 35-70) for reference: --tein-blue / --signal #1f18c0 (hover #1b15a8).

## 3. Design rules for Tein surfaces
Square 10px corners (never pills). Every button has a visible hover colour. No modals or popups: menus and panels anchored to their trigger. No backdrop blur. No emojis. Dark tools are true black (#000). Dropdowns show names only; explanations go in a small (i) tooltip.

## 4. Wording
Draft flow: "Draft", "Draft first", "Draft then finalize", "Finalize", "Finalize · 1080p", "Finalize the draft", "Finalize price", "Finalized", "Finalized from draft", "Draft expired". A draft is a 480p preview; Finalize renders the same take at 1080p (or 4K) within 7 days. Model: "Seedance 2.5". Keys: "API key", workspace "credits", "Requests use workspace credits", created in Dashboard → API keys (/dashboard/keys). Prices: USD per second, tiers Starter / Plus / Scale; show cost before a run; "Nothing was charged" when a run is refused or fails. Never name providers or fallbacks; never compare to rivals except fal.
