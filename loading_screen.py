# loading_screen.py
import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk
import math
import os
import platform

class ModernLoadingScreen:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Loading...")
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
        
        self.setup_ui()
        self.start_animations()
        
    def setup_ui(self):
        # Create canvas for spinning animation
        self.canvas = tk.Canvas(self.container, width=100, height=100, 
                              bg="#1a1a1a", highlightthickness=0)
        self.canvas.pack(pady=20)
        
        # Load and display logo with fade effect
        try:
            if platform.system() == "Linux":
                logo_path = "/home/jecon/pourpal-software/static/img/logo.png"
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
                self.logo_label = tk.Label(self.container, image=self.logo_photo, 
                                         bg="#1a1a1a")
                self.logo_label.image = self.logo_photo
                self.logo_label.pack(pady=20)
        except Exception as e:
            print(f"Error loading logo: {e}")

        # Modern progress bar style
        style = ttk.Style()
        style.theme_use('default')
        style.configure("Modern.Horizontal.TProgressbar",
                       troughcolor="#2a2a2a",
                       background="#00ff9d",
                       thickness=4)
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(
            self.container,
            style="Modern.Horizontal.TProgressbar",
            length=300,
            variable=self.progress_var,
            mode='determinate'
        )
        self.progress_bar.pack(pady=30)
        
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
    
    def animate(self):
        # Rotate loading circle
        self.angle = (self.angle + 10) % 360
        self.draw_loading_circle()
        
        # Update progress
        if self.progress < 100:
            self.progress += 0.7
            self.progress_var.set(self.progress)
        
        # Continue animation
        self.root.after(20, self.animate)
    
    def start_animations(self):
        self.animate()
        
    def run(self):
        self.root.mainloop()

def create_loading_screen():
    app = ModernLoadingScreen()
    app.run()

if __name__ == "__main__":
    create_loading_screen()