#!/usr/bin/env bash
set -euo pipefail

echo "Deploy script (template)"
echo "- Build frontend (npm run build)"
echo "- Package backend (Docker or runtime-specific)"
echo "- Upload artifacts to hosting"
