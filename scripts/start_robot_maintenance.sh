#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.run"
BACKEND_PORT="${BACKEND_PORT:-8010}"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"
HOST="${HOST:-0.0.0.0}"
REQ_FILE="${ROOT_DIR}/backend/requirements.txt"
VENV_DIR="${ROOT_DIR}/.venv"

if [[ -x "${VENV_DIR}/bin/python" ]]; then
  PYTHON_BIN="${VENV_DIR}/bin/python"
else
  PYTHON_BIN="$(command -v python3 || true)"
fi

if [[ -z "${PYTHON_BIN}" ]]; then
  echo "python3 was not found. Install Python 3 or create ${ROOT_DIR}/.venv first." >&2
  exit 1
fi

mkdir -p "${RUN_DIR}"

is_externally_managed_python() {
  "${PYTHON_BIN}" - <<'PY'
import pathlib
import sys
import sysconfig

if sys.prefix != sys.base_prefix:
    raise SystemExit(1)

stdlib = sysconfig.get_path("stdlib")
managed = pathlib.Path(stdlib) / "EXTERNALLY-MANAGED"
raise SystemExit(0 if managed.exists() else 1)
PY
}

ensure_local_venv() {
  if [[ -x "${VENV_DIR}/bin/python" ]]; then
    PYTHON_BIN="${VENV_DIR}/bin/python"
    return 0
  fi

  echo "System Python is externally managed. Creating project virtualenv at ${VENV_DIR}..."
  if ! "${PYTHON_BIN}" -m venv "${VENV_DIR}"; then
    echo "Failed to create virtualenv. Install python3-venv and rerun." >&2
    exit 1
  fi
  PYTHON_BIN="${VENV_DIR}/bin/python"
}

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
  "${PYTHON_BIN}" - "$port" <<'PY'
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

ensure_python_requirements() {
  if [[ ! -f "${REQ_FILE}" ]]; then
    echo "Requirements file not found: ${REQ_FILE}" >&2
    echo "Make sure the project is complete and backend/requirements.txt exists, then rerun ./start.sh." >&2
    exit 1
  fi

  if is_externally_managed_python; then
    ensure_local_venv
  fi

  if ! "${PYTHON_BIN}" -m pip --version >/dev/null 2>&1; then
    echo "pip is not available in ${PYTHON_BIN}; bootstrapping with ensurepip..."
    if ! "${PYTHON_BIN}" -m ensurepip --upgrade; then
      echo "Failed to bootstrap pip for ${PYTHON_BIN}." >&2
      echo "Install pip support (for example: sudo apt install -y python3-pip) and rerun ./start.sh." >&2
      exit 1
    fi
  fi

  echo "Checking/installing backend requirements with ${PYTHON_BIN}..."
  if ! "${PYTHON_BIN}" -m pip install --disable-pip-version-check --no-input -r "${REQ_FILE}"; then
    echo "Dependency installation failed for ${PYTHON_BIN}." >&2
    echo "If this is a Raspberry Pi, verify network access and install venv tooling: sudo apt install -y python3-venv." >&2
    echo "Then rerun ./start.sh." >&2
    exit 1
  fi
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
ensure_python_requirements
if ! is_port_available "${BACKEND_PORT}"; then
  echo "Backend port ${BACKEND_PORT} is already in use. Stop the existing process or set BACKEND_PORT." >&2
  exit 1
fi

reserve_frontend_port
FRONTEND_URL="http://${PI_IP}:${FRONTEND_PORT}/?apiBase=http://${PI_IP}:${BACKEND_PORT}"

echo "Starting backend on ${HOST}:${BACKEND_PORT}..."
"${PYTHON_BIN}" -m uvicorn backend.main:app --host "${HOST}" --port "${BACKEND_PORT}" >"${RUN_DIR}/backend.log" 2>&1 &
BACKEND_PID=$!

echo "Starting static UI server on ${HOST}:${FRONTEND_PORT}..."
"${PYTHON_BIN}" -m http.server "${FRONTEND_PORT}" --bind "${HOST}" --directory "${ROOT_DIR}" >"${RUN_DIR}/frontend.log" 2>&1 &
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
