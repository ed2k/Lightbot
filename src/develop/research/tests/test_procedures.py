"""Tests for procedure execution and solving."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import pytest
except ImportError:
    pytest = None

from lightbot.engine import LightBotEngine
from lightbot.executor import Program, ProgramExecutor
from lightbot.instructions import Instruction
from solvers.fast_procedure_solver import FastProcedureSolver


class TestProgramExecutor:
    """Test program execution with procedures."""

    def test_simple_program(self):
        """Execute a simple program without procedures."""
        engine = LightBotEngine(0)
        executor = ProgramExecutor(engine)

        program = Program(
            main=[Instruction.WALK, Instruction.LIGHT],
            proc1=[],
            proc2=[]
        )

        solved, steps = executor.execute(program)
        assert solved is True
        assert steps == 2

    def test_program_with_proc1(self):
        """Execute a program that calls PROC1."""
        engine = LightBotEngine(0)
        executor = ProgramExecutor(engine)

        program = Program(
            main=[Instruction.PROC1],
            proc1=[Instruction.WALK, Instruction.LIGHT],
            proc2=[]
        )

        solved, steps = executor.execute(program)
        assert solved is True
        assert steps == 3  # proc1 call + walk + light

    def test_recursive_proc(self):
        """Execute a recursive procedure."""
        # Level 4 can be solved with recursive proc
        engine = LightBotEngine(4)
        executor = ProgramExecutor(engine, max_steps=50)

        program = Program(
            main=[Instruction.PROC1],
            proc1=[Instruction.WALK, Instruction.LIGHT, Instruction.PROC1],
            proc2=[]
        )

        solved, steps = executor.execute(program)
        assert solved is True

    def test_infinite_loop_prevention(self):
        """Ensure infinite loops are stopped."""
        engine = LightBotEngine(0)
        executor = ProgramExecutor(engine, max_steps=10)

        # Program that does nothing useful but loops
        program = Program(
            main=[Instruction.PROC1],
            proc1=[Instruction.TURN_LEFT, Instruction.PROC1],
            proc2=[]
        )

        solved, steps = executor.execute(program)
        assert solved is False
        assert steps == 10  # Hit max_steps limit

    def test_program_total_size(self):
        """Test program size calculation."""
        program = Program(
            main=[Instruction.WALK, Instruction.PROC1],
            proc1=[Instruction.LIGHT],
            proc2=[Instruction.JUMP, Instruction.TURN_LEFT]
        )

        assert program.total_size() == 5


class TestFastProcedureSolver:
    """Test the fast procedure solver."""

    def test_solve_level_0(self):
        """Solve level 0 (simple, no procedures needed)."""
        engine = LightBotEngine(0)
        solver = FastProcedureSolver(engine)

        program = solver.solve(max_size=5)

        assert program is not None
        assert program.total_size() <= 3  # Gold threshold

        # Verify solution
        executor = ProgramExecutor(LightBotEngine(0))
        solved, _ = executor.execute(program)
        assert solved is True

    def test_solve_level_4_with_procedures(self):
        """Solve level 4 using procedures."""
        engine = LightBotEngine(4)
        solver = FastProcedureSolver(engine)

        program = solver.solve(max_size=6)

        assert program is not None
        # Level 4 can be solved with 4 instructions using procedures
        # (better than gold threshold of 7)

        # Verify solution
        executor = ProgramExecutor(LightBotEngine(4))
        solved, _ = executor.execute(program)
        assert solved is True

    def test_solve_with_stats(self):
        """Test solver returns statistics."""
        engine = LightBotEngine(0)
        solver = FastProcedureSolver(engine)

        program, stats = solver.solve_with_stats(max_size=5)

        assert program is not None
        assert "programs_tested" in stats
        assert stats["programs_tested"] > 0


class TestManualSolutions:
    """Test manually constructed solutions for verification."""

    def test_level_0_walk_light(self):
        """Level 0: walk, light."""
        program = Program(
            main=[Instruction.WALK, Instruction.LIGHT],
            proc1=[],
            proc2=[]
        )

        executor = ProgramExecutor(LightBotEngine(0))
        solved, _ = executor.execute(program)
        assert solved is True
        assert program.total_size() == 2

    def test_level_4_recursive(self):
        """Level 4: recursive walk-light pattern."""
        program = Program(
            main=[Instruction.PROC1],
            proc1=[Instruction.WALK, Instruction.LIGHT, Instruction.PROC1],
            proc2=[]
        )

        executor = ProgramExecutor(LightBotEngine(4), max_steps=50)
        solved, _ = executor.execute(program)
        assert solved is True
        assert program.total_size() == 4


if __name__ == "__main__":
    if pytest:
        pytest.main([__file__, "-v"])
    else:
        print("pytest not installed, run tests manually")
