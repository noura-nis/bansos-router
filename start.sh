#!/bin/sh
set -eu
PORT="${PORT:-17070}"

# Run WhatsApp bridge with auto-restart supervisor
if [ "${WA_ENABLED:-false}" = "true" ]; then
  (
    while true; do
      echo "[WA] Bridge starting..."
      node /app/whatsapp.mjs || true
      echo "[WA] Bridge process exited. Restarting in 5 seconds..."
      sleep 5
    done
  ) &
  echo "[WA] Bridge supervisor running in background"
fi

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
  node /app/telegram.mjs &
  echo "[TG] Telegram bridge started"
fi

exec bansos start --bind 0.0.0.0 --port "$PORT" --unsafe-allow-non-loopback
