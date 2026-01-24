#!/usr/bin/env python3
"""CLI entry point for LightBot minimum instruction solver.

Usage:
    python main.py --level 0              # Solve level 0 with IDS (basic)
    python main.py --level 0 --solver bfs # Solve level 0 with BFS
    python main.py --level 1 --procedures # Solve with procedures (PROC1/PROC2)
    python main.py --all                  # Solve all levels
    python main.py --level 0 --verbose    # Show step-by-step solution
"""

import argparse
import sys
import time

from lightbot.engine import LightBotEngine, run_solution
from lightbot.levels import get_level_count, LEVELS
from lightbot.instructions import instructions_to_str, Instruction
from lightbot.executor import Program, ProgramExecutor, format_program
from solvers.bfs_solver import BFSSolver
from solvers.ids_solver import IDSSolver
from solvers.procedure_solver import ProcedureSolver, OptimizedProcedureSolver
from solvers.fast_procedure_solver import FastProcedureSolver
from utils.visualize import visualize_solution


def solve_level_basic(level_index: int, solver_type: str = "ids",
                      max_instructions: int = 30, verbose: bool = False) -> tuple:
    """Solve a single level using basic solver (no procedures).

    Args:
        level_index: Level to solve
        solver_type: "bfs" or "ids"
        max_instructions: Maximum instructions to try
        verbose: Print detailed output

    Returns:
        Tuple of (solution, elapsed_time, stats, gold)
    """
    engine = LightBotEngine(level_index)
    gold = engine.get_gold_threshold()

    if solver_type == "bfs":
        solver = BFSSolver(engine)
        start = time.time()
        solution, stats = solver.solve_with_stats(max_instructions)
    else:
        solver = IDSSolver(engine)
        start = time.time()
        solution, stats = solver.solve_with_stats(max_instructions)

    elapsed = time.time() - start

    if verbose and solution:
        print(visualize_solution(level_index, solution))

    return solution, elapsed, stats, gold


def solve_level_with_procedures(level_index: int, max_size: int = 15,
                                 verbose: bool = False) -> tuple:
    """Solve a level using procedure solver.

    Args:
        level_index: Level to solve
        max_size: Maximum total program size
        verbose: Print detailed output

    Returns:
        Tuple of (program, elapsed_time, stats, gold)
    """
    engine = LightBotEngine(level_index)
    gold = engine.get_gold_threshold()

    solver = FastProcedureSolver(engine, max_exec_steps=200)
    start = time.time()
    program, stats = solver.solve_with_stats(max_size)
    elapsed = time.time() - start

    if verbose and program:
        print(format_program(program))
        print()
        # Show execution trace
        executor = ProgramExecutor(engine, max_steps=500)
        solved, steps, trace = executor.execute_with_trace(program)
        print(f"Execution trace ({steps} steps):")
        for i, (instr, pos, dir_, lights) in enumerate(trace):
            if instr is not None:
                from lightbot.instructions import instruction_to_str
                from lightbot.levels import DIRECTION_NAMES
                print(f"  {i}. {instruction_to_str(Instruction(instr)):10} -> pos={pos}, dir={DIRECTION_NAMES[dir_]}, lights={lights}")

    return program, elapsed, stats, gold


def verify_program(level_index: int, program: Program) -> bool:
    """Verify a program solves the level."""
    engine = LightBotEngine(level_index)
    executor = ProgramExecutor(engine, max_steps=1000)
    solved, _ = executor.execute(program)
    return solved


def main():
    parser = argparse.ArgumentParser(
        description="Find minimum instruction solutions for LightBot puzzles"
    )
    parser.add_argument(
        "--level", "-l",
        type=int,
        default=None,
        help="Level index to solve (0-9)"
    )
    parser.add_argument(
        "--solver", "-s",
        choices=["bfs", "ids"],
        default="ids",
        help="Basic solver algorithm (default: ids)"
    )
    parser.add_argument(
        "--procedures", "-p",
        action="store_true",
        help="Use procedure solver (searches over MAIN, PROC1, PROC2)"
    )
    parser.add_argument(
        "--max",
        type=int,
        default=30,
        help="Maximum instructions/program size to search (default: 30)"
    )
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="Solve all levels"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed step-by-step solution"
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify solutions by running them"
    )

    args = parser.parse_args()

    if args.all:
        solver_name = "PROCEDURE" if args.procedures else args.solver.upper()
        print(f"Solving all {get_level_count()} levels with {solver_name}...")
        print("-" * 70)

        total_time = 0
        results = []

        for level in range(get_level_count()):
            if args.procedures:
                program, elapsed, stats, gold = solve_level_with_procedures(
                    level, args.max, verbose=False
                )
                if program:
                    size = program.total_size()
                    status = "GOLD" if size <= gold else "SOLVED"
                    result = f"Level {level:2d}: {size:2d} instructions (gold={gold:2d}) [{status}] {elapsed:.3f}s"

                    if args.verify:
                        verified = verify_program(level, program)
                        result += f" [{'OK' if verified else 'FAIL'}]"

                    results.append((level, size, gold, program))
                else:
                    result = f"Level {level:2d}: NO SOLUTION FOUND within {args.max} size"
                    results.append((level, None, gold, None))
            else:
                solution, elapsed, stats, gold = solve_level_basic(
                    level, args.solver, args.max, verbose=False
                )
                if solution:
                    status = "GOLD" if len(solution) <= gold else "SOLVED"
                    result = f"Level {level:2d}: {len(solution):2d} instructions (gold={gold:2d}) [{status}] {elapsed:.3f}s"

                    if args.verify:
                        verified = run_solution(level, solution)
                        result += f" [{'OK' if verified else 'FAIL'}]"

                    results.append((level, len(solution), gold, solution))
                else:
                    result = f"Level {level:2d}: NO SOLUTION FOUND within {args.max} instructions"
                    results.append((level, None, gold, None))

            total_time += elapsed
            print(result)

        print("-" * 70)
        solved = sum(1 for r in results if r[1] is not None)
        gold_count = sum(1 for r in results if r[1] is not None and r[1] <= r[2])
        print(f"Solved: {solved}/{len(results)} levels")
        print(f"Gold medals: {gold_count}/{len(results)}")
        print(f"Total time: {total_time:.3f}s")

    elif args.level is not None:
        if args.level < 0 or args.level >= get_level_count():
            print(f"Error: Level {args.level} not found. Available: 0-{get_level_count()-1}")
            sys.exit(1)

        if args.procedures:
            print(f"Solving level {args.level} with PROCEDURE solver...")

            program, elapsed, stats, gold = solve_level_with_procedures(
                args.level, args.max, verbose=args.verbose
            )

            if program:
                print(f"\nSolution found: {program.total_size()} instructions (gold threshold: {gold})")
                print(format_program(program))
                print(f"Time: {elapsed:.3f}s")
                print(f"Programs tested: {stats.get('programs_tested', 'N/A')}")

                if args.verify:
                    verified = verify_program(args.level, program)
                    print(f"Verification: {'PASS' if verified else 'FAIL'}")

                if program.total_size() <= gold:
                    print("Achieved GOLD medal!")
                elif program.total_size() <= LEVELS[args.level]["medals"]["silver"]:
                    print("Achieved SILVER medal")
                elif program.total_size() <= LEVELS[args.level]["medals"]["bronze"]:
                    print("Achieved BRONZE medal")
            else:
                print(f"No solution found within {args.max} total size")
                sys.exit(1)
        else:
            print(f"Solving level {args.level} with {args.solver.upper()}...")

            solution, elapsed, stats, gold = solve_level_basic(
                args.level, args.solver, args.max, verbose=args.verbose
            )

            if solution:
                print(f"\nSolution found: {len(solution)} instructions (gold threshold: {gold})")
                print(f"Instructions: {instructions_to_str(solution)}")
                print(f"Time: {elapsed:.3f}s")
                print(f"States explored: {stats.get('total_states_explored', stats.get('states_explored', 'N/A'))}")

                if args.verify:
                    verified = run_solution(args.level, solution)
                    print(f"Verification: {'PASS' if verified else 'FAIL'}")

                if len(solution) <= gold:
                    print("Achieved GOLD medal!")
                elif len(solution) <= LEVELS[args.level]["medals"]["silver"]:
                    print("Achieved SILVER medal")
                elif len(solution) <= LEVELS[args.level]["medals"]["bronze"]:
                    print("Achieved BRONZE medal")
            else:
                print(f"No solution found within {args.max} instructions")
                sys.exit(1)
    else:
        parser.print_help()
        print("\nExamples:")
        print("  python main.py --level 0              # Solve level 0 (basic)")
        print("  python main.py --level 1 --procedures # Solve with procedures")
        print("  python main.py --all                  # Solve all levels")
        print("  python main.py --all --procedures     # Solve all with procedures")
        print("  python main.py --level 0 -v           # Verbose output")
        sys.exit(1)


if __name__ == "__main__":
    main()
