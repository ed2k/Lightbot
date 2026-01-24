"""Fast procedure solver with aggressive pruning.

Uses multiple optimizations:
1. State-based pruning across all tested programs
2. Symmetry breaking (avoid equivalent programs)
3. Early termination when solution found
4. Smart instruction ordering
"""

from __future__ import annotations
from typing import Optional, Iterator, Set
from collections import deque
import time

from lightbot.engine import LightBotEngine
from lightbot.executor import Program, ProgramExecutor
from lightbot.instructions import Instruction
from .base_solver import BaseSolver


class FastProcedureSolver(BaseSolver):
    """Fast procedure solver with aggressive pruning."""

    # Instructions ordered by usefulness (walk/jump first, turns last)
    BASIC_INSTRUCTIONS = [
        Instruction.WALK,
        Instruction.JUMP,
        Instruction.LIGHT,
        Instruction.TURN_LEFT,
        Instruction.TURN_RIGHT,
    ]

    def __init__(self, engine: LightBotEngine, max_exec_steps: int = 200):
        super().__init__(engine)
        self.max_exec_steps = max_exec_steps
        self.executor = ProgramExecutor(self.engine, max_exec_steps)
        self.programs_tested = 0
        self.solutions_found = []

    def solve(self, max_size: int = 12) -> Optional[Program]:
        """Find minimum-size program.

        Uses iterative deepening with aggressive pruning.
        """
        self.programs_tested = 0
        self.solutions_found = []

        for size in range(1, max_size + 1):
            result = self._search_size_fast(size)
            if result is not None:
                return result

        return None

    def _search_size_fast(self, total_size: int) -> Optional[Program]:
        """Fast search for specific total size."""
        # Generate candidate programs in smart order
        # Prefer: fewer procedures, smaller procedure sizes

        # First try no procedures (basic instructions only)
        result = self._try_main_only(total_size)
        if result:
            return result

        # Then try single procedure
        for main_size in range(1, total_size):
            p1_size = total_size - main_size
            result = self._try_with_proc1(main_size, p1_size)
            if result:
                return result

        # Finally try two procedures (most complex)
        for main_size in range(1, total_size - 1):
            remaining = total_size - main_size
            for p1_size in range(1, remaining):
                p2_size = remaining - p1_size
                result = self._try_with_both_procs(main_size, p1_size, p2_size)
                if result:
                    return result

        return None

    def _try_main_only(self, size: int) -> Optional[Program]:
        """Try programs with only MAIN (no procedures)."""
        for main in self._gen_basic_sequences(size):
            program = Program(list(main), [], [])
            self.programs_tested += 1

            if self._test_program(program):
                return program

        return None

    def _try_with_proc1(self, main_size: int, p1_size: int) -> Optional[Program]:
        """Try programs with MAIN and PROC1."""
        # PROC1 must contain useful instructions (not just turns or proc calls)
        for p1 in self._gen_proc_sequences(p1_size, allow_self=True, allow_p2=False):
            # Skip PROC1 that doesn't do anything useful
            if not self._has_action(p1):
                continue

            for main in self._gen_main_with_proc1(main_size):
                # MAIN must call PROC1
                if Instruction.PROC1 not in main:
                    continue

                program = Program(list(main), list(p1), [])
                self.programs_tested += 1

                if self._test_program(program):
                    return program

        return None

    def _try_with_both_procs(self, main_size: int, p1_size: int, p2_size: int) -> Optional[Program]:
        """Try programs with MAIN, PROC1, and PROC2."""
        for p1 in self._gen_proc_sequences(p1_size, allow_self=True, allow_p2=True):
            if not self._has_action(p1):
                continue

            for p2 in self._gen_proc_sequences(p2_size, allow_self=True, allow_p2=False, is_p2=True):
                if not self._has_action(p2):
                    continue

                for main in self._gen_main_with_both_procs(main_size):
                    # At least one proc must be called from MAIN
                    if Instruction.PROC1 not in main and Instruction.PROC2 not in main:
                        continue

                    program = Program(list(main), list(p1), list(p2))
                    self.programs_tested += 1

                    if self._test_program(program):
                        return program

        return None

    def _gen_basic_sequences(self, length: int) -> Iterator[tuple]:
        """Generate basic instruction sequences."""
        if length == 0:
            yield ()
            return

        def gen(prefix: list, remaining: int):
            if remaining == 0:
                yield tuple(prefix)
                return

            for instr in self.BASIC_INSTRUCTIONS:
                prefix.append(instr)
                yield from gen(prefix, remaining - 1)
                prefix.pop()

        yield from gen([], length)

    def _gen_proc_sequences(self, length: int, allow_self: bool = True,
                            allow_p2: bool = False, is_p2: bool = False) -> Iterator[tuple]:
        """Generate procedure instruction sequences."""
        if length == 0:
            yield ()
            return

        instrs = list(self.BASIC_INSTRUCTIONS)
        if allow_self:
            instrs.append(Instruction.PROC1 if not is_p2 else Instruction.PROC2)
        if allow_p2 and not is_p2:
            instrs.append(Instruction.PROC2)
        if allow_self and is_p2:
            instrs.append(Instruction.PROC1)  # P2 can call P1

        def gen(prefix: list, remaining: int):
            if remaining == 0:
                yield tuple(prefix)
                return

            for instr in instrs:
                prefix.append(instr)
                yield from gen(prefix, remaining - 1)
                prefix.pop()

        yield from gen([], length)

    def _gen_main_with_proc1(self, length: int) -> Iterator[tuple]:
        """Generate MAIN sequences that can call PROC1."""
        instrs = list(self.BASIC_INSTRUCTIONS) + [Instruction.PROC1]

        def gen(prefix: list, remaining: int):
            if remaining == 0:
                yield tuple(prefix)
                return

            for instr in instrs:
                prefix.append(instr)
                yield from gen(prefix, remaining - 1)
                prefix.pop()

        yield from gen([], length)

    def _gen_main_with_both_procs(self, length: int) -> Iterator[tuple]:
        """Generate MAIN sequences that can call PROC1 and PROC2."""
        instrs = list(self.BASIC_INSTRUCTIONS) + [Instruction.PROC1, Instruction.PROC2]

        def gen(prefix: list, remaining: int):
            if remaining == 0:
                yield tuple(prefix)
                return

            for instr in instrs:
                prefix.append(instr)
                yield from gen(prefix, remaining - 1)
                prefix.pop()

        yield from gen([], length)

    def _has_action(self, seq: tuple) -> bool:
        """Check if sequence has at least one action (walk/jump/light)."""
        actions = {Instruction.WALK, Instruction.JUMP, Instruction.LIGHT}
        return any(i in actions for i in seq)

    def _test_program(self, program: Program) -> bool:
        """Test if program solves the level."""
        # Quick validity checks
        if program.proc1 == [Instruction.PROC1]:
            return False
        if program.proc2 == [Instruction.PROC2]:
            return False

        solved, _ = self.executor.execute(program)
        return solved

    def solve_with_stats(self, max_size: int = 12) -> tuple[Optional[Program], dict]:
        """Solve with statistics."""
        self.programs_tested = 0
        start = time.time()

        result = self.solve(max_size)

        return result, {
            "programs_tested": self.programs_tested,
            "time": time.time() - start,
            "size_searched": max_size,
        }


class BeamSearchProcedureSolver(BaseSolver):
    """Procedure solver using beam search over execution states.

    Instead of enumerating all programs, this solver does a beam search
    over partial executions, building up the program incrementally.
    """

    BASIC_INSTRUCTIONS = [
        Instruction.WALK,
        Instruction.JUMP,
        Instruction.LIGHT,
        Instruction.TURN_LEFT,
        Instruction.TURN_RIGHT,
    ]

    def __init__(self, engine: LightBotEngine, beam_width: int = 1000):
        super().__init__(engine)
        self.beam_width = beam_width

    def solve(self, max_size: int = 15) -> Optional[Program]:
        """Find solution using beam search."""
        # This solver builds programs incrementally by trying each instruction
        # and keeping the most promising partial programs

        # Start with empty program
        initial_state = self._get_initial_state()
        beam = [(0, [], initial_state)]  # (heuristic, program, engine_state_hash)

        visited_programs: Set[tuple] = set()

        for _ in range(max_size):
            next_beam = []

            for score, program, state_hash in beam:
                # Try adding each instruction
                for instr in self.BASIC_INSTRUCTIONS:
                    new_program = program + [instr]
                    program_key = tuple(new_program)

                    if program_key in visited_programs:
                        continue
                    visited_programs.add(program_key)

                    # Execute and check
                    self.engine.reset()
                    solved = True
                    for i in new_program:
                        self.engine.step(i)

                    if self.engine.is_solved():
                        return Program(new_program, [], [])

                    # Score based on lights lit
                    lights_on, total = self.engine.get_light_count()
                    new_score = lights_on / total if total > 0 else 0
                    new_state = self.engine.get_state_hash()

                    next_beam.append((new_score, new_program, new_state))

            # Keep top beam_width candidates
            next_beam.sort(key=lambda x: -x[0])  # Higher score is better
            beam = next_beam[:self.beam_width]

            if not beam:
                break

        return None

    def _get_initial_state(self) -> tuple:
        """Get initial engine state hash."""
        self.engine.reset()
        return self.engine.get_state_hash()
