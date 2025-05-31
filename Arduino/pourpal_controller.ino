#include <Arduino.h>
#include <ArduinoJson.h>

// PourPal Controller
// Controls 8 DC pumps through relays based on ingredient measurements
// Uses Hardware Serial for communication with Python

// Pin definitions for relays
const int NUM_RELAYS = 8;  // Total number of pumps/relays in the system
const int RELAY_PINS[NUM_RELAYS] = {22, 24, 26, 28, 30, 32, 34, 36}; // Arduino pins connected to relay control

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
 * Initializes serial communication and relay pins
 */
void setup() {
  // Initialize Serial communication
  Serial.begin(9600);
  
  // Initialize relay pins
  for (int i = 0; i < NUM_RELAYS; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], LOW);  // Ensure pumps are off initially
  }
  
  // Initialize pump data
  for (int i = 0; i < NUM_RELAYS; i++) {
    pumps[i].pipeNumber = i + 1;
    pumps[i].duration = 0;
    pumps[i].isActive = false;
  }
}

/**
 * Main loop - runs continuously
 * Checks for incoming serial commands and manages pump states
 */
void loop() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
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
  // Parse the JSON data
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, command);

  if (error) {
    Serial.println("ERROR");
    return;
  }

  // Extract basic cocktail info
  productId = doc["productId"] | 0;
  productNid = doc["productNid"].as<String>();
  drinkType = doc["drinkType"].as<String>();
  isAlcoholic = doc["isAlcoholic"] | false;

  // Process each ingredient
  JsonArray ingredients = doc["ingredients"];
  for (JsonObject ingredient : ingredients) {
    int pipeNumber = ingredient["pipe"] | 0;
    int ml = ingredient["ingMl"] | 0;  // Get the measurement in ml
    
    if (pipeNumber > 0 && pipeNumber <= NUM_RELAYS) {
      int pipeIndex = pipeNumber - 1;
      pumps[pipeIndex].duration = ml * 100;  // Convert ml to milliseconds
      pumps[pipeIndex].isActive = true;
    }
  }

  // Start pouring immediately after processing all ingredients
  startPouring();
  Serial.println("OK");
}

/**
 * Start the pouring process
 * Activates all pumps that have a duration set
 * Records the start time for timing calculations
 */
void startPouring() {
  startTime = millis();
  isPouring = true;
  
  // Activate all pumps that have a duration
  for (int i = 0; i < NUM_RELAYS; i++) {
    if (pumps[i].duration > 0) {
      digitalWrite(RELAY_PINS[i], HIGH);
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
        digitalWrite(RELAY_PINS[i], LOW);
        pumps[i].isActive = false;
        pumps[i].duration = 0;
      } else {
        allPumpsStopped = false;
      }
    }
  }
  
  // If all pumps have stopped, reset the pouring state
  if (allPumpsStopped) {
    isPouring = false;
    Serial.println("COMPLETED");
  }
}

/**
 * Manual pump control function
 * Can be called from Serial Monitor to test pumps
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
    digitalWrite(RELAY_PINS[i], LOW);
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