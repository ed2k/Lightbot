"""Resumable procedure solver for LightBot.

Saves search state on timeout so solving can resume from where it left off.
"""

from __future__ import annotations
import json
import os
import time
from dataclasses import dataclass, asdict
from typing import Optional, Iterator
from itertools import product

from lightbot.engine import LightBotEngine
from lightbot.executor import Program, ProgramExecutor
from lightbot.instructions import Instruction
from .base_solver import BaseSolver


@dataclass
class SolverCheckpoint:
    """Checkpoint state for resumable solving."""
    level: int
    current_size: int
    current_main_size: int
    current_p1_size: int
    current_p2_size: int
    programs_tested: int
    time_spent: float
    # Index tracking for generators
    main_index: int = 0
    p1_index: int = 0
    p2_index: int = 0

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> 'SolverCheckpoint':
        return cls(**d)

    def save(self, filepath: str):
        """Save checkpoint to file."""
        with open(filepath, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load(cls, filepath: str) -> Optional['SolverCheckpoint']:
        """Load checkpoint from file."""
        if not os.path.exists(filepath):
            return None
        try:
            with open(filepath, 'r') as f:
                return cls.from_dict(json.load(f))
        except (json.JSONDecodeError, KeyError):
            return None


class ResumableProcedureSolver(BaseSolver):
    """Procedure solver that can save/resume state on timeout."""

    # Instructions ordered by usefulness
    BASIC_INSTRUCTIONS = [
        Instruction.WALK,
        Instruction.JUMP,
        Instruction.LIGHT,
        Instruction.TURN_LEFT,
        Instruction.TURN_RIGHT,
    ]

    ALL_INSTRUCTIONS = BASIC_INSTRUCTIONS + [
        Instruction.PROC1,
        Instruction.PROC2,
    ]

    def __init__(self, engine: LightBotEngine, level_index: int,
                 max_exec_steps: int = 200, checkpoint_dir: str = "checkpoints"):
        super().__init__(engine)
        self.level_index = level_index
        self.max_exec_steps = max_exec_steps
        self.executor = ProgramExecutor(self.engine, max_exec_steps)
        self.checkpoint_dir = checkpoint_dir
        self.programs_tested = 0
        self.time_spent = 0.0

        # Current search state (for checkpointing)
        self._current_size = 1
        self._current_main_size = 1
        self._current_p1_size = 0
        self._current_p2_size = 0
        self._main_index = 0
        self._p1_index = 0
        self._p2_index = 0

        # Ensure checkpoint directory exists
        os.makedirs(checkpoint_dir, exist_ok=True)

    def _get_checkpoint_path(self) -> str:
        return os.path.join(self.checkpoint_dir, f"level_{self.level_index}.json")

    def _save_checkpoint(self):
        """Save current state to checkpoint file."""
        checkpoint = SolverCheckpoint(
            level=self.level_index,
            current_size=self._current_size,
            current_main_size=self._current_main_size,
            current_p1_size=self._current_p1_size,
            current_p2_size=self._current_p2_size,
            programs_tested=self.programs_tested,
            time_spent=self.time_spent,
            main_index=self._main_index,
            p1_index=self._p1_index,
            p2_index=self._p2_index,
        )
        checkpoint.save(self._get_checkpoint_path())

    def _load_checkpoint(self) -> Optional[SolverCheckpoint]:
        """Load checkpoint if it exists."""
        return SolverCheckpoint.load(self._get_checkpoint_path())

    def _delete_checkpoint(self):
        """Delete checkpoint file (called when solved)."""
        path = self._get_checkpoint_path()
        if os.path.exists(path):
            os.remove(path)

    def solve(self, max_size: int = 12, timeout: float = 60.0,
              resume: bool = True) -> tuple[Optional[Program], dict]:
        """Find minimum-size program with timeout and resume support.

        Args:
            max_size: Maximum total program size to search
            timeout: Maximum time in seconds before saving checkpoint
            resume: If True, try to resume from checkpoint

        Returns:
            Tuple of (program, stats_dict)
        """
        start_time = time.time()
        checkpoint = self._load_checkpoint() if resume else None

        # Initialize or restore state
        initially_resumed = False
        skip_to_saved_position = False

        if checkpoint and checkpoint.level == self.level_index:
            self._current_size = checkpoint.current_size
            self._current_main_size = checkpoint.current_main_size
            self._current_p1_size = checkpoint.current_p1_size
            self._current_p2_size = checkpoint.current_p2_size
            self.programs_tested = checkpoint.programs_tested
            self.time_spent = checkpoint.time_spent
            self._main_index = checkpoint.main_index
            self._p1_index = checkpoint.p1_index
            self._p2_index = checkpoint.p2_index
            initially_resumed = True
            skip_to_saved_position = True
        else:
            self._current_size = 1
            self._current_main_size = 1
            self._current_p1_size = 0
            self._current_p2_size = 0
            self.programs_tested = 0
            self.time_spent = 0.0
            self._main_index = 0
            self._p1_index = 0
            self._p2_index = 0

        timed_out = False
        solution = None

        for size in range(self._current_size, max_size + 1):
            self._current_size = size

            result, did_timeout = self._search_size_with_timeout(
                size,
                start_time,
                timeout,
                skip_to_distribution=skip_to_saved_position
            )

            if result is not None:
                solution = result
                break

            if did_timeout:
                timed_out = True
                break

            # Reset indices for next size
            self._main_index = 0
            self._p1_index = 0
            self._p2_index = 0
            self._current_main_size = 1
            self._current_p1_size = 0
            self._current_p2_size = 0
            skip_to_saved_position = False  # No longer need to skip after first size

        elapsed = time.time() - start_time
        self.time_spent += elapsed

        stats = {
            "programs_tested": self.programs_tested,
            "time_seconds": self.time_spent,
            "timed_out": timed_out,
            "resumed": initially_resumed,
            "size_searched": self._current_size,
        }

        if timed_out:
            self._save_checkpoint()
            stats["checkpoint_saved"] = True
        elif solution is not None:
            self._delete_checkpoint()
            stats["checkpoint_saved"] = False

        return solution, stats

    def _search_size_with_timeout(self, total_size: int, start_time: float,
                                   timeout: float, skip_to_distribution: bool = False
                                   ) -> tuple[Optional[Program], bool]:
        """Search specific size with timeout checking.

        Returns:
            Tuple of (result, timed_out)
        """
        # Build distribution list
        distributions = []
        for main_size in range(1, total_size + 1):
            remaining = total_size - main_size
            for p1_size in range(0, remaining + 1):
                p2_size = remaining - p1_size
                distributions.append((main_size, p1_size, p2_size))

        # Sort by complexity
        distributions.sort(key=lambda d: (d[1] + d[2], d[0]))

        # Find starting point if resuming
        start_idx = 0
        skip_to_indices = skip_to_distribution
        if skip_to_distribution:
            target = (self._current_main_size, self._current_p1_size, self._current_p2_size)
            for i, d in enumerate(distributions):
                if d == target:
                    start_idx = i
                    break

        for i in range(start_idx, len(distributions)):
            main_size, p1_size, p2_size = distributions[i]
            self._current_main_size = main_size
            self._current_p1_size = p1_size
            self._current_p2_size = p2_size

            # Check timeout
            if time.time() - start_time > timeout:
                return None, True

            # Only skip to saved indices for the first distribution after resume
            use_skip_indices = (i == start_idx and skip_to_indices)

            result, did_timeout = self._search_distribution_with_timeout(
                main_size, p1_size, p2_size,
                start_time, timeout,
                skip_indices=use_skip_indices
            )

            # After first distribution, no longer skip
            skip_to_indices = False

            if result is not None:
                return result, False

            if did_timeout:
                return None, True

            # Reset indices for next distribution
            self._main_index = 0
            self._p1_index = 0
            self._p2_index = 0

        return None, False

    def _search_distribution_with_timeout(
        self, main_size: int, p1_size: int, p2_size: int,
        start_time: float, timeout: float, skip_indices: bool = False
    ) -> tuple[Optional[Program], bool]:
        """Search specific distribution with timeout and index tracking."""

        # Determine available instructions
        main_instrs = self.ALL_INSTRUCTIONS if (p1_size > 0 or p2_size > 0) else self.BASIC_INSTRUCTIONS
        p1_instrs = self._get_proc_instructions(p1_size > 0, p2_size > 0, is_p1=True)
        p2_instrs = self._get_proc_instructions(p1_size > 0, p2_size > 0, is_p1=False)

        # Generate all sequences as lists for indexable access
        main_seqs = list(self._generate_sequences(main_size, main_instrs, p1_size > 0, p2_size > 0))
        p1_seqs = list(self._generate_sequences(p1_size, p1_instrs, True, p2_size > 0)) if p1_size > 0 else [()]
        p2_seqs = list(self._generate_sequences(p2_size, p2_instrs, p1_size > 0, True)) if p2_size > 0 else [()]

        # Determine starting indices
        start_main = self._main_index if skip_indices else 0
        start_p1 = self._p1_index if skip_indices else 0
        start_p2 = self._p2_index if skip_indices else 0

        for mi in range(start_main, len(main_seqs)):
            main = main_seqs[mi]
            self._main_index = mi

            # Skip if MAIN calls procedures that don't exist
            if p1_size == 0 and Instruction.PROC1 in main:
                continue
            if p2_size == 0 and Instruction.PROC2 in main:
                continue

            p1_start = start_p1 if mi == start_main else 0

            for pi in range(p1_start, len(p1_seqs)):
                p1 = p1_seqs[pi]
                self._p1_index = pi

                p2_start = start_p2 if (mi == start_main and pi == start_p1) else 0

                for p2i in range(p2_start, len(p2_seqs)):
                    p2 = p2_seqs[p2i]
                    self._p2_index = p2i

                    # Periodic timeout check
                    if self.programs_tested % 10000 == 0:
                        if time.time() - start_time > timeout:
                            return None, True

                    program = Program(list(main), list(p1), list(p2))

                    if not self._is_valid_program(program):
                        continue

                    self.programs_tested += 1

                    solved, _ = self.executor.execute(program)
                    if solved:
                        return program, False

        return None, False

    def _get_proc_instructions(self, has_p1: bool, has_p2: bool, is_p1: bool) -> list[int]:
        """Get available instructions for a procedure."""
        instrs = list(self.BASIC_INSTRUCTIONS)

        if is_p1:
            if has_p2:
                instrs.append(Instruction.PROC2)
            if has_p1:
                instrs.append(Instruction.PROC1)  # Self-recursion
        else:
            if has_p1:
                instrs.append(Instruction.PROC1)
            if has_p2:
                instrs.append(Instruction.PROC2)  # Self-recursion

        return instrs

    def _generate_sequences(
        self, length: int, instructions: list[int],
        has_p1: bool, has_p2: bool
    ) -> Iterator[tuple[int, ...]]:
        """Generate all instruction sequences of given length."""
        if length == 0:
            yield ()
            return

        for seq in product(instructions, repeat=length):
            if not has_p1 and Instruction.PROC1 in seq:
                continue
            if not has_p2 and Instruction.PROC2 in seq:
                continue
            yield seq

    def _is_valid_program(self, program: Program) -> bool:
        """Check if a program is valid."""
        if not program.main:
            return False

        # Check procedures are called
        if program.proc1:
            if Instruction.PROC1 not in program.main and Instruction.PROC1 not in program.proc2:
                if Instruction.PROC1 not in program.proc1:
                    return False

        if program.proc2:
            if Instruction.PROC2 not in program.main and Instruction.PROC2 not in program.proc1:
                if Instruction.PROC2 not in program.proc2:
                    return False

        # Check for obviously infinite loops
        if program.proc1 == [Instruction.PROC1]:
            return False
        if program.proc2 == [Instruction.PROC2]:
            return False
        if program.proc1 == [Instruction.PROC2] and program.proc2 == [Instruction.PROC1]:
            return False

        return True


def solve_with_resume(level_index: int, max_size: int = 12,
                      timeout: float = 60.0, checkpoint_dir: str = "checkpoints"
                      ) -> tuple[Optional[Program], dict]:
    """Convenience function to solve a level with resume support.

    Args:
        level_index: Level to solve
        max_size: Maximum program size
        timeout: Timeout per solve attempt
        checkpoint_dir: Directory for checkpoint files

    Returns:
        Tuple of (program, stats)
    """
    engine = LightBotEngine(level_index)
    solver = ResumableProcedureSolver(
        engine, level_index,
        checkpoint_dir=checkpoint_dir
    )
    return solver.solve(max_size=max_size, timeout=timeout)
