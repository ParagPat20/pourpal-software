# PourPal Arduino Controller - Updated

## Changes Made

### 1. Updated Drink Type Values
- **Old Values**: `light`, `medium`, `strong`
- **New Values**: `less-liquor`, `regular`, `more-liquor`

### 2. Removed Alcoholic/Non-Alcoholic Logic
- **Removed**: `isAlcoholic` field processing
- **Simplified**: Data structure now only contains `productId`, `ingredients`, and `drinkType`

### 3. Updated Multiplier System
- **Less Liquor**: 70% of regular amount (0.7x multiplier)
- **Regular**: 100% of regular amount (1.0x multiplier)  
- **More Liquor**: 130% of regular amount (1.3x multiplier)

## Data Structure Received

The Arduino now expects this JSON structure:

```json
{
  "productId": 1,
  "ingredients": [
    {
      "name": "Vodka",
      "pipe": 1,
      "ingMl": "50"
    },
    {
      "name": "Cranberry Juice", 
      "pipe": 2,
      "ingMl": "100"
    }
  ],
  "drinkType": "regular"
}
```

## Hardware Setup

1. **Pump Connections**: Connect pumps to pins 2-9 (adjust `PUMP_PINS` array as needed)
2. **Calibration**: Adjust `pumpDurationMs` calculation in `pumpIngredient()` function
3. **Serial Communication**: Ensure 9600 baud rate matches Python backend

## Usage

1. Upload the code to your Arduino
2. Connect pumps to the specified pins
3. Calibrate pump timing for your specific hardware
4. The Arduino will automatically process drink orders from the Python backend

## Calibration

To calibrate pump timing:
1. Measure how much liquid each pump dispenses per second
2. Update the multiplier in `pumpIngredient()` function:
   ```cpp
   int pumpDurationMs = (int)(amountMl * YOUR_CALIBRATION_VALUE);
   ```

## Error Handling

- Invalid JSON: Returns "ERROR"
- Invalid pump index: Logs error and skips
- Unknown drink type: Uses regular multiplier as default
- Successful completion: Returns "COMPLETED"

## Commands

- **Drink Order**: Send JSON data via serial
- **Cancel**: Send "CANCEL" command to stop all pumps immediately
