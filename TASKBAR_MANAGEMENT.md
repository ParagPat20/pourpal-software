# Taskbar Management for PourPal on Raspberry Pi 5

## 🎯 Overview

The PourPal system now includes automatic taskbar hiding for a clean, kiosk-mode experience on Raspberry Pi 5. The taskbar is automatically hidden on boot and can be toggled using the management script.

## ✅ Features Added

### 1. **Automatic Taskbar Hide on Boot**
   - Taskbar automatically hides when the system boots
   - Configured in `start_at_boot.sh`
   - Runs before the PourPal app starts

### 2. **Manual Taskbar Control**
   - Hide taskbar: `./manage_pourpal.sh hide-taskbar`
   - Show taskbar: `./manage_pourpal.sh unhide-taskbar`
   - Check status: `./manage_pourpal.sh taskbar-status`

### 3. **Multi-Desktop Environment Support**
   - **LXPanel** (Raspberry Pi OS default) ✅
   - **Waybar** (Wayland compositor) ✅
   - **Generic X11** (via xdotool) ✅

## 📋 Usage

### Hide the Taskbar
```bash
cd /home/ppl/pourpal-software
./manage_pourpal.sh hide-taskbar
```

**Output:**
```
=== PourPal Service Manager ===
[INFO] Hiding taskbar...
[INFO] ✅ Taskbar hidden successfully!
[INFO] Backup saved to /home/ppl/.config/lxpanel/LXDE-pi/panels/panel.backup
```

### Show the Taskbar
```bash
./manage_pourpal.sh unhide-taskbar
```

**Output:**
```
=== PourPal Service Manager ===
[INFO] Showing taskbar...
[INFO] ✅ Taskbar shown successfully!
[INFO] Backup available at /home/ppl/.config/lxpanel/LXDE-pi/panels/panel.backup
```

### Check Taskbar Status
```bash
./manage_pourpal.sh taskbar-status
```

**Output:**
```
=== PourPal Service Manager ===
[INFO] Taskbar Status:

[INFO] ✅ LXPanel is running
[INFO] 📍 Status: Hidden (autohide enabled)
```

## 🔧 How It Works

### On Boot (Automatic)

The `start_at_boot.sh` script includes taskbar hiding logic:

```bash
# Hide the taskbar for kiosk mode
echo "Hiding taskbar for kiosk mode..."
LXPANEL_CONFIG="/home/ppl/.config/lxpanel/LXDE-pi/panels/panel"

# For LXDE/LXPanel (Raspberry Pi OS default)
if command -v lxpanelctl &> /dev/null; then
    if [ -f "$LXPANEL_CONFIG" ]; then
        # Set autohide=1 and heightwhenhidden=0
        sed -i 's/autohide=0/autohide=1/g' "$LXPANEL_CONFIG"
        sed -i 's/heightwhenhidden=[0-9]*/heightwhenhidden=0/g' "$LXPANEL_CONFIG"
        
        # Restart panel to apply changes
        DISPLAY=:0 lxpanelctl restart 2>/dev/null || true
        echo "Taskbar hidden successfully (LXPanel autohide enabled)"
    fi
fi
```

### Boot Sequence:

1. ✅ **System boots**
2. ✅ **Systemd starts `pourpal.service`**
3. ✅ **`start_at_boot.sh` executes**
4. ✅ **Display detection waits for monitor**
5. ✅ **Taskbar is automatically hidden** ⬅️ NEW!
6. ✅ **Loading screen starts**
7. ✅ **PourPal app starts in tmux**
8. ✅ **Loading screen closes**
9. ✅ **PourPal app is ready (with hidden taskbar!)**

## 🎨 Desktop Environments Supported

### 1. LXPanel (Raspberry Pi OS Default)

**Method:** Modifies panel configuration file

**Config File:** `~/.config/lxpanel/LXDE-pi/panels/panel`

**Changes Made:**
- Sets `autohide=1` (enable autohide)
- Sets `heightwhenhidden=0` (completely hidden)
- Creates backup before modification

**Restore:**
```bash
# Automatic restore
./manage_pourpal.sh unhide-taskbar

# Or manual restore from backup
cp ~/.config/lxpanel/LXDE-pi/panels/panel.backup ~/.config/lxpanel/LXDE-pi/panels/panel
lxpanelctl restart
```

### 2. Waybar (Wayland)

**Method:** Kills/starts the waybar process

**Hide:**
```bash
pkill waybar
```

**Show:**
```bash
waybar &
```

### 3. Generic X11 (Fallback)

**Method:** Uses `xdotool` to hide windows

**Requires:** `sudo apt install xdotool`

**Hide:**
```bash
xdotool search --class "panel" windowunmap
```

**Show:**
```bash
xdotool search --class "panel" windowmap
```

## 📊 Configuration Details

### LXPanel Configuration Location

```
/home/ppl/.config/lxpanel/LXDE-pi/panels/panel
```

### Key Settings:

| Setting | Hidden | Visible |
|---------|--------|---------|
| `autohide` | `1` | `0` |
| `heightwhenhidden` | `0` | `2` |

### Backup Location:

```
/home/ppl/.config/lxpanel/LXDE-pi/panels/panel.backup
```

A backup is automatically created the first time you hide the taskbar.

## 🛠️ Manual Configuration (Advanced)

### Edit LXPanel Config Manually:

```bash
nano ~/.config/lxpanel/LXDE-pi/panels/panel
```

Find and change:
```
autohide=0  →  autohide=1
heightwhenhidden=2  →  heightwhenhidden=0
```

Restart the panel:
```bash
lxpanelctl restart
```

### Completely Disable LXPanel:

```bash
# Kill panel
pkill lxpanel

# Prevent auto-start (remove from autostart)
rm ~/.config/autostart/lxpanel.desktop
```

### Re-enable LXPanel:

```bash
# Start panel
lxpanel &

# Or restore from backup
lxpanel --profile LXDE-pi &
```

## 🔍 Troubleshooting

### Issue: Taskbar Still Visible

**Check 1:** Verify LXPanel is running
```bash
ps aux | grep lxpanel
```

**Check 2:** Check configuration
```bash
grep "autohide" ~/.config/lxpanel/LXDE-pi/panels/panel
```

**Check 3:** Force restart
```bash
pkill lxpanel
lxpanel --profile LXDE-pi &
```

**Check 4:** Run hide command again
```bash
./manage_pourpal.sh hide-taskbar
```

### Issue: Can't Find Panel Config

**Check config location:**
```bash
find ~/.config -name "panel" -type f
```

**Possible locations:**
- `~/.config/lxpanel/LXDE-pi/panels/panel`
- `~/.config/lxpanel/LXDE/panels/panel`
- `~/.config/lxpanel/default/panels/panel`

### Issue: Taskbar Reappears After Reboot

**Solution:** The `start_at_boot.sh` should handle this automatically.

**Check if service is running:**
```bash
./manage_pourpal.sh status
```

**Check startup logs:**
```bash
cat /home/ppl/pourpal-software/startup.log | grep -i taskbar
```

**Expected output:**
```
Hiding taskbar for kiosk mode...
Taskbar hidden successfully (LXPanel autohide enabled)
```

### Issue: Permission Denied

**Run as user `ppl`:**
```bash
whoami  # Should show: ppl
./manage_pourpal.sh hide-taskbar
```

**If running as different user:**
```bash
su - ppl
cd /home/ppl/pourpal-software
./manage_pourpal.sh hide-taskbar
```

## 📝 Testing

### Test 1: Manual Hide/Unhide

```bash
# Hide taskbar
./manage_pourpal.sh hide-taskbar

# Verify it's hidden
./manage_pourpal.sh taskbar-status

# Show taskbar
./manage_pourpal.sh unhide-taskbar

# Verify it's visible
./manage_pourpal.sh taskbar-status
```

### Test 2: Boot Behavior

```bash
# Reboot the Raspberry Pi
sudo reboot

# After boot, check taskbar status
cd /home/ppl/pourpal-software
./manage_pourpal.sh taskbar-status

# Should show: Hidden
```

### Test 3: Check Logs

```bash
# Check startup log
cat /home/ppl/pourpal-software/startup.log | grep -A 5 -B 5 "taskbar"

# Check service log
sudo journalctl -u pourpal | grep -i taskbar
```

## 🎯 Use Cases

### Kiosk Mode (Default)
- **Taskbar:** Hidden
- **Use:** Public-facing cocktail mixing station
- **Setup:** Automatic on boot
- **Command:** Already configured!

### Development Mode
- **Taskbar:** Visible
- **Use:** Debugging, maintenance, development
- **Setup:** Manual toggle
- **Command:** `./manage_pourpal.sh unhide-taskbar`

### Demo Mode
- **Taskbar:** Hidden
- **Use:** Demonstrations, presentations
- **Setup:** Manual toggle or automatic on boot
- **Command:** `./manage_pourpal.sh hide-taskbar`

## 🔄 Quick Reference

| Task | Command |
|------|---------|
| Hide taskbar | `./manage_pourpal.sh hide-taskbar` |
| Show taskbar | `./manage_pourpal.sh unhide-taskbar` |
| Check status | `./manage_pourpal.sh taskbar-status` |
| View logs | `cat startup.log \| grep taskbar` |
| Force restart panel | `lxpanelctl restart` |
| Restore from backup | `cp ~/.config/lxpanel/LXDE-pi/panels/panel.backup ~/.config/lxpanel/LXDE-pi/panels/panel && lxpanelctl restart` |

## 🎉 Benefits

✅ **Clean Interface** - Full-screen kiosk mode for PourPal
✅ **Automatic** - Hides on every boot without manual intervention
✅ **Reversible** - Easy to show/hide as needed
✅ **Safe** - Creates backup before modifying configs
✅ **Multi-DE Support** - Works with LXPanel, Waybar, or generic X11
✅ **Logged** - All actions logged to startup.log for debugging
✅ **User-Friendly** - Simple commands, clear status messages

## 🚀 Summary

The taskbar management system provides:

1. ✅ **Automatic hiding on boot** for kiosk mode
2. ✅ **Manual hide/unhide commands** for flexibility
3. ✅ **Status checking** to verify current state
4. ✅ **Backup system** to prevent data loss
5. ✅ **Multi-environment support** for various setups
6. ✅ **Comprehensive logging** for troubleshooting

Your Raspberry Pi 5 will now boot directly into a clean, full-screen PourPal interface with no taskbar visible! 🍹

## 📚 Related Files

- `manage_pourpal.sh` - Main management script with taskbar commands
- `start_at_boot.sh` - Startup script that auto-hides taskbar
- `pourpal.service` - Systemd service configuration
- `startup.log` - Boot logs including taskbar status

## 🔗 See Also

- [SERVICE_SETUP.md](SERVICE_SETUP.md) - How to install/configure the service
- [KEYBOARD_HANDLERS_ADDED.md](KEYBOARD_HANDLERS_ADDED.md) - On-screen keyboard setup
- [README.txt](README.txt) - General system documentation

