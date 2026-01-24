"""Iterative Deepening Search solver for LightBot.

IDS combines the space efficiency of DFS with the optimality guarantee of BFS.
It's particularly useful when the solution depth is unknown.
"""

from typing import Optional, Set

from lightbot.engine import LightBotEngine
from lightbot.instructions import Instruction
from .base_solver import BaseSolver


class IDSSolver(BaseSolver):
    """Iterative Deepening Search solver.

    Performs depth-limited DFS with increasing depth limits until a solution
    is found. Guarantees finding the shortest solution while using less
    memory than BFS.
    """

    # Basic instructions for search (no procedures)
    BASIC_INSTRUCTIONS = [
        Instruction.WALK,
        Instruction.JUMP,
        Instruction.LIGHT,
        Instruction.TURN_LEFT,
        Instruction.TURN_RIGHT,
    ]

    def solve(self, max_depth: int = 30) -> Optional[list[int]]:
        """Find minimum-instruction solution using iterative deepening.

        Args:
            max_depth: Maximum depth to search

        Returns:
            List of instruction indices, or None if no solution found
        """
        for depth in range(1, max_depth + 1):
            visited: Set[tuple] = set()
            result = self._dfs([], self.engine.clone(), depth, visited)
            if result is not None:
                return result
        return None

    def _dfs(
        self,
        path: list[int],
        state: LightBotEngine,
        remaining: int,
        visited: Set[tuple]
    ) -> Optional[list[int]]:
        """Depth-limited depth-first search.

        Args:
            path: Instructions so far
            state: Current game state
            remaining: Remaining depth to search
            visited: Set of visited state hashes (for this depth iteration)

        Returns:
            Solution path or None
        """
        # Check if already solved
        if state.is_solved():
            return path

        # Check depth limit
        if remaining == 0:
            return None

        # Check for cycles within this depth iteration
        state_hash = state.get_state_hash()
        if state_hash in visited:
            return None
        visited.add(state_hash)

        # Try each instruction
        for instr in self.BASIC_INSTRUCTIONS:
            new_state = state.clone()
            new_state.step(instr)

            result = self._dfs(path + [instr], new_state, remaining - 1, visited)
            if result is not None:
                return result

        # Remove from visited to allow other paths through this state
        # (important for IDS to work correctly across different depths)
        visited.discard(state_hash)

        return None

    def solve_with_stats(self, max_depth: int = 30) -> tuple[Optional[list[int]], dict]:
        """Find solution and return statistics about the search.

        Args:
            max_depth: Maximum depth to search

        Returns:
            Tuple of (solution, stats_dict)
        """
        stats = {
            "depths_searched": 0,
            "total_states_explored": 0,
            "states_per_depth": [],
        }

        for depth in range(1, max_depth + 1):
            stats["depths_searched"] = depth
            visited: Set[tuple] = set()
            states_this_depth = [0]  # Use list for mutable reference

            result = self._dfs_with_stats(
                [], self.engine.clone(), depth, visited, states_this_depth
            )

            stats["states_per_depth"].append(states_this_depth[0])
            stats["total_states_explored"] += states_this_depth[0]

            if result is not None:
                return result, stats

        return None, stats

    def _dfs_with_stats(
        self,
        path: list[int],
        state: LightBotEngine,
        remaining: int,
        visited: Set[tuple],
        states_count: list[int]
    ) -> Optional[list[int]]:
        """DFS with statistics tracking."""
        states_count[0] += 1

        if state.is_solved():
            return path

        if remaining == 0:
            return None

        state_hash = state.get_state_hash()
        if state_hash in visited:
            return None
        visited.add(state_hash)

        for instr in self.BASIC_INSTRUCTIONS:
            new_state = state.clone()
            new_state.step(instr)

            result = self._dfs_with_stats(
                path + [instr], new_state, remaining - 1, visited, states_count
            )
            if result is not None:
                return result

        visited.discard(state_hash)
        return None
