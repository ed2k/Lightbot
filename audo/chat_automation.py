#!/usr/bin/env python3
"""
Automate interaction with chat interface:
1. Find and activate the target window
2. Find and click input box
3. Toggle to chat mode if needed
4. Ask a question
5. Wait for and capture the answer
"""

from auto import ScreenAutomation
import time
import subprocess
import re

# Try to import PyWinCtl for accurate window detection
try:
    import pywinctl as pwc
    HAS_PYWINCTL = True
except ImportError:
    HAS_PYWINCTL = False
    print("Note: Install 'pywinctl' for accurate window detection: pip install pywinctl")


def find_and_activate_window(window_title: str) -> bool:
    """
    Find window with specified title and bring it to foreground
    
    Args:
        window_title: Text to search for in window title
        
    Returns:
        True if window found and activated, False otherwise
    """
    auto = ScreenAutomation()
    
    print(f"Searching for window containing '{window_title}'...")
    
    # Method 1: Try to find window title text on screen and click it
    # Look in top portion of screen where window titles usually are
    screen_size = auto.get_screen_size()
    title_bar_region = (0, 0, screen_size[0], 100)  # Top 100 pixels
    
    coords = auto.find_text_on_screen(window_title, region=title_bar_region)
    if coords:
        print(f"✓ Found window title at ({coords[0]}, {coords[1]})")
        print("Clicking to activate window...")
        auto.move_and_click(coords[0], coords[1])
        time.sleep(0.5)
        return True
    
    # Method 2: Search entire screen
    print(f"Window title not found in title bar, searching entire screen...")
    coords = auto.find_text_on_screen(window_title)
    if coords:
        print(f"✓ Found '{window_title}' at ({coords[0]}, {coords[1]})")
        print("Clicking to activate window...")
        auto.move_and_click(coords[0], coords[1])
        time.sleep(0.5)
        return True
    
    # Method 3: Try using AppleScript on macOS
    print("Trying AppleScript to activate window...")
    try:
        # List all windows and find matching one
        applescript = f'''
        tell application "System Events"
            set windowList to name of every window of every process
            repeat with w in windowList
                if w contains "{window_title}" then
                    set appName to name of first process whose windows contains w
                    tell application appName to activate
                    return true
                end if
            end repeat
        end tell
        return false
        '''
        
        result = subprocess.run(
            ['osascript', '-e', applescript],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0 and 'true' in result.stdout:
            print(f"✓ Activated window using AppleScript")
            time.sleep(0.5)
            return True
    except Exception as e:
        print(f"AppleScript method failed: {e}")
    
    print(f"⚠ Could not find or activate window with '{window_title}'")
    return False


def automate_chat_interaction(question: str, wait_time: int = 10, window_title: str = "number24"):
    """
    Automate chat interaction workflow
    
    Args:
        question: The question to ask
        wait_time: Seconds to wait for response
        window_title: Window title to search for
    """
    auto = ScreenAutomation()
    
    print("=== Chat Automation Started ===\n")
    
    # Step 1: Find window and chat components
    print("Step 1: Detecting chat interface...")
    input_coords, toggle_coords = find_specific_chat_box(window_title)
    
    # Step 3: Type the question
    print(f"\nStep 3: Typing question: '{question}'")
    auto.type_text(question, interval=0.05)
    time.sleep(0.5)
    
    # Step 4: Submit the question (try Enter or Send button)
    print("\nStep 4: Submitting question...")
    
    # Try pressing Enter first
    auto.press_key("enter")
    print("✓ Pressed Enter to submit")
    
    # Step 5: Wait for response
    print(f"\nStep 5: Waiting {wait_time} seconds for response...")
    time.sleep(wait_time)
    
    # Step 6: Capture the answer
    print("\nStep 6: Capturing response...")
    
    # Take screenshot of the screen
    screenshot = auto.capture_screen()
    auto.save_screenshot('debug_screenshots/chat_response.png')
    print("✓ Saved screenshot to 'chat_response.png'")
    
    # Try to read text from response area (bottom portion of screen)
    screen_size = auto.get_screen_size()
    
    # Define response region (bottom 60% of screen)
    response_region = (
        0,  # left
        int(screen_size[1] * 0.4),  # top (40% down)
        screen_size[0],  # width (full width)
        int(screen_size[1] * 0.6)  # height (60% of screen)
    )
    
    response_text = auto.read_screen_area(response_region)
    
    print("\n" + "="*60)
    print("CAPTURED RESPONSE:")
    print("="*60)
    print(response_text)
    print("="*60)
    
    # Save response to file
    with open('debug_screenshots/chat_response.txt', 'w') as f:
        f.write(f"Question: {question}\n\n")
        f.write(f"Response:\n{response_text}\n")
    
    print("\n✓ Saved response text to 'debug_screenshots/chat_response.txt'")
    
    return response_text


def find_specific_chat_box(window_title: str = "number24"):
    """
    Find chat input box and mode toggle automatically
    
    Steps:
    1. Activate the window
    2. Find "Claude Sonnet 4.5" text in bottom-right area
    3. Calculate chat/code toggle position (20px left of Claude text)
    
    Returns:
        Tuple of (input_box_coords, toggle_coords) or (None, None)
    """
    auto = ScreenAutomation()
    
    print("=== Finding Chat Interface ===\n")
    
    # Step 1: Activate the window
    print(f"Step 1: Activating window with '{window_title}'...")
    if not find_and_activate_window(window_title):
        print("✗ Failed to activate window")
        return None, None
    print("✓ Window activated\n")
    time.sleep(0.5)
    
    # Step 2: Find window boundaries using PyWinCtl or OCR
    print("Step 2: Detecting front window boundaries...")
    screen_size = auto.get_screen_size()
    
    # Track if we successfully used PyWinCtl
    used_pywinctl = False
    
    # Try PyWinCtl first for accurate window detection
    if HAS_PYWINCTL:
        print("  Using PyWinCtl for accurate window detection...")
        windows = pwc.getWindowsWithTitle(window_title, condition=pwc.Re.STARTSWITH)
        
        if windows:
            window = windows[0]
            window_left = window.left
            window_top = window.top
            window_width = window.width
            window_height = window.height
            
            print(f"  ✓ Window detected: ({window_left}, {window_top}) size: {window_width}x{window_height}")
            print(f"    Title: {window.title}")
            used_pywinctl = True
        else:
            print(f"  ⚠ No window found with title containing '{window_title}'")
    
    # Fall back to OCR-based detection if PyWinCtl not available or failed
    if not used_pywinctl:
        print("  Using OCR for window detection...")
        # Find window title (should be at center-top of window)
        title_coords = auto.find_text_on_screen(window_title)
        
        if not title_coords:
            print("  ⚠ Could not detect window title, using full screen")
            window_left = 0
            window_top = 0
            window_width = screen_size[0]
            window_height = screen_size[1]
        else:
            print(f"  Found title at: ({title_coords[0]}, {title_coords[1]})")
            
            # Title is at CENTER-TOP of window
            # For a typical IDE window: ~1400-1600px wide
            estimated_window_width = 1500
            window_center_x = title_coords[0]
            
            # Calculate left edge (title is centered, so left = center - width/2)
            window_left = max(0, window_center_x - estimated_window_width // 2)
            
            # Title bar is ~25px high, title text is ~12-15px from top of window
            # Being more conservative with the offset
            window_top = max(0, title_coords[1] - 15)
            
            print(f"  DEBUG: Title Y={title_coords[1]}, Estimated window top={window_top}")
            
            # Look for bottom indicators to determine height
            print("  Looking for bottom indicators...")
            
            # Search for bottom elements in the estimated window area
            search_top = title_coords[1] + 200
            search_height = max(100, screen_size[1] - search_top)  # Ensure positive height
            
            bottom_search_region = (
                window_left,
                search_top,  # Start 200px below title
                estimated_window_width,
                search_height
            )
            
            window_height = min(screen_size[1] - window_top, 1000)
            
            print(f"  DEBUG: Calculated window boundaries:")
            print(f"    Left={window_left}, Top={window_top}")
            print(f"    Width={estimated_window_width}, Height={window_height}")
            print(f"    Right={window_left + estimated_window_width}, Bottom={window_top + window_height}")
            
            # Refine width based on actual content
            # Look for elements near edges to validate width
            window_width = estimated_window_width
            
            # Ensure window fits on screen
            if window_left + window_width > screen_size[0]:
                window_width = screen_size[0] - window_left
            
            if window_top + window_height > screen_size[1]:
                window_height = screen_size[1] - window_top
            
            print(f"  Window boundaries: ({window_left}, {window_top}) size: {window_width}x{window_height}")
            print(f"    Left edge: {window_left}, Right edge: {window_left + window_width}")
            print(f"    Top edge: {window_top}, Bottom edge: {window_top + window_height}")
    
    # Step 3: Define bottom-right region of the WINDOW (not screen)
    print("\nStep 3: Looking for 'Gemini' in window's bottom-right...")
    
    # Bottom-right corner of the window (right 50%, bottom 20%)
    region_left = window_left + int(window_width * 0.5)
    region_top = window_top + int(window_height * 0.8)
    region_width = int(window_width * 0.5)
    region_height = int(window_height * 0.2)
    
    bottom_right_region = (region_left, region_top, region_width, region_height)
    
    print(f"\n  DEBUG: Bottom-right region calculation:")
    print(f"    Window: left={window_left}, top={window_top}, w={window_width}, h={window_height}")
    print(f"    Region: left={region_left} (window_left + {window_width}*0.5)")
    print(f"    Region: top={region_top} (window_top + {window_height}*0.7)")
    print(f"    Region: w={region_width}, h={region_height}")
    print(f"    Final region: {bottom_right_region}")
    print(f"    Region bottom Y: {region_top + region_height}\n")
    
    # Try various text patterns
    search_terms = [
        "Gemini",
    ]
    
    claude_coords = None
    for term in search_terms:
        # Find all occurrences to see if there are multiple
        all_coords = auto.find_all_text_on_screen(term, region=bottom_right_region)
        if all_coords:
            print(f"✓ Found {len(all_coords)} occurrence(s) of '{term}':")
            for i, coords in enumerate(all_coords):
                print(f"  [{i}] ({coords[0]}, {coords[1]})")
            # Use the LAST occurrence (likely the bottom one we want)
            claude_coords = all_coords[-1]
            print(f"  Using last occurrence: {claude_coords}")
            break
    
    if not claude_coords:
        print("✗ Could not find 'Claude' text")
        print("  Falling back to manual positioning...")
        return None, None
    
    # Step 4: Click toggle to open menu, then select chat option
    # Claude coords should already be absolute, but verify with window offset
    print(f"\n  DEBUG: Claude coords: {claude_coords}")
    print(f"  DEBUG: Window offset: ({window_left}, {window_top})")
    print(f"  DEBUG: Region offset: ({window_left + int(window_width * 0.5)}, {window_top + int(window_height * 0.7)})")
    
    # Toggle is 20px to the left of Claude text
    toggle_x = claude_coords[0] - 20
    toggle_y = claude_coords[1]
    
    print(f"\nStep 4: Opening code/chat menu...")
    print(f"  Toggle position: ({toggle_x}, {toggle_y}) (20px left of Claude)")
    
    # DEBUG: Move mouse to toggle position and verify
    print(f"\n  DEBUG: Moving mouse to toggle position...")
    auto.move_mouse(toggle_x, toggle_y, duration=1.0)
    time.sleep(1)
    actual_pos = auto.get_mouse_position()
    print(f"  DEBUG: Calculated toggle: ({toggle_x}, {toggle_y})")
    print(f"  DEBUG: Actual mouse pos: {actual_pos}")
    print(f"  DEBUG: Difference: X={actual_pos[0] - toggle_x}, Y={actual_pos[1] - toggle_y}")
    
    
    # Click toggle to bring up menu
    auto.move_and_click(toggle_x, toggle_y)
    time.sleep(0.5)
    print(f"  ✓ Clicked toggle to open menu")
    
    # Move 20px above and click to select chat option
    chat_option_x = toggle_x
    chat_option_y = toggle_y - 20
    print(f"  Chat option position: ({chat_option_x}, {chat_option_y}) (20px above toggle)")
    
    auto.move_and_click(chat_option_x, chat_option_y)
    time.sleep(0.5)
    print(f"  ✓ Selected chat option")
    
    # Step 5: Click 20px above chat option to activate input box
    input_x = chat_option_x
    input_y = chat_option_y - 20
    
    print(f"\nStep 5: Activating chat input box...")
    print(f"  Input box position: ({input_x}, {input_y}) (20px above chat option)")
    
    auto.move_and_click(input_x, input_y)
    time.sleep(0.5)
    print(f"  ✓ Chat input activated")
    
    input_coords = (input_x, input_y)
    toggle_coords = (toggle_x, toggle_y)
    
    print(f"\n{'='*60}")
    print("RESULTS:")
    print(f"  Input box: {input_coords}")
    print(f"  Chat/Code toggle: ({toggle_x}, {toggle_y})")
    print('='*60)
    
    return input_coords, (toggle_x, toggle_y)


def demo_multi_question():
    """Ask multiple questions in sequence"""
    print("=== Multi-Question Demo ===\n")
    
    questions = [
        "What is Python?",
        "How do I create a list in Python?",
        "What is the difference between a list and a tuple?"
    ]
    
    for i, question in enumerate(questions, 1):
        print(f"\n{'='*60}")
        print(f"Question {i}/{len(questions)}")
        print('='*60)
        
        automate_chat_interaction(question, wait_time=8)
        
        # Wait between questions
        if i < len(questions):
            print("\nWaiting 3 seconds before next question...")
            time.sleep(3)


def interactive_chat():
    """Interactive mode - ask questions via command line"""
    print("=== Interactive Chat Mode ===")
    print("Type your questions (or 'quit' to exit)\n")
    
    while True:
        question = input("Your question: ").strip()
        
        if question.lower() in ['quit', 'exit', 'q']:
            print("Goodbye!")
            break
        
        if not question:
            print("Please enter a question.")
            continue
        
        print()
        automate_chat_interaction(question, wait_time=10)
        print("\n" + "-"*60 + "\n")


def test_mouse_position():
    """Test to get current mouse position"""
    auto = ScreenAutomation()
    
    print("=== Mouse Position Test ===\n")
    print("Move your mouse to the desired location and press Enter...")
    input()
    
    pos = auto.get_mouse_position()
    print(f"\nMouse position: X={pos[0]}, Y={pos[1]}")
    print(f"As tuple: {pos}")
    
    return pos


def quick_test():
    """Quick test to verify automation is working"""
    auto = ScreenAutomation()
    
    print("=== Quick Test ===\n")
    
    # Test 1: Screen capture
    print("Test 1: Capturing screen...")
    screenshot = auto.capture_screen()
    print("✓ Screen captured")
    
    # Test 2: OCR
    print("\nTest 2: Reading text from screen...")
    text = auto.extract_text(screenshot)
    word_count = len(text.split())
    print(f"✓ Detected {word_count} words")
    
    # Test 3: Find common UI elements
    print("\nTest 3: Looking for common UI elements...")
    common_elements = ["File", "Edit", "View", "Help", "Close", "Menu"]
    found_count = 0
    
    for element in common_elements:
        if auto.find_text_on_screen(element):
            print(f"  ✓ Found: {element}")
            found_count += 1
    
    print(f"\nFound {found_count}/{len(common_elements)} common elements")
    print("\n✓ Automation is working!")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "test":
            quick_test()
        
        elif command == "mouse":
            test_mouse_position()
        
        elif command == "window":
            # Test window activation
            window_name = sys.argv[2] if len(sys.argv) > 2 else "number24"
            print(f"Testing window activation for '{window_name}'...")
            if find_and_activate_window(window_name):
                print("\n✓ Window activation successful!")
            else:
                print("\n✗ Window activation failed")
        
        elif command == "find":
            window_name = sys.argv[2] if len(sys.argv) > 2 else "number24"
            find_specific_chat_box(window_name)
        
        elif command == "ask":
            if len(sys.argv) > 2:
                question = " ".join(sys.argv[2:])
                automate_chat_interaction(question)
            else:
                print("Usage: python chat_automation.py ask <your question>")
        
        elif command == "multi":
            demo_multi_question()
        
        elif command == "interactive":
            interactive_chat()
        
        else:
            print("Unknown command. Available commands:")
            print("  test        - Run quick test")
            print("  mouse       - Get current mouse position")
            print("  window      - Test window activation (e.g., window number24)")
            print("  find        - Find chat input box location (activates window first)")
            print("  ask         - Ask a single question (activates window first)")
            print("  multi       - Ask multiple demo questions")
            print("  interactive - Interactive chat mode")
    
    else:
        print("Chat Automation Tool")
        print("=" * 60)
        print("\nUsage:")
        print("  python chat_automation.py test")
        print("  python chat_automation.py mouse")
        print("  python chat_automation.py window [window_name]")
        print("  python chat_automation.py find [window_name]")
        print("  python chat_automation.py ask What is Python?")
        print("  python chat_automation.py multi")
        print("  python chat_automation.py interactive")
        print("\nExamples:")
        print('  python chat_automation.py mouse  # Get mouse position')
        print('  python chat_automation.py window number24')
        print('  python chat_automation.py find number24')
        print('  python chat_automation.py ask "What is machine learning?"')
        print("\n" + "=" * 60)
        
        # Run a demo
        print("\nRunning demo with sample question...\n")
        automate_chat_interaction("What is Python used for?", wait_time=10)
