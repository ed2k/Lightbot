#!/usr/bin/env python3
"""
Screen automation tool that can:
- Capture and read screen content
- Recognize text using OCR
- Find UI elements (buttons, text fields)
- Move mouse and click
- Type text in specific areas
"""

import pyautogui
import pytesseract
from PIL import Image, ImageDraw
import time
import re
import cv2
import numpy as np
from typing import Tuple, List, Optional, Dict


class ScreenAutomation:
    """Main class for screen automation with OCR capabilities"""
    
    def __init__(self):
        # Fail-safe: move mouse to corner to abort
        pyautogui.FAILSAFE = True
        # Pause between actions for stability
        pyautogui.PAUSE = 0.5
        
        # Detect Retina display scaling (macOS)
        self.scale_x, self.scale_y = self._detect_scale_factor()
        if self.scale_x != 1.0 or self.scale_y != 1.0:
            print(f"Detected display scaling: X={self.scale_x}x, Y={self.scale_y}x")
            if self.scale_x != self.scale_y:
                print(f"⚠ Warning: Different X and Y scaling detected!")
    
    def _detect_scale_factor(self) -> tuple:
        """
        Detect if running on Retina display and return scale factors
        NOTICE, if screenshot(region=...) returns logical pixels (1:1), not physical pixels (2x)
        so to avoid scaling conversion, always use region

        Returns:
            Tuple of (scale_x, scale_y) - Both should be 2.0 for Retina displays
        """
        # Take a small screenshot and compare dimensions
        screenshot = pyautogui.screenshot()
        screen_size = pyautogui.size()
        
        # Calculate scaling factor for each axis
        scale_x = screenshot.width / screen_size.width
        scale_y = screenshot.height / screen_size.height
        
        print(f"Screenshot size: {screenshot.width}x{screenshot.height}, Screen size: {screen_size.width}x{screen_size.height}")
        print(f"Calculated scale factors: X={scale_x}, Y={scale_y}")
        
        return (scale_x, scale_y)
        
    def capture_screen(self, region: Optional[Tuple[int, int, int, int]] = None) -> Image.Image:
        """
        Capture screenshot of entire screen or specific region
        NOTICE, if screenshot(region=...) returns logical pixels (1:1), not physical pixels (2x)
        so to avoid scaling conversion, always use region

        
        Args:
            region: Tuple of (left, top, width, height). None for full screen
            
        Returns:
            PIL Image object
        """
        screenshot = pyautogui.screenshot(region=region)
        return screenshot
    
    def save_screenshot(self, filename: str, region: Optional[Tuple[int, int, int, int]] = None):
        """Save screenshot to file"""
        screenshot = self.capture_screen(region)
        screenshot.save(filename)
        print(f"Screenshot saved to {filename}")
        
    def extract_text(self, image: Image.Image, lang: str = 'eng') -> str:
        """
        Extract text from image using OCR
        
        Args:
            image: PIL Image object
            lang: Language for OCR (default: 'eng')
            
        Returns:
            Extracted text as string
        """
        text = pytesseract.image_to_string(image, lang=lang)
        return text.strip()
    
    def extract_text_with_boxes(self, image: Image.Image) -> List[Dict]:
        """
        Extract text with bounding box coordinates
        
        Returns:
            List of dicts with keys: text, left, top, width, height, conf
        """
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        
        # Save OCR data for debugging
        import os
        import json
        import time
        debug_dir = os.path.join(os.path.dirname(__file__), 'debug_screenshots')
        os.makedirs(debug_dir, exist_ok=True)
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        debug_path = os.path.join(debug_dir, f"ocr_data_{timestamp}.json")
        with open(debug_path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"DEBUG: Saved OCR data to {debug_path}")
        
        results = []
        n_boxes = len(data['text'])
        
        for i in range(n_boxes):
            text = data['text'][i].strip()
            if text:  # Only include non-empty text
                results.append({
                    'text': text,
                    'left': data['left'][i],
                    'top': data['top'][i],
                    'width': data['width'][i],
                    'height': data['height'][i],
                    'conf': data['conf'][i]  # Confidence score
                })
        
        return results
    
    def find_text_on_screen(self, search_text: str, region: Optional[Tuple[int, int, int, int]] = None) -> Optional[Tuple[int, int]]:
        """
        Find text on screen and return its center coordinates
        
        Args:
            search_text: Text to search for
            region: Optional region to search in (left, top, width, height) in mouse coordinates
            
        Returns:
            Tuple of (x, y) coordinates at center of found text, or None
        """
        # Pass region as-is to screenshot
        screenshot = self.capture_screen(region)
        
        # Save screenshot for debugging
        import os
        import time
        debug_dir = os.path.join(os.path.dirname(__file__), 'debug_screenshots')
        os.makedirs(debug_dir, exist_ok=True)
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        debug_path = os.path.join(debug_dir, f"find_{search_text.replace(' ', '_')}_{timestamp}.png")
        screenshot.save(debug_path)
        print(f"DEBUG: Saved screenshot to {debug_path}")
        
        text_boxes = self.extract_text_with_boxes(screenshot)
        
        # Offset for region in mouse coordinates
        offset_x = region[0] if region else 0
        offset_y = region[1] if region else 0
        
        # When region is specified, screenshot is in logical pixels (1:1), not physical pixels
        # When no region, screenshot is in physical pixels (2x on Retina)
        scale_x = 1.0 if region else self.scale_x
        scale_y = 1.0 if region else self.scale_y
        
        print(f"DEBUG: Region passed: {region}")
        print(f"DEBUG: Offsets - X={offset_x}, Y={offset_y}")
        print(f"DEBUG: Scale factors for this capture - X={scale_x}, Y={scale_y}")
        
        for box in text_boxes:
            if search_text.lower() in box['text'].lower():
                # Box coordinates are in screenshot pixels relative to captured region
                # Calculate center of bounding box
                screenshot_x = box['left'] + box['width'] // 2
                screenshot_y = box['top'] + box['height'] // 2
                
                print(f"DEBUG: Raw OCR box for '{box['text']}': left={box['left']}, top={box['top']}, w={box['width']}, h={box['height']}")
                
                # Convert to mouse coordinates
                # If region was used, no scaling needed (already in logical pixels)
                # If no region, need to scale from physical to logical
                center_x = int(screenshot_x / scale_x) + offset_x
                center_y = int(screenshot_y / scale_y) + offset_y
                
                # Debug output
                print(f"DEBUG: Found '{search_text}'")
                print(f"  OCR box: left={box['left']}, top={box['top']}, w={box['width']}, h={box['height']}")
                print(f"  Screenshot coords: X={screenshot_x}, Y={screenshot_y}")
                print(f"  Scale factors used: X={scale_x}, Y={scale_y}")
                print(f"  X scaling: {screenshot_x} ÷ {scale_x} = {int(screenshot_x / scale_x)}")
                print(f"  Y scaling: {screenshot_y} ÷ {scale_y} = {int(screenshot_y / scale_y)}")
                print(f"  Offsets: X={offset_x}, Y={offset_y}")
                print(f"  Final mouse coords: X={center_x}, Y={center_y}")
                
                return (center_x, center_y)
        
        print(f"Text '{search_text}' not found on screen")
        return None
    
    def find_all_text_on_screen(self, search_text: str, region: Optional[Tuple[int, int, int, int]] = None) -> List[Tuple[int, int]]:
        """
        Find all occurrences of text on screen
        
        Returns:
            List of (x, y) coordinate tuples
        """
        # Pass region as-is to screenshot
        screenshot = self.capture_screen(region)
        
        # Save screenshot for debugging
        import os
        import time
        debug_dir = os.path.join(os.path.dirname(__file__), 'debug_screenshots')
        os.makedirs(debug_dir, exist_ok=True)
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        debug_path = os.path.join(debug_dir, f"find_all_{search_text.replace(' ', '_')}_{timestamp}.png")
        screenshot.save(debug_path)
        print(f"DEBUG: Saved screenshot to {debug_path}")
        
        text_boxes = self.extract_text_with_boxes(screenshot)
        
        # Offset for region in mouse coordinates
        offset_x = region[0] if region else 0
        offset_y = region[1] if region else 0
        
        # When region is specified, screenshot is in logical pixels (1:1), not physical pixels
        # When no region, screenshot is in physical pixels (2x on Retina)
        scale_x = 1.0 if region else self.scale_x
        scale_y = 1.0 if region else self.scale_y
        
        print(f"DEBUG find_all: Region={region}, Offsets=({offset_x}, {offset_y}), Scale=({scale_x}, {scale_y})")
        
        matches = []
        for box in text_boxes:
            if search_text in box['text']:
                # Box coordinates are in screenshot pixels relative to captured region
                screenshot_x = box['left'] + box['width'] // 2
                screenshot_y = box['top'] + box['height'] // 2
                
                print(f"DEBUG find_all: Found '{box['text']}' - OCR box: left={box['left']}, top={box['top']}, center=({screenshot_x}, {screenshot_y})")
                
                # Convert to mouse coordinates
                # If region was used, no scaling needed (already in logical pixels)
                # If no region, need to scale from physical to logical
                center_x = int(screenshot_x / scale_x) + offset_x
                center_y = int(screenshot_y / scale_y) + offset_y
                
                print(f"  After scaling & offset: ({center_x}, {center_y}) = ({screenshot_x}/{scale_x} + {offset_x}, {screenshot_y}/{scale_y} + {offset_y})")
                
                matches.append((center_x, center_y))
        
        print(f"Found {len(matches)} occurrences of '{search_text}'")
        return matches
    
    def click_on_text(self, text: str, region: Optional[Tuple[int, int, int, int]] = None, clicks: int = 1, button: str = 'left') -> bool:
        """
        Find text and click on it
        
        Args:
            text: Text to find and click
            region: Optional search region
            clicks: Number of clicks (default: 1)
            button: 'left', 'right', or 'middle'
            
        Returns:
            True if clicked, False if text not found
        """
        coords = self.find_text_on_screen(text, region)
        if coords:
            self.move_and_click(coords[0], coords[1], clicks, button)
            return True
        return False
    
    def move_mouse(self, x: int, y: int, duration: float = 0.5):
        """Move mouse to coordinates smoothly"""
        pyautogui.moveTo(x, y, duration=duration)
        print(f"Moved mouse to ({x}, {y})")
    
    def click(self, clicks: int = 1, button: str = 'left'):
        """Click at current mouse position"""
        pyautogui.click(clicks=clicks, button=button)
        print(f"Clicked {button} button {clicks} time(s)")
    
    def move_and_click(self, x: int, y: int, clicks: int = 1, button: str = 'left', duration: float = 0.5):
        """Move mouse and click"""
        self.move_mouse(x, y, duration)
        time.sleep(0.5)
        self.click(clicks, button)
    
    def double_click(self, x: Optional[int] = None, y: Optional[int] = None):
        """Double click at specified position or current position"""
        if x is not None and y is not None:
            pyautogui.doubleClick(x, y)
        else:
            pyautogui.doubleClick()
        print("Double clicked")
    
    def right_click(self, x: Optional[int] = None, y: Optional[int] = None):
        """Right click at specified position or current position"""
        if x is not None and y is not None:
            pyautogui.rightClick(x, y)
        else:
            pyautogui.rightClick()
        print("Right clicked")
    
    def type_text(self, text: str, interval: float = 0.05):
        """
        Type text with specified interval between keystrokes
        
        Args:
            text: Text to type
            interval: Seconds between each keystroke
        """
        pyautogui.write(text, interval=interval)
        print(f"Typed: {text}")
    
    def press_key(self, key: str, presses: int = 1):
        """Press a key (e.g., 'enter', 'tab', 'esc')"""
        pyautogui.press(key, presses=presses)
        print(f"Pressed '{key}' {presses} time(s)")
    
    def hotkey(self, *keys):
        """Press multiple keys simultaneously (e.g., 'ctrl', 'c')"""
        pyautogui.hotkey(*keys)
        print(f"Pressed hotkey: {' + '.join(keys)}")
    
    def find_and_type(self, find_text: str, type_text: str, region: Optional[Tuple[int, int, int, int]] = None) -> bool:
        """
        Find text on screen, click it, and type text
        
        Returns:
            True if successful, False if find_text not found
        """
        coords = self.find_text_on_screen(find_text, region)
        if coords:
            self.move_and_click(coords[0], coords[1])
            time.sleep(0.3)
            self.type_text(type_text)
            return True
        return False
    
    def get_mouse_position(self) -> Tuple[int, int]:
        """Get current mouse position"""
        pos = pyautogui.position()
        print(f"Mouse position: {pos}")
        return pos
    
    def get_screen_size(self) -> Tuple[int, int]:
        """Get screen resolution"""
        size = pyautogui.size()
        print(f"Screen size: {size}")
        return size
    
    def visualize_text_boxes(self, image: Image.Image, save_path: str = 'annotated_screen.png'):
        """
        Draw bounding boxes around detected text and save image
        
        Args:
            image: PIL Image to annotate
            save_path: Path to save annotated image
        """
        text_boxes = self.extract_text_with_boxes(image)
        
        # Create a copy to draw on
        annotated = image.copy()
        draw = ImageDraw.Draw(annotated)
        
        for box in text_boxes:
            left = box['left']
            top = box['top']
            right = left + box['width']
            bottom = top + box['height']
            
            # Draw rectangle
            draw.rectangle([left, top, right, bottom], outline='red', width=2)
            # Draw text label
            draw.text((left, top - 15), box['text'], fill='red')
        
        annotated.save(save_path)
        print(f"Annotated image saved to {save_path}")
        return annotated
    
    def wait_for_text(self, text: str, timeout: int = 30, region: Optional[Tuple[int, int, int, int]] = None) -> bool:
        """
        Wait for text to appear on screen
        
        Args:
            text: Text to wait for
            timeout: Maximum seconds to wait
            region: Optional region to monitor
            
        Returns:
            True if text found, False if timeout
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            coords = self.find_text_on_screen(text, region)
            if coords:
                print(f"Text '{text}' appeared after {time.time() - start_time:.1f} seconds")
                return True
            time.sleep(0.5)
        
        print(f"Timeout: Text '{text}' did not appear within {timeout} seconds")
        return False
    
    def read_screen_area(self, region: Tuple[int, int, int, int]) -> str:
        """
        Read text from specific screen area
        
        Args:
            region: Tuple of (left, top, width, height) in mouse coordinates
            
        Returns:
            Extracted text
        """
        # Pass region as-is to screenshot
        screenshot = self.capture_screen(region)
        text = self.extract_text(screenshot)
        print(f"Text from region {region}:\n{text}")
        return text
    
    def find_image_on_screen(self, template_path: str, region: Optional[Tuple[int, int, int, int]] = None, 
                            threshold: float = 0.8) -> Optional[Tuple[int, int]]:
        """
        Find an image/icon on screen using template matching
        
        Args:
            template_path: Path to the template image file (icon/image to find)
            region: Optional region to search in (left, top, width, height) in mouse coordinates
            threshold: Matching threshold (0.0 to 1.0, higher = more strict)
            
        Returns:
            Tuple of (x, y) coordinates at center of found image, or None
        """
        # Capture screen
        screenshot = self.capture_screen(region)
        
        # Convert PIL Image to OpenCV format (BGR)
        screenshot_cv = cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)
        
        # Load template image
        template = cv2.imread(template_path)
        if template is None:
            print(f"Error: Could not load template image from {template_path}")
            return None
        
        # Get template dimensions
        template_h, template_w = template.shape[:2]
        
        # Perform template matching
        result = cv2.matchTemplate(screenshot_cv, template, cv2.TM_CCOEFF_NORMED)
        
        # Find locations where matching exceeds threshold
        locations = np.where(result >= threshold)
        
        if len(locations[0]) == 0:
            print(f"Image not found (threshold={threshold})")
            return None
        
        # Get the best match
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
        
        # Calculate center of matched region
        match_x = max_loc[0] + template_w // 2
        match_y = max_loc[1] + template_h // 2
        
        # Offset for region in mouse coordinates (no scaling needed when region is used)
        offset_x = region[0] if region else 0
        offset_y = region[1] if region else 0
        
        # When region is used, screenshot is in logical pixels (1:1)
        scale_x = 1.0 if region else self.scale_x
        scale_y = 1.0 if region else self.scale_y
        
        center_x = int(match_x / scale_x) + offset_x
        center_y = int(match_y / scale_y) + offset_y
        
        print(f"Found image at ({center_x}, {center_y}) with confidence {max_val:.3f}")
        return (center_x, center_y)
    
    def find_all_images_on_screen(self, template_path: str, region: Optional[Tuple[int, int, int, int]] = None,
                                 threshold: float = 0.8) -> List[Tuple[int, int]]:
        """
        Find all occurrences of an image/icon on screen
        
        Args:
            template_path: Path to the template image file
            region: Optional region to search in (left, top, width, height) in mouse coordinates
            threshold: Matching threshold (0.0 to 1.0)
            
        Returns:
            List of (x, y) coordinate tuples for all matches
        """
        # Capture screen
        screenshot = self.capture_screen(region)
        
        # Convert PIL Image to OpenCV format (BGR)
        screenshot_cv = cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)
        
        # Load template image
        template = cv2.imread(template_path)
        if template is None:
            print(f"Error: Could not load template image from {template_path}")
            return []
        
        # Get template dimensions
        template_h, template_w = template.shape[:2]
        
        # Perform template matching
        result = cv2.matchTemplate(screenshot_cv, template, cv2.TM_CCOEFF_NORMED)
        
        # Find all locations where matching exceeds threshold
        locations = np.where(result >= threshold)
        
        # Offset for region
        offset_x = region[0] if region else 0
        offset_y = region[1] if region else 0
        
        # Scaling
        scale_x = 1.0 if region else self.scale_x
        scale_y = 1.0 if region else self.scale_y
        
        matches = []
        for pt in zip(*locations[::-1]):  # Switch x and y
            match_x = pt[0] + template_w // 2
            match_y = pt[1] + template_h // 2
            
            center_x = int(match_x / scale_x) + offset_x
            center_y = int(match_y / scale_y) + offset_y
            
            matches.append((center_x, center_y))
        
        print(f"Found {len(matches)} occurrences of image")
        return matches
    
    def click_on_image(self, template_path: str, region: Optional[Tuple[int, int, int, int]] = None,
                      threshold: float = 0.8, clicks: int = 1, button: str = 'left') -> bool:
        """
        Find an image and click on it
        
        Args:
            template_path: Path to template image
            region: Optional search region
            threshold: Matching threshold
            clicks: Number of clicks
            button: Mouse button ('left', 'right', 'middle')
            
        Returns:
            True if found and clicked, False otherwise
        """
        coords = self.find_image_on_screen(template_path, region, threshold)
        if coords:
            self.move_and_click(coords[0], coords[1], clicks, button)
            return True
        return False


# Example usage functions
def example_find_and_click_button():
    """Example: Find and click a button with specific text"""
    auto = ScreenAutomation()
    
    # Find and click button with text "Submit"
    auto.click_on_text("Submit")
    
    
def example_form_automation():
    """Example: Fill out a form"""
    auto = ScreenAutomation()
    
    # Find "Name" field and type
    auto.find_and_type("Name", "John Doe")
    
    # Press Tab to move to next field
    auto.press_key("tab")
    
    # Type email
    auto.type_text("john@example.com")
    
    # Press Tab and type more
    auto.press_key("tab")
    auto.type_text("This is a message")
    
    # Find and click Submit button
    auto.click_on_text("Submit")


def example_screen_reading():
    """Example: Read and analyze screen content"""
    auto = ScreenAutomation()
    
    # Capture current screen
    screenshot = auto.capture_screen()
    
    # Extract all text
    all_text = auto.extract_text(screenshot)
    print("All text on screen:")
    print(all_text)
    
    # Get text with positions
    text_boxes = auto.extract_text_with_boxes(screenshot)
    print(f"\nFound {len(text_boxes)} text elements")
    
    # Visualize detected text
    auto.visualize_text_boxes(screenshot, 'screen_analysis.png')


def example_wait_and_respond():
    """Example: Wait for text to appear and respond"""
    auto = ScreenAutomation()
    
    # Wait for "Continue" button to appear
    if auto.wait_for_text("Continue", timeout=30):
        # Click it when it appears
        auto.click_on_text("Continue")
        
        # Type something in response
        time.sleep(1)
        auto.type_text("Processing complete")


def interactive_mouse_tracker():
    """Interactive tool to track mouse position - useful for finding coordinates"""
    auto = ScreenAutomation()
    print("Move your mouse to the desired location and press Ctrl+C to stop")
    try:
        while True:
            x, y = auto.get_mouse_position()
            print(f"\rPosition: ({x}, {y})  ", end='', flush=True)
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\nStopped tracking")


if __name__ == "__main__":
    # Initialize automation
    auto = ScreenAutomation()
    
    # Get screen info
    auto.get_screen_size()
    auto.get_mouse_position()
    
    print("\n=== Screen Automation Tool ===")
    print("This tool can:")
    print("- Capture screenshots")
    print("- Read text using OCR")
    print("- Find UI elements by text")
    print("- Move mouse and click")
    print("- Type text")
    print("\nUncomment example functions to see it in action!")
    
    # Uncomment to run examples:
    # example_screen_reading()
    # example_find_and_click_button()
    # example_form_automation()
    # interactive_mouse_tracker()
