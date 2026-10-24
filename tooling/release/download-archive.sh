#!/usr/bin/env bash
# Downloads one browser's archive from a GitHub Release into a directory and
# checks it against the checksum published next to it, so a store only ever
# receives the exact file that was released.
#
#   tooling/release/download-archive.sh <tag> <browser> <dir>
#
# Prints the archive's path. Needs GH_TOKEN and runs against the current repo.
set -euo pipefail

tag="${1:?usage: download-archive.sh <tag> <browser> <dir>}"
browser="${2:?usage: download-archive.sh <tag> <browser> <dir>}"
dir="${3:?usage: download-archive.sh <tag> <browser> <dir>}"

if ! printf '%s' "$tag" | grep -Eq '^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'; then
  echo "Expected a release tag like v1.2.3, received: $tag" >&2
  exit 1
fi

archive="pray-times-${browser}-${tag#v}.zip"
gh release download "$tag" --dir "$dir" --pattern "$archive" --pattern "$archive.sha256" >&2
(cd "$dir" && sha256sum --check "$archive.sha256") >&2
printf '%s\n' "$dir/$archive"
