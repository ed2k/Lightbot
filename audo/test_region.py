#!/usr/bin/env python3
"""Test to determine what region coordinates pyautogui.screenshot expects on Retina displays"""

import pyautogui
from PIL import Image

def test_region_scaling():
    """
    Test whether pyautogui.screenshot expects logical or physical coordinates for regions
    on Retina displays with 2x scaling.
    """
    print("="*60)
    print("Testing Region Scaling on Retina Display")
    print("="*60)
    
    # Get screen info
    screen_size = pyautogui.size()
    full_screenshot = pyautogui.screenshot()
    
    scale_x = full_screenshot.width / screen_size.width
    scale_y = full_screenshot.height / screen_size.height
    
    print(f"\n1. Display Info:")
    print(f"   Logical screen size: {screen_size.width}x{screen_size.height}")
    print(f"   Full screenshot size: {full_screenshot.width}x{full_screenshot.height}")
    print(f"   Scale factors: X={scale_x}, Y={scale_y}")
    
    # Test with logical coordinates
    print(f"\n2. Test: Region with LOGICAL coordinates (100, 100, 200, 150)")
    logical_region = (100, 100, 200, 150)
    
    try:
        screenshot_logical = pyautogui.screenshot(region=logical_region)
        print(f"   ✓ Success!")
        print(f"   Region specified: {logical_region}")
        print(f"   Screenshot dimensions: {screenshot_logical.width}x{screenshot_logical.height}")
        
        # Save for inspection
        screenshot_logical.save("/Users/esunyin/code/number24/audo/test_logical_region.png")
        print(f"   Saved to: test_logical_region.png")
        
        # Analyze
        expected_physical = (200 * scale_x, 150 * scale_y)
        print(f"\n   Analysis:")
        print(f"   Expected if scaled to physical: {int(expected_physical[0])}x{int(expected_physical[1])}")
        print(f"   Actual screenshot: {screenshot_logical.width}x{screenshot_logical.height}")
        
        if screenshot_logical.width == int(expected_physical[0]):
            print(f"   ✓ Region input is LOGICAL, output is PHYSICAL")
        elif screenshot_logical.width == 200:
            print(f"   ✓ Region input is LOGICAL, output is LOGICAL")
        else:
            print(f"   ? Unexpected behavior")
            
    except Exception as e:
        print(f"   ✗ Failed: {e}")
    
    # Test with physical coordinates
    print(f"\n3. Test: Region with PHYSICAL coordinates (200, 200, 400, 300)")
    physical_region = (200, 200, 400, 300)
    
    try:
        screenshot_physical = pyautogui.screenshot(region=physical_region)
        print(f"   ✓ Success!")
        print(f"   Region specified: {physical_region}")
        print(f"   Screenshot dimensions: {screenshot_physical.width}x{screenshot_physical.height}")
        
        # Save for inspection
        screenshot_physical.save("/Users/esunyin/code/number24/audo/test_physical_region.png")
        print(f"   Saved to: test_physical_region.png")
        
    except Exception as e:
        print(f"   ✗ Failed: {e}")
    
    # Test full screen with logical size region
    print(f"\n4. Test: Full screen with LOGICAL size region (0, 0, {screen_size.width}, {screen_size.height})")
    full_logical_region = (0, 0, screen_size.width, screen_size.height)
    
    try:
        screenshot_full_logical = pyautogui.screenshot(region=full_logical_region)
        print(f"   ✓ Success!")
        print(f"   Region specified: {full_logical_region}")
        print(f"   Screenshot dimensions: {screenshot_full_logical.width}x{screenshot_full_logical.height}")
        print(f"   Full screenshot (no region): {full_screenshot.width}x{full_screenshot.height}")
        
        # Compare
        if screenshot_full_logical.size == full_screenshot.size:
            print(f"   ✓ MATCH! Logical size region captures full screen")
        else:
            print(f"   ✗ Different! Region capture differs from full screen")
            print(f"   Difference: {screenshot_full_logical.width - full_screenshot.width}x{screenshot_full_logical.height - full_screenshot.height}")
        
        # Save for inspection
        screenshot_full_logical.save("/Users/esunyin/code/number24/audo/test_full_logical_region.png")
        print(f"   Saved to: test_full_logical_region.png")
        
    except Exception as e:
        print(f"   ✗ Failed: {e}")
    
    # Test specific case from user's scenario
    print(f"\n5. Test: User's scenario - Region (913, 820, 750, 198)")
    user_region = (913, 820, 750, 198)
    
    try:
        screenshot_user = pyautogui.screenshot(region=user_region)
        print(f"   ✓ Success!")
        print(f"   Region specified: {user_region}")
        print(f"   Screenshot dimensions: {screenshot_user.width}x{screenshot_user.height}")
        print(f"   Expected if 2x scale: {750*2}x{198*2} = 1500x396")
        
        # Save for inspection
        screenshot_user.save("/Users/esunyin/code/number24/audo/test_user_region.png")
        print(f"   Saved to: test_user_region.png")
        
    except Exception as e:
        print(f"   ✗ Failed: {e}")
    
    print(f"\n{'='*60}")
    print("CONCLUSION:")
    print("-"*60)
    
    # Determine behavior
    if screenshot_logical.width == int(200 * scale_x):
        print("✓ pyautogui.screenshot() expects LOGICAL coordinates")
        print("✓ Returns screenshot in PHYSICAL pixels (2x resolution)")
        print("\nThis means:")
        print("  - Input region: (x, y, w, h) in logical/mouse coordinates")
        print("  - Output image: 2x dimensions")
        print("  - OCR coordinates: in physical pixels, need to divide by 2")
    else:
        print("? Unexpected behavior - manual inspection needed")
    
    print("="*60)

if __name__ == "__main__":
    test_region_scaling()
