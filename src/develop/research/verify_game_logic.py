#!/usr/bin/env python3
"""
Verification program to compare Python LightBot implementation against JS reference.

The JS implementation transforms the map data during loading:
  - mapRef[j][mapLength - i - 1] = map_file[i][j]
  - This flips the row order

After fixing the Python implementation, both should produce identical results.
"""

import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from lightbot.levels import LEVELS, DIRECTION_DELTAS, DIR_SE, DIR_NE, DIR_NW, DIR_SW
from lightbot.engine import LightBotEngine
from lightbot.instructions import Instruction


def load_js_level_data(level_index: int) -> dict:
    """Load level data and transform it like the JS implementation does.

    JS transformation (from lightbot.model.map.js lines 71-91):
    - levelSize.x = maps[x].map[0].length  (columns)
    - levelSize.y = maps[x].map.length     (rows)
    - mapRef[j][maps[x].map.length - i - 1] = maps[x].map[i][j]

    This means:
    - The file's map is stored as map[row][column]
    - JS transforms to mapRef[column][inverted_row]
    - Width = number of columns, Height = number of rows
    """
    level = LEVELS[level_index]
    file_map = level["map"]

    num_rows = len(file_map)
    num_cols = len(file_map[0]) if num_rows > 0 else 0

    # Create transformed map: js_map[x][y] where x=column, y=inverted_row
    js_map = [[None for _ in range(num_rows)] for _ in range(num_cols)]

    for i in range(num_rows):  # row index in file
        for j in range(num_cols):  # column index in file
            # mapRef[j][mapLength - i - 1] = map[i][j]
            js_map[j][num_rows - i - 1] = file_map[i][j]

    return {
        "width": num_cols,  # x dimension
        "height": num_rows,  # y dimension
        "map": js_map,
        "position": level["position"],
        "direction": level["direction"],
        "medals": level["medals"]
    }


def get_python_engine_state(level_index: int) -> dict:
    """Get level data as Python engine has transformed it."""
    engine = LightBotEngine(level_index)

    return {
        "width": engine.map_width,
        "height": engine.map_height,
        "position": (engine.bot_x, engine.bot_y),
        "direction": engine.bot_dir,
        "lights": engine.light_positions,
        "map": engine.map_data
    }


def find_lights(map_data: list, width: int, height: int) -> list:
    """Find all light positions in the map."""
    lights = []
    for x in range(width):
        for y in range(height):
            if map_data[x][y]["t"] == "l":
                lights.append((x, y))
    return lights


def trace_solution_js(level_index: int, instructions: list) -> dict:
    """Trace a solution using JS-style map transformation."""
    level = load_js_level_data(level_index)
    x, y = level["position"]
    direction = level["direction"]
    map_data = level["map"]
    width = level["width"]
    height = level["height"]

    lights = find_lights(map_data, width, height)
    lights_on = set()

    trace = [{
        "step": 0,
        "instruction": "START",
        "pos": (x, y),
        "direction": direction,
        "lights_on": list(lights_on)
    }]

    for i, instr in enumerate(instructions):
        if instr == "walk":
            dx, dy = DIRECTION_DELTAS[direction]
            target_x, target_y = x + dx, y + dy
            if 0 <= target_x < width and 0 <= target_y < height:
                if map_data[x][y]["h"] == map_data[target_x][target_y]["h"]:
                    x, y = target_x, target_y
        elif instr == "light":
            pos = (x, y)
            if map_data[x][y]["t"] == "l":
                if pos in lights_on:
                    lights_on.remove(pos)
                else:
                    lights_on.add(pos)
        elif instr == "turn_left":
            direction = (direction + 1) % 4
        elif instr == "turn_right":
            direction = (direction - 1) % 4
        elif instr == "jump":
            dx, dy = DIRECTION_DELTAS[direction]
            target_x, target_y = x + dx, y + dy
            if 0 <= target_x < width and 0 <= target_y < height:
                current_h = map_data[x][y]["h"]
                target_h = map_data[target_x][target_y]["h"]
                if target_h - current_h == 1 or current_h > target_h:
                    x, y = target_x, target_y

        trace.append({
            "step": i + 1,
            "instruction": instr,
            "pos": (x, y),
            "direction": direction,
            "lights_on": list(lights_on)
        })

    return {
        "trace": trace,
        "solved": len(lights_on) == len(lights),
        "lights": lights,
        "final_pos": (x, y)
    }


def trace_solution_python(level_index: int, instructions: list) -> dict:
    """Trace a solution using Python engine."""
    engine = LightBotEngine(level_index)

    instr_map = {
        "walk": Instruction.WALK,
        "light": Instruction.LIGHT,
        "turn_left": Instruction.TURN_LEFT,
        "turn_right": Instruction.TURN_RIGHT,
        "jump": Instruction.JUMP
    }

    trace = [{
        "step": 0,
        "instruction": "START",
        "pos": (engine.bot_x, engine.bot_y),
        "direction": engine.bot_dir,
        "lights_on": list(engine.lights_on)
    }]

    for i, instr in enumerate(instructions):
        engine.step(instr_map[instr])
        trace.append({
            "step": i + 1,
            "instruction": instr,
            "pos": (engine.bot_x, engine.bot_y),
            "direction": engine.bot_dir,
            "lights_on": list(engine.lights_on)
        })

    return {
        "trace": trace,
        "solved": engine.is_solved(),
        "lights": engine.light_positions,
        "final_pos": (engine.bot_x, engine.bot_y)
    }


def compare_level(level_index: int) -> dict:
    """Compare JS and Python interpretation of a level."""
    js_level = load_js_level_data(level_index)
    py_state = get_python_engine_state(level_index)

    js_lights = find_lights(js_level["map"], js_level["width"], js_level["height"])

    differences = []

    if js_level["width"] != py_state["width"]:
        differences.append(f"Width mismatch: JS={js_level['width']}, Python={py_state['width']}")
    if js_level["height"] != py_state["height"]:
        differences.append(f"Height mismatch: JS={js_level['height']}, Python={py_state['height']}")
    if sorted(js_lights) != sorted(py_state["lights"]):
        differences.append(f"Light positions mismatch: JS={sorted(js_lights)}, Python={sorted(py_state['lights'])}")

    return {
        "level": level_index,
        "js": {
            "width": js_level["width"],
            "height": js_level["height"],
            "position": js_level["position"],
            "lights": js_lights
        },
        "python": {
            "width": py_state["width"],
            "height": py_state["height"],
            "position": py_state["position"],
            "lights": py_state["lights"]
        },
        "differences": differences
    }


def verify_level_0():
    """Detailed verification of level 0 (the example mentioned by user)."""
    print("=" * 60)
    print("LEVEL 0 VERIFICATION")
    print("=" * 60)

    # Compare level data
    comparison = compare_level(0)

    print("\n--- Level Data Comparison ---")
    print(f"JS:     width={comparison['js']['width']}, height={comparison['js']['height']}")
    print(f"Python: width={comparison['python']['width']}, height={comparison['python']['height']}")
    print(f"JS lights at:     {comparison['js']['lights']}")
    print(f"Python lights at: {comparison['python']['lights']}")
    print(f"Starting position: {comparison['js']['position']}")

    if comparison['differences']:
        print("\n!!! DIFFERENCES FOUND !!!")
        for diff in comparison['differences']:
            print(f"  - {diff}")
    else:
        print("\n✓ Level data matches!")

    # Test solutions
    print("\n--- Solution Traces ---")

    # Test walk, light (should NOT solve)
    print("\n1) Testing [walk, light] (2 steps - should NOT solve):")
    js_result = trace_solution_js(0, ["walk", "light"])
    py_result = trace_solution_python(0, ["walk", "light"])

    print("  JS trace:")
    for step in js_result["trace"]:
        print(f"    {step}")
    print(f"  JS solved: {js_result['solved']}")

    print("  Python trace:")
    for step in py_result["trace"]:
        print(f"    {step}")
    print(f"  Python solved: {py_result['solved']}")

    match_2 = (js_result['solved'] == py_result['solved'] and
               js_result['trace'] == py_result['trace'])
    print(f"  Match: {'✓' if match_2 else '✗'}")

    # Test walk, walk, light (correct solution)
    print("\n2) Testing [walk, walk, light] (3 steps - correct solution):")
    js_result = trace_solution_js(0, ["walk", "walk", "light"])
    py_result = trace_solution_python(0, ["walk", "walk", "light"])

    print("  JS trace:")
    for step in js_result["trace"]:
        print(f"    {step}")
    print(f"  JS solved: {js_result['solved']}")

    print("  Python trace:")
    for step in py_result["trace"]:
        print(f"    {step}")
    print(f"  Python solved: {py_result['solved']}")

    match_3 = (js_result['solved'] == py_result['solved'] and
               js_result['trace'] == py_result['trace'])
    print(f"  Match: {'✓' if match_3 else '✗'}")

    return comparison, match_2 and match_3


def test_known_solutions():
    """Test known solutions for various levels."""
    print("\n" + "=" * 60)
    print("TESTING KNOWN SOLUTIONS")
    print("=" * 60)

    # Known optimal solutions (from gold medal requirements)
    test_cases = [
        # (level, instructions, expected_solve, description)
        (0, ["walk", "walk", "light"], True, "Level 0: walk x2, light (gold=3)"),
        (0, ["walk", "light"], False, "Level 0: walk, light - WRONG (only 2 steps)"),
        (0, ["walk", "walk", "walk", "light"], False, "Level 0: walk x3, light - overshoots"),
        (0, ["light"], False, "Level 0: light only - not on light tile"),
    ]

    all_passed = True
    for level, instructions, expected, desc in test_cases:
        js_result = trace_solution_js(level, instructions)
        py_result = trace_solution_python(level, instructions)

        js_match = js_result['solved'] == expected
        py_match = py_result['solved'] == expected
        traces_match = js_result['trace'] == py_result['trace']

        status = "✓" if (js_match and py_match and traces_match) else "✗"
        print(f"\n{status} {desc}")
        print(f"    Instructions: {instructions}")
        print(f"    Expected: {expected}, JS: {js_result['solved']}, Python: {py_result['solved']}")
        print(f"    Traces match: {traces_match}")

        if not (js_match and py_match and traces_match):
            all_passed = False
            if not traces_match:
                print("    JS trace:", js_result['trace'][-1])
                print("    Py trace:", py_result['trace'][-1])

    return all_passed


def verify_all_levels():
    """Verify all levels and identify discrepancies."""
    print("\n" + "=" * 60)
    print("VERIFYING ALL LEVELS (map data comparison)")
    print("=" * 60)

    results = []
    all_match = True

    for i in range(len(LEVELS)):
        comparison = compare_level(i)
        results.append(comparison)

        status = "✓" if not comparison['differences'] else "✗"
        print(f"Level {i}: {status}")
        if comparison['differences']:
            all_match = False
            for diff in comparison['differences']:
                print(f"  - {diff}")

    return results, all_match


def run_random_tests(num_tests: int = 50):
    """Run random instruction sequences and verify JS/Python match."""
    import random
    print("\n" + "=" * 60)
    print(f"RANDOM INSTRUCTION TESTS ({num_tests} tests)")
    print("=" * 60)

    instructions_pool = ["walk", "jump", "light", "turn_left", "turn_right"]
    mismatches = 0

    for test_num in range(num_tests):
        level = random.randint(0, len(LEVELS) - 1)
        seq_len = random.randint(1, 15)
        instructions = [random.choice(instructions_pool) for _ in range(seq_len)]

        js_result = trace_solution_js(level, instructions)
        py_result = trace_solution_python(level, instructions)

        if js_result['trace'] != py_result['trace']:
            mismatches += 1
            print(f"\n✗ Test {test_num}: Level {level}")
            print(f"  Instructions: {instructions}")
            print(f"  JS final: {js_result['trace'][-1]}")
            print(f"  Py final: {py_result['trace'][-1]}")

    print(f"\nResults: {num_tests - mismatches}/{num_tests} tests passed")
    return mismatches == 0


if __name__ == "__main__":
    print("LightBot Game Logic Verification")
    print("Comparing Python implementation against JS reference")
    print()

    # Detailed level 0 verification
    comparison, level0_ok = verify_level_0()

    # Verify all level data
    results, all_levels_ok = verify_all_levels()

    # Test known solutions
    solutions_ok = test_known_solutions()

    # Random testing
    random_ok = run_random_tests(100)

    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(f"Level data match:     {'✓ PASS' if all_levels_ok else '✗ FAIL'}")
    print(f"Level 0 traces match: {'✓ PASS' if level0_ok else '✗ FAIL'}")
    print(f"Known solutions:      {'✓ PASS' if solutions_ok else '✗ FAIL'}")
    print(f"Random tests:         {'✓ PASS' if random_ok else '✗ FAIL'}")

    if all_levels_ok and level0_ok and solutions_ok and random_ok:
        print("\n✓ ALL TESTS PASSED - Python matches JS game logic!")
        sys.exit(0)
    else:
        print("\n✗ SOME TESTS FAILED - See details above")
        sys.exit(1)
