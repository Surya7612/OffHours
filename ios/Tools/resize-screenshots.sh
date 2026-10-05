#!/bin/sh
# Resizes iPhone screenshots to the App Store's 6.5" size (1284 x 2778) without stretching.
# Taller screenshots are scaled to the width and trimmed evenly top and bottom; wider ones are
# scaled to the height and padded at the sides with black.
# Usage: ios/Tools/resize-screenshots.sh <folder with screenshots>
set -eu

target_w=1284
target_h=2778
src="${1:?Pass the folder with your screenshots}"
out="$src/app-store"
mkdir -p "$out"

for file in "$src"/*.png "$src"/*.PNG "$src"/*.jpg "$src"/*.jpeg "$src"/*.JPG "$src"/*.HEIC "$src"/*.heic; do
  [ -f "$file" ] || continue
  name="$(basename "${file%.*}").png"
  w=$(sips -g pixelWidth "$file" | awk '/pixelWidth/ {print $2}')
  h=$(sips -g pixelHeight "$file" | awk '/pixelHeight/ {print $2}')
  if [ "$w" -gt "$h" ]; then
    echo "Skipping $(basename "$file"): landscape"
    continue
  fi
  if [ $((w * target_h)) -le $((h * target_w)) ]; then
    sips -s format png --resampleWidth "$target_w" "$file" --out "$out/$name" >/dev/null
    sips -c "$target_h" "$target_w" "$out/$name" >/dev/null
  else
    sips -s format png --resampleHeight "$target_h" "$file" --out "$out/$name" >/dev/null
    sips --padToHeightWidth "$target_h" "$target_w" --padColor 000000 "$out/$name" >/dev/null 2>&1
  fi
  echo "$(basename "$file") ${w}x${h} -> app-store/$name"
done
