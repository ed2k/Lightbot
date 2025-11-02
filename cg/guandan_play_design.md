# Guandan AI Strategy Finder - Design Document

## Executive Summary

Design for a computer program to find optimal play strategies in Guandan (掼蛋). Combines game theory, search algorithms, and machine learning.

**Key Challenges:**
- 108-card state space (~10^28 possible hands)
- Imperfect information (hidden opponent hands)
- Partnership coordination
- Multi-objective optimization (win + help partner + maximize promotion)

---

## System Architecture

```
┌──────────────────────────────────────┐
│        Guandan AI System           │
├──────────────────────────────────────┤
│                                    │
│  Game Engine ←→ Search Engine    │
│       ↓              ↓           │
│  State Manager ← Evaluator      │
│       ↓              ↓           │
│  Strategy ←──── ML Model       │
│                                    │
└──────────────────────────────────────┘
```

### Core Components

**1. Game Engine**
- Card/combination representation
- Rule enforcement
- Legal move generation

**2. State Manager**
- Current state tracking
- History tracking
- Opponent hand inference

**3. Search Engine**
- Monte Carlo Tree Search (MCTS)
- Perfect Information Monte Carlo (PIMC)
- Alpha-beta pruning

**4. Evaluator**
- Position evaluation functions
- Hand strength heuristics
- Pattern recognition

**5. ML Model**
- Neural network for evaluation
- Reinforcement learning
- Policy network

**6. Strategy Selector**
- Phase detection (early/mid/endgame)
- Adaptive strategy selection
- Risk management

---

## Game State Representation

```python
class GameState:
    # Core state
    level: int              # 2-A (current level)
    hands: Dict[int, List[Card]]  # Each player's cards
    current_trick: List[Play]
    tricks_won: Dict[Team, int]
    
    # Inferred info
    probable_holdings: Dict[int, CardDistribution]
    phase: str  # 'early', 'middle', 'endgame'
    
    # Partnership
    my_player: int
    partner: int
    opponents: List[int]
```

```python
class Card:
    rank: str  # '2'-'A'
    suit: str  # clubs/diamonds/hearts/spades
    is_joker: bool
    
    def is_level_card(self, level: int) -> bool
    def is_wild(self, level: int) -> bool
    def rank_value(self, level: int) -> int
```

```python
class Combination:
    type: str  # 'single', 'pair', 'straight', 'bomb', etc.
    cards: List[Card]
    power: int  # Relative strength
    
    def beats(self, other: Combination) -> bool
    @staticmethod
    def generate_all(hand: List[Card]) -> List[Combination]
```

---

## Search Algorithms

### 1. Monte Carlo Tree Search (MCTS)

**Best for:** Handling uncertainty and exploration

```python
class MCTSNode:
    state: GameState
    visits: int
    wins: float
    children: List[MCTSNode]
    
    def ucb1_score(self) -> float:
        """Upper Confidence Bound"""
        exploit = self.wins / self.visits
        explore = sqrt(2 * log(parent.visits) / self.visits)
        return exploit + explore

def mcts_search(state: GameState, iterations: int):
    root = MCTSNode(state)
    
    for _ in range(iterations):
        # 1. Selection: pick promising path
        node = root
        while node.children:
            node = max(node.children, key=lambda c: c.ucb1_score())
        
        # 2. Expansion: add new child
        if not node.is_terminal():
            move = random.choice(node.legal_moves())
            node = node.add_child(move)
        
        # 3. Simulation: random playout
        reward = node.simulate_to_end()
        
        # 4. Backpropagation: update statistics
        node.backpropagate(reward)
    
    return max(root.children, key=lambda c: c.visits).move
```

**Advantages:** Anytime algorithm, balances exploration/exploitation  
**Time:** ~5-10 seconds for 10,000 iterations

---

### 2. Perfect Information Monte Carlo (PIMC)

```python
def pimc_search(state: GameState, samples: int):
    move_scores = defaultdict(float)
    
    for _ in range(samples):
        # Sample opponent hands (consistent with observations)
        complete_state = sample_hidden_cards(state)
        
        # Run minimax on full information
        best_move = minimax(complete_state, depth=3)
        move_scores[best_move] += 1
    
    return max(move_scores, key=move_scores.get)
```

---

### 3. Alpha-Beta Minimax

```python
def alphabeta(state, depth, alpha, beta, maximizing):
    if depth == 0 or state.is_terminal():
        return evaluate(state)
    
    if maximizing:
        value = -infinity
        for move in state.legal_moves_ordered():
            value = max(value, alphabeta(
                state.apply(move), depth-1, alpha, beta, False
            ))
            alpha = max(alpha, value)
            if beta <= alpha:
                break  # Prune
        return value
    else:
        # Minimizing (opponent)
        value = infinity
        for move in state.legal_moves_ordered():
            value = min(value, alphabeta(
                state.apply(move), depth-1, alpha, beta, True
            ))
            beta = min(beta, value)
            if beta <= alpha:
                break  # Prune
        return value
```

---

## Evaluation Functions

### Hand Strength

```python
def evaluate_hand(hand: List[Card], level: int) -> float:
    score = 0.0
    
    # High cards
    score += count_jokers(hand) * 50
    score += count_aces(hand) * 20
    score += count_level_cards(hand, level) * 25
    score += count_wild_cards(hand, level) * 40
    
    # Bombs
    bombs = find_bombs(hand, level)
    score += sum(bomb_values(b) for b in bombs)
    
    # Combinations
    score += len(find_straights(hand)) * 15
    score += len(find_pairs(hand)) * 5
    
    # Flexibility (multiple options)
    score += calculate_flexibility(hand) * 10
    
    # Penalty for deadwood (isolated low cards)
    score -= count_deadwood(hand) * 3
    
    return score
```

### Position Evaluation

```python
def evaluate_position(state: GameState) -> float:
    score = 0.0
    
    # Cards remaining (fewer is better)
    my_cards = len(state.hands[state.my_player])
    partner_cards = len(state.hands[state.partner])
    opp_cards = [len(state.hands[o]) for o in state.opponents]
    
    score += (27 - my_cards) * 10
    score += (27 - partner_cards) * 8
    score -= sum(27 - c for c in opp_cards) * 12
    
    # Lead control
    if state.has_lead():
        score += 15
    
    # Partnership synergy (1-2 win potential)
    if my_cards < 5 and partner_cards < 10:
        score += 30
    
    # Hand strength
    score += evaluate_hand(state.hands[state.my_player], state.level)
    
    # Phase-specific
    if state.phase == 'endgame':
        # Focus on finishing order
        if partner_cards < 5:
            score += 50  # Help partner finish 2nd
    
    return score
```

---

## Machine Learning

### Neural Network Architecture

```python
import torch.nn as nn

class GuandanNet(nn.Module):
    def __init__(self):
        super().__init__()
        
        # Card embedding (108 cards + unknown)
        self.card_embed = nn.Embedding(109, 64)
        
        # Hand encoder (LSTM)
        self.hand_encoder = nn.LSTM(
            input_size=64, hidden_size=256, num_layers=2
        )
        
        # State features
        self.state_encoder = nn.Sequential(
            nn.Linear(512 + 20, 512),  # 20 game state features
            nn.ReLU(),
            nn.Linear(512, 256),
            nn.ReLU()
        )
        
        # Policy head (move selection)
        self.policy = nn.Linear(256, MAX_ACTIONS)
        
        # Value head (position evaluation)
        self.value = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
            nn.Tanh()
        )
    
    def forward(self, hand_cards, state_features):
        # Encode hand
        card_embeds = self.card_embed(hand_cards)
        hand_features, _ = self.hand_encoder(card_embeds)
        
        # Combine with state
        combined = torch.cat([hand_features[-1], state_features], dim=1)
        encoding = self.state_encoder(combined)
        
        # Output policy and value
        policy_logits = self.policy(encoding)
        value = self.value(encoding)
        
        return policy_logits, value
```

### Training Strategy

**Approach 1: Reinforcement Learning (Self-Play)**

```python
def train_self_play(model, num_games=10000):
    for episode in range(num_games):
        game = GuandanGame()
        trajectory = []
        
        while not game.done():
            state = game.state()
            policy, value = model(state)
            action = sample(policy)
            
            game.play(action)
            trajectory.append((state, action, value))
        
        reward = game.final_reward()
        
        # Update model with REINFORCE
        update_policy(model, trajectory, reward)
```

**Approach 2: Supervised Learning (Expert Games)**

```python
def train_from_experts(model, expert_games):
    for game in expert_games:
        for state, expert_action in game:
            policy, value = model(state)
            loss = cross_entropy(policy, expert_action)
            loss.backward()
```

**Approach 3: AlphaZero Style**

```python
class AlphaGuandan:
    def train_iteration(self):
        # 1. Self-play with MCTS guided by network
        games = self.self_play(num_games=1000)
        
        # 2. Train network on MCTS policy targets
        self.train_network(games)
        
        # 3. Evaluate new network
        if self.evaluate() > threshold:
            self.update_best_network()
```

---

## Implementation Plan

### Phase 1: Foundation (4 weeks)
- Implement game engine
- Card/combination classes
- Rule validation
- Unit tests

### Phase 2: Rule-Based AI (4 weeks)
- Heuristic player
- Basic strategies:
  - Lead with weakest
  - Save bombs
  - Help partner
  - Block opponents

### Phase 3: Search AI (8 weeks)
- MCTS implementation
- PIMC implementation
- Optimization (pruning, caching)
- Benchmark: 70% win vs rule-based

### Phase 4: ML Integration (8 weeks)
- Collect training data (10K+ games)
- Train neural network
- Integrate with MCTS
- Benchmark: 60% win vs search-only

### Phase 5: Advanced (8 weeks)
- Opponent modeling
- Adaptive strategies
- Partnership communication
- Real-time learning

---

## Performance Optimization

### 1. Move Generation

```python
@lru_cache(maxsize=10000)
def generate_combinations(hand_hash):
    """Cache combination generation"""
    # Use bitwise operations for speed
    # Pre-compute patterns
```

### 2. Parallel Search

```python
import multiprocessing

def parallel_mcts(state, total_iters, num_workers=8):
    pool = multiprocessing.Pool(num_workers)
    results = pool.map(
        lambda _: mcts_search(state, total_iters // num_workers),
        range(num_workers)
    )
    return merge_results(results)
```

### 3. GPU Acceleration

```python
class BatchEvaluator:
    def evaluate_batch(self, states):
        """Batch NN evaluation on GPU"""
        features = torch.stack(states).cuda()
        with torch.no_grad():
            return model(features).cpu()
```

---

## Testing & Validation

### Unit Tests
- Card comparison
- Combination validation
- Rule enforcement
- State transitions

### Integration Tests
- Full game simulation
- AI vs AI matches
- Edge case handling

### Performance Benchmarks
- **Win rate** vs baselines
- **Promotion rate**
- **Move generation speed** (< 100ms)
- **Search time** (< 5s per move)
- **Memory usage** (< 2GB)

### Validation Metrics
- ELO rating
- 1-2 win percentage
- Bomb efficiency
- Partnership coordination score

---

## Key Algorithms Summary

| Algorithm | Pros | Cons | Use Case |
|-----------|------|------|----------|
| **MCTS** | Handles uncertainty, anytime | Slow convergence | Main search engine |
| **PIMC** | Good with imperfect info | Many samples needed | Opponent hand sampling |
| **Alpha-Beta** | Fast with perfect info | Needs good ordering | Determinized search |
| **Deep RL** | Learns patterns | Needs much data | Evaluation function |
| **Supervised** | Fast training | Needs expert data | Bootstrapping |

---

## Future Enhancements

1. **Multi-Agent RL:** Train 4 agents simultaneously
2. **Transfer Learning:** Pre-train on similar games
3. **Explainable AI:** Visualize decision-making
4. **Online Learning:** Adapt during play
5. **Tournament Mode:** Self-play tournaments for diversity
6. **Mobile Deployment:** Optimize for mobile devices

---

## References

- **AlphaGo/AlphaZero Papers** - Monte Carlo Tree Search + Deep RL
- **Libratus (Poker AI)** - Imperfect information games
- **Bridge AI Research** - Partnership game strategies
- **Game Theory** - Nash equilibrium in card games

---

*Last Updated: October 2024*