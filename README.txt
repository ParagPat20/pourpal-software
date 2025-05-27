Cocktail Mixing System Documentation
=================================

Table of Contents:
-----------------
1. Introduction
2. System Requirements
3. Raspberry Pi 5 Support
4. Installation Guide
5. Main Features
6. User Interface Guide
7. Button Functionalities
8. Customization Options
9. Troubleshooting

1. Introduction
---------------
Welcome to the Cocktail Mixing System! This application is designed to help you manage and create custom cocktails using a sophisticated ingredient management system and automated mixing capabilities.

{---Add image for main interface---}

2. System Requirements
---------------------
- Operating System: Windows 10 or Linux
- Python 3.x
- Node.js and npm (for Electron)
- Serial port access (for hardware communication)
- Minimum 4GB RAM
- 500MB free disk space

3. Raspberry Pi 5 Support
------------------------
The application is fully compatible with Raspberry Pi 5 running Linux. Here are the specific requirements and setup instructions:

Hardware Requirements:
---------------------
- Raspberry Pi 5 (4GB or 8GB RAM recommended)
- USB Serial Adapter (if using external serial device)
- HDMI Display
- USB Keyboard and Mouse
- Power Supply (5V/5A recommended)

Linux Setup Commands:
-------------------
1. Update system packages:
   sudo apt update && sudo apt upgrade -y

2. Install required dependencies:
   sudo apt install -y python3-pip nodejs npm git

3. Install Python packages:
   pip3 install pyserial

4. Set up serial port permissions:
   sudo usermod -a -G dialout $USER
   sudo chmod 666 /dev/ttyUSB0  # Replace ttyUSB0 with your actual port

5. Configure display (if using HDMI):
   sudo raspi-config
   # Navigate to Display Options > Resolution
   # Select your preferred resolution

6. Enable required interfaces:
   sudo raspi-config
   # Enable I2C, SPI, and Serial interfaces

7. Set up auto-start (optional):
   sudo nano /etc/xdg/autostart/cocktail-mixer.desktop
   # Add the following content:
   [Desktop Entry]
   Type=Application
   Name=Cocktail Mixer
   Exec=/usr/bin/python3 /path/to/your/app.py
   X-GNOME-Autostart-enabled=true

8. Monitor system resources:
   # Check CPU temperature
   vcgencmd measure_temp
   
   # Monitor CPU usage
   top
   
   # Check memory usage
   free -h
   
   # View system logs
   journalctl -u cocktail-mixer

Troubleshooting Raspberry Pi:
---------------------------
1. Serial Port Issues:
   ls -l /dev/tty*  # List available serial ports
   dmesg | grep tty  # Check kernel messages for serial devices
   sudo chmod 666 /dev/ttyUSB0  # Fix permissions if needed

2. Display Issues:
   tvservice -s  # Check display status
   tvservice -p  # Power on HDMI
   tvservice -o  # Power off HDMI

3. Network Issues:
   ifconfig  # Check network interfaces
   ping 8.8.8.8  # Test internet connectivity
   hostname -I  # Show IP address

4. System Monitoring:
   htop  # Interactive process viewer
   iotop  # Monitor disk I/O
   vcgencmd get_throttled  # Check for throttling


4. Installation Guide
--------------------
1. Clone the repository
2. Install Python dependencies:
   pip install -r requirements.txt
3. Install Node.js dependencies:
   npm install
4. Run the application:
   python app.py

{---Add image for installation process---}

5. Main Features
---------------
- Ingredient Management
- Cocktail Creation
- Pipe Assignment
- Real-time Hardware Communication
- Customizable Interface
- Cocktail Database Management

{---Add image for main features overview---}

6. User Interface Guide
----------------------

Main Navigation:
---------------
The application has several main sections accessible through the navigation buttons:

1. Find Cocktail
   - Search and select ingredients
   - View available cocktails
   - Filter ingredients by type

2. Add Ingredients
   - Add new ingredients to the database
   - Upload ingredient images
   - Set ingredient properties

3. Add Cocktail
   - Create new cocktail recipes
   - Define ingredient proportions
   - Set cocktail properties

4. All Cocktails
   - View complete cocktail database
   - Search and filter cocktails
   - Edit existing cocktails

5. Cocktail Details
   - View detailed information about cocktails
   - See ingredient lists
   - View preparation instructions

6. Available Cocktails
   - See cocktails that can be made with current ingredients
   - Check ingredient availability
   - Select cocktails for preparation

7. Assign Pipe
   - Configure pipe assignments
   - Set up ingredient-to-pipe mapping
   - Save pipe configurations

{---Add image for navigation interface---}

7. Button Functionalities
------------------------

Main Navigation Buttons:
-----------------------
- Find Cocktail: Opens ingredient search and selection interface
- Add Ingredients: Opens new ingredient creation form
- Add Cocktail: Opens new cocktail creation form
- All Cocktails: Shows complete cocktail database
- Cocktail Details: Displays detailed cocktail information
- Available Cocktails: Shows possible cocktails with current ingredients
- Assign Pipe: Opens pipe configuration interface

Action Buttons:
--------------
- Search: Filters ingredients or cocktails based on input
- Clear All: Removes all selected ingredients
- Customize: Opens interface customization options
- Generate: Creates pipe assignments
- Save: Stores current configuration
- Back: Returns to previous screen

{---Add image for button layout---}

8. Customization Options
-----------------------
The application offers several customization features:

1. Interface Colors:
   - Button background colors
   - Button hover colors
   - Text colors
   - Background colors

2. Pipe Configuration:
   - Number of pipes (1-100)
   - Pipe-to-ingredient mapping
   - Default configurations

3. Display Options:
   - Layout preferences
   - View modes
   - Filter settings

{---Add image for customization interface---}

9. Troubleshooting
-----------------
Common Issues and Solutions:

1. Serial Port Connection:
   - Check if the correct port is selected
   - Verify hardware connection
   - Restart the application

2. Image Processing:
   - Ensure images are in supported formats
   - Check file permissions
   - Verify storage space

3. Database Issues:
   - Check file permissions
   - Verify JSON file integrity
   - Restart the application

{---Add image for troubleshooting interface---}

For additional support or questions, please contact the system administrator.

Note: This documentation is subject to updates and improvements. Please check for the latest version. 