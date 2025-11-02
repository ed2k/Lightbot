#!/usr/bin/env python3
"""
Example usage scenarios for screen automation tool
"""

from auto import ScreenAutomation
import time


def demo_screen_reading():
    """Demonstrate screen reading and text extraction"""
    print("\n=== Demo: Screen Reading ===")
    auto = ScreenAutomation()
    
    # Capture current screen
    screenshot = auto.capture_screen()
    
    # Extract all text
    all_text = auto.extract_text(screenshot)
    print("All text found on screen:")
    print(all_text[:500])  # Print first 500 chars
    
    # Get text with bounding boxes
    text_boxes = auto.extract_text_with_boxes(screenshot)
    print(f"\nDetected {len(text_boxes)} text elements")
    
    # Show first few elements
    for i, box in enumerate(text_boxes[:5]):
        print(f"{i+1}. '{box['text']}' at ({box['left']}, {box['top']}) "
              f"confidence: {box['conf']:.1f}%")
    
    # Visualize detected text
    auto.visualize_text_boxes(screenshot, 'demo_screen_analysis.png')
    print("\nSaved annotated screenshot to demo_screen_analysis.png")


def demo_find_and_click():
    """Demonstrate finding and clicking UI elements"""
    print("\n=== Demo: Find and Click ===")
    auto = ScreenAutomation()
    
    # Find specific text on screen
    search_terms = ["Chrome", "Safari", "Firefox", "Close", "OK", "Cancel"]
    
    for term in search_terms:
        result = auto.find_text_on_screen(term)
        if result:
            print(f"✓ Found '{term}'")
            # Uncomment to actually click:
            # auto.click_on_text(term)
        else:
            print(f"✗ '{term}' not found")


def demo_mouse_keyboard():
    """Demonstrate mouse and keyboard control"""
    print("\n=== Demo: Mouse and Keyboard Control ===")
    auto = ScreenAutomation()
    
    # Get current mouse position
    current_pos = auto.get_mouse_position()
    print(f"Current mouse position: {current_pos}")
    
    # Get screen size
    screen_size = auto.get_screen_size()
    print(f"Screen size: {screen_size}")
    
    print("\nMouse will move in 3 seconds (move to corner to abort)...")
    time.sleep(3)
    
    # Move mouse to center of screen
    center_x = screen_size[0] // 2
    center_y = screen_size[1] // 2
    auto.move_mouse(center_x, center_y, duration=1.0)
    
    # Demonstrate keyboard
    print("\nKeyboard demo (typing in 3 seconds)...")
    time.sleep(3)
    # Note: Make sure a text field is focused!
    # auto.type_text("Hello from automation!")


def demo_form_filling():
    """Demonstrate automated form filling"""
    print("\n=== Demo: Form Filling ===")
    auto = ScreenAutomation()
    
    print("This demo would:")
    print("1. Find 'Name' field and type 'John Doe'")
    print("2. Press Tab to move to next field")
    print("3. Type email address")
    print("4. Find and click 'Submit' button")
    
    # Uncomment to actually run (make sure form is open):
    """
    auto.find_and_type("Name", "John Doe")
    auto.press_key("tab")
    auto.type_text("john@example.com")
    auto.press_key("tab")
    auto.type_text("This is my message")
    auto.click_on_text("Submit")
    """


def demo_wait_for_element():
    """Demonstrate waiting for elements"""
    print("\n=== Demo: Wait for Element ===")
    auto = ScreenAutomation()
    
    print("Searching for common UI elements...")
    
    # Try to find common elements without waiting
    elements_to_find = ["File", "Edit", "View", "Help", "Settings"]
    
    for element in elements_to_find:
        found = auto.find_text_on_screen(element)
        if found:
            print(f"✓ Found: {element}")
            break
    
    # Example of waiting (commented out)
    """
    if auto.wait_for_text("Loading...", timeout=10):
        print("Loading indicator disappeared")
        auto.click_on_text("Continue")
    """


def demo_region_reading():
    """Demonstrate reading specific screen regions"""
    print("\n=== Demo: Region Reading ===")
    auto = ScreenAutomation()
    
    screen_size = auto.get_screen_size()
    
    # Define some regions
    regions = {
        "Top Bar": (0, 0, screen_size[0], 100),
        "Left Side": (0, 100, 300, 400),
        "Center": (screen_size[0]//4, screen_size[1]//4, 
                  screen_size[0]//2, screen_size[1]//2)
    }
    
    print("Analyzing different screen regions:")
    for name, region in regions.items():
        screenshot = auto.capture_screen(region)
        text = auto.extract_text(screenshot)
        word_count = len(text.split())
        print(f"\n{name} region {region}:")
        print(f"  Words found: {word_count}")
        if text:
            preview = text[:100].replace('\n', ' ')
            print(f"  Preview: {preview}...")


def demo_advanced_search():
    """Demonstrate advanced text search"""
    print("\n=== Demo: Advanced Search ===")
    auto = ScreenAutomation()
    
    screenshot = auto.capture_screen()
    text_boxes = auto.extract_text_with_boxes(screenshot)
    
    # Search for numbers
    numbers = [box for box in text_boxes if any(c.isdigit() for c in box['text'])]
    print(f"Found {len(numbers)} elements containing numbers")
    
    # Search for specific patterns
    buttons = [box for box in text_boxes 
               if any(word in box['text'].lower() 
                     for word in ['button', 'click', 'submit', 'ok', 'cancel'])]
    print(f"Found {len(buttons)} potential buttons")
    
    # High confidence text
    high_conf = [box for box in text_boxes if box['conf'] > 90]
    print(f"Found {len(high_conf)} high-confidence text elements (>90%)")


def interactive_demo():
    """Interactive demo - follow prompts"""
    print("\n=== Interactive Demo ===")
    auto = ScreenAutomation()
    
    print("\n1. Screen Analysis")
    print("2. Find Text")
    print("3. Mouse Position Tracker")
    print("4. Capture Region")
    print("5. Exit")
    
    choice = input("\nSelect option (1-5): ").strip()
    
    if choice == "1":
        demo_screen_reading()
    elif choice == "2":
        search = input("Enter text to search for: ").strip()
        result = auto.find_text_on_screen(search)
        if result:
            print(f"Found at: {result}")
            click = input("Click it? (y/n): ").strip().lower()
            if click == 'y':
                auto.click_on_text(search)
    elif choice == "3":
        from auto import interactive_mouse_tracker
        interactive_mouse_tracker()
    elif choice == "4":
        print("Enter region coordinates:")
        left = int(input("Left: "))
        top = int(input("Top: "))
        width = int(input("Width: "))
        height = int(input("Height: "))
        region = (left, top, width, height)
        auto.save_screenshot(f"region_{left}_{top}.png", region=region)
        print(f"Saved to region_{left}_{top}.png")
    elif choice == "5":
        print("Goodbye!")
        return
    else:
        print("Invalid choice")


def run_all_demos():
    """Run all non-interactive demos"""
    print("=" * 60)
    print("SCREEN AUTOMATION DEMO SUITE")
    print("=" * 60)
    
    demos = [
        ("Screen Reading", demo_screen_reading),
        ("Find and Click", demo_find_and_click),
        ("Mouse and Keyboard", demo_mouse_keyboard),
        ("Region Reading", demo_region_reading),
        ("Advanced Search", demo_advanced_search),
    ]
    
    for name, demo_func in demos:
        try:
            demo_func()
            print(f"\n✓ {name} demo completed")
        except Exception as e:
            print(f"\n✗ {name} demo failed: {e}")
        
        time.sleep(1)
    
    print("\n" + "=" * 60)
    print("All demos completed!")
    print("=" * 60)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "all":
            run_all_demos()
        elif sys.argv[1] == "interactive":
            interactive_demo()
        else:
            print("Usage: python example_usage.py [all|interactive]")
    else:
        print("Screen Automation Examples")
        print("\nRun demos:")
        print("  python example_usage.py all         - Run all demos")
        print("  python example_usage.py interactive - Interactive mode")
        print("\nOr run individual demos by uncommenting in code")
        
        # Uncomment to run specific demos:
        demo_screen_reading()
        # demo_find_and_click()
        # demo_region_reading()
        # demo_advanced_search()
