# Repository guide

- This is a dependency-free, single-page Spanish RoomTI landing page: `index.html` is the markup/content entrypoint, `styles.css` owns all presentation/responsive rules, and `script.js` owns the mobile menu and scroll-driven canvas animation. There are no package manifests, build steps, linters, or automated tests.
- Preview from the repository root with `python3 -m http.server 8000`, then open `http://localhost:8000`. Verify visual changes at desktop and at the CSS/JS mobile breakpoint (`760px`).

## Scroll sequence assets

- The fixed background canvas is driven by `TOTAL_FRAMES = 120` in `script.js`. It requires the consecutively named WebP files `graficas/sequence/frame_0001.webp` through `frame_0120.webp`; keep the count, 1-based four-digit naming, and constant in sync when changing the sequence.
- `frame_0001.webp` is also the eager HTML fallback. Keep it available, and retain the reduced-motion behavior, which shows that static frame instead of the canvas animation.
- `graficas/` holds production images and video. `scratch/` contains sample extraction artifacts, not files used by the page.
