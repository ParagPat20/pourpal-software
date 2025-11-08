# loading_screen.py
import tkinter as tk
from PIL import Image, ImageTk
import os
import platform

class ModernLoadingScreen:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("PourPal")
        self.root.attributes("-fullscreen", True)
        self.root.configure(bg="#1a1a1a")  # Dark background
        
        # Add ESC key to exit
        self.root.bind('<Escape>', lambda e: self.root.destroy())
        
        # Create main container
        self.container = tk.Frame(self.root, bg="#1a1a1a")
        self.container.place(relx=0.5, rely=0.5, anchor="center")
        
        # Initialize animation variables
        self.angle = 0
        self.is_complete = False
        
        self.setup_ui()
        self.start_animations()
        
    def setup_ui(self):
        # Load and display logo
        try:
            if platform.system() == "Linux":
                logo_path = "/home/ppl/pourpal-software/static/img/pourpal_logo_white.png"
            else:
                logo_path = os.path.join(os.path.dirname(__file__), "static", "img", "pourpal_logo_white.png")
            
            if os.path.exists(logo_path):
                logo_image = Image.open(logo_path)
                # Resize logo
                max_size = 250
                ratio = min(max_size / logo_image.width, max_size / logo_image.height)
                new_width = int(logo_image.width * ratio)
                new_height = int(logo_image.height * ratio)
                logo_image = logo_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                self.logo_photo = ImageTk.PhotoImage(logo_image)
                self.logo_label = tk.Label(self.container, image=self.logo_photo, bg="#1a1a1a")
                self.logo_label.image = self.logo_photo
                self.logo_label.pack(pady=30)
        except Exception as e:
            # Fallback text if logo fails to load
            title_label = tk.Label(self.container, text="POURPAL", 
                                  font=("Arial", 48, "bold"),
                                  fg="#00ff9d", bg="#1a1a1a")
            title_label.pack(pady=30)
        
        # Create canvas for spinning animation
        self.canvas = tk.Canvas(self.container, width=120, height=120, 
                              bg="#1a1a1a", highlightthickness=0)
        self.canvas.pack(pady=20)
        
        # Status label
        self.status_label = tk.Label(self.container, text="Initializing System...", 
                                    font=("Arial", 16),
                                    fg="#00ff9d", bg="#1a1a1a")
        self.status_label.pack(pady=20)
        
    def draw_loading_circle(self):
        self.canvas.delete("all")
        # Draw spinning arc
        x0, y0 = 10, 10
        x1, y1 = 110, 110
        start = self.angle
        extent = 90
        self.canvas.create_arc(x0, y0, x1, y1, 
                             start=start, extent=extent,
                             outline="#00ff9d", width=6,
                             style="arc")
    
    def animate(self):
        if not self.is_complete:
            # Rotate loading circle
            self.angle = (self.angle + 12) % 360
            self.draw_loading_circle()
            # Continue animation
            self.root.after(30, self.animate)
    
    def complete(self):
        """Show completion message"""
        self.is_complete = True
        self.canvas.delete("all")
        self.status_label.config(text="✓ System Ready")
        # Auto-close after 1 second
        self.root.after(1000, self.root.destroy)
    
    def start_animations(self):
        self.animate()
        # Simulate completion after 3 seconds (adjust as needed)
        self.root.after(3000, self.complete)
        
    def run(self):
        self.root.mainloop()

def create_loading_screen():
    app = ModernLoadingScreen()
    app.run()

if __name__ == "__main__":
    create_loading_screen()