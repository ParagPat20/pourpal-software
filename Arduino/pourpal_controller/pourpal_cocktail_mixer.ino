// PourPal Cocktail Mixing System - Arduino Controller
// Updated to handle new drink type values and removed alcoholic/non-alcoholic logic

#include <ArduinoJson.h>

// Pin definitions for pumps/motors (adjust based on your hardware)
const int PUMP_PINS[] = {2, 3, 4, 5, 6, 7, 8, 9}; // 8 pumps
const int NUM_PUMPS = 8;

// Drink type multipliers (adjust based on your preference)
const float LESS_LIQUOR_MULTIPLIER = 0.7;    // 70% of regular amount
const float REGULAR_MULTIPLIER = 1.0;        // 100% of regular amount  
const float MORE_LIQUOR_MULTIPLIER = 1.3;    // 130% of regular amount

void setup() {
  Serial.begin(9600);
  
  // Initialize pump pins as outputs
  for (int i = 0; i < NUM_PUMPS; i++) {
    pinMode(PUMP_PINS[i], OUTPUT);
    digitalWrite(PUMP_PINS[i], LOW); // Ensure pumps are off initially
  }
  
  Serial.println("PourPal Cocktail Mixing System Ready");
  Serial.println("Waiting for drink orders...");
}

void loop() {
  if (Serial.available()) {
    String jsonString = Serial.readStringUntil('\n');
    jsonString.trim();
    
    if (jsonString.length() > 0) {
      processDrinkOrder(jsonString);
    }
  }
}

void processDrinkOrder(String jsonString) {
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, jsonString);
  
  if (error) {
    Serial.println("ERROR");
    Serial.println("Invalid JSON received");
    return;
  }
  
  // Extract drink information
  int productId = doc["productId"];
  String drinkType = doc["drinkType"];
  JsonArray ingredients = doc["ingredients"];
  
  Serial.println("OK");
  Serial.println("Processing drink order...");
  Serial.print("Product ID: ");
  Serial.println(productId);
  Serial.print("Drink Type: ");
  Serial.println(drinkType);
  
  // Determine multiplier based on drink type
  float multiplier = getDrinkMultiplier(drinkType);
  Serial.print("Multiplier: ");
  Serial.println(multiplier);
  
  // Process each ingredient
  for (JsonObject ingredient : ingredients) {
    String name = ingredient["name"];
    int pipe = ingredient["pipe"];
    String ingMl = ingredient["ingMl"];
    
    // Convert ml string to float and apply multiplier
    float baseAmount = ingMl.toFloat();
    float adjustedAmount = baseAmount * multiplier;
    
    Serial.print("Pumping ");
    Serial.print(name);
    Serial.print(" from pipe ");
    Serial.print(pipe);
    Serial.print(": ");
    Serial.print(adjustedAmount);
    Serial.println("ml");
    
    // Pump the ingredient (adjust timing based on your pump calibration)
    pumpIngredient(pipe - 1, adjustedAmount); // pipe is 1-indexed, array is 0-indexed
  }
  
  Serial.println("COMPLETED");
  Serial.println("Drink preparation finished");
}

float getDrinkMultiplier(String drinkType) {
  if (drinkType == "less-liquor") {
    return LESS_LIQUOR_MULTIPLIER;
  } else if (drinkType == "regular") {
    return REGULAR_MULTIPLIER;
  } else if (drinkType == "more-liquor") {
    return MORE_LIQUOR_MULTIPLIER;
  } else {
    // Default to regular if unknown type
    Serial.println("Unknown drink type, using regular multiplier");
    return REGULAR_MULTIPLIER;
  }
}

void pumpIngredient(int pumpIndex, float amountMl) {
  if (pumpIndex < 0 || pumpIndex >= NUM_PUMPS) {
    Serial.println("ERROR: Invalid pump index");
    return;
  }
  
  // Convert ml to pump duration (adjust calibration based on your pumps)
  // This is a rough estimate - you'll need to calibrate for your specific pumps
  int pumpDurationMs = (int)(amountMl * 50); // 50ms per ml (adjust as needed)
  
  Serial.print("Activating pump ");
  Serial.print(pumpIndex + 1);
  Serial.print(" for ");
  Serial.print(pumpDurationMs);
  Serial.println("ms");
  
  // Activate pump
  digitalWrite(PUMP_PINS[pumpIndex], HIGH);
  delay(pumpDurationMs);
  digitalWrite(PUMP_PINS[pumpIndex], LOW);
  
  // Small delay between ingredients
  delay(100);
}

// Handle cancel command
void handleCancel() {
  Serial.println("CANCEL");
  // Turn off all pumps immediately
  for (int i = 0; i < NUM_PUMPS; i++) {
    digitalWrite(PUMP_PINS[i], LOW);
  }
  Serial.println("All pumps stopped");
}
