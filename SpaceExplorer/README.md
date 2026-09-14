# SpaceExplorer

Interactive solar system built as a static Three.js app, with textured planets, moving orbits, and close-up views.

## Run Locally

```bash
python3 -m http.server 4173
```

Open [localhost:4173](http://localhost:4173/). The solar system opens directly; a small loading notice disappears when its textures are ready. No launch screen or pointer lock is required.

## Explore

- Drag to orbit the camera; scroll, pinch, or use the zoom buttons to move closer.
- Select a planet, its label, or its navigation button to update the information panel. Choose **Discover** or **Close-up** to approach it and follow its orbit.
- Use **Solar system** to return to the overview. Toggle the top view, orbit guides, and labels from the view controls.
- Visit the Moon from Earth's information panel, or use **Take a little journey** for a guided tour of the Sun and eight planets.
- Pause time, change its speed, or reset to day one. At 1×, one simulated day lasts 100 seconds; 10× and 100× accelerate both axial rotation and orbits. Jupiter, the fastest-spinning planet, takes about 41 seconds per turn at the default pace. The field guide also provides a timeline reset on small screens.
- Read each world's rotation period in the information panel. On phones, **Details** opens its description and complete statistics without covering the planet.
- Enable **Drift** for a gently moving camera, or enter **Immersive view** for a minimal view of the cosmos. The journey visits all nine worlds, then returns to the overview; camera gestures and manual navigation interrupt it immediately.
- Ambient sound is optional and starts only when enabled. It fades out when muted and suspends while the tab is hidden.
- Motion follows the device preference by default. Choose **Full motion** or **Reduced motion** in the field guide. Reduced motion starts time paused, uses instant camera transitions, and disables drift.

Keyboard shortcuts: **Space** pauses or resumes, **Left/Right** selects the previous or next planet, **+/−** zooms, **H** toggles immersive view, **M** toggles sound, and **T** toggles the journey. **Escape** exits immersive view or returns to the overview. Shortcuts leave form controls, dialogs, and browser modifier shortcuts to their normal behavior.

## Languages

Use the language button in the header or immersive controls to choose **English, Français, Nederlands, Deutsch, or العربية**. Switching updates the interface, world descriptions, scene labels, numbers, and accessibility labels without resetting the camera or simulation. Arabic uses a right-to-left layout.

The choice is saved locally. A `?lang=fr` URL overrides the saved preference; otherwise the app uses a supported browser language, with English as the fallback. Written guides and planet pages have translated versions under `/fr/`, `/nl/`, `/de/`, and `/ar/`, with language links that stay on the same page. Translation catalogs are in `locales/`.

Planet sizes and orbital distances are adapted for exploration. Orbital periods, eccentricities, axial tilts, and rotation periods inform the animation, but starting positions are illustrative. This is not a live sky chart. Reference values and source links are in `solar-data.mjs`.

## Learn

Open [the learning hub](https://sadik-dev.github.io/SpaceExplorer/learn/?lang=en) for three short missions about days and years, planet families, and the Moon. Each includes reading, an interactive experiment, questions with explanations, and a reflection prompt. Answers and progress stay in the current browser and can be reset. All lessons and controls are available in the five languages.

- The planet atlas compares ten worlds without loading WebGL, textures, or the 3D engine. Larger text and read-aloud controls are available; speech needs a matching voice on the device.
- **Save for offline use** explicitly downloads the lightweight lessons and atlas. PDFs, the 3D viewer, and external research websites are not included. Browsers may clear saved files; the interface checks whether the lesson cache is complete.
- Educators can download separate student worksheets and answer guides as PDF or standalone HTML. The HTML can also be printed. Mission links preserve the chosen language, and the resource page provides an iframe embed.
- The research page points to independent Zooniverse projects and Universe Awareness materials. SpaceExplorer does not run those projects or claim affiliation.
- Feedback is a local text export for the learner to share. The form does not send responses or collect impact statistics.

Learning content lives in `learning/locales/`. After editing it, regenerate the lesson packs with `node tools/generate-learning-resources.mjs --pdf` (Chrome required), then rebuild. The plain command without `--pdf` regenerates HTML only. Keep the downloadable PDFs synchronized with their HTML versions.

Run all unit and content tests with `node --test tools/*.test.mjs`. Run `node tools/learning-browser-check.mjs` after building for the five-language mission flows, mobile and RTL layouts, downloads, offline navigation, and restricted storage. The lightweight entry has a 450 KiB resource budget.

## Test Checklist

- Textures load and the notice disappears without console errors or missing resources.
- All eight planets and the Sun can be selected; the panel and highlighted orbit match the selection.
- Close-up views follow the selected body; returning to the overview restores the whole system.
- The Moon follows Earth; Saturn's rings and Earth's clouds render correctly.
- Pause, speed, reset time, top view, orbit visibility, and label visibility work.
- Dragging the camera does not accidentally select a planet.
- Keyboard controls, dialogs, the guided tour, and mobile navigation work.
- A visible guide link remains available when WebGL cannot initialize.

Run the orbital, camera, gesture, journey, and audio tests with:

```bash
node --test tools/solar-data.test.mjs tools/camera-motion.test.mjs tools/journey.test.mjs tools/ambient-audio.test.mjs tools/i18n.test.mjs tools/localized-pages.test.mjs
```

## Assets

High quality planet textures in `assets/sss/` are from Solar System Scope Texture Library and are licensed under Creative Commons Attribution 4.0 International. See `NOTICE.md`.

## Production SEO

- `index.html` includes canonical, robots, Open Graph, Twitter card, Web App Manifest, and JSON-LD metadata.
- Static SEO landing pages are generated for the solar system guide, 3D viewer, kids guide, and each major planet.
- `robots.txt` and `sitemap.xml` are included for crawler discovery.
- Social preview assets live at `assets/spaceexplorer-preview.png` and `assets/spaceexplorer-preview.svg`.
- The production address is [sadik-dev.github.io/SpaceExplorer](https://sadik-dev.github.io/SpaceExplorer/). Canonical URLs, social metadata, translated pages, the sitemap, and lesson packs use this address, configured in `site-config.mjs`.

## Production Build

```bash
node tools/generate-seo-pages.mjs
node tools/generate-learning-resources.mjs --pdf
node tools/build-production.mjs
node tools/learning-browser-check.mjs
node tools/performance-check.mjs
node tools/performance-check.mjs --no-webgl
node tools/performance-check.mjs --missing-texture
```

Deploy `dist/`, not the full repository. The production build keeps only the active app, local Three.js vendor files, SEO pages, manifest, sitemap, and the optimized SpaceExplorer assets. Legacy source models and unused raw assets stay in the repo but are excluded from deployment.

After rebuilding and checking `dist/`, copy its contents into `SpaceExplorer/` in the public `Sadik-Dev/sadik-dev.github.io` repository. Keep that repository's existing site files and configuration intact, then commit and push the deployment files to its Pages publishing branch. Only the production build is published; the source repository remains private. Verify the viewer, learning hub, translated guides, and downloads at [sadik-dev.github.io/SpaceExplorer](https://sadik-dev.github.io/SpaceExplorer/) after GitHub Pages finishes publishing.

The earlier [Cloudflare Pages address](https://spaceexplorer-sadikdev.pages.dev/) retains its previously deployed copy. Publishing to GitHub Pages does not update that copy.

The performance check requires a current Node.js release and Chrome or Chromium on Windows, macOS, or Linux. It serves `dist/`, opens headless Chrome, checks initialization and loading, and fails on runtime errors or missing resources. A visible WebGL fallback is reported explicitly. Budgets are 10 MiB for first-load resources and 15 MiB for the deployed directory.
