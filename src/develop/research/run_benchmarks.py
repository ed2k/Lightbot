#!/usr/bin/env python3
"""Run solvers on all levels and save results to a file."""

import sys
import time
import json
from datetime import datetime

from lightbot.engine import LightBotEngine
from lightbot.levels import get_level_count, LEVELS
from lightbot.instructions import instructions_to_str
from lightbot.executor import Program, ProgramExecutor, format_program
from solvers.bfs_solver import BFSSolver
from solvers.fast_procedure_solver import FastProcedureSolver


def run_basic_solver(level_index: int, max_instructions: int = 15) -> dict:
    """Run BFS solver on a level."""
    engine = LightBotEngine(level_index)
    gold = engine.get_gold_threshold()
    lights = len(engine.light_positions)

    solver = BFSSolver(engine)
    start = time.time()
    solution, stats = solver.solve_with_stats(max_instructions)
    elapsed = time.time() - start

    result = {
        "level": level_index,
        "solver": "BFS",
        "gold_threshold": gold,
        "num_lights": lights,
        "time_seconds": round(elapsed, 3),
        "states_explored": stats.get("states_explored", 0),
    }

    if solution:
        result["solved"] = True
        result["instructions"] = len(solution)
        result["solution"] = instructions_to_str(solution)
        result["achieved_gold"] = len(solution) <= gold
    else:
        result["solved"] = False
        result["instructions"] = None
        result["solution"] = None
        result["achieved_gold"] = False

    return result


def run_procedure_solver(level_index: int, max_size: int = 8, timeout: float = 30.0) -> dict:
    """Run procedure solver on a level with timeout."""
    import signal

    engine = LightBotEngine(level_index)
    gold = engine.get_gold_threshold()
    lights = len(engine.light_positions)

    solver = FastProcedureSolver(engine, max_exec_steps=100)
    start = time.time()

    program = None
    stats = {"programs_tested": 0}
    timed_out = False

    # Try each size incrementally with time check
    for size in range(1, max_size + 1):
        if time.time() - start > timeout:
            timed_out = True
            break

        # Search this size
        result = solver._search_size_fast(size)
        if result is not None:
            program = result
            stats["programs_tested"] = solver.programs_tested
            break
        stats["programs_tested"] = solver.programs_tested

    elapsed = time.time() - start

    result = {
        "level": level_index,
        "solver": "Procedure",
        "gold_threshold": gold,
        "num_lights": lights,
        "time_seconds": round(elapsed, 3),
        "programs_tested": stats.get("programs_tested", 0),
        "timed_out": timed_out,
    }

    if program:
        # Verify
        executor = ProgramExecutor(LightBotEngine(level_index), max_steps=100)
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
    output_file = "results.txt"
    json_file = "results.json"

    print(f"Running benchmarks on {get_level_count()} levels...")
    print(f"Results will be saved to {output_file} and {json_file}")
    print()

    all_results = {
        "timestamp": datetime.now().isoformat(),
        "num_levels": get_level_count(),
        "basic_solver_results": [],
        "procedure_solver_results": [],
    }

    # Open output file with line buffering
    with open(output_file, "w", buffering=1) as f:
        f.write("LightBot Solver Benchmark Results\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 70 + "\n\n")
        f.flush()

        # Basic solver results
        f.write("BASIC SOLVER (BFS, no procedures)\n")
        f.write("-" * 70 + "\n")
        f.write(f"{'Level':<6} {'Gold':<5} {'Found':<6} {'Instr':<6} {'Status':<8} {'Time':<8} Solution\n")
        f.write("-" * 70 + "\n")

        print("Running basic solver...")
        for level in range(get_level_count()):
            result = run_basic_solver(level, max_instructions=15)
            all_results["basic_solver_results"].append(result)

            status = "GOLD" if result["achieved_gold"] else ("OK" if result["solved"] else "FAIL")
            instr_str = str(result["instructions"]) if result["instructions"] else "-"
            solution_str = result["solution"] if result["solution"] else "Not found"

            line = f"{level:<6} {result['gold_threshold']:<5} {str(result['solved']):<6} {instr_str:<6} {status:<8} {result['time_seconds']:<8.3f} {solution_str}\n"
            f.write(line)
            f.flush()
            print(f"  Level {level}: {status}", flush=True)

        # Summary for basic solver
        basic_solved = sum(1 for r in all_results["basic_solver_results"] if r["solved"])
        basic_gold = sum(1 for r in all_results["basic_solver_results"] if r["achieved_gold"])
        f.write("-" * 70 + "\n")
        f.write(f"Summary: Solved {basic_solved}/{get_level_count()}, Gold {basic_gold}/{get_level_count()}\n\n")

        # Procedure solver results
        f.write("\nPROCEDURE SOLVER (with PROC1/PROC2)\n")
        f.write("-" * 70 + "\n")
        f.write(f"{'Level':<6} {'Gold':<5} {'Found':<6} {'Instr':<6} {'Status':<8} {'Time':<8} Program\n")
        f.write("-" * 70 + "\n")

        print("\nRunning procedure solver (30s timeout per level)...")
        for level in range(get_level_count()):
            result = run_procedure_solver(level, max_size=10, timeout=30.0)
            all_results["procedure_solver_results"].append(result)

            if result["solved"]:
                status = "GOLD" if result["achieved_gold"] else "OK"
            elif result.get("timed_out"):
                status = "TIMEOUT"
            else:
                status = "FAIL"

            instr_str = str(result["instructions"]) if result["instructions"] else "-"

            if result["solved"]:
                prog_str = f"MAIN={result['main']}"
                if result["proc1"]:
                    prog_str += f", P1={result['proc1']}"
                if result["proc2"]:
                    prog_str += f", P2={result['proc2']}"
            elif result.get("timed_out"):
                prog_str = f"Timeout after {result['time_seconds']:.1f}s ({result['programs_tested']} tested)"
            else:
                prog_str = f"Not found ({result['programs_tested']} tested)"

            line = f"{level:<6} {result['gold_threshold']:<5} {str(result['solved']):<6} {instr_str:<6} {status:<8} {result['time_seconds']:<8.3f} {prog_str}\n"
            f.write(line)
            f.flush()
            print(f"  Level {level}: {status} ({result['time_seconds']:.2f}s, {result['programs_tested']} programs)", flush=True)

        # Summary for procedure solver
        proc_solved = sum(1 for r in all_results["procedure_solver_results"] if r["solved"])
        proc_gold = sum(1 for r in all_results["procedure_solver_results"] if r["achieved_gold"])
        proc_timeout = sum(1 for r in all_results["procedure_solver_results"] if r.get("timed_out"))
        proc_total = len(all_results["procedure_solver_results"])
        f.write("-" * 70 + "\n")
        f.write(f"Summary: Solved {proc_solved}/{proc_total}, Gold {proc_gold}/{proc_total}, Timeouts {proc_timeout}/{proc_total}\n\n")

        # Comparison
        f.write("\nCOMPARISON (Procedure vs Basic)\n")
        f.write("-" * 70 + "\n")
        f.write(f"{'Level':<6} {'Gold':<5} {'Basic':<8} {'Proc':<8} {'Improvement':<12}\n")
        f.write("-" * 70 + "\n")

        for i, proc_result in enumerate(all_results["procedure_solver_results"]):
            basic_result = all_results["basic_solver_results"][i]

            basic_instr = basic_result["instructions"] if basic_result["instructions"] else "-"
            proc_instr = proc_result["instructions"] if proc_result["instructions"] else "-"

            if basic_result["instructions"] and proc_result["instructions"]:
                diff = basic_result["instructions"] - proc_result["instructions"]
                if diff > 0:
                    improvement = f"-{diff} ({diff/basic_result['instructions']*100:.0f}%)"
                elif diff < 0:
                    improvement = f"+{-diff}"
                else:
                    improvement = "same"
            else:
                improvement = "-"

            f.write(f"{i:<6} {proc_result['gold_threshold']:<5} {str(basic_instr):<8} {str(proc_instr):<8} {improvement:<12}\n")

        f.write("-" * 70 + "\n")

    # Save JSON results
    with open(json_file, "w") as f:
        json.dump(all_results, f, indent=2)

    print(f"\nResults saved to {output_file} and {json_file}")


if __name__ == "__main__":
    main()
