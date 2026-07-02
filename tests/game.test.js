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
  assert.deepStrictEqual(game.totalScores, [0, 0, 0], 'new match starts with zero total scores');

  const carriedScoreGame = createGame({ deck, totalScores: [12, -4, -8] });
  assert.deepStrictEqual(carriedScoreGame.totalScores, [12, -4, -8], 'new round can carry match totals');

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
  assert.strictEqual(robbed.bidMultiplier, 2, 'rob landlord doubles bidding multiplier');
  assert.strictEqual(robbed.multiplier, 2, 'rob landlord doubles round multiplier');
  const robbedFinal = bid(robbed, 2, false);
  assert.strictEqual(robbedFinal.phase, 'playing');
  assert.strictEqual(robbedFinal.landlord, 1, 'AI can rob landlord from the first caller');
  assert.strictEqual(robbedFinal.seats[1].hand.length, 20);
  assert.strictEqual(robbedFinal.multiplier, 2);

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
  assert.strictEqual(afterPlay.playActionCounts[0], 1, 'successful plays are counted by seat');
  assert.strictEqual(afterPlay.playedCardCounts[0], 1, 'played cards are counted by seat');

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
  assert.strictEqual(finished.spring, 'spring');
  assert.deepStrictEqual(finished.roundScores, [4, -2, -2], 'spring doubles landlord win settlement');
  assert.deepStrictEqual(finished.totalScores, [4, -2, -2], 'round scores are added to match totals');
  const nextMatchRound = createGame({ deck, totalScores: finished.totalScores });
  assert.deepStrictEqual(nextMatchRound.totalScores, [4, -2, -2], 'next round keeps cumulative scores');

  const bombCards = selectCardsByRanks(landlordGame.seats[0].hand, ['3', '3', '3', '3']);
  const afterBomb = playCards(landlordGame, 0, bombCards);
  assert.strictEqual(afterBomb.multiplier, 2, 'bomb doubles multiplier');
  assert.strictEqual(afterBomb.bombCount, 1);

  const afterBombPassOne = passTurn(afterBomb, 1);
  const afterBombPassTwo = passTurn(afterBombPassOne, 2);
  const rocketCards = selectCardsByRanks(afterBombPassTwo.seats[0].hand, ['SJ', 'BJ']);
  const afterRocket = playCards(afterBombPassTwo, 0, rocketCards);
  assert.strictEqual(afterRocket.multiplier, 4, 'rocket doubles multiplier after bomb');
  assert.strictEqual(afterRocket.rocketCount, 1);

  const alarmGame = {
    ...landlordGame,
    seats: landlordGame.seats.map((seat, index) => ({
      ...seat,
      hand: index === 0 ? selectCardsByRanks(landlordGame.seats[0].hand, ['3', '4', '5']) : seat.hand,
    })),
    activeSeat: 0,
    lastPlay: null,
  };
  const afterAlarm = playCards(alarmGame, 0, selectCardsByRanks(alarmGame.seats[0].hand, ['3']));
  assert.deepStrictEqual(afterAlarm.lastAlarm, { seatIndex: 0, remaining: 2 });
  assert.match(afterAlarm.message, /2|两|兩/, 'alarm message mentions remaining two cards');

  const antiSpringGame = {
    ...landlordGame,
    seats: landlordGame.seats.map((seat, index) => ({
      ...seat,
      hand: index === 1 ? selectCardsByRanks(landlordGame.seats[1].hand, ['8']) : seat.hand,
    })),
    activeSeat: 1,
    lastPlay: null,
    playActionCounts: [1, 0, 0],
    playedCardCounts: [1, 0, 0],
  };
  const antiSpringFinished = playCards(
    antiSpringGame,
    1,
    antiSpringGame.seats[1].hand,
  );
  assert.strictEqual(antiSpringFinished.phase, 'gameOver');
  assert.strictEqual(antiSpringFinished.winnerSide, 'farmers');
  assert.strictEqual(antiSpringFinished.spring, 'antiSpring');
  assert.deepStrictEqual(antiSpringFinished.roundScores, [-4, 2, 2], 'anti-spring doubles farmer win settlement');
}
