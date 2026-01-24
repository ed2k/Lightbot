"""Breadth-first search solver for LightBot.

BFS finds the shortest instruction sequence (optimal solution) for levels
that don't require procedures.
"""

from collections import deque
from typing import Optional

from lightbot.engine import LightBotEngine
from lightbot.instructions import Instruction
from .base_solver import BaseSolver


class BFSSolver(BaseSolver):
    """Breadth-first search solver.

    Explores all possible instruction sequences in order of length,
    guaranteeing the first solution found is optimal (minimum instructions).

    Note: This solver only uses basic instructions (walk, jump, light, turnL, turnR),
    not procedures. For procedure-based solutions, use a different solver.
    """

    # Basic instructions for search (no procedures)
    BASIC_INSTRUCTIONS = [
        Instruction.WALK,
        Instruction.JUMP,
        Instruction.LIGHT,
        Instruction.TURN_LEFT,
        Instruction.TURN_RIGHT,
    ]

    def solve(self, max_instructions: int = 30) -> Optional[list[int]]:
        """Find shortest instruction sequence to solve the level.

        Args:
            max_instructions: Maximum number of instructions to search

        Returns:
            List of instruction indices, or None if no solution found
        """
        # Queue entries: (instruction_list, engine_state)
        queue: deque[tuple[list[int], LightBotEngine]] = deque()
        queue.append(([], self.engine.clone()))

        # Track visited states to avoid cycles
        visited: set[tuple] = {self.engine.get_state_hash()}

        while queue:
            instructions, state = queue.popleft()

            # Stop if we've reached max depth
            if len(instructions) >= max_instructions:
                continue

            # Try each basic instruction
            for instr in self.BASIC_INSTRUCTIONS:
                new_state = state.clone()
                new_state.step(instr)

                # Check if solved
                if new_state.is_solved():
                    return instructions + [instr]

                # Check if this state has been visited
                state_hash = new_state.get_state_hash()
                if state_hash not in visited:
                    visited.add(state_hash)
                    queue.append((instructions + [instr], new_state))

        return None

    def solve_with_stats(self, max_instructions: int = 30) -> tuple[Optional[list[int]], dict]:
        """Find solution and return statistics about the search.

        Args:
            max_instructions: Maximum number of instructions to search

        Returns:
            Tuple of (solution, stats_dict)
        """
        stats = {
            "states_explored": 0,
            "max_depth_reached": 0,
            "states_pruned": 0,
        }

        queue: deque[tuple[list[int], LightBotEngine]] = deque()
        queue.append(([], self.engine.clone()))
        visited: set[tuple] = {self.engine.get_state_hash()}

        while queue:
            instructions, state = queue.popleft()
            stats["states_explored"] += 1
            stats["max_depth_reached"] = max(stats["max_depth_reached"], len(instructions))

            if len(instructions) >= max_instructions:
                continue

            for instr in self.BASIC_INSTRUCTIONS:
                new_state = state.clone()
                new_state.step(instr)

                if new_state.is_solved():
                    return instructions + [instr], stats

                state_hash = new_state.get_state_hash()
                if state_hash not in visited:
                    visited.add(state_hash)
                    queue.append((instructions + [instr], new_state))
                else:
                    stats["states_pruned"] += 1

        return None, stats
