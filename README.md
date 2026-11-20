# Golden Coast Cover Studio v2

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/flamsx/gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/flamsx/gta6-cover-art/reward.svg)](https://make.fun/c/gta6-cover-art-01)

A web app that turns your photo and a caption into GTA-style cover art — multi-panel posters with a bold gradient title, script subtitle, and a uniform sunset/neon colour grade pulled through every photo. Built for the [make.fun bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **7 layouts** — hero, comic, 9-panel, and 1/2/3/4-panel grids.
- **7 grades** — Vice Sunset, Neon Night, Poster Ink, Golden Hour, Vice Mint, Bubblegum, Noir. Every panel photo is rendered *through* the grade (duotone gradient-map + halftone + posterize + outline), so the photos and the lettering share one art direction.
- **3 cover variants** — Sunset Coast, Neon Nights, Ink City — each a different but cohesive grade.
- **Photo tools** — crop and position each panel by drag, scroll to zoom, double-click to reset; fill all panels with one photo or spread the samples across them; upload your own photo.
- **Caption** — title, subtitle, tagline and quote, all editable live.
- **Export** — PNG in 1080×1080, 1080×1350 and 1920×1080, one at a time or all three.

## Run it

Serve `app/` with any static server and open `app/index.html` in desktop Chrome. It works fully offline — no network requests.

```sh
node serve.ts   # or: python3 -m http.server --directory app 8080
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

Sample photos are license-free stock photos (see `app/samples/ATTRIBUTION.md`). Fonts are Anton and Pacifico under the SIL Open Font License (`app/fonts/`). No Rockstar Games artwork, logo or font is used.
