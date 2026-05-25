# Design: img-convert refactor + grayscale flag

**Date:** 2026-05-25  
**Branch:** 2026

## Summary

Move `img-convert.js` from the project root to `scripts/img-convert.js` and add a `--grayscale` (`-g`) flag that applies `sharp`'s `.grayscale()` before WebP conversion.

## Goals

- Clean up the project root (only `gulpfile.js`, `package.json`, and configs remain)
- Add black-and-white conversion capability as a single flag
- Provide convenient `npm run img` / `npm run img:bw` aliases

## Architecture

### File move

```
img-convert.js  →  scripts/img-convert.js
```

No logic changes required by the move itself.

### `--grayscale` / `-g` flag

Added to `parseArgs()`:

```js
opts.grayscale = false;
// ...
else if (arg === '-g' || arg === '--grayscale') { opts.grayscale = true; }
```

Applied in `convertFile()` immediately after `sharp(inputFile)` and before `.webp()`:

```js
if (opts.grayscale) {
  pipeline = pipeline.grayscale();
}
```

Log line gets a `[grayscale]` suffix when the flag is active.

### package.json scripts

```json
"scripts": {
  "img": "node scripts/img-convert.js",
  "img:bw": "node scripts/img-convert.js --grayscale"
}
```

Usage:
```bash
npm run img -- ./photos
npm run img -- ./photos -o ./output --width 1920
npm run img:bw -- ./img/members
npm run img:bw -- photo.jpg -o ./out -q 85
```

### CLAUDE.md updates

- Example paths updated from `img-convert.js` to `scripts/img-convert.js`
- Add `--grayscale` example in the Commands section

## Error handling

No new error surface — `sharp().grayscale()` does not throw for supported formats. Existing try/catch in `main()` covers all pipeline errors.

## Out of scope

- No changes to WebP quality defaults
- No separate `img-bw.js` script
- No recursive subdirectory traversal changes
