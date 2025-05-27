#!/bin/bash

# Set the display environment variable
export DISPLAY=:0

# Function to start the loading screen
start_loading_screen() {
    python3 /home/jecon/new-repo/loading_screen.py &
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
        tmux new-session -d -s myapp 'cd /home/jecon/new-repo && python3 app.py'
        
        # Wait 4 seconds before killing the loading screen
        echo "Waiting 4 seconds before terminating the loading screen..."
        kill "$LOADING_PID"
        
        echo "Loading screen terminated."
        echo "Python application is running in tmux session 'myapp'."
        break
    else
        echo "Display not connected. Checking again in 1 second..."
        sleep 1
    fi
done
