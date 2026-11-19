# Golden Coast Cover Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/flamsx/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/flamsx/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

A web app that turns any photo and caption into GTA-style cover art — the
multi-panel poster look with bold lettering and a Vice City sunset or neon
colour grade — exported as a PNG to share. It runs offline in a desktop
browser from its own static files: photos never leave the machine.

An entry for the [make.fun](https://make.fun/bounty/gta6-cover-art-01)
bounty **gta6-cover-art-01** ("Make GTA 6 Cover Art").

## What it does

- **7 layouts**: hero, comic, 9-panel, 1-panel, 2-panel, 3-panel, 4-panel
- **6 gradient-map grades**: Vice Sunset, Neon Night, Golden Hour,
  Duotone Pink/Teal, Comic Ink (halftone), Natural — plus strength,
  contrast, saturation, grain and vignette sliders and a halftone toggle
- **Any photo**: upload your own, crop and position each panel (drag to
  pan, scroll to zoom, double-click to re-center), fill all panels from
  one photo or spread photos across panels, edit the caption
  (title, subtitle, tagline, press quote)
- **Fast**: a photo to a PNG in 1080 × 1080, 1080 × 1350 or 1920 × 1080,
  or all three sizes at once; undo/redo included
- **Original art**: no Rockstar Games logo, artwork or font. Lettering is
  Anton + Pacifico (SIL Open Font License, vendored under `app/fonts/`).
  Sample photos are freely licensed — see
  `app/samples/ATTRIBUTION.md`.

## Try it

```sh
node serve.ts   # serves app/ at http://localhost:8080
```

Open the page, add photos, pick a layout and grade, edit the caption,
export a PNG.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE).
