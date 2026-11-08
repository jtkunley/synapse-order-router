#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

image="${IMAGE:-synapse-order-router}"
host_port="${PORT:-3000}"

docker build -t "$image" .
exec docker run --rm -e PORT=3000 -p "${host_port}:3000" "$image"
