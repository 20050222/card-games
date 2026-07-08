import { chooseBid, choosePlay, findHints } from './ai.js';
import { bid, createGame, passTurn, playCards, selectCardsByIds } from './game.js';
import { renderGame } from './ui.js';

let state = createGame();
let aiTurnToken = 0;

function render() {
  renderGame(state, {
    onToggleCard: toggleCard,
    onBidCall: () => setState(bid(state, 0, true)),
    onBidPass: () => setState(bid(state, 0, false)),
    onPlay: playSelected,
    onPass: passSelected,
    onHint: hint,
    onNewRound: newRound,
  });
}

function setState(nextState) {
  state = nextState;
  render();
  queueAiTurn();
}

function toggleCard(cardId) {
  const selected = new Set(state.selectedIds);
  if (selected.has(cardId)) {
    selected.delete(cardId);
  } else {
    selected.add(cardId);
  }
  state = { ...state, selectedIds: [...selected], hintCursor: 0 };
  render();
}

function playSelected() {
  const cards = selectCardsByIds(state.seats[0].hand, state.selectedIds);
  setState(playCards(state, 0, cards));
}

function passSelected() {
  setState(passTurn(state, 0));
}

function hint() {
  const target = state.lastPlay ? state.lastPlay.play : null;
  const hints = findHints(state.seats[0].hand, target);
  const hintIndex = hints.length ? state.hintCursor % hints.length : 0;
  const cards = hints[hintIndex] || null;
  state = {
    ...state,
    selectedIds: cards ? cards.map((card) => card.id) : [],
    hintCursor: cards ? hintIndex + 1 : 0,
    message: cards
      ? `\u63d0\u793a ${hintIndex + 1}/${hints.length}\uff1a\u5df2\u4e3a\u4f60\u9009\u51fa\u4e00\u624b\u724c`
      : '\u6ca1\u6709\u53ef\u538b\u8fc7\u7684\u724c',
  };
  render();
}

function teammateIsWinning(seatIndex) {
  return Boolean(
    state.lastPlay
    && state.landlord !== null
    && seatIndex !== state.landlord
    && state.lastPlay.seatIndex !== state.landlord
    && state.lastPlay.seatIndex !== seatIndex,
  );
}

function newRound() {
  aiTurnToken += 1;
  setState(createGame({ totalScores: state.totalScores }));
}

function queueAiTurn() {
  aiTurnToken += 1;
  const token = aiTurnToken;

  if (state.phase === 'bidding' && state.activeSeat !== 0) {
    window.setTimeout(() => {
      if (token !== aiTurnToken || state.phase !== 'bidding' || state.activeSeat === 0) {
        return;
      }
      const seat = state.activeSeat;
      setState(bid(state, seat, chooseBid(state.seats[seat].hand)));
    }, 500);
  }

  if (state.phase === 'playing' && state.activeSeat !== 0) {
    window.setTimeout(() => {
      if (token !== aiTurnToken || state.phase !== 'playing' || state.activeSeat === 0) {
        return;
      }
      const seat = state.activeSeat;
      const target = state.lastPlay ? state.lastPlay.play : null;
      const decision = choosePlay(state.seats[seat].hand, target, {
        teammateIsWinning: teammateIsWinning(seat),
      });
      setState(decision.pass ? passTurn(state, seat) : playCards(state, seat, decision.cards));
    }, 700);
  }
}

document.querySelector('#newRoundButton').addEventListener('click', newRound);
render();
queueAiTurn();
