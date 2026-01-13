#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

pids=()

cleanup() {
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT INT TERM

start_baileys() {
  echo "[dev] iniciando Baileys..."
  (cd "$ROOT_DIR/apps/baileys" && npm run dev) \
    >"$LOG_DIR/baileys.log" 2>&1 &
  pids+=("$!")
}

start_agents() {
  echo "[dev] iniciando Agents..."
  if [[ ! -x "$ROOT_DIR/apps/agents/.venv/bin/uvicorn" ]]; then
    echo "[dev] venv nao encontrado em apps/agents/.venv. Crie com:"
    echo "      cd apps/agents && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
  fi
  (cd "$ROOT_DIR/apps/agents" && "$ROOT_DIR/apps/agents/.venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8001) \
    >"$LOG_DIR/agents.log" 2>&1 &
  pids+=("$!")
}

start_next() {
  echo "[dev] iniciando Next..."
  (cd "$ROOT_DIR" && npm run dev) \
    >"$LOG_DIR/next.log" 2>&1 &
  pids+=("$!")
}

start_baileys
start_agents
start_next

echo "[dev] logs: $LOG_DIR/baileys.log, $LOG_DIR/agents.log, $LOG_DIR/next.log"
wait
