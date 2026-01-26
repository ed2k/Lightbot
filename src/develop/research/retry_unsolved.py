#!/usr/bin/env python3
"""Retry unsolved levels with resumable procedure solver.

This script:
1. Reads results.json to find unsolved/timed-out levels
2. Runs the resumable solver on each with longer timeout
3. Saves checkpoints on timeout so next run can resume
4. Updates results when solutions are found

Usage:
    python retry_unsolved.py                  # Run with defaults
    python retry_unsolved.py --timeout 300    # 5 minute timeout per level
    python retry_unsolved.py --max-size 15    # Search up to size 15
    python retry_unsolved.py --level 1        # Retry specific level
    python retry_unsolved.py --clear          # Clear all checkpoints
    python retry_unsolved.py --status         # Show checkpoint status
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime

from lightbot.engine import LightBotEngine
from lightbot.levels import get_level_count
from lightbot.instructions import instructions_to_str
from lightbot.executor import Program, ProgramExecutor, format_program
from solvers.resumable_procedure_solver import ResumableProcedureSolver, SolverCheckpoint


RESULTS_FILE = "results.json"
CHECKPOINT_DIR = "checkpoints"
RETRY_RESULTS_FILE = "retry_results.json"


def load_results() -> dict:
    """Load existing results."""
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, 'r') as f:
            return json.load(f)
    return {"procedure_solver_results": []}


def get_unsolved_levels(results: dict) -> list[int]:
    """Get list of unsolved level indices."""
    unsolved = []
    for r in results.get("procedure_solver_results", []):
        if not r.get("solved", False):
            unsolved.append(r["level"])
    return unsolved


def show_checkpoint_status():
    """Show status of all checkpoints."""
    if not os.path.exists(CHECKPOINT_DIR):
        print("No checkpoints directory found.")
        return

    checkpoints = []
    for f in os.listdir(CHECKPOINT_DIR):
        if f.endswith(".json"):
            path = os.path.join(CHECKPOINT_DIR, f)
            cp = SolverCheckpoint.load(path)
            if cp:
                checkpoints.append(cp)

    if not checkpoints:
        print("No checkpoints found.")
        return

    print(f"\nCheckpoint Status ({len(checkpoints)} saved):")
    print("-" * 80)
    print(f"{'Level':<6} {'Size':<6} {'Distribution':<20} {'Programs':<12} {'Time':<10} {'Indices'}")
    print("-" * 80)

    for cp in sorted(checkpoints, key=lambda x: x.level):
        dist = f"({cp.current_main_size}, {cp.current_p1_size}, {cp.current_p2_size})"
        indices = f"({cp.main_index}, {cp.p1_index}, {cp.p2_index})"
        print(f"{cp.level:<6} {cp.current_size:<6} {dist:<20} {cp.programs_tested:<12} {cp.time_spent:<10.1f} {indices}")

    print("-" * 80)
    total_programs = sum(cp.programs_tested for cp in checkpoints)
    total_time = sum(cp.time_spent for cp in checkpoints)
    print(f"Total: {total_programs:,} programs tested, {total_time:.1f}s spent")


def clear_checkpoints():
    """Clear all checkpoints."""
    if not os.path.exists(CHECKPOINT_DIR):
        print("No checkpoints to clear.")
        return

    count = 0
    for f in os.listdir(CHECKPOINT_DIR):
        if f.endswith(".json"):
            os.remove(os.path.join(CHECKPOINT_DIR, f))
            count += 1

    print(f"Cleared {count} checkpoint(s).")


def load_retry_results() -> dict:
    """Load existing retry results."""
    if os.path.exists(RETRY_RESULTS_FILE):
        with open(RETRY_RESULTS_FILE, 'r') as f:
            return json.load(f)
    return {"timestamp": None, "results": {}}


def save_retry_results(results: dict):
    """Save retry results."""
    results["timestamp"] = datetime.now().isoformat()
    with open(RETRY_RESULTS_FILE, 'w') as f:
        json.dump(results, f, indent=2)


def retry_level(level_index: int, max_size: int, timeout: float) -> dict:
    """Retry solving a single level.

    Returns:
        Result dictionary
    """
    engine = LightBotEngine(level_index)
    gold = engine.get_gold_threshold()
    lights = len(engine.light_positions)

    solver = ResumableProcedureSolver(
        engine, level_index,
        max_exec_steps=200,
        checkpoint_dir=CHECKPOINT_DIR
    )

    program, stats = solver.solve(max_size=max_size, timeout=timeout)

    result = {
        "level": level_index,
        "gold_threshold": gold,
        "num_lights": lights,
        "time_seconds": round(stats["time_seconds"], 3),
        "programs_tested": stats["programs_tested"],
        "timed_out": stats["timed_out"],
        "resumed": stats.get("resumed", False),
        "checkpoint_saved": stats.get("checkpoint_saved", False),
        "size_searched": stats["size_searched"],
    }

    if program:
        # Verify solution
        executor = ProgramExecutor(LightBotEngine(level_index), max_steps=200)
        solved, _ = executor.execute(program)

        result["solved"] = solved
        result["instructions"] = program.total_size()
        result["main"] = instructions_to_str(program.main)
        result["proc1"] = instructions_to_str(program.proc1) if program.proc1 else None
        result["proc2"] = instructions_to_str(program.proc2) if program.proc2 else None
        result["achieved_gold"] = program.total_size() <= gold
    else:
        result["solved"] = False
        result["instructions"] = None
        result["main"] = None
        result["proc1"] = None
        result["proc2"] = None
        result["achieved_gold"] = False

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Retry unsolved levels with resumable solver"
    )
    parser.add_argument(
        "--timeout", "-t",
        type=float,
        default=60.0,
        help="Timeout per level in seconds (default: 60)"
    )
    parser.add_argument(
        "--max-size", "-m",
        type=int,
        default=12,
        help="Maximum program size to search (default: 12)"
    )
    parser.add_argument(
        "--level", "-l",
        type=int,
        default=None,
        help="Retry specific level (default: all unsolved)"
    )
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="Retry all levels (not just unsolved)"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear all checkpoints and exit"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show checkpoint status and exit"
    )
    parser.add_argument(
        "--iterations", "-i",
        type=int,
        default=1,
        help="Number of retry iterations (default: 1)"
    )

    args = parser.parse_args()

    if args.status:
        show_checkpoint_status()
        return

    if args.clear:
        clear_checkpoints()
        return

    # Determine which levels to retry
    if args.level is not None:
        levels_to_retry = [args.level]
    elif args.all:
        levels_to_retry = list(range(get_level_count()))
    else:
        results = load_results()
        levels_to_retry = get_unsolved_levels(results)

    if not levels_to_retry:
        print("No unsolved levels to retry!")
        return

    print(f"Retrying {len(levels_to_retry)} level(s) with:")
    print(f"  - Timeout: {args.timeout}s per level")
    print(f"  - Max size: {args.max_size}")
    print(f"  - Iterations: {args.iterations}")
    print(f"  - Checkpoint dir: {CHECKPOINT_DIR}")
    print()

    retry_results = load_retry_results()

    for iteration in range(args.iterations):
        if args.iterations > 1:
            print(f"\n{'='*70}")
            print(f"ITERATION {iteration + 1}/{args.iterations}")
            print(f"{'='*70}")

        for level in levels_to_retry:
            # Check if already solved in retry results
            level_key = str(level)
            if level_key in retry_results.get("results", {}):
                if retry_results["results"][level_key].get("solved", False):
                    print(f"Level {level}: Already solved, skipping")
                    continue

            print(f"\nLevel {level}:", end=" ", flush=True)

            # Check for existing checkpoint
            cp_path = os.path.join(CHECKPOINT_DIR, f"level_{level}.json")
            if os.path.exists(cp_path):
                cp = SolverCheckpoint.load(cp_path)
                if cp:
                    print(f"(resuming from size={cp.current_size}, {cp.programs_tested:,} tested)", end=" ")
                    print()

            start = time.time()
            result = retry_level(level, args.max_size, args.timeout)
            elapsed = time.time() - start

            # Update retry results
            if "results" not in retry_results:
                retry_results["results"] = {}
            retry_results["results"][level_key] = result
            save_retry_results(retry_results)

            # Print status
            if result["solved"]:
                status = "GOLD" if result["achieved_gold"] else "SOLVED"
                prog = f"MAIN={result['main']}"
                if result["proc1"]:
                    prog += f", P1={result['proc1']}"
                if result["proc2"]:
                    prog += f", P2={result['proc2']}"
                print(f"  {status}! {result['instructions']} instructions in {elapsed:.1f}s")
                print(f"    {prog}")
            elif result["timed_out"]:
                print(f"  TIMEOUT after {elapsed:.1f}s ({result['programs_tested']:,} programs, size={result['size_searched']})")
                if result.get("checkpoint_saved"):
                    print(f"    Checkpoint saved - run again to continue")
            else:
                print(f"  NOT FOUND (searched to size {result['size_searched']})")

    # Final summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    solved_count = 0
    gold_count = 0
    total_tested = 0
    total_time = 0.0

    for level_key, r in retry_results.get("results", {}).items():
        total_tested += r.get("programs_tested", 0)
        total_time += r.get("time_seconds", 0)
        if r.get("solved"):
            solved_count += 1
            if r.get("achieved_gold"):
                gold_count += 1

    print(f"Solved: {solved_count}/{len(levels_to_retry)}")
    print(f"Gold: {gold_count}/{len(levels_to_retry)}")
    print(f"Programs tested: {total_tested:,}")
    print(f"Total time: {total_time:.1f}s")

    # Show remaining checkpoints
    print()
    show_checkpoint_status()


if __name__ == "__main__":
    main()
