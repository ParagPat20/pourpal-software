#include <Adafruit_NeoPixel.h>

#define DATA_PIN 10
#define NUM_RINGS 8
#define LEDS_PER_RING 8
#define NUM_LEDS (NUM_RINGS * LEDS_PER_RING)

Adafruit_NeoPixel strip(NUM_LEDS, DATA_PIN, NEO_GRB + NEO_KHZ800);

const int relayPins[NUM_RINGS] = {9, 8, 7, 6, 5, 4, 3, 2};
bool systemStarted = false;

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  strip.begin();
  strip.setBrightness(76); // ~30% brightness to reduce current draw
  strip.show();

  for (int i = 0; i < NUM_RINGS; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], HIGH); // Relay OFF (active LOW)
  }

  Serial.println("System booting... Type START to skip 10s rainbow loading.");

  unsigned long startTime = millis();
  while (millis() - startTime < 20000 && !systemStarted) {
    rainbowCycle(2);
    checkForStartCommand();
  }

  systemStarted = true;
  strip.clear();
  strip.show();

  Serial.println("\nReady! Send commands like:");
  Serial.println("  1:R:3,2:G:4,5:T:0");
}

// ===== MAIN LOOP =====
void loop() {
  if (!systemStarted) return;

  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() == 0) return;

    parseAndExecuteCommands(input);
  }
}

// ===== PARSE MULTIPLE COMMANDS =====
void parseAndExecuteCommands(String commandLine) {
  struct Task {
    int relayIndex;
    String mode; // "R","G","B","T", etc.
    uint32_t color;
    unsigned long startTime;
    unsigned long endTime;
    float duration;
    bool isTransition;
    bool relayActiveDuring;
  };

  const int MAX_TASKS = NUM_RINGS;
  Task tasks[MAX_TASKS];
  int taskCount = 0;

  unsigned long now = millis();

  int start = 0;
  while (start < commandLine.length()) {
    int commaIndex = commandLine.indexOf(',', start);
    if (commaIndex == -1) commaIndex = commandLine.length();

    String cmd = commandLine.substring(start, commaIndex);
    cmd.trim();

    if (cmd.length() > 0) {
      int firstColon = cmd.indexOf(':');
      int secondColon = cmd.indexOf(':', firstColon + 1);
      if (firstColon != -1 && secondColon != -1) {
        int relayNum = cmd.substring(0, firstColon).toInt();
        String colorCode = cmd.substring(firstColon + 1, secondColon);
        float duration = cmd.substring(secondColon + 1).toFloat();

        if (relayNum >= 1 && relayNum <= NUM_RINGS && taskCount < MAX_TASKS) {
          tasks[taskCount].relayIndex = relayNum - 1;
          tasks[taskCount].mode = colorCode;
          tasks[taskCount].duration = duration;
          tasks[taskCount].color = getColorFromCode(colorCode);
          tasks[taskCount].startTime = now;
          tasks[taskCount].endTime = now + (unsigned long)(duration * 1000);
          tasks[taskCount].isTransition = (colorCode == "T");
          tasks[taskCount].relayActiveDuring = false;

          Serial.print("Relay ");
          Serial.print(relayNum);
          Serial.print(" -> ");
          Serial.print(colorCode);
          Serial.print(" for ");
          Serial.print(duration);
          Serial.println(" seconds.");

          // Prepare tasks for execution
          if (colorCode == "T") {
            // Non-blocking transition; can run concurrently
            if (duration == 0) {
              Serial.println("Transition mode only (no relay).");
              tasks[taskCount].duration = 5; // 5 sec LED-only
              tasks[taskCount].endTime = now + (unsigned long)(tasks[taskCount].duration * 1000);
              tasks[taskCount].relayActiveDuring = false;
            } else {
              Serial.println("Transition mode with relay ON.");
              digitalWrite(relayPins[relayNum - 1], LOW);
              tasks[taskCount].relayActiveDuring = true;
            }
            // Set starting color to blue
            setRingColor(relayNum - 1, strip.Color(0, 0, 255));
            taskCount++;
          } else {
            // Normal color mode (non-blocking timing)
            digitalWrite(relayPins[relayNum - 1], LOW);
            setRingColor(relayNum - 1, tasks[taskCount].color);
            tasks[taskCount].endTime = now + (unsigned long)(duration * 1000);
            tasks[taskCount].isTransition = false;
            tasks[taskCount].relayActiveDuring = true;
            taskCount++;
          }
        }
      }
    }

    start = commaIndex + 1;
  }

  strip.show();

  // Wait and handle tasks (color + transition) concurrently
  bool allDone = false;
  while (!allDone && taskCount > 0) {
    allDone = true;
    now = millis();

    for (int i = 0; i < taskCount; i++) {
      if (tasks[i].endTime != 0) {
        if (tasks[i].isTransition) {
          unsigned long elapsed = now - tasks[i].startTime;
          unsigned long durationMs = (unsigned long)(tasks[i].duration * 1000);
          if (elapsed >= durationMs) {
            // End of transition: LEDs off and relay off if it was on
            if (tasks[i].relayActiveDuring) {
              digitalWrite(relayPins[tasks[i].relayIndex], HIGH);
            }
            setRingColor(tasks[i].relayIndex, strip.Color(0, 0, 0));
            tasks[i].endTime = 0;
          } else {
            float progress = float(elapsed) / float(durationMs);
            int r = 0;
            int g = int(255 * progress);
            int b = int(255 * (1.0 - progress));
            setRingColor(tasks[i].relayIndex, strip.Color(r, g, b));
            allDone = false;
          }
        } else {
          // Normal color timing
          if (now >= tasks[i].endTime) {
            digitalWrite(relayPins[tasks[i].relayIndex], HIGH);
            setRingColor(tasks[i].relayIndex, strip.Color(0, 0, 0));
            tasks[i].endTime = 0;
          } else {
            allDone = false;
          }
        }
      }
    }

    strip.show();
    delay(10);
  }
}

// ===== TRANSITION MODE =====
void ledTransition(int ringIndex, float seconds) {
  unsigned long duration = (unsigned long)(seconds * 1000);
  unsigned long startTime = millis();
  unsigned long now;

  while ((now = millis()) - startTime < duration) {
    float progress = float(now - startTime) / duration;
    // Blue → Green transition
    int r = 0;
    int g = int(255 * progress);
    int b = int(255 * (1.0 - progress));

    setRingColor(ringIndex, strip.Color(r, g, b));
    strip.show();
    delay(20);
  }

  // End state: LEDs off
  setRingColor(ringIndex, strip.Color(0, 0, 0));
  strip.show();
}

// ===== LED-ONLY TRANSITION (No Relay) =====
void ledTransitionOnly(int ringIndex, float seconds) {
  unsigned long duration = (unsigned long)(seconds * 1000);
  unsigned long startTime = millis();
  unsigned long now;

  while ((now = millis()) - startTime < duration) {
    float progress = float(now - startTime) / duration;
    int r = 0;
    int g = int(255 * progress);
    int b = int(255 * (1.0 - progress));

    setRingColor(ringIndex, strip.Color(r, g, b));
    strip.show();
    delay(20);
  }

  // End state: LEDs off
  setRingColor(ringIndex, strip.Color(0, 0, 0));
  strip.show();
}

// ===== SET RING COLOR =====
void setRingColor(int ringIndex, uint32_t color) {
  int start = ringIndex * LEDS_PER_RING;
  for (int i = start; i < start + LEDS_PER_RING; i++) {
    strip.setPixelColor(i, color);
  }
}

// ===== COLOR CODES =====
uint32_t getColorFromCode(String code) {
  code.toUpperCase();
  if (code == "R") return strip.Color(255, 0, 0);
  if (code == "G") return strip.Color(0, 255, 0);
  if (code == "B") return strip.Color(0, 0, 255);
  if (code == "Y") return strip.Color(255, 255, 0);
  if (code == "C") return strip.Color(0, 255, 255);
  if (code == "M") return strip.Color(255, 0, 255);
  if (code == "W") return strip.Color(255, 255, 255);
  if (code == "O") return strip.Color(255, 128, 0);
  if (code == "T") return strip.Color(0, 0, 255); // starting blue
  return strip.Color(128, 128, 128);
}

// ===== RAINBOW BOOT ANIMATION =====
void rainbowCycle(uint8_t wait) {
  for (int j = 0; j < 256; j++) {
    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, Wheel((i * 256 / NUM_LEDS + j) & 255));
    }
    strip.show();
    delay(wait);
    checkForStartCommand();
    if (systemStarted) return;
  }
}

// ===== CHECK FOR START COMMAND =====
void checkForStartCommand() {
  static String input = "";
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      input.trim();
      if (input.equalsIgnoreCase("START")) {
        Serial.println("Manual START detected!");
        systemStarted = true;
      }
      input = "";
    } else {
      input += c;
    }
  }
}

// ===== COLOR WHEEL =====
uint32_t Wheel(byte WheelPos) {
  WheelPos = 255 - WheelPos;
  if (WheelPos < 85) return strip.Color(255 - WheelPos * 3, 0, WheelPos * 3);
  if (WheelPos < 170) {
    WheelPos -= 85;
    return strip.Color(0, WheelPos * 3, 255 - WheelPos * 3);
  }
  WheelPos -= 170;
  return strip.Color(WheelPos * 3, 255 - WheelPos * 3, 0);
}
