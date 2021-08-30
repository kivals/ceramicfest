#!/bin/bash
#cwebp -quiet -q 90 "./photos" -o "./web";
for tpng in *.jpg; do cwebp -q 80 "$tpng" -o "${tpng%.png}.webp"; done