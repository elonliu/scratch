#!/usr/bin/env bash
#
# Re-sign a macOS .app bundle with a stable designated requirement.
#
# macOS remembers privacy permissions (TCC) against a code requirement. An ad-hoc
# signature pins the cdhash of the exact binary, so the permission stops matching
# after every rebuild and macOS asks for folder access again. Signing with a
# requirement that only mentions the bundle identifier keeps the grant valid
# across updates. See issue #1.
#
# Usage:
#   scripts/macos/sign-app.sh path/to/Scratch.app
#
# This is the same operation the release build performs through the codesign
# shim next to this script; it is exposed separately so an already installed
# app can be repaired without reinstalling it.

set -euo pipefail

app="${1:-}"
if [ -z "$app" ]; then
  echo "usage: $(basename "$0") path/to/Scratch.app" >&2
  exit 2
fi

if [ ! -d "$app" ]; then
  echo "not a directory: $app" >&2
  exit 1
fi

info_plist="$app/Contents/Info.plist"
if [ ! -f "$info_plist" ]; then
  echo "not a macOS app bundle: $app" >&2
  exit 1
fi

bundle_id="$(plutil -extract CFBundleIdentifier raw -o - "$info_plist")"
requirement="=designated => identifier \"$bundle_id\""

# codesign has to sign from the inside out: nested code first, the bundle last.
find "$app/Contents/MacOS" -type f -perm -u+x -print0 2>/dev/null |
  while IFS= read -r -d '' binary; do
    codesign --force --sign - "$binary"
  done

if [ -d "$app/Contents/Frameworks" ]; then
  find "$app/Contents/Frameworks" -maxdepth 1 -name '*.framework' -print0 2>/dev/null |
    while IFS= read -r -d '' framework; do
      codesign --force --sign - "$framework"
    done
fi

codesign --force --sign - --requirements "$requirement" "$app"
codesign --verify --deep --strict "$app"

echo "signed $app"
echo "designated requirement: designated => identifier \"$bundle_id\""
