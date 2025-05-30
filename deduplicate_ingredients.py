import json
from fuzzywuzzy import fuzz
from fuzzywuzzy import process
import re
from collections import defaultdict

def normalize_ingredient_name(name):
    """Normalize ingredient names for better matching."""
    # Convert to lowercase
    name = name.lower()
    # Remove special characters and extra spaces
    name = re.sub(r'[^\w\s]', '', name)
    # Remove extra spaces
    name = ' '.join(name.split())
    return name

def find_similar_ingredients(ingredients, threshold=85):
    """Find similar ingredients using fuzzy matching."""
    normalized_ingredients = {normalize_ingredient_name(ing): ing for ing in ingredients}
    similar_groups = defaultdict(list)
    processed = set()

    for norm_name, original_name in normalized_ingredients.items():
        if original_name in processed:
            continue

        # Find similar ingredients
        matches = process.extractBests(
            norm_name,
            [n for n in normalized_ingredients.keys() if n not in processed],
            score_cutoff=threshold
        )

        if matches:
            group = [original_name]
            for match_name, score in matches:
                group.append(normalized_ingredients[match_name])
                processed.add(normalized_ingredients[match_name])
            
            # Use the shortest name as the canonical name
            canonical_name = min(group, key=len)
            similar_groups[canonical_name] = group

    return similar_groups

def update_products_json():
    """Update products.json with deduplicated ingredients."""
    # Read the products.json file
    with open('static/products.json', 'r', encoding='utf-8') as f:
        products = json.load(f)

    # Collect all unique ingredient names
    all_ingredients = set()
    for product in products:
        for ingredient in product['PIng']:
            all_ingredients.add(ingredient['ING_Name'])

    # Find similar ingredients
    similar_groups = find_similar_ingredients(all_ingredients)

    # Create a mapping of old names to canonical names
    name_mapping = {}
    for canonical, group in similar_groups.items():
        for old_name in group:
            if old_name != canonical:
                name_mapping[old_name] = canonical

    # Update products with canonical names
    for product in products:
        for ingredient in product['PIng']:
            if ingredient['ING_Name'] in name_mapping:
                ingredient['ING_Name'] = name_mapping[ingredient['ING_Name']]

    # Write back to products.json
    with open('static/products.json', 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=4)

    # Print summary of changes
    print("\nDeduplication Summary:")
    print("=====================")
    for canonical, group in similar_groups.items():
        if len(group) > 1:
            print(f"\nCanonical name: {canonical}")
            print("Similar names:")
            for name in group:
                if name != canonical:
                    print(f"  - {name}")

if __name__ == "__main__":
    update_products_json() 