# Pump Calibration Guide

This guide explains how to calibrate your pumps for accurate drink pouring.

## 📏 Understanding SECONDS_PER_ML

The `SECONDS_PER_ML` variable in `app.py` controls how long the pump runs to dispense a specific volume of liquid.

**Location:** `app.py` line 22

```python
SECONDS_PER_ML = 1.3  # Current setting: 1ml takes 1.3 seconds
```

## 🔧 How to Calibrate

### Step 1: Measure Your Pump Flow Rate

1. Place a measuring cup under one of your pumps
2. Run the pump for exactly **10 seconds** (use a stopwatch)
3. Measure how many ml were dispensed
4. Calculate: `SECONDS_PER_ML = 10 / ml_dispensed`

**Example:**
- If pump dispenses **8ml in 10 seconds**:
  - Flow rate = 8ml per 10 seconds = 0.8ml per second
  - `SECONDS_PER_ML = 1 / 0.8 = 1.25`

- If pump dispenses **7.7ml in 10 seconds** (current setting):
  - Flow rate = 7.7ml per 10 seconds ≈ 0.77ml per second
  - `SECONDS_PER_ML = 1 / 0.77 ≈ 1.3` ✅ (current default)

### Step 2: Update the Configuration

Edit `app.py` and change the value:

```python
SECONDS_PER_ML = 1.3  # Replace with your calculated value
```

### Step 3: Test and Fine-Tune

1. Order a drink with a known amount (e.g., 30ml)
2. Measure the actual output
3. If needed, adjust:
   - **Too much liquid?** Increase `SECONDS_PER_ML` slightly
   - **Too little liquid?** Decrease `SECONDS_PER_ML` slightly

## 📊 Common Pump Rates

| Pump Type | Typical ml/sec | SECONDS_PER_ML |
|-----------|----------------|----------------|
| Peristaltic (small) | 0.5 ml/s | 2.0 |
| Peristaltic (medium) | 0.77 ml/s | 1.3 ✅ (default) |
| Peristaltic (large) | 1.0 ml/s | 1.0 |
| Diaphragm pump | 2.0 ml/s | 0.5 |
| High-flow pump | 10.0 ml/s | 0.1 |

## 🧮 Calculation Examples

With `SECONDS_PER_ML = 1.3`:

| ML Requested | Seconds Calculated | Formula |
|--------------|-------------------|---------|
| 30ml | 39 seconds | 30 × 1.3 = 39s |
| 45ml | 58.5 seconds | 45 × 1.3 = 58.5s |
| 60ml | 78 seconds | 60 × 1.3 = 78s |
| 15ml | 19.5 seconds | 15 × 1.3 = 19.5s |

## 🔄 Old vs New Formula

### ❌ Old (Incorrect):
```python
seconds = ml_value / 10.0  # Assumed 10ml per second (WAY too fast!)
```
- 45ml → 4.5 seconds
- Would severely under-pour!

### ✅ New (Correct):
```python
seconds = ml_value * SECONDS_PER_ML  # Configurable, accurate
```
- 45ml → 58.5 seconds (with SECONDS_PER_ML = 1.3)
- Accurate pouring!

## 🎯 Quick Calibration Method

If you don't have time for precise measurement:

1. Make a simple drink (e.g., 60ml of one ingredient)
2. Measure the actual output
3. Calculate adjustment:
   ```
   NEW_SECONDS_PER_ML = OLD_SECONDS_PER_ML × (requested_ml / actual_ml)
   ```

**Example:**
- Setting: `SECONDS_PER_ML = 1.3`
- Requested: 60ml
- Actually got: 52ml (under-poured)
- New setting: `1.3 × (60/52) = 1.5`

## 📝 Notes

- All pumps should ideally have the same flow rate
- If pumps vary significantly, you may need individual calibration per pipe
- Temperature and liquid viscosity can affect flow rate slightly
- Re-calibrate periodically or if you notice consistent over/under-pouring

## 🛠️ Advanced: Per-Pipe Calibration

If you need different rates per pipe, you can extend the configuration:

```python
# In app.py, replace single value with dictionary:
SECONDS_PER_ML = {
    1: 1.3,   # Pipe 1
    2: 1.25,  # Pipe 2 (slightly faster)
    3: 1.35,  # Pipe 3 (slightly slower)
    4: 1.3,   # Pipe 4
    5: 1.3,   # Pipe 5
    6: 1.3,   # Pipe 6
    7: 1.3,   # Pipe 7
    8: 1.3,   # Pipe 8
}

# Then in handle_send_pipes, change:
seconds = ml_float * SECONDS_PER_ML.get(pipe_num, 1.3)
```

## 🆘 Troubleshooting

### Problem: Pumps run too long
- **Solution:** Decrease `SECONDS_PER_ML` (e.g., from 1.3 to 1.1)

### Problem: Not enough liquid dispensed
- **Solution:** Increase `SECONDS_PER_ML` (e.g., from 1.3 to 1.5)

### Problem: Inconsistent results
- **Check:** Air bubbles in tubing
- **Check:** Pump power supply voltage
- **Check:** Tube diameter and length consistency

### Problem: Different ingredients pour differently
- **Note:** Viscosity matters! Thick liquids (cream, syrup) flow slower
- **Solution:** Either calibrate for average, or use per-pipe settings for thick liquids

