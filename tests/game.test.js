import assert from 'assert';
import {
  bid,
  createGame,
  passTurn,
  playCards,
  selectCardsByRanks,
} from '../src/game.js';
import { cardsFromRanks } from './test-utils.js';

export function run() {
  const game = createGame({ deck: cardsFromRanks([
    '3','3','3','3','4','4','4','4','5','5','5','5','6','6','6','6','7',
    '7','7','7','8','8','8','8','9','9','9','9','10','10','10','10','J','J',
    'J','J','Q','Q','Q','Q','K','K','K','K','A','A','A','A','2','2','2',
    'SJ','BJ','2'
  ]) });

  assert.strictEqual(game.phase, 'bidding');
  assert.deepStrictEqual(game.seats.map((seat) => seat.hand.length), [17, 17, 17]);
  assert.strictEqual(game.bottomCards.length, 3);

  const landlordGame = bid(game, 0, true);
  assert.strictEqual(landlordGame.phase, 'playing');
  assert.strictEqual(landlordGame.landlord, 0);
  assert.strictEqual(landlordGame.activeSeat, 0);
  assert.strictEqual(landlordGame.seats[0].hand.length, 20);

  const firstPlayCards = selectCardsByRanks(landlordGame.seats[0].hand, ['2']);
  const afterPlay = playCards(landlordGame, 0, firstPlayCards);
  assert.strictEqual(afterPlay.seats[0].hand.length, 19);
  assert.strictEqual(afterPlay.activeSeat, 1);
  assert(afterPlay.lastPlay, 'last play is recorded');

  const afterPassOne = passTurn(afterPlay, 1);
  assert.strictEqual(afterPassOne.passCount, 1);
  assert.strictEqual(afterPassOne.activeSeat, 2);

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
