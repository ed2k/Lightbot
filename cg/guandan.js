class GuandanGame {
    constructor() {
        this.suits = ['♠', '♥', '♣', '♦'];
        this.ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.players = ['South', 'West', 'North', 'East'];
        this.hands = { South: [], West: [], North: [], East: [] };
        this.currentPlayer = 0;
        this.selectedCards = [];
        this.lastPlay = null;
        this.lastPlayer = null;
        this.passCount = 0;
        this.currentLevel = 'A'; // Current level being played
        this.teamLevels = { NS: 'A', EW: 'A' }; // Team levels
        this.finishOrder = []; // Track who finishes first, second, etc.
        this.currentRoundPlays = { South: null, West: null, North: null, East: null }; // Track all plays in current round
        
        this.initGame();
    }

    initGame() {
        this.dealCards();
        this.renderHands();
        this.updateDisplay();
        this.currentPlayer = 0; // South starts
        this.updateActivePlayer();
        this.updatePlayInfo('Your turn! Play any combination.');
    }

    dealCards() {
        const deck = [];
        
        // Create two decks (108 cards total)
        for (let deckNum = 0; deckNum < 2; deckNum++) {
            for (let suit of this.suits) {
                for (let rank of this.ranks) {
                    deck.push({
                        suit,
                        rank,
                        color: (suit === '♥' || suit === '♦') ? 'red' : 'black',
                        isJoker: false
                    });
                }
            }
            // Add jokers
            deck.push({ suit: '', rank: 'Joker', color: 'red', isJoker: true, isSmall: false });
            deck.push({ suit: '', rank: 'joker', color: 'black', isJoker: true, isSmall: true });
        }

        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        // Deal 27 cards to each player
        this.hands.South = deck.slice(0, 27).sort((a, b) => this.compareCards(a, b));
        this.hands.West = deck.slice(27, 54).sort((a, b) => this.compareCards(a, b));
        this.hands.North = deck.slice(54, 81).sort((a, b) => this.compareCards(a, b));
        this.hands.East = deck.slice(81, 108).sort((a, b) => this.compareCards(a, b));
    }

    compareCards(a, b) {
        // Jokers are highest
        if (a.isJoker && !b.isJoker) return -1;
        if (!a.isJoker && b.isJoker) return 1;
        if (a.isJoker && b.isJoker) {
            return a.isSmall ? 1 : -1; // Big joker > small joker
        }

        // Level cards are special
        const aIsLevel = a.rank === this.currentLevel;
        const bIsLevel = b.rank === this.currentLevel;
        if (aIsLevel && !bIsLevel) return -1;
        if (!aIsLevel && bIsLevel) return 1;

        // Compare by rank
        const rankOrder = this.getRankOrder();
        const aRank = rankOrder.indexOf(a.rank);
        const bRank = rankOrder.indexOf(b.rank);
        if (aRank !== bRank) return aRank - bRank;

        // Same rank, compare by suit
        return this.suits.indexOf(a.suit) - this.suits.indexOf(b.suit);
    }

    getRankOrder() {
        // Current level card is highest (after jokers)
        const order = [...this.ranks];
        const levelIndex = order.indexOf(this.currentLevel);
        if (levelIndex !== -1) {
            order.splice(levelIndex, 1);
            order.push(this.currentLevel);
        }
        return order;
    }

    getRotatedPositions() {
        // Rotate so current player is always at South position
        const positions = ['south', 'west', 'north', 'east'];
        const rotated = [];
        for (let i = 0; i < 4; i++) {
            const playerIndex = (this.currentPlayer + i) % 4;
            rotated.push(this.players[playerIndex]);
        }
        return rotated;
    }

    renderHands() {
        const rotatedPlayers = this.getRotatedPositions();
        const positions = ['south', 'west', 'north', 'east'];
        
        for (let i = 0; i < positions.length; i++) {
            const position = positions[i];
            const player = rotatedPlayers[i];
            const handElement = document.getElementById(`hand-${position}`);
            const nameElement = document.getElementById(`name-${position}`);
            
            handElement.innerHTML = '';
            
            // Update player name
            nameElement.textContent = player + (i === 0 ? ' (You)' : '');
            
            const hand = this.hands[player];
            
            // Show cards for South position (current player)
            if (i === 0) {
                for (let j = 0; j < hand.length; j++) {
                    const card = hand[j];
                    const cardElement = this.createCardElement(card, j, player);
                    handElement.appendChild(cardElement);
                }
            } else {
                // Show card count for other positions
                const countElement = document.createElement('div');
                countElement.style.color = 'white';
                countElement.style.fontSize = '18px';
                countElement.style.fontWeight = 'bold';
                countElement.textContent = `${hand.length} cards`;
                handElement.appendChild(countElement);
            }
        }
    }

    createCardElement(card, index, player) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.color}`;
        
        if (card.isJoker) {
            cardElement.innerHTML = `<div class="card-rank">${card.rank}</div>`;
        } else {
            cardElement.innerHTML = `
                <div class="card-rank">${card.rank}</div>
                <div class="card-suit">${card.suit}</div>
            `;
        }
        
        cardElement.onclick = () => this.toggleCardSelection(index, player);
        
        if (this.selectedCards.includes(index)) {
            cardElement.classList.add('selected');
        }
        
        return cardElement;
    }

    toggleCardSelection(index, player) {
        const idx = this.selectedCards.indexOf(index);
        if (idx > -1) {
            this.selectedCards.splice(idx, 1);
        } else {
            this.selectedCards.push(index);
        }
        this.renderHands();
    }

    clearSelection() {
        this.selectedCards = [];
        this.renderHands();
    }

    playSelected() {
        if (this.selectedCards.length === 0) {
            alert('Please select cards to play!');
            return;
        }

        const player = this.players[this.currentPlayer];
        const cards = this.selectedCards.map(i => this.hands[player][i]);
        
        if (!this.isValidPlay(cards)) {
            alert('Invalid card combination!');
            return;
        }

        // Remove played cards
        this.selectedCards.sort((a, b) => b - a);
        for (let idx of this.selectedCards) {
            this.hands[player].splice(idx, 1);
        }

        this.lastPlay = { cards, player };
        this.lastPlayer = player;
        this.passCount = 0;
        this.selectedCards = [];
        this.currentRoundPlays[player] = cards;

        // Log the play
        const pattern = this.identifyPattern(cards);
        const comboType = pattern ? pattern.type.toUpperCase() : 'COMBO';
        addToGameLog(player, 'play', cards, comboType);

        this.renderAllPlays();
        this.renderHands();
        this.updateDisplay();

        if (this.hands[player].length === 0) {
            this.handlePlayerFinished(player);
            return;
        }

        this.nextPlayer();
    }

    isValidPlay(cards) {
        if (cards.length === 0) return false;

        // If no last play, any valid combination is OK
        if (!this.lastPlay) {
            return this.identifyPattern(cards) !== null;
        }

        // Must beat the last play
        const pattern = this.identifyPattern(cards);
        const lastPattern = this.identifyPattern(this.lastPlay.cards);

        if (!pattern || !lastPattern) return false;
        if (pattern.type !== lastPattern.type) return false;
        if (pattern.length !== lastPattern.length) return false;

        return this.comparePatterns(pattern, lastPattern) > 0;
    }

    identifyPattern(cards) {
        if (cards.length === 0) return null;

        const sorted = [...cards].sort((a, b) => this.compareCards(a, b));
        
        // Single
        if (cards.length === 1) {
            return { type: 'single', length: 1, rank: this.getCardValue(sorted[0]) };
        }

        // Pair
        if (cards.length === 2 && sorted[0].rank === sorted[1].rank) {
            return { type: 'pair', length: 2, rank: this.getCardValue(sorted[0]) };
        }

        // Triple
        if (cards.length === 3 && sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) {
            return { type: 'triple', length: 3, rank: this.getCardValue(sorted[0]) };
        }

        // Straight (5+ consecutive cards)
        if (cards.length >= 5) {
            if (this.isStraight(sorted)) {
                return { type: 'straight', length: cards.length, rank: this.getCardValue(sorted[sorted.length - 1]) };
            }
        }

        // For simplicity, accept any combination
        return { type: 'combo', length: cards.length, rank: this.getCardValue(sorted[sorted.length - 1]) };
    }

    isStraight(sorted) {
        const rankOrder = this.getRankOrder();
        for (let i = 1; i < sorted.length; i++) {
            const prevIdx = rankOrder.indexOf(sorted[i - 1].rank);
            const currIdx = rankOrder.indexOf(sorted[i].rank);
            if (currIdx !== prevIdx + 1) return false;
        }
        return true;
    }

    getCardValue(card) {
        if (card.isJoker) return card.isSmall ? 100 : 101;
        if (card.rank === this.currentLevel) return 50;
        const rankOrder = this.getRankOrder();
        return rankOrder.indexOf(card.rank);
    }

    comparePatterns(p1, p2) {
        return p1.rank - p2.rank;
    }

    pass() {
        if (!this.lastPlay) {
            alert('You must play cards to start!');
            return;
        }

        this.passCount++;
        this.updatePlayInfo(`${this.players[this.currentPlayer]} passed.`);
        
        // Log the pass
        addToGameLog(this.players[this.currentPlayer], 'pass');
        
        if (this.passCount === 3) {
            // All others passed, last player who played wins the round
            const winnerIndex = this.players.indexOf(this.lastPlayer);
            this.currentPlayer = winnerIndex;
            this.lastPlay = null;
            this.lastPlayer = null;
            this.passCount = 0;
            this.currentRoundPlays = { South: null, West: null, North: null, East: null };
            this.clearAllPlayAreas();
            this.updatePlayInfo(`${this.players[this.currentPlayer]} wins the round! Play any combination.`);
            this.updateActivePlayer();
            this.renderHands();
            return;
        }

        this.nextPlayer();
    }

    nextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % 4;
        
        // Skip players who finished
        while (this.hands[this.players[this.currentPlayer]].length === 0) {
            this.currentPlayer = (this.currentPlayer + 1) % 4;
        }

        this.updateActivePlayer();
        this.renderHands();
        this.renderAllPlays(); // Re-render played cards at rotated positions
    }


    handlePlayerFinished(player) {
        this.finishOrder.push(player);
        this.updatePlayInfo(`${player} finished! Position: ${this.finishOrder.length}`);

        if (this.finishOrder.length === 3) {
            // Game over
            this.endGame();
        } else {
            this.nextPlayer();
        }
    }

    endGame() {
        const first = this.finishOrder[0];
        const second = this.finishOrder[1];
        
        let message = `Game Over!\n1st: ${first}\n2nd: ${second}\n3rd: ${this.finishOrder[2]}`;
        
        // Check if teammates finished 1st and 2nd
        const firstTeam = (this.players.indexOf(first) % 2 === 0) ? 'NS' : 'EW';
        const secondTeam = (this.players.indexOf(second) % 2 === 0) ? 'NS' : 'EW';
        
        if (firstTeam === secondTeam) {
            message += `\n\nTeam ${firstTeam} wins! Level up!`;
            this.teamLevels[firstTeam] = this.advanceLevel(this.teamLevels[firstTeam]);
        }

        this.showMessage(message);
    }

    advanceLevel(level) {
        const order = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const idx = order.indexOf(level);
        return idx < order.length - 1 ? order[idx + 1] : 'K';
    }

    renderAllPlays() {
        // Clear all play areas first
        this.clearAllPlayAreas();
        
        // Get rotated positions
        const rotatedPlayers = this.getRotatedPositions();
        const positions = ['south', 'west', 'north', 'east'];
        
        // Render each player's cards at their current rotated position
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            const cards = this.currentRoundPlays[player];
            
            if (cards && cards.length > 0) {
                // Find which position this player is currently displayed at
                const displayIndex = rotatedPlayers.indexOf(player);
                if (displayIndex !== -1) {
                    const position = positions[displayIndex];
                    const playArea = document.getElementById(`play-${position}`);
                    playArea.innerHTML = '';

                    for (let card of cards) {
                        const cardElement = document.createElement('div');
                        cardElement.className = `card ${card.color}`;
                        if (card.isJoker) {
                            cardElement.innerHTML = `<div class="card-rank">${card.rank}</div>`;
                        } else {
                            cardElement.innerHTML = `
                                <div class="card-rank">${card.rank}</div>
                                <div class="card-suit">${card.suit}</div>
                            `;
                        }
                        playArea.appendChild(cardElement);
                    }
                }
            }
        }
    }

    clearAllPlayAreas() {
        const positions = ['south', 'west', 'north', 'east'];
        for (let position of positions) {
            const playArea = document.getElementById(`play-${position}`);
            playArea.innerHTML = '';
        }
    }

    updateDisplay() {
        document.getElementById('current-level').textContent = this.currentLevel;
        document.getElementById('display-level').textContent = this.currentLevel;
        document.getElementById('team-ns-level').textContent = this.teamLevels.NS;
        document.getElementById('team-ew-level').textContent = this.teamLevels.EW;
        const currentPlayer = this.players[this.currentPlayer];
        document.getElementById('cards-left').textContent = this.hands[currentPlayer].length;
    }

    updateActivePlayer() {
        // Always highlight South position since that's where current player is shown
        const positions = ['south', 'west', 'north', 'east'];
        for (let position of positions) {
            const nameElement = document.getElementById(`name-${position}`);
            if (position === 'south') {
                nameElement.classList.add('active');
            } else {
                nameElement.classList.remove('active');
            }
        }
    }

    updatePlayInfo(text) {
        document.getElementById('play-info').textContent = text;
    }

    showMessage(text) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = text;
        messageElement.classList.remove('hidden');
    }

    newGame() {
        this.hands = { South: [], West: [], North: [], East: [] };
        this.currentPlayer = 0;
        this.selectedCards = [];
        this.lastPlay = null;
        this.lastPlayer = null;
        this.passCount = 0;
        this.finishOrder = [];
        this.currentRoundPlays = { South: null, West: null, North: null, East: null };
        
        document.getElementById('message').classList.add('hidden');
        document.getElementById('last-play').innerHTML = '';
        this.clearAllPlayAreas();
        
        // Clear game log
        clearGameLog();
        
        this.initGame();
    }
}

// ============================================================================
// GUANDAN AI HINT SYSTEM (Translated from Python)
// ============================================================================

class GuandanAI {
    constructor(level = 2) {
        this.level = level;
        this.ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    }

    // Card evaluation
    getRankValue(card) {
        if (card.isJoker) return card.isSmall ? 900 : 1000;
        if (this.isLevelCard(card)) return 800;
        return this.ranks.indexOf(card.rank) + 2;
    }

    isLevelCard(card) {
        return !card.isJoker && card.rank === this.ranks[this.level - 2];
    }

    isWild(card) {
        return card.suit === '♥' && this.isLevelCard(card);
    }

    // Evaluate hand strength
    evaluateHand(hand) {
        let score = 0;
        for (const card of hand) {
            if (card.isJoker) {
                score += card.isSmall ? 45 : 50;
            } else if (card.rank === 'A') {
                score += 20;
            } else if (this.isLevelCard(card)) {
                score += 25;
            } else if (this.isWild(card)) {
                score += 40;
            }
            score += this.getRankValue(card);
        }
        return score;
    }

    // Find all valid combinations
    findAllCombinations(hand) {
        const combos = [];

        // Singles
        for (const card of hand) {
            combos.push({
                type: 'single',
                cards: [card],
                power: this.getRankValue(card)
            });
        }

        // Group by rank
        const rankGroups = {};
        for (const card of hand) {
            if (!card.isJoker) {
                const key = card.rank;
                if (!rankGroups[key]) rankGroups[key] = [];
                rankGroups[key].push(card);
            }
        }

        // Pairs, Triples, Bombs
        for (const [rank, cards] of Object.entries(rankGroups)) {
            const power = this.getRankValue(cards[0]);
            if (cards.length >= 2) {
                combos.push({ type: 'pair', cards: cards.slice(0, 2), power });
            }
            if (cards.length >= 3) {
                combos.push({ type: 'triple', cards: cards.slice(0, 3), power });
            }
            if (cards.length >= 4) {
                combos.push({ type: 'bomb4', cards: cards.slice(0, 4), power: power * 10 });
            }
            if (cards.length >= 5) {
                combos.push({ type: 'bomb5', cards: cards.slice(0, 5), power: power * 12 });
            }
        }

        // Straights (5+ consecutive)
        combos.push(...this.findStraights(hand));

        // Pairs straight
        combos.push(...this.findPairsStraight(rankGroups));

        // Full house
        combos.push(...this.findFullHouse(rankGroups));

        return combos;
    }

    findStraights(hand) {
        const straights = [];
        const nonJokers = hand.filter(c => !c.isJoker)
            .sort((a, b) => this.ranks.indexOf(a.rank) - this.ranks.indexOf(b.rank));

        for (let len = 5; len <= Math.min(nonJokers.length, 13); len++) {
            for (let i = 0; i <= nonJokers.length - len; i++) {
                const subset = nonJokers.slice(i, i + len);
                const ranks = subset.map(c => this.ranks.indexOf(c.rank));
                const isConsecutive = ranks.every((r, idx) => 
                    idx === 0 || r === ranks[idx - 1] + 1
                );
                if (isConsecutive) {
                    straights.push({
                        type: 'straight',
                        cards: subset,
                        power: ranks[ranks.length - 1]
                    });
                }
            }
        }
        return straights;
    }

    findPairsStraight(rankGroups) {
        const pairsStraight = [];
        const pairs = {};
        for (const [rank, cards] of Object.entries(rankGroups)) {
            if (cards.length >= 2) pairs[rank] = cards.slice(0, 2);
        }

        const pairRanks = Object.keys(pairs).sort((a, b) => 
            this.ranks.indexOf(a) - this.ranks.indexOf(b)
        );

        for (let len = 3; len <= Math.min(pairRanks.length, 13); len++) {
            for (let i = 0; i <= pairRanks.length - len; i++) {
                const subset = pairRanks.slice(i, i + len);
                const indices = subset.map(r => this.ranks.indexOf(r));
                const isConsecutive = indices.every((idx, pos) => 
                    pos === 0 || idx === indices[pos - 1] + 1
                );
                if (isConsecutive) {
                    const cards = subset.flatMap(r => pairs[r]);
                    pairsStraight.push({
                        type: 'pairs_straight',
                        cards: cards,
                        power: indices[indices.length - 1]
                    });
                }
            }
        }
        return pairsStraight;
    }

    findFullHouse(rankGroups) {
        const fullHouses = [];
        const triples = [];
        const pairs = [];

        for (const [rank, cards] of Object.entries(rankGroups)) {
            if (cards.length >= 3) {
                triples.push({ rank, cards: cards.slice(0, 3) });
            }
            if (cards.length >= 2) {
                pairs.push({ rank, cards: cards.slice(0, 2) });
            }
        }

        for (const triple of triples) {
            for (const pair of pairs) {
                if (triple.rank !== pair.rank) {
                    fullHouses.push({
                        type: 'full_house',
                        cards: [...triple.cards, ...pair.cards],
                        power: this.ranks.indexOf(triple.rank)
                    });
                }
            }
        }
        return fullHouses;
    }

    // Check if combo beats another
    beats(combo1, combo2) {
        if (combo1.type === combo2.type) {
            return combo1.power > combo2.power;
        }
        return combo1.type.includes('bomb') && !combo2.type.includes('bomb');
    }

    // Get best move suggestion
    getBestMove(hand, lastPlay = null) {
        const combos = this.findAllCombinations(hand);
        
        if (!lastPlay) {
            // Leading: play weakest
            const singles = combos.filter(c => c.type === 'single');
            if (singles.length > 0) {
                return singles.sort((a, b) => a.power - b.power)[0];
            }
            return combos.sort((a, b) => a.power - b.power)[0];
        }

        // Must beat last play
        const validMoves = combos.filter(c => this.beats(c, lastPlay));
        if (validMoves.length === 0) {
            return null; // Must pass
        }

        // Return weakest valid move
        return validMoves.sort((a, b) => a.power - b.power)[0];
    }

    // Get strategic hint
    getHint(hand, lastPlay = null, cardsLeft = 27) {
        const bestMove = this.getBestMove(hand, lastPlay);
        
        if (!bestMove) {
            return {
                action: 'pass',
                reason: 'No valid moves to beat last play',
                recommendation: 'Pass and wait for next opportunity'
            };
        }

        const handStrength = this.evaluateHand(hand);
        let reason = '';
        let recommendation = '';

        if (cardsLeft > 20) {
            // Early game
            reason = 'Early game: conserve strong cards';
            recommendation = `Play ${bestMove.type} to maintain card advantage`;
        } else if (cardsLeft > 10) {
            // Mid game
            reason = 'Mid game: balance offense and defense';
            if (handStrength > 500) {
                recommendation = `Strong hand! Play ${bestMove.type} aggressively`;
            } else {
                recommendation = `Play ${bestMove.type} carefully`;
            }
        } else {
            // End game
            reason = 'Endgame: finish quickly!';
            recommendation = `Play ${bestMove.type} to empty hand`;
        }

        return {
            action: 'play',
            move: bestMove,
            reason: reason,
            recommendation: recommendation,
            handStrength: Math.round(handStrength)
        };
    }

    // Analyze all possible moves
    analyzePosition(hand, lastPlay = null) {
        const combos = this.findAllCombinations(hand);
        const validMoves = lastPlay 
            ? combos.filter(c => this.beats(c, lastPlay))
            : combos;

        const analysis = {
            totalCombos: combos.length,
            validMoves: validMoves.length,
            handStrength: Math.round(this.evaluateHand(hand)),
            comboTypes: {}
        };

        for (const combo of combos) {
            if (!analysis.comboTypes[combo.type]) {
                analysis.comboTypes[combo.type] = 0;
            }
            analysis.comboTypes[combo.type]++;
        }

        return analysis;
    }
}

// ============================================================================
// GAME LOG SYSTEM
// ============================================================================

let gameLog = [];
let logCounter = 0;

function addToGameLog(playerName, action, cards = null, comboType = null) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
        id: ++logCounter,
        playerName,
        action, // 'play' or 'pass'
        cards,
        comboType,
        timestamp
    };
    
    gameLog.push(entry);
    renderGameLog();
}

function renderGameLog() {
    const logContainer = document.getElementById('game-log-entries');
    if (!logContainer) return;
    
    if (gameLog.length === 0) {
        logContainer.innerHTML = '<div style="color: #9ca3af; text-align: center; padding: 20px;">No plays yet...</div>';
        return;
    }
    
    // Show most recent entries first
    const recentLogs = gameLog.slice(-20).reverse();
    
    logContainer.innerHTML = recentLogs.map(entry => {
        if (entry.action === 'pass') {
            return `
                <div class="log-entry pass">
                    <div>
                        <span class="player-name-log">${entry.playerName}</span>
                        <span class="play-type">PASSED</span>
                    </div>
                    <div class="timestamp">${entry.timestamp}</div>
                </div>
            `;
        } else {
            const cardsHTML = entry.cards.map(card => {
                const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
                const cardText = card.isJoker ? (card.isSmall ? 'BJ' : 'RJ') : `${card.rank}${card.suit}`;
                return `<span class="mini-card ${color}">${cardText}</span>`;
            }).join('');
            
            return `
                <div class="log-entry">
                    <div>
                        <span class="player-name-log">${entry.playerName}</span>
                        played
                        <span class="play-type">${entry.comboType || 'COMBO'}</span>
                    </div>
                    <div class="cards-played">
                        ${cardsHTML}
                    </div>
                    <div class="timestamp">${entry.timestamp}</div>
                </div>
            `;
        }
    }).join('');
    
    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
}

function clearGameLog() {
    gameLog = [];
    logCounter = 0;
    renderGameLog();
}

// ============================================================================
// INITIALIZE GAME WITH AI HINT SYSTEM
// ============================================================================

let game;
let aiHelper;

document.addEventListener('DOMContentLoaded', () => {
    game = new GuandanGame();
    aiHelper = new GuandanAI(2); // Start at level 2
    
    // Add hint button to UI
    addHintButton();
});

function addHintButton() {
    // Check if hint button already exists
    if (document.getElementById('hint-btn')) return;
    
    const controls = document.querySelector('.controls') || document.body;
    
    const hintBtn = document.createElement('button');
    hintBtn.id = 'hint-btn';
    hintBtn.textContent = '💡 Get Hint';
    hintBtn.className = 'btn hint-btn';
    hintBtn.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        margin-left: 10px;
        animation: pulse 2s infinite;
    `;
    
    hintBtn.addEventListener('click', showHint);
    controls.appendChild(hintBtn);
    
    // Add hint display area
    const hintArea = document.createElement('div');
    hintArea.id = 'hint-area';
    hintArea.className = 'hint-area hidden';
    hintArea.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        background: rgba(102, 126, 234, 0.1);
        border-left: 4px solid #667eea;
        border-radius: 8px;
        font-size: 14px;
    `;
    controls.parentElement.appendChild(hintArea);
    
    // Add CSS for pulse animation
    if (!document.getElementById('hint-styles')) {
        const style = document.createElement('style');
        style.id = 'hint-styles';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3); }
                50% { transform: scale(1.05); box-shadow: 0 6px 12px rgba(102, 126, 234, 0.5); }
            }
            .hint-area.hidden { display: none; }
            .hint-area h4 { margin: 0 0 10px 0; color: #667eea; }
            .hint-area p { margin: 5px 0; }
            .hint-cards { 
                display: flex; 
                gap: 5px; 
                margin: 10px 0;
                flex-wrap: wrap;
            }
            .hint-card {
                padding: 5px 10px;
                background: white;
                border-radius: 4px;
                border: 2px solid #667eea;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }
}

function showHint() {
    if (!game || !aiHelper) return;
    
    const currentPlayerName = game.players[game.currentPlayer];
    const hand = game.hands[currentPlayerName];
    
    if (!hand || hand.length === 0) {
        alert('No cards in hand!');
        return;
    }
    
    // Get AI hint
    const hint = aiHelper.getHint(hand, game.lastPlay, hand.length);
    const analysis = aiHelper.analyzePosition(hand, game.lastPlay);
    
    // Display hint
    const hintArea = document.getElementById('hint-area');
    if (!hintArea) return;
    
    let hintHTML = `
        <h4>🤖 AI Strategic Hint</h4>
        <p><strong>Hand Strength:</strong> ${analysis.handStrength} points</p>
        <p><strong>Available Combinations:</strong> ${analysis.totalCombos}</p>
        <p><strong>Valid Moves:</strong> ${analysis.validMoves}</p>
        <hr style="margin: 10px 0; border: none; border-top: 1px solid #667eea;">
    `;
    
    if (hint.action === 'pass') {
        hintHTML += `
            <p><strong>💭 Recommendation:</strong> ${hint.recommendation}</p>
            <p><strong>Reason:</strong> ${hint.reason}</p>
        `;
    } else {
        hintHTML += `
            <p><strong>🎯 Recommended Move:</strong> ${hint.move.type.toUpperCase()}</p>
            <p><strong>💪 Power:</strong> ${hint.move.power}</p>
            <div class="hint-cards">
                ${hint.move.cards.map(card => `
                    <span class="hint-card" style="color: ${card.color}">
                        ${card.rank}${card.suit}
                    </span>
                `).join('')}
            </div>
            <p><strong>📊 Strategy:</strong> ${hint.reason}</p>
            <p><strong>💡 Tip:</strong> ${hint.recommendation}</p>
        `;
    }
    
    // Show combo breakdown
    if (Object.keys(analysis.comboTypes).length > 0) {
        hintHTML += `
            <hr style="margin: 10px 0; border: none; border-top: 1px solid #667eea;">
            <p><strong>📋 Your Hand Analysis:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px;">
        `;
        for (const [type, count] of Object.entries(analysis.comboTypes)) {
            hintHTML += `<li>${type}: ${count}</li>`;
        }
        hintHTML += `</ul>`;
    }
    
    hintArea.innerHTML = hintHTML;
    hintArea.classList.remove('hidden');
    
    // Highlight suggested cards
    if (hint.action === 'play' && hint.move) {
        highlightSuggestedCards(hint.move.cards);
    }
}

function highlightSuggestedCards(cards) {
    // Remove previous highlights
    document.querySelectorAll('.card-highlight').forEach(el => {
        el.classList.remove('card-highlight');
    });
    
    // Add highlight style if not exists
    if (!document.getElementById('highlight-style')) {
        const style = document.createElement('style');
        style.id = 'highlight-style';
        style.textContent = `
            .card-highlight {
                box-shadow: 0 0 20px rgba(102, 126, 234, 0.8) !important;
                transform: translateY(-10px) !important;
                animation: glow 1s ease-in-out infinite alternate;
            }
            @keyframes glow {
                from { box-shadow: 0 0 20px rgba(102, 126, 234, 0.6); }
                to { box-shadow: 0 0 30px rgba(102, 126, 234, 1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Highlight suggested cards (simplified - would need card matching logic)
    console.log('AI suggests playing:', cards.map(c => `${c.rank}${c.suit}`).join(', '));
}
