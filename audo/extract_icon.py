#!/usr/bin/env python3
"""
Icon Extraction Tool

Helps you extract icons/buttons from screenshots to use as templates
for image matching in automation.

Usage:
    python extract_icons.py                    # Interactive mode - take new screenshot
    python extract_icons.py screenshot.png     # Extract from existing screenshot
"""

import cv2
import numpy as np
import os
import sys
from PIL import Image
import pyautogui

class IconExtractor:
    def __init__(self, image_path=None):
        """
        Initialize icon extractor
        
        Args:
            image_path: Path to existing screenshot, or None to capture new one
        """
        self.image_path = image_path
        self.output_dir = "icons"
        self.icon_count = 0
        
        # Create output directory
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Mouse callback state
        self.drawing = False
        self.start_point = None
        self.current_img = None
        self.original_img = None
    
    def capture_screenshot(self):
        """Capture a new screenshot"""
        print("Taking screenshot in 3 seconds...")
        print("Position your mouse over the area you want to capture...")
        for i in range(3, 0, -1):
            print(f"{i}...")
            import time
            time.sleep(1)
        
        screenshot = pyautogui.screenshot()
        path = "temp_screenshot.png"
        screenshot.save(path)
        print(f"Screenshot saved to {path}")
        return path
    
    def mouse_callback(self, event, x, y, flags, param):
        """Handle mouse events for drawing selection rectangles"""
        if event == cv2.EVENT_LBUTTONDOWN:
            self.drawing = True
            self.start_point = (x, y)
            
        elif event == cv2.EVENT_MOUSEMOVE:
            if self.drawing:
                # Create a copy and draw rectangle
                self.current_img = self.original_img.copy()
                cv2.rectangle(self.current_img, self.start_point, (x, y), (0, 255, 0), 2)
                
        elif event == cv2.EVENT_LBUTTONUP:
            self.drawing = False
            end_point = (x, y)
            
            # Extract the selected region
            x1, y1 = min(self.start_point[0], end_point[0]), min(self.start_point[1], end_point[1])
            x2, y2 = max(self.start_point[0], end_point[0]), max(self.start_point[1], end_point[1])
            
            if x2 - x1 > 5 and y2 - y1 > 5:  # Minimum size
                # Save the icon
                self.save_icon(x1, y1, x2, y2)
            
            # Reset the image
            self.current_img = self.original_img.copy()
    
    def save_icon(self, x1, y1, x2, y2):
        """Save the selected region as an icon"""
        # Extract region
        icon = self.original_img[y1:y2, x1:x2]
        
        # Ask for name
        print(f"\n{'='*60}")
        print(f"Selected region: ({x1}, {y1}) to ({x2}, {y2})")
        print(f"Size: {x2-x1}x{y2-y1} pixels")
        
        icon_name = input("Enter icon name (or press Enter for auto-name): ").strip()
        
        if not icon_name:
            self.icon_count += 1
            icon_name = f"icon_{self.icon_count}"
        
        # Remove file extension if provided
        icon_name = icon_name.replace('.png', '').replace('.jpg', '')
        
        # Save
        output_path = os.path.join(self.output_dir, f"{icon_name}.png")
        cv2.imwrite(output_path, icon)
        
        print(f"✓ Saved icon to: {output_path}")
        print(f"  Use it: auto.find_image_on_screen('{output_path}')")
        print('='*60)
    
    def extract_icons_interactive(self):
        """Interactive icon extraction from screenshot"""
        # Load or capture image
        if self.image_path is None:
            self.image_path = self.capture_screenshot()
        
        # Load image
        self.original_img = cv2.imread(self.image_path)
        if self.original_img is None:
            print(f"Error: Could not load image from {self.image_path}")
            return
        
        self.current_img = self.original_img.copy()
        
        print("\n" + "="*60)
        print("ICON EXTRACTION MODE")
        print("="*60)
        print("Instructions:")
        print("  1. Click and drag to select an icon/button")
        print("  2. Release to save the selection")
        print("  3. Press 's' to take a new screenshot")
        print("  4. Press 'r' to reset view")
        print("  5. Press 'q' to quit")
        print("="*60 + "\n")
        
        # Create window
        cv2.namedWindow('Icon Extractor', cv2.WINDOW_NORMAL)
        cv2.setMouseCallback('Icon Extractor', self.mouse_callback)
        
        # Resize window to fit screen if image is too large
        screen_width, screen_height = 1920, 1080  # Adjust if needed
        img_height, img_width = self.original_img.shape[:2]
        
        if img_width > screen_width or img_height > screen_height:
            scale = min(screen_width / img_width, screen_height / img_height)
            new_width = int(img_width * scale)
            new_height = int(img_height * scale)
            cv2.resizeWindow('Icon Extractor', new_width, new_height)
        
        while True:
            cv2.imshow('Icon Extractor', self.current_img)
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                break
            elif key == ord('s'):
                # Take new screenshot
                cv2.destroyAllWindows()
                self.image_path = self.capture_screenshot()
                self.original_img = cv2.imread(self.image_path)
                self.current_img = self.original_img.copy()
                cv2.namedWindow('Icon Extractor', cv2.WINDOW_NORMAL)
                cv2.setMouseCallback('Icon Extractor', self.mouse_callback)
            elif key == ord('r'):
                # Reset view
                self.current_img = self.original_img.copy()
        
        cv2.destroyAllWindows()
        print(f"\n✓ Extracted {self.icon_count} icons to '{self.output_dir}/' directory")
    
    def auto_detect_icons(self, min_size=20, max_size=200):
        """
        Automatically detect potential icon regions using edge detection
        (Experimental - may need manual review)
        """
        if self.image_path is None:
            self.image_path = self.capture_screenshot()
        
        # Load image
        img = cv2.imread(self.image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Edge detection
        edges = cv2.Canny(gray, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        print(f"Found {len(contours)} potential regions")
        print("Filtering by size...")
        
        valid_regions = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Filter by size
            if min_size <= w <= max_size and min_size <= h <= max_size:
                # Check aspect ratio (icons are usually square-ish)
                aspect_ratio = w / h
                if 0.5 <= aspect_ratio <= 2.0:
                    valid_regions.append((x, y, w, h))
        
        print(f"Found {len(valid_regions)} potential icons")
        
        # Save each region
        for i, (x, y, w, h) in enumerate(valid_regions):
            icon = img[y:y+h, x:x+w]
            output_path = os.path.join(self.output_dir, f"auto_icon_{i}.png")
            cv2.imwrite(output_path, icon)
            print(f"Saved: {output_path} ({w}x{h})")
        
        print(f"\n✓ Auto-extracted {len(valid_regions)} potential icons")
        print(f"  Review them in '{self.output_dir}/' and rename as needed")


def main():
    """Main entry point"""
    print("="*60)
    print("ICON EXTRACTION TOOL")
    print("="*60)
    
    # Check for command line argument
    image_path = None
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        if not os.path.exists(image_path):
            print(f"Error: File not found: {image_path}")
            return
        print(f"Using screenshot: {image_path}")
    else:
        print("No screenshot provided - will capture new one")
    
    extractor = IconExtractor(image_path)
    
    # Ask for mode
    print("\nSelect mode:")
    print("  1. Interactive extraction (click and drag)")
    print("  2. Auto-detect icons (experimental)")
    
    choice = input("\nEnter choice (1 or 2): ").strip()
    
    if choice == "2":
        extractor.auto_detect_icons()
    else:
        extractor.extract_icons_interactive()


if __name__ == "__main__":
    main()
