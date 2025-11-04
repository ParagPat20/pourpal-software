# PourPal Service Setup Guide

This guide explains how to set up the PourPal application to start automatically at boot using systemd and tmux.

## 📋 Overview

The service setup consists of:
- **`pourpal.service`** - Systemd service configuration
- **`start_at_boot.sh`** - Startup script that handles the boot process
- **`reload_service.sh`** - Helper script to reload/restart the service

## 🚀 Initial Setup

### 1. Make scripts executable
```bash
cd /home/ppl/pourpal-software
chmod +x start_at_boot.sh reload_service.sh
```

### 2. Copy service file to systemd
```bash
sudo cp pourpal.service /etc/systemd/system/
```

### 3. Reload systemd and enable service
```bash
sudo systemctl daemon-reload
sudo systemctl enable pourpal.service
sudo systemctl start pourpal.service
```

## 🔧 Service Configuration

### Service Type: `forking`
- Allows the script to exit while tmux keeps running
- Uses `RemainAfterExit=yes` to mark the service as active
- `KillMode=process` prevents systemd from killing tmux session

### Key Features:
- ✅ Waits for display connection (up to 60 seconds)
- ✅ Shows loading screen while starting
- ✅ Runs app in persistent tmux session named `myapp`
- ✅ Logs all output to `startup.log` and journalctl
- ✅ Auto-restart on failure

## 📝 Common Commands

### Check service status
```bash
sudo systemctl status pourpal.service
```

### View service logs
```bash
journalctl -u pourpal.service -f
```

### View startup log
```bash
tail -f /home/ppl/pourpal-software/startup.log
```

### Attach to tmux session
```bash
tmux attach -t myapp
```

### Detach from tmux
Press `Ctrl+B` then `D`

### List tmux sessions
```bash
tmux list-sessions
```

### Restart service
```bash
sudo systemctl restart pourpal.service
```

### Stop service
```bash
sudo systemctl stop pourpal.service
```

### Disable service (prevent auto-start)
```bash
sudo systemctl disable pourpal.service
```

## 🔄 After Making Changes

Whenever you update the service files, run:
```bash
./reload_service.sh
```

Or manually:
```bash
sudo cp pourpal.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart pourpal.service
```

## 🐛 Troubleshooting

### Issue: tmux session is empty or not found

**Check if session exists:**
```bash
tmux list-sessions
```

**Check service logs:**
```bash
journalctl -u pourpal.service -n 50
```

**Check startup log:**
```bash
cat /home/ppl/pourpal-software/startup.log
```

### Issue: Service fails to start

**Check service status:**
```bash
sudo systemctl status pourpal.service
```

**Check if display is connected:**
```bash
echo $DISPLAY
xrandr
```

**Manually test the startup script:**
```bash
cd /home/ppl/pourpal-software
./start_at_boot.sh
```

### Issue: App not accessible in browser

**Check if Python is running in tmux:**
```bash
tmux attach -t myapp
```

**Check if port 5000 is listening:**
```bash
netstat -tuln | grep 5000
```

### Issue: Service stops after boot

**Check if service is enabled:**
```bash
sudo systemctl is-enabled pourpal.service
```

**Check for errors in logs:**
```bash
journalctl -u pourpal.service --since "10 minutes ago"
```

## 🔍 Understanding the Startup Process

1. **System boots** → systemd starts `pourpal.service`
2. **Service runs** `start_at_boot.sh`
3. **Script launches** loading screen (Python GUI)
4. **Script waits** for display connection (xrandr check)
5. **Display detected** → Creates tmux session `myapp`
6. **Tmux session runs** `python3 app.py`
7. **After 4 seconds** → Kills loading screen
8. **Script exits** → Service remains "active (exited)"
9. **Tmux continues** running the app independently

## 📊 Service Files

### pourpal.service
- Location: `/etc/systemd/system/pourpal.service`
- Purpose: Defines how systemd manages the service
- Type: `forking` with `RemainAfterExit=yes`

### start_at_boot.sh
- Location: `/home/ppl/pourpal-software/start_at_boot.sh`
- Purpose: Handles the actual startup logic
- Output: Logged to `startup.log` and journalctl

### startup.log
- Location: `/home/ppl/pourpal-software/startup.log`
- Purpose: Detailed startup logs for debugging
- Auto-created: Yes, appends on each startup

## 🎯 Expected Behavior

After reboot:
1. ✅ Service status shows **"active (exited)"** (this is correct!)
2. ✅ `tmux list-sessions` shows **`myapp`** session
3. ✅ `tmux attach -t myapp` shows running Python app
4. ✅ Web interface accessible at `http://localhost:5000`
5. ✅ `startup.log` contains successful startup messages

## 🆘 Getting Help

If issues persist:
1. Collect logs: `journalctl -u pourpal.service -n 100 > service_logs.txt`
2. Collect startup log: `cat /home/ppl/pourpal-software/startup.log > startup_logs.txt`
3. Check tmux: `tmux capture-pane -t myapp -p > tmux_output.txt`
4. Review all three log files for errors

