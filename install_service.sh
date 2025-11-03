#!/bin/bash

# PourPal Service Installation Script
# This script installs the PourPal systemd service

echo "=== PourPal Service Installation ==="

# Check if running as correct user
if [ "$(id -un)" != "ppl" ]; then
    echo "Error: This script must be run as user 'ppl'"
    echo "Current user: $(id -un)"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "start_at_boot.sh" ]; then
    echo "Error: start_at_boot.sh not found. Please run this script from the pourpal-software directory"
    exit 1
fi

# Check if service file exists
if [ ! -f "pourpal.service" ]; then
    echo "Error: pourpal.service not found"
    exit 1
fi

# Check if management script exists
if [ ! -f "manage_pourpal.sh" ]; then
    echo "Error: manage_pourpal.sh not found"
    exit 1
fi

echo "Installing PourPal service..."

# Copy service file to systemd directory (requires sudo for system files)
echo "Copying service file to systemd directory..."
sudo cp pourpal.service /etc/systemd/system/
sudo chmod 644 /etc/systemd/system/pourpal.service

# Make management script executable
chmod +x manage_pourpal.sh

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable the service
sudo systemctl enable pourpal

echo "Service installed successfully!"
echo ""
echo "Usage:"
echo "  ./manage_pourpal.sh start     # Start the service"
echo "  ./manage_pourpal.sh stop      # Stop the service"
echo "  ./manage_pourpal.sh status    # Check service status"
echo "  ./manage_pourpal.sh restart   # Restart the service"
echo "  ./manage_pourpal.sh logs      # View service logs"
echo "  ./manage_pourpal.sh help      # Show all commands"
echo ""
echo "The service will start automatically on boot."
