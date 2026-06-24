import assert from 'assert';
import {
  createDeck,
  dealCards,
  getCardLabel,
  sortCards,
} from '../src/cards.js';

export function run() {
  const deck = createDeck();
  assert.strictEqual(deck.length, 54, 'deck has 54 cards');
  assert.strictEqual(new Set(deck.map((card) => card.id)).size, 54, 'deck card ids are unique');

  const labels = deck.map(getCardLabel);
  assert(labels.includes('3\u2660'), 'deck includes regular suited cards');
  assert(labels.includes('\u5c0f\u738b'), 'deck includes small joker');
  assert(labels.includes('\u5927\u738b'), 'deck includes big joker');

  const deal = dealCards(deck);
  assert.strictEqual(deal.hands.length, 3, 'deal creates three hands');
  assert.deepStrictEqual(deal.hands.map((hand) => hand.length), [17, 17, 17], 'each player gets 17 cards');
  assert.strictEqual(deal.bottomCards.length, 3, 'deal reserves 3 bottom cards');

  const mixed = [
    { id: 'D-3', rank: '3', value: 3 },
    { id: 'J-BJ', rank: 'BJ', value: 17 },
    { id: 'S-A', rank: 'A', value: 14 },
  ];
  assert.deepStrictEqual(sortCards(mixed).map((card) => card.rank), ['BJ', 'A', '3']);
}
