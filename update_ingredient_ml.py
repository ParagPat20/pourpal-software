import json
import re
from collections import defaultdict
from normalize_ingredients import normalize_ingredient_name

def extract_measurements_from_recipes(cocktail_name):
    """Extract measurements from recipes.txt for a specific cocktail."""
    measurements = {}
    current_recipe = None
    in_ingredients = False
    
    try:
        with open('static/recipes.txt', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                
                # Check for recipe start
                if line.startswith('Recipe:'):
                    current_recipe = line.split('(')[0].replace('Recipe:', '').strip()
                    in_ingredients = False
                    continue
                
                # Check for ingredients section
                if line == 'Ingredients:':
                    in_ingredients = True
                    continue
                
                # Skip if not in ingredients section or not the right recipe
                if not in_ingredients or current_recipe != cocktail_name:
                    continue
                
                # Skip empty lines and non-ingredient lines
                if not line or line.startswith('Recipe:') or line.startswith('Glass:') or line.startswith('Tags:'):
                    continue
                
                # Skip garnish and ice
                if '(Garnish)' in line or 'ice' in line.lower():
                    continue
                
                # Extract measurement and ingredient
                if line.startswith('-'):
                    # Remove the dash and split on 'of'
                    parts = line[1:].strip().split(' of ')
                    if len(parts) == 2:
                        measurement = parts[0].strip()
                        ingredient = parts[1].strip()
                        # Remove any substitute information
                        ingredient = ingredient.split('  Substitutes:')[0].strip()
                        # Convert ingredient to lowercase and replace spaces with underscores
                        ingredient = ingredient.lower().replace(' ', '_')
                        measurements[ingredient] = measurement
    
    except Exception as e:
        print(f"Error reading recipes.txt: {str(e)}")
    
    return measurements

def update_ingredient_measurements():
    # Load ingredients database
    with open('static/db.json', 'r', encoding='utf-8') as f:
        ingredients_db = json.load(f)
    
    # Create lookup dictionaries
    ing_id_to_nid = {ing['ING_ID']: ing['ING_NID'] for ing in ingredients_db}
    ing_name_to_nid = {ing['ING_Name'].lower(): ing['ING_NID'] for ing in ingredients_db}
    
    # Load products
    with open('static/products.json', 'r', encoding='utf-8') as f:
        products = json.load(f)
    
    # Process each cocktail
    for cocktail in products:
        # Extract measurements from recipes.txt
        recipe_measurements = extract_measurements_from_recipes(cocktail['PName'])
        
        # Update measurements for each ingredient
        for ingredient in cocktail['PIng']:
            # Add ING_NID if missing
            if 'ING_NID' not in ingredient:
                # Try to get NID from db.json using ING_ID
                if ingredient['ING_ID'] in ing_id_to_nid:
                    ingredient['ING_NID'] = ing_id_to_nid[ingredient['ING_ID']]
                else:
                    # Create normalized ID from name
                    ingredient['ING_NID'] = normalize_ingredient_name(ingredient['ING_Name'])
            
            # Try to find measurement using ING_NID
            if ingredient['ING_NID'] in recipe_measurements:
                ingredient['ING_ML'] = recipe_measurements[ingredient['ING_NID']]
                continue
            
            # Try to find measurement using ING_ID
            ing_nid = ing_id_to_nid.get(ingredient['ING_ID'])
            if ing_nid and ing_nid in recipe_measurements:
                ingredient['ING_ML'] = recipe_measurements[ing_nid]
                continue
            
            # Try to find measurement using ING_Name
            ing_name = ingredient['ING_Name'].lower()
            ing_nid = ing_name_to_nid.get(ing_name)
            if ing_nid and ing_nid in recipe_measurements:
                ingredient['ING_ML'] = recipe_measurements[ing_nid]
                continue
            
            # If no match found, try to find partial matches
            for recipe_ing, measurement in recipe_measurements.items():
                if (recipe_ing in ingredient['ING_NID'] or 
                    ingredient['ING_NID'] in recipe_ing or
                    recipe_ing in ing_name or 
                    ing_name in recipe_ing):
                    ingredient['ING_ML'] = measurement
                    break
            else:
                # If still no match, set to None
                ingredient['ING_ML'] = None
    
    # Save updated products.json
    with open('static/products.json', 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    update_ingredient_measurements() 