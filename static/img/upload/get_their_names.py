import os

def list_recipe_images():
    # Get the folder path where this script is located
    base_path = os.path.dirname(os.path.abspath(__file__))
    
    # Supported image extensions
    extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp'}

    # Filter files that start with 'recipe' and have a valid extension
    image_files = [
        f for f in os.listdir(base_path)
        if os.path.isfile(os.path.join(base_path, f)) and
           f.lower().startswith('recipe') and
           os.path.splitext(f)[1].lower() in extensions
    ]

    return image_files

def write_image_list_to_file(images):
    # Define the output file path
    output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'recipe_images_list.txt')

    # Open the file for writing
    with open(output_file, 'w') as f:
        for img in images:
            # Prepend 'img/upload/' to each image filename and write it to the file
            f.write(f"img/upload/{img}\n")

if __name__ == "__main__":
    images = list_recipe_images()
    print("recipe image files:")
    for img in images:
        print(img)
    
    # Write the list to a file
    write_image_list_to_file(images)
    print("Image list saved to 'recipe_images_list.txt'.")
