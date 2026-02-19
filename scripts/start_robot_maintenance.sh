#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.run"
BACKEND_PORT="${BACKEND_PORT:-8010}"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"
HOST="${HOST:-0.0.0.0}"

mkdir -p "${RUN_DIR}"

detect_ip() {
  if command -v hostname >/dev/null 2>&1; then
    local ip
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
    if [[ -n "${ip}" ]]; then
      echo "${ip}"
      return 0
    fi
  fi

  if command -v ip >/dev/null 2>&1; then
    local ip2
    ip2="$(ip route get 1.1.1.1 2>/dev/null | awk '/src/ {for (i = 1; i <= NF; i++) if ($i == "src") {print $(i+1); exit}}')"
    if [[ -n "${ip2}" ]]; then
      echo "${ip2}"
      return 0
    fi
  fi

  echo "127.0.0.1"
}

is_port_available() {
  local port="$1"
  python3 - "$port" <<'PY'
import socket
import sys

port = int(sys.argv[1])
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.bind(("0.0.0.0", port))
except OSError:
    sys.exit(1)
finally:
    s.close()
PY
}

reserve_frontend_port() {
  local candidate="${FRONTEND_PORT}"
  local max_tries=20
  local try=0

  while (( try < max_tries )); do
    if is_port_available "${candidate}"; then
      FRONTEND_PORT="${candidate}"
      return 0
    fi
    candidate=$((candidate + 1))
    try=$((try + 1))
  done

  echo "Unable to find an available frontend port after ${max_tries} attempts." >&2
  exit 1
}

cleanup() {
  set +e
  [[ -n "${BACKEND_PID:-}" ]] && kill "${BACKEND_PID}" >/dev/null 2>&1
  [[ -n "${FRONTEND_PID:-}" ]] && kill "${FRONTEND_PID}" >/dev/null 2>&1
  wait >/dev/null 2>&1
}
trap cleanup EXIT INT TERM

PI_IP="$(detect_ip)"
if ! is_port_available "${BACKEND_PORT}"; then
  echo "Backend port ${BACKEND_PORT} is already in use. Stop the existing process or set BACKEND_PORT." >&2
  exit 1
fi

reserve_frontend_port
FRONTEND_URL="http://${PI_IP}:${FRONTEND_PORT}/?apiBase=http://${PI_IP}:${BACKEND_PORT}"

echo "Starting backend on ${HOST}:${BACKEND_PORT}..."
if [[ -x "${ROOT_DIR}/.venv/bin/python" ]]; then
  "${ROOT_DIR}/.venv/bin/python" -m uvicorn backend.main:app --host "${HOST}" --port "${BACKEND_PORT}" >"${RUN_DIR}/backend.log" 2>&1 &
else
  python3 -m uvicorn backend.main:app --host "${HOST}" --port "${BACKEND_PORT}" >"${RUN_DIR}/backend.log" 2>&1 &
fi
BACKEND_PID=$!

echo "Starting static UI server on ${HOST}:${FRONTEND_PORT}..."
python3 -m http.server "${FRONTEND_PORT}" --bind "${HOST}" --directory "${ROOT_DIR}" >"${RUN_DIR}/frontend.log" 2>&1 &
FRONTEND_PID=$!

sleep 1

echo "Opening browser at ${FRONTEND_URL}"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${FRONTEND_URL}" >/dev/null 2>&1 || true
elif command -v chromium-browser >/dev/null 2>&1; then
  chromium-browser "${FRONTEND_URL}" >/dev/null 2>&1 || true
fi

echo "Backend PID: ${BACKEND_PID}"
echo "Frontend PID: ${FRONTEND_PID}"
echo "Logs: ${RUN_DIR}/backend.log and ${RUN_DIR}/frontend.log"
echo "Press Ctrl+C to stop both services."

wait "${BACKEND_PID}" "${FRONTEND_PID}"
