#!/bin/sh
# Fetch the MobileBERT QnA weights into models/mobilebert/.
#
# The weights are ~101 MB across 26 files and are deliberately not committed —
# see docs/mobilebert-setup.md §7. Run this once locally, and as the Vercel
# build command if you take option A in that section.
#
# Why Kaggle and not tfhub.dev: tfhub.dev was retired in Nov 2023 and now only
# 302s into signed, 3-hour-expiry Kaggle URLs, with a standing intermittent
# CORS bug. This endpoint serves the whole bundle unauthenticated.
#
# Idempotent: does nothing if the model is already unpacked.

set -eu

DEST="models/mobilebert"
URL="https://kaggle.com/api/v1/models/tensorflow/mobilebert/tfJs/mobilebert/1/download"
ARCHIVE="mobilebert-tfjs.tar.gz"

# 26 files: model.json + processed_vocab.json + 24 shards.
if [ -f "$DEST/model.json" ] && [ -f "$DEST/processed_vocab.json" ] \
   && [ -f "$DEST/group1-shard24of24.bin" ]; then
  echo "MobileBERT already present in $DEST — nothing to do."
  exit 0
fi

echo "Fetching MobileBERT QnA (~89 MiB compressed)…"
mkdir -p "$DEST"

# --fail so an HTML error page never gets written out as a tarball.
curl -fL --retry 3 --retry-delay 2 -o "$ARCHIVE" "$URL"

tar -xzf "$ARCHIVE" -C "$DEST"
rm -f "$ARCHIVE"

# Fail loudly rather than deploying a half-unpacked model.
count=$(find "$DEST" -type f | wc -l | tr -d ' ')
if [ "$count" -ne 26 ]; then
  echo "Expected 26 files in $DEST, found $count." >&2
  exit 1
fi

echo "MobileBERT ready in $DEST ($count files)."
