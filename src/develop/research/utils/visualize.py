"""Visualization utilities for LightBot solutions."""

from lightbot.engine import LightBotEngine
from lightbot.instructions import Instruction, instruction_to_str, instructions_to_str
from lightbot.levels import DIRECTION_NAMES


def visualize_solution(level_index: int, instructions: list[int]) -> str:
    """Generate a text visualization of a solution being executed.

    Args:
        level_index: Level to visualize
        instructions: List of instruction indices

    Returns:
        Multi-line string showing the solution execution
    """
    lines = []
    engine = LightBotEngine(level_index)

    lines.append(f"Level {level_index}: {len(instructions)} instructions")
    lines.append(f"Solution: {instructions_to_str(instructions)}")
    lines.append("")
    lines.append(f"Start: pos=({engine.bot_x},{engine.bot_y}), "
                 f"dir={DIRECTION_NAMES[engine.bot_dir]}, "
                 f"lights={engine.get_light_count()[0]}/{engine.get_light_count()[1]}")

    for i, instr in enumerate(instructions):
        engine.step(instr)
        instr_name = instruction_to_str(Instruction(instr))
        lights_on, total = engine.get_light_count()
        lines.append(f"  {i+1}. {instr_name:10} -> pos=({engine.bot_x},{engine.bot_y}), "
                    f"dir={DIRECTION_NAMES[engine.bot_dir]}, lights={lights_on}/{total}")

    lines.append("")
    if engine.is_solved():
        lines.append("SOLVED!")
    else:
        lights_on, total = engine.get_light_count()
        lines.append(f"NOT SOLVED (lights: {lights_on}/{total})")

    return "\n".join(lines)


def print_solution(level_index: int, instructions: list[int]) -> None:
    """Print a visualization of a solution being executed.

    Args:
        level_index: Level to visualize
        instructions: List of instruction indices
    """
    print(visualize_solution(level_index, instructions))


def render_map_ascii(engine: LightBotEngine) -> str:
    """Render the current map state as ASCII art.

    Args:
        engine: LightBotEngine with current state

    Returns:
        ASCII representation of the map
    """
    lines = []

    # Direction indicators
    dir_chars = {0: "v", 1: ">", 2: "^", 3: "<"}  # SE, NE, NW, SW

    # Render from top to bottom (y increasing), left to right (x increasing)
    for y in range(engine.map_height):
        row = []
        for x in range(engine.map_width):
            tile = engine.map_data[x][y]
            h = tile["h"]
            t = tile["t"]

            # Check if bot is here
            if x == engine.bot_x and y == engine.bot_y:
                char = dir_chars.get(engine.bot_dir, "?")
            elif t == "l":
                # Light tile
                if (x, y) in engine.lights_on:
                    char = "*"  # Lit
                else:
                    char = "o"  # Unlit
            elif t == "e":
                char = "E"  # Elevator
            else:
                char = str(h) if h < 10 else "+"

            row.append(char)
        lines.append(" ".join(row))

    return "\n".join(lines)
