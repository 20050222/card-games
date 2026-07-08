import { RANK_VALUES, sortCards } from './cards.js';
import { canBeat, evaluatePlay } from './rules.js';

const SEQUENCE_MAX_VALUE = RANK_VALUES.A;

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

function groupValue(group) {
  return RANK_VALUES[group[0].rank];
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

function getConsecutiveSlices(groups, minLength) {
  const slices = [];
  for (let start = 0; start < groups.length; start += 1) {
    const slice = [groups[start]];
    for (let end = start + 1; end < groups.length; end += 1) {
      if (groupValue(groups[end]) !== groupValue(groups[end - 1]) + 1) {
        break;
      }
      slice.push(groups[end]);
      if (slice.length >= minLength) {
        slices.push(slice.slice());
      }
    }
  }
  return slices;
}

function groupsToCards(groups, count) {
  return groups.flatMap((group) => group.slice(0, count));
}

function chooseGroupCombinations(groups, count) {
  const combinations = [];

  function collect(start, selected) {
    if (selected.length === count) {
      combinations.push(selected.slice());
      return;
    }

    for (let index = start; index < groups.length; index += 1) {
      selected.push(groups[index]);
      collect(index + 1, selected);
      selected.pop();
    }
  }

  collect(0, []);
  return combinations;
}

function addSequentialCandidates(candidates, groups) {
  const sequenceGroups = groups.filter((group) => groupValue(group) <= SEQUENCE_MAX_VALUE);

  for (const slice of getConsecutiveSlices(sequenceGroups, 5)) {
    pushIfValid(candidates, groupsToCards(slice, 1));
  }

  const pairGroups = sequenceGroups.filter((group) => group.length >= 2);
  for (const slice of getConsecutiveSlices(pairGroups, 3)) {
    pushIfValid(candidates, groupsToCards(slice, 2));
  }

  const tripleGroups = sequenceGroups.filter((group) => group.length >= 3);
  for (const slice of getConsecutiveSlices(tripleGroups, 2)) {
    const tripleCards = groupsToCards(slice, 3);
    const tripleRanks = new Set(slice.map((group) => group[0].rank));
    const sideGroups = groups.filter((group) => !tripleRanks.has(group[0].rank));

    pushIfValid(candidates, tripleCards);

    const singleSideGroups = sideGroups.slice(0, slice.length);
    if (singleSideGroups.length === slice.length) {
      pushIfValid(candidates, [...tripleCards, ...groupsToCards(singleSideGroups, 1)]);
    }

    const pairSideGroups = sideGroups.filter((group) => group.length >= 2).slice(0, slice.length);
    if (pairSideGroups.length === slice.length) {
      pushIfValid(candidates, [...tripleCards, ...groupsToCards(pairSideGroups, 2)]);
    }
  }
}

function addTripleAttachmentCandidates(candidates, groups) {
  const tripleGroups = groups.filter((group) => group.length >= 3);

  for (const tripleGroup of tripleGroups) {
    const sideGroups = groups.filter((group) => group[0].rank !== tripleGroup[0].rank);
    const tripleCards = tripleGroup.slice(0, 3);
    const singleSideGroup = sideGroups[0];

    if (singleSideGroup) {
      pushIfValid(candidates, [...tripleCards, singleSideGroup[0]]);
    }

    const pairSideGroup = sideGroups.find((group) => group.length >= 2);
    if (pairSideGroup) {
      pushIfValid(candidates, [...tripleCards, ...pairSideGroup.slice(0, 2)]);
    }
  }
}

function addFourWithTwoCandidates(candidates, groups) {
  const fourGroups = groups.filter((group) => group.length === 4);

  for (const fourGroup of fourGroups) {
    const sideGroups = groups.filter((group) => group[0].rank !== fourGroup[0].rank);

    for (const singleSideGroups of chooseGroupCombinations(sideGroups, 2)) {
      pushIfValid(candidates, [...fourGroup, ...groupsToCards(singleSideGroups, 1)]);
    }

    const pairSideGroups = sideGroups.filter((group) => group.length >= 2);
    for (const pairSideGroupSelection of chooseGroupCombinations(pairSideGroups, 2)) {
      pushIfValid(candidates, [...fourGroup, ...groupsToCards(pairSideGroupSelection, 2)]);
    }
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

  addSequentialCandidates(candidates, groups);
  addTripleAttachmentCandidates(candidates, groups);
  addFourWithTwoCandidates(candidates, groups);

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
  const hints = findHints(hand, lastPlay);
  return hints[0] || null;
}

export function findHints(hand, lastPlay) {
  const candidates = buildBasicCandidates(hand);
  const target = Array.isArray(lastPlay) ? evaluatePlay(lastPlay) : lastPlay;
  return candidates
    .filter((candidate) => canBeat(candidate.play, target))
    .map((candidate) => candidate.cards);
}

export function choosePlay(hand, lastPlay, options = {}) {
  if (options.teammateIsWinning && lastPlay) {
    return { pass: true, cards: [] };
  }
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
