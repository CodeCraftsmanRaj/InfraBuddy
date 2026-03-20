#!/bin/bash
# start_all.sh
# Script to start all 4 servers for the Edge Support System in parallel (Linux/Arch)

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Edge Support System Servers...${NC}"

BASE_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

is_port_in_use() {
  local port="$1"
  ss -tln 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${port}$"
}

check_required_ports() {
  local conflict=0
  local ports=(9000 8000 5174 5173)

  for p in "${ports[@]}"; do
    if is_port_in_use "$p"; then
      echo -e "${RED:-\033[0;31m}Port $p is already in use.${NC}"
      conflict=1
    fi
  done

  if [ "$conflict" -eq 1 ]; then
    echo -e "${CYAN}Tip:${NC} A running container/service may be using these ports."
    echo -e "${CYAN}Check:${NC} docker ps | grep -E '8000|9000|5173|5174'"
    echo -e "${CYAN}Then stop conflicting service and re-run this script.${NC}"
    exit 1
  fi
}

RED='\033[0;31m'
check_required_ports

# Optional: Clear cache and temp files (Arch-based systems)
echo -e "${CYAN}Clearing cache and temporary files...${NC}"
rm -rf ~/.cache/pip
rm -rf /tmp/infrabuddy-*
paccache -r -k 1 2>/dev/null || true  # Keep only the latest package version

# Install dependencies if needed
echo -e "${CYAN}Checking and installing dependencies...${NC}"
[ ! -d "$BASE_PATH/admin-portal-web/dashboard-ui/node_modules" ] && (cd "$BASE_PATH/admin-portal-web/dashboard-ui" && bun install) || true
[ ! -d "$BASE_PATH/edge-chatbot-app/frontend-ui/node_modules" ] && (cd "$BASE_PATH/edge-chatbot-app/frontend-ui" && bun install) || true

# Start Admin Portal API
echo -e "${CYAN}Starting Admin Portal API on port 9000...${NC}"
(
  cd "$BASE_PATH/admin-portal-web/portal-api"
  [ -d .venv ] && source .venv/bin/activate
  uv run uvicorn main:app --port 9000 --reload
) &
ADMIN_API_PID=$!

# Start Admin Portal Dashboard
echo -e "${CYAN}Starting Admin Portal Dashboard on port 5174...${NC}"
(
  cd "$BASE_PATH/admin-portal-web/dashboard-ui"
  bun run dev
) &
ADMIN_UI_PID=$!

# Start Edge Chatbot Backend
echo -e "${CYAN}Starting Edge Chatbot API on port 8000...${NC}"
(
  cd "$BASE_PATH/edge-chatbot-app/backend-api"
  [ -d .venv ] && source .venv/bin/activate
  uv run uvicorn main:app --port 8000 --reload
) &
CHATBOT_API_PID=$!

# Start Edge Chatbot Frontend
echo -e "${CYAN}Starting Edge Chatbot UI on port 5173...${NC}"
(
  cd "$BASE_PATH/edge-chatbot-app/frontend-ui"
  bun run dev
) &
CHATBOT_UI_PID=$!

echo -e "${GREEN}All servers are starting up!${NC}"
echo -e "${CYAN}Admin Portal API: http://localhost:9000${NC}"
echo -e "${CYAN}Admin Dashboard: http://localhost:5174${NC}"
echo -e "${CYAN}Chatbot API: http://localhost:8000${NC}"
echo -e "${CYAN}Chatbot Frontend: http://localhost:5173${NC}"
echo -e "${GREEN}Press Ctrl+C to stop all servers...${NC}"

# Wait for all processes
wait $ADMIN_API_PID $ADMIN_UI_PID $CHATBOT_API_PID $CHATBOT_UI_PID

echo -e "${GREEN}All servers have been stopped.${NC}"
