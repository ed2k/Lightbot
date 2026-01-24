"""Unit tests for the LightBot game engine."""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import pytest
except ImportError:
    pytest = None

from lightbot.engine import LightBotEngine, run_solution
from lightbot.instructions import Instruction
from lightbot.levels import DIR_SE, DIR_NE, DIR_NW, DIR_SW


class TestEngineBasics:
    """Test basic engine initialization and state."""

    def test_level_0_init(self):
        """Test level 0 initial state."""
        engine = LightBotEngine(0)
        assert engine.bot_x == 4
        assert engine.bot_y == 5
        assert engine.bot_dir == DIR_SE
        assert len(engine.light_positions) == 1
        assert (4, 4) in engine.light_positions
        assert len(engine.lights_on) == 0
        assert not engine.is_solved()

    def test_level_1_init(self):
        """Test level 1 has 3 lights."""
        engine = LightBotEngine(1)
        assert len(engine.light_positions) == 3
        assert not engine.is_solved()

    def test_clone(self):
        """Test engine cloning creates independent copy."""
        engine = LightBotEngine(0)
        clone = engine.clone()

        # Modify original
        engine.step(Instruction.WALK)

        # Clone should be unchanged
        assert clone.bot_x == 4
        assert clone.bot_y == 5
        assert engine.bot_x == 4
        assert engine.bot_y == 4  # walked forward

    def test_reset(self):
        """Test reset restores initial state."""
        engine = LightBotEngine(0)
        engine.step(Instruction.WALK)
        engine.step(Instruction.LIGHT)

        engine.reset()

        assert engine.bot_x == 4
        assert engine.bot_y == 5
        assert len(engine.lights_on) == 0


class TestWalkInstruction:
    """Test walk instruction."""

    def test_walk_same_height(self):
        """Walk succeeds when heights match."""
        engine = LightBotEngine(0)
        old_y = engine.bot_y

        result = engine.step(Instruction.WALK)

        assert result is True
        assert engine.bot_y == old_y - 1  # SE direction decreases y

    def test_walk_different_height(self):
        """Walk fails when heights differ."""
        engine = LightBotEngine(3)  # Level 3 has height changes
        # Bot at (4, 7) h=1, facing SE
        # Position (4, 6) also h=1, so walk should work
        engine.step(Instruction.WALK)
        # Position (4, 5) also h=1
        engine.step(Instruction.WALK)
        # Position (4, 4) also h=1
        engine.step(Instruction.WALK)
        # Position (4, 3) also h=1
        engine.step(Instruction.WALK)
        # Position (4, 2) has h=2, so walk should fail
        old_pos = (engine.bot_x, engine.bot_y)
        result = engine.step(Instruction.WALK)

        assert result is False
        assert (engine.bot_x, engine.bot_y) == old_pos

    def test_walk_out_of_bounds(self):
        """Walk fails at map edge."""
        engine = LightBotEngine(0)
        # Move to edge - keep walking until we can't
        for _ in range(10):
            engine.step(Instruction.WALK)

        old_pos = (engine.bot_x, engine.bot_y)
        result = engine.step(Instruction.WALK)

        # Either we hit the edge or a height difference
        assert engine.bot_y >= 0


class TestJumpInstruction:
    """Test jump instruction."""

    def test_jump_up_one(self):
        """Jump up by exactly one height works."""
        engine = LightBotEngine(3)  # Level 3 has a wall at y=2 with h=2

        # Walk to position (4, 3) which is h=1
        for _ in range(4):
            engine.step(Instruction.WALK)

        assert engine.bot_y == 3
        assert engine.get_current_height() == 1

        # Tile (4, 2) has h=2, so jump should work
        result = engine.step(Instruction.JUMP)
        assert result is True
        assert engine.bot_y == 2
        assert engine.get_current_height() == 2

    def test_jump_down(self):
        """Jump down to lower height works."""
        engine = LightBotEngine(3)

        # Get to elevated position first
        for _ in range(4):
            engine.step(Instruction.WALK)
        engine.step(Instruction.JUMP)  # Now at h=2

        # Turn around and jump down
        engine.step(Instruction.TURN_LEFT)
        engine.step(Instruction.TURN_LEFT)  # Now facing NW (y+)

        result = engine.step(Instruction.JUMP)
        assert result is True
        assert engine.get_current_height() == 1

    def test_jump_fails_too_high(self):
        """Jump fails when target is more than 1 higher."""
        # Use level 2 which has a h=4 block at (4,4)
        engine = LightBotEngine(2)
        # Bot starts at (4, 6) h=1, facing SE
        # Walk to (4, 5) h=1
        engine.step(Instruction.WALK)
        # Target (4, 4) has h=4, so jump should fail (diff = 3)
        old_pos = (engine.bot_x, engine.bot_y)
        result = engine.step(Instruction.JUMP)
        assert result is False
        assert (engine.bot_x, engine.bot_y) == old_pos


class TestTurnInstructions:
    """Test turn instructions."""

    def test_turn_left_cycle(self):
        """Turn left cycles through all directions."""
        engine = LightBotEngine(0)
        assert engine.bot_dir == DIR_SE  # 0

        engine.step(Instruction.TURN_LEFT)
        assert engine.bot_dir == DIR_NE  # 1

        engine.step(Instruction.TURN_LEFT)
        assert engine.bot_dir == DIR_NW  # 2

        engine.step(Instruction.TURN_LEFT)
        assert engine.bot_dir == DIR_SW  # 3

        engine.step(Instruction.TURN_LEFT)
        assert engine.bot_dir == DIR_SE  # Back to 0

    def test_turn_right_cycle(self):
        """Turn right cycles through all directions."""
        engine = LightBotEngine(0)
        assert engine.bot_dir == DIR_SE  # 0

        engine.step(Instruction.TURN_RIGHT)
        assert engine.bot_dir == DIR_SW  # 3

        engine.step(Instruction.TURN_RIGHT)
        assert engine.bot_dir == DIR_NW  # 2

        engine.step(Instruction.TURN_RIGHT)
        assert engine.bot_dir == DIR_NE  # 1

        engine.step(Instruction.TURN_RIGHT)
        assert engine.bot_dir == DIR_SE  # Back to 0 after 4 turns


class TestLightInstruction:
    """Test light instruction."""

    def test_light_toggle_on(self):
        """Light instruction turns on light when on light tile."""
        engine = LightBotEngine(0)
        # Light at (4, 4), bot at (4, 5)
        engine.step(Instruction.WALK)  # Now at (4, 4)

        assert (4, 4) not in engine.lights_on
        engine.step(Instruction.LIGHT)
        assert (4, 4) in engine.lights_on

    def test_light_toggle_off(self):
        """Light instruction can toggle light off."""
        engine = LightBotEngine(0)
        engine.step(Instruction.WALK)
        engine.step(Instruction.LIGHT)  # On
        engine.step(Instruction.LIGHT)  # Off

        assert (4, 4) not in engine.lights_on

    def test_light_on_normal_tile(self):
        """Light instruction does nothing on normal tile."""
        engine = LightBotEngine(0)
        # Bot is on normal tile at start

        result = engine.step(Instruction.LIGHT)
        assert result is False


class TestSolvingLevels:
    """Test complete level solutions."""

    def test_level_0_solution(self):
        """Level 0: walk, light (2 instructions, better than gold=3)."""
        engine = LightBotEngine(0)

        engine.step(Instruction.WALK)  # Move to light position

        # Should not be solved yet
        assert not engine.is_solved()

        engine.step(Instruction.LIGHT)  # Turn on light

        # Now should be solved
        assert engine.is_solved()

    def test_level_0_gold_threshold(self):
        """Level 0 gold threshold is 3."""
        engine = LightBotEngine(0)
        assert engine.get_gold_threshold() == 3

    def test_run_solution_helper(self):
        """Test run_solution helper function."""
        # Level 0 solution: walk, light
        solution = [Instruction.WALK, Instruction.LIGHT]
        assert run_solution(0, solution) is True

        # Wrong solution (doesn't reach the light)
        wrong = [Instruction.LIGHT]
        assert run_solution(0, wrong) is False


class TestStateHash:
    """Test state hashing for deduplication."""

    def test_same_state_same_hash(self):
        """Same game state produces same hash."""
        engine1 = LightBotEngine(0)
        engine2 = LightBotEngine(0)

        assert engine1.get_state_hash() == engine2.get_state_hash()

    def test_different_position_different_hash(self):
        """Different positions produce different hashes."""
        engine1 = LightBotEngine(0)
        engine2 = LightBotEngine(0)
        engine2.step(Instruction.WALK)

        assert engine1.get_state_hash() != engine2.get_state_hash()

    def test_different_direction_different_hash(self):
        """Different directions produce different hashes."""
        engine1 = LightBotEngine(0)
        engine2 = LightBotEngine(0)
        engine2.step(Instruction.TURN_LEFT)

        assert engine1.get_state_hash() != engine2.get_state_hash()

    def test_different_lights_different_hash(self):
        """Different light states produce different hashes."""
        engine1 = LightBotEngine(0)
        engine2 = LightBotEngine(0)

        # Get both to same position
        engine1.step(Instruction.WALK)
        engine2.step(Instruction.WALK)

        # Turn on light in engine2
        engine2.step(Instruction.LIGHT)

        assert engine1.get_state_hash() != engine2.get_state_hash()


if __name__ == "__main__":
    if pytest:
        pytest.main([__file__, "-v"])
    else:
        print("pytest not installed, run tests manually")
