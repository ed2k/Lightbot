# Chat Automation Guide

Automate interactions with chat interfaces - find input boxes, toggle chat mode, ask questions, and capture responses.

## Quick Start

### 1. Test if automation is working

```bash
python chat_automation.py test
```

This will verify that screen capture and OCR are working.

### 2. Find your chat input box (Optional)

```bash
python chat_automation.py find
```

Move your mouse over the chat input box and hold it there for 1 second. The script will output the coordinates.

### 3. Ask a single question

```bash
python chat_automation.py ask "What is Python?"
```

This will:
- Find the chat input box
- Toggle to chat mode if needed
- Type your question
- Submit it (press Enter)
- Wait 10 seconds
- Capture the response
- Save screenshot and text

### 4. Interactive mode

```bash
python chat_automation.py interactive
```

Keep asking questions one after another. Type 'quit' to exit.

### 5. Demo with multiple questions

```bash
python chat_automation.py multi
```

Runs a demo with 3 predefined questions.

## Output Files

The script creates:
- `chat_response.png` - Screenshot of the response
- `chat_response.txt` - Text extracted from response area

## Customization

### Change wait time for responses

Edit the `wait_time` parameter:

```python
automate_chat_interaction("Your question?", wait_time=15)  # Wait 15 seconds
```

### Adjust response capture region

The script captures the bottom 60% of screen. To adjust:

```python
# In chat_automation.py, line ~120
response_region = (
    0,  # left
    int(screen_size[1] * 0.3),  # top (30% down = capture 70%)
    screen_size[0],  # width
    int(screen_size[1] * 0.7)  # height (70% of screen)
)
```

### Add custom input box labels

If your chat interface has unique labels:

```python
# In chat_automation.py, add to input_labels list
input_labels = [
    "Type a message",
    "Your custom label here",  # Add this
    "Message",
]
```

## Examples

### Basic usage

```python
from chat_automation import automate_chat_interaction

# Ask a question
response = automate_chat_interaction("What is machine learning?")
print(response)
```

### Custom workflow

```python
from auto import ScreenAutomation

auto = ScreenAutomation()

# Find and click chat input
auto.click_on_text("Type a message")

# Type question
auto.type_text("Explain neural networks")

# Submit
auto.press_key("enter")

# Wait and capture
import time
time.sleep(10)
screenshot = auto.capture_screen()
auto.save_screenshot("response.png")
```

### Batch processing questions

```python
questions = [
    "What is AI?",
    "Explain deep learning",
    "What are transformers?"
]

for q in questions:
    print(f"\nAsking: {q}")
    response = automate_chat_interaction(q, wait_time=8)
    # Process response...
    time.sleep(3)  # Pause between questions
```

## Troubleshooting

### Can't find input box

Try these approaches:

1. **Find manually first:**
   ```bash
   python chat_automation.py find
   ```
   Then use those coordinates directly:
   ```python
   auto.move_and_click(x, y)  # Your coordinates
   ```

2. **Use visual search:**
   Take a screenshot and check what text is visible near the input box

3. **Click by region:**
   ```python
   # Click bottom-center where chat inputs usually are
   screen_size = auto.get_screen_size()
   auto.move_and_click(screen_size[0] // 2, screen_size[1] - 100)
   ```

### Chat mode not toggling

Manually click to enter chat mode, then run:
```bash
python chat_automation.py ask "Your question"
```

### Response not captured correctly

Adjust the response region or wait time:
```python
automate_chat_interaction("Question?", wait_time=20)  # Wait longer
```

### OCR not accurate

- Increase screen resolution
- Ensure text is not too small
- Save screenshot first and verify it's readable:
  ```python
  auto.save_screenshot("check.png")
  ```

## Advanced: Using with Specific Chat Apps

### Slack

```python
auto.click_on_text("Message")  # Find message input
auto.type_text("@bot_name your question")
auto.press_key("enter")
```

### Discord

```python
auto.click_on_text("Message #channel")
auto.type_text("!command your query")
auto.press_key("enter")
```

### Web Chat

```python
# Click input field by label
auto.find_and_type("Type your message", "Hello!")
auto.press_key("enter")
```

## Integration Example

### Use in automation script

```python
#!/usr/bin/env python3
from chat_automation import automate_chat_interaction
import time

# List of questions to ask
questions_file = "questions.txt"

with open(questions_file, 'r') as f:
    questions = [line.strip() for line in f if line.strip()]

# Process each question
for i, question in enumerate(questions, 1):
    print(f"\n{'='*60}")
    print(f"Processing question {i}/{len(questions)}")
    print(f"Question: {question}")
    print('='*60)
    
    response = automate_chat_interaction(question, wait_time=10)
    
    # Save individual response
    with open(f"response_{i:03d}.txt", 'w') as f:
        f.write(f"Q: {question}\n\n")
        f.write(f"A: {response}\n")
    
    # Wait between questions to avoid rate limiting
    if i < len(questions):
        time.sleep(5)

print("\nAll questions processed!")
```

## Tips

1. **Test first:** Always run `test` command to verify automation works
2. **Adjust timing:** Increase `wait_time` for complex questions
3. **Manual positioning:** Use `find` command to get exact coordinates
4. **Save screenshots:** Always save screenshots to verify what was captured
5. **Error handling:** The script continues even if some elements aren't found

## Safety

- **Fail-safe**: Move mouse to top-left corner to abort
- **Review output**: Always check `chat_response.txt` for accuracy
- **Rate limiting**: Add delays between multiple questions
- **Privacy**: Be careful with sensitive data in screenshots

## Next Steps

- Customize for your specific chat interface
- Add error handling for your use case
- Integrate with other automation workflows
- Save responses to database or structured format
