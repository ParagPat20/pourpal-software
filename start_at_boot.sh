#!/bin/bash

# Set the display environment variable
export DISPLAY=:0

# Use absolute path to tmux
TMUX_BIN="/usr/bin/tmux"

# Ensure tmux exists
if [ ! -x "$TMUX_BIN" ]; then
    echo "tmux not found at $TMUX_BIN. Please install tmux."
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

# Start the loading screen and get its PID
LOADING_PID=$(start_loading_screen)
echo "Loading screen PID: $LOADING_PID"

# Check if the loading screen started successfully
if [ -z "$LOADING_PID" ]; then
    echo "Failed to start loading screen. Exiting..."
    exit 1
fi

# Loop until the display is connected
echo "Waiting for the display to connect..."
while true; do
    if is_display_connected; then
        echo "Display is connected."

        # Launch the Python application in a new tmux session
        echo "Launching the Python application in tmux session 'myapp'..."
        
        # Check if tmux session already exists
        if "$TMUX_BIN" has-session -t myapp 2>/dev/null; then
            echo "Session 'myapp' already exists. Killing existing session..."
            "$TMUX_BIN" kill-session -t myapp
        fi
        
        # Create new session
        "$TMUX_BIN" new-session -d -s myapp 'cd /home/ppl/pourpal-software && python3 app.py'

        # Verify tmux session started (retry briefly)
        for i in 1 2 3 4 5; do
            if "$TMUX_BIN" has-session -t myapp 2>/dev/null; then
                break
            fi
            sleep 0.5
        done

        if ! "$TMUX_BIN" has-session -t myapp 2>/dev/null; then
            echo "Failed to start tmux session 'myapp'. Exiting with error."
            exit 1
        fi
        
        # Wait 4 seconds before killing the loading screen
        echo "Waiting 4 seconds before terminating the loading screen..."
        sleep 4
        kill "$LOADING_PID" 2>/dev/null || true
        
        echo "Loading screen terminated."
        echo "Python application is running in tmux session 'myapp'."
        
        # Exit cleanly for systemd
        echo "Service startup completed successfully."
        exit 0
    else
        echo "Display not connected. Checking again in 1 second..."
        sleep 1
    fi
done
