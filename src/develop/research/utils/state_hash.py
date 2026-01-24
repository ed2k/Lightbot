"""State hashing utilities for efficient state deduplication."""

from typing import FrozenSet, Tuple


def create_state_hash(
    bot_x: int,
    bot_y: int,
    bot_dir: int,
    lights_on: set[tuple[int, int]],
    elevator_heights: dict[tuple[int, int], int] | None = None
) -> tuple:
    """Create a hashable state representation.

    Args:
        bot_x: Bot x position
        bot_y: Bot y position
        bot_dir: Bot direction (0-3)
        lights_on: Set of (x, y) positions of lit lights
        elevator_heights: Optional dict mapping (x, y) to current height

    Returns:
        Hashable tuple representing the state
    """
    lights_tuple = tuple(sorted(lights_on))

    if elevator_heights:
        elevators_tuple = tuple(sorted(elevator_heights.items()))
        return (bot_x, bot_y, bot_dir, lights_tuple, elevators_tuple)

    return (bot_x, bot_y, bot_dir, lights_tuple)


def state_to_string(state_hash: tuple) -> str:
    """Convert a state hash to a readable string.

    Args:
        state_hash: Tuple from create_state_hash or engine.get_state_hash()

    Returns:
        Human-readable string representation
    """
    if len(state_hash) == 4:
        bot_x, bot_y, bot_dir, lights = state_hash
        dir_names = {0: "SE", 1: "NE", 2: "NW", 3: "SW"}
        return f"Bot({bot_x},{bot_y},{dir_names.get(bot_dir, '?')}) Lights:{lights}"
    elif len(state_hash) == 5:
        bot_x, bot_y, bot_dir, lights, elevators = state_hash
        dir_names = {0: "SE", 1: "NE", 2: "NW", 3: "SW"}
        return (f"Bot({bot_x},{bot_y},{dir_names.get(bot_dir, '?')}) "
                f"Lights:{lights} Elevators:{elevators}")
    return str(state_hash)
