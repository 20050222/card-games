import assert from 'assert';
import { cardsFromRanks, assertPlay } from './test-utils.js';
import { canBeat, evaluatePlay } from '../src/rules.js';

export function run() {
  assertPlay(evaluatePlay(cardsFromRanks(['3'])), { type: 'single', mainRank: '3', length: 1 });
  assertPlay(evaluatePlay(cardsFromRanks(['4', '4'])), { type: 'pair', mainRank: '4', length: 2 });
  assertPlay(evaluatePlay(cardsFromRanks(['5', '5', '5'])), { type: 'triple', mainRank: '5', length: 3 });
  assertPlay(evaluatePlay(cardsFromRanks(['6', '6', '6', '9'])), { type: 'tripleSingle', mainRank: '6', length: 4 });
  assertPlay(evaluatePlay(cardsFromRanks(['7', '7', '7', '10', '10'])), { type: 'triplePair', mainRank: '7', length: 5 });
  assertPlay(evaluatePlay(cardsFromRanks(['3', '4', '5', '6', '7'])), { type: 'straight', mainRank: '7', length: 5 });
  assertPlay(evaluatePlay(cardsFromRanks(['4', '4', '5', '5', '6', '6'])), { type: 'consecutivePairs', mainRank: '6', length: 6 });
  assertPlay(evaluatePlay(cardsFromRanks(['8', '8', '8', '9', '9', '9'])), { type: 'airplane', mainRank: '9', length: 6 });
  assertPlay(evaluatePlay(cardsFromRanks(['8', '8', '8', '9', '9', '9', '3', '4'])), { type: 'airplaneSingles', mainRank: '9', length: 8 });
  assertPlay(evaluatePlay(cardsFromRanks(['8', '8', '8', '9', '9', '9', '3', '3', '4', '4'])), { type: 'airplanePairs', mainRank: '9', length: 10 });
  assertPlay(evaluatePlay(cardsFromRanks(['J', 'J', 'J', 'J'])), { type: 'bomb', mainRank: 'J', length: 4 });
  assertPlay(evaluatePlay(cardsFromRanks(['Q', 'Q', 'Q', 'Q', '3', '4'])), { type: 'fourTwoSingles', mainRank: 'Q', length: 6 });
  assertPlay(evaluatePlay(cardsFromRanks(['K', 'K', 'K', 'K', '5', '5', '6', '6'])), { type: 'fourTwoPairs', mainRank: 'K', length: 8 });
  assertPlay(evaluatePlay(cardsFromRanks(['SJ', 'BJ'])), { type: 'rocket', mainRank: 'BJ', length: 2 });

  assert.strictEqual(evaluatePlay(cardsFromRanks(['3', '4', '5', '6', '2'])), null, 'straight cannot include 2');
  assert.strictEqual(evaluatePlay(cardsFromRanks(['3', '3', '4', '4'])), null, 'two pairs are not consecutive pairs');
  assert.strictEqual(evaluatePlay(cardsFromRanks(['3', '3', '3', '4', '4', '5'])), null, 'invalid mixed selection is rejected');

  assert.strictEqual(canBeat(cardsFromRanks(['4']), cardsFromRanks(['3'])), true, 'higher single beats lower single');
  assert.strictEqual(canBeat(cardsFromRanks(['4', '4']), cardsFromRanks(['3', '3'])), true, 'higher pair beats lower pair');
  assert.strictEqual(canBeat(cardsFromRanks(['5', '5']), cardsFromRanks(['4'])), false, 'different normal types cannot compare');
  assert.strictEqual(canBeat(cardsFromRanks(['6', '6', '6', '6']), cardsFromRanks(['A'])), true, 'bomb beats non-bomb');
  assert.strictEqual(canBeat(cardsFromRanks(['SJ', 'BJ']), cardsFromRanks(['2', '2', '2', '2'])), true, 'rocket beats bomb');
  assert.strictEqual(canBeat(cardsFromRanks(['A', 'A', 'A', 'A']), cardsFromRanks(['K', 'K', 'K', 'K'])), true, 'higher bomb beats lower bomb');
}
