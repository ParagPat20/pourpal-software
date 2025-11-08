# enhanced_loading_screen.py
import tkinter as tk
from PIL import Image, ImageTk
import os
import platform
import subprocess
import threading
import time

class EnhancedLoadingScreen:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("PourPal")
        
        # Remove window decorations and force fullscreen
        self.root.overrideredirect(True)  # Remove window decorations
        
        # Platform-specific fullscreen setup
        if platform.system() == "Linux":
            # For Raspberry Pi / Linux, use multiple methods to ensure fullscreen
            self.root.attributes("-fullscreen", True)
            self.root.attributes("-zoomed", True)  # Alternative fullscreen method
        else:
            self.root.attributes("-fullscreen", True)
        
        self.root.configure(bg="#1a1a1a")  # Dark background
        
        # Make sure window is on top
        self.root.attributes("-topmost", True)
        
        # Disable window resizing
        self.root.resizable(False, False)
        
        # Add ESC key to exit
        self.root.bind('<Escape>', lambda e: self.root.destroy())
        
        # Create main container
        self.container = tk.Frame(self.root, bg="#1a1a1a")
        self.container.place(relx=0.5, rely=0.5, anchor="center")
        
        # Initialize animation variables
        self.angle = 0
        self.app_ready = False
        self.start_time = time.time()
        self.max_wait_time = 20  # Maximum wait time in seconds
        
        # Force initial fullscreen setup
        self.root.update_idletasks()
        self.root.geometry(f"{self.root.winfo_screenwidth()}x{self.root.winfo_screenheight()}+0+0")
        
        self.setup_ui()
        self.start_animations()
        self.start_status_monitoring()
        self.start_fullscreen_monitor()
        
    def setup_ui(self):
        # Load and display logo
        try:
            if platform.system() == "Linux":
                logo_path = "/home/ppl/pourpal-software/static/img/pourpal_logo.png"
            else:
                logo_path = os.path.join(os.path.dirname(__file__), "static", "img", "pourpal_logo.png")
            
            if os.path.exists(logo_path):
                logo_image = Image.open(logo_path)
                # Resize logo
                max_size = 350
                ratio = min(max_size / logo_image.width, max_size / logo_image.height)
                new_width = int(logo_image.width * ratio)
                new_height = int(logo_image.height * ratio)
                logo_image = logo_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                self.logo_photo = ImageTk.PhotoImage(logo_image)
                self.logo_label = tk.Label(self.container, image=self.logo_photo, bg="#1a1a1a")
                self.logo_label.image = self.logo_photo
                self.logo_label.pack(pady=40)
        except Exception as e:
            # Fallback text if logo fails to load
            title_label = tk.Label(self.container, text="POURPAL", 
                                  font=("Arial", 56, "bold"),
                                  fg="#fff", bg="#1a1a1a")
            title_label.pack(pady=40)
        
        # Create canvas for spinning animation
        self.canvas = tk.Canvas(self.container, width=150, height=150, 
                              bg="#1a1a1a", highlightthickness=0)
        self.canvas.pack(pady=30)
        
    def draw_loading_circle(self):
        self.canvas.delete("all")
        # Draw spinning arc
        x0, y0 = 15, 15
        x1, y1 = 135, 135
        start = self.angle
        extent = 90
        self.canvas.create_arc(x0, y0, x1, y1, 
                             start=start, extent=extent,
                             outline="#00ff9d", width=8,
                             style="arc")
    
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
                    # Check if app is ready
                    if self.check_app_ready():
                        self.app_ready = True
                        break
                    
                    # Check timeout
                    elapsed = time.time() - self.start_time
                    if elapsed > self.max_wait_time:
                        self.app_ready = True
                        break
                    
                    time.sleep(2)  # Check every 2 seconds
                except Exception as e:
                    time.sleep(5)
            
            # Close the loading screen after a short delay
            if self.app_ready:
                self.root.after(1000, self.close_loading_screen)
        
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
    
    def close_loading_screen(self):
        """Close the loading screen"""
        try:
            self.root.destroy()
        except:
            pass
    
    def animate(self):
        if not self.app_ready:
            # Rotate loading circle
            self.angle = (self.angle + 12) % 360
            self.draw_loading_circle()
            # Continue animation
            self.root.after(30, self.animate)
    
    def start_animations(self):
        self.animate()
    
    def check_and_force_fullscreen(self):
        """Check if window is fullscreen and force it if not"""
        if not self.app_ready:
            try:
                # Always enforce fullscreen - don't just check, force it every time
                # This ensures it stays fullscreen even if something tries to change it
                self.root.overrideredirect(True)  # Remove window decorations
                
                # Platform-specific fullscreen enforcement
                if platform.system() == "Linux":
                    # For Raspberry Pi / Linux, use multiple methods
                    self.root.attributes("-fullscreen", True)
                    self.root.attributes("-zoomed", True)  # Alternative fullscreen method
                else:
                    self.root.attributes("-fullscreen", True)
                
                self.root.attributes("-topmost", True)
                self.root.resizable(False, False)
                
                # Get screen dimensions and set geometry
                screen_width = self.root.winfo_screenwidth()
                screen_height = self.root.winfo_screenheight()
                self.root.geometry(f"{screen_width}x{screen_height}+0+0")
                
                # Ensure window is raised to top
                self.root.lift()
                self.root.focus_force()
                
            except Exception as e:
                # If enforcement fails, try basic fullscreen
                try:
                    self.root.attributes("-fullscreen", True)
                    self.root.overrideredirect(True)
                except:
                    pass
            
            # Schedule next check in 1 second (always continue checking)
            self.root.after(1000, self.check_and_force_fullscreen)
    
    def start_fullscreen_monitor(self):
        """Start monitoring fullscreen state every second"""
        # Initial check after a short delay to ensure window is created
        self.root.after(500, self.check_and_force_fullscreen)
        
    def run(self):
        self.root.mainloop()

def create_loading_screen():
    app = EnhancedLoadingScreen()
    app.run()

if __name__ == "__main__":
    create_loading_screen()
