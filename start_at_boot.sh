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

# Now display is ready - start loading screen
LOADING_PID=$(start_loading_screen)
echo "Loading screen started with PID: $LOADING_PID"

# Check if the loading screen started successfully
if [ -z "$LOADING_PID" ]; then
    echo "WARNING: Failed to start loading screen. Continuing anyway..."
fi

# Give loading screen a moment to appear
sleep 1

# Launch the Python application in tmux session (app starts while loading screen is visible)
echo "Launching the Python application in tmux session 'myapp'..."

# Check if tmux session already exists
if "$TMUX_BIN" has-session -t myapp 2>/dev/null; then
    echo "Session 'myapp' already exists. Killing existing session..."
    "$TMUX_BIN" kill-session -t myapp
    sleep 1
fi

# Create new tmux session with the app running inside
"$TMUX_BIN" new-session -d -s myapp "cd /home/ppl/pourpal-software && exec python3 app.py"

# Give tmux a moment to start
sleep 1

# Verify tmux session started
if "$TMUX_BIN" has-session -t myapp 2>/dev/null; then
    echo "SUCCESS: tmux session 'myapp' is running"
    
    # Show tmux session info
    "$TMUX_BIN" list-sessions
    "$TMUX_BIN" list-panes -t myapp -F "Pane #{pane_id}: #{pane_current_command}"
    
    # Wait for app to fully load (keep loading screen visible)
    echo "Waiting for app to fully load (loading screen visible)..."
    sleep 4
    
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
