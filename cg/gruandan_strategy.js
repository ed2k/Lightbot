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

  function iteratePlans({ cards, collectPlan, context: gameContext }) {
    const cardsByRank = organize(cards, gameContext);
    iterateImp({
      cardsByRank,
      context: {
        collectPlan,
        game: gameContext,
        debug: DEBUG,
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
        score: plan.score + (n > 3 ? 0 : 1),
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
        score: plan.score + 1,
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
        score: plan.score + 0,
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
    newPlan.score = newPlan.score - 1;
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
      context.collectPlan(playRestOfCardsAsSingles(plan, cardsByRank));
      return;
    }
    iterateImp({
      now: next,
      cardsByRank,
      plan,
      context,
    });
  }

  function playRestOfCardsAsSingles(plan, cardsByRank) {
    const resultPlan = { ...plan, plays: [...plan.plays] };
    Object.entries(cardsByRank).forEach(([_, cards]) => {
      if (!cards) {
        return;
      }
      resultPlan.score += cards.length;
      cards.forEach((card) => {
        resultPlan.plays.push({
          playRank: {
            type: PlayType.SINGLE,
            rank: card.rank.power,
          },
          cards: [card],
        });
      });
    });
    return resultPlan;
  }

  // === Strategy Interface (calc) ===
  function calc({
    cards: rawCards,
    mainRank,
    morePlans = true,
    scorer = 'HANDS',
  }) {
    const context = new GameContext(mainRank);
    const cards = rawCards.map((rawCard) => parseCardRaw(rawCard, context));
    const scorerFunc = scorer === 'HEURISTICS' ? heuristicScore : handsScore;
    if (morePlans) {
      const planCollector = makeAllBestPlansCollector({ scorer: scorerFunc });
      iteratePlans({ cards, collectPlan: planCollector.collectPlan, context });
      const bestPlans = planCollector.getBestPlans();
      if (bestPlans.length == 0) {
        throw new Error('No plan found');
      }
      return bestPlans;
    } else {
      const bestPlanCollector = makeBestPlanCollector({ scorer: scorerFunc });
      iteratePlans({ cards, collectPlan: bestPlanCollector.collectPlan, context });
      const bestPlan = bestPlanCollector.getBestPlan();
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
