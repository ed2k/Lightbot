"""Abstract base class for LightBot solvers."""

from abc import ABC, abstractmethod
from typing import Optional

from lightbot.engine import LightBotEngine


class BaseSolver(ABC):
    """Abstract base class for solvers.

    Solvers find instruction sequences that solve a given level with
    the minimum number of instructions.
    """

    def __init__(self, engine: LightBotEngine):
        """Initialize solver with a game engine.

        Args:
            engine: LightBotEngine instance configured for the level to solve
        """
        self.engine = engine.clone()  # Work on a copy

    @abstractmethod
    def solve(self, max_instructions: int = 30) -> Optional[list[int]]:
        """Find a solution to the level.

        Args:
            max_instructions: Maximum number of instructions to try

        Returns:
            List of instruction indices that solve the level, or None if no
            solution found within the limit.
        """
        pass

    def get_level_index(self) -> int:
        """Get the index of the level being solved."""
        return self.engine.level_index
