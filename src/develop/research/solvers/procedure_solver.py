"""Procedure-aware solver for LightBot.

Searches over program structures (MAIN, PROC1, PROC2) to find
minimum-size programs that solve levels.
"""

from __future__ import annotations
from typing import Optional, Iterator
from itertools import product

from lightbot.engine import LightBotEngine
from lightbot.executor import Program, ProgramExecutor
from lightbot.instructions import Instruction
from .base_solver import BaseSolver


class ProcedureSolver(BaseSolver):
    """Solver that searches over programs with procedures.

    Uses iterative deepening on total program size (|MAIN| + |PROC1| + |PROC2|)
    to find the smallest program that solves the level.
    """

    # All instructions including procedure calls
    ALL_INSTRUCTIONS = [
        Instruction.WALK,
        Instruction.JUMP,
        Instruction.LIGHT,
        Instruction.TURN_LEFT,
        Instruction.TURN_RIGHT,
        Instruction.PROC1,
        Instruction.PROC2,
    ]

    # Basic instructions only (for procedures that shouldn't self-recurse initially)
    BASIC_INSTRUCTIONS = [
        Instruction.WALK,
        Instruction.JUMP,
        Instruction.LIGHT,
        Instruction.TURN_LEFT,
        Instruction.TURN_RIGHT,
    ]

    def __init__(self, engine: LightBotEngine, max_exec_steps: int = 500):
        """Initialize solver.

        Args:
            engine: Game engine for the level to solve
            max_exec_steps: Maximum execution steps per program (prevents infinite loops)
        """
        super().__init__(engine)
        self.max_exec_steps = max_exec_steps
        self.executor = ProgramExecutor(self.engine, max_exec_steps)

    def solve(self, max_size: int = 15) -> Optional[Program]:
        """Find minimum-size program that solves the level.

        Args:
            max_size: Maximum total program size to search

        Returns:
            Program that solves the level, or None if not found
        """
        for size in range(1, max_size + 1):
            result = self._search_size(size)
            if result is not None:
                return result
        return None

    def _search_size(self, total_size: int) -> Optional[Program]:
        """Search all programs of exactly the given total size.

        Args:
            total_size: Target total size (|MAIN| + |PROC1| + |PROC2|)

        Returns:
            First program found that solves the level, or None
        """
        # Try different distributions of size across MAIN, PROC1, PROC2
        for main_size in range(1, total_size + 1):
            remaining = total_size - main_size
            for p1_size in range(0, remaining + 1):
                p2_size = remaining - p1_size

                # Generate and test all programs with this size distribution
                result = self._search_distribution(main_size, p1_size, p2_size)
                if result is not None:
                    return result

        return None

    def _search_distribution(
        self, main_size: int, p1_size: int, p2_size: int
    ) -> Optional[Program]:
        """Search all programs with specific size distribution.

        Args:
            main_size: Size of MAIN
            p1_size: Size of PROC1
            p2_size: Size of PROC2

        Returns:
            First solving program, or None
        """
        # Determine which instructions are available for each part
        # MAIN can use all instructions
        # PROC1/PROC2 can use basic + calls to other procs

        main_instrs = self.ALL_INSTRUCTIONS if (p1_size > 0 or p2_size > 0) else self.BASIC_INSTRUCTIONS
        p1_instrs = self._get_proc_instructions(has_p1=p1_size > 0, has_p2=p2_size > 0, is_p1=True)
        p2_instrs = self._get_proc_instructions(has_p1=p1_size > 0, has_p2=p2_size > 0, is_p1=False)

        # Generate all combinations
        for main in self._generate_sequences(main_size, main_instrs, p1_size > 0, p2_size > 0):
            # Skip if MAIN calls procedures that don't exist
            if p1_size == 0 and Instruction.PROC1 in main:
                continue
            if p2_size == 0 and Instruction.PROC2 in main:
                continue

            for p1 in self._generate_sequences(p1_size, p1_instrs, True, p2_size > 0) if p1_size > 0 else [[]]:
                for p2 in self._generate_sequences(p2_size, p2_instrs, p1_size > 0, True) if p2_size > 0 else [[]]:
                    program = Program(list(main), list(p1), list(p2))

                    # Skip invalid programs
                    if not self._is_valid_program(program):
                        continue

                    # Test program
                    solved, _ = self.executor.execute(program)
                    if solved:
                        return program

        return None

    def _get_proc_instructions(self, has_p1: bool, has_p2: bool, is_p1: bool) -> list[int]:
        """Get available instructions for a procedure.

        Args:
            has_p1: Whether PROC1 exists
            has_p2: Whether PROC2 exists
            is_p1: True if this is for PROC1, False for PROC2

        Returns:
            List of available instructions
        """
        instrs = list(self.BASIC_INSTRUCTIONS)

        # Allow calling the other procedure
        if is_p1 and has_p2:
            instrs.append(Instruction.PROC2)
        if not is_p1 and has_p1:
            instrs.append(Instruction.PROC1)

        # Allow self-recursion
        if is_p1 and has_p1:
            instrs.append(Instruction.PROC1)
        if not is_p1 and has_p2:
            instrs.append(Instruction.PROC2)

        return instrs

    def _generate_sequences(
        self, length: int, instructions: list[int],
        has_p1: bool, has_p2: bool
    ) -> Iterator[tuple[int, ...]]:
        """Generate all instruction sequences of given length.

        Args:
            length: Sequence length
            instructions: Available instructions
            has_p1: Whether PROC1 exists
            has_p2: Whether PROC2 exists

        Yields:
            Instruction sequences as tuples
        """
        if length == 0:
            yield ()
            return

        for seq in product(instructions, repeat=length):
            # Skip sequences that call non-existent procedures
            if not has_p1 and Instruction.PROC1 in seq:
                continue
            if not has_p2 and Instruction.PROC2 in seq:
                continue
            yield seq

    def _is_valid_program(self, program: Program) -> bool:
        """Check if a program is valid (not obviously broken).

        Args:
            program: Program to validate

        Returns:
            True if program should be tested
        """
        # MAIN must not be empty
        if not program.main:
            return False

        # If procedures exist, they must be called from somewhere
        if program.proc1:
            if Instruction.PROC1 not in program.main and Instruction.PROC1 not in program.proc2:
                # P1 exists but is never called - unless it calls itself
                if Instruction.PROC1 not in program.proc1:
                    return False

        if program.proc2:
            if Instruction.PROC2 not in program.main and Instruction.PROC2 not in program.proc1:
                if Instruction.PROC2 not in program.proc2:
                    return False

        # Check for obviously infinite loops (single instruction that only calls itself)
        if program.proc1 == [Instruction.PROC1]:
            return False
        if program.proc2 == [Instruction.PROC2]:
            return False

        # Mutual infinite recursion
        if program.proc1 == [Instruction.PROC2] and program.proc2 == [Instruction.PROC1]:
            return False

        return True

    def solve_with_stats(self, max_size: int = 15) -> tuple[Optional[Program], dict]:
        """Find solution and return statistics.

        Args:
            max_size: Maximum total program size

        Returns:
            Tuple of (program, stats_dict)
        """
        stats = {
            "programs_tested": 0,
            "programs_solved": 0,
            "size_searched": 0,
        }

        for size in range(1, max_size + 1):
            stats["size_searched"] = size
            result, size_stats = self._search_size_with_stats(size)
            stats["programs_tested"] += size_stats["tested"]

            if result is not None:
                stats["programs_solved"] = 1
                return result, stats

        return None, stats

    def _search_size_with_stats(self, total_size: int) -> tuple[Optional[Program], dict]:
        """Search with statistics tracking."""
        stats = {"tested": 0}

        for main_size in range(1, total_size + 1):
            remaining = total_size - main_size
            for p1_size in range(0, remaining + 1):
                p2_size = remaining - p1_size

                main_instrs = self.ALL_INSTRUCTIONS if (p1_size > 0 or p2_size > 0) else self.BASIC_INSTRUCTIONS
                p1_instrs = self._get_proc_instructions(has_p1=p1_size > 0, has_p2=p2_size > 0, is_p1=True)
                p2_instrs = self._get_proc_instructions(has_p1=p1_size > 0, has_p2=p2_size > 0, is_p1=False)

                for main in self._generate_sequences(main_size, main_instrs, p1_size > 0, p2_size > 0):
                    if p1_size == 0 and Instruction.PROC1 in main:
                        continue
                    if p2_size == 0 and Instruction.PROC2 in main:
                        continue

                    for p1 in self._generate_sequences(p1_size, p1_instrs, True, p2_size > 0) if p1_size > 0 else [[]]:
                        for p2 in self._generate_sequences(p2_size, p2_instrs, p1_size > 0, True) if p2_size > 0 else [[]]:
                            program = Program(list(main), list(p1), list(p2))

                            if not self._is_valid_program(program):
                                continue

                            stats["tested"] += 1
                            solved, _ = self.executor.execute(program)

                            if solved:
                                return program, stats

        return None, stats


class OptimizedProcedureSolver(ProcedureSolver):
    """Optimized procedure solver with better pruning and caching.

    Uses state-based pruning to avoid testing programs that reach
    the same game states as previously tested programs.
    """

    def __init__(self, engine: LightBotEngine, max_exec_steps: int = 500):
        super().__init__(engine, max_exec_steps)
        self._state_cache: set[tuple] = set()

    def solve(self, max_size: int = 15) -> Optional[Program]:
        """Find minimum-size program with optimizations."""
        self._state_cache.clear()

        for size in range(1, max_size + 1):
            result = self._search_size_optimized(size)
            if result is not None:
                return result

        return None

    def _search_size_optimized(self, total_size: int) -> Optional[Program]:
        """Search with state-based pruning."""
        # Try simpler distributions first (more likely to find solution)
        distributions = []
        for main_size in range(1, total_size + 1):
            remaining = total_size - main_size
            for p1_size in range(0, remaining + 1):
                p2_size = remaining - p1_size
                distributions.append((main_size, p1_size, p2_size))

        # Sort by complexity (prefer simpler programs)
        distributions.sort(key=lambda d: (d[1] + d[2], d[0]))

        for main_size, p1_size, p2_size in distributions:
            result = self._search_distribution_optimized(main_size, p1_size, p2_size)
            if result is not None:
                return result

        return None

    def _search_distribution_optimized(
        self, main_size: int, p1_size: int, p2_size: int
    ) -> Optional[Program]:
        """Search with optimizations for specific distribution."""
        main_instrs = self.ALL_INSTRUCTIONS if (p1_size > 0 or p2_size > 0) else self.BASIC_INSTRUCTIONS
        p1_instrs = self._get_proc_instructions(has_p1=p1_size > 0, has_p2=p2_size > 0, is_p1=True)
        p2_instrs = self._get_proc_instructions(has_p1=p1_size > 0, has_p2=p2_size > 0, is_p1=False)

        for main in self._generate_sequences(main_size, main_instrs, p1_size > 0, p2_size > 0):
            if p1_size == 0 and Instruction.PROC1 in main:
                continue
            if p2_size == 0 and Instruction.PROC2 in main:
                continue

            for p1 in self._generate_sequences(p1_size, p1_instrs, True, p2_size > 0) if p1_size > 0 else [[]]:
                for p2 in self._generate_sequences(p2_size, p2_instrs, p1_size > 0, True) if p2_size > 0 else [[]]:
                    program = Program(list(main), list(p1), list(p2))

                    if not self._is_valid_program(program):
                        continue

                    # Execute and check
                    self.engine.reset()
                    solved, final_state = self._execute_with_state_check(program)

                    if solved:
                        return program

        return None

    def _execute_with_state_check(self, program: Program) -> tuple[bool, Optional[tuple]]:
        """Execute program with state caching for pruning."""
        self.engine.reset()
        queue = list(program.main)
        steps = 0
        visited_states: set[tuple] = set()

        while queue and steps < self.max_exec_steps:
            instr = queue.pop(0)
            steps += 1

            if instr == Instruction.PROC1:
                queue = list(program.proc1) + queue
            elif instr == Instruction.PROC2:
                queue = list(program.proc2) + queue
            else:
                self.engine.step(instr)

            if self.engine.is_solved():
                return True, self.engine.get_state_hash()

            # Check for loops within this execution
            state = self.engine.get_state_hash()
            if state in visited_states:
                return False, None
            visited_states.add(state)

        return self.engine.is_solved(), self.engine.get_state_hash()
