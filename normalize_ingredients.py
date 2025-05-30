import json
import re
from difflib import SequenceMatcher
from collections import defaultdict

def normalize_word(word):
    """Normalize a single word by removing common variations."""
    word = word.lower()
    word = word.replace('liqueur', '').replace('liquor', '')
    word = word.replace('white', '').replace('brown', '')
    word = word.replace('dry', '').replace('sweet', '')
    word = word.replace('red', '').replace('green', '')
    word = word.replace('gold', '').replace('light', '').replace('dark', '')
    return word.strip()

def get_word_similarity(word1, word2):
    """Calculate similarity between two words."""
    return SequenceMatcher(None, word1, word2).ratio()

def normalize_ingredient_name(name):
    """Normalize ingredient name by splitting into words and sorting."""
    # Split into words and normalize each word
    words = [normalize_word(w) for w in name.split()]
    # Remove empty words
    words = [w for w in words if w]
    # Sort words to handle different word orders
    words.sort()
    return '_'.join(words)

def find_best_match(ingredient_name, normalized_ingredients):
    """Find the best matching normalized ingredient name."""
    normalized_name = normalize_ingredient_name(ingredient_name)
    
    # Try exact match first
    if normalized_name in normalized_ingredients:
        return normalized_name
    
    # Try word-by-word matching
    words = set(normalized_name.split('_'))
    best_match = None
    best_score = 0
    
    for norm_name in normalized_ingredients:
        norm_words = set(norm_name.split('_'))
        
        # Calculate word overlap
        common_words = words.intersection(norm_words)
        if common_words:
            score = len(common_words) / max(len(words), len(norm_words))
            if score > best_score:
                best_score = score
                best_match = norm_name
    
    # If we found a good match, return it
    if best_score > 0.5:  # Threshold for word matching
        return best_match
    
    # Try character-by-character matching
    best_score = 0
    for norm_name in normalized_ingredients:
        score = get_word_similarity(normalized_name, norm_name)
        if score > best_score:
            best_score = score
            best_match = norm_name
    
    # Return best match if similarity is high enough
    return best_match if best_score > 0.8 else None

def process_ingredients():
    # Read ingredients from ing.txt
    normalized_ingredients = set()
    with open('static/ing.txt', 'r', encoding='utf-8') as f:
        for line in f:
            if '(' in line:  # Skip header line
                ingredient = line.split('(')[0].strip()
                normalized_ingredients.add(ingredient)
    
    # Read current db.json
    with open('static/db.json', 'r', encoding='utf-8') as f:
        ingredients_db = json.load(f)
    
    # Process each ingredient
    for ingredient in ingredients_db:
        original_name = ingredient['ING_Name']
        best_match = find_best_match(original_name, normalized_ingredients)
        
        if best_match:
            ingredient['ING_NID'] = best_match
        else:
            # If no match found, create a normalized ID
            ingredient['ING_NID'] = normalize_ingredient_name(original_name)
    
    # Save updated db.json
    with open('static/db.json', 'w', encoding='utf-8') as f:
        json.dump(ingredients_db, f, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    process_ingredients() 