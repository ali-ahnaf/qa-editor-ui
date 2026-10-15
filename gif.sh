#!/usr/bin/env bash
# gif.sh <video> — video to GIF at 10 fps, plus a gifsicle-optimized 600px-tall copy.
# Copied from ~/Projects/gif/gif. Adapted from https://gist.github.com/Potherca/18423260e2c9a4324c9ecb0c0a284066
set -euo pipefail

# server.js passes the binaries from ffmpeg-static and gifsicle; standalone runs fall back to PATH.
ffmpeg=${FFMPEG:-ffmpeg}
gifsicle=${GIFSICLE:-gifsicle}
command -v "$ffmpeg"   >/dev/null || { echo "ffmpeg missing: brew install ffmpeg" >&2; exit 1; }
command -v "$gifsicle" >/dev/null || { echo "gifsicle missing: brew install gifsicle" >&2; exit 1; }

if [ "${1:-}" = "--test" ]; then
  self=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
  t=$(mktemp -d); trap 'rm -rf "$t"' EXIT
  "$ffmpeg" -v error -f lavfi -i testsrc=size=160x120:rate=10:duration=1 "$t/in.mp4"
  (cd "$t" && bash "$self" in.mp4 >/dev/null)
  [ -s "$t/in.gif" ] && [ -s "$t/in-optimized.gif" ] || { echo "FAIL: no output" >&2; exit 1; }
  echo ok; exit 0
fi

in=${1:?usage: gif.sh <video>}
[ -f "$in" ] || { echo "no such file: $in" >&2; exit 1; }
out=$(basename "${in%.*}")

"$ffmpeg" -v warning -stats -i "$in" \
  -vf "fps=10,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 -y "$out.gif"
"$gifsicle" --optimize=3 --output "$out-optimized.gif" --resize-height 600 "$out.gif"
echo "$out.gif $out-optimized.gif"
