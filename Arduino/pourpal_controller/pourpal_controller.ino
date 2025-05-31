#include <Arduino.h>
#include <ArduinoJson.h>

// PourPal Controller
// Controls 8 DC pumps through relays based on ingredient measurements
// Uses Hardware Serial1 for communication with Python

// Pin definitions for relays
const int NUM_RELAYS = 8;  // Total number of pumps/relays in the system
const int RELAY_PINS[NUM_RELAYS] = {2, 3, 4, 5, 6, 7, 8, 9}; // Arduino pins connected to relay control

// Structure to hold pump data
struct PumpData {
  int pipeNumber;    // Pump number (1-8)
  int duration;      // How long the pump should run (in milliseconds)
  bool isActive;     // Whether the pump is currently running
};

// Array to store pump data for all 8 pumps
PumpData pumps[NUM_RELAYS];

// Variables to store cocktail data received from Python
int productId = 0;           // Unique identifier for the cocktail
String productNid = "";      // Product name/identifier
String drinkType = "";       // Type of drink (e.g., "strong", "weak")
bool isAlcoholic = false;    // Whether the drink contains alcohol

// Timing variables for pump control
unsigned long startTime = 0; // When the pouring process started
bool isPouring = false;      // Whether pumps are currently active

/**
 * Setup function - runs once when Arduino starts
 * Initializes Serial1 communication and relay pins
 */
void setup() {
  // Initialize Serial for debugging
  Serial.begin(9600);
  Serial.println("PourPal Controller Starting...");
  
  // Initialize Serial1 
  Serial1.begin(9600);
  Serial.println("Serial1 initialized for Python communication");
  
  // Initialize relay pins
  for (int i = 0; i < NUM_RELAYS; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], HIGH);  // Ensure pumps are off initially
    Serial.print("Initialized relay pin: ");
    Serial.println(RELAY_PINS[i]);
  }
  
  // Initialize pump data
  for (int i = 0; i < NUM_RELAYS; i++) {
    pumps[i].pipeNumber = i + 1;
    pumps[i].duration = 0;
    pumps[i].isActive = false;
  }
  Serial.println("All pumps initialized");
}

/**
 * Main loop - runs continuously
 * Checks for incoming Serial1 commands and manages pump states
 */
void loop() {
  if (Serial1.available() > 0) {
    String input = Serial1.readStringUntil('\n');
    Serial.print("Received command: ");
    Serial.println(input);
    processCommand(input);
  }
  
  // Handle pouring process
  if (isPouring) {
    updatePumps();
  }
}

/**
 * Process incoming commands from Python
 * Handles different command types:
 * - ID: Product ID
 * - NID: Product name
 * - TYPE: Drink type
 * - ALCOHOL: Alcoholic status
 * - PIPE: Pump configuration with ingredient details
 * - END: Start pouring process
 * - CANCEL: Cancel the pouring process
 * 
 * @param command The command string received from Python
 */
void processCommand(String command) {
  Serial.println("Processing command...");
  
  // Handle CANCEL command
  if (command == "CANCEL") {
    Serial.println("Cancelling pour process...");
    // Stop all pumps
    for (int i = 0; i < NUM_RELAYS; i++) {
      digitalWrite(RELAY_PINS[i], HIGH);
      pumps[i].isActive = false;
      pumps[i].duration = 0;
    }
    isPouring = false;
    Serial1.println("COMPLETED");
    return;
  }

  // Parse the JSON data
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, command);

  if (error) {
    Serial.print("JSON parsing failed: ");
    Serial.println(error.c_str());
    Serial1.println("ERROR");
    return;
  }

  // Extract basic cocktail info
  productId = doc["productId"] | 0;
  productNid = doc["productNid"].as<String>();
  drinkType = doc["drinkType"].as<String>();
  isAlcoholic = doc["isAlcoholic"] | false;

  Serial.print("Product ID: ");
  Serial.println(productId);
  Serial.print("Product Name: ");
  Serial.println(productNid);
  Serial.print("Drink Type: ");
  Serial.println(drinkType);
  Serial.print("Is Alcoholic: ");
  Serial.println(isAlcoholic ? "Yes" : "No");

  // Process each ingredient
  JsonArray ingredients = doc["ingredients"];
  Serial.print("Number of ingredients: ");
  Serial.println(ingredients.size());
  
  for (JsonObject ingredient : ingredients) {
    // Convert string values to integers
    int pipeNumber = ingredient["pipe"].as<String>().toInt();
    int ml = ingredient["ingMl"].as<String>().toInt();
    
    Serial.print("Setting pump ");
    Serial.print(pipeNumber);
    Serial.print(" to pour ");
    Serial.print(ml);
    Serial.println("ml");
    
    if (pipeNumber > 0 && pipeNumber <= NUM_RELAYS) {
      int pipeIndex = pipeNumber - 1;
      pumps[pipeIndex].duration = ml * 100;  // Convert ml to milliseconds
      pumps[pipeIndex].isActive = true;
    }
  }

  // Start pouring immediately after processing all ingredients
  startPouring();
  Serial1.println("OK");
}

/**
 * Start the pouring process
 * Activates all pumps that have a duration set
 * Records the start time for timing calculations
 */
void startPouring() {
  Serial.println("Starting pour process...");
  startTime = millis();
  isPouring = true;
  
  // Activate all pumps that have a duration
  for (int i = 0; i < NUM_RELAYS; i++) {
    if (pumps[i].duration > 0) {
      Serial.print("Activating pump ");
      Serial.print(i + 1);
      Serial.print(" for ");
      Serial.print(pumps[i].duration);
      Serial.println("ms");
      digitalWrite(RELAY_PINS[i], LOW);
    }
  }
}

/**
 * Update pump states during pouring
 * Checks if each pump's duration has elapsed
 * Deactivates pumps when their time is up
 * Sends "COMPLETED" when all pumps have finished
 */
void updatePumps() {
  unsigned long currentTime = millis();
  bool allPumpsStopped = true;
  
  for (int i = 0; i < NUM_RELAYS; i++) {
    if (pumps[i].isActive) {
      if (currentTime - startTime >= pumps[i].duration) {
        Serial.print("Stopping pump ");
        Serial.println(i + 1);
        digitalWrite(RELAY_PINS[i], HIGH);
        pumps[i].isActive = false;
        pumps[i].duration = 0;
      } else {
        allPumpsStopped = false;
      }
    }
  }
  
  // If all pumps have stopped, reset the pouring state
  if (allPumpsStopped) {
    Serial.println("All pumps completed");
    isPouring = false;
    Serial1.println("COMPLETED");
  }
}

/**
 * Manual pump control function
 * Can be called from Serial1 Monitor to test pumps
 * Format: numPour(pipe1, ml1, pipe2, ml2, ..., 0)
 * Example: numPour(1, 30, 2, 45, 0) - Pump 1: 30ml, Pump 2: 45ml
 * 
 * @param pipe First pump number (1-8)
 * @param ml First pump measurement in ml
 * @param ... Additional pipe/ml pairs, end with 0
 */
void numPour(int pipe, int ml, ...) {
  va_list args;
  va_start(args, ml);
  
  // Reset all pumps
  for (int i = 0; i < NUM_RELAYS; i++) {
    pumps[i].duration = 0;
    pumps[i].isActive = false;
    digitalWrite(RELAY_PINS[i], HIGH);
  }
  
  // Set first pump
  if (pipe > 0 && pipe <= NUM_RELAYS) {
    pumps[pipe-1].duration = ml * 100;  // Convert ml to milliseconds
    pumps[pipe-1].isActive = true;
  }
  
  // Process additional pump arguments
  while (true) {
    pipe = va_arg(args, int);
    if (pipe == 0) break;  // End of arguments
    
    ml = va_arg(args, int);
    if (pipe > 0 && pipe <= NUM_RELAYS) {
      pumps[pipe-1].duration = ml * 100;
      pumps[pipe-1].isActive = true;
    }
  }
  
  va_end(args);
  
  // Start pouring
  startPouring();
} 