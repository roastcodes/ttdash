#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/tag-main-release.sh [version] [--dry-run]

Behavior:
  - must be run from a clean local main branch
  - fetches origin
  - fast-forwards local main to origin/main
  - creates annotated tag v<version>
  - pushes the tag to origin

Defaults:
  - if version is omitted, package.json version is used

Examples:
  bash scripts/tag-main-release.sh
  bash scripts/tag-main-release.sh 6.1.3
  bash scripts/tag-main-release.sh --dry-run
EOF
}

PACKAGE_VERSION="$(node -p "require('./package.json').version")"
VERSION=""
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      usage
      exit 0
      ;;
    --dry-run)
      DRY_RUN=1
      ;;
    *)
      if [[ -n "$VERSION" ]]; then
        echo "Only one version argument is allowed."
        usage
        exit 1
      fi
      VERSION="$arg"
      ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  VERSION="$PACKAGE_VERSION"
fi

if [[ "$VERSION" != "$PACKAGE_VERSION" ]]; then
  echo "Version mismatch: package.json is $PACKAGE_VERSION but requested version is $VERSION."
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "This script must be run from the local main branch. Current branch: $CURRENT_BRANCH"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes before tagging a release."
  exit 1
fi

TAG_NAME="v$VERSION"

if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  echo "Tag already exists locally: $TAG_NAME"
  exit 1
fi

if git ls-remote --tags origin "refs/tags/$TAG_NAME" | grep -q .; then
  echo "Tag already exists on origin: $TAG_NAME"
  exit 1
fi

run() {
  echo "+ $*"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    "$@"
  fi
}

run git fetch origin
run git pull --ff-only origin main
run git tag -a "$TAG_NAME" -m "$TAG_NAME"
run git push origin "$TAG_NAME"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run complete."
else
  echo "Release tag pushed: $TAG_NAME"
fi
