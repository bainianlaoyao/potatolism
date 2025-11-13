#!/usr/bin/env sh
# Start backend; export BACKEND_CERT/BACKEND_KEY if not provided (defaults point to backend/)
export BACKEND_CERT=${BACKEND_CERT:-backend/cert.pem}
export BACKEND_KEY=${BACKEND_KEY:-backend/key.pem}
export BACKEND_PORT=${BACKEND_PORT:-}

if [ -f "$BACKEND_CERT" ] && [ -f "$BACKEND_KEY" ]; then
  echo "Starting backend with HTTPS using $BACKEND_CERT and $BACKEND_KEY"
else
  echo "Starting backend without TLS (cert/key not found at $BACKEND_CERT / $BACKEND_KEY)"
fi

# Sync and run using existing uv tooling (no new dependencies)
uv sync
uv run server.py