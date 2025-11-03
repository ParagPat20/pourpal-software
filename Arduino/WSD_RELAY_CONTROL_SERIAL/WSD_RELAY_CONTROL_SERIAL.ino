#include <Adafruit_NeoPixel.h>

#define DATA_PIN 10
#define NUM_RINGS 8
#define LEDS_PER_RING 8
#define NUM_LEDS (NUM_RINGS * LEDS_PER_RING)

Adafruit_NeoPixel strip(NUM_LEDS, DATA_PIN, NEO_GRB + NEO_KHZ800);

const int relayPins[NUM_RINGS] = {2, 3, 4, 5, 6, 7, 8, 9};
bool systemStarted = false;

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  strip.begin();
  strip.show();
  
  for (int i = 0; i < NUM_RINGS; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], HIGH); // Relay OFF (active LOW)
  }

  Serial.println("System booting... Type START to skip 10s rainbow loading.");

  unsigned long startTime = millis();
  while (millis() - startTime < 10000 && !systemStarted) {
    rainbowCycle(2);
    checkForStartCommand();
  }

  systemStarted = true;
  strip.clear();
  strip.show();

  Serial.println("\nReady! Send commands like:");
  Serial.println("  1:R:3,2:G:4,5:Y:1.5");
  Serial.println("  or use transition: 1:T:3  (Blue→Green over 3s)");
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

// ===== PARSE MULTIPLE COMMANDS (SIMULTANEOUS CONTROL) =====
void parseAndExecuteCommands(String commandLine) {
  struct Task {
    int relayIndex;
    String colorCode;
    uint32_t color;
    unsigned long startTime;
    unsigned long endTime;
    float duration;
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
          tasks[taskCount].colorCode = colorCode;
          tasks[taskCount].color = getColorFromCode(colorCode);
          tasks[taskCount].startTime = now;
          tasks[taskCount].endTime = now + (unsigned long)(duration * 1000);
          tasks[taskCount].duration = duration;

          Serial.print("Relay ");
          Serial.print(relayNum);
          Serial.print(" -> ");
          Serial.print(colorCode);
          Serial.print(" for ");
          Serial.print(duration);
          Serial.println(" seconds.");

          digitalWrite(relayPins[relayNum - 1], LOW);
          if (colorCode != "T") setRingColor(relayNum - 1, tasks[taskCount].color);
          taskCount++;
        }
      }
    }

    start = commaIndex + 1;
  }

  strip.show();

  bool allDone = false;
  while (!allDone) {
    allDone = true;
    now = millis();

    for (int i = 0; i < taskCount; i++) {
      if (tasks[i].endTime != 0) {
        if (tasks[i].colorCode == "T") {
          // Transition Mode (Blue → Green)
          float progress = (float)(now - tasks[i].startTime) / (tasks[i].duration * 1000.0);
          if (progress > 1.0) progress = 1.0;
          uint8_t r = 0;
          uint8_t g = (uint8_t)(progress * 255);
          uint8_t b = (uint8_t)((1.0 - progress) * 255);
          setRingColor(tasks[i].relayIndex, strip.Color(r, g, b));
        }

        if (now >= tasks[i].endTime) {
          // Time to turn off relay
          digitalWrite(relayPins[tasks[i].relayIndex], HIGH);
          setRingColor(tasks[i].relayIndex, strip.Color(0, 0, 0));
          tasks[i].endTime = 0;
        } else {
          allDone = false;
        }
      }
    }

    strip.show();
    delay(10);
  }
}

// ===== HELPER: SET RING COLOR =====
void setRingColor(int ringIndex, uint32_t color) {
  int start = ringIndex * LEDS_PER_RING;
  for (int i = start; i < start + LEDS_PER_RING; i++) {
    strip.setPixelColor(i, color);
  }
}

// ===== HELPER: COLOR CODES =====
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

// ===== DETECT START COMMAND =====
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
