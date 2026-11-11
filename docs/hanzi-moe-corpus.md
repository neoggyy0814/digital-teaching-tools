# Taiwan MOE Stroke-Order Corpus

## Scope

The formal teaching-data authority for the Chinese stroke-order practice tool
is the Taiwan Ministry of Education's 2025 《國字標準字體筆順學習網》 corpus. The
official 6,063-character download is the only character-discovery source. No
other Traditional Chinese corpus is merged into the runtime data, and runtime
loading fails closed for codepoints outside this corpus.

## Reproducible Pipeline

1. `npm run hanzi:corpus:generate -- --out .moe-stroke-staging`
   downloads the official `6063png.zip`, decodes its mixed Big5/UTF-8 entry
   names, requires exactly 6,063 unique single-codepoint PNG basenames, fetches
   each official `dictView.jsp?ID=<decimal-codepoint>` page, extracts its keyed
   XML, and writes normalized staging JSON plus a checkpoint and manifest.
2. `npm run hanzi:corpus:validate -- .moe-stroke-staging` independently checks
   file counts, hashes, JSON structure, SVG path grammar, stroke/median counts,
   median points, finite coordinates, source bounds, and all manifest entries.
3. `npm run hanzi:corpus:publish -- .moe-stroke-staging public/hanzi-data/moe`
   refuses to publish unless the staging validation report passes at
   6,063/6,063.

The implementation is under `scripts/hanzi/`. Staging XML and checkpoints are
excluded from version control. The deployable corpus is stored as lowercase
Unicode hexadecimal filenames in `public/hanzi-data/moe/` and is copied by
Vite as an ordinary static asset.

## Source Schema and Adapter

The official XML is `Word -> Stroke -> Outline + Track`. Outline commands are
`MoveTo`, `LineTo`, `QuadTo`, and `CubicTo`. Track points may be represented by
`MoveTo` or `LineTo`; the official renderer consumes their `x/y` endpoints in
document order. The source coordinate space is a 2,048 by 2,048 square with Y
increasing downwards.

Every character uses the same conversion:

```text
x' = x / 2
y' = 900 - y / 2
Outline -> SVG M/L/Q/C/Z
Track endpoints -> Hanzi Writer medians, preserving source order
```

There are no per-character transforms, overrides, manual repairs, or fallback
data sources.

One upstream serialization warning is retained in the manifest: the only
non-BMP corpus character, U+2546E `𥑮`, is correctly identified by the official
ZIP filename, decimal page ID, keyed `xml[152686]` assignment, and page
`word/uni` fields, but the XML's own `unicode` attribute is lossy (`?`). The
pipeline accepts this only through a general non-BMP identity rule requiring
those independent official page identifiers to agree.

## Licensing and Attribution

The Ministry of Education states that the stroke animation and full
stroke-order materials are licensed under CC BY-NC-ND 3.0 Taiwan and may not be
used commercially. Attribution must name the Ministry of Education and link to
the source site. The generated teaching corpus remains Ministry of Education
material and is not CC0.

The independently written g0v/moedict.tw code and data-processing tooling is
published under CC0 1.0. This project studied its current 6,063-character
discovery and XML parsing approach but implements and validates its own Hanzi
Writer adapter. The tooling license does not alter the Ministry of Education
teaching-data license.

See `public/hanzi-data/moe/NOTICE.txt` for the notice distributed with the
runtime corpus.
