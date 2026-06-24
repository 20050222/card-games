import { RANK_VALUES, sortCards } from './cards.js';
import { canBeat, evaluatePlay } from './rules.js';

function groupByRank(cards) {
  const groups = new Map();
  for (const card of sortCards(cards, 'asc')) {
    if (!groups.has(card.rank)) {
      groups.set(card.rank, []);
    }
    groups.get(card.rank).push(card);
  }
  return [...groups.values()];
}

export function chooseBid(hand) {
  const groups = groupByRank(hand);
  let score = 0;
  for (const card of hand) {
    if (card.rank === 'SJ' || card.rank === 'BJ') score += 4;
    if (card.rank === '2') score += 2;
    if (card.rank === 'A') score += 1;
    if (card.rank === 'K') score += 0.5;
  }
  score += groups.filter((group) => group.length === 4).length * 5;
  return score >= 8;
}

function pushIfValid(candidates, cards) {
  const play = evaluatePlay(cards);
  if (play) {
    candidates.push({ cards: sortCards(cards), play });
  }
}

function buildBasicCandidates(hand) {
  const groups = groupByRank(hand);
  const candidates = [];

  for (const group of groups) {
    pushIfValid(candidates, [group[0]]);
    if (group.length >= 2) pushIfValid(candidates, group.slice(0, 2));
    if (group.length >= 3) pushIfValid(candidates, group.slice(0, 3));
    if (group.length === 4) pushIfValid(candidates, group.slice(0, 4));
  }

  const smallJoker = hand.find((card) => card.rank === 'SJ');
  const bigJoker = hand.find((card) => card.rank === 'BJ');
  if (smallJoker && bigJoker) {
    pushIfValid(candidates, [smallJoker, bigJoker]);
  }

  return candidates.sort((left, right) => {
    if (left.play.type === 'rocket' && right.play.type !== 'rocket') return 1;
    if (right.play.type === 'rocket' && left.play.type !== 'rocket') return -1;
    if (left.play.type === 'bomb' && right.play.type !== 'bomb') return 1;
    if (right.play.type === 'bomb' && left.play.type !== 'bomb') return -1;
    if (left.cards.length !== right.cards.length) return left.cards.length - right.cards.length;
    return left.play.mainValue - right.play.mainValue;
  });
}

export function findHint(hand, lastPlay) {
  const candidates = buildBasicCandidates(hand);
  const target = Array.isArray(lastPlay) ? evaluatePlay(lastPlay) : lastPlay;
  const match = candidates.find((candidate) => canBeat(candidate.play, target));
  return match ? match.cards : null;
}

export function choosePlay(hand, lastPlay) {
  const target = Array.isArray(lastPlay) ? evaluatePlay(lastPlay) : lastPlay;
  const cards = findHint(hand, target);
  if (!cards) {
    return { pass: true, cards: [] };
  }
  return { pass: false, cards, play: evaluatePlay(cards) };
}

export function rankHandStrength(hand) {
  return hand.reduce((total, card) => total + Math.max(0, RANK_VALUES[card.rank] - 10), 0);
}
