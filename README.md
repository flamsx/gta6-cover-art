# Golden Coast Cover Studio v2 — GTA 6 Cover Art Maker

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/flamsx/gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/flamsx/gta6-cover-art/reward.svg)](https://make.fun/c/gta6-cover-art-01)

A web app that turns your photos into GTA-style cover art — the multi-panel
poster look with bold caption lettering and a Vice City sunset or neon colour
grade — exported as a PNG to share. Built for the
[make.fun GTA 6 cover art bounty](https://make.fun/bounty/gta6-cover-art-01).

## What v2 changes

v1 lost twice to a rival whose photos were all pulled into one unified grade.
v2 fixes exactly that: **every panel photo is rendered through the selected
grade** — a duotone gradient map (sunset / neon / ink) plus halftone dots,
posterize and a consistent panel outline. The grade is not an overlay on the
title; it is the photo itself. A new **Poster Ink** grade (strong halftone,
thick outline) answers the rival directly, and the grade-strength slider now
drives the photos too. The default grade, Vice Sunset, is active on the
photos from the first load — never a raw photo.

## Features

- **7 layouts**: hero, comic, 9-panel, 1 / 2 / 3 / 4 panels
- **7 grades**: Vice Sunset, Neon Night, Poster Ink, Golden Hour, Vice Mint,
  Bubblegum, Noir — each a full art direction for the photos
- **Any photo**: load your own, or use the 6 free sample photos; crop and
  position each panel (drag, scroll to zoom, double-click to reset);
  fill all panels or spread one photo across them
- **Captions**: title (gradient Anton lettering), script subtitle (Pacifico),
  tagline strip, star row + quote, "COMING SOON" badge
- **Adjust**: grade strength, halftone, contrast, saturation, grain, vignette
- **Export**: PNG in 1080 × 1080, 1080 × 1350 and 1920 × 1080, or all three
  at once; undo / redo; live preview; 3 one-click cover presets
  (Sunset Coast, Neon Nights, Ink City)

## Run it

Serve `app/` with any static server and open `index.html` in desktop
Chrome. It works fully offline — every script, font and image is a file
under `app/`, and photos are read on your own machine, never uploaded.

```sh
python3 -m http.server 8080 --directory app
# open http://localhost:8080
```

## Build the entry

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the kit's
`buildDossier`.

## Credits

- Fonts: Anton and Pacifico (SIL Open Font License), vendored under
  `app/fonts/`.
- Sample photos: free to use, see `app/samples/ATTRIBUTION.md`.
- No Rockstar Games logo, artwork or font is used anywhere.
