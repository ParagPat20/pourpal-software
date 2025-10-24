# enhanced_loading_screen.py
import tkinter as tk
from tkinter import ttk, scrolledtext
from PIL import Image, ImageTk
import math
import os
import platform
import subprocess
import threading
import time

class EnhancedLoadingScreen:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("PourPal - Loading...")
        self.root.attributes("-fullscreen", True)
        self.root.configure(bg="#1a1a1a")  # Dark background
        
        # Add error handling for ESC key to exit
        self.root.bind('<Escape>', lambda e: self.root.destroy())
        
        # Create main container
        self.container = tk.Frame(self.root, bg="#1a1a1a")
        self.container.place(relx=0.5, rely=0.5, anchor="center")
        
        # Initialize animation variables
        self.angle = 0
        self.alpha = 0
        self.progress = 0
        self.current_message = ""
        self.messages = []
        self.message_index = 0
        self.fade_alpha = 0
        self.fade_direction = 1
        
        # Status variables
        self.display_info = ""
        self.system_info = ""
        self.loading_status = "Initializing..."
        self.app_ready = False
        self.start_time = time.time()
        self.max_wait_time = 20  # Maximum wait time in seconds
        
        # Loading messages with fade effect
        self.loading_messages = [
            "Initializing PourPal System...",
            "Checking display connection...",
            "Loading system components...",
            "Starting HTTP server...",
            "Initializing Electron application...",
            "Loading cocktail database...",
            "Connecting to Arduino...",
            "Finalizing setup...",
            "Almost ready..."
        ]
        
        self.setup_ui()
        self.start_animations()
        self.start_status_monitoring()
        
    def setup_ui(self):
        # Create main content frame
        main_frame = tk.Frame(self.container, bg="#1a1a1a")
        main_frame.pack(expand=True, fill="both")
        
        # Top section - Logo and spinning animation
        top_frame = tk.Frame(main_frame, bg="#1a1a1a")
        top_frame.pack(pady=20)
        
        # Create canvas for spinning animation
        self.canvas = tk.Canvas(top_frame, width=100, height=100, 
                              bg="#1a1a1a", highlightthickness=0)
        self.canvas.pack(side="left", padx=20)
        
        # Load and display logo with fade effect
        try:
            if platform.system() == "Linux":
                logo_path = "/home/ppl/pourpal-software/static/img/logo.png"
            else:
                logo_path = os.path.join(os.path.dirname(__file__), "static", "img", "logo.png")
            
            if os.path.exists(logo_path):
                logo_image = Image.open(logo_path)
                # Calculate new dimensions maintaining aspect ratio
                max_size = 200  # Maximum width or height
                ratio = min(max_size / logo_image.width, max_size / logo_image.height)
                new_width = int(logo_image.width * ratio)
                new_height = int(logo_image.height * ratio)
                logo_image = logo_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                self.logo_photo = ImageTk.PhotoImage(logo_image)
                self.logo_label = tk.Label(top_frame, image=self.logo_photo, 
                                         bg="#1a1a1a")
                self.logo_label.image = self.logo_photo
                self.logo_label.pack(side="left", padx=20)
        except Exception as e:
            print(f"Error loading logo: {e}")

        # Status information frame
        status_frame = tk.Frame(main_frame, bg="#1a1a1a")
        status_frame.pack(pady=20, fill="x")
        
        # Display information
        self.display_label = tk.Label(status_frame, text="", 
                                    font=("Arial", 12), 
                                    fg="#00ff9d", bg="#1a1a1a", 
                                    wraplength=600, justify="left")
        self.display_label.pack(pady=5)
        
        # System information
        self.system_label = tk.Label(status_frame, text="", 
                                   font=("Arial", 10), 
                                   fg="#888888", bg="#1a1a1a",
                                   wraplength=600, justify="left")
        self.system_label.pack(pady=5)
        
        # Loading status with fade effect
        self.status_label = tk.Label(status_frame, text="Initializing...", 
                                    font=("Arial", 14, "bold"), 
                                    fg="#00ff9d", bg="#1a1a1a")
        self.status_label.pack(pady=10)
        
        # Progress bar
        style = ttk.Style()
        style.theme_use('default')
        style.configure("Modern.Horizontal.TProgressbar",
                       troughcolor="#2a2a2a",
                       background="#00ff9d",
                       thickness=6)
        
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(
            status_frame,
            style="Modern.Horizontal.TProgressbar",
            length=400,
            variable=self.progress_var,
            mode='determinate'
        )
        self.progress_bar.pack(pady=20)
        
        # Log display area
        log_frame = tk.Frame(main_frame, bg="#1a1a1a")
        log_frame.pack(pady=20, fill="both", expand=True)
        
        # Log title
        log_title = tk.Label(log_frame, text="Loading Logs:", 
                            font=("Arial", 12, "bold"), 
                            fg="#00ff9d", bg="#1a1a1a")
        log_title.pack(anchor="w", pady=(0, 5))
        
        # Log text area
        self.log_text = scrolledtext.ScrolledText(
            log_frame, 
            height=8, 
            width=80,
            bg="#2a2a2a", 
            fg="#00ff9d", 
            font=("Courier", 9),
            wrap=tk.WORD,
            state=tk.DISABLED
        )
        self.log_text.pack(fill="both", expand=True)
        
    def draw_loading_circle(self):
        self.canvas.delete("all")
        # Draw spinning arc
        x0, y0 = 10, 10
        x1, y1 = 90, 90
        start = self.angle
        extent = 60
        self.canvas.create_arc(x0, y0, x1, y1, 
                             start=start, extent=extent,
                             outline="#00ff9d", width=4,
                             style="arc")
    
    def get_display_info(self):
        """Get display information using xrandr"""
        try:
            result = subprocess.run(['xrandr'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                connected_displays = []
                for line in lines:
                    if ' connected' in line:
                        connected_displays.append(line.strip())
                
                if connected_displays:
                    return f"✅ Display Connected: {', '.join(connected_displays)}"
                else:
                    return "❌ No display connected"
            else:
                return "❌ Unable to check display status"
        except Exception as e:
            return f"❌ Display check failed: {str(e)}"
    
    def get_system_info(self):
        """Get system information"""
        try:
            # Get system info
            uname_result = subprocess.run(['uname', '-a'], capture_output=True, text=True, timeout=5)
            system_info = uname_result.stdout.strip() if uname_result.returncode == 0 else "Unknown system"
            
            # Get memory info
            try:
                with open('/proc/meminfo', 'r') as f:
                    meminfo = f.read()
                    mem_total = next((line for line in meminfo.split('\n') if 'MemTotal' in line), 'MemTotal: Unknown')
            except:
                mem_total = "MemTotal: Unknown"
            
            return f"System: {system_info.split()[0]} | {mem_total}"
        except Exception as e:
            return f"System info unavailable: {str(e)}"
    
    def check_app_ready(self):
        """Check if the main application is ready"""
        try:
            # Check if HTTP server is responding
            import urllib.request
            response = urllib.request.urlopen('http://127.0.0.1:5000', timeout=2)
            if response.getcode() == 200:
                return True
        except:
            pass
        
        # Check if tmux session exists and is running
        try:
            result = subprocess.run(['tmux', 'has-session', '-t', 'myapp'], 
                                 capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                # Check if the session is active
                result = subprocess.run(['tmux', 'list-sessions', '-F', '#{session_name}:#{session_attached}'], 
                                     capture_output=True, text=True, timeout=2)
                if 'myapp:1' in result.stdout:
                    return True
        except:
            pass
        
        return False
    
    def start_status_monitoring(self):
        """Start monitoring system status in a separate thread"""
        def monitor():
            while not self.app_ready:
                try:
                    # Update display info
                    self.display_info = self.get_display_info()
                    self.display_label.config(text=self.display_info)
                    
                    # Update system info
                    self.system_info = self.get_system_info()
                    self.system_label.config(text=self.system_info)
                    
                    # Check if app is ready
                    if self.check_app_ready():
                        self.app_ready = True
                        self.add_log(f"[{time.strftime('%H:%M:%S')}] ✅ Application is ready!")
                        self.status_label.config(text="✅ Application Ready!")
                        break
                    
                    # Check timeout
                    elapsed = time.time() - self.start_time
                    if elapsed > self.max_wait_time:
                        self.add_log(f"[{time.strftime('%H:%M:%S')}] ⚠️ Timeout reached, closing loading screen...")
                        self.app_ready = True
                        break
                    
                    # Add log entry
                    timestamp = time.strftime("%H:%M:%S")
                    self.add_log(f"[{timestamp}] {self.display_info}")
                    
                    time.sleep(2)  # Update every 2 seconds
                except Exception as e:
                    self.add_log(f"Error in monitoring: {str(e)}")
                    time.sleep(5)
            
            # Close the loading screen after a short delay
            if self.app_ready:
                self.add_log(f"[{time.strftime('%H:%M:%S')}] 🎉 Closing loading screen...")
                self.root.after(2000, self.close_loading_screen)  # Close after 2 seconds
        
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
    
    def close_loading_screen(self):
        """Close the loading screen"""
        try:
            self.root.destroy()
        except:
            pass
    
    def add_log(self, message):
        """Add a message to the log display"""
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)
    
    def animate(self):
        try:
            # Rotate loading circle
            self.angle = (self.angle + 10) % 360
            self.draw_loading_circle()
            
            # Update progress
            if self.progress < 100 and not self.app_ready:
                self.progress += 0.5
                self.progress_var.set(self.progress)
            
            # Update loading message with fade effect
            if self.progress > 0 and int(self.progress) % 10 == 0 and self.message_index < len(self.loading_messages) and not self.app_ready:
                self.current_message = self.loading_messages[self.message_index]
                self.status_label.config(text=self.current_message)
                self.message_index += 1
                
                # Add to log
                timestamp = time.strftime("%H:%M:%S")
                self.add_log(f"[{timestamp}] {self.current_message}")
            
            # Fade effect for status message (only if app not ready)
            if not self.app_ready:
                self.fade_alpha += self.fade_direction * 0.05
                if self.fade_alpha >= 1.0:
                    self.fade_alpha = 1.0
                    self.fade_direction = -1
                elif self.fade_alpha <= 0.3:
                    self.fade_alpha = 0.3
                    self.fade_direction = 1
                
                # Apply fade effect to status label using brightness
                if self.fade_alpha > 0.8:
                    color = "#00ff9d"  # Bright green
                elif self.fade_alpha > 0.6:
                    color = "#00cc7d"  # Medium green
                elif self.fade_alpha > 0.4:
                    color = "#00995d"  # Darker green
                else:
                    color = "#00663d"  # Dark green
                
                # Only update color if the widget still exists
                if hasattr(self, 'status_label') and self.status_label.winfo_exists():
                    self.status_label.config(fg=color)
            
            # Continue animation
            self.root.after(50, self.animate)
            
        except Exception as e:
            print(f"Animation error: {e}")
            # Continue animation even if there's an error
            self.root.after(50, self.animate)
    
    def start_animations(self):
        self.animate()
        
    def run(self):
        self.root.mainloop()

def create_loading_screen():
    app = EnhancedLoadingScreen()
    app.run()

if __name__ == "__main__":
    create_loading_screen()
