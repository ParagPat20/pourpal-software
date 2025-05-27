import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk
import os
import threading # To run batch processing in the background

class BackgroundRemoverApp:
    """
    A GUI application using Tkinter to remove near-white backgrounds from images
    with a tolerance slider and preview.
    """
    def __init__(self, master):
        self.master = master
        master.title("Image Background Remover")
        master.geometry("800x650") # Adjusted size for better layout

        # --- Variables ---
        self.input_folder = tk.StringVar()
        self.output_folder = tk.StringVar()
        self.image_files = []
        self.current_image_index = tk.IntVar(value=-1) # Index for preview image list
        self.tolerance = tk.IntVar(value=240) # Default tolerance
        self.original_img_pil = None # To hold the loaded PIL Image for preview
        self.original_img_tk = None # To hold the Tkinter PhotoImage for display
        self.processed_img_tk = None # To hold the processed Tkinter PhotoImage for display

        # --- GUI Setup ---
        # Use a main frame for better padding and organization
        main_frame = ttk.Frame(master, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Configure grid weights for responsiveness
        main_frame.columnconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(3, weight=1) # Image preview row should expand

        # --- Folder Selection ---
        folder_frame = ttk.LabelFrame(main_frame, text="Folders", padding="10")
        folder_frame.grid(row=0, column=0, columnspan=2, sticky="ew", pady=5)
        folder_frame.columnconfigure(1, weight=1) # Make entry expand

        ttk.Button(folder_frame, text="Select Input Folder", command=self.select_input_folder).grid(row=0, column=0, padx=5, pady=5, sticky="w")
        ttk.Entry(folder_frame, textvariable=self.input_folder, width=60).grid(row=0, column=1, padx=5, pady=5, sticky="ew")

        ttk.Button(folder_frame, text="Select Output Folder", command=self.select_output_folder).grid(row=1, column=0, padx=5, pady=5, sticky="w")
        ttk.Entry(folder_frame, textvariable=self.output_folder, width=60).grid(row=1, column=1, padx=5, pady=5, sticky="ew")

        # --- Image Navigation and Tolerance ---
        controls_frame = ttk.LabelFrame(main_frame, text="Preview Controls", padding="10")
        controls_frame.grid(row=1, column=0, columnspan=2, sticky="ew", pady=5)
        controls_frame.columnconfigure(1, weight=1) # Make slider expand

        nav_frame = ttk.Frame(controls_frame) # Frame for Prev/Next buttons
        nav_frame.grid(row=0, column=0, padx=5, pady=5, sticky="w")
        ttk.Button(nav_frame, text="Previous", command=self.prev_image).pack(side=tk.LEFT, padx=2)
        ttk.Button(nav_frame, text="Next", command=self.next_image).pack(side=tk.LEFT, padx=2)
        self.image_label = ttk.Label(controls_frame, text="No image selected")
        self.image_label.grid(row=0, column=1, padx=5, pady=5, sticky="w")

        ttk.Label(controls_frame, text="Tolerance:").grid(row=1, column=0, padx=5, pady=5, sticky="w")
        self.tolerance_slider = ttk.Scale(controls_frame, from_=0, to=255, orient=tk.HORIZONTAL, variable=self.tolerance, command=self.update_preview)
        self.tolerance_slider.grid(row=1, column=1, padx=5, pady=5, sticky="ew")
        self.tolerance_label = ttk.Label(controls_frame, textvariable=self.tolerance)
        self.tolerance_label.grid(row=1, column=2, padx=5, pady=5, sticky="e")

        # --- Image Preview ---
        preview_frame = ttk.Frame(main_frame, padding="10")
        preview_frame.grid(row=2, column=0, columnspan=2, sticky="nsew", pady=5)
        preview_frame.columnconfigure(0, weight=1)
        preview_frame.columnconfigure(1, weight=1)
        preview_frame.rowconfigure(1, weight=1) # Make canvas expand

        ttk.Label(preview_frame, text="Original Image").grid(row=0, column=0, pady=2)
        ttk.Label(preview_frame, text="Processed Preview").grid(row=0, column=1, pady=2)

        # Use Labels to display images (simpler than Canvas for static display)
        # Add a border for visual separation
        self.original_canvas = tk.Label(preview_frame, bg="lightgrey", relief="sunken", bd=1)
        self.original_canvas.grid(row=1, column=0, padx=5, pady=5, sticky="nsew")

        self.processed_canvas = tk.Label(preview_frame, bg="lightgrey", relief="sunken", bd=1)
        self.processed_canvas.grid(row=1, column=1, padx=5, pady=5, sticky="nsew")

        # --- Action Button & Status ---
        action_frame = ttk.Frame(main_frame, padding="10")
        action_frame.grid(row=3, column=0, columnspan=2, sticky="ew", pady=5)
        action_frame.columnconfigure(0, weight=1) # Make status label expand

        self.process_button = ttk.Button(action_frame, text="Process All Images", command=self.start_batch_processing, state=tk.DISABLED)
        self.process_button.grid(row=0, column=1, padx=5, pady=5, sticky="e")

        self.status_label = ttk.Label(action_frame, text="Status: Select input and output folders.")
        self.status_label.grid(row=0, column=0, padx=5, pady=5, sticky="w")

        # --- Bind resize event ---
        # self.master.bind("<Configure>", self.on_resize) # Optional: handle resize if needed


    def select_input_folder(self):
        """Opens dialog to select input folder and loads image list."""
        folder_path = filedialog.askdirectory()
        if folder_path:
            self.input_folder.set(folder_path)
            self.load_image_list()
            self.check_button_state()

    def select_output_folder(self):
        """Opens dialog to select output folder."""
        folder_path = filedialog.askdirectory()
        if folder_path:
            self.output_folder.set(folder_path)
            self.check_button_state()

    def check_button_state(self):
        """Enables Process button only if both folders are selected."""
        if self.input_folder.get() and self.output_folder.get():
            self.process_button.config(state=tk.NORMAL)
            self.status_label.config(text="Status: Ready. Adjust tolerance and preview images.")
        else:
            self.process_button.config(state=tk.DISABLED)

    def load_image_list(self):
        """Scans the input folder for image files."""
        self.image_files = []
        folder = self.input_folder.get()
        if not folder or not os.path.isdir(folder):
            self.current_image_index.set(-1)
            self.clear_previews()
            self.image_label.config(text="Invalid input folder")
            return

        try:
            for filename in sorted(os.listdir(folder)): # Sort for consistent order
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
                    self.image_files.append(os.path.join(folder, filename))

            if self.image_files:
                self.current_image_index.set(0) # Start with the first image
                self.load_preview_image()
            else:
                self.current_image_index.set(-1)
                self.clear_previews()
                self.image_label.config(text="No images found in folder")
                self.status_label.config(text="Status: No images found in input folder.")
        except Exception as e:
            messagebox.showerror("Error Loading Images", f"Could not read input folder:\n{e}")
            self.current_image_index.set(-1)
            self.clear_previews()


    def load_preview_image(self):
        """Loads the currently selected image for preview."""
        idx = self.current_image_index.get()
        if not self.image_files or idx < 0 or idx >= len(self.image_files):
            self.clear_previews()
            return

        filepath = self.image_files[idx]
        try:
            # Load the original image using PIL
            self.original_img_pil = Image.open(filepath)
            self.original_img_pil = self.original_img_pil.convert("RGBA") # Ensure RGBA

            # Update image label
            filename = os.path.basename(filepath)
            self.image_label.config(text=f"Preview: {filename} ({idx + 1}/{len(self.image_files)})")

            # Display original and trigger processed preview update
            self.display_image(self.original_img_pil, self.original_canvas, "original")
            self.update_preview() # Update processed view with current tolerance

        except Exception as e:
            messagebox.showerror("Error Loading Image", f"Could not load image:\n{filepath}\n{e}")
            self.clear_previews()
            self.image_label.config(text="Error loading image")
            # Try loading next image if possible
            if len(self.image_files) > 1:
                self.image_files.pop(idx) # Remove problematic file from list
                if idx >= len(self.image_files): # Adjust index if it was the last one
                    self.current_image_index.set(len(self.image_files) - 1)
                else:
                     self.current_image_index.set(idx) # Keep index, next load will get the new file at this index
                self.load_preview_image() # Recursively try next
            else:
                 self.image_files = []
                 self.current_image_index.set(-1)


    def display_image(self, pil_image, canvas_widget, type_flag):
        """Resizes and displays a PIL image on a Tkinter Label widget."""
        if pil_image is None:
            canvas_widget.config(image='') # Clear image
            return

        # --- Resize image to fit the canvas ---
        canvas_width = canvas_widget.winfo_width()
        canvas_height = canvas_widget.winfo_height()

        # Prevent division by zero if canvas hasn't been rendered yet
        if canvas_width <= 1 or canvas_height <= 1:
             # Estimate size or use a default if not rendered
             canvas_width = 350 # Approximate initial size
             canvas_height = 300

        img_copy = pil_image.copy()
        img_copy.thumbnail((canvas_width - 10, canvas_height - 10), Image.Resampling.LANCZOS) # Use LANCZOS for quality, leave padding

        # Convert PIL image to Tkinter PhotoImage
        img_tk = ImageTk.PhotoImage(img_copy)

        # Store reference to prevent garbage collection
        if type_flag == "original":
            self.original_img_tk = img_tk
        else:
            self.processed_img_tk = img_tk

        # Update the canvas (Label)
        canvas_widget.config(image=img_tk)
        canvas_widget.image = img_tk # Keep reference


    def update_preview(self, *args):
        """Applies background removal to the preview image and updates display."""
        if self.original_img_pil is None:
            self.clear_previews(processed_only=True)
            return

        tolerance_val = self.tolerance.get()
        try:
            # Process the original PIL image in memory
            processed_pil = self.remove_background(self.original_img_pil, tolerance_val)

            # Display the processed image
            self.display_image(processed_pil, self.processed_canvas, "processed")

        except Exception as e:
            print(f"Error updating preview: {e}") # Log error
            self.clear_previews(processed_only=True)


    def remove_background(self, img_pil, tolerance_val):
        """
        Removes background based on tolerance. Takes and returns PIL RGBA Image.
        """
        if img_pil.mode != "RGBA":
             img_pil = img_pil.convert("RGBA") # Ensure RGBA for processing

        datas = img_pil.getdata()
        newData = []
        for item in datas:
            # Check if the pixel is close to white (based on tolerance)
            if item[0] >= tolerance_val and item[1] >= tolerance_val and item[2] >= tolerance_val:
                # If close to white, make it fully transparent (alpha=0)
                newData.append((item[0], item[1], item[2], 0))
            else:
                # Otherwise, keep the original pixel (including original alpha)
                newData.append(item)

        img_pil.putdata(newData)
        return img_pil


    def clear_previews(self, processed_only=False):
        """Clears the image preview canvases."""
        if not processed_only:
            self.original_img_pil = None
            self.original_img_tk = None
            self.original_canvas.config(image='')
            self.original_canvas.image = None
        self.processed_img_tk = None
        self.processed_canvas.config(image='')
        self.processed_canvas.image = None


    def next_image(self):
        """Loads the next image in the list for preview."""
        if not self.image_files: return
        idx = self.current_image_index.get()
        if idx < len(self.image_files) - 1:
            self.current_image_index.set(idx + 1)
            self.load_preview_image()

    def prev_image(self):
        """Loads the previous image in the list for preview."""
        if not self.image_files: return
        idx = self.current_image_index.get()
        if idx > 0:
            self.current_image_index.set(idx - 1)
            self.load_preview_image()

    def start_batch_processing(self):
        """Starts the batch processing in a separate thread."""
        in_folder = self.input_folder.get()
        out_folder = self.output_folder.get()
        tol = self.tolerance.get()

        if not in_folder or not os.path.isdir(in_folder):
            messagebox.showerror("Error", "Invalid input folder selected.")
            return
        if not out_folder:
            messagebox.showerror("Error", "Output folder not selected.")
            return
        if not os.path.exists(out_folder):
            try:
                os.makedirs(out_folder)
                print(f"Created output folder: {out_folder}")
            except Exception as e:
                 messagebox.showerror("Error", f"Could not create output folder:\n{out_folder}\n{e}")
                 return

        # Disable button during processing
        self.process_button.config(state=tk.DISABLED)
        self.status_label.config(text="Status: Processing... Please wait.")
        self.master.update_idletasks() # Update GUI before starting thread

        # Run processing in a thread to avoid freezing the GUI
        processing_thread = threading.Thread(target=self.batch_process_thread, args=(in_folder, out_folder, tol), daemon=True)
        processing_thread.start()


    def batch_process_thread(self, input_folder, output_folder, tolerance_val):
        """The actual batch processing logic (runs in a separate thread)."""
        processed_count = 0
        skipped_count = 0
        error_count = 0

        try:
            all_files = os.listdir(input_folder)
            total_files = len(all_files)
            current_file_num = 0

            for filename in all_files:
                current_file_num += 1
                input_path = os.path.join(input_folder, filename)
                base, ext = os.path.splitext(filename)
                output_filename = base + ".png" # Always save as PNG for transparency
                output_path = os.path.join(output_folder, output_filename)

                # Update status periodically
                if current_file_num % 5 == 0 or current_file_num == total_files: # Update every 5 files or on the last file
                     self.master.after(0, self.update_status, f"Status: Processing {current_file_num}/{total_files} - {filename}")

                if os.path.isfile(input_path) and filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
                    try:
                        img = Image.open(input_path)
                        img = img.convert("RGBA") # Ensure RGBA before processing

                        processed_img = self.remove_background(img, tolerance_val)

                        processed_img.save(output_path, "PNG")
                        processed_count += 1

                    except Exception as e:
                        print(f"Error processing {filename}: {e}") # Log error to console
                        error_count += 1
                else:
                    if os.path.isfile(input_path):
                        skipped_count += 1 # Count skipped non-image files

            # --- Processing Finished ---
            final_status = f"Status: Complete! Processed: {processed_count}, Skipped: {skipped_count}, Errors: {error_count}"
            self.master.after(0, self.update_status, final_status) # Update status from main thread
            self.master.after(0, lambda: messagebox.showinfo("Processing Complete", f"Finished processing images.\n\nProcessed: {processed_count}\nSkipped: {skipped_count}\nErrors: {error_count}"))

        except Exception as e:
             # Handle errors during the overall process (e.g., reading directory)
             error_msg = f"An error occurred during batch processing:\n{e}"
             self.master.after(0, self.update_status, f"Status: Error occurred.")
             self.master.after(0, lambda: messagebox.showerror("Batch Processing Error", error_msg))

        finally:
            # Re-enable the button in the main thread
            self.master.after(0, self.process_button.config, {"state": tk.NORMAL})

    def update_status(self, message):
        """ Safely updates the status label from any thread. """
        self.status_label.config(text=message)


# --- Run the application ---
if __name__ == "__main__":
    root = tk.Tk()
    app = BackgroundRemoverApp(root)
    root.mainloop()
