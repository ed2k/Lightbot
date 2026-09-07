class GuandanGame {
    constructor() {
        this.suits = ['♠', '♥', '♣', '♦'];
        this.ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.players = ['South', 'East', 'North', 'West'];
        this.hands = { South: [], East: [], North: [], West: [] };
        this.currentPlayer = 0;
        this.selectedCards = [];
        this.lastPlay = null;
        this.lastPlayer = null;
        this.passCount = 0;
        this.currentLevel = 'A'; // Current level being played
        this.teamLevels = { NS: 'A', EW: 'A' }; // Team levels
        this.finishOrder = []; // Track who finishes first, second, etc.
        this.currentRoundPlays = { South: null, East: null, North: null, West: null }; // Track all plays in current round
        
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
        this.hands.East = deck.slice(27, 54).sort((a, b) => this.compareCards(a, b));
        this.hands.North = deck.slice(54, 81).sort((a, b) => this.compareCards(a, b));
        this.hands.West = deck.slice(81, 108).sort((a, b) => this.compareCards(a, b));
    }

    // Power order: 2=0 ... A=12, level card=13, black joker=14, red joker=15.
    // Sequences (straights/tubes/plates) use NATURAL positions only, so a
    // level 7 straight is 6-7-8-9-10, and 7 never ranks above A inside one.
    static NATURAL_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    getCardPower(card) {
        if (card.isJoker) return card.isSmall ? 14 : 15;
        if (card.rank === this.currentLevel) return 13;
        return GuandanGame.NATURAL_ORDER.indexOf(card.rank);
    }

    isWildCard(card) {
        return !card.isJoker && card.rank === this.currentLevel && card.suit === '♥';
    }

    compareCards(a, b) {
        const diff = this.getCardPower(a) - this.getCardPower(b);
        if (diff !== 0) return diff;
        return this.suits.indexOf(a.suit) - this.suits.indexOf(b.suit);
    }

    getRotatedPositions() {
        // Rotate so current player is always at South position
        const positions = ['south', 'east', 'north', 'west'];
        const rotated = [];
        for (let i = 0; i < 4; i++) {
            const playerIndex = (this.currentPlayer + i) % 4;
            rotated.push(this.players[playerIndex]);
        }
        return rotated;
    }

    renderHands() {
        const rotatedPlayers = this.getRotatedPositions();
        const positions = ['south', 'east', 'north', 'west'];
        
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
        cardElement.dataset.cardId = card.isJoker ? (card.isSmall ? 'BJ' : 'RJ') : `${card.rank}${card.suit}`;
        
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
        const comboType = pattern ? this.patternName(pattern) : 'COMBO';
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
        const pattern = this.identifyPattern(cards);
        if (!pattern) return false;
        if (!this.lastPlay) return true;
        const last = this.identifyPattern(this.lastPlay.cards);
        if (!last) return true;
        return this.beatsPattern(pattern, last);
    }

    // Bomb tiers per the bomb hierarchy:
    // 4-bomb(1) < 5-bomb(2) < straight flush(3) < 6-bomb(4) ... < 10-bomb(8) < joker bomb(9)
    bombTier(length) {
        return length <= 5 ? length - 3 : length - 2;
    }

    static BOMB_TYPES = ['bomb', 'straight_flush', 'joker_bomb'];

    beatsPattern(p, last) {
        const pBomb = GuandanGame.BOMB_TYPES.includes(p.type);
        const lBomb = GuandanGame.BOMB_TYPES.includes(last.type);
        if (pBomb && lBomb) {
            if (p.type === 'joker_bomb') return last.type !== 'joker_bomb';
            if (last.type === 'joker_bomb') return false;
            if (p.tier !== last.tier) return p.tier > last.tier;
            return p.rank > last.rank;
        }
        if (pBomb) return true;
        if (lBomb) return false;
        if (p.type !== last.type) return false;
        if (p.length !== last.length) return false;
        return p.rank > last.rank;
    }

    // Cards left in the current trick must be beaten by the same type (same
    // length for sequences) with a higher rank, or by any bomb.
    identifyPattern(cards) {
        if (!cards || cards.length === 0) return null;

        const jokers = cards.filter(c => c.isJoker);
        const wilds = cards.filter(c => !c.isJoker && this.isWildCard(c));
        const normals = cards.filter(c => !c.isJoker && !this.isWildCard(c));
        const nWild = wilds.length;
        const groups = {};
        for (const c of normals) {
            groups[c.rank] = (groups[c.rank] || 0) + 1;
        }
        const usedRanks = Object.keys(groups);
        const total = cards.length;

        // Jokers only play alone (singles, same-color pairs) or as a joker bomb
        if (jokers.length > 0) {
            if (jokers.length === 4 && normals.length === 0 && nWild === 0) {
                return { type: 'joker_bomb', rank: 15, length: 4, tier: 9 };
            }
            if (normals.length === 0 && nWild === 0 && jokers.length === 2 &&
                jokers[0].isSmall === jokers[1].isSmall) {
                return { type: 'pair', rank: jokers[0].isSmall ? 14 : 15, length: 2 };
            }
            if (jokers.length === 1 && normals.length === 0 && nWild === 0) {
                return { type: 'single', rank: jokers[0].isSmall ? 14 : 15, length: 1 };
            }
            return null;
        }

        if (total === 1) {
            const rank = normals.length ? this.getCardPower(normals[0]) : 13;
            return { type: 'single', rank, length: 1 };
        }

        // Same natural rank (wild cards may top up): pair / triple / bomb.
        // Rank comparisons here are level-aware: a level pair beats an A pair.
        if (usedRanks.length <= 1) {
            const rank = usedRanks.length ? this.getCardPower(normals[0]) : 13;
            if (total === 2) return { type: 'pair', rank, length: 2 };
            if (total === 3) return { type: 'triple', rank, length: 3 };
            if (total >= 4 && total <= 10) {
                return { type: 'bomb', rank, length: total, tier: this.bombTier(total) };
            }
            return null;
        }

        if (total === 5) {
            // Straight flush first: same suit + consecutive natural ranks
            // (A-2-3-4-5 is the weakest straight flush)
            if (normals.length > 0 && normals.every(c => c.suit === normals[0].suit)) {
                const rank = this.matchSequence(groups, nWild, 1, 5, true);
                if (rank !== null) {
                    return { type: 'straight_flush', rank, length: 5, tier: 3 };
                }
            }
            const straight = this.matchSequence(groups, nWild, 1, 5, true);
            if (straight !== null) {
                return { type: 'straight', rank: straight, length: 5 };
            }
            const fh = this.matchFullHouse(groups, nWild);
            if (fh !== null) {
                return { type: 'full_house', rank: fh, length: 5 };
            }
            return null;
        }

        if (total === 6) {
            const tube = this.matchSequence(groups, nWild, 2, 3, true);
            if (tube !== null) {
                return { type: 'tube', rank: tube, length: 6 };
            }
            const plate = this.matchSequence(groups, nWild, 3, 2, true);
            if (plate !== null) {
                return { type: 'plate', rank: plate, length: 6 };
            }
            return null;
        }

        return null;
    }

    // Try to match a sequence of `length` consecutive ranks with `perCount`
    // cards per rank (1=straight/straight flush, 2=tube of pairs, 3=plate of
    // triples). Level cards participate at their natural position; wild cards
    // fill gaps. Matches the reference solver's rank space: A is adjacent to
    // both 2 (A-2-3 low windows) and K (10-J-Q-K-A high windows). Returns the
    // natural power of the top rank of the best (highest) matching window,
    // or null.
    matchSequence(groups, nWild, perCount, length, allowALow) {
        const order = GuandanGame.NATURAL_ORDER;
        let best = null;
        const check = (window) => {
            let deficits = 0;
            for (const rank of window) {
                const c = groups[rank] || 0;
                if (c > perCount) return;
                deficits += perCount - c;
            }
            if (deficits > nWild) return;
            const rank = GuandanGame.NATURAL_ORDER.indexOf(window[window.length - 1]);
            if (best === null || rank > best) best = rank;
        };
        for (let i = 0; i + length <= order.length; i++) {
            check(order.slice(i, i + length));
        }
        if (allowALow) {
            check(['A', ...order.slice(0, length - 1)]);
        }
        return best;
    }

    // Match triple + pair for a full house; wild cards may complete either
    // part. Returns the level-aware power of the triple rank, or null.
    matchFullHouse(groups, nWild) {
        let best = null;
        const consider = (tripleRank) => {
            const rank = this.getCardPower({ rank: tripleRank, isJoker: false });
            if (best === null || rank > best) best = rank;
        };
        for (const r of Object.keys(groups)) {
            const cr = groups[r];
            if (cr > 3) continue;
            const wR = 3 - cr;
            if (wR > nWild) continue;
            const wP = nWild - wR;
            for (const p of Object.keys(groups)) {
                if (p === r) continue;
                if (groups[p] <= 2 && 2 - groups[p] === wP) consider(r);
            }
            if (wP === 2) consider(r); // pair made of two wild cards
        }
        return best;
    }

    patternName(pattern) {
        const names = {
            single: 'SINGLE',
            pair: 'PAIR',
            triple: 'TRIPLE',
            full_house: 'FULL HOUSE',
            straight: 'STRAIGHT',
            tube: 'TUBE',
            plate: 'PLATE',
            straight_flush: 'STRAIGHT FLUSH',
            bomb: `BOMB x${pattern.length}`,
            joker_bomb: 'JOKER BOMB'
        };
        return names[pattern.type] || 'COMBO';
    }

    // Enumerate minimal combos from the hand that beat `last` (a pattern
    // object). Wild cards are only spent to complete a combo, never wasted.
    generateBeatingCandidates(hand, last) {
        if (!last) return [];
        const cands = [];
        const seen = new Set();
        const wilds = hand.filter(c => this.isWildCard(c));
        const normals = hand.filter(c => !c.isJoker && !this.isWildCard(c));
        const jokers = hand.filter(c => c.isJoker);
        const byRank = {};
        const bySuit = {};
        for (const c of normals) {
            (byRank[c.rank] = byRank[c.rank] || []).push(c);
            (bySuit[c.suit] = bySuit[c.suit] || []).push(c);
        }
        const add = (cards) => {
            const p = this.identifyPattern(cards);
            if (!p || !this.beatsPattern(p, last)) return;
            const key = `${p.type}|${p.length}|${p.rank}`;
            if (seen.has(key)) return;
            seen.add(key);
            cands.push({ cards, pattern: p });
        };
        const isBombLast = GuandanGame.BOMB_TYPES.includes(last.type);
        const nonBombTypes = ['single', 'pair', 'triple', 'full_house', 'straight', 'tube', 'plate'];

        if (!isBombLast && nonBombTypes.includes(last.type)) {
            if (last.type === 'single') {
                const usedPowers = new Set();
                for (const c of hand) {
                    const p = this.getCardPower(c);
                    if (p > last.rank && !usedPowers.has(p)) {
                        usedPowers.add(p);
                        add([c]);
                    }
                }
            } else if (last.type === 'pair' || last.type === 'triple') {
                const need = last.type === 'pair' ? 2 : 3;
                for (const r of Object.keys(byRank)) {
                    if (GuandanGame.NATURAL_ORDER.indexOf(r) <= last.rank) continue;
                    const g = byRank[r];
                    if (g.length >= need) {
                        add(g.slice(0, need));
                    } else if (g.length + wilds.length >= need) {
                        add(g.concat(wilds.slice(0, need - g.length)));
                    }
                }
                if (13 > last.rank && wilds.length >= need) {
                    add(wilds.slice(0, need));
                }
            } else if (last.type === 'full_house') {
                for (const r of Object.keys(byRank)) {
                    if (GuandanGame.NATURAL_ORDER.indexOf(r) <= last.rank) continue;
                    const g = byRank[r];
                    const triple = g.length >= 3 ? g.slice(0, 3)
                        : (g.length + wilds.length >= 3 ? g.concat(wilds.slice(0, 3 - g.length)) : null);
                    if (!triple) continue;
                    const restWilds = wilds.slice(triple.length - g.length);
                    const pairRanks = Object.keys(byRank)
                        .filter(x => x !== r)
                        .sort((a, b) => GuandanGame.NATURAL_ORDER.indexOf(a) - GuandanGame.NATURAL_ORDER.indexOf(b));
                    let pair = null;
                    for (const p of pairRanks) {
                        const pg = byRank[p].filter(c => !triple.includes(c));
                        if (pg.length >= 2) { pair = pg.slice(0, 2); break; }
                        if (pg.length + restWilds.length >= 2) { pair = pg.concat(restWilds.slice(0, 2 - pg.length)); break; }
                    }
                    if (!pair && restWilds.length >= 2) pair = restWilds.slice(0, 2);
                    if (pair) add(triple.concat(pair));
                }
            } else {
                const spec = {
                    straight: { perCount: 1, length: 5, allowALow: true },
                    tube: { perCount: 2, length: 3, allowALow: false },
                    plate: { perCount: 3, length: 2, allowALow: false }
                }[last.type];
                for (const cards of this.buildSequenceCandidates(byRank, wilds, spec, last.rank)) {
                    add(cards);
                }
            }
        }

        // Bombs: beat any non-bomb, or a lower/same-tier bomb with lower rank
        for (const r of Object.keys(byRank)) {
            const g = byRank[r];
            const maxLen = Math.min(10, g.length + wilds.length);
            for (let s = 4; s <= maxLen; s++) {
                const tier = this.bombTier(s);
                const beats = isBombLast
                    ? (last.type === 'joker_bomb' ? false
                        : (tier > last.tier || (tier === last.tier && GuandanGame.NATURAL_ORDER.indexOf(r) > last.rank)))
                    : true;
                if (!beats) continue;
                const cards = g.slice(0, Math.min(g.length, s))
                    .concat(wilds.slice(0, Math.max(0, s - g.length)));
                if (cards.length === s) {
                    add(cards);
                    break; // smallest qualifying bomb of this rank
                }
            }
        }

        // Straight flushes (tier 3)
        const sfBeats = !isBombLast || last.type === 'straight_flush' || last.tier < 3;
        if (sfBeats && last.type !== 'joker_bomb') {
            for (const suit of Object.keys(bySuit)) {
                const cards = this.buildStraightFlushCandidate(
                    bySuit[suit], wilds, last.type === 'straight_flush' ? last.rank : -1);
                if (cards) add(cards);
            }
        }

        // Joker bomb
        if (jokers.length === 4 && last.type !== 'joker_bomb') {
            add(jokers.slice());
        }

        cands.sort((a, b) => a.pattern.rank - b.pattern.rank || a.pattern.length - b.pattern.length);
        return cands.slice(0, 30);
    }

    buildSequenceCandidates(byRank, wilds, { perCount, length, allowALow }, minRank) {
        const order = GuandanGame.NATURAL_ORDER;
        const results = [];
        const tryWindow = (window) => {
            const cards = [];
            const availWilds = wilds.slice();
            for (const rank of window) {
                const g = byRank[rank] || [];
                const take = Math.min(g.length, perCount);
                for (let k = 0; k < take; k++) cards.push(g[k]);
                for (let k = take; k < perCount; k++) {
                    if (!availWilds.length) return;
                    cards.push(availWilds.shift());
                }
            }
            results.push(cards);
        };
        for (let i = 0; i + length <= order.length; i++) {
            const window = order.slice(i, i + length);
            if (GuandanGame.NATURAL_ORDER.indexOf(window[window.length - 1]) > minRank) {
                tryWindow(window);
            }
        }
        if (allowALow) {
            const lowTop = order[length - 2];
            if (GuandanGame.NATURAL_ORDER.indexOf(lowTop) > minRank) {
                tryWindow(['A', ...order.slice(0, length - 1)]);
            }
        }
        return results;
    }

    buildStraightFlushCandidate(suitCards, wilds, minRank) {
        const order = GuandanGame.NATURAL_ORDER;
        const byRank = {};
        for (const c of suitCards) byRank[c.rank] = c;
        const tryWindow = (window) => {
            if (GuandanGame.NATURAL_ORDER.indexOf(window[window.length - 1]) <= minRank) return null;
            const cards = [];
            const w = wilds.slice();
            for (const rank of window) {
                if (byRank[rank]) { cards.push(byRank[rank]); continue; }
                if (w.length) { cards.push(w.shift()); continue; }
                return null;
            }
            return cards;
        };
        for (let i = 0; i + 5 <= order.length; i++) {
            const cards = tryWindow(order.slice(i, i + 5));
            if (cards) return cards;
        }
        return tryWindow(['A', ...order.slice(0, 4)]);
    }

    // Solver-based hint, following Bobgy/poker-guandan-strategy: play to
    // minimize the number of hands needed to finish the remaining cards.
    getSolverMove(hand, lastPlay) {
        const mainRank = GuandanStrategy.convertLevelToValue(this.currentLevel);
        const toRaw = (cards) => cards.map(c => GuandanStrategy.convertCardToRaw(c));
        const handsNeeded = (cards) => GuandanStrategy.calc({
            cards: toRaw(cards),
            mainRank,
            morePlans: false,
            scorer: 'HANDS'
        })[0].score;

        if (!lastPlay) {
            const plan = GuandanStrategy.calc({
                cards: toRaw(hand),
                mainRank,
                morePlans: false,
                scorer: 'HANDS'
            })[0];
            // Bombs/straight flushes are ~free hands; prefer leading a bounded
            // play, and lead the weakest one to keep control of later tricks.
            const FREE_TYPES = [8, 9, 10]; // straight flush, bombs, joker bomb
            const bounded = plan.plays.filter(p => !FREE_TYPES.includes(p.playRank.type));
            const pool = bounded.length ? bounded : plan.plays;
            pool.sort((a, b) => a.playRank.rank - b.playRank.rank || a.playRank.type - b.playRank.type);
            const pick = pool[0];
            return {
                pass: false,
                cards: this.mapSolverCardsToHand(pick.cards, hand),
                typeName: getPlayTypeName(pick.playRank.type),
                hands: plan.score,
                note: 'Lead the weakest play of your best decomposition to keep control.'
            };
        }

        const lastPattern = this.identifyPattern(lastPlay.cards);
        if (!lastPattern) return null;
        const candidates = this.generateBeatingCandidates(hand, lastPattern);
        if (candidates.length === 0) {
            return { pass: true, reason: 'No valid move can beat the last play.' };
        }
        const baseHands = handsNeeded(hand);
        let best = null;
        for (const cand of candidates) {
            const rest = hand.filter(c => !cand.cards.includes(c));
            let h;
            try {
                h = handsNeeded(rest);
            } catch (e) {
                continue;
            }
            const wildsUsed = cand.cards.filter(c => this.isWildCard(c)).length;
            const better = best === null
                || h < best.hands
                || (h === best.hands && (wildsUsed < best.wildsUsed
                    || (wildsUsed === best.wildsUsed && cand.cards.length < best.cards.length)));
            if (better) {
                best = Object.assign({}, cand, { hands: h, wildsUsed });
            }
        }
        if (!best) {
            return { pass: true, reason: 'Could not evaluate any beating move.' };
        }
        const lastPlayerIndex = this.players.indexOf(this.lastPlayer);
        const partnerLed = lastPlayerIndex % 2 === 0; // South & North are partners
        if (partnerLed && best.hands >= baseHands && baseHands > 1) {
            return {
                pass: true,
                reason: `${this.lastPlayer} (your partner) leads this trick and no move improves your decomposition. Pass to keep the lead with the team.`,
                baseHands
            };
        }
        return {
            pass: false,
            cards: best.cards,
            typeName: this.patternName(best.pattern),
            hands: best.hands,
            baseHands,
            note: best.hands < baseHands
                ? `Beating now leaves you only ${best.hands} hand${best.hands === 1 ? '' : 's'} to finish.`
                : 'Weakest beat that preserves your hand decomposition.'
        };
    }

    mapSolverCardsToHand(solverCards, hand) {
        const suitMap = { S: '♠', H: '♥', C: '♣', D: '♦' };
        const labels = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K', 14: 'Joker', 15: 'Joker' };
        return solverCards.map(sc => {
            const rankLabel = labels[sc.rank.natural] || String(sc.rank.natural);
            return hand.find(c => {
                if (sc.suit === 'R') return c.isJoker && !c.isSmall;
                if (sc.suit === 'B') return c.isJoker && c.isSmall;
                return !c.isJoker && c.suit === suitMap[sc.suit] && c.rank === rankLabel;
            });
        }).filter(Boolean);
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
            this.currentRoundPlays = { South: null, East: null, North: null, West: null };
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
        const positions = ['south', 'east', 'north', 'west'];
        
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
        const positions = ['south', 'east', 'north', 'west'];
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
        const positions = ['south', 'east', 'north', 'west'];
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
        this.hands = { South: [], East: [], North: [], West: [] };
        this.currentPlayer = 0;
        this.selectedCards = [];
        this.lastPlay = null;
        this.lastPlayer = null;
        this.passCount = 0;
        this.finishOrder = [];
        this.currentRoundPlays = { South: null, East: null, North: null, West: null };
        
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

    static levelFromText(text) {
        const idx = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'].indexOf(text);
        return idx === -1 ? 2 : idx + 2;
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
    aiHelper = new GuandanAI(GuandanAI.levelFromText(game.currentLevel));

    // Add hint button to UI
    addHintButton();
});

function addHintButton() {
    // Check if hint button already exists
    if (document.getElementById('hint-btn')) return;
    
    const controls = document.getElementById('controls-area') || document.body;
    
    const hintBtn = document.createElement('button');
    hintBtn.id = 'hint-btn';
    hintBtn.textContent = '💡 Get Hint';
    hintBtn.className = 'action-button hint-btn';
    hintBtn.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        background: rgba(102, 126, 234, 0.15);
        border-left: 4px solid #667eea;
        border-radius: 8px;
        font-size: 14px;
        color: white;
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
            .hint-area h4 { margin: 0 0 10px 0; color: #a3b8ff; }
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

    aiHelper.level = GuandanAI.levelFromText(game.currentLevel);
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

    let suggestedCards = null;
    let solverOk = false;
    try {
        const move = game.getSolverMove(hand, game.lastPlay);
        if (move && move.pass) {
            solverOk = true;
            hintHTML += `
                <h4>🎯 Recommended Move (min-hands solver)</h4>
                <p><strong>💭 Recommendation:</strong> PASS</p>
                <p><strong>Reason:</strong> ${move.reason || ''}</p>
            `;
        } else if (move && move.cards && move.cards.length > 0) {
            solverOk = true;
            suggestedCards = move.cards;
            const cardsHTML = move.cards.map(card => `
                <span class="hint-card" style="color: ${card.color}">
                    ${card.isJoker ? (card.isSmall ? 'BJ' : 'RJ') : `${card.rank}${card.suit}`}
                </span>
            `).join('');
            hintHTML += `
                <h4>🎯 Recommended Move (min-hands solver)</h4>
                <p><strong>Play:</strong> ${move.typeName}</p>
                <div class="hint-cards">${cardsHTML}</div>
                ${move.hands != null ? `<p><strong>Hands to finish after this play:</strong> ${move.hands}${move.baseHands != null ? ` (now: ${move.baseHands})` : ''}</p>` : ''}
                ${move.note ? `<p><strong>💡 Why:</strong> ${move.note}</p>` : ''}
            `;
        }
    } catch (e) {
        console.error('Solver hint error:', e);
    }

    if (!solverOk) {
        // Fall back to the legacy heuristic hint
        const hint = aiHelper.getHint(hand, game.lastPlay, hand.length);
        if (hint.action === 'pass') {
            hintHTML += `
                <p><strong>💭 Recommendation:</strong> ${hint.recommendation}</p>
                <p><strong>Reason:</strong> ${hint.reason}</p>
            `;
        } else {
            suggestedCards = hint.move.cards;
            hintHTML += `
                <p><strong>🎯 Recommended Move (heuristic fallback):</strong> ${hint.move.type.toUpperCase()}</p>
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
    }

    // Best hand decompositions from the min-hands solver (the "split cards"
    // approach of Bobgy's poker-guandan-strategy)
    try {
        const rawCards = hand.map(card => GuandanStrategy.convertCardToRaw(card));
        const mainRankValue = GuandanStrategy.convertLevelToValue(game.currentLevel);
        const plans = GuandanStrategy.calc({
            cards: rawCards,
            mainRank: mainRankValue,
            morePlans: true,
            scorer: 'HANDS'
        });

        if (plans && plans.length > 0) {
            hintHTML += `
                <hr style="margin: 15px 0; border: none; border-top: 1px solid #667eea;">
                <h4 style="margin-bottom: 10px; color: #fbbf24;">🃏 Best Hand Decompositions (min ${plans[0].score} hands${plans.length > 1 ? `, ${plans.length} variants` : ''})</h4>
            `;

            const numToShow = Math.min(plans.length, 3);
            for (let i = 0; i < numToShow; i++) {
                hintHTML += `
                    <div style="margin-top: 12px; background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.3);">
                        <div style="font-weight: bold; color: #a3b8ff; margin-bottom: 8px; font-size: 13px; display: flex; justify-content: space-between;">
                            <span>Plan #${i + 1}</span>
                            <span style="font-size: 12px; color: #fbbf24;">Hands: ${plans[i].score}</span>
                        </div>
                        ${formatSplitPlan(plans[i])}
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error("Strategy solver error:", e);
        hintHTML += `
            <hr style="margin: 15px 0; border: none; border-top: 1px solid #667eea;">
            <p style="color: #ef4444;">Could not run split cards solver: ${e.message}</p>
        `;
    }

    // Show combo breakdown
    if (Object.keys(analysis.comboTypes).length > 0) {
        hintHTML += `
            <hr style="margin: 15px 0; border: none; border-top: 1px solid #667eea;">
            <p><strong>📋 Heuristic Combo Breakdown:</strong></p>
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
    if (suggestedCards) {
        highlightSuggestedCards(suggestedCards);
    }
}

function formatSplitPlan(plan) {
    const sortedPlays = [...plan.plays].sort((a, b) => a.playRank.type - b.playRank.type);
    
    const suitSymbolMap = { 'S': '♠', 'H': '♥', 'C': '♣', 'D': '♦', 'R': 'Joker', 'B': 'joker' };
    const rankLabelMap = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K', 14: 'B-Joker', 15: 'R-Joker' };
    
    return sortedPlays.map(play => {
        const comboName = getPlayTypeName(play.playRank.type);
        const cardsText = play.cards.map(c => {
            const isRed = (c.suit === 'H' || c.suit === 'D' || c.suit === 'R');
            const suitText = suitSymbolMap[c.suit] || c.suit;
            const rankText = rankLabelMap[c.rank.natural] || c.rank.natural;
            
            if (c.suit === 'R' || c.suit === 'B') {
                return `<span style="color: ${isRed ? '#dc2626' : '#111827'}; font-weight: bold; background: white; padding: 2px 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px; margin: 0 1px;">${c.suit === 'R' ? 'Red Joker' : 'Black Joker'}</span>`;
            }
            
            return `<span style="color: ${isRed ? '#dc2626' : '#111827'}; font-weight: bold; background: white; padding: 2px 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px; margin: 0 1px;">${rankText}${suitText}</span>`;
        }).join(' ');
        
        return `<div style="margin: 6px 0; display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap;">
            <strong style="color: #a3b8ff; min-width: 90px; display: inline-block; font-size: 12px; margin-top: 2px;">${comboName}:</strong>
            <span style="display: flex; flex-wrap: wrap; gap: 2px;">${cardsText}</span>
        </div>`;
    }).join('');
}

function getPlayTypeName(type) {
    const names = {
        1: 'Single',
        2: 'Pair',
        3: 'Triple',
        4: 'Full House',
        5: 'Straight',
        6: 'Tube',
        7: 'Plate',
        8: 'Straight Flush',
        9: 'Bomb',
        10: 'Joker Bomb'
    };
    return names[type] || 'Combo';
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
    
    // Highlight suggested cards in the rendered hand (South position)
    const handArea = document.getElementById('hand-south');
    if (handArea) {
        const ids = new Set(cards.map(c => c.isJoker ? (c.isSmall ? 'BJ' : 'RJ') : `${c.rank}${c.suit}`));
        for (const el of handArea.children) {
            if (ids.has(el.dataset.cardId)) {
                el.classList.add('card-highlight');
            }
        }
    }
}
