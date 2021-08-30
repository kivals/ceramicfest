#!/bin/bash
#cwebp -quiet -q 90 "./photos" -o "./web";
for tpng in *.png; do cwebp -q 80 "$tpng" -o "${tpng%.png}.webp"; done