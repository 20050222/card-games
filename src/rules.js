import { RANK_VALUES, sortCards } from './cards.js';

const SEQUENCE_MAX_VALUE = RANK_VALUES.A;

function groupCards(cards) {
  const groups = new Map();
  for (const card of cards) {
    if (!groups.has(card.rank)) {
      groups.set(card.rank, []);
    }
    groups.get(card.rank).push(card);
  }
  return [...groups.entries()]
    .map(([rank, groupedCards]) => ({
      rank,
      value: RANK_VALUES[rank],
      count: groupedCards.length,
      cards: groupedCards,
    }))
    .sort((left, right) => left.value - right.value);
}

function areConsecutive(groups) {
  if (groups.some((group) => group.value > SEQUENCE_MAX_VALUE)) {
    return false;
  }
  for (let index = 1; index < groups.length; index += 1) {
    if (groups[index].value !== groups[index - 1].value + 1) {
      return false;
    }
  }
  return true;
}

function makePlay(type, cards, mainGroup, extra = {}) {
  return {
    type,
    cards: sortCards(cards),
    mainRank: mainGroup.rank,
    mainValue: mainGroup.value,
    length: cards.length,
    ...extra,
  };
}

function evaluateSequence(cards, groups) {
  if (cards.length >= 5 && groups.length === cards.length && areConsecutive(groups)) {
    return makePlay('straight', cards, groups[groups.length - 1], { sequenceLength: groups.length });
  }
  if (
    cards.length >= 6
    && cards.length % 2 === 0
    && groups.length >= 3
    && groups.every((group) => group.count === 2)
    && areConsecutive(groups)
  ) {
    return makePlay('consecutivePairs', cards, groups[groups.length - 1], { sequenceLength: groups.length });
  }
  return null;
}

function evaluateAirplane(cards, groups) {
  const tripleGroups = groups.filter((group) => group.count === 3);
  if (tripleGroups.length < 2 || !areConsecutive(tripleGroups)) {
    return null;
  }

  const tripleCardCount = tripleGroups.length * 3;
  const mainGroup = tripleGroups[tripleGroups.length - 1];

  if (cards.length === tripleCardCount && groups.length === tripleGroups.length) {
    return makePlay('airplane', cards, mainGroup, { sequenceLength: tripleGroups.length });
  }

  const nonTripleGroups = groups.filter((group) => group.count !== 3);
  if (
    cards.length === tripleGroups.length * 4
    && nonTripleGroups.reduce((total, group) => total + group.count, 0) === tripleGroups.length
  ) {
    return makePlay('airplaneSingles', cards, mainGroup, { sequenceLength: tripleGroups.length });
  }

  if (
    cards.length === tripleGroups.length * 5
    && nonTripleGroups.length === tripleGroups.length
    && nonTripleGroups.every((group) => group.count === 2)
  ) {
    return makePlay('airplanePairs', cards, mainGroup, { sequenceLength: tripleGroups.length });
  }

  return null;
}

function evaluateFourWithTwo(cards, groups) {
  const fourGroup = groups.find((group) => group.count === 4);
  if (!fourGroup) {
    return null;
  }

  if (cards.length === 4) {
    return makePlay('bomb', cards, fourGroup);
  }

  if (cards.length === 6) {
    return makePlay('fourTwoSingles', cards, fourGroup);
  }

  const sideGroups = groups.filter((group) => group.rank !== fourGroup.rank);
  if (cards.length === 8 && sideGroups.length === 2 && sideGroups.every((group) => group.count === 2)) {
    return makePlay('fourTwoPairs', cards, fourGroup);
  }

  return null;
}

export function evaluatePlay(cards) {
  if (!cards || cards.length === 0) {
    return null;
  }

  const sortedCards = sortCards(cards, 'asc');
  const groups = groupCards(sortedCards);
  const counts = groups.map((group) => group.count).sort((left, right) => right - left);

  if (cards.length === 1) {
    return makePlay('single', cards, groups[0]);
  }

  if (cards.length === 2) {
    if (groups.length === 2 && groups.some((group) => group.rank === 'SJ') && groups.some((group) => group.rank === 'BJ')) {
      return makePlay('rocket', cards, { rank: 'BJ', value: RANK_VALUES.BJ });
    }
    if (groups.length === 1) {
      return makePlay('pair', cards, groups[0]);
    }
    return null;
  }

  if (cards.length === 3 && groups.length === 1) {
    return makePlay('triple', cards, groups[0]);
  }

  const fourWithTwo = evaluateFourWithTwo(cards, groups);
  if (fourWithTwo) {
    return fourWithTwo;
  }

  if (cards.length === 4 && counts[0] === 3) {
    const tripleGroup = groups.find((group) => group.count === 3);
    return makePlay('tripleSingle', cards, tripleGroup);
  }

  if (cards.length === 5 && counts[0] === 3 && counts[1] === 2) {
    const tripleGroup = groups.find((group) => group.count === 3);
    return makePlay('triplePair', cards, tripleGroup);
  }

  const sequence = evaluateSequence(cards, groups);
  if (sequence) {
    return sequence;
  }

  const airplane = evaluateAirplane(cards, groups);
  if (airplane) {
    return airplane;
  }

  return null;
}

export function canBeat(candidateCards, targetCards) {
  const candidate = Array.isArray(candidateCards) ? evaluatePlay(candidateCards) : candidateCards;
  const target = Array.isArray(targetCards) ? evaluatePlay(targetCards) : targetCards;

  if (!candidate) {
    return false;
  }
  if (!target) {
    return true;
  }
  if (target.type === 'rocket') {
    return false;
  }
  if (candidate.type === 'rocket') {
    return true;
  }
  if (candidate.type === 'bomb' && target.type !== 'bomb') {
    return true;
  }
  if (candidate.type === 'bomb' && target.type === 'bomb') {
    return candidate.mainValue > target.mainValue;
  }
  if (candidate.type !== target.type || candidate.length !== target.length) {
    return false;
  }
  if (candidate.sequenceLength !== target.sequenceLength) {
    return false;
  }
  return candidate.mainValue > target.mainValue;
}

export function isLegalLead(cards) {
  return Boolean(evaluatePlay(cards));
}
