import json
import re

def normalize_ingredient_name(name):
    # Convert to lowercase and remove common variations
    name = name.lower()
    name = name.replace('liqueur', '').replace('liquor', '')
    name = name.replace('white', '').replace('brown', '')
    name = name.replace('dry', '').replace('sweet', '')
    name = name.replace('red', '').replace('green', '')
    return name.strip()

def extract_measurements_from_recipes(cocktail_name):
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
                        measurements[normalize_ingredient_name(ingredient)] = measurement
    
    except Exception as e:
        print(f"Error reading recipes.txt: {str(e)}")
    
    return measurements

def process_cocktails():
    # Read the products.json file
    with open('static/products.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Process each cocktail
    for cocktail in data:
        # Extract measurements from recipes.txt
        measurements = extract_measurements_from_recipes(cocktail['PName'])
        
        # Add measurements to ingredients
        for ingredient in cocktail['PIng']:
            ing_name = normalize_ingredient_name(ingredient['ING_Name'])
            if ing_name in measurements:
                ingredient['ING_ML'] = measurements[ing_name]
            else:
                # Try to find partial matches
                for key in measurements:
                    if key in ing_name or ing_name in key:
                        ingredient['ING_ML'] = measurements[key]
                        break
                else:
                    ingredient['ING_ML'] = None
    
    # Write the updated data back to products.json
    with open('static/products.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    process_cocktails() 