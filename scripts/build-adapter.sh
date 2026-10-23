#!/bin/bash
# mediaremote-adapter를 빌드해 vendor/mediaremote 에 넣는다 (브라우저 재생 읽기용)
# 맥에서만 된다. 필요: Xcode Command Line Tools, cmake (brew install cmake)
set -euo pipefail

VERSION="v0.7.7" # 올릴 때는 바뀐 점을 확인하고 여기만 바꾼다
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/vendor/mediaremote"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --quiet --depth 1 --branch "$VERSION" https://github.com/ungive/mediaremote-adapter.git "$WORK/src"
cmake -S "$WORK/src" -B "$WORK/build" -DCMAKE_BUILD_TYPE=Release >/dev/null
cmake --build "$WORK/build" --target MediaRemoteAdapter >/dev/null

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$WORK/build/MediaRemoteAdapter.framework" "$OUT/"
cp "$WORK/src/bin/mediaremote-adapter.pl" "$OUT/"
cp "$WORK/src/LICENSE" "$OUT/LICENSE" # BSD-3: 배포할 때 저작권 고지를 같이 넣는다
echo "mediaremote-adapter $VERSION → $OUT"
