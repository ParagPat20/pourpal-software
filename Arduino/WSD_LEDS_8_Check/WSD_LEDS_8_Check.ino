#include <Adafruit_NeoPixel.h>

#define DATA_PIN 10
#define NUM_RINGS 8
#define LEDS_PER_RING 8
#define NUM_LEDS (NUM_RINGS * LEDS_PER_RING)

Adafruit_NeoPixel strip(NUM_LEDS, DATA_PIN, NEO_GRB + NEO_KHZ800);

// ====== FUNCTION DECLARATIONS ======
void rainbowRotate(uint8_t wait);
void pulseWave(uint8_t wait);
void comet(uint8_t red, uint8_t green, uint8_t blue, int speedDelay);
void sparkle(int count, int wait);
void colorChase(uint8_t wait);
void setRingColor(int ringIndex, uint32_t color);
uint32_t Wheel(byte WheelPos);

// ====== SETUP ======
void setup() {
  strip.begin();
  strip.show();
  randomSeed(analogRead(0)); // for sparkle randomness
}

// ====== MAIN LOOP ======
void loop() {
  rainbowRotate(10);
  pulseWave(8);
  comet(255, 50, 0, 25);
  sparkle(10, 100);
  colorChase(50);
}

// ====== EFFECT 1: RAINBOW ROTATION ======
void rainbowRotate(uint8_t wait) {
  for (int j = 0; j < 256; j++) {
    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, Wheel(((i * 256 / NUM_LEDS) + j) & 255));
    }
    strip.show();
    delay(wait);
  }
}

// ====== EFFECT 2: PULSE WAVE ACROSS RINGS ======
void pulseWave(uint8_t wait) {
  for (int brightness = 0; brightness <= 255; brightness += 5) {
    for (int ring = 0; ring < NUM_RINGS; ring++) {
      uint32_t color = strip.Color(0, brightness, 255 - brightness);
      setRingColor(ring, color);
    }
    strip.show();
    delay(wait);
  }
  for (int brightness = 255; brightness >= 0; brightness -= 5) {
    for (int ring = NUM_RINGS - 1; ring >= 0; ring--) {
      uint32_t color = strip.Color(0, brightness, 255 - brightness);
      setRingColor(ring, color);
    }
    strip.show();
    delay(wait);
  }
}

// ====== EFFECT 3: COMET (TRAILING BALL OF LIGHT) ======
void comet(uint8_t red, uint8_t green, uint8_t blue, int speedDelay) {
  int size = 6;
  float fade = 0.8;

  for (int i = 0; i < NUM_LEDS + size; i++) {
    for (int j = 0; j < NUM_LEDS; j++) {
      uint32_t oldColor = strip.getPixelColor(j);
      uint8_t r = (uint8_t)(oldColor >> 16);
      uint8_t g = (uint8_t)(oldColor >> 8);
      uint8_t b = (uint8_t)(oldColor);
      strip.setPixelColor(j, (uint8_t)(r * fade), (uint8_t)(g * fade), (uint8_t)(b * fade));
    }
    for (int j = 0; j < size; j++) {
      if ((i - j) >= 0 && (i - j) < NUM_LEDS)
        strip.setPixelColor(i - j, strip.Color(red, green, blue));
    }
    strip.show();
    delay(speedDelay);
  }
}

// ====== EFFECT 4: RANDOM SPARKLES ======
void sparkle(int count, int wait) {
  for (int k = 0; k < 80; k++) { // repeat a few cycles
    strip.clear();
    for (int i = 0; i < count; i++) {
      int pixel = random(NUM_LEDS);
      strip.setPixelColor(pixel, strip.Color(random(255), random(255), random(255)));
    }
    strip.show();
    delay(wait);
  }
}

// ====== EFFECT 5: COLOR CHASE ======
void colorChase(uint8_t wait) {
  uint32_t colors[] = {
    strip.Color(255, 0, 0),
    strip.Color(0, 255, 0),
    strip.Color(0, 0, 255),
    strip.Color(255, 255, 0),
    strip.Color(0, 255, 255),
    strip.Color(255, 0, 255)
  };
  int numColors = sizeof(colors) / sizeof(colors[0]);

  for (int c = 0; c < numColors; c++) {
    for (int ring = 0; ring < NUM_RINGS; ring++) {
      setRingColor(ring, colors[(ring + c) % numColors]);
      strip.show();
      delay(wait);
    }
  }
}

// ====== HELPER FUNCTIONS ======
void setRingColor(int ringIndex, uint32_t color) {
  int start = ringIndex * LEDS_PER_RING;
  for (int i = start; i < start + LEDS_PER_RING; i++) {
    strip.setPixelColor(i, color);
  }
}

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