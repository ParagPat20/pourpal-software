import json
from fuzzywuzzy import process
from pathlib import Path

def normalize_name(name):
    """Normalize names for better matching."""
    name = name.lower().replace('_', ' ')
    name = ' '.join(name.split())
    return name

def get_product_identifier(product):
    if 'PNID' in product and product['PNID']:
        return product['PNID']
    return product['PName'].lower().replace(' ', '_')

def format_image_name(name):
    """Format image name with underscores."""
    # Remove any existing underscores and spaces
    name = name.replace('_', ' ').strip()
    # Replace spaces with underscores
    name = name.replace(' ', '_')
    # Ensure it starts with 'recipe_'
    if not name.startswith('recipe_'):
        name = f"recipe_{name}"
    return name

def find_best_image(product_id, image_files, threshold=70):
    normalized_id = normalize_name(product_id)
    # Map normalized image names to actual Path objects
    normalized_to_file = {}
    for img in image_files:
        norm = normalize_name(img.name.replace('recipe_', '').replace('.png', ''))
        normalized_to_file[norm] = img
    matches = process.extractBests(
        normalized_id,
        list(normalized_to_file.keys()),
        score_cutoff=threshold
    )
    if matches:
        best_norm = matches[0][0]
        return normalized_to_file[best_norm]
    return None

def update_product_images():
    with open('static/products.json', 'r', encoding='utf-8') as f:
        products = json.load(f)

    upload_dir = Path('static/img/upload')
    image_files = list(upload_dir.glob('recipe_*.png'))

    changes = []
    not_found = []

    for product in products:
        identifier = get_product_identifier(product)
        best_img = find_best_image(identifier, image_files)
        if best_img:
            # Format the image name with underscores
            formatted_name = format_image_name(best_img.stem)
            new_path = f"img/upload/{formatted_name}.png"
            if product.get('PImage') != new_path:
                changes.append((product.get('PImage'), new_path, identifier))
                product['PImage'] = new_path
        else:
            not_found.append(identifier)

    with open('static/products.json', 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=4)

    print("\nProduct Image Update Summary:")
    print("============================")
    if changes:
        print("\nUpdated Images:")
        for old, new, ident in changes:
            print(f"  {ident}: {old} → {new}")
    else:
        print("\nNo images were updated.")
    if not_found:
        print("\nProducts without image matches:")
        for ident in not_found:
            print(f"  {ident}")

if __name__ == "__main__":
    update_product_images() 