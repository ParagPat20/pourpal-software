import tkinter as tk
from tkinter import ttk, messagebox
import json
import re
from extract_ingredient_ml import normalize_ingredient_name, extract_measurements_from_recipes
from PIL import Image, ImageTk
import os

class CocktailMLEditor:
    def __init__(self, root):
        self.root = root
        self.root.title("Cocktail ML Editor")
        self.root.geometry("1200x800")
        
        # Load data
        self.load_data()
        
        # Create main frame
        self.main_frame = ttk.Frame(root, padding="10")
        self.main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Create left panel for cocktail list
        self.create_cocktail_list()
        
        # Create right panel for details
        self.create_details_panel()
        
        # Bind cocktail selection
        self.cocktail_listbox.bind('<<ListboxSelect>>', self.on_cocktail_select)
        
        # Load first cocktail
        if self.cocktails:
            self.cocktail_listbox.selection_set(0)
            self.on_cocktail_select(None)

    def load_data(self):
        try:
            with open('static/products.json', 'r', encoding='utf-8') as f:
                self.cocktails = json.load(f)
            with open('static/db.json', 'r', encoding='utf-8') as f:
                self.ingredients_db = json.load(f)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load data: {str(e)}")
            self.cocktails = []
            self.ingredients_db = []

    def create_cocktail_list(self):
        # Left panel frame
        left_frame = ttk.LabelFrame(self.main_frame, text="Cocktails", padding="5")
        left_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=5)
        
        # Search box
        self.search_var = tk.StringVar()
        self.search_var.trace('w', self.filter_cocktails)
        search_entry = ttk.Entry(left_frame, textvariable=self.search_var)
        search_entry.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=5)
        
        # Cocktail listbox
        self.cocktail_listbox = tk.Listbox(left_frame, width=30, height=30)
        self.cocktail_listbox.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Scrollbar for listbox
        scrollbar = ttk.Scrollbar(left_frame, orient=tk.VERTICAL, command=self.cocktail_listbox.yview)
        scrollbar.grid(row=1, column=1, sticky=(tk.N, tk.S))
        self.cocktail_listbox['yscrollcommand'] = scrollbar.set
        
        # Populate listbox
        self.update_cocktail_list()

    def create_details_panel(self):
        # Right panel frame
        right_frame = ttk.LabelFrame(self.main_frame, text="Cocktail Details", padding="5")
        right_frame.grid(row=0, column=1, sticky=(tk.W, tk.E, tk.N, tk.S), padx=5)
        
        # Top frame for image and basic info
        top_frame = ttk.Frame(right_frame)
        top_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=5)
        
        # Image frame
        image_frame = ttk.LabelFrame(top_frame, text="Image", padding="5")
        image_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=5)
        
        self.image_label = ttk.Label(image_frame)
        self.image_label.grid(row=0, column=0, padx=5, pady=5)
        
        # Info frame
        info_frame = ttk.Frame(top_frame)
        info_frame.grid(row=0, column=1, sticky=(tk.W, tk.E, tk.N, tk.S), padx=5)
        
        ttk.Label(info_frame, text="Name:").grid(row=0, column=0, sticky=tk.W)
        self.name_label = ttk.Label(info_frame, text="")
        self.name_label.grid(row=0, column=1, sticky=tk.W)
        
        ttk.Label(info_frame, text="Category:").grid(row=1, column=0, sticky=tk.W)
        self.category_label = ttk.Label(info_frame, text="")
        self.category_label.grid(row=1, column=1, sticky=tk.W)
        
        # Description frame
        desc_frame = ttk.LabelFrame(right_frame, text="Description", padding="5")
        desc_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=5)
        
        self.desc_text = tk.Text(desc_frame, height=3, wrap=tk.WORD)
        self.desc_text.grid(row=0, column=0, sticky=(tk.W, tk.E))
        desc_scrollbar = ttk.Scrollbar(desc_frame, orient=tk.VERTICAL, command=self.desc_text.yview)
        desc_scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        self.desc_text['yscrollcommand'] = desc_scrollbar.set
        
        # How to Make frame
        htm_frame = ttk.LabelFrame(right_frame, text="How to Make", padding="5")
        htm_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=5)
        
        self.htm_text = tk.Text(htm_frame, height=5, wrap=tk.WORD)
        self.htm_text.grid(row=0, column=0, sticky=(tk.W, tk.E))
        htm_scrollbar = ttk.Scrollbar(htm_frame, orient=tk.VERTICAL, command=self.htm_text.yview)
        htm_scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        self.htm_text['yscrollcommand'] = htm_scrollbar.set
        
        # Ingredients frame
        ingredients_frame = ttk.LabelFrame(right_frame, text="Ingredients", padding="5")
        ingredients_frame.grid(row=3, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        
        # Create treeview for ingredients
        columns = ('name', 'id', 'ml')
        self.ingredients_tree = ttk.Treeview(ingredients_frame, columns=columns, show='headings')
        self.ingredients_tree.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure columns
        self.ingredients_tree.heading('name', text='Name')
        self.ingredients_tree.heading('id', text='ID')
        self.ingredients_tree.heading('ml', text='Measurement')
        
        self.ingredients_tree.column('name', width=200)
        self.ingredients_tree.column('id', width=50)
        self.ingredients_tree.column('ml', width=100)
        
        # Scrollbar for treeview
        tree_scrollbar = ttk.Scrollbar(ingredients_frame, orient=tk.VERTICAL, command=self.ingredients_tree.yview)
        tree_scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        self.ingredients_tree['yscrollcommand'] = tree_scrollbar.set
        
        # Ingredients buttons frame
        ingredients_buttons_frame = ttk.Frame(ingredients_frame)
        ingredients_buttons_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=5)
        
        ttk.Button(ingredients_buttons_frame, text="Add Ingredient", command=self.show_add_ingredient_dialog).grid(row=0, column=0, padx=5)
        ttk.Button(ingredients_buttons_frame, text="Remove Selected", command=self.remove_selected_ingredient).grid(row=0, column=1, padx=5)
        
        # Buttons frame
        buttons_frame = ttk.Frame(right_frame)
        buttons_frame.grid(row=4, column=0, sticky=(tk.W, tk.E), pady=5)
        
        ttk.Button(buttons_frame, text="Auto Update Measurements", command=self.auto_update_measurements).grid(row=0, column=0, padx=5)
        ttk.Button(buttons_frame, text="Save Changes", command=self.save_changes).grid(row=0, column=1, padx=5)
        
        # Bind double-click event for editing measurement
        self.ingredients_tree.bind('<Double-1>', self.on_ingredient_double_click)
        
        # Configure grid weights for proper resizing
        right_frame.columnconfigure(0, weight=1)
        right_frame.rowconfigure(3, weight=1)  # Ingredients frame should expand
        ingredients_frame.columnconfigure(0, weight=1)
        ingredients_frame.rowconfigure(0, weight=1)
        top_frame.columnconfigure(1, weight=1)  # Info frame should expand

    def load_image(self, image_path):
        try:
            # Check if image exists
            if not os.path.exists(image_path):
                return None
                
            # Open and resize image
            image = Image.open(image_path)
            # Calculate new size maintaining aspect ratio
            max_size = (200, 200)
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convert to PhotoImage
            photo = ImageTk.PhotoImage(image)
            return photo
        except Exception as e:
            print(f"Error loading image: {str(e)}")
            return None

    def show_add_ingredient_dialog(self):
        if not self.current_cocktail:
            return
            
        dialog = tk.Toplevel(self.root)
        dialog.title("Add Ingredient")
        dialog.geometry("400x500")
        
        # Search frame
        search_frame = ttk.Frame(dialog, padding="5")
        search_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(search_frame, text="Search:").pack(side=tk.LEFT)
        search_var = tk.StringVar()
        search_var.trace('w', lambda *args: self.filter_ingredients_list(ingredients_listbox, search_var.get()))
        search_entry = ttk.Entry(search_frame, textvariable=search_var)
        search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        
        # Ingredients listbox
        list_frame = ttk.Frame(dialog)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        ingredients_listbox = tk.Listbox(list_frame)
        ingredients_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=ingredients_listbox.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        ingredients_listbox['yscrollcommand'] = scrollbar.set
        
        # Populate ingredients listbox
        for ingredient in self.ingredients_db:
            ingredients_listbox.insert(tk.END, f"{ingredient['ING_Name']} (ID: {ingredient['ING_ID']})")
        
        # Buttons frame
        buttons_frame = ttk.Frame(dialog)
        buttons_frame.pack(fill=tk.X, padx=5, pady=5)
        
        def add_selected_ingredient():
            selection = ingredients_listbox.curselection()
            if not selection:
                messagebox.showwarning("Warning", "Please select an ingredient")
                return
                
            ingredient_text = ingredients_listbox.get(selection[0])
            ingredient_name = ingredient_text.split(" (ID: ")[0]
            ingredient_id = ingredient_text.split("(ID: ")[1].rstrip(")")
            
            # Check if ingredient already exists
            for item in self.ingredients_tree.get_children():
                if self.ingredients_tree.item(item)['values'][1] == ingredient_id:
                    messagebox.showwarning("Warning", "This ingredient is already added")
                    return
            
            # Add to treeview
            self.ingredients_tree.insert('', tk.END, values=(ingredient_name, ingredient_id, ''))
            dialog.destroy()
        
        ttk.Button(buttons_frame, text="Add Selected", command=add_selected_ingredient).pack(side=tk.LEFT, padx=5)
        ttk.Button(buttons_frame, text="Cancel", command=dialog.destroy).pack(side=tk.RIGHT, padx=5)

    def filter_ingredients_list(self, listbox, search_text):
        listbox.delete(0, tk.END)
        search_text = search_text.lower()
        for ingredient in self.ingredients_db:
            if search_text in ingredient['ING_Name'].lower():
                listbox.insert(tk.END, f"{ingredient['ING_Name']} (ID: {ingredient['ING_ID']})")

    def remove_selected_ingredient(self):
        selection = self.ingredients_tree.selection()
        if not selection:
            messagebox.showwarning("Warning", "Please select an ingredient to remove")
            return
            
        if messagebox.askyesno("Confirm", "Are you sure you want to remove the selected ingredient?"):
            self.ingredients_tree.delete(selection[0])

    def update_cocktail_list(self):
        self.cocktail_listbox.delete(0, tk.END)
        search_text = self.search_var.get().lower()
        for cocktail in self.cocktails:
            if search_text in cocktail['PName'].lower():
                self.cocktail_listbox.insert(tk.END, cocktail['PName'])

    def filter_cocktails(self, *args):
        self.update_cocktail_list()

    def on_cocktail_select(self, event):
        selection = self.cocktail_listbox.curselection()
        if not selection:
            return
        
        index = selection[0]
        cocktail_name = self.cocktail_listbox.get(index)
        
        # Find the cocktail in our data
        self.current_cocktail = next((c for c in self.cocktails if c['PName'] == cocktail_name), None)
        if not self.current_cocktail:
            return
        
        # Update labels
        self.name_label.config(text=self.current_cocktail['PName'])
        self.category_label.config(text=self.current_cocktail['PCat'])
        
        # Update image
        image_path = os.path.join('static', self.current_cocktail.get('PImage', ''))
        photo = self.load_image(image_path)
        if photo:
            self.image_label.configure(image=photo)
            self.image_label.image = photo  # Keep a reference
        else:
            self.image_label.configure(image='')
            self.image_label.image = None
        
        # Update description
        self.desc_text.delete('1.0', tk.END)
        self.desc_text.insert('1.0', self.current_cocktail.get('PDesc', ''))
        
        # Update how to make
        self.htm_text.delete('1.0', tk.END)
        self.htm_text.insert('1.0', self.current_cocktail.get('PHtm', ''))
        
        # Update ingredients tree
        self.ingredients_tree.delete(*self.ingredients_tree.get_children())
        for ingredient in self.current_cocktail['PIng']:
            self.ingredients_tree.insert('', tk.END, values=(
                ingredient['ING_Name'],
                ingredient['ING_ID'],
                ingredient.get('ING_ML', '')
            ))

    def on_ingredient_double_click(self, event):
        item = self.ingredients_tree.selection()[0]
        column = self.ingredients_tree.identify_column(event.x)
        
        if column == '#3':  # Measurement column
            current_value = self.ingredients_tree.item(item)['values'][2]
            
            # Create edit dialog
            dialog = tk.Toplevel(self.root)
            dialog.title("Edit Measurement")
            dialog.geometry("300x150")
            
            ttk.Label(dialog, text="Enter measurement (e.g., 50ml, 1half, 2teaspoon):").pack(pady=5)
            entry = ttk.Entry(dialog)
            entry.insert(0, current_value if current_value else '')
            entry.pack(pady=5)
            
            def save_measurement():
                new_value = entry.get()
                self.ingredients_tree.item(item, values=(
                    self.ingredients_tree.item(item)['values'][0],
                    self.ingredients_tree.item(item)['values'][1],
                    new_value
                ))
                dialog.destroy()
            
            ttk.Button(dialog, text="Save", command=save_measurement).pack(pady=5)

    def auto_update_measurements(self):
        if not self.current_cocktail:
            return
        
        # Extract measurements from recipes.txt
        measurements = extract_measurements_from_recipes(self.current_cocktail['PName'])
        
        # Update ingredients tree
        for item in self.ingredients_tree.get_children():
            ingredient_name = self.ingredients_tree.item(item)['values'][0]
            normalized_name = normalize_ingredient_name(ingredient_name)
            
            # Try to find a match
            measurement = None
            for key in measurements:
                if key in normalized_name or normalized_name in key:
                    measurement = measurements[key]
                    break
            
            self.ingredients_tree.item(item, values=(
                ingredient_name,
                self.ingredients_tree.item(item)['values'][1],
                measurement if measurement else ''
            ))

    def save_changes(self):
        if not self.current_cocktail:
            return
        
        # Update the current cocktail's ingredients with new measurements
        self.current_cocktail['PIng'] = []
        for item in self.ingredients_tree.get_children():
            values = self.ingredients_tree.item(item)['values']
            self.current_cocktail['PIng'].append({
                'ING_Name': values[0],
                'ING_ID': values[1],
                'ING_ML': values[2] if values[2] else None
            })
        
        # Save to file
        try:
            with open('static/products.json', 'w', encoding='utf-8') as f:
                json.dump(self.cocktails, f, indent=4, ensure_ascii=False)
            messagebox.showinfo("Success", "Changes saved successfully!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save changes: {str(e)}")

if __name__ == "__main__":
    root = tk.Tk()
    app = CocktailMLEditor(root)
    root.mainloop() 