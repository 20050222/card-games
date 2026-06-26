import assert from 'assert';
import {
  bid,
  createGame,
  passTurn,
  playCards,
  selectCardsByRanks,
} from '../src/game.js';
import { cardsFromRanks } from './test-utils.js';

function cardIds(cards) {
  return cards.map((card) => card.id);
}

function dealSnapshot(game) {
  return {
    hands: game.seats.map((seat) => cardIds(seat.hand)),
    bottomCards: cardIds(game.bottomCards),
  };
}

export function run() {
  const deck = cardsFromRanks([
    '3','3','3','3','4','4','4','4','5','5','5','5','6','6','6','6','7',
    '7','7','7','8','8','8','8','9','9','9','9','10','10','10','10','J','J',
    'J','J','Q','Q','Q','Q','K','K','K','K','A','A','A','A','2','2','2',
    'SJ','BJ','2'
  ]);
  const game = createGame({ deck });

  assert.strictEqual(game.phase, 'bidding');
  assert.deepStrictEqual(game.seats.map((seat) => seat.hand.length), [17, 17, 17]);
  assert.strictEqual(game.bottomCards.length, 3);
  assert.strictEqual(game.bottomRevealed, false, 'bottom cards stay hidden during bidding');

  const firstCaller = bid(game, 0, true);
  assert.strictEqual(firstCaller.phase, 'bidding', 'calling landlord starts robbing instead of confirming immediately');
  assert.strictEqual(firstCaller.landlord, null);
  assert.strictEqual(firstCaller.landlordCandidate, 0);
  assert.strictEqual(firstCaller.activeSeat, 1);
  assert.strictEqual(firstCaller.seats[0].hand.length, 17);
  assert.strictEqual(firstCaller.bottomRevealed, false);

  const afterFirstRobPass = bid(firstCaller, 1, false);
  assert.strictEqual(afterFirstRobPass.phase, 'bidding');
  assert.strictEqual(afterFirstRobPass.landlordCandidate, 0);
  assert.strictEqual(afterFirstRobPass.activeSeat, 2);

  const landlordGame = bid(afterFirstRobPass, 2, false);
  assert.strictEqual(landlordGame.phase, 'playing');
  assert.strictEqual(landlordGame.landlord, 0);
  assert.strictEqual(landlordGame.activeSeat, 0);
  assert.strictEqual(landlordGame.seats[0].hand.length, 20);
  assert.strictEqual(landlordGame.bottomRevealed, true, 'bottom cards reveal after landlord is confirmed');

  const robStart = bid(game, 0, true);
  const robbed = bid(robStart, 1, true);
  const robbedFinal = bid(robbed, 2, false);
  assert.strictEqual(robbedFinal.phase, 'playing');
  assert.strictEqual(robbedFinal.landlord, 1, 'AI can rob landlord from the first caller');
  assert.strictEqual(robbedFinal.seats[1].hand.length, 20);

  const unownedPlay = playCards(landlordGame, 0, [landlordGame.seats[1].hand[0]]);
  assert.strictEqual(unownedPlay.activeSeat, 0);
  assert.strictEqual(unownedPlay.seats[0].hand.length, 20);
  assert.strictEqual(unownedPlay.lastPlay, null);
  assert.match(unownedPlay.message, /手牌|not in hand/i);

  const oneOwnedCard = landlordGame.seats[0].hand[0];
  const duplicatePlay = playCards(landlordGame, 0, [oneOwnedCard, oneOwnedCard]);
  assert.strictEqual(duplicatePlay.activeSeat, 0);
  assert.strictEqual(duplicatePlay.seats[0].hand.length, 20);
  assert.strictEqual(duplicatePlay.lastPlay, null);
  assert.match(duplicatePlay.message, /手牌|not in hand/i);

  const allPassStart = createGame({ deck });
  const allPassOne = bid(allPassStart, 0, false);
  const allPassTwo = bid(allPassOne, 1, false);
  const allPassRedeal = bid(allPassTwo, 2, false);
  assert.match(allPassRedeal.message, /所有|everyone|passed/i);
  assert.match(allPassRedeal.message, /重新发牌|redealt/i);
  assert.deepStrictEqual(dealSnapshot(allPassRedeal), dealSnapshot(allPassStart));

  const firstPlayCards = selectCardsByRanks(landlordGame.seats[0].hand, ['2']);
  const afterPlay = playCards(landlordGame, 0, firstPlayCards);
  assert.strictEqual(afterPlay.seats[0].hand.length, 19);
  assert.strictEqual(afterPlay.activeSeat, 1);
  assert(afterPlay.lastPlay, 'last play is recorded');

  const afterPassOne = passTurn(afterPlay, 1);
  assert.strictEqual(afterPassOne.passCount, 1);
  assert.strictEqual(afterPassOne.activeSeat, 2);
  assert.notStrictEqual(afterPassOne.lastPlay.cards, afterPlay.lastPlay.cards);

  const afterPassTwo = passTurn(afterPassOne, 2);
  assert.strictEqual(afterPassTwo.passCount, 0, 'two passes clear trick pass count');
  assert.strictEqual(afterPassTwo.lastPlay, null, 'two passes clear last play');
  assert.strictEqual(afterPassTwo.activeSeat, 0, 'original player leads again');

  const winningGame = {
    ...landlordGame,
    seats: landlordGame.seats.map((seat, index) => ({
      ...seat,
      hand: index === 0 ? selectCardsByRanks(landlordGame.seats[0].hand, ['2']) : seat.hand,
    })),
    activeSeat: 0,
    lastPlay: null,
  };
  const finished = playCards(winningGame, 0, winningGame.seats[0].hand);
  assert.strictEqual(finished.phase, 'gameOver');
  assert.strictEqual(finished.winnerSide, 'landlord');
}
