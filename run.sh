#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the script directory
cd "$SCRIPT_DIR"

# Check if Python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Python3 is not installed. Please install Python3 first."
    exit 1
fi

# Check if required Python packages are installed
echo "Checking required Python packages..."
python3 -c "import serial" 2>/dev/null || pip3 install pyserial
python3 -c "import serial.tools.list_ports" 2>/dev/null || pip3 install pyserial

# Run the main application
echo "Starting the application..."
python3 app.py

# If the application exits with an error, show the error message
if [ $? -ne 0 ]; then
    echo "An error occurred while running the application."
    exit 1
fi 