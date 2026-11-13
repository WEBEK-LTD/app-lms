#!/usr/bin/env bash
# 128.9 The demos' short silent loops on the /start cards (public/loops),
# recorded from the real app (the app preview, public/preview-app) and
# encoded small. One command, from platform/web, after `npx next build`:
#
#   bash scripts/demo-loops.sh                  every demo
#   LOOPS=academy,taxi bash scripts/demo-loops.sh   only these (/demo slugs)
#   bash scripts/demo-loops.sh --encode         only encode the recordings already made
#
# tests/screens/demo-loops.screens.ts records them (Playwright's own video,
# with the end-to-end server in memory mode: it makes the demo apps first)
# into .data/demo-loops; ffmpeg then cuts each to its walk and writes
# public/loops/<slug>.webm (VP9) and <slug>.mp4 (H.264, for Safari) at
# 288 × 624, 24 frames a second, no sound. Run it again whenever the demos'
# screens or the app preview change. E2E_PORT picks the server's port.
set -euo pipefail

cd "$(dirname "$0")/.."
RAW=.data/demo-loops
OUT=public/loops
WIDTH=288
HEIGHT=624
# Each file should stay under this (bytes); a bigger one is reported.
LIMIT=600000

command -v ffmpeg >/dev/null || { echo "ffmpeg is needed to encode the loops." >&2; exit 1; }

if [ "${1:-}" != "--encode" ]; then
  npx playwright test --config playwright.screens.config.ts demo-loops --trace off
fi

mkdir -p "$OUT"
over=0
for json in "$RAW"/*.json; do
  slug="$(basename "$json" .json)"
  if [ -n "${LOOPS:-}" ] && [[ ",$LOOPS," != *",$slug,"* ]]; then continue; fi
  start="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).start)' "$json")"
  duration="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).duration)' "$json")"
  filter="fps=24,scale=${WIDTH}:${HEIGHT}:flags=lanczos,setsar=1"
  ffmpeg -v error -y -ss "$start" -i "$RAW/$slug.webm" -t "$duration" -an -vf "$filter" \
    -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 "$OUT/$slug.webm"
  ffmpeg -v error -y -ss "$start" -i "$RAW/$slug.webm" -t "$duration" -an -vf "$filter" \
    -c:v libx264 -crf 28 -preset slow -profile:v main -pix_fmt yuv420p -movflags +faststart "$OUT/$slug.mp4"
  for file in "$OUT/$slug.webm" "$OUT/$slug.mp4"; do
    size="$(wc -c <"$file")"
    printf '%-40s %7d bytes\n' "$file" "$size"
    if [ "$size" -gt "$LIMIT" ]; then over=1; echo "  over $LIMIT bytes" >&2; fi
  done
done
exit "$over"
