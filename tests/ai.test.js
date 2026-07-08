import assert from 'assert';
import { chooseBid, choosePlay, findHint, findHints } from '../src/ai.js';
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
  const hints = findHints(cardsFromRanks(['3', '3', '4', '4', '5', '5']), targetPair);
  assert(hints.length >= 2, 'hint list exposes multiple legal responses for cycling');
  assert(hints.every((candidate) => canBeat(candidate, targetPair)), 'all hint candidates beat the target');

  const targetStraight = evaluatePlay(cardsFromRanks(['3', '4', '5', '6', '7']));
  const straightHint = findHint(cardsFromRanks(['4', '5', '6', '7', '8']), targetStraight);
  assert(straightHint, 'hint exists for beatable straight');
  assert.strictEqual(evaluatePlay(straightHint).type, 'straight');
  assert.strictEqual(canBeat(straightHint, targetStraight), true);

  const straightResponse = choosePlay(cardsFromRanks(['4', '5', '6', '7', '8']), targetStraight);
  assert.strictEqual(straightResponse.pass, false, 'AI responds to beatable straight');
  assert.strictEqual(canBeat(straightResponse.cards, targetStraight), true);

  const targetTripleSingle = evaluatePlay(cardsFromRanks(['3', '3', '3', '8']));
  const tripleSingleHint = findHint(cardsFromRanks(['4', '4', '4', '9']), targetTripleSingle);
  assert(tripleSingleHint, 'hint exists for beatable triple-with-single');
  assert.strictEqual(evaluatePlay(tripleSingleHint).type, 'tripleSingle');
  assert.strictEqual(canBeat(tripleSingleHint, targetTripleSingle), true);

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

  const teammateLead = choosePlay(
    cardsFromRanks(['A', 'A', '2']),
    evaluatePlay(cardsFromRanks(['K'])),
    { teammateIsWinning: true },
  );
  assert.strictEqual(teammateLead.pass, true, 'farmer AI lets teammate keep the trick when possible');
}
