#!/bin/bash
# Context Window Progress Bar for Claude Code sessions
# Usage: ./context-bar.sh <tokens_used> [max_tokens]
# Example: ./context-bar.sh 45000
#          ./context-bar.sh 45000 200000

TOKENS_USED=${1:-0}
MAX_TOKENS=${2:-200000}
BAR_WIDTH=40

# Calculate percentage
PCT=$((TOKENS_USED * 100 / MAX_TOKENS))
if [ $PCT -gt 100 ]; then PCT=100; fi

# Calculate filled/empty blocks
FILLED=$((PCT * BAR_WIDTH / 100))
EMPTY=$((BAR_WIDTH - FILLED))

# Color based on usage
if [ $PCT -lt 40 ]; then
  COLOR="\033[32m"  # Green
elif [ $PCT -lt 70 ]; then
  COLOR="\033[33m"  # Yellow
elif [ $PCT -lt 90 ]; then
  COLOR="\033[38;5;208m"  # Orange
else
  COLOR="\033[31m"  # Red
fi
RESET="\033[0m"
BOLD="\033[1m"
DIM="\033[2m"

# Build bar
BAR=""
for ((i=0; i<FILLED; i++)); do BAR+="█"; done
for ((i=0; i<EMPTY; i++)); do BAR+="░"; done

# Format token counts (K)
USED_K=$(awk "BEGIN {printf \"%.0f\", $TOKENS_USED/1000}")
MAX_K=$(awk "BEGIN {printf \"%.0f\", $MAX_TOKENS/1000}")

# Status label
if [ $PCT -lt 40 ]; then
  STATUS="OK"
elif [ $PCT -lt 70 ]; then
  STATUS="WATCH"
elif [ $PCT -lt 90 ]; then
  STATUS="SAVE SOON"
else
  STATUS="SAVE NOW"
fi

# Print
echo ""
echo -e "${BOLD} CONTEXTE ${RESET}${DIM}(estimé)${RESET}"
echo -e " ${COLOR}${BAR}${RESET} ${BOLD}${PCT}%${RESET} ${DIM}[${USED_K}K/${MAX_K}K tokens]${RESET}"
echo -e " ${COLOR}${STATUS}${RESET}"
echo ""
