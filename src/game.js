import { createDeck, dealCards, findCardsByIds, removeCards, shuffleDeck, sortCards } from './cards.js';
import { canBeat, evaluatePlay } from './rules.js';

const SEATS = [
  { id: 'player', name: '\u4f60', kind: 'human' },
  { id: 'ai-left', name: '\u5de6\u5bb6 AI', kind: 'ai' },
  { id: 'ai-right', name: '\u53f3\u5bb6 AI', kind: 'ai' },
];

function nextSeat(index) {
  return (index + 1) % 3;
}

function createDealOptions(options) {
  return {
    ...(options.deck ? { deck: options.deck } : {}),
    ...(options.rng ? { rng: options.rng } : {}),
  };
}

function areCardsInHand(hand, cards) {
  const handIds = new Set(hand.map((card) => card.id));
  const selectedIds = new Set();
  return cards.every((card) => {
    if (!card || !handIds.has(card.id) || selectedIds.has(card.id)) {
      return false;
    }
    selectedIds.add(card.id);
    return true;
  });
}

function cloneState(state) {
  return {
    ...state,
    seats: state.seats.map((seat) => ({ ...seat, hand: seat.hand.slice() })),
    bottomCards: state.bottomCards.slice(),
    bids: state.bids.slice(),
    selectedIds: state.selectedIds.slice(),
    dealOptions: { ...(state.dealOptions || {}) },
    lastPlay: state.lastPlay
      ? { ...state.lastPlay, cards: state.lastPlay.cards.slice() }
      : null,
  };
}

export function createGame(options = {}) {
  const deck = options.deck || shuffleDeck(createDeck(), options.rng || Math.random);
  const deal = dealCards(deck);
  return {
    phase: 'bidding',
    seats: SEATS.map((seat, index) => ({
      ...seat,
      hand: deal.hands[index],
      role: 'farmer',
    })),
    bottomCards: deal.bottomCards,
    bottomRevealed: false,
    landlord: null,
    landlordCandidate: null,
    activeSeat: 0,
    bids: [],
    bidPasses: 0,
    biddingTurns: 0,
    dealOptions: createDealOptions(options),
    lastPlay: null,
    passCount: 0,
    selectedIds: [],
    winnerSide: null,
    message: '\u8bf7\u9009\u62e9\u662f\u5426\u53eb\u5730\u4e3b',
  };
}

function finalizeLandlord(state, landlordIndex) {
  const next = cloneState(state);
  next.phase = 'playing';
  next.landlord = landlordIndex;
  next.landlordCandidate = landlordIndex;
  next.activeSeat = landlordIndex;
  next.bottomRevealed = true;
  next.seats = next.seats.map((seat, index) => ({
    ...seat,
    role: index === landlordIndex ? 'landlord' : 'farmer',
    hand: index === landlordIndex ? sortCards(seat.hand.concat(next.bottomCards)) : seat.hand,
  }));
  next.message = `${next.seats[landlordIndex].name} \u6210\u4e3a\u5730\u4e3b`;
  return next;
}

export function bid(state, seatIndex, wantsLandlord) {
  if (state.phase !== 'bidding' || state.activeSeat !== seatIndex) {
    return { ...state, message: '\u8fd8\u6ca1\u6709\u8f6e\u5230\u8be5\u73a9\u5bb6\u53eb\u5730\u4e3b' };
  }

  const next = cloneState(state);
  const isRobbing = next.landlordCandidate !== null;
  const action = isRobbing
    ? wantsLandlord ? 'rob' : 'passRob'
    : wantsLandlord ? 'call' : 'passCall';

  next.bids.push({ seatIndex, wantsLandlord, action });
  next.biddingTurns += 1;

  if (wantsLandlord) {
    next.landlordCandidate = seatIndex;
  } else if (!isRobbing) {
    next.bidPasses += 1;
  }

  if (next.landlordCandidate === null && next.biddingTurns >= 3) {
    const redeal = createGame(next.dealOptions);
    return { ...redeal, message: '\u6240\u6709\u73a9\u5bb6\u4e0d\u53eb\uff0c\u91cd\u65b0\u53d1\u724c' };
  }

  if (next.landlordCandidate !== null && next.biddingTurns >= 3) {
    return finalizeLandlord(next, next.landlordCandidate);
  }

  next.activeSeat = nextSeat(seatIndex);
  if (wantsLandlord) {
    next.message = isRobbing
      ? `${next.seats[seatIndex].name} \u62a2\u5730\u4e3b`
      : `${next.seats[seatIndex].name} \u53eb\u5730\u4e3b\uff0c\u5176\u4ed6\u73a9\u5bb6\u53ef\u4ee5\u62a2\u5730\u4e3b`;
  } else {
    next.message = isRobbing
      ? `${next.seats[seatIndex].name} \u4e0d\u62a2`
      : `${next.seats[seatIndex].name} \u4e0d\u53eb`;
  }
  return next;
}

export function selectCardsByIds(hand, ids) {
  return findCardsByIds(hand, ids);
}

export function selectCardsByRanks(hand, ranks) {
  const remaining = hand.slice();
  return ranks.map((rank) => {
    const index = remaining.findIndex((card) => card.rank === rank);
    if (index === -1) {
      throw new Error(`Card rank not found in hand: ${rank}`);
    }
    const [card] = remaining.splice(index, 1);
    return card;
  });
}

export function playCards(state, seatIndex, cards) {
  if (state.phase !== 'playing' || state.activeSeat !== seatIndex) {
    return { ...state, message: '\u8fd8\u6ca1\u6709\u8f6e\u5230\u8be5\u73a9\u5bb6\u51fa\u724c' };
  }
  if (Array.isArray(cards) && !areCardsInHand(state.seats[seatIndex].hand, cards)) {
    return { ...state, message: '\u6240\u9009\u724c\u4e0d\u5728\u5f53\u524d\u73a9\u5bb6\u624b\u724c\u4e2d' };
  }

  const play = evaluatePlay(cards);
  if (!play) {
    return { ...state, message: '\u8bf7\u9009\u62e9\u6709\u6548\u724c\u578b' };
  }
  if (state.lastPlay && !canBeat(play, state.lastPlay.play)) {
    return { ...state, message: '\u5fc5\u987b\u5927\u8fc7\u4e0a\u5bb6\u51fa\u724c' };
  }

  const next = cloneState(state);
  next.seats[seatIndex].hand = removeCards(next.seats[seatIndex].hand, cards);
  next.lastPlay = { seatIndex, play, cards: sortCards(cards) };
  next.passCount = 0;
  next.selectedIds = [];

  if (next.seats[seatIndex].hand.length === 0) {
    next.phase = 'gameOver';
    next.winnerSide = next.landlord === seatIndex ? 'landlord' : 'farmers';
    next.message = next.winnerSide === 'landlord' ? '\u5730\u4e3b\u83b7\u80dc' : '\u519c\u6c11\u83b7\u80dc';
    return next;
  }

  next.activeSeat = nextSeat(seatIndex);
  next.message = `${next.seats[seatIndex].name} \u51fa\u724c`;
  return next;
}

export function passTurn(state, seatIndex) {
  if (state.phase !== 'playing' || state.activeSeat !== seatIndex) {
    return { ...state, message: '\u8fd8\u6ca1\u6709\u8f6e\u5230\u8be5\u73a9\u5bb6\u64cd\u4f5c' };
  }
  if (!state.lastPlay) {
    return { ...state, message: '\u5f53\u524d\u5fc5\u987b\u51fa\u724c' };
  }

  const next = cloneState(state);
  next.passCount += 1;
  next.selectedIds = [];
  next.activeSeat = nextSeat(seatIndex);
  next.message = `${next.seats[seatIndex].name} \u4e0d\u51fa`;

  if (next.passCount >= 2) {
    next.passCount = 0;
    next.lastPlay = null;
    next.message = '\u672c\u8f6e\u7ed3\u675f\uff0c\u91cd\u65b0\u9886\u51fa';
  }

  return next;
}
