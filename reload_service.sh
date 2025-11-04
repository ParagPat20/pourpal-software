#!/bin/bash

# Script to reload the PourPal service after updates

echo "=== Reloading PourPal Service ==="

# Copy service file to systemd directory
echo "1. Copying service file..."
sudo cp /home/ppl/pourpal-software/pourpal.service /etc/systemd/system/

# Make sure start script is executable
echo "2. Making start script executable..."
chmod +x /home/ppl/pourpal-software/start_at_boot.sh

# Reload systemd daemon
echo "3. Reloading systemd daemon..."
sudo systemctl daemon-reload

# Restart the service
echo "4. Restarting pourpal service..."
sudo systemctl restart pourpal.service

# Wait a moment for startup
sleep 3

# Show service status
echo "5. Service status:"
sudo systemctl status pourpal.service --no-pager

echo ""
echo "=== Checking tmux session ==="
tmux list-sessions 2>/dev/null || echo "No tmux sessions found"

echo ""
echo "=== Recent logs ==="
journalctl -u pourpal.service -n 20 --no-pager

echo ""
echo "=== Startup log (if exists) ==="
if [ -f /home/ppl/pourpal-software/startup.log ]; then
    tail -n 30 /home/ppl/pourpal-software/startup.log
fi

echo ""
echo "=== Commands ==="
echo "View logs: journalctl -u pourpal.service -f"
echo "Attach to tmux: tmux attach -t myapp"
echo "Check status: sudo systemctl status pourpal.service"
echo "Enable on boot: sudo systemctl enable pourpal.service"

