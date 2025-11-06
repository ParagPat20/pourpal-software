#!/bin/bash

# Desktop Environment Detection Script for PourPal
# Run this on the Raspberry Pi to detect which desktop/panel system is being used

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      PourPal Desktop Environment Detection Tool               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== 1. CHECKING RUNNING PROCESSES ==="
echo ""

echo "Panel processes:"
ps aux | grep -E "lxpanel|waybar|xfce4-panel|mate-panel|gnome-panel|plasma-desktop" | grep -v grep
if [ $? -ne 0 ]; then
    echo "  No panel processes found"
fi
echo ""

echo "Window manager processes:"
ps aux | grep -E "openbox|mutter|kwin|xfwm|wayfire|labwc|sway|weston" | grep -v grep
if [ $? -ne 0 ]; then
    echo "  No window manager found"
fi
echo ""

echo "=== 2. CHECKING DESKTOP SESSION ==="
echo ""
echo "XDG_CURRENT_DESKTOP: ${XDG_CURRENT_DESKTOP:-Not set}"
echo "DESKTOP_SESSION: ${DESKTOP_SESSION:-Not set}"
echo "XDG_SESSION_TYPE: ${XDG_SESSION_TYPE:-Not set}"
echo ""

echo "=== 3. CHECKING AVAILABLE COMMANDS ==="
echo ""

commands=("lxpanelctl" "waybar" "xdotool" "pcmanfm-qt" "labwc" "wayfire" "openbox" "wlr-randr")
for cmd in "${commands[@]}"; do
    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $cmd: $(which $cmd)"
    else
        echo -e "${RED}✗${NC} $cmd: Not found"
    fi
done
echo ""

echo "=== 4. CHECKING CONFIG FILES ==="
echo ""

configs=(
    "$HOME/.config/lxpanel/LXDE-pi/panels/panel"
    "$HOME/.config/lxpanel/LXDE/panels/panel"
    "$HOME/.config/waybar/config"
    "$HOME/.config/labwc/rc.xml"
    "$HOME/.config/wayfire.ini"
    "$HOME/.config/openbox/rc.xml"
)

for config in "${configs[@]}"; do
    if [ -f "$config" ]; then
        echo -e "${GREEN}✓${NC} Found: $config"
    else
        echo -e "${RED}✗${NC} Not found: $config"
    fi
done
echo ""

echo "=== 5. CHECKING WAYLAND VS X11 ==="
echo ""

if [ -n "$WAYLAND_DISPLAY" ]; then
    echo -e "${GREEN}✓${NC} Running on Wayland (WAYLAND_DISPLAY=$WAYLAND_DISPLAY)"
elif [ -n "$DISPLAY" ]; then
    echo -e "${GREEN}✓${NC} Running on X11 (DISPLAY=$DISPLAY)"
else
    echo -e "${RED}✗${NC} Neither Wayland nor X11 detected"
fi
echo ""

echo "=== 6. RASPBERRY PI SPECIFIC CHECKS ==="
echo ""

# Check for Raspberry Pi OS desktop
if [ -f /usr/bin/raspberrypi-ui-mods ]; then
    echo -e "${GREEN}✓${NC} Raspberry Pi OS desktop packages found"
fi

# Check for Wayfire (new Raspberry Pi OS default)
if pgrep -x "wayfire" > /dev/null; then
    echo -e "${GREEN}✓${NC} Wayfire compositor is running"
    
    # Check for wayfire panel
    if pgrep -x "wf-panel-pi" > /dev/null; then
        echo -e "${GREEN}✓${NC} wf-panel-pi is running (Raspberry Pi Wayfire panel)"
    fi
    
    if pgrep -x "wf-panel" > /dev/null; then
        echo -e "${GREEN}✓${NC} wf-panel is running"
    fi
fi

# Check for labwc (alternative Wayland compositor)
if pgrep -x "labwc" > /dev/null; then
    echo -e "${GREEN}✓${NC} labwc compositor is running"
fi

# Check for LXPanel (old Raspberry Pi OS)
if pgrep -x "lxpanel" > /dev/null; then
    echo -e "${GREEN}✓${NC} LXPanel is running (old Raspberry Pi OS)"
fi
echo ""

echo "=== 7. RECOMMENDED ACTION ==="
echo ""

if pgrep -x "wayfire" > /dev/null; then
    echo -e "${YELLOW}DETECTED:${NC} Wayfire compositor (new Raspberry Pi OS)"
    echo ""
    echo "Panel hiding methods for Wayfire:"
    echo "  1. Kill wf-panel-pi:"
    echo "     pkill wf-panel-pi"
    echo ""
    echo "  2. Or modify Wayfire config:"
    echo "     Edit: ~/.config/wayfire.ini"
    echo "     In [panel] section, set: enabled = false"
    echo ""
elif pgrep -x "lxpanel" > /dev/null; then
    echo -e "${YELLOW}DETECTED:${NC} LXPanel (old Raspberry Pi OS)"
    echo ""
    echo "The manage_pourpal.sh script should work!"
    echo "Try: ./manage_pourpal.sh hide-taskbar"
    echo ""
elif pgrep -x "labwc" > /dev/null; then
    echo -e "${YELLOW}DETECTED:${NC} labwc compositor"
    echo ""
    echo "Check for panel configuration in:"
    echo "  ~/.config/labwc/rc.xml"
    echo ""
else
    echo -e "${RED}UNABLE TO DETECT${NC} desktop environment"
    echo ""
    echo "Please provide this output to help debug:"
    echo "  1. What OS version? cat /etc/os-release"
    echo "  2. Is GUI running? echo \$DISPLAY"
    echo "  3. What processes? ps aux | head -50"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Save this output and update manage_pourpal.sh accordingly"
echo "═══════════════════════════════════════════════════════════════"

