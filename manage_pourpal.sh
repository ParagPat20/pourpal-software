#!/bin/bash

# PourPal Service Management Script
# This script manages the PourPal systemd service

SERVICE_NAME="pourpal"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SCRIPT_DIR="/home/ppl/pourpal-software"
TMUX_BIN="/usr/bin/tmux"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== PourPal Service Manager ===${NC}"
}

# Function to check if running as correct user
check_user() {
    CURRENT_USER="$(id -un)"
    if [ "$CURRENT_USER" != "ppl" ]; then
        print_error "This script must be run as user 'ppl'"
        print_error "Current user: $CURRENT_USER"
        exit 1
    fi
}

# Function to install the service
install_service() {
    print_header
    print_status "Installing PourPal service..."
    
    # Check if service file exists
    if [ ! -f "${SCRIPT_DIR}/pourpal.service" ]; then
        print_error "Service file not found at ${SCRIPT_DIR}/pourpal.service"
        exit 1
    fi
    
    # Copy service file to systemd directory (requires sudo for system files)
    print_status "Copying service file to systemd directory..."
    sudo cp "${SCRIPT_DIR}/pourpal.service" "${SERVICE_FILE}"
    
    # Set proper permissions
    sudo chmod 644 "${SERVICE_FILE}"
    
    # Reload systemd daemon
    sudo systemctl daemon-reload
    
    # Enable the service
    sudo systemctl enable "${SERVICE_NAME}"
    
    print_status "Service installed and enabled successfully!"
    print_status "Service will start automatically on boot"
}

# Function to uninstall the service
uninstall_service() {
    print_header
    print_status "Uninstalling PourPal service..."
    
    # Stop the service if running
    if sudo systemctl is-active --quiet "${SERVICE_NAME}"; then
        print_status "Stopping service..."
        sudo systemctl stop "${SERVICE_NAME}"
    fi
    
    # Disable the service
    sudo systemctl disable "${SERVICE_NAME}"
    
    # Remove service file
    if [ -f "${SERVICE_FILE}" ]; then
        sudo rm "${SERVICE_FILE}"
    fi
    
    # Reload systemd daemon
    sudo systemctl daemon-reload
    
    print_status "Service uninstalled successfully!"
}

# Function to start the service
start_service() {
    print_header
    print_status "Starting PourPal service..."
    
    # Check if tmux session already exists
    if "$TMUX_BIN" has-session -t myapp 2>/dev/null; then
        print_warning "PourPal is already running in tmux session 'myapp'"
        print_status "Use 'tmux attach -t myapp' to attach to the session"
        return 0
    fi
    
    # Start the service
    sudo systemctl start "${SERVICE_NAME}"
    if [ $? -eq 0 ]; then
        print_status "Service started successfully!"
    else
        print_error "Failed to start service"
        exit 1
    fi
}

# Function to stop the service
stop_service() {
    print_header
    print_status "Stopping PourPal service..."
    
    # First try to stop tmux session
    if "$TMUX_BIN" has-session -t myapp 2>/dev/null; then
        print_status "Stopping tmux session 'myapp'..."
        "$TMUX_BIN" kill-session -t myapp
        print_status "Tmux session stopped"
    fi
    
    # Then stop the systemd service
    if sudo systemctl is-active --quiet "${SERVICE_NAME}"; then
        sudo systemctl stop "${SERVICE_NAME}"
        if [ $? -eq 0 ]; then
            print_status "Service stopped successfully!"
        else
            print_error "Failed to stop service"
            exit 1
        fi
    else
        print_warning "Service is not running"
    fi
}

# Function to restart the service
restart_service() {
    print_header
    print_status "Restarting PourPal service..."
    
    # Stop tmux session if running
    if tmux has-session -t myapp 2>/dev/null; then
        print_status "Stopping existing tmux session..."
        tmux kill-session -t myapp
    fi
    
    # Restart the systemd service
    sudo systemctl restart "${SERVICE_NAME}"
    if [ $? -eq 0 ]; then
        print_status "Service restarted successfully!"
    else
        print_error "Failed to restart service"
        exit 1
    fi
}

# Function to show service status
show_status() {
    print_header
    print_status "PourPal Service Status:"
    echo ""
    
    # Check tmux session status
    if "$TMUX_BIN" has-session -t myapp 2>/dev/null; then
        print_status "✅ Tmux session 'myapp' is running"
        print_status "Use 'tmux attach -t myapp' to attach to the session"
    else
        print_warning "❌ Tmux session 'myapp' is not running"
    fi
    
    echo ""
    print_status "Systemd Service Status:"
    sudo systemctl status "${SERVICE_NAME}" --no-pager
    
    echo ""
    print_status "Service Logs (last 20 lines):"
    sudo journalctl -u "${SERVICE_NAME}" -n 20 --no-pager
}

# Function to show service logs
show_logs() {
    print_header
    print_status "PourPal Service Logs:"
    echo ""
    
    if [ "$1" = "-f" ] || [ "$1" = "--follow" ]; then
        print_status "Following logs (Ctrl+C to exit)..."
        sudo journalctl -u "${SERVICE_NAME}" -f
    else
        sudo journalctl -u "${SERVICE_NAME}" --no-pager
    fi
}

# Function to enable/disable service
toggle_autostart() {
    print_header
    
    if [ "$1" = "enable" ]; then
        print_status "Enabling autostart on boot..."
        sudo systemctl enable "${SERVICE_NAME}"
        print_status "Service will now start automatically on boot"
    elif [ "$1" = "disable" ]; then
        print_status "Disabling autostart on boot..."
        sudo systemctl disable "${SERVICE_NAME}"
        print_status "Service will no longer start automatically on boot"
    else
        print_error "Invalid option. Use 'enable' or 'disable'"
        exit 1
    fi
}

# Function to show help
show_help() {
    print_header
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  install     - Install and enable the PourPal service"
    echo "  uninstall   - Remove the PourPal service"
    echo "  start       - Start the PourPal service"
    echo "  stop        - Stop the PourPal service"
    echo "  restart     - Restart the PourPal service"
    echo "  status      - Show service status and recent logs"
    echo "  logs        - Show service logs"
    echo "  logs -f     - Follow service logs in real-time"
    echo "  enable      - Enable autostart on boot"
    echo "  disable     - Disable autostart on boot"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install    # Install the service (run as user 'ppl')"
    echo "  $0 start      # Start the service"
    echo "  $0 status     # Check service status"
    echo "  $0 logs -f    # Follow logs in real-time"
}

# Main script logic
case "$1" in
    install)
        check_user
        install_service
        ;;
    uninstall)
        check_user
        uninstall_service
        ;;
    start)
        check_user
        start_service
        ;;
    stop)
        check_user
        stop_service
        ;;
    restart)
        check_user
        restart_service
        ;;
    status)
        check_user
        show_status
        ;;
    logs)
        check_user
        show_logs "$2"
        ;;
    enable)
        check_user
        toggle_autostart "enable"
        ;;
    disable)
        check_user
        toggle_autostart "disable"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Invalid command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
