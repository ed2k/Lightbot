/**
 * Guandan AI Strategy Solver
 * Self-contained module translated from TypeScript in cg/strategy/
 */
(function(global) {
  // === Play Types ===
  const PlayType = {
    UNKNOWN: 0,
    SINGLE: 1,
    PAIR: 2,
    TRIPLE: 3,
    FULL_HOUSE: 4,     // e.g. 555,22
    STRAIGHT: 5,       // e.g. 12345
    TUBE: 6,           // e.g. 33,44,55
    PLATE: 7,          // e.g. 333,444
    STRAIGHT_FLUSH: 8, // e.g. 34567 of same suit
    BOMB_N_TUPLE: 9,   // e.g. 4444, 55555, etc.
    FOUR_JOKER: 10
  };

  // === Constants ===
  const J = 11;
  const Q = 12;
  const K = 13;
  const A = 1;
  const BLACK_JOKER = 14;
  const RED_JOKER = 15;

  const NATURAL_RANK_MIN = A;
  const NATURAL_RANK_MAX = RED_JOKER;

  const NATURAL_RANKS = [
    A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, BLACK_JOKER, RED_JOKER
  ];

  const NATURAL_RANK = {
    [A]: { label: 'A', text: 'A', naturalRank: A },
    2: { label: '2', text: '2', naturalRank: 2 },
    3: { label: '3', text: '3', naturalRank: 3 },
    4: { label: '4', text: '4', naturalRank: 4 },
    5: { label: '5', text: '5', naturalRank: 5 },
    6: { label: '6', text: '6', naturalRank: 6 },
    7: { label: '7', text: '7', naturalRank: 7 },
    8: { label: '8', text: '8', naturalRank: 8 },
    9: { label: '9', text: '9', naturalRank: 9 },
    10: { label: '10', text: '10', naturalRank: 10 },
    [J]: { label: 'J', text: 'J', naturalRank: J },
    [Q]: { label: 'Q', text: 'Q', naturalRank: Q },
    [K]: { label: 'K', text: 'K', naturalRank: K },
    [BLACK_JOKER]: { label: 'Joker', text: 'J', naturalRank: BLACK_JOKER },
    [RED_JOKER]: { label: 'Joker', text: 'J', naturalRank: RED_JOKER },
  };

  function nextRank(rank) {
    const next = rank + 1;
    if (next > RED_JOKER) {
      return undefined;
    }
    return next;
  }

  const NATURAL_RANKS_WITHOUT_JOKERS = NATURAL_RANKS.slice(0, NATURAL_RANKS.length - 2);

  // === Suits ===
  const SUIT_NORMAL = {
    H: { value: 'H', label: '♥', text: '♥', color: 'red' },
    D: { value: 'D', label: '♦', text: '♦', color: 'red' },
    S: { value: 'S', label: '♠', text: '♠', color: 'black' },
    C: { value: 'C', label: '♣', text: '♣', color: 'black' },
  };

  const SUIT_JOKER = {
    B: { value: 'B', label: '', text: 'B', color: 'black' },
    R: { value: 'R', label: '', text: 'R', color: 'red' },
  };

  const SUIT = {
    ...SUIT_NORMAL,
    ...SUIT_JOKER,
  };

  const SUITS = [
    SUIT_NORMAL.H,
    SUIT_NORMAL.S,
    SUIT_NORMAL.C,
    SUIT_NORMAL.D,
  ];

  const SUIT_VALUES = ['S', 'C', 'D', 'H'];

  function parseSuit(suit) {
    if (!SUIT_VALUES.includes(suit)) {
      return [
        undefined,
        `Suit should be one of ${SUIT_VALUES}, but found ${suit}.`,
      ];
    }
    return [suit, undefined];
  }

  const NEXT_SUIT = {
    S: 'C',
    C: 'D',
    D: 'H',
    H: undefined,
  };

  const SUIT_START = 'S';

  function getNextSuit(suit) {
    return NEXT_SUIT[suit];
  }

  // === Parser ===
  function parseRawCards(text) {
    const cards = [];
    for (let i = 0; i < text.length; ) {
      if (text[i] === 'R') {
        if (text[i + 1] !== 'J') {
          throw new Error(
            `R should be followed by J -- red joker in ${text}, position ${i}`
          );
        }
        cards.push({ rank: RED_JOKER, suit: 'R' });
        i += 2;
      } else if (text[i] === 'B') {
        if (text[i + 1] !== 'J') {
          throw new Error(
            `B should be followed by J -- black joker in ${text}, position ${i}`
          );
        }
        cards.push({ rank: BLACK_JOKER, suit: 'B' });
        i += 2;
      } else {
        const parsedSuit = parseSuit(text[i]);
        const [suit, error] = parsedSuit;
        if (error != null) {
          throw new Error(`${error}, in ${text}, position ${i}`);
        }
        if (text[i + 1] === '1' && text[i + 2] === '0') {
          cards.push({ rank: 10, suit });
          i += 3;
        } else if (text[i + 1] === 'A') {
          cards.push({ rank: A, suit });
          i += 2;
        } else if (text[i + 1] === 'J') {
          cards.push({ rank: J, suit });
          i += 2;
        } else if (text[i + 1] === 'Q') {
          cards.push({ rank: Q, suit });
          i += 2;
        } else if (text[i + 1] === 'K') {
          cards.push({ rank: K, suit });
          i += 2;
        } else {
          const rank = text[i + 1].charCodeAt(0) - '0'.charCodeAt(0);
          if (rank < 2 || rank > 9) {
            throw new Error(
              `Rank should be in range [2, 9], but found ${rank}, in ${text}, position ${
                i + 1
              }`
            );
          }
          cards.push({ rank: rank, suit });
          i += 2;
        }
      }
    }
    return cards;
  }

  // === Utilities ===
  function getUsualPowerRank(rank) {
    switch (rank) {
      case RED_JOKER:
        return 14;
      case BLACK_JOKER:
        return 13;
      case A:
        return 12;
      default:
        return rank - 2;
    }
  }

  // === Game Context ===
  class GameContext {
    constructor(mainRank) {
      this.mainRank = mainRank;
    }

    getOrder(rank) {
      if (rank == RED_JOKER) {
        return 14;
      } else if (rank == BLACK_JOKER) {
        return 13;
      } else if (rank == this.mainRank) {
        return 12;
      } else {
        const usualRank = getUsualPowerRank(rank);
        const mainRankUsualRank = getUsualPowerRank(this.mainRank);
        if (usualRank > mainRankUsualRank) {
          return usualRank - 1;
        } else {
          return usualRank;
        }
      }
    }

    isWildCard(card) {
      return card.rank.natural === this.mainRank && card.suit === 'H';
    }
  }

  // === Rank & Card Models ===
  function makeRank({ natural, context }) {
    return {
      natural: natural,
      power: context.getOrder(natural),
    };
  }

  function parseCardRaw(raw, context) {
    return {
      rank: makeRank({ natural: raw.rank, context }),
      suit: raw.suit,
    };
  }

  function cardToText(card) {
    return SUIT[card.suit].text + NATURAL_RANK[card.rank.natural].text;
  }

  function cardRawToText(card) {
    return SUIT[card.suit].text + NATURAL_RANK[card.rank].text;
  }

  function cardToCardRaw(card) {
    return {
      rank: card.rank.natural,
      suit: card.suit,
    };
  }

  function playToText(play) {
    return play.cards.map(cardToText).join('');
  }

  function planToText(plan) {
    return plan.plays.map(playToText);
  }

  // === Scorers ===
  const handsScore = (plan) => plan.score;
  const MAX_SCORE = 1e100;

  const heuristicScore = (plan) => {
    const scoreByPlayType = {};
    plan.plays.forEach((play) => {
      scoreByPlayType[play.playRank.type] =
        scoreByPlayType[play.playRank.type] || 0;
      scoreByPlayType[play.playRank.type] += heuristicScorePlay(play);
    });
    scoreByPlayType[PlayType.SINGLE] = cap(
      scoreByPlayType[PlayType.SINGLE],
      -3,
      MAX_SCORE
    );
    scoreByPlayType[PlayType.PAIR] = cap(scoreByPlayType[PlayType.PAIR], -2, 6);
    scoreByPlayType[PlayType.TRIPLE] = cap(
      scoreByPlayType[PlayType.TRIPLE],
      -0.3,
      6
    );
    scoreByPlayType[PlayType.FULL_HOUSE] = cap(
      scoreByPlayType[PlayType.FULL_HOUSE],
      -1.3,
      3
    );
    scoreByPlayType[PlayType.STRAIGHT] = cap(
      scoreByPlayType[PlayType.STRAIGHT],
      -0.8,
      1.5
    );
    scoreByPlayType[PlayType.TUBE] = cap(scoreByPlayType[PlayType.TUBE], -0.3, 1);
    scoreByPlayType[PlayType.PLATE] = cap(
      scoreByPlayType[PlayType.PLATE],
      -0.2,
      0.3
    );
    return (
      Object.values(scoreByPlayType).reduce(
        (sum, value) => (sum || 0) + (value || 0),
        0
      ) || 0
    );
  };

  function heuristicScorePlay(play) {
    const playRank = play.playRank;
    switch (playRank.type) {
      case PlayType.SINGLE:
        switch (playRank.rank) {
          case 14: // Red Joker
            return -1;
          case 13: // Black Joker
            return -0.8;
          default:
            return linear({ x: 0, y: 1 }, { x: 12, y: -0.2 }, playRank.rank);
        }
      case PlayType.PAIR:
        switch (playRank.rank) {
          case 14: // Red Joker
            return -1;
          case 13: // Black Joker
            return -0.95;
          default:
            if (playRank.rank >= 9) {
              return linear({ x: 9, y: 0 }, { x: 12, y: -0.9 }, playRank.rank);
            } else {
              return linear({ x: 9, y: 0 }, { x: 0, y: 1 }, playRank.rank);
            }
        }
      case PlayType.TRIPLE:
        if (playRank.rank >= 9) {
          return linear({ x: 9, y: 0 }, { x: 12, y: -1 }, playRank.rank);
        } else {
          return linear({ x: 9, y: 0 }, { x: 0, y: 1 }, playRank.rank);
        }
      case PlayType.FULL_HOUSE:
        if (playRank.rank >= 8) {
          return linear({ x: 8, y: 0 }, { x: 12, y: -1 }, playRank.rank);
        } else {
          return linear({ x: 8, y: 0 }, { x: 0, y: 1 }, playRank.rank);
        }
      case PlayType.STRAIGHT:
        if (playRank.rank >= 7) {
          return linear({ x: 7, y: 0 }, { x: 10, y: -1 }, playRank.rank);
        } else {
          return linear({ x: 7, y: 0 }, { x: A, y: 0.8 }, playRank.rank);
        }
      case PlayType.TUBE:
        if (playRank.rank >= 8) {
          return linear({ x: 8, y: 0 }, { x: Q, y: -1 }, playRank.rank);
        } else {
          return linear({ x: 8, y: 0 }, { x: A, y: 0.5 }, playRank.rank);
        }
      case PlayType.PLATE:
        if (playRank.rank >= 6) {
          return linear({ x: 6, y: 0 }, { x: K, y: -1 }, playRank.rank);
        } else {
          return linear({ x: 6, y: 0 }, { x: A, y: 0.3 }, playRank.rank);
        }
      case PlayType.STRAIGHT_FLUSH:
      case PlayType.BOMB_N_TUPLE:
      case PlayType.FOUR_JOKER:
        return -1;
      default:
        throw new Error('Unknown play rank type');
    }
  }

  function linear(start, end, x) {
    return ((end.y - start.y) / (end.x - start.x)) * (x - start.x) + start.y;
  }

  function cap(x, min, max) {
    if (x == null) {
      return 0;
    }
    if (x < min) {
      return min;
    }
    if (x > max) {
      return max;
    }
    return x;
  }

  // === Combinatorics Iteration Engine ===
  const DEBUG = false;
  const MAX_PLANS = 10000000;

  const NEXT_PLAY_TYPE = {
    [PlayType.STRAIGHT_FLUSH]: PlayType.BOMB_N_TUPLE,
    [PlayType.BOMB_N_TUPLE]: PlayType.PLATE,
    [PlayType.PLATE]: PlayType.TUBE,
    [PlayType.TUBE]: PlayType.STRAIGHT,
    [PlayType.STRAIGHT]: PlayType.PAIR,
    [PlayType.PAIR]: PlayType.TRIPLE,
    [PlayType.TRIPLE]: undefined,
  };

  function nextPlayType(playType) {
    return NEXT_PLAY_TYPE[playType];
  }

  const ITERATOR_STATE_START = {
    rank: A,
    suit: SUIT_START,
    type: PlayType.STRAIGHT_FLUSH,
  };

  function nextIteratorState(now) {
    const next = nextRank(now.rank);
    if (next != null) {
      return {
        ...now,
        rank: next,
      };
    }
    if (now.suit) {
      console.assert(now.type === PlayType.STRAIGHT_FLUSH);
      const nextSuit = getNextSuit(now.suit);
      if (nextSuit != null) {
        return {
          ...now,
          rank: A,
          suit: nextSuit,
        };
      }
    }
    const nextType = nextPlayType(now.type);
    if (nextType != null) {
      return {
        ...now,
        rank: A,
        type: nextType,
        suit: undefined,
      };
    }
    return undefined;
  }

  function iteratePlans({
    cards,
    collectPlan,
    context: gameContext,
    mode,
    boundFn,
    searchState,
  }) {
    const cardsByRank = organize(cards, gameContext);
    iterateImp({
      cardsByRank,
      context: {
        collectPlan,
        game: gameContext,
        debug: DEBUG,
        mode,
        boundFn,
        searchState,
      },
    });
  }

  const WILD_CARD = 0;

  function organize(cards, context) {
    const organized = {};
    cards.forEach((card) => {
      const rank = context.isWildCard(card) ? WILD_CARD : card.rank.natural;
      organized[rank] = organized[rank] || [];
      organized[rank].push(card);
    });
    return organized;
  }

  function takeCard(cards, rank, count = 1) {
    console.assert(count >= 1);
    const rankCards = cards[rank] || [];
    if (count <= rankCards.length) {
      const taken = rankCards.slice(0, count);
      cards[rank] = rankCards.slice(count);
      return taken;
    }
    const wildCards = cards[WILD_CARD];
    const wildCardsNeeded = count - rankCards.length;
    if (!wildCards || wildCardsNeeded > wildCards.length) {
      return undefined;
    }
    const taken = rankCards.concat(wildCards.slice(0, wildCardsNeeded));
    cards[rank] = [];
    cards[WILD_CARD] = wildCards.slice(wildCardsNeeded);
    return taken;
  }

  function takeCardBySuit(cardsByRank, rank, suit) {
    const rankCards = cardsByRank[rank] || [];
    const index = rankCards.findIndex((card) => card.suit === suit);
    if (index >= 0) {
      cardsByRank[rank] = [...rankCards];
      cardsByRank[rank].splice(index, 1);
      return rankCards[index];
    }
    const wildCards = cardsByRank[WILD_CARD] || [];
    if (wildCards.length > 0) {
      cardsByRank[WILD_CARD] = wildCards.slice(1);
      return wildCards[0];
    }
    return undefined;
  }

  // === Leftover Cost Estimation & Decomposition (ported from strategy.cpp) ===
  // The reference solver evaluates the cards left after the extracted hands
  // with an admissible lower bound instead of counting them as singles.

  function wildCardsLeft(cardsByRank) {
    return (cardsByRank[WILD_CARD] || []).length;
  }

  // Port of calculateMinHandsImp: min hands for cnt1 single-ranks, cnt2
  // pair-ranks and cnt3 triple-ranks, spending wild cards to merge groups
  // (single->pair, pair->triple, triple->bomb, or the wild played alone).
  // Jokers and bombs are treated as ~free hands: they can almost always be
  // played, exactly like the reference implementation.
  function minHandsImp(cnt1, cnt2, cnt3, wilds) {
    if (wilds <= 0) {
      return cnt1 + Math.max(cnt2, cnt3);
    }
    let best = Infinity;
    if (cnt1 > 0) {
      best = Math.min(best, minHandsImp(cnt1 - 1, cnt2 + 1, cnt3, wilds - 1));
    }
    if (cnt2 > 0) {
      best = Math.min(best, minHandsImp(cnt1, cnt2 - 1, cnt3 + 1, wilds - 1));
    }
    if (cnt3 > 0) {
      best = Math.min(best, minHandsImp(cnt1, cnt2, cnt3 - 1, wilds - 1));
    }
    best = Math.min(best, minHandsImp(cnt1 + 1, cnt2, cnt3, wilds - 1));
    return best;
  }

  // Port of calculateMinHands: lower bound on the hands needed by the cards
  // that are still in cardsByRank (wild cards included).
  function minHandsLowerBound(cardsByRank) {
    let cnt1 = 0;
    let cnt2 = 0;
    let cnt3 = 0;
    for (const key of Object.keys(cardsByRank)) {
      const cards = cardsByRank[key];
      if (!cards || cards.length === 0) {
        continue;
      }
      const rank = Number(key);
      if (rank === BLACK_JOKER || rank === RED_JOKER) {
        continue; // jokers are ~free hands
      }
      if (cards.length >= 4) {
        continue; // bombs are ~free hands
      }
      if (cards.length === 1) {
        cnt1++;
      } else if (cards.length === 2) {
        cnt2++;
      } else {
        cnt3++;
      }
    }
    return minHandsImp(cnt1, cnt2, cnt3, wildCardsLeft(cardsByRank));
  }

  // Port of OverallValueCostEstimator.estimate: value of a single play in
  // [-2, 2]. Dumping strong cards has negative cost, getting stuck with low
  // cards has positive cost. `order` is the context order (0..14),
  // `naturalRank` the natural top rank of sequences (1=A .. 14=A-ordinal).
  function overallValuePlay(type, order, count, naturalRank) {
    switch (type) {
      case PlayType.SINGLE:
        switch (order) {
          case 14: // red joker
            return -1.0;
          case 13: // black joker
            return -0.2;
          case 12: // main rank
            return -0.1;
          default:
            return linear({ x: 0, y: 1.3 }, { x: 11, y: 0.0 }, order);
        }
      case PlayType.PAIR:
        switch (order) {
          case 14:
            return -1.0;
          case 13:
            return -0.9;
          case 12:
            return -0.8;
          case 11:
            return -0.5;
          default:
            return linear({ x: 0, y: 1.0 }, { x: 10, y: -0.1 }, order);
        }
      // ASSUMPTION (kept from the reference): triples and full houses are
      // equivalent.
      case PlayType.TRIPLE:
      case PlayType.FULL_HOUSE:
        switch (order) {
          case 12:
            return -0.9;
          case 11:
            return -0.8;
          case 10:
            return -0.6;
          default:
            return linear({ x: 0, y: 1.0 }, { x: 9, y: -0.3 }, order);
        }
      case PlayType.STRAIGHT:
        return 0.6 * linear({ x: 1, y: 1.0 }, { x: 10, y: -1.0 }, naturalRank);
      case PlayType.TUBE:
        return 0.4 * linear({ x: 1, y: 1.0 }, { x: 12, y: -1.0 }, naturalRank);
      case PlayType.PLATE:
        return 0.3 * linear({ x: 1, y: 1.0 }, { x: 13, y: -1.0 }, naturalRank);
      case PlayType.BOMB_N_TUPLE:
        return count >= 6
          ? -1.9
          : count === 5
          ? linear({ x: 0, y: -1.5 }, { x: 12, y: -1.7 }, order)
          : linear({ x: 0, y: -1.0 }, { x: 12, y: -1.3 }, order);
      case PlayType.STRAIGHT_FLUSH:
        return linear({ x: 5, y: -1.3 }, { x: 14, y: -1.5 }, naturalRank);
      case PlayType.FOUR_JOKER:
        return -2.0;
      default:
        return 0;
    }
  }

  // Port of OverallValueCostEstimator.estimateCardsImp for wilds == 0:
  // per-rank value of the remaining cards. Positive-value pairs are absorbed
  // into triples (they ride along as full houses); strong (negative) pairs
  // are kept separate.
  function overallValueOfCounts(counts, context) {
    let pairsInFullhouses = 0;
    let valueSum = 0.0;
    for (let rank = 1; rank <= K; ++rank) {
      if (counts[rank] === 3) {
        pairsInFullhouses++;
        valueSum += overallValuePlay(
          PlayType.TRIPLE,
          context.getOrder(rank),
          3,
          rank
        );
      }
    }
    for (let rank = 1; rank <= K; ++rank) {
      const n = counts[rank] || 0;
      if (n === 1) {
        valueSum += overallValuePlay(
          PlayType.SINGLE,
          context.getOrder(rank),
          1,
          rank
        );
      } else if (n === 2) {
        const value = overallValuePlay(
          PlayType.PAIR,
          context.getOrder(rank),
          2,
          rank
        );
        if (value > 0 && pairsInFullhouses > 0) {
          pairsInFullhouses--;
        } else {
          valueSum += value;
        }
      } else if (n >= 4) {
        valueSum += overallValuePlay(
          PlayType.BOMB_N_TUPLE,
          context.getOrder(rank),
          n,
          rank
        );
      }
    }
    valueSum +=
      (counts[BLACK_JOKER] || 0) *
      overallValuePlay(PlayType.SINGLE, 13, 1, BLACK_JOKER);
    valueSum +=
      (counts[RED_JOKER] || 0) *
      overallValuePlay(PlayType.SINGLE, 14, 1, RED_JOKER);
    return valueSum;
  }

  function overallEstimateCounts(counts, wilds, context) {
    if (wilds === 0) {
      return overallValueOfCounts(counts, context);
    }
    let best = Infinity;
    for (let rank = 1; rank <= K; ++rank) {
      counts[rank] = (counts[rank] || 0) + 1;
      best = Math.min(best, overallEstimateCounts(counts, wilds - 1, context));
      counts[rank]--;
    }
    return best;
  }

  // Port of OverallValueCostEstimator.estimateCards: lower bound on the
  // overall value of the cards still in cardsByRank.
  function overallLeftoverEstimate(cardsByRank, context) {
    const counts = {};
    for (const key of Object.keys(cardsByRank)) {
      const cards = cardsByRank[key];
      if (!cards || cards.length === 0) {
        continue;
      }
      counts[Number(key)] = cards.length;
    }
    return overallEstimateCounts(counts, wildCardsLeft(cardsByRank), context);
  }

  // Decompose the leftover cards into concrete plays.
  // mode 'HANDS'/'HEURISTICS': spend wild cards to minimize the hand count
  // (pairs ride with triples as full houses). mode 'OVERALL': only absorb
  // pairs whose value is positive, mirroring overallValueOfCounts so the
  // leaf cost stays >= the pruning bound.
  function decomposeLeftover(cardsByRank, context, mode) {
    const small = [];
    const bombs = [];
    const jokers = [];
    for (const key of Object.keys(cardsByRank)) {
      const cards = cardsByRank[key];
      if (!cards || cards.length === 0) {
        continue;
      }
      const rank = Number(key);
      if (rank === BLACK_JOKER || rank === RED_JOKER) {
        jokers.push(...cards);
      } else if (cards.length >= 4) {
        bombs.push({ rank, cards: [...cards] });
      } else {
        small.push({ rank, cards: [...cards] });
      }
    }
    const wilds = [...(cardsByRank[WILD_CARD] || [])];

    // Spend wild cards on small groups to minimize hands (single->pair,
    // pair->triple, triple->bomb), or play a wild as a single. Returns the
    // final groups; a wild played alone becomes a rank-less group.
    function assignWilds(groups, idx) {
      if (idx >= wilds.length) {
        let cnt1 = 0;
        let cnt2 = 0;
        let cnt3 = 0;
        for (const g of groups) {
          if (g.cards.length === 1) cnt1++;
          else if (g.cards.length === 2) cnt2++;
          else if (g.cards.length === 3) cnt3++;
        }
        return { hands: cnt1 + Math.max(cnt2, cnt3), groups };
      }
      let best = null;
      const consider = (next) => {
        const rest = assignWilds(next, idx + 1);
        if (best == null || rest.hands < best.hands) {
          best = rest;
        }
      };
      for (let i = 0; i < groups.length; i++) {
        consider(
          groups.map((g, j) =>
            j === i ? { rank: g.rank, cards: [...g.cards, wilds[idx]] } : g
          )
        );
      }
      consider([...groups, { rank: null, cards: [wilds[idx]] }]);
      return best;
    }

    const assignment = assignWilds(small, 0);
    const wildSingles = [];
    const finalGroups = [];
    for (const g of assignment.groups) {
      if (g.rank === null) {
        wildSingles.push(...g.cards);
      } else {
        finalGroups.push(g);
      }
    }

    const plays = [];
    let score = 0;
    const addPlay = (cards, type, rank, count, naturalRank) => {
      plays.push({ playRank: { type, rank, count }, cards });
      if (mode === 'OVERALL') {
        score += overallValuePlay(type, rank, count, naturalRank);
      } else if (
        type !== PlayType.BOMB_N_TUPLE &&
        type !== PlayType.STRAIGHT_FLUSH &&
        type !== PlayType.FOUR_JOKER &&
        !(type === PlayType.SINGLE && cards.every((c) => c.rank.natural >= BLACK_JOKER))
      ) {
        score += 1;
      }
    };

    for (const b of bombs) {
      addPlay(
        b.cards,
        PlayType.BOMB_N_TUPLE,
        context.game.getOrder(b.rank),
        b.cards.length,
        b.rank
      );
    }
    const upgraded = finalGroups.filter((g) => g.cards.length >= 4);
    for (const g of upgraded) {
      addPlay(
        g.cards,
        PlayType.BOMB_N_TUPLE,
        context.game.getOrder(g.rank),
        g.cards.length,
        g.rank
      );
    }
    let pairs = finalGroups.filter((g) => g.cards.length === 2);
    const triples = finalGroups.filter((g) => g.cards.length === 3);
    const singles = finalGroups.filter((g) => g.cards.length === 1);

    // Match pairs into triples as full houses.
    let absorbable = pairs;
    if (mode === 'OVERALL') {
      absorbable = pairs.filter(
        (g) =>
          overallValuePlay(
            PlayType.PAIR,
            context.game.getOrder(g.rank),
            2,
            g.rank
          ) > 0
      );
    }
    const keptPairs = [];
    const tripleQueue = [...triples];
    for (const p of absorbable) {
      const t = tripleQueue.shift();
      if (!t) {
        keptPairs.push(p);
        continue;
      }
      addPlay(
        [...t.cards, ...p.cards],
        PlayType.FULL_HOUSE,
        context.game.getOrder(t.rank),
        5,
        t.rank
      );
    }
    for (const t of tripleQueue) {
      addPlay(
        t.cards,
        PlayType.TRIPLE,
        context.game.getOrder(t.rank),
        3,
        t.rank
      );
    }
    for (const p of keptPairs) {
      addPlay(p.cards, PlayType.PAIR, context.game.getOrder(p.rank), 2, p.rank);
    }
    for (const s of singles) {
      addPlay(
        s.cards,
        PlayType.SINGLE,
        context.game.getOrder(s.rank),
        1,
        s.rank
      );
    }
    for (const c of wildSingles) {
      addPlay([c], PlayType.SINGLE, c.rank.power, 1, c.rank.natural);
    }
    if (jokers.length === 4) {
      addPlay(jokers, PlayType.FOUR_JOKER, 0, 4, 0);
    } else {
      for (const c of jokers) {
        addPlay([c], PlayType.SINGLE, c.rank.power, 1, c.rank.natural);
      }
    }
    return { score, plays };
  }

  // Finish a plan at a leaf: decompose whatever is left into concrete plays
  // and add their cost to the accumulated plan score.
  function finishPlan(plan, cardsByRank, context) {
    const deco = decomposeLeftover(cardsByRank, context, context.mode);
    return {
      score: plan.score + deco.score,
      plays: [...plan.plays, ...deco.plays],
    };
  }

  // Cost added to the accumulated plan score when a play is extracted.
  // HANDS/HEURISTICS: every play costs 1 hand except bombs (0).
  // OVERALL: the play's heuristic value from the reference estimator.
  function playExtractionCost(context, playRank, count, naturalRank) {
    if (context.mode === 'OVERALL') {
      return overallValuePlay(playRank.type, playRank.rank, count, naturalRank);
    }
    return playRank.type === PlayType.BOMB_N_TUPLE ? 0 : 1;
  }

  const playCardsOfTheSameRank = (n) => ({ cards, nowRank, plan, context }) => {
    const newCards = { ...cards };
    const taken = takeCard(newCards, nowRank, n);
    if (taken == null) {
      return undefined;
    }
    const playRank = {
      type:
        n === 2
          ? PlayType.PAIR
          : n === 3
          ? PlayType.TRIPLE
          : PlayType.BOMB_N_TUPLE,
      rank: context.game.getOrder(nowRank),
      cardCount: n,
    };
    return {
      cardsByRank: newCards,
      plan: {
        score:
          plan.score + playExtractionCost(context, playRank, n, nowRank),
        plays: plan.plays.concat({
          playRank,
          cards: taken,
        }),
      },
    };
  };

  const playCardSequence = ({ cardCount, length, playType }) => ({ cards: cardsByRank, nowRank, plan, context }) => {
    if (context.debug) {
      console.log(`playCardSequence: ${JSON.stringify(cardsByRank)}, ${nowRank}`);
    }
    const end = nowRank + length - 1;
    if (end > K + 1) {
      return undefined;
    }
    let newCardsByRank = { ...cardsByRank };
    let play = {
      cards: [],
      playRank: { type: playType, rank: nowRank },
    };
    for (let i = nowRank; i <= end; ++i) {
      const ii = i == K + 1 ? A : i;
      const taken = takeCard(newCardsByRank, ii, cardCount);
      if (taken == null) {
        return undefined;
      }
      play.cards.push(...taken);
    }
    return {
      cardsByRank: newCardsByRank,
      plan: {
        score:
          plan.score +
          playExtractionCost(context, play.playRank, length * cardCount, nowRank),
        plays: plan.plays.concat(play),
      },
    };
  };

  const playStraightFlush = ({ cards: cardsByRank, nowRank, nowSuit, plan, context }) => {
    if (context.debug) {
      console.log(`playStraightFlush: ${JSON.stringify(cardsByRank)}, ${nowRank}, ${nowSuit}`);
    }
    if (!nowSuit) {
      console.assert(nowSuit);
      return undefined;
    }
    const end = nowRank + 5 - 1;
    if (end > K + 1) {
      return undefined;
    }
    let newCardsByRank = { ...cardsByRank };
    let play = {
      cards: [],
      playRank: { type: PlayType.STRAIGHT_FLUSH, rank: nowRank },
    };
    for (let i = nowRank; i <= end; ++i) {
      const ii = i == K + 1 ? A : i;
      const taken = takeCardBySuit(newCardsByRank, ii, nowSuit);
      if (taken == null) {
        return undefined;
      }
      play.cards.push(taken);
    }
    return {
      cardsByRank: newCardsByRank,
      plan: {
        score:
          plan.score +
          playExtractionCost(
            context,
            play.playRank,
            5,
            nowRank
          ),
        plays: plan.plays.concat(play),
      },
    };
  };

  const playPair = playCardsOfTheSameRank(2);
  const playTriple = playCardsOfTheSameRank(3);
  const playBomb4 = playCardsOfTheSameRank(4);
  const playBomb5 = playCardsOfTheSameRank(5);
  const playBomb6 = playCardsOfTheSameRank(6);
  const playBomb7 = playCardsOfTheSameRank(7);
  const playBomb8 = playCardsOfTheSameRank(8);
  // 9/10-bombs are only possible with wild cards (8 natural + 2 wilds max)
  const playBomb9 = playCardsOfTheSameRank(9);
  const playBomb10 = playCardsOfTheSameRank(10);

  const playFullHouse = ({ cards, nowRank, plan, context }) => {
    const result = playTriple({ cards, nowRank, plan, context });
    if (result == null) {
      return undefined;
    }
    const { cardsByRank: newCards, plan: newPlan } = result;
    const pairIndex = newPlan.plays.findIndex(
      (play) => play.playRank.type === PlayType.PAIR
    );
    if (pairIndex < 0) {
      return undefined;
    }
    const triplePlay = newPlan.plays[newPlan.plays.length - 1];
    const pairPlay = newPlan.plays[pairIndex];
    newPlan.plays = newPlan.plays
      .slice(0, pairIndex)
      .concat(newPlan.plays.slice(pairIndex + 1, newPlan.plays.length - 1));
    newPlan.plays.push({
      playRank: {
        type: PlayType.FULL_HOUSE,
        rank: triplePlay.playRank.rank,
      },
      cards: triplePlay.cards.concat(pairPlay.cards),
    });
    if (context.mode === 'OVERALL') {
      // full house value == triple value; drop the pair's value
      newPlan.score =
        newPlan.score -
        overallValuePlay(PlayType.PAIR, pairPlay.playRank.rank, 2);
    } else {
      newPlan.score = newPlan.score - 1;
    }
    return { plan: newPlan, cardsByRank: newCards };
  };

  const playStraight = playCardSequence({
    cardCount: 1,
    length: 5,
    playType: PlayType.STRAIGHT,
  });
  const playTube = playCardSequence({
    cardCount: 2,
    length: 3,
    playType: PlayType.TUBE,
  });
  const playPlate = playCardSequence({
    cardCount: 3,
    length: 2,
    playType: PlayType.PLATE,
  });

  const PLAY_TYPE_FUNC = {
    [PlayType.PAIR]: [playPair],
    [PlayType.TRIPLE]: [playTriple, playFullHouse],
    [PlayType.BOMB_N_TUPLE]: [
      playBomb4,
      playBomb5,
      playBomb6,
      playBomb7,
      playBomb8,
      playBomb9,
      playBomb10,
    ],
    [PlayType.STRAIGHT]: [playStraight],
    [PlayType.TUBE]: [playTube],
    [PlayType.PLATE]: [playPlate],
    [PlayType.STRAIGHT_FLUSH]: [playStraightFlush],
  };

  function iterateImp({
    cardsByRank,
    plan = { score: 0, plays: [] },
    now = ITERATOR_STATE_START,
    context,
  }) {
    if (context.debug) {
      console.log(PlayType[now.type], now.rank, now.suit);
    }
    // Branch and bound (the reference solver's "heavy pruning"): abandon the
    // subtree when the accumulated cost plus an admissible lower bound of the
    // leftover cards can no longer beat the best plan found so far.
    if (context.boundFn) {
      const bound = plan.score + context.boundFn(cardsByRank, context.game);
      if (bound > context.searchState.best) {
        return;
      }
    }
    PLAY_TYPE_FUNC[now.type]?.forEach((func) => {
      const result = func({
        nowRank: now.rank,
        nowSuit: now.suit,
        cards: cardsByRank,
        plan,
        context,
      });
      if (result == null) {
        return;
      }
      iterateImp({ ...result, now, context });
    });
    const next = nextIteratorState(now);
    if (next == null) {
      context.collectPlan(finishPlan(plan, cardsByRank, context));
      return;
    }
    iterateImp({
      now: next,
      cardsByRank,
      plan,
      context,
    });
  }

  // === Strategy Interface (calc) ===
  // scorers:
  // - 'HANDS'     minimize the number of hands to finish (pruned search)
  // - 'OVERALL'   minimize the reference's overall-value cost (pruned search)
  // - 'HEURISTICS' legacy capped heuristic (exhaustive, kept for compat)
  function calc({
    cards: rawCards,
    mainRank,
    morePlans = true,
    scorer = 'HANDS',
  }) {
    const context = new GameContext(mainRank);
    const cards = rawCards.map((rawCard) => parseCardRaw(rawCard, context));
    let mode;
    let scorerFunc;
    let boundFn = null;
    if (scorer === 'HEURISTICS') {
      mode = 'HEURISTICS';
      scorerFunc = heuristicScore;
    } else if (scorer === 'OVERALL') {
      mode = 'OVERALL';
      scorerFunc = handsScore;
      boundFn = overallLeftoverEstimate;
    } else {
      mode = 'HANDS';
      scorerFunc = handsScore;
      boundFn = minHandsLowerBound;
    }
    const searchState = { best: MAX_SCORE };
    const collectPlan = (plan) => {
      if (plan.score < searchState.best) {
        searchState.best = plan.score;
      }
      return plan;
    };
    const planSink = morePlans
      ? makeAllBestPlansCollector({ scorer: scorerFunc })
      : makeBestPlanCollector({ scorer: scorerFunc });
    const wrappedCollect = (plan) => {
      collectPlan(plan);
      planSink.collectPlan(plan);
    };
    iteratePlans({
      cards,
      collectPlan: wrappedCollect,
      context,
      mode,
      boundFn,
      searchState,
    });
    if (morePlans) {
      const bestPlans = planSink.getBestPlans();
      if (bestPlans.length == 0) {
        throw new Error('No plan found');
      }
      return bestPlans;
    } else {
      const bestPlan = planSink.getBestPlan();
      if (bestPlan == null) {
        throw new Error('No plan found');
      }
      return [bestPlan];
    }
  }

  const makeBestPlanCollector = ({ scorer = handsScore } = {}) => {
    let bestPlan = undefined;
    let bestScore = MAX_SCORE;
    let count = 0;
    return {
      collectPlan: (plan) => {
        const currentScore = scorer(plan);
        plan.score = currentScore;
        if (bestPlan == null || currentScore <= bestScore) {
          bestPlan = plan;
          bestScore = currentScore;
        }
        ++count;
        if (count > MAX_PLANS) {
          throw new Error('too many plans');
        }
      },
      getBestPlan: () => bestPlan,
    };
  };

  const makeAllBestPlansCollector = ({ scorer = handsScore } = {}) => {
    let bestPlans = [];
    let bestScore = MAX_SCORE;
    let count = 0;
    return {
      collectPlan: (plan) => {
        ++count;
        if (count > MAX_PLANS) {
          throw new Error('too many plans');
        }
        const currentScore = scorer(plan);
        plan.score = currentScore;
        if (bestPlans.length === 0) {
          bestPlans.push(plan);
          bestScore = currentScore;
        } else if (currentScore < bestScore) {
          bestPlans = [plan];
          bestScore = currentScore;
        } else if (currentScore === bestScore) {
          bestPlans.push(plan);
        }
      },
      getBestPlans: () => bestPlans,
    };
  };

  // === Conversion Helpers for guandan.js UI cards ===
  function convertCardToRaw(card) {
    if (card.isJoker) {
      if (card.rank === 'Joker' || !card.isSmall) {
        return { rank: RED_JOKER, suit: 'R' }; // Red Joker
      } else {
        return { rank: BLACK_JOKER, suit: 'B' }; // Black Joker
      }
    }
    
    const suitMap = {
      '♠': 'S',
      '♣': 'C',
      '♦': 'D',
      '♥': 'H'
    };
    
    const rankMap = {
      'A': 1,
      '2': 2,
      '3': 3,
      '4': 4,
      '5': 5,
      '6': 6,
      '7': 7,
      '8': 8,
      '9': 9,
      '10': 10,
      'J': 11,
      'Q': 12,
      'K': 13
    };
    
    return {
      rank: rankMap[card.rank],
      suit: suitMap[card.suit]
    };
  }

  function convertLevelToValue(levelText) {
    const levelMap = {
      'A': 1,
      '2': 2,
      '3': 3,
      '4': 4,
      '5': 5,
      '6': 6,
      '7': 7,
      '8': 8,
      '9': 9,
      '10': 10,
      'J': 11,
      'Q': 12,
      'K': 13
    };
    return levelMap[levelText] || 2;
  }

  // === Public API Export ===
  global.GuandanStrategy = {
    PlayType,
    GameContext,
    parseRawCards,
    parseCardRaw,
    cardToText,
    cardRawToText,
    cardToCardRaw,
    playToText,
    planToText,
    calc,
    handsScore,
    heuristicScore,
    MAX_SCORE,
    convertCardToRaw,
    convertLevelToValue
  };

})(typeof window !== 'undefined' ? window : this);
