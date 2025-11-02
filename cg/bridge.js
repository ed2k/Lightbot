class BridgeGame {
    constructor() {
        this.suits = ['♣', '♦', '♥', '♠'];
        this.values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.players = ['North', 'East', 'South', 'West'];
        this.hands = { North: [], East: [], South: [], West: [] };
        this.currentPlayer = 0;
        this.dealer = 0;
        this.phase = 'bidding';
        this.bids = [];
        this.contract = null;
        this.declarer = null;
        this.currentTrick = [];
        this.tricksWon = { NS: 0, EW: 0 };
        this.leadSuit = null;
        this.viewMode = 'bidding'; // 'bidding' or 'cards'
        this.dummyRevealed = false; // Track if dummy has been revealed
        
        this.initGame();
    }

    initGame() {
        this.dealCards();
        this.renderHands();
        this.createBiddingButtons();
        this.updateDisplay();
        this.startBidding();
    }

    dealCards() {
        const deck = [];
        for (let suit of this.suits) {
            for (let value of this.values) {
                deck.push({ 
                    suit, 
                    value, 
                    color: (suit === '♥' || suit === '♦') ? 'red' : 'black' 
                });
            }
        }

        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        // Deal 13 cards to each player
        this.hands.North = deck.slice(0, 13).sort((a, b) => this.compareCards(a, b));
        this.hands.East = deck.slice(13, 26).sort((a, b) => this.compareCards(a, b));
        this.hands.South = deck.slice(26, 39).sort((a, b) => this.compareCards(a, b));
        this.hands.West = deck.slice(39, 52).sort((a, b) => this.compareCards(a, b));
    }

    compareCards(a, b) {
        const suitOrder = this.suits.indexOf(b.suit) - this.suits.indexOf(a.suit);
        if (suitOrder !== 0) return suitOrder;
        return this.values.indexOf(b.value) - this.values.indexOf(a.value);
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
        
        // Check if current player is the declarer or dummy
        const currentPlayerName = this.players[this.currentPlayer];
        const isDeclarerPlaying = this.phase === 'playing' && currentPlayerName === this.declarer;
        const isDummyPlaying = this.phase === 'playing' && this.isDummy(currentPlayerName);
        const isDeclarerOrDummyPlaying = isDeclarerPlaying || isDummyPlaying;
        
        for (let i = 0; i < positions.length; i++) {
            const position = positions[i];
            const player = rotatedPlayers[i];
            const handElement = document.getElementById(`hand-${position}`);
            const nameElement = document.getElementById(`name-${position}`);
            
            handElement.innerHTML = '';
            nameElement.style.display = '';
            
            // Update player name
            nameElement.textContent = player + (i === 0 ? ' (You)' : '');
            
            const hand = this.hands[player];
            
            // Show cards for South position (current player) and opposite hand if declarer/dummy is playing
            const isDummy = this.phase === 'playing' && this.isDummy(player);
            const isDeclarer = this.phase === 'playing' && player === this.declarer;
            const isOppositeHand = i === 2 && isDeclarerOrDummyPlaying; // North position when declarer/dummy plays
            const shouldShowCards = i === 0 || (isDummy && this.dummyRevealed) || (isDeclarer && this.dummyRevealed && isDummyPlaying);
            
            if (shouldShowCards) {
                for (let j = 0; j < hand.length; j++) {
                    const card = hand[j];
                    const cardElement = document.createElement('div');
                    cardElement.className = `card ${card.color}`;
                    cardElement.innerHTML = `<div>${card.value}${card.suit}</div>`;
                    // Allow clicking on both declarer and dummy cards when either is playing
                    if (this.phase === 'playing' && (i === 0 || isOppositeHand)) {
                        cardElement.onclick = () => this.playCard(player, j);
                    } else if (this.phase === 'bidding' && i === 0) {
                        // Show cards during bidding for current player
                    }
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

    isDummy(player) {
        if (!this.declarer) return false;
        const declarerIndex = this.players.indexOf(this.declarer);
        const dummyIndex = (declarerIndex + 2) % 4;
        return player === this.players[dummyIndex];
    }

    createBiddingButtons() {
        const container = document.getElementById('bidding-buttons');
        container.innerHTML = '';
        
        const levels = [1, 2, 3, 4, 5, 6, 7];
        const strains = ['♣', '♦', '♥', '♠', 'NT'];
        
        for (let level of levels) {
            for (let strain of strains) {
                const button = document.createElement('button');
                button.className = 'bid-button';
                button.textContent = `${level}${strain}`;
                button.onclick = () => this.makeBid(`${level}${strain}`);
                container.appendChild(button);
            }
        }
    }

    startBidding() {
        this.currentPlayer = this.dealer;
        this.updateActivePlayer();
        this.renderHands();
        this.addBidToHistory('Bidding starts...');
    }

    makeBid(bid) {
        if (this.phase !== 'bidding') return;
        
        const player = this.players[this.currentPlayer];
        
        if (!this.isValidBid(bid)) {
            alert('Invalid bid! Must be higher than previous bid.');
            return;
        }
        
        this.bids.push({ player, bid });
        this.addBidToHistory(`${player}: ${bid}`);
        
        // Log the bid
        addToGameLog(player, 'bid', bid);
        
        if (this.checkBiddingEnd()) {
            this.endBidding();
            return;
        }
        
        this.currentPlayer = (this.currentPlayer + 1) % 4;
        this.updateActivePlayer();
        this.renderHands();
    }


    calculateHCP(hand) {
        let points = 0;
        for (let card of hand) {
            if (card.value === 'A') points += 4;
            else if (card.value === 'K') points += 3;
            else if (card.value === 'Q') points += 2;
            else if (card.value === 'J') points += 1;
        }
        return points;
    }

    getLongestSuit(hand) {
        const counts = { '♣': 0, '♦': 0, '♥': 0, '♠': 0 };
        for (let card of hand) {
            counts[card.suit]++;
        }
        let maxSuit = '♣';
        let maxCount = 0;
        for (let suit in counts) {
            if (counts[suit] > maxCount) {
                maxCount = counts[suit];
                maxSuit = suit;
            }
        }
        return maxSuit;
    }

    isValidBid(bid) {
        if (bid === 'Pass') return true;
        
        const lastBid = this.getLastContractBid();
        if (!lastBid) return true;
        
        const level = parseInt(bid[0]);
        const strain = bid.substring(1);
        const lastLevel = parseInt(lastBid[0]);
        const lastStrain = lastBid.substring(1);
        
        const strains = ['♣', '♦', '♥', '♠', 'NT'];
        
        if (level > lastLevel) return true;
        if (level === lastLevel && strains.indexOf(strain) > strains.indexOf(lastStrain)) return true;
        
        return false;
    }

    getLastContractBid() {
        for (let i = this.bids.length - 1; i >= 0; i--) {
            const bid = this.bids[i].bid;
            if (bid !== 'Pass') {
                return bid;
            }
        }
        return null;
    }

    checkBiddingEnd() {
        if (this.bids.length < 4) return false;
        
        const lastThree = this.bids.slice(-3);
        return lastThree.every(b => b.bid === 'Pass');
    }

    endBidding() {
        const contractBid = this.getLastContractBid();
        
        if (!contractBid) {
            this.showMessage('All passed. Click New Deal to start again.');
            return;
        }
        
        // Find declarer
        const strain = contractBid.substring(1);
        for (let bid of this.bids) {
            if (bid.bid.includes(strain)) {
                this.declarer = bid.player;
                break;
            }
        }
        
        this.contract = contractBid;
        this.phase = 'playing';
        this.dummyRevealed = false;
        
        document.getElementById('bidding-area').classList.add('hidden');
        document.getElementById('trick-area').classList.remove('hidden');
        document.getElementById('view-toggle').classList.add('hidden');
        
        document.getElementById('phase').textContent = 'Playing';
        document.getElementById('contract-info').textContent = `${this.contract} by ${this.declarer}`;
        
        // Leader is player to the left of declarer
        const declarerIndex = this.players.indexOf(this.declarer);
        this.currentPlayer = (declarerIndex + 1) % 4;
        
        this.renderHands();
        this.updateActivePlayer();
    }

    addBidToHistory(text) {
        const history = document.getElementById('bidding-history');
        const bidItem = document.createElement('div');
        bidItem.textContent = text;
        history.appendChild(bidItem);
        history.scrollTop = history.scrollHeight;
    }

    playCard(player, cardIndex) {
        if (this.phase !== 'playing') return;
        if (this.players[this.currentPlayer] !== player) return;
        
        const card = this.hands[player][cardIndex];
        
        if (!this.isValidPlay(player, card)) {
            alert('You must follow suit if possible!');
            return;
        }
        
        this.hands[player].splice(cardIndex, 1);
        this.currentTrick.push({ player, card });
        
        // Log the card play
        addToGameLog(player, 'play', card);
        
        if (this.currentTrick.length === 1) {
            this.leadSuit = card.suit;
            // Reveal dummy after opening lead
            this.dummyRevealed = true;
        }
        
        this.renderTrick();
        this.renderHands();
        
        if (this.currentTrick.length === 4) {
            setTimeout(() => this.evaluateTrick(), 1500);
        } else {
            this.currentPlayer = (this.currentPlayer + 1) % 4;
            this.updateActivePlayer();
            this.renderHands();
            this.renderTrick(); // Re-render trick cards at rotated positions
        }
    }


    isValidPlay(player, card) {
        if (this.currentTrick.length === 0) return true;
        
        const hand = this.hands[player];
        const hasSuit = hand.some(c => c.suit === this.leadSuit);
        
        if (!hasSuit) return true;
        return card.suit === this.leadSuit;
    }

    renderTrick() {
        const trickArea = document.getElementById('trick-area');
        trickArea.innerHTML = '';
        
        // Get current rotated positions
        const rotatedPlayers = this.getRotatedPositions();
        const positions = ['south', 'west', 'north', 'east'];
        
        for (let play of this.currentTrick) {
            const cardElement = document.createElement('div');
            // Find which position this player is currently displayed at
            const displayIndex = rotatedPlayers.indexOf(play.player);
            const position = positions[displayIndex];
            
            cardElement.className = `card ${play.card.color} trick-card ${position}`;
            cardElement.innerHTML = `<div>${play.card.value}${play.card.suit}</div>`;
            
            trickArea.appendChild(cardElement);
        }
    }

    evaluateTrick() {
        const trump = this.contract.includes('NT') ? null : this.contract.substring(1);
        
        let winningPlay = this.currentTrick[0];
        let winningValue = this.getCardValue(winningPlay.card);
        
        for (let i = 1; i < this.currentTrick.length; i++) {
            const play = this.currentTrick[i];
            const value = this.getCardValue(play.card);
            
            if (trump && play.card.suit === trump && winningPlay.card.suit !== trump) {
                winningPlay = play;
                winningValue = value;
            } else if (play.card.suit === winningPlay.card.suit && value > winningValue) {
                winningPlay = play;
                winningValue = value;
            }
        }
        
        const winner = winningPlay.player;
        const winnerIndex = this.players.indexOf(winner);
        const team = (winnerIndex % 2 === 0) ? 'NS' : 'EW';
        
        this.tricksWon[team]++;
        
        // Log the trick result
        const trickInfo = `Team ${team} - Total: ${this.tricksWon[team]} tricks`;
        addToGameLog(winner, 'trick', trickInfo);
        
        this.updateDisplay();
        
        this.currentTrick = [];
        this.leadSuit = null;
        this.renderTrick();
        
        this.currentPlayer = winnerIndex;
        
        if (this.hands[this.players[0]].length === 0) {
            this.endHand();
        } else {
            this.updateActivePlayer();
            this.renderHands();
        }
    }

    getCardValue(card) {
        return this.values.indexOf(card.value);
    }

    endHand() {
        const level = parseInt(this.contract[0]);
        const declarerIndex = this.players.indexOf(this.declarer);
        const declarerTeam = (declarerIndex % 2 === 0) ? 'NS' : 'EW';
        const tricksNeeded = 6 + level;
        const tricksMade = this.tricksWon[declarerTeam];
        
        let message;
        if (tricksMade >= tricksNeeded) {
            const overtricks = tricksMade - tricksNeeded;
            message = `Contract made! ${this.declarer} made ${tricksMade} tricks (${overtricks} overtricks)`;
        } else {
            const undertricks = tricksNeeded - tricksMade;
            message = `Contract failed! ${this.declarer} made only ${tricksMade} tricks (${undertricks} down)`;
        }
        
        this.showMessage(message);
        this.phase = 'ended';
        document.getElementById('phase').textContent = 'Hand Complete';
        
        this.updateDisplay();
        document.getElementById('tricks-ns').textContent = this.tricksWon.NS;
        document.getElementById('tricks-ew').textContent = this.tricksWon.EW;
    }

    showMessage(text) {
        const messageArea = document.getElementById('message-area');
        messageArea.textContent = text;
        messageArea.classList.remove('hidden');
    }

    updateDisplay() {
        document.getElementById('tricks-ns').textContent = this.tricksWon.NS;
        document.getElementById('tricks-ew').textContent = this.tricksWon.EW;
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

    toggleView() {
        if (this.phase !== 'bidding') return;
        
        const biddingArea = document.getElementById('bidding-area');
        const toggleButton = document.querySelector('.toggle-button');
        
        if (this.viewMode === 'bidding') {
            this.viewMode = 'cards';
            biddingArea.classList.add('minimized');
            toggleButton.textContent = 'View Bidding';
        } else {
            this.viewMode = 'bidding';
            biddingArea.classList.remove('minimized');
            toggleButton.textContent = 'View Cards';
        }
    }

    newDeal() {
        this.hands = { North: [], East: [], South: [], West: [] };
        this.currentPlayer = 0;
        this.dealer = (this.dealer + 1) % 4;
        this.phase = 'bidding';
        this.bids = [];
        this.contract = null;
        this.declarer = null;
        this.currentTrick = [];
        this.tricksWon = { NS: 0, EW: 0 };
        this.leadSuit = null;
        this.viewMode = 'bidding';
        this.dummyRevealed = false;
        
        document.getElementById('bidding-area').classList.remove('hidden');
        document.getElementById('bidding-area').classList.remove('minimized');
        document.getElementById('trick-area').classList.add('hidden');
        document.getElementById('message-area').classList.add('hidden');
        document.getElementById('view-toggle').classList.remove('hidden');
        document.getElementById('bidding-history').innerHTML = '';
        document.getElementById('phase').textContent = 'Bidding';
        document.getElementById('contract-info').textContent = '-';
        
        const toggleButton = document.querySelector('.toggle-button');
        if (toggleButton) toggleButton.textContent = 'View Cards';
        
        // Clear game log
        clearGameLog();
        
        this.initGame();
    }
}

// ============================================================================
// GAME LOG SYSTEM
// ============================================================================

let gameLog = [];
let logCounter = 0;

function addToGameLog(playerName, action, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
        id: ++logCounter,
        playerName,
        action, // 'bid', 'play', or 'trick'
        data,
        timestamp
    };
    
    gameLog.push(entry);
    renderGameLog();
}

function renderGameLog() {
    const logContainer = document.getElementById('game-log-entries');
    if (!logContainer) return;
    
    if (gameLog.length === 0) {
        logContainer.innerHTML = '<div style="color: #9ca3af; text-align: center; padding: 20px;">No actions yet...</div>';
        return;
    }
    
    // Separate bids and plays
    const bids = gameLog.filter(e => e.action === 'bid');
    const plays = gameLog.filter(e => e.action === 'play');
    const tricks = gameLog.filter(e => e.action === 'trick');
    
    let html = '';
    
    // Bidding Table
    if (bids.length > 0) {
        html += '<div class="log-section"><div class="log-section-title">📋 Bidding</div>';
        html += '<table class="log-table"><thead><tr>';
        html += '<th>North</th><th>East</th><th>South</th><th>West</th>';
        html += '</tr></thead><tbody>';
        
        // Group bids by rounds of 4
        for (let i = 0; i < bids.length; i += 4) {
            html += '<tr>';
            for (let j = 0; j < 4; j++) {
                const bid = bids[i + j];
                if (bid) {
                    const isPass = bid.data === 'Pass';
                    const cellClass = isPass ? 'pass-cell' : 'bid-cell';
                    html += `<td class="${cellClass}">${bid.data}</td>`;
                } else {
                    html += '<td>-</td>';
                }
            }
            html += '</tr>';
        }
        
        html += '</tbody></table></div>';
    }
    
    // Playing Table (group by tricks)
    if (plays.length > 0) {
        html += '<div class="log-section"><div class="log-section-title">🃏 Card Play</div>';
        html += '<table class="log-table"><thead><tr>';
        html += '<th>#</th><th>North</th><th>East</th><th>South</th><th>West</th><th>Winner</th>';
        html += '</tr></thead><tbody>';
        
        // Group plays by tricks (4 cards each)
        for (let i = 0; i < plays.length; i += 4) {
            const trickNum = Math.floor(i / 4) + 1;
            const trickWinner = tricks[trickNum - 1];
            const rowClass = trickWinner ? '' : '';
            
            html += `<tr class="${rowClass}">`;
            html += `<td style="color: #9ca3af;">${trickNum}</td>`;
            
            // Map plays to correct columns based on player position
            const positions = ['North', 'East', 'South', 'West'];
            const roundPlays = {};
            
            for (let j = 0; j < 4 && i + j < plays.length; j++) {
                const play = plays[i + j];
                roundPlays[play.playerName] = play.data;
            }
            
            for (let pos of positions) {
                const card = roundPlays[pos];
                if (card) {
                    const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
                    const isWinner = trickWinner && trickWinner.playerName === pos;
                    const cellClass = `card-cell ${color}` + (isWinner ? ' trick-winner' : '');
                    html += `<td class="${cellClass}">${card.value}${card.suit}</td>`;
                } else {
                    html += '<td>-</td>';
                }
            }
            
            // Winner column
            if (trickWinner && (i + 4 <= plays.length || plays.length % 4 === 0)) {
                const winnerInitial = trickWinner.playerName[0];
                html += `<td style="color: #10b981; font-weight: bold;">${winnerInitial}</td>`;
            } else {
                html += '<td>-</td>';
            }
            
            html += '</tr>';
        }
        
        html += '</tbody></table></div>';
    }
    
    logContainer.innerHTML = html || '<div style="color: #9ca3af; text-align: center; padding: 20px;">No actions yet...</div>';
}

function clearGameLog() {
    gameLog = [];
    logCounter = 0;
    renderGameLog();
}

// ============================================================================
// INITIALIZE GAME
// ============================================================================

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new BridgeGame();
});
