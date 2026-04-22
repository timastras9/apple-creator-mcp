#!/bin/bash
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}Apple Creator MCP — Permission Setup${NC}"
echo -e "This will trigger all macOS permission dialogs at once."
echo -e "Click ${BOLD}OK${NC} on each dialog that appears."
echo ""
echo -e "${YELLOW}Press Enter to start...${NC}"
read

APPS=(
  "Keynote Creator Studio"
  "Pages Creator Studio"
  "Numbers Creator Studio"
  "Final Cut Pro Creator Studio"
  "Logic Pro Creator Studio"
  "Motion Creator Studio"
  "Compressor Creator Studio"
  "System Events"
)

for app in "${APPS[@]}"; do
  if [ -d "/Applications/${app}.app" ] || [ "$app" = "System Events" ]; then
    echo -ne "  Authorizing ${BOLD}${app}${NC}... "
    osascript -e "tell application \"${app}\" to activate" 2>/dev/null
    sleep 1
    osascript -e "tell application \"${app}\" to get name" 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}denied${NC}"
  fi
done

echo ""
echo -e "  Authorizing ${BOLD}System Events${NC} (keyboard/mouse control)..."
osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true' 2>/dev/null && echo -e "  ${GREEN}✓${NC} System Events authorized" || echo -e "  ${YELLOW}!${NC} System Events — approve the dialog"

echo ""
echo -e "  Closing apps..."
for app in "Keynote Creator Studio" "Pages Creator Studio" "Numbers Creator Studio" "Motion Creator Studio" "Compressor Creator Studio"; do
  osascript -e "tell application \"${app}\" to quit" 2>/dev/null &
done
wait

echo ""
echo -e "${GREEN}${BOLD}All permissions set!${NC} Apps will run without dialogs from now on."
echo ""
