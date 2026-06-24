import assert from 'assert';
import { chooseBid, choosePlay, findHint } from '../src/ai.js';
import { canBeat, evaluatePlay } from '../src/rules.js';
import { cardsFromRanks } from './test-utils.js';

export function run() {
  assert.strictEqual(chooseBid(cardsFromRanks(['SJ', 'BJ', '2', '2', 'A', 'A', 'K'])), true, 'strong hand calls landlord');
  assert.strictEqual(chooseBid(cardsFromRanks(['3', '4', '5', '6', '7', '8', '9'])), false, 'weak hand passes bidding');

  const hand = cardsFromRanks(['3', '3', '4', '4', '5', '6']);
  const targetPair = evaluatePlay(cardsFromRanks(['3', '3']));
  const hint = findHint(hand, targetPair);
  assert(hint, 'hint exists for beatable pair');
  assert.strictEqual(evaluatePlay(hint).type, 'pair');
  assert.strictEqual(canBeat(hint, targetPair), true);

  const noAnswer = findHint(cardsFromRanks(['3', '4', '5']), evaluatePlay(cardsFromRanks(['A', 'A'])));
  assert.strictEqual(noAnswer, null, 'hint returns null when no legal response exists');

  const lead = choosePlay(cardsFromRanks(['3', '3', '4', '5']), null);
  assert(lead.cards.length > 0, 'AI leads with cards');
  assert(evaluatePlay(lead.cards), 'AI lead is legal');

  const response = choosePlay(cardsFromRanks(['3', '3', '4', '4', 'BJ']), targetPair);
  assert.strictEqual(response.pass, false, 'AI responds when it can beat target');
  assert.strictEqual(canBeat(response.cards, targetPair), true, 'AI response beats target');

  const pass = choosePlay(cardsFromRanks(['3', '4', '5']), evaluatePlay(cardsFromRanks(['K', 'K'])));
  assert.strictEqual(pass.pass, true, 'AI passes when it has no response');
}
