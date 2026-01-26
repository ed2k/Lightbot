"""Core game simulation engine for LightBot."""

from __future__ import annotations
from copy import deepcopy
from typing import Optional

from .levels import (
    LEVELS, TILE_LIGHT, TILE_ELEVATOR, TILE_BASIC,
    DIR_SE, DIR_NE, DIR_NW, DIR_SW, DIRECTION_DELTAS, DIRECTION_NAMES
)
from .instructions import Instruction


class LightBotEngine:
    """Game engine that simulates LightBot game logic.

    The engine maintains the state of the bot (position, direction) and the map
    (light states, elevator heights). It can execute instructions and check
    for win conditions.
    """

    def __init__(self, level_index: int):
        """Initialize engine with a specific level.

        Args:
            level_index: Index of the level to load (0-9 for initial scope)
        """
        if level_index < 0 or level_index >= len(LEVELS):
            raise ValueError(f"Invalid level index: {level_index}")

        self.level_index = level_index
        self.level = LEVELS[level_index]
        self._init_from_level()

    def _init_from_level(self):
        """Initialize state from level data.

        The JS implementation transforms the map during loading:
        - File format: map[row][column]
        - JS mapRef[column][mapLength - row - 1] = map_file[row][column]

        This flips the row order and swaps the dimensions so that:
        - X = column index (0 to width-1)
        - Y = inverted row index (0 to height-1)

        We apply the same transformation here for consistency.
        """
        # Bot state
        self.bot_x, self.bot_y = self.level["position"]
        self.bot_dir = self.level["direction"]

        # Original file dimensions
        file_map = self.level["map"]
        num_rows = len(file_map)
        num_cols = len(file_map[0]) if num_rows > 0 else 0

        # Map dimensions after transformation (matching JS)
        # JS: levelSize.x = maps[x].map[0].length (columns)
        # JS: levelSize.y = maps[x].map.length (rows)
        self.map_width = num_cols   # X dimension = columns
        self.map_height = num_rows  # Y dimension = rows

        # Transform map data like JS does:
        # mapRef[j][mapLength - i - 1] = map_file[i][j]
        # where i = row index, j = column index
        self.map_data = [[None for _ in range(num_rows)] for _ in range(num_cols)]
        for i in range(num_rows):      # row index in file
            for j in range(num_cols):  # column index in file
                # Copy tile data to transformed position
                self.map_data[j][num_rows - i - 1] = deepcopy(file_map[i][j])

        # Track light positions and states
        self.light_positions: list[tuple[int, int]] = []
        self.lights_on: set[tuple[int, int]] = set()

        # Track elevator positions and heights
        self.elevator_positions: list[tuple[int, int]] = []
        self.elevator_heights: dict[tuple[int, int], int] = {}

        # Scan transformed map for lights and elevators
        for x in range(self.map_width):
            for y in range(self.map_height):
                tile = self.map_data[x][y]
                if tile["t"] == TILE_LIGHT:
                    self.light_positions.append((x, y))
                elif tile["t"] == TILE_ELEVATOR:
                    self.elevator_positions.append((x, y))
                    self.elevator_heights[(x, y)] = tile["h"]

    def reset(self):
        """Reset engine to initial state."""
        self._init_from_level()

    def clone(self) -> LightBotEngine:
        """Create a deep copy of the engine for search branching.

        Returns:
            A new LightBotEngine with identical state.
        """
        new_engine = LightBotEngine.__new__(LightBotEngine)
        new_engine.level_index = self.level_index
        new_engine.level = self.level

        new_engine.bot_x = self.bot_x
        new_engine.bot_y = self.bot_y
        new_engine.bot_dir = self.bot_dir

        new_engine.map_width = self.map_width
        new_engine.map_height = self.map_height
        new_engine.map_data = deepcopy(self.map_data)

        new_engine.light_positions = list(self.light_positions)
        new_engine.lights_on = set(self.lights_on)

        new_engine.elevator_positions = list(self.elevator_positions)
        new_engine.elevator_heights = dict(self.elevator_heights)

        return new_engine

    def get_current_height(self) -> int:
        """Get the height of the tile the bot is standing on."""
        return self.map_data[self.bot_x][self.bot_y]["h"]

    def get_tile_height(self, x: int, y: int) -> int:
        """Get the height of a tile at the given position."""
        if 0 <= x < self.map_width and 0 <= y < self.map_height:
            return self.map_data[x][y]["h"]
        return -1  # Out of bounds

    def get_tile_type(self, x: int, y: int) -> str:
        """Get the type of a tile at the given position."""
        if 0 <= x < self.map_width and 0 <= y < self.map_height:
            return self.map_data[x][y]["t"]
        return ""

    def _get_target_position(self) -> tuple[int, int]:
        """Get the position the bot is facing."""
        dx, dy = DIRECTION_DELTAS[self.bot_dir]
        return self.bot_x + dx, self.bot_y + dy

    def _is_valid_position(self, x: int, y: int) -> bool:
        """Check if a position is within map bounds."""
        return 0 <= x < self.map_width and 0 <= y < self.map_height

    def step(self, instruction: int) -> bool:
        """Execute one instruction.

        Args:
            instruction: Instruction to execute (0-6)

        Returns:
            True if the instruction resulted in a state change (useful for optimization)
        """
        if instruction == Instruction.WALK:
            return self._walk()
        elif instruction == Instruction.JUMP:
            return self._jump()
        elif instruction == Instruction.LIGHT:
            return self._light()
        elif instruction == Instruction.TURN_LEFT:
            return self._turn_left()
        elif instruction == Instruction.TURN_RIGHT:
            return self._turn_right()
        elif instruction == Instruction.PROC1:
            # Procedures are handled at a higher level in solvers
            return False
        elif instruction == Instruction.PROC2:
            return False
        else:
            raise ValueError(f"Unknown instruction: {instruction}")

    def _walk(self) -> bool:
        """Walk forward if heights match. Returns True if moved."""
        target_x, target_y = self._get_target_position()

        if not self._is_valid_position(target_x, target_y):
            return False

        current_h = self.get_current_height()
        target_h = self.get_tile_height(target_x, target_y)

        if current_h == target_h:
            self.bot_x, self.bot_y = target_x, target_y
            return True

        return False

    def _jump(self) -> bool:
        """Jump forward if valid. Returns True if moved.

        Jump is valid if:
        - Target height == current height + 1 (jump up)
        - OR current height > target height (jump down)
        """
        target_x, target_y = self._get_target_position()

        if not self._is_valid_position(target_x, target_y):
            return False

        current_h = self.get_current_height()
        target_h = self.get_tile_height(target_x, target_y)

        # Can jump up by exactly 1, or jump down to any lower height
        if target_h - current_h == 1 or current_h > target_h:
            self.bot_x, self.bot_y = target_x, target_y
            return True

        return False

    def _light(self) -> bool:
        """Toggle light or operate elevator. Returns True if action taken."""
        pos = (self.bot_x, self.bot_y)
        tile_type = self.get_tile_type(self.bot_x, self.bot_y)

        if tile_type == TILE_LIGHT:
            # Toggle light
            if pos in self.lights_on:
                self.lights_on.remove(pos)
            else:
                self.lights_on.add(pos)
            return True

        elif tile_type == TILE_ELEVATOR:
            # Elevate: height = (height + 2) % 6
            old_height = self.map_data[self.bot_x][self.bot_y]["h"]
            new_height = (old_height + 2) % 6
            self.map_data[self.bot_x][self.bot_y]["h"] = new_height
            self.elevator_heights[pos] = new_height
            return True

        return False

    def _turn_left(self) -> bool:
        """Turn left (counter-clockwise). Always returns True."""
        self.bot_dir = (self.bot_dir + 1) % 4
        return True

    def _turn_right(self) -> bool:
        """Turn right (clockwise). Always returns True."""
        self.bot_dir = (self.bot_dir - 1) % 4
        return True

    def is_solved(self) -> bool:
        """Check if all lights are on.

        Returns:
            True if every light tile has been activated.
        """
        return len(self.lights_on) == len(self.light_positions)

    def get_state_hash(self) -> tuple:
        """Return a hashable state for deduplication.

        The state includes bot position, direction, light states, and elevator heights.

        Returns:
            A tuple that uniquely identifies the current game state.
        """
        # Sort lights_on for consistent hashing
        lights_tuple = tuple(sorted(self.lights_on))

        # Include elevator heights if there are elevators
        if self.elevator_heights:
            elevators_tuple = tuple(sorted(self.elevator_heights.items()))
            return (self.bot_x, self.bot_y, self.bot_dir, lights_tuple, elevators_tuple)

        return (self.bot_x, self.bot_y, self.bot_dir, lights_tuple)

    def get_light_count(self) -> tuple[int, int]:
        """Get current lights on vs total lights.

        Returns:
            Tuple of (lights_on, total_lights)
        """
        return len(self.lights_on), len(self.light_positions)

    def get_gold_threshold(self) -> int:
        """Get the gold medal instruction count threshold."""
        return self.level["medals"]["gold"]

    def __repr__(self) -> str:
        """String representation for debugging."""
        dir_name = DIRECTION_NAMES.get(self.bot_dir, "?")
        lights_on, total = self.get_light_count()
        return (f"LightBotEngine(level={self.level_index}, "
                f"pos=({self.bot_x},{self.bot_y}), dir={dir_name}, "
                f"lights={lights_on}/{total})")


def run_solution(level_index: int, instructions: list[int], verbose: bool = False) -> bool:
    """Run a solution on a level and return whether it solves.

    Args:
        level_index: Level to test
        instructions: List of instruction indices
        verbose: If True, print each step

    Returns:
        True if the solution solves the level
    """
    engine = LightBotEngine(level_index)

    if verbose:
        print(f"Starting: {engine}")

    for i, instr in enumerate(instructions):
        engine.step(instr)
        if verbose:
            from .instructions import instruction_to_str
            print(f"  Step {i+1}: {instruction_to_str(Instruction(instr))} -> {engine}")

    solved = engine.is_solved()
    if verbose:
        print(f"Solved: {solved}")

    return solved
