# Screen Automation Tool

A Python tool that can read from screen, recognize text (OCR), find UI elements, control mouse, and type text automatically.

## Features

- **Screen Capture**: Take screenshots of entire screen or specific regions
- **OCR (Text Recognition)**: Extract text from screen using Tesseract
- **Find UI Elements**: Locate buttons, text fields, labels by their text content
- **Mouse Control**: Move mouse, click, double-click, right-click
- **Keyboard Control**: Type text, press keys, use keyboard shortcuts
- **Automation**: Combine all features for complete UI automation

## Installation

### 1. Install Tesseract OCR

**macOS:**
```bash
brew install tesseract
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install tesseract-ocr
```

**Windows:**
Download installer from: https://github.com/UB-Mannheim/tesseract/wiki

### 2. Create Virtual Environment (Recommended)

Create and activate a virtual environment to isolate dependencies:

**macOS/Linux:**
```bash
# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate
```

**Windows:**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or install individually:
```bash
pip install pyautogui pytesseract Pillow numpy
```

**Note:** Make sure your virtual environment is activated before installing dependencies!

## Usage

### Basic Screen Reading

```python
from auto import ScreenAutomation

auto = ScreenAutomation()

# Capture and read entire screen
screenshot = auto.capture_screen()
text = auto.extract_text(screenshot)
print(text)

# Save screenshot
auto.save_screenshot('screen.png')
```

### Find and Click Buttons

```python
# Find button with text "Submit" and click it
auto.click_on_text("Submit")

# Find and click specific text in a region
region = (100, 100, 800, 600)  # (left, top, width, height)
auto.click_on_text("OK", region=region)
```

### Find and Click Icons/Images

```python
# Find and click an icon using template matching
auto.click_on_image('icons/settings_icon.png')

# Find icon with custom threshold (0.0 to 1.0)
coords = auto.find_image_on_screen('icons/play_button.png', threshold=0.9)
if coords:
    print(f"Found icon at {coords}")
    auto.move_and_click(coords[0], coords[1])

# Find all occurrences of an icon
all_matches = auto.find_all_images_on_screen('icons/folder.png')
for x, y in all_matches:
    print(f"Found folder icon at ({x}, {y})")

# Search for icon in specific region
region = (0, 0, 800, 600)
coords = auto.find_image_on_screen('icons/close.png', region=region, threshold=0.85)
```

**Tips for Template Matching:**
- Save a screenshot of the icon/image you want to find
- Crop it to just the icon (remove extra background)
- Use threshold 0.8-0.9 for most cases (0.8 = less strict, 0.9 = more strict)
- Works best with icons that don't change appearance
- For icons at different sizes, you may need multiple templates

### Form Automation

```python
# Find "Username" field and type
auto.find_and_type("Username", "john_doe")

# Press Tab to move to next field
auto.press_key("tab")

# Type password
auto.type_text("mypassword123")

# Press Enter to submit
auto.press_key("enter")
```

### Mouse Control

```python
# Move mouse to coordinates
auto.move_mouse(500, 300)

# Click at current position
auto.click()

# Move and click in one action
auto.move_and_click(500, 300)

# Double click
auto.double_click(500, 300)

# Right click
auto.right_click(500, 300)
```

### Keyboard Control

```python
# Type text
auto.type_text("Hello World")

# Press special keys
auto.press_key("enter")
auto.press_key("tab")
auto.press_key("esc")

# Keyboard shortcuts
auto.hotkey("ctrl", "c")  # Copy
auto.hotkey("ctrl", "v")  # Paste
auto.hotkey("cmd", "s")   # Save (macOS)
```

### Find Text on Screen

```python
# Find text and get its coordinates
coords = auto.find_text_on_screen("Click Here")
if coords:
    x, y = coords
    print(f"Found at: {x}, {y}")

# Find all occurrences
all_coords = auto.find_all_text_on_screen("Button")
for x, y in all_coords:
    print(f"Found at: {x}, {y}")
```

### Wait for Elements

```python
# Wait for text to appear (useful for loading screens)
if auto.wait_for_text("Loading Complete", timeout=30):
    # Proceed when text appears
    auto.click_on_text("Continue")
```

### Read Specific Screen Areas

```python
# Read text from specific region
region = (100, 100, 400, 200)  # (left, top, width, height)
text = auto.read_screen_area(region)
print(f"Text in region: {text}")
```

### Visualize Detected Text

```python
# Capture screen and draw boxes around detected text
screenshot = auto.capture_screen()
auto.visualize_text_boxes(screenshot, 'annotated.png')
```

### Get Mouse Position (Helper)

```python
# Get current mouse position
x, y = auto.get_mouse_position()

# Interactive tracker (press Ctrl+C to stop)
from auto import interactive_mouse_tracker
interactive_mouse_tracker()
```

## Examples

### Example 1: Login Automation

```python
from auto import ScreenAutomation
import time

auto = ScreenAutomation()

# Click login button
auto.click_on_text("Login")
time.sleep(1)

# Fill username
auto.find_and_type("Username", "myuser")

# Press Tab to move to password
auto.press_key("tab")

# Type password
auto.type_text("mypassword")

# Press Enter to submit
auto.press_key("enter")
```

### Example 2: Dialog Automation

```python
# Wait for dialog to appear
if auto.wait_for_text("Are you sure?", timeout=10):
    # Click Yes button
    auto.click_on_text("Yes")
```

### Example 3: Data Entry

```python
# Read data from one area and type in another
data = auto.read_screen_area((100, 100, 300, 50))

# Find input field and type the data
auto.find_and_type("Enter text:", data)
```

## Safety Features

- **Fail-safe**: Move mouse to top-left corner to abort (built into pyautogui)
- **Pause between actions**: 0.5 second pause by default (configurable)
- **Timeout support**: Wait operations have configurable timeouts

## Tips

1. **Finding Coordinates**: Use `interactive_mouse_tracker()` to find exact coordinates
2. **Screen Resolution**: Use `get_screen_size()` to check your screen dimensions
3. **Region Capture**: Capture specific regions for faster OCR processing
4. **Confidence Scores**: Check OCR confidence with `extract_text_with_boxes()`
5. **Testing**: Always test automation scripts in safe environments first

## Troubleshooting

### Tesseract not found
Make sure Tesseract is installed and in your PATH. On macOS/Linux:
```bash
which tesseract
```

### OCR not accurate
- Increase screen resolution
- Use specific regions instead of full screen
- Ensure text is clear and not obstructed
- Try different languages: `auto.extract_text(image, lang='eng')`

### Permission issues (macOS)
Grant accessibility permissions:
- System Preferences → Security & Privacy → Privacy → Accessibility
- Add Terminal or your Python IDE

### Python 3.12+ Installation Issues

**Errors you might see:**
- `ModuleNotFoundError: No module named 'distutils'`
- `BackendUnavailable: Cannot import 'setuptools.build_meta'`

Python 3.12+ removed `distutils`, causing installation issues. **Recommended solution:**

**Use Python 3.11 (Most Reliable)**
```bash
# Install Python 3.11
brew install python@3.11  # macOS

# Remove old venv if exists
rm -rf venv

# Create new venv with Python 3.11
python3.11 -m venv venv
source venv/bin/activate

# Verify Python version
python --version  # Should show Python 3.11.x

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

**Alternative: Fix Current Environment**

If you want to keep Python 3.12, try these steps in order:

```bash
# 1. Activate your venv
source venv/bin/activate

# 2. Completely reinstall pip and setuptools
python -m ensurepip --upgrade
pip install --upgrade pip setuptools wheel

# 3. Install dependencies one by one (skip problematic ones first)
pip install Pillow
pip install numpy
pip install pytesseract
pip install pyautogui

# Or try with --no-build-isolation
pip install --no-build-isolation pyautogui
```

**Nuclear Option: Fresh Start**
```bash
# Deactivate and remove old venv
deactivate
rm -rf venv

# Create fresh venv
python3.11 -m venv venv  # Or python3 -m venv venv
source venv/bin/activate

# Install pip first
python -m ensurepip --upgrade
pip install --upgrade pip setuptools wheel

# Install requirements
pip install -r requirements.txt
```

## Advanced Usage

### Custom Regions

```python
# Define region: (left, top, width, height)
top_bar = (0, 0, 1920, 100)
sidebar = (0, 100, 200, 800)

# Search only in specific area
auto.find_text_on_screen("Menu", region=sidebar)
```

### Combining Operations

```python
# Complex workflow
auto.wait_for_text("Ready", timeout=30)
auto.click_on_text("Start")
time.sleep(2)
auto.find_and_type("Name", "John Doe")
auto.hotkey("ctrl", "s")  # Save
```

## API Reference

See docstrings in `auto.py` for detailed API documentation.

Key classes and methods:
- `ScreenAutomation`: Main automation class
- `capture_screen()`: Take screenshot
- `extract_text()`: OCR text extraction
- `find_text_on_screen()`: Locate text
- `click_on_text()`: Find and click
- `move_and_click()`: Mouse control
- `type_text()`: Keyboard input
- `wait_for_text()`: Wait for element

## License

MIT License - Feel free to use and modify
