"""Instruction definitions for LightBot."""

from enum import IntEnum


class Instruction(IntEnum):
    """Instruction types for the LightBot game."""
    WALK = 0
    JUMP = 1
    LIGHT = 2
    TURN_LEFT = 3
    TURN_RIGHT = 4
    PROC1 = 5
    PROC2 = 6


# Human-readable names for instructions
INSTRUCTION_NAMES = {
    Instruction.WALK: "walk",
    Instruction.JUMP: "jump",
    Instruction.LIGHT: "light",
    Instruction.TURN_LEFT: "turnLeft",
    Instruction.TURN_RIGHT: "turnRight",
    Instruction.PROC1: "proc1",
    Instruction.PROC2: "proc2",
}


def instruction_to_str(instr: Instruction) -> str:
    """Convert instruction to human-readable string."""
    return INSTRUCTION_NAMES.get(instr, f"unknown({instr})")


def instructions_to_str(instructions: list[int]) -> str:
    """Convert list of instructions to human-readable string."""
    return "[" + ", ".join(instruction_to_str(Instruction(i)) for i in instructions) + "]"
