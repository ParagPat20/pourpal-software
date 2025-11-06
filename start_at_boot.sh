#!/bin/bash

# Set the display environment variable
export DISPLAY=:0
export HOME=/home/ppl
export USER=ppl

# Log file for debugging
LOG_FILE="/home/ppl/pourpal-software/startup.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== PourPal Startup Script Started at $(date) ==="

# Use absolute path to tmux
TMUX_BIN="/usr/bin/tmux"

# Ensure tmux exists
if [ ! -x "$TMUX_BIN" ]; then
    echo "ERROR: tmux not found at $TMUX_BIN. Please install tmux."
    exit 1
fi

# Function to start the loading screen
start_loading_screen() {
    python3 /home/ppl/pourpal-software/enhanced_loading_screen.py &
    echo $!  # Return the PID of the last background command
}

# Function to check if the display is connected
is_display_connected() {
    xrandr | grep -q " connected"
}

# Wait for display to be connected first (with timeout)
echo "Waiting for the display to connect..."
WAIT_COUNT=0
MAX_WAIT=60  # Wait maximum 60 seconds

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if is_display_connected; then
        echo "Display is connected."
        break
    else
        echo "Display not connected. Waiting... ($WAIT_COUNT/$MAX_WAIT)"
        sleep 1
        ((WAIT_COUNT++))
    fi
done

# Check if display was found
if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    echo "ERROR: Timeout waiting for display connection after $MAX_WAIT seconds"
    exit 1
fi

# Hide the taskbar for kiosk mode
echo "Hiding taskbar for kiosk mode..."

# Check for Wayfire panel (New Raspberry Pi OS Bookworm default)
if pgrep -x "wf-panel-pi" > /dev/null || pgrep -x "wf-panel" > /dev/null; then
    echo "Detected Wayfire panel (new Raspberry Pi OS)"
    pkill wf-panel-pi 2>/dev/null || true
    pkill wf-panel 2>/dev/null || true
    echo "Taskbar hidden successfully (Wayfire panel killed)"
    
# For LXDE/LXPanel (Old Raspberry Pi OS)
elif pgrep -x "lxpanel" > /dev/null && command -v lxpanelctl &> /dev/null; then
    echo "Detected LXPanel (old Raspberry Pi OS)"
    LXPANEL_CONFIG="/home/ppl/.config/lxpanel/LXDE-pi/panels/panel"
    
    if [ -f "$LXPANEL_CONFIG" ]; then
        # Set autohide=1 and heightwhenhidden=0
        sed -i 's/autohide=0/autohide=1/g' "$LXPANEL_CONFIG"
        sed -i 's/heightwhenhidden=[0-9]*/heightwhenhidden=0/g' "$LXPANEL_CONFIG"
        
        # If autohide doesn't exist, add it
        if ! grep -q "autohide=" "$LXPANEL_CONFIG"; then
            sed -i '/Global {/a\    autohide=1' "$LXPANEL_CONFIG"
        fi
        
        # Restart panel to apply changes
        DISPLAY=:0 lxpanelctl restart 2>/dev/null || true
        echo "Taskbar hidden successfully (LXPanel autohide enabled)"
    else
        echo "LXPanel config not found, skipping taskbar hide"
    fi
    
# For Waybar
elif pgrep -x "waybar" > /dev/null; then
    echo "Detected Waybar"
    pkill waybar 2>/dev/null || true
    echo "Taskbar hidden successfully (Waybar killed)"
    
else
    echo "No supported taskbar detected, skipping taskbar hide"
    echo "Run ./detect_desktop.sh for diagnostics"
fi

# Now display is ready - check if tmux session already exists
if "$TMUX_BIN" has-session -t myapp 2>/dev/null; then
    echo "Session 'myapp' already exists. Killing existing session..."
    "$TMUX_BIN" kill-session -t myapp
    sleep 1
fi

# Start loading screen AND app at the SAME TIME
echo "Starting loading screen and app simultaneously..."

# 1. Start loading screen in background
LOADING_PID=$(start_loading_screen)
echo "Loading screen started with PID: $LOADING_PID"

# 2. Immediately start app in tmux (no sleep!)
"$TMUX_BIN" new-session -d -s myapp "cd /home/ppl/pourpal-software && exec python3 app.py"

# Give both a moment to initialize
sleep 1

# Verify tmux session started
if "$TMUX_BIN" has-session -t myapp 2>/dev/null; then
    echo "SUCCESS: tmux session 'myapp' is running"
    
    # Show tmux session info
    "$TMUX_BIN" list-sessions
    "$TMUX_BIN" list-panes -t myapp -F "Pane #{pane_id}: #{pane_current_command}"
    
    # Wait for app to fully initialize (HTTP server + Electron startup)
    # App takes ~2 seconds for Electron + server startup time
    echo "Waiting for app to fully initialize (loading screen stays visible)..."
    
    # Wait for HTTP server to be ready (check port 5000)
    MAX_RETRIES=20
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if netstat -tuln 2>/dev/null | grep -q ":5000 "; then
            echo "HTTP server is ready on port 5000"
            break
        fi
        sleep 0.5
        ((RETRY_COUNT++))
    done
    
    # Give Electron an extra moment to launch (total ~3-4 seconds)
    sleep 2
    
    # Now kill the loading screen
    if [ -n "$LOADING_PID" ]; then
        echo "Terminating loading screen..."
        kill "$LOADING_PID" 2>/dev/null || true
        echo "Loading screen terminated."
    fi
    
    echo "Python application is running in tmux session 'myapp'."
    echo "=== Service startup completed successfully at $(date) ==="
    echo "To attach: tmux attach -t myapp"
    
    # Exit successfully - systemd will keep the service as "active (exited)"
    exit 0
else
    echo "ERROR: Failed to start tmux session 'myapp'"
    [ -n "$LOADING_PID" ] && kill "$LOADING_PID" 2>/dev/null || true
    exit 1
fi
