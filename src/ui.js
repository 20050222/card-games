import { getCardLabel } from './cards.js';

function cardClass(card, selected) {
  return `playing-card ${card.color === 'red' ? 'red' : 'black'} ${selected ? 'selected' : ''}`;
}

function actionButton(text, handler, variant = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `action-button ${variant}`.trim();
  button.textContent = text;
  button.addEventListener('click', handler);
  return button;
}

function renderCard(card, selectedIds, onToggleCard, interactive) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = cardClass(card, selectedIds.has(card.id));
  button.textContent = getCardLabel(card);
  button.disabled = !interactive;
  button.setAttribute('aria-pressed', selectedIds.has(card.id) ? 'true' : 'false');
  if (interactive) {
    button.addEventListener('click', () => onToggleCard(card.id));
  }
  return button;
}

function renderCardBacks(count) {
  const row = document.createElement('div');
  row.className = 'ai-card-row';
  for (let index = 0; index < Math.min(count, 12); index += 1) {
    const card = document.createElement('div');
    card.className = 'card-back';
    row.append(card);
  }
  return row;
}

function renderActions(state, handlers) {
  const bar = document.createElement('div');
  bar.className = 'action-bar';

  if (state.phase === 'bidding' && state.activeSeat === 0) {
    const hasCandidate = state.landlordCandidate !== null;
    const callButton = actionButton(hasCandidate ? '\u62a2\u5730\u4e3b' : '\u53eb\u5730\u4e3b', handlers.onBidCall);
    const passButton = actionButton(hasCandidate ? '\u4e0d\u62a2' : '\u4e0d\u53eb', handlers.onBidPass, 'secondary');
    bar.append(callButton, passButton);
    return bar;
  }

  if (state.phase === 'playing' && state.activeSeat === 0) {
    const playButton = actionButton('\u51fa\u724c', handlers.onPlay);
    const hintButton = actionButton('\u63d0\u793a', handlers.onHint, 'secondary');
    const passButton = actionButton('\u4e0d\u51fa', handlers.onPass, 'secondary');
    passButton.disabled = !state.lastPlay;
    bar.append(playButton, hintButton, passButton);
    return bar;
  }

  if (state.phase === 'gameOver') {
    bar.append(actionButton('\u518d\u6765\u4e00\u5c40', handlers.onNewRound));
  }

  return bar;
}

function renderSeat(seat, index, state, handlers) {
  const section = document.createElement('section');
  section.className = `seat ${index === 0 ? 'seat-player' : index === 1 ? 'seat-ai-left' : 'seat-ai-right'}`;

  const header = document.createElement('div');
  header.className = 'seat-header';
  const label = document.createElement('span');
  label.textContent = `${seat.name} \u00b7 ${seat.hand.length} \u5f20`;
  header.append(label);

  if (state.landlord === index) {
    const badge = document.createElement('span');
    badge.className = 'landlord-badge';
    badge.textContent = '\u5730\u4e3b';
    header.append(badge);
  }

  section.append(header);

  if (index === 0) {
    const hand = document.createElement('div');
    hand.className = 'hand-row';
    const selectedIds = new Set(state.selectedIds);
    const interactive = state.phase === 'playing' && state.activeSeat === 0;
    for (const card of seat.hand) {
      hand.append(renderCard(card, selectedIds, handlers.onToggleCard, interactive));
    }
    section.append(hand, renderActions(state, handlers));
  } else {
    section.append(renderCardBacks(seat.hand.length));
  }

  return section;
}

function renderBottomCards(state) {
  const wrapper = document.createElement('section');
  wrapper.className = 'bottom-cards';
  const title = document.createElement('h2');
  title.textContent = '\u5e95\u724c';
  wrapper.append(title);

  const row = document.createElement('div');
  row.className = 'bottom-card-row';
  if (state.bottomRevealed) {
    for (const card of state.bottomCards) {
      row.append(renderCard(card, new Set(), () => {}, false));
    }
  } else {
    for (let index = 0; index < state.bottomCards.length; index += 1) {
      const card = document.createElement('div');
      card.className = 'card-back';
      row.append(card);
    }
  }
  wrapper.append(row);
  return wrapper;
}

function springLabel(spring) {
  if (spring === 'spring') return '\u6625\u5929';
  if (spring === 'antiSpring') return '\u53cd\u6625';
  return '\u65e0';
}

function renderRoundStats(state) {
  const wrapper = document.createElement('section');
  wrapper.className = 'round-stats';

  const summary = document.createElement('p');
  summary.textContent = `\u5e95\u5206 ${state.baseScore || 1} \u00b7 \u500d\u6570 ${state.multiplier || 1}x \u00b7 \u70b8\u5f39 ${state.bombCount || 0} \u00b7 \u738b\u70b8 ${state.rocketCount || 0}`;
  wrapper.append(summary);

  if (state.settlement) {
    const settlement = document.createElement('p');
    settlement.textContent = `\u7ed3\u7b97 ${state.seats.map((seat, index) => `${seat.name} ${state.roundScores[index] > 0 ? '+' : ''}${state.roundScores[index]}`).join(' / ')} \u00b7 ${springLabel(state.spring)}`;
    wrapper.append(settlement);
  }

  return wrapper;
}

function renderLastPlay(state) {
  const wrapper = document.createElement('section');
  wrapper.className = 'last-play';
  const title = document.createElement('h2');
  title.textContent = state.lastPlay
    ? `${state.seats[state.lastPlay.seatIndex].name} \u521a\u51fa`
    : '\u7b49\u5f85\u51fa\u724c';
  wrapper.append(title);

  const row = document.createElement('div');
  row.className = 'played-card-row';
  if (state.lastPlay) {
    for (const card of state.lastPlay.cards) {
      row.append(renderCard(card, new Set(), () => {}, false));
    }
  }
  wrapper.append(row);
  return wrapper;
}

export function renderGame(state, handlers) {
  const root = document.querySelector('#gameRoot');
  const status = document.querySelector('#statusText');
  root.innerHTML = '';
  status.textContent = state.message;

  const center = document.createElement('div');
  center.className = 'table-center';
  center.append(renderBottomCards(state), renderRoundStats(state), renderLastPlay(state));

  root.append(
    renderSeat(state.seats[1], 1, state, handlers),
    renderSeat(state.seats[2], 2, state, handlers),
    center,
    renderSeat(state.seats[0], 0, state, handlers),
  );
}
