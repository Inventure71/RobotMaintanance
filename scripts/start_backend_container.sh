#!/bin/sh
set -eu

CONFIG_DIR="${CONFIG_DIR:-/app/config}"
DEFAULTS_DIR="${CONFIG_DEFAULTS_DIR:-/app/config.defaults}"

mkdir -p "${CONFIG_DIR}"

if [ -d "${DEFAULTS_DIR}" ]; then
  if [ -z "$(find "${CONFIG_DIR}" -mindepth 1 -print -quit 2>/dev/null)" ]; then
    echo "Config directory is empty. Seeding defaults from ${DEFAULTS_DIR}..."
    cp -a "${DEFAULTS_DIR}"/. "${CONFIG_DIR}"/
  fi
fi

if [ "${SKIP_STARTUP_CONFIG_VALIDATION:-0}" != "1" ]; then
  echo "Validating runtime config..."
  if ! python -m backend.startup_config_validator; then
    echo "Runtime config validation failed. Refusing to start backend."
    exit 1
  fi
fi

exec uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-5010}"
