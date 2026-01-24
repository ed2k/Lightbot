"""Unit tests for LightBot solvers."""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lightbot.engine import LightBotEngine, run_solution
from lightbot.levels import LEVELS
from solvers.bfs_solver import BFSSolver
from solvers.ids_solver import IDSSolver


class TestBFSSolver:
    """Test BFS solver."""

    def test_solve_level_0(self):
        """BFS finds optimal solution for level 0."""
        engine = LightBotEngine(0)
        solver = BFSSolver(engine)

        solution = solver.solve(max_instructions=10)

        assert solution is not None
        assert len(solution) == 3  # Gold threshold
        assert run_solution(0, solution) is True

    def test_solve_level_3(self):
        """BFS solves level 3 (requires jump)."""
        engine = LightBotEngine(3)
        solver = BFSSolver(engine)

        solution = solver.solve(max_instructions=10)

        assert solution is not None
        assert len(solution) <= engine.get_gold_threshold()
        assert run_solution(3, solution) is True

    def test_solve_with_stats(self):
        """BFS returns meaningful statistics."""
        engine = LightBotEngine(0)
        solver = BFSSolver(engine)

        solution, stats = solver.solve_with_stats(max_instructions=10)

        assert solution is not None
        assert stats["states_explored"] > 0
        assert stats["max_depth_reached"] >= len(solution) - 1


class TestIDSSolver:
    """Test IDS solver."""

    def test_solve_level_0(self):
        """IDS finds optimal solution for level 0."""
        engine = LightBotEngine(0)
        solver = IDSSolver(engine)

        solution = solver.solve(max_depth=10)

        assert solution is not None
        assert len(solution) == 3  # Gold threshold
        assert run_solution(0, solution) is True

    def test_solve_level_3(self):
        """IDS solves level 3 (requires jump)."""
        engine = LightBotEngine(3)
        solver = IDSSolver(engine)

        solution = solver.solve(max_depth=10)

        assert solution is not None
        assert len(solution) <= engine.get_gold_threshold()
        assert run_solution(3, solution) is True

    def test_solve_with_stats(self):
        """IDS returns meaningful statistics."""
        engine = LightBotEngine(0)
        solver = IDSSolver(engine)

        solution, stats = solver.solve_with_stats(max_depth=10)

        assert solution is not None
        assert stats["depths_searched"] == len(solution)
        assert stats["total_states_explored"] > 0


class TestSolverConsistency:
    """Test that BFS and IDS produce equivalent results."""

    @pytest.mark.parametrize("level", [0, 3])
    def test_same_solution_length(self, level):
        """BFS and IDS find solutions of the same length."""
        engine = LightBotEngine(level)

        bfs_solver = BFSSolver(engine)
        ids_solver = IDSSolver(engine)

        bfs_solution = bfs_solver.solve(max_instructions=15)
        ids_solution = ids_solver.solve(max_depth=15)

        assert bfs_solution is not None
        assert ids_solution is not None
        assert len(bfs_solution) == len(ids_solution)


class TestGoldMedalValidation:
    """Validate that solvers can match or beat gold medal thresholds."""

    @pytest.mark.parametrize("level", [0, 1, 3])
    def test_bfs_meets_gold(self, level):
        """BFS solution meets gold threshold for simple levels."""
        engine = LightBotEngine(level)
        gold = engine.get_gold_threshold()
        solver = BFSSolver(engine)

        solution = solver.solve(max_instructions=gold + 5)

        if solution is not None:
            assert len(solution) <= gold, (
                f"Level {level}: Found {len(solution)} instructions, "
                f"gold threshold is {gold}"
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
