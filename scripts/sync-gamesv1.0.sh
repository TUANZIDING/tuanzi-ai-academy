#!/usr/bin/env bash
# 把团子游戏馆（TUANZIDING/tuanzi-games）同步到本站 /games/ 目录
# 用法：bash scripts/sync-gamesv1.0.sh /path/to/tuanzi-games
set -e
SRC="${1:-../ccl}"; DST="$(dirname "$0")/../games"
rm -rf "$DST"; mkdir -p "$DST"
cp "$SRC/index.html" "$DST/"; cp -r "$SRC/assets" "$SRC/games" "$DST/"
echo "synced $(cd "$SRC" && git rev-parse --short HEAD 2>/dev/null) -> games/"
