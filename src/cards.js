export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'SJ', 'BJ'];
export const RANK_VALUES = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 3]));
export const SUITS = ['\u2660', '\u2665', '\u2663', '\u2666'];
export const RED_SUITS = new Set(['\u2665', '\u2666']);

export function createDeck() {
  const cards = [];
  for (const rank of RANKS.slice(0, 13)) {
    for (const suit of SUITS) {
      cards.push({
        id: `${rank}-${suit}`,
        rank,
        suit,
        value: RANK_VALUES[rank],
        color: RED_SUITS.has(suit) ? 'red' : 'black',
      });
    }
  }
  cards.push({ id: 'SJ', rank: 'SJ', suit: 'JOKER', value: RANK_VALUES.SJ, color: 'black' });
  cards.push({ id: 'BJ', rank: 'BJ', suit: 'JOKER', value: RANK_VALUES.BJ, color: 'red' });
  return cards;
}

export function shuffleDeck(deck, rng = Math.random) {
  const copy = deck.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function dealCards(deck) {
  return {
    hands: [
      sortCards(deck.slice(0, 17)),
      sortCards(deck.slice(17, 34)),
      sortCards(deck.slice(34, 51)),
    ],
    bottomCards: sortCards(deck.slice(51, 54)),
  };
}

export function sortCards(cards, direction = 'desc') {
  const multiplier = direction === 'asc' ? 1 : -1;
  return cards.slice().sort((left, right) => {
    if (left.value !== right.value) {
      return (left.value - right.value) * multiplier;
    }
    return String(left.suit).localeCompare(String(right.suit)) * multiplier;
  });
}

export function getCardLabel(card) {
  if (card.rank === 'SJ') return '\u5c0f\u738b';
  if (card.rank === 'BJ') return '\u5927\u738b';
  return `${card.rank}${card.suit}`;
}

export function removeCards(hand, cardsToRemove) {
  const removeIds = new Set(cardsToRemove.map((card) => card.id));
  return hand.filter((card) => !removeIds.has(card.id));
}

export function findCardsByIds(hand, cardIds) {
  const idSet = new Set(cardIds);
  return hand.filter((card) => idSet.has(card.id));
}
