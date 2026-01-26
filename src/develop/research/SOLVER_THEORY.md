# LightBot Solver Theory

## Search Approaches

### 1. BFS/IDS (Basic Solvers)

**Files:** `solvers/bfs_solver.py`, `solvers/ids_solver.py`

- Breadth-first or iterative deepening over flat instruction sequences
- Only basic instructions: walk, jump, light, turnLeft, turnRight
- No procedure support
- Results: Solved 4/10 levels, 3 gold medals

### 2. Procedure Solver

**File:** `solvers/procedure_solver.py`

- Iterative deepening on **total program size**: |MAIN| + |PROC1| + |PROC2|
- For each size N, enumerates all distributions (main_size, p1_size, p2_size) where sum = N
- Complexity: O(7^N) programs to test (7 instructions including proc calls)
- Results: Same solve rate but better instruction counts when it works

### 3. Fast Procedure Solver

**File:** `solvers/fast_procedure_solver.py`

Optimizations over basic procedure solver:
- **Structure preference:** Tries simpler structures first (no procs → one proc → two procs)
- **Action requirement:** Procedures must contain at least one action (walk/jump/light)
- **Smart ordering:** Instructions ordered by usefulness (walk/jump first, turns last)

---

## Loop Detection

### 1. Step Limiting (Runtime)

**Location:** `lightbot/executor.py:72`

```python
while queue and steps < self.max_steps:  # default 1000
```

Simple but effective: stops execution after max_steps regardless of progress.

### 2. Static Pattern Rejection (Compile-time)

**Location:** `solvers/procedure_solver.py:215-222`

```python
# Reject infinite self-recursion
if program.proc1 == [Instruction.PROC1]:
    return False
if program.proc2 == [Instruction.PROC2]:
    return False

# Reject mutual infinite recursion
if program.proc1 == [Instruction.PROC2] and program.proc2 == [Instruction.PROC1]:
    return False
```

### 3. State-Based Loop Detection (Runtime)

**Location:** `solvers/procedure_solver.py:381-385` (OptimizedProcedureSolver)

```python
state = self.engine.get_state_hash()
if state in visited_states:
    return False, None  # Loop detected - same state reached twice
visited_states.add(state)
```

State hash includes: bot position, bot direction, lights status.

### Limitations

Current detection misses:
- Loops that change state but never make progress (e.g., walking in circles)
- Long loops that exceed step limit before repeating state

---

## Proc1/Proc2 Placement Patterns

### Why Procedures Matter

Procedures enable **recursion** for repetitive map patterns. Example from Level 4:

| Approach | Program | Instructions |
|----------|---------|--------------|
| Without procs | `[walk, walk, walk, walk, walk, light]` | 6 |
| With procs | `MAIN=[proc1], P1=[walk, light, proc1]` | 4 |

### Pattern Categories

#### 1. Tail Recursion
```
MAIN = [proc1]
P1 = [action, action, ..., proc1]
```
Repeats action sequence until map boundary stops execution.
Use case: Straight lines, repeated single-direction movement.

#### 2. Counted Iteration (via nesting)
```
MAIN = [proc1, proc1, proc1]
P1 = [walk, walk, light]
```
Explicit repetition in MAIN for fixed iteration count.

#### 3. Mutual Recursion
```
MAIN = [proc1]
P1 = [action_A, proc2]
P2 = [action_B, proc1]
```
Alternating patterns (e.g., zig-zag movement).

#### 4. Nested Patterns
```
MAIN = [proc1]
P1 = [proc2, turn, proc1]
P2 = [walk, walk, light]
```
Outer loop (P1) calls inner pattern (P2) repeatedly.

### Theoretical Considerations

**Expressiveness:** With tail recursion, procedures can express:
- Unbounded repetition (repeat until boundary)
- Complex patterns through mutual recursion
- Nested loops for 2D traversal

**Search Space:** For program size N with 7 instruction types:
- Without procs: O(5^N) programs
- With procs: O(7^N) programs, but solutions are often smaller

**Trade-off:** Procedures increase search space per size but reduce minimum solution size.

---

## Current Performance

From `results.txt`:

| Level | Gold | Basic | Procedure | Notes |
|-------|------|-------|-----------|-------|
| 0 | 3 | 2 | 2 | Simple, no procs needed |
| 1 | 5 | - | TIMEOUT | Complex pattern |
| 2 | 6 | 7 | 7 | No proc benefit |
| 3 | 4 | 4 | 4 | Linear path |
| 4 | 7 | 6 | **4** | Proc recursion helps |
| 5-9 | - | - | TIMEOUT | Too complex |

**Bottleneck:** 6/10 levels timeout at ~3.4M programs tested.

---

## Potential Improvements

### 1. Cross-Program State Pruning
Cache execution traces across programs. If program A reaches states {S1, S2, S3} without solving, skip programs that would reach subset of these states.

### 2. Grammar-Based Generation
Instead of enumerating all instruction combinations, use a grammar that only generates syntactically meaningful programs:
- Require procedures to be reachable from MAIN
- Require recursion to have base case (action before self-call)
- Avoid symmetric programs (P1 and P2 interchangeable)

### 3. Heuristic Search
Use beam search or A* with heuristic:
- h(state) = distance to nearest unlit light
- h(state) = number of unlit lights remaining
- Prefer programs that light more tiles earlier

### 4. Pattern Recognition
Analyze map structure to suggest likely patterns:
- Long straight paths → tail recursion
- Grid patterns → nested loops
- Spiral patterns → turn + recurse

### 5. Symmetry Breaking
Avoid testing equivalent programs:
- `[turnLeft, turnLeft, turnLeft, turnLeft]` = `[]`
- `[proc1]` with `P1=[walk]` = `[walk]`
- Canonical form for turn sequences
