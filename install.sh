#!/bin/bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║   Apple Creator MCP — Installer           ║${NC}"
echo -e "${CYAN}${BOLD}║   Keynote · Pages · Numbers · FCP · Logic ║${NC}"
echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════╝${NC}"
echo ""

# ─── Check Node.js ───
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js not found.${NC} Install: brew install node"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Node.js 18+ required.${NC} You have $(node -v)."
  exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# ─── Check creative tools ───
echo ""
echo -e "${CYAN}Checking creative tools...${NC}"

for app in "Keynote" "Pages" "Numbers" "Final Cut Pro" "Logic Pro" "Motion" "Compressor"; do
  CREATOR="${app} Creator Studio"
  if [ -d "/Applications/${CREATOR}.app" ]; then
    echo -e "  ${GREEN}✓${NC} ${CREATOR}"
  elif [ -d "/Applications/${app}.app" ]; then
    echo -e "  ${GREEN}✓${NC} ${app}"
  else
    echo -e "  ${YELLOW}—${NC} ${app} (not installed)"
  fi
done

if command -v ffmpeg &> /dev/null; then
  echo -e "  ${GREEN}✓${NC} ffmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')"
else
  echo -e "  ${YELLOW}!${NC} ffmpeg not found — video/audio tools disabled"
  echo -e "    Install: ${BOLD}brew install ffmpeg${NC}"
fi

echo -e "  ${GREEN}✓${NC} sips (built-in image tool)"
echo -e "  ${GREEN}✓${NC} say (built-in text-to-speech)"

# ─── Clone / Update ───
INSTALL_DIR="${APPLE_CREATOR_DIR:-$HOME/.apple-creator-mcp}"
echo ""

if [ -d "$INSTALL_DIR/.git" ]; then
  echo -e "Updating existing install at ${BOLD}$INSTALL_DIR${NC}"
  cd "$INSTALL_DIR"
  git pull --ff-only 2>/dev/null || true
else
  if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
  fi
  echo -e "Installing to ${BOLD}$INSTALL_DIR${NC}"
  git clone https://github.com/timastras9/apple-creator-mcp.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# ─── Install dependencies ───
echo ""
echo -e "${CYAN}Installing dependencies...${NC}"
npm install --production 2>&1 | tail -1
echo -e "${GREEN}✓${NC} Dependencies installed"

# ─── Configure Claude Desktop ───
CONFIG_DIR="$HOME/Library/Application Support/Claude"
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

echo ""
echo -e "${CYAN}Configuring Claude Desktop...${NC}"

if [ ! -d "$CONFIG_DIR" ]; then
  mkdir -p "$CONFIG_DIR"
fi

SERVER_PATH="$INSTALL_DIR/server.js"

if [ -f "$CONFIG_FILE" ]; then
  if grep -q '"apple-creator"' "$CONFIG_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} apple-creator already in Claude Desktop config"
  else
    node -e "
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf-8'));
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['apple-creator'] = {
        command: 'node',
        args: ['$SERVER_PATH']
      };
      fs.writeFileSync('$CONFIG_FILE', JSON.stringify(config, null, 2));
    "
    echo -e "${GREEN}✓${NC} Added apple-creator to Claude Desktop config"
  fi
else
  cat > "$CONFIG_FILE" << CONF
{
  "mcpServers": {
    "apple-creator": {
      "command": "node",
      "args": ["$SERVER_PATH"]
    }
  }
}
CONF
  echo -e "${GREEN}✓${NC} Created Claude Desktop config"
fi

# ─── Accessibility ───
echo ""
echo -e "${CYAN}Checking Accessibility permissions...${NC}"

if osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true' &>/dev/null; then
  echo -e "${GREEN}✓${NC} Accessibility permissions OK"
else
  echo -e "${YELLOW}!${NC} Accessibility permission needed for app control."
  echo ""
  echo -e "  Opening ${BOLD}System Settings > Privacy & Security > Accessibility${NC}..."
  open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
  sleep 2
  echo ""
  echo -e "  Add ${BOLD}/usr/bin/osascript${NC}:"
  echo -e "    1. Click ${BOLD}+${NC} → ${BOLD}Cmd+Shift+G${NC} → type ${BOLD}/usr/bin/osascript${NC} → Open"
  echo -e "    2. Toggle ${GREEN}ON${NC}"
  echo ""
  NODE_REAL=$(python3 -c "import os; print(os.path.realpath('$(which node)'))")
  echo -e "  Add ${BOLD}node${NC}:"
  echo -e "    1. Click ${BOLD}+${NC} → ${BOLD}Cmd+Shift+G${NC} → type ${BOLD}${NODE_REAL}${NC} → Open"
  echo -e "    2. Toggle ${GREEN}ON${NC}"
  echo ""
  read -p "  Press Enter when done... "

  if osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true' &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Permissions verified!"
  else
    echo -e "  ${YELLOW}!${NC} Could not verify — you may need to restart Terminal."
  fi
fi

# ─── Done ───
echo ""
echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║         Installation complete!             ║${NC}"
echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Restart Claude Desktop${NC} to activate."
echo ""
echo -e "  ${CYAN}43 tools across 7 apps + media processing:${NC}"
echo -e "  Keynote:  create, add_slide, add_image, add_text, export, play"
echo -e "  Pages:    create, add_text, add_image, export, get_text"
echo -e "  Numbers:  create, set_cell, get_cell, set_range, add_chart, export"
echo -e "  FCP:      open, get_libraries, export"
echo -e "  Logic:    open, get_info, export"
echo -e "  Video:    convert, trim, concat, add_audio, info, extract_frames"
echo -e "  Audio:    convert, trim, text_to_speech, list_voices"
echo -e "  Image:    convert, info, crop, rotate, thumbnail"
echo ""
echo -e "  ${CYAN}To uninstall:${NC}"
echo -e "    rm -rf $INSTALL_DIR"
echo -e "    Remove \"apple-creator\" from Claude Desktop config"
echo ""
