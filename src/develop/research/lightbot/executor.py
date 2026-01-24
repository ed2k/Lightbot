"""Program executor for LightBot with procedure support.

Executes programs consisting of MAIN, PROC1, and PROC2 instruction lists.
"""

from __future__ import annotations
from typing import Optional
from dataclasses import dataclass

from .engine import LightBotEngine
from .instructions import Instruction


@dataclass
class Program:
    """A LightBot program with main routine and two procedures."""
    main: list[int]
    proc1: list[int]
    proc2: list[int]

    def total_size(self) -> int:
        """Total number of instruction slots used."""
        return len(self.main) + len(self.proc1) + len(self.proc2)

    def __repr__(self) -> str:
        from .instructions import instructions_to_str
        parts = [f"MAIN={instructions_to_str(self.main)}"]
        if self.proc1:
            parts.append(f"P1={instructions_to_str(self.proc1)}")
        if self.proc2:
            parts.append(f"P2={instructions_to_str(self.proc2)}")
        return f"Program({', '.join(parts)})"

    def to_tuple(self) -> tuple:
        """Convert to hashable tuple for deduplication."""
        return (tuple(self.main), tuple(self.proc1), tuple(self.proc2))


class ProgramExecutor:
    """Executes LightBot programs with procedure support.

    Handles the execution queue, procedure calls, and step limiting
    to prevent infinite loops.
    """

    def __init__(self, engine: LightBotEngine, max_steps: int = 1000):
        """Initialize executor.

        Args:
            engine: Game engine to execute on
            max_steps: Maximum execution steps before stopping (prevents infinite loops)
        """
        self.engine = engine
        self.max_steps = max_steps

    def execute(self, program: Program) -> tuple[bool, int]:
        """Execute a program and return whether it solves the level.

        Args:
            program: Program to execute

        Returns:
            Tuple of (solved, steps_taken)
        """
        # Reset engine to initial state
        self.engine.reset()

        # Initialize execution queue with MAIN
        queue = list(program.main)
        steps = 0

        while queue and steps < self.max_steps:
            instr = queue.pop(0)
            steps += 1

            if instr == Instruction.PROC1:
                # Prepend PROC1 contents to queue
                queue = list(program.proc1) + queue
            elif instr == Instruction.PROC2:
                # Prepend PROC2 contents to queue
                queue = list(program.proc2) + queue
            else:
                # Execute basic instruction
                self.engine.step(instr)

            # Check if solved
            if self.engine.is_solved():
                return True, steps

        return self.engine.is_solved(), steps

    def execute_with_trace(self, program: Program) -> tuple[bool, int, list[tuple]]:
        """Execute a program and return execution trace.

        Args:
            program: Program to execute

        Returns:
            Tuple of (solved, steps_taken, trace)
            where trace is list of (instruction, bot_pos, bot_dir, lights_on)
        """
        self.engine.reset()
        queue = list(program.main)
        steps = 0
        trace = []

        # Record initial state
        trace.append((
            None,
            (self.engine.bot_x, self.engine.bot_y),
            self.engine.bot_dir,
            len(self.engine.lights_on)
        ))

        while queue and steps < self.max_steps:
            instr = queue.pop(0)
            steps += 1

            if instr == Instruction.PROC1:
                queue = list(program.proc1) + queue
                # Record proc call but don't count as a "real" step for trace
                continue
            elif instr == Instruction.PROC2:
                queue = list(program.proc2) + queue
                continue
            else:
                self.engine.step(instr)

            trace.append((
                instr,
                (self.engine.bot_x, self.engine.bot_y),
                self.engine.bot_dir,
                len(self.engine.lights_on)
            ))

            if self.engine.is_solved():
                return True, steps, trace

        return self.engine.is_solved(), steps, trace


def format_program(program: Program) -> str:
    """Format a program for display."""
    from .instructions import instructions_to_str

    lines = []
    lines.append(f"MAIN: {instructions_to_str(program.main)}")
    if program.proc1:
        lines.append(f"PROC1: {instructions_to_str(program.proc1)}")
    if program.proc2:
        lines.append(f"PROC2: {instructions_to_str(program.proc2)}")
    lines.append(f"Total: {program.total_size()} instructions")
    return "\n".join(lines)
