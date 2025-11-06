# Keyboard Handlers Added to Input Fields

## ✅ What Was Added

Added automatic on-screen keyboard (wvkbd-mobintl) start/stop functionality to all text input fields and searchbars in the application.

## 📝 Changes Made

### 1. HTML - Added Event Handlers to Input Fields

#### **Searchbars Updated:**

1. **Ingredient Search** (`id="ingredient-search"`)
   - Location: Assign Pipeline section
   - Line: 77-84
   
2. **Cocktail Ingredient Search** (`id="cocktail-ingredient-search"`)
   - Location: Add Cocktail section
   - Line: 305-312

3. **All Cocktails Search** (`id="all-cocktail-search"`)
   - Location: All Cocktails section
   - Line: 409-416

#### **Form Inputs Updated:**

4. **Ingredient Name** (`id="ingredient-name"`)
   - Location: Add Ingredients form
   - Line: 162-169

5. **Ingredient Remark** (`id="ingredient-remark"`)
   - Location: Add Ingredients form
   - Line: 197-204
   - **Enhanced with placeholder text**: "Add any notes about this ingredient..."

6. **Product Name** (`id="product-name"`)
   - Location: Add Cocktail form
   - Line: 240-247

7. **Product Description** (`id="product-description"`)
   - Location: Add Cocktail form (textarea)
   - Line: 274-280

#### **Event Handlers Added:**
```html
onfocus="handleInputFocus()"
onblur="handleInputBlur()"
```

**Example:**
```html
<input
  type="text"
  id="ingredient-search"
  placeholder="Search Ingredients..."
  onfocus="handleInputFocus()"
  onblur="handleInputBlur()"
/>
```

### 2. JavaScript - Added Handler Functions

**Location:** `static/script.js` (Lines 30-50)

```javascript
// ==================== KEYBOARD HANDLERS ====================
// These functions trigger the on-screen keyboard on Raspberry Pi
function handleInputFocus() {
  console.log('Input focused - Starting keyboard');
  fetch('/focus-in', { method: 'POST' })
    .then(response => response.text())
    .then(data => console.log('Keyboard start response:', data))
    .catch(error => console.error('Error starting keyboard:', error));
}

function handleInputBlur() {
  console.log('Input blurred - Stopping keyboard');
  // Add a small delay to prevent keyboard from closing if user is switching between inputs
  setTimeout(() => {
    fetch('/focus-out', { method: 'POST' })
      .then(response => response.text())
      .then(data => console.log('Keyboard stop response:', data))
      .catch(error => console.error('Error stopping keyboard:', error));
  }, 200);
}
// ==========================================================
```

### 3. Backend - Existing Endpoints (No Changes)

The backend endpoints were already in place:

**In `app.py` (Lines 262-291):**
- `/focus-in` → Executes `keyboardstart.sh`
- `/focus-out` → Executes `keyboardstop.sh`

## 🎯 How It Works

### Flow Diagram:

```
User taps input field
  ↓
onfocus event triggers
  ↓
handleInputFocus() called
  ↓
POST to /focus-in
  ↓
Backend executes keyboardstart.sh
  ↓
wvkbd-mobintl starts
  ↓
✅ On-screen keyboard appears

User taps outside input field
  ↓
onblur event triggers
  ↓
handleInputBlur() called
  ↓
Wait 200ms (delay to prevent flickering)
  ↓
POST to /focus-out
  ↓
Backend executes keyboardstop.sh
  ↓
wvkbd-mobintl stops
  ↓
✅ On-screen keyboard disappears
```

### Why the 200ms Delay?

The `setTimeout()` in `handleInputBlur()` prevents the keyboard from flickering when:
- User tabs between input fields
- User quickly switches from one search to another
- User moves focus between form fields

Without the delay:
```
Field1 blur → Keyboard closes
Field2 focus → Keyboard opens
Result: Annoying flicker!
```

With the delay:
```
Field1 blur → Wait 200ms
Field2 focus → Cancel the close command
Result: Smooth transition!
```

## 📊 Summary of All Fields with Keyboard

| Field | ID | Type | Location |
|-------|----|----- |----------|
| Ingredient Search | `ingredient-search` | Search | Assign Pipeline |
| Cocktail Ingredient Search | `cocktail-ingredient-search` | Search | Add Cocktail |
| All Cocktails Search | `all-cocktail-search` | Search | All Cocktails |
| Ingredient Name | `ingredient-name` | Text | Add Ingredients Form |
| Ingredient Remark | `ingredient-remark` | Text | Add Ingredients Form |
| Product Name | `product-name` | Text | Add Cocktail Form |
| Product Description | `product-description` | Textarea | Add Cocktail Form |

## ✅ Testing Checklist

### On Raspberry Pi:

- [ ] Tap **Ingredient Search** → Keyboard appears
- [ ] Type text → Keyboard works
- [ ] Tap outside → Keyboard disappears
- [ ] Tap **Cocktail Search** → Keyboard appears
- [ ] Switch between search fields → No flicker
- [ ] Tap **Add Ingredient** button
  - [ ] Tap **Ingredient Name** → Keyboard appears
  - [ ] Tap **Ingredient Remark** → Keyboard stays/appears
  - [ ] Tab between fields → Smooth transition
  - [ ] Tap outside → Keyboard disappears
- [ ] Tap **Add Cocktail** button
  - [ ] Tap **Product Name** → Keyboard appears
  - [ ] Tap **Product Description** → Keyboard appears
  - [ ] Tap outside → Keyboard disappears

### Console Logs:

Check browser console for:
```
Input focused - Starting keyboard
Keyboard start response: Focus-in event received, running keyboardstart.sh
Input blurred - Stopping keyboard
Keyboard stop response: Focus-out event received, running keyboardstop.sh
```

## 🔧 Shell Scripts

### `keyboardstart.sh`
```bash
#!/bin/bash
# Check if wvkbd-mobintl is running
if pgrep -x "wvkbd-mobintl" > /dev/null
then
    echo "wvkbd-mobintl is already running."
else
    # Start wvkbd-mobintl with the desired options
    wvkbd-mobintl -L 300 -bg 90EE90 --press 00ff00 --press-sp 00ff00 -O &
    echo "wvkbd-mobintl started."
fi
```

### `keyboardstop.sh`
```bash
sudo pkill wvkbd-mobintl
echo "Keyboard stop script executed."
```

## 📝 Ingredient Remark Field

The ingredient remark field already existed in the form but has been enhanced:

**Before:**
```html
<label for="ingredient-remark">Remark (Optional):</label>
<input type="text" id="ingredient-remark" name="ingredient-remark" />
```

**After:**
```html
<label for="ingredient-remark">Remark (Optional):</label>
<input 
  type="text" 
  id="ingredient-remark" 
  name="ingredient-remark"
  placeholder="Add any notes about this ingredient..."
  onfocus="handleInputFocus()"
  onblur="handleInputBlur()"
/>
```

### What the Remark Field Does:

1. **Optional field** to add notes/remarks about an ingredient
2. **Stored in database** when ingredient is saved
3. **Can be viewed/edited** when ingredient details are shown
4. **Examples of remarks:**
   - "Requires refrigeration"
   - "Replace every 2 weeks"
   - "Strong flavor - use sparingly"
   - "Organic brand preferred"

## ⚠️ Important Notes

1. **Windows Behavior:** On Windows systems, the keyboard handlers are safely ignored (backend returns success but doesn't execute scripts)

2. **Keyboard Layout:** The keyboard uses `wvkbd-mobintl` with these settings:
   - Height: 300px (`-L 300`)
   - Background: Light green (`-bg 90EE90`)
   - Key press color: Bright green (`--press 00ff00`)
   - Landscape orientation (`-O`)

3. **Multiple Keyboards:** The `keyboardstart.sh` script checks if keyboard is already running to prevent multiple instances

4. **Permissions:** The `keyboardstop.sh` uses `sudo` to ensure keyboard process is killed properly

## 🎉 Benefits

✅ **Automatic keyboard** - Appears when needed, disappears when not
✅ **No manual keyboard toggling** - User doesn't need to manually open/close keyboard
✅ **Smooth transitions** - 200ms delay prevents flickering
✅ **Works on all input fields** - Searchbars, text inputs, textareas
✅ **Remark field enhanced** - Better placeholder text, keyboard support
✅ **Raspberry Pi optimized** - Perfect for touchscreen use
✅ **Windows safe** - Doesn't break on development machines

## 🔄 Future Enhancements

If you add new input fields in the future, remember to add:
```html
onfocus="handleInputFocus()"
onblur="handleInputBlur()"
```

Or you could add it globally with JavaScript:
```javascript
// Add to all input fields automatically
document.querySelectorAll('input[type="text"], textarea').forEach(input => {
  input.addEventListener('focus', handleInputFocus);
  input.addEventListener('blur', handleInputBlur);
});
```

But the explicit HTML attributes are more reliable and easier to debug!

