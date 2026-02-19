#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.run"
BACKEND_PORT="${BACKEND_PORT:-8010}"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"
REQUESTED_BACKEND_PORT="${BACKEND_PORT}"
HOST="${HOST:-0.0.0.0}"
REQ_FILE="${ROOT_DIR}/backend/requirements.txt"
VENV_DIR="${ROOT_DIR}/.venv"
MIN_PYTHON="3.9"

if [[ -x "${VENV_DIR}/bin/python" ]]; then
  PYTHON_BIN="${VENV_DIR}/bin/python"
else
  PYTHON_BIN="$(command -v python3 || true)"
fi

mkdir -p "${RUN_DIR}"

python_meets_min_version() {
  "${PYTHON_BIN}" - "${MIN_PYTHON}" <<'PY'
import sys

required = tuple(int(x) for x in sys.argv[1].split("."))
current = sys.version_info[:2]
raise SystemExit(0 if current >= required else 1)
PY
}

select_compatible_python() {
  local candidate

  if [[ -n "${PYTHON_BIN:-}" ]] && command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
    if python_meets_min_version; then
      return 0
    fi
  fi

  for candidate in python3.12 python3.11 python3.10; do
    if command -v "${candidate}" >/dev/null 2>&1; then
      PYTHON_BIN="$(command -v "${candidate}")"
      if python_meets_min_version; then
        return 0
      fi
    fi
  done

  echo "No compatible Python found. Required >= ${MIN_PYTHON}." >&2
  echo "Install Python ${MIN_PYTHON}+ (on Raspberry Pi: sudo apt install -y python3 python3-venv) and rerun ./start.sh." >&2
  exit 1
}

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
  local -a pip_args
  local system_name
  local machine_name
  local index_url
  local extra_index_url

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

  "${PYTHON_BIN}" -m pip install --disable-pip-version-check --no-input --upgrade pip setuptools wheel >/dev/null 2>&1 || true

  pip_args=(--disable-pip-version-check --no-input -r "${REQ_FILE}")
  system_name="$(uname -s 2>/dev/null || true)"
  machine_name="$(uname -m 2>/dev/null || true)"

  index_url="${PIP_INDEX_URL:-https://pypi.org/simple}"
  extra_index_url="${PIP_EXTRA_INDEX_URL:-}"
  if [[ -z "${extra_index_url}" ]] && [[ "${system_name}" == "Linux" ]] && [[ "${machine_name}" == arm* || "${machine_name}" == aarch64 ]]; then
    extra_index_url="https://www.piwheels.org/simple"
  fi

  pip_args+=(--index-url "${index_url}")
  if [[ -n "${extra_index_url}" ]]; then
    pip_args+=(--extra-index-url "${extra_index_url}")
  fi

  echo "Checking/installing backend requirements with ${PYTHON_BIN}..."
  echo "pip index: ${index_url}"
  if [[ -n "${extra_index_url}" ]]; then
    echo "pip extra index: ${extra_index_url}"
  fi
  if ! "${PYTHON_BIN}" -m pip install "${pip_args[@]}"; then
    echo "Dependency installation failed for ${PYTHON_BIN}." >&2
    echo "Python version: $("${PYTHON_BIN}" -V 2>/dev/null || echo unknown)" >&2
    echo "If this is a Raspberry Pi, verify network access and install venv tooling: sudo apt install -y python3-venv." >&2
    echo "If your environment uses a private mirror, set PIP_INDEX_URL/PIP_EXTRA_INDEX_URL accordingly and rerun ./start.sh." >&2
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

reserve_backend_port() {
  local candidate="${BACKEND_PORT}"
  local max_tries=20
  local try=0

  while (( try < max_tries )); do
    if is_port_available "${candidate}"; then
      BACKEND_PORT="${candidate}"
      return 0
    fi
    candidate=$((candidate + 1))
    try=$((try + 1))
  done

  echo "Unable to find an available backend port after ${max_tries} attempts." >&2
  exit 1
}

terminate_pid_tree() {
  local pid="$1"
  local signal="${2:-TERM}"
  local child

  if [[ -z "${pid}" ]]; then
    return 0
  fi
  if ! kill -0 "${pid}" >/dev/null 2>&1; then
    return 0
  fi

  if command -v pgrep >/dev/null 2>&1; then
    while IFS= read -r child; do
      [[ -n "${child}" ]] || continue
      terminate_pid_tree "${child}" "${signal}"
    done < <(pgrep -P "${pid}" 2>/dev/null || true)
  fi

  kill "-${signal}" "${pid}" >/dev/null 2>&1 || true
}

cleanup() {
  local pass
  set +e
  terminate_pid_tree "${BACKEND_PID:-}" TERM
  terminate_pid_tree "${FRONTEND_PID:-}" TERM

  for pass in 1 2 3 4 5; do
    local backend_alive=0
    local frontend_alive=0
    [[ -n "${BACKEND_PID:-}" ]] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1 && backend_alive=1
    [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "${FRONTEND_PID}" >/dev/null 2>&1 && frontend_alive=1
    if (( backend_alive == 0 && frontend_alive == 0 )); then
      break
    fi
    sleep 0.2
  done

  terminate_pid_tree "${BACKEND_PID:-}" KILL
  terminate_pid_tree "${FRONTEND_PID:-}" KILL
  wait "${BACKEND_PID:-}" "${FRONTEND_PID:-}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM HUP QUIT

select_compatible_python
PI_IP="$(detect_ip)"
ensure_python_requirements

reserve_backend_port
reserve_frontend_port
FRONTEND_URL="http://${PI_IP}:${FRONTEND_PORT}/?apiBase=http://${PI_IP}:${BACKEND_PORT}"

if [[ "${BACKEND_PORT}" != "${REQUESTED_BACKEND_PORT}" ]]; then
  echo "Backend requested port ${REQUESTED_BACKEND_PORT} is in use. Using ${BACKEND_PORT}."
fi

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
