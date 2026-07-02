(function startGame() {
  const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'SJ', 'BJ'];
  const RANK_VALUES = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 3]));
  const SUITS = ['\u2660', '\u2665', '\u2663', '\u2666'];
  const RED_SUITS = new Set(['\u2665', '\u2666']);
  const SEQUENCE_MAX_VALUE = RANK_VALUES.A;
  const SEATS = [
    { id: 'player', name: '\u4f60', kind: 'human' },
    { id: 'ai-left', name: '\u5de6\u5bb6 AI', kind: 'ai' },
    { id: 'ai-right', name: '\u53f3\u5bb6 AI', kind: 'ai' },
  ];

  let state = createGame();
  let aiTurnToken = 0;
  let soundEnabled = true;
  let audioContext = null;

  function createDeck() {
    const cards = [];
    for (const rank of RANKS.slice(0, 13)) {
      for (const suit of SUITS) {
        cards.push({
          id: `${rank}-${suit}`,
          rank,
          suit,
          value: RANK_VALUES[rank],
          color: RED_SUITS.has(suit) ? 'red' : 'black',
        });
      }
    }
    cards.push({ id: 'SJ', rank: 'SJ', suit: 'JOKER', value: RANK_VALUES.SJ, color: 'black' });
    cards.push({ id: 'BJ', rank: 'BJ', suit: 'JOKER', value: RANK_VALUES.BJ, color: 'red' });
    return cards;
  }

  function shuffleDeck(deck, rng = Math.random) {
    const copy = deck.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function sortCards(cards, direction = 'desc') {
    const multiplier = direction === 'asc' ? 1 : -1;
    return cards.slice().sort((left, right) => {
      if (left.value !== right.value) {
        return (left.value - right.value) * multiplier;
      }
      return String(left.suit).localeCompare(String(right.suit)) * multiplier;
    });
  }

  function dealCards(deck) {
    return {
      hands: [
        sortCards(deck.slice(0, 17)),
        sortCards(deck.slice(17, 34)),
        sortCards(deck.slice(34, 51)),
      ],
      bottomCards: sortCards(deck.slice(51, 54)),
    };
  }

  function getCardLabel(card) {
    if (card.rank === 'SJ') return '\u5c0f\u738b';
    if (card.rank === 'BJ') return '\u5927\u738b';
    return `${card.rank}${card.suit}`;
  }

  function getRankVoice(rank) {
    const names = {
      '3': '\u4e09',
      '4': '\u56db',
      '5': '\u4e94',
      '6': '\u516d',
      '7': '\u4e03',
      '8': '\u516b',
      '9': '\u4e5d',
      '10': '\u5341',
      J: 'J',
      Q: 'Q',
      K: 'K',
      A: 'A',
      '2': '\u4e8c',
      SJ: '\u5c0f\u738b',
      BJ: '\u5927\u738b',
    };
    return names[rank] || rank;
  }

  function describePlay(play) {
    if (!play) return '';
    const rank = getRankVoice(play.mainRank);
    const names = {
      single: `\u4e00\u5f20${rank}`,
      pair: `\u4e00\u5bf9${rank}`,
      triple: `\u4e09\u5f20${rank}`,
      tripleSingle: '\u4e09\u5e26\u4e00',
      triplePair: '\u4e09\u5e26\u4e00\u5bf9',
      straight: '\u987a\u5b50',
      consecutivePairs: '\u8fde\u5bf9',
      airplane: '\u98de\u673a',
      airplaneSingles: '\u98de\u673a\u5e26\u7fc5\u8180',
      airplanePairs: '\u98de\u673a\u5e26\u5bf9',
      bomb: '\u70b8\u5f39',
      rocket: '\u738b\u70b8',
      fourTwoSingles: '\u56db\u5e26\u4e8c',
      fourTwoPairs: '\u56db\u5e26\u4e24\u5bf9',
    };
    return names[play.type] || '\u51fa\u724c';
  }

  function getAudioContext() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!audioContext) audioContext = new AudioContextCtor();
    if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
      const resumePromise = audioContext.resume();
      if (resumePromise && typeof resumePromise.catch === 'function') resumePromise.catch(() => {});
    }
    return audioContext;
  }

  function playTone(frequency, duration, type = 'sine', volume = 0.045, delay = 0) {
    const context = getAudioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration);
  }

  function speakCue(text) {
    if (
      !soundEnabled
      || !text
      || !window.speechSynthesis
      || typeof window.speechSynthesis.speak !== 'function'
      || !window.SpeechSynthesisUtterance
    ) return;
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.08;
    utterance.pitch = 1;
    if (typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function playSound(name, cueText = '') {
    if (!soundEnabled) return;
    speakCue(cueText);
    const patterns = {
      call: [[523, 0.08, 'triangle', 0.05], [659, 0.09, 'triangle', 0.045]],
      rob: [[659, 0.07, 'triangle', 0.05], [784, 0.1, 'triangle', 0.05]],
      passBid: [[247, 0.09, 'sine', 0.04]],
      passRob: [[220, 0.09, 'sine', 0.04]],
      bid: [[523, 0.08, 'triangle', 0.05], [659, 0.09, 'triangle', 0.045]],
      pass: [[247, 0.09, 'sine', 0.04]],
      play: [[392, 0.06, 'square', 0.035], [523, 0.07, 'square', 0.03]],
      single: [[392, 0.05, 'sine', 0.035]],
      pair: [[392, 0.05, 'sine', 0.035], [392, 0.05, 'sine', 0.03]],
      triple: [[392, 0.05, 'triangle', 0.035], [392, 0.05, 'triangle', 0.035], [392, 0.05, 'triangle', 0.035]],
      bomb: [[196, 0.08, 'square', 0.05], [98, 0.16, 'square', 0.055]],
      rocket: [[784, 0.08, 'sawtooth', 0.04], [988, 0.14, 'sawtooth', 0.045]],
      straight: [[440, 0.045, 'sine', 0.03], [494, 0.045, 'sine', 0.03], [554, 0.06, 'sine', 0.03]],
      consecutivePairs: [[330, 0.05, 'triangle', 0.032], [392, 0.05, 'triangle', 0.032], [494, 0.06, 'triangle', 0.032]],
      tripleSingle: [[392, 0.05, 'triangle', 0.034], [392, 0.05, 'triangle', 0.034], [523, 0.07, 'sine', 0.03]],
      triplePair: [[392, 0.05, 'triangle', 0.034], [392, 0.05, 'triangle', 0.034], [523, 0.05, 'sine', 0.03], [523, 0.06, 'sine', 0.03]],
      airplane: [[523, 0.05, 'sine', 0.03], [659, 0.05, 'sine', 0.03], [784, 0.08, 'sine', 0.03]],
      airplaneSingles: [[523, 0.05, 'sine', 0.03], [659, 0.05, 'sine', 0.03], [784, 0.08, 'sine', 0.03]],
      airplanePairs: [[523, 0.05, 'sine', 0.03], [659, 0.05, 'sine', 0.03], [784, 0.08, 'sine', 0.03]],
      fourTwoSingles: [[220, 0.06, 'square', 0.035], [330, 0.06, 'square', 0.035], [440, 0.06, 'square', 0.035]],
      fourTwoPairs: [[220, 0.06, 'square', 0.035], [330, 0.06, 'square', 0.035], [440, 0.06, 'square', 0.035]],
      hint: [[784, 0.05, 'sine', 0.035]],
      win: [[523, 0.08, 'triangle', 0.05], [659, 0.08, 'triangle', 0.05], [784, 0.12, 'triangle', 0.05]],
      new: [[330, 0.08, 'sine', 0.04], [440, 0.08, 'sine', 0.04]],
    };
    const pattern = patterns[name] || patterns.hint;
    pattern.forEach(([frequency, duration, type, volume], index) => {
      playTone(frequency, duration, type, volume, index * 0.075);
    });
  }

  function playSoundForPlay(play) {
    if (!play) return;
    playSound(play.type, describePlay(play));
  }

  function settlementCue(currentState) {
    const winner = currentState.winnerSide === 'landlord' ? '\u5730\u4e3b\u83b7\u80dc' : '\u519c\u6c11\u83b7\u80dc';
    if (currentState.spring === 'spring') return `\u6625\u5929\uff0c${winner}`;
    if (currentState.spring === 'antiSpring') return `\u53cd\u6625\uff0c${winner}`;
    return winner;
  }

  function playAlarmSound(currentState) {
    if (!currentState.lastAlarm) return;
    window.setTimeout(() => {
      playSound('hint', currentState.lastAlarm.remaining === 1 ? '\u62a5\u5355' : '\u62a5\u53cc');
    }, 450);
  }

  function updateSoundButton() {
    const button = document.querySelector('#soundToggleButton');
    if (!button) return;
    button.textContent = soundEnabled ? '\u58f0\u97f3' : '\u9759\u97f3';
    button.setAttribute('aria-pressed', soundEnabled ? 'false' : 'true');
    button.title = soundEnabled ? '\u5173\u95ed\u58f0\u97f3' : '\u6253\u5f00\u58f0\u97f3';
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    updateSoundButton();
    if (soundEnabled) playSound('hint', '\u63d0\u793a');
  }

  function removeCards(hand, cardsToRemove) {
    const removeIds = new Set(cardsToRemove.map((card) => card.id));
    return hand.filter((card) => !removeIds.has(card.id));
  }

  function findCardsByIds(hand, cardIds) {
    const idSet = new Set(cardIds);
    return hand.filter((card) => idSet.has(card.id));
  }

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
      && nonTripleGroups.length === tripleGroups.length
      && nonTripleGroups.every((group) => group.count === 1)
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
    const sideGroups = groups.filter((group) => group.rank !== fourGroup.rank);
    if (cards.length === 6 && sideGroups.length === 2 && sideGroups.every((group) => group.count === 1)) {
      return makePlay('fourTwoSingles', cards, fourGroup);
    }
    if (cards.length === 8 && sideGroups.length === 2 && sideGroups.every((group) => group.count === 2)) {
      return makePlay('fourTwoPairs', cards, fourGroup);
    }
    return null;
  }

  function evaluatePlay(cards) {
    if (!cards || cards.length === 0) {
      return null;
    }
    const groups = groupCards(sortCards(cards, 'asc'));
    const counts = groups.map((group) => group.count).sort((left, right) => right - left);
    if (cards.length === 1) {
      return makePlay('single', cards, groups[0]);
    }
    if (cards.length === 2) {
      if (groups.length === 2 && groups.some((group) => group.rank === 'SJ') && groups.some((group) => group.rank === 'BJ')) {
        return makePlay('rocket', cards, { rank: 'BJ', value: RANK_VALUES.BJ });
      }
      return groups.length === 1 ? makePlay('pair', cards, groups[0]) : null;
    }
    if (cards.length === 3 && groups.length === 1) {
      return makePlay('triple', cards, groups[0]);
    }
    const fourWithTwo = evaluateFourWithTwo(cards, groups);
    if (fourWithTwo) {
      return fourWithTwo;
    }
    if (cards.length === 4 && counts[0] === 3) {
      return makePlay('tripleSingle', cards, groups.find((group) => group.count === 3));
    }
    if (cards.length === 5 && counts[0] === 3 && counts[1] === 2) {
      return makePlay('triplePair', cards, groups.find((group) => group.count === 3));
    }
    return evaluateSequence(cards, groups) || evaluateAirplane(cards, groups);
  }

  function canBeat(candidateCards, targetCards) {
    const candidate = Array.isArray(candidateCards) ? evaluatePlay(candidateCards) : candidateCards;
    const target = Array.isArray(targetCards) ? evaluatePlay(targetCards) : targetCards;
    if (!candidate) return false;
    if (!target) return true;
    if (target.type === 'rocket') return false;
    if (candidate.type === 'rocket') return true;
    if (candidate.type === 'bomb' && target.type !== 'bomb') return true;
    if (candidate.type === 'bomb' && target.type === 'bomb') return candidate.mainValue > target.mainValue;
    if (candidate.type !== target.type || candidate.length !== target.length) return false;
    if (candidate.sequenceLength !== target.sequenceLength) return false;
    return candidate.mainValue > target.mainValue;
  }

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

  function chooseBid(hand) {
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
        if (groupValue(groups[end]) !== groupValue(groups[end - 1]) + 1) break;
        slice.push(groups[end]);
        if (slice.length >= minLength) slices.push(slice.slice());
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
    for (const tripleGroup of groups.filter((group) => group.length >= 3)) {
      const sideGroups = groups.filter((group) => group[0].rank !== tripleGroup[0].rank);
      const tripleCards = tripleGroup.slice(0, 3);
      if (sideGroups[0]) {
        pushIfValid(candidates, [...tripleCards, sideGroups[0][0]]);
      }
      const pairSideGroup = sideGroups.find((group) => group.length >= 2);
      if (pairSideGroup) {
        pushIfValid(candidates, [...tripleCards, ...pairSideGroup.slice(0, 2)]);
      }
    }
  }

  function addFourWithTwoCandidates(candidates, groups) {
    for (const fourGroup of groups.filter((group) => group.length === 4)) {
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
    if (smallJoker && bigJoker) pushIfValid(candidates, [smallJoker, bigJoker]);
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

  function findHint(hand, lastPlay) {
    const candidates = buildBasicCandidates(hand);
    const target = Array.isArray(lastPlay) ? evaluatePlay(lastPlay) : lastPlay;
    const match = candidates.find((candidate) => canBeat(candidate.play, target));
    return match ? match.cards : null;
  }

  function choosePlay(hand, lastPlay) {
    const target = Array.isArray(lastPlay) ? evaluatePlay(lastPlay) : lastPlay;
    const cards = findHint(hand, target);
    if (!cards) {
      return { pass: true, cards: [] };
    }
    return { pass: false, cards, play: evaluatePlay(cards) };
  }

  function nextSeat(index) {
    return (index + 1) % 3;
  }

  function createDealOptions(options) {
    return {
      ...(options.deck ? { deck: options.deck } : {}),
      ...(options.rng ? { rng: options.rng } : {}),
      ...(options.totalScores ? { totalScores: options.totalScores.slice() } : {}),
    };
  }

  function areCardsInHand(hand, cards) {
    const handIds = new Set(hand.map((card) => card.id));
    const selectedIds = new Set();
    return cards.every((card) => {
      if (!card || !handIds.has(card.id) || selectedIds.has(card.id)) return false;
      selectedIds.add(card.id);
      return true;
    });
  }

  function cloneState(stateToClone) {
    return {
      ...stateToClone,
      seats: stateToClone.seats.map((seat) => ({ ...seat, hand: seat.hand.slice() })),
      bottomCards: stateToClone.bottomCards.slice(),
      bids: stateToClone.bids.slice(),
      playActionCounts: (stateToClone.playActionCounts || [0, 0, 0]).slice(),
      playedCardCounts: (stateToClone.playedCardCounts || [0, 0, 0]).slice(),
      selectedIds: stateToClone.selectedIds.slice(),
      dealOptions: { ...(stateToClone.dealOptions || {}) },
      lastPlay: stateToClone.lastPlay
        ? { ...stateToClone.lastPlay, cards: stateToClone.lastPlay.cards.slice() }
        : null,
      lastAlarm: stateToClone.lastAlarm ? { ...stateToClone.lastAlarm } : null,
      roundScores: (stateToClone.roundScores || [0, 0, 0]).slice(),
      totalScores: (stateToClone.totalScores || [0, 0, 0]).slice(),
      settlement: stateToClone.settlement
        ? {
          ...stateToClone.settlement,
          roundScores: stateToClone.settlement.roundScores.slice(),
          totalScores: stateToClone.settlement.totalScores.slice(),
        }
        : null,
    };
  }

  function createGame(options = {}) {
    const deck = options.deck || shuffleDeck(createDeck(), options.rng || Math.random);
    const deal = dealCards(deck);
    return {
      phase: 'bidding',
      seats: SEATS.map((seat, index) => ({ ...seat, hand: deal.hands[index], role: 'farmer' })),
      bottomCards: deal.bottomCards,
      bottomRevealed: false,
      landlord: null,
      landlordCandidate: null,
      activeSeat: 0,
      bids: [],
      bidPasses: 0,
      biddingTurns: 0,
      baseScore: 1,
      multiplier: 1,
      bidMultiplier: 1,
      bombCount: 0,
      rocketCount: 0,
      playActionCounts: [0, 0, 0],
      playedCardCounts: [0, 0, 0],
      dealOptions: createDealOptions(options),
      lastPlay: null,
      passCount: 0,
      selectedIds: [],
      lastAlarm: null,
      spring: null,
      winnerSide: null,
      roundScores: [0, 0, 0],
      totalScores: (options.totalScores || [0, 0, 0]).slice(),
      settlement: null,
      message: '\u8bf7\u9009\u62e9\u662f\u5426\u53eb\u5730\u4e3b',
    };
  }

  function finalizeLandlord(currentState, landlordIndex) {
    const next = cloneState(currentState);
    next.phase = 'playing';
    next.landlord = landlordIndex;
    next.landlordCandidate = landlordIndex;
    next.activeSeat = landlordIndex;
    next.bottomRevealed = true;
    next.seats = next.seats.map((seat, index) => ({
      ...seat,
      role: index === landlordIndex ? 'landlord' : 'farmer',
      hand: index === landlordIndex ? sortCards(seat.hand.concat(next.bottomCards)) : seat.hand,
    }));
    next.message = `${next.seats[landlordIndex].name} \u6210\u4e3a\u5730\u4e3b`;
    return next;
  }

  function applyRobMultiplier(currentState) {
    currentState.bidMultiplier *= 2;
    currentState.multiplier *= 2;
  }

  function applyPlayMultiplier(currentState, play) {
    if (play.type === 'bomb') {
      currentState.bombCount += 1;
      currentState.multiplier *= 2;
    }
    if (play.type === 'rocket') {
      currentState.rocketCount += 1;
      currentState.multiplier *= 2;
    }
  }

  function detectSpring(currentState, winnerSeatIndex) {
    const landlordIndex = currentState.landlord;
    if (winnerSeatIndex === landlordIndex) {
      const farmersNeverPlayed = currentState.playActionCounts.every((count, index) => (
        index === landlordIndex || count === 0
      ));
      return farmersNeverPlayed ? 'spring' : null;
    }
    return currentState.playActionCounts[landlordIndex] <= 1 ? 'antiSpring' : null;
  }

  function settleRound(currentState, winnerSeatIndex) {
    const spring = detectSpring(currentState, winnerSeatIndex);
    if (spring) {
      currentState.spring = spring;
      currentState.multiplier *= 2;
    }
    const unitScore = currentState.baseScore * currentState.multiplier;
    const landlordWon = winnerSeatIndex === currentState.landlord;
    currentState.roundScores = currentState.seats.map((seat, index) => {
      if (index === currentState.landlord) {
        return landlordWon ? unitScore * 2 : -unitScore * 2;
      }
      return landlordWon ? -unitScore : unitScore;
    });
    currentState.totalScores = currentState.totalScores.map((score, index) => score + currentState.roundScores[index]);
    currentState.settlement = {
      baseScore: currentState.baseScore,
      multiplier: currentState.multiplier,
      winnerSide: currentState.winnerSide,
      spring: currentState.spring,
      roundScores: currentState.roundScores.slice(),
      totalScores: currentState.totalScores.slice(),
    };
  }

  function applyAlarm(currentState, seatIndex) {
    const remaining = currentState.seats[seatIndex].hand.length;
    if (remaining !== 1 && remaining !== 2) {
      currentState.lastAlarm = null;
      return;
    }
    currentState.lastAlarm = { seatIndex, remaining };
    currentState.message = `${currentState.message}\uff0c${currentState.seats[seatIndex].name}\u53ea\u5269 ${remaining} \u5f20\u724c`;
  }

  function bid(currentState, seatIndex, wantsLandlord) {
    if (currentState.phase !== 'bidding' || currentState.activeSeat !== seatIndex) {
      return { ...currentState, message: '\u8fd8\u6ca1\u6709\u8f6e\u5230\u8be5\u73a9\u5bb6\u53eb\u5730\u4e3b' };
    }
    const next = cloneState(currentState);
    const isRobbing = next.landlordCandidate !== null;
    const action = isRobbing
      ? wantsLandlord ? 'rob' : 'passRob'
      : wantsLandlord ? 'call' : 'passCall';

    next.bids.push({ seatIndex, wantsLandlord, action });
    next.biddingTurns += 1;

    if (wantsLandlord) {
      next.landlordCandidate = seatIndex;
      if (isRobbing) {
        applyRobMultiplier(next);
      }
    } else if (!isRobbing) {
      next.bidPasses += 1;
    }

    if (next.landlordCandidate === null && next.biddingTurns >= 3) {
      return { ...createGame(next.dealOptions), message: '\u6240\u6709\u73a9\u5bb6\u4e0d\u53eb\uff0c\u91cd\u65b0\u53d1\u724c' };
    }

    if (next.landlordCandidate !== null && next.biddingTurns >= 3) {
      return finalizeLandlord(next, next.landlordCandidate);
    }

    next.activeSeat = nextSeat(seatIndex);
    if (wantsLandlord) {
      next.message = isRobbing
        ? `${next.seats[seatIndex].name} \u62a2\u5730\u4e3b`
        : `${next.seats[seatIndex].name} \u53eb\u5730\u4e3b\uff0c\u5176\u4ed6\u73a9\u5bb6\u53ef\u4ee5\u62a2\u5730\u4e3b`;
    } else {
      next.message = isRobbing
        ? `${next.seats[seatIndex].name} \u4e0d\u62a2`
        : `${next.seats[seatIndex].name} \u4e0d\u53eb`;
    }
    return next;
  }

  function selectCardsByIds(hand, ids) {
    return findCardsByIds(hand, ids);
  }

  function playCards(currentState, seatIndex, cards) {
    if (currentState.phase !== 'playing' || currentState.activeSeat !== seatIndex) {
      return { ...currentState, message: '\u8fd8\u6ca1\u6709\u8f6e\u5230\u8be5\u73a9\u5bb6\u51fa\u724c' };
    }
    if (Array.isArray(cards) && !areCardsInHand(currentState.seats[seatIndex].hand, cards)) {
      return { ...currentState, message: '\u6240\u9009\u724c\u4e0d\u5728\u5f53\u524d\u73a9\u5bb6\u624b\u724c\u4e2d' };
    }
    const play = evaluatePlay(cards);
    if (!play) {
      return { ...currentState, message: '\u8bf7\u9009\u62e9\u6709\u6548\u724c\u578b' };
    }
    if (currentState.lastPlay && !canBeat(play, currentState.lastPlay.play)) {
      return { ...currentState, message: '\u5fc5\u987b\u5927\u8fc7\u4e0a\u5bb6\u51fa\u724c' };
    }
    const next = cloneState(currentState);
    next.seats[seatIndex].hand = removeCards(next.seats[seatIndex].hand, cards);
    next.lastPlay = { seatIndex, play, cards: sortCards(cards) };
    next.passCount = 0;
    next.selectedIds = [];
    next.playActionCounts[seatIndex] += 1;
    next.playedCardCounts[seatIndex] += cards.length;
    applyPlayMultiplier(next, play);
    if (next.seats[seatIndex].hand.length === 0) {
      next.phase = 'gameOver';
      next.winnerSide = next.landlord === seatIndex ? 'landlord' : 'farmers';
      next.message = next.winnerSide === 'landlord' ? '\u5730\u4e3b\u83b7\u80dc' : '\u519c\u6c11\u83b7\u80dc';
      settleRound(next, seatIndex);
      return next;
    }
    next.activeSeat = nextSeat(seatIndex);
    next.message = `${next.seats[seatIndex].name} \u51fa\u724c`;
    applyAlarm(next, seatIndex);
    return next;
  }

  function passTurn(currentState, seatIndex) {
    if (currentState.phase !== 'playing' || currentState.activeSeat !== seatIndex) {
      return { ...currentState, message: '\u8fd8\u6ca1\u6709\u8f6e\u5230\u8be5\u73a9\u5bb6\u64cd\u4f5c' };
    }
    if (!currentState.lastPlay) {
      return { ...currentState, message: '\u5f53\u524d\u5fc5\u987b\u51fa\u724c' };
    }
    const next = cloneState(currentState);
    next.passCount += 1;
    next.selectedIds = [];
    next.activeSeat = nextSeat(seatIndex);
    next.message = `${next.seats[seatIndex].name} \u4e0d\u51fa`;
    if (next.passCount >= 2) {
      next.passCount = 0;
      next.lastPlay = null;
      next.message = '\u672c\u8f6e\u7ed3\u675f\uff0c\u91cd\u65b0\u9886\u51fa';
    }
    return next;
  }

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
    if (interactive) button.addEventListener('click', () => onToggleCard(card.id));
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

  function renderActions(currentState, handlers) {
    const bar = document.createElement('div');
    bar.className = 'action-bar';
    if (currentState.phase === 'bidding' && currentState.activeSeat === 0) {
      const hasCandidate = currentState.landlordCandidate !== null;
      bar.append(
        actionButton(hasCandidate ? '\u62a2\u5730\u4e3b' : '\u53eb\u5730\u4e3b', handlers.onBidCall),
        actionButton(hasCandidate ? '\u4e0d\u62a2' : '\u4e0d\u53eb', handlers.onBidPass, 'secondary'),
      );
      return bar;
    }
    if (currentState.phase === 'playing' && currentState.activeSeat === 0) {
      const passButton = actionButton('\u4e0d\u51fa', handlers.onPass, 'secondary');
      passButton.disabled = !currentState.lastPlay;
      bar.append(
        actionButton('\u51fa\u724c', handlers.onPlay),
        actionButton('\u63d0\u793a', handlers.onHint, 'secondary'),
        passButton,
      );
      return bar;
    }
    if (currentState.phase === 'gameOver') {
      bar.append(actionButton('\u518d\u6765\u4e00\u5c40', handlers.onNewRound));
    }
    return bar;
  }

  function renderSeat(seat, index, currentState, handlers) {
    const section = document.createElement('section');
    section.className = `seat ${index === 0 ? 'seat-player' : index === 1 ? 'seat-ai-left' : 'seat-ai-right'}`;
    const header = document.createElement('div');
    header.className = 'seat-header';
    const label = document.createElement('span');
    label.textContent = `${seat.name} \u00b7 ${seat.hand.length} \u5f20`;
    header.append(label);
    if (currentState.landlord === index) {
      const badge = document.createElement('span');
      badge.className = 'landlord-badge';
      badge.textContent = '\u5730\u4e3b';
      header.append(badge);
    }
    section.append(header);
    if (index === 0) {
      const hand = document.createElement('div');
      hand.className = 'hand-row';
      const selectedIds = new Set(currentState.selectedIds);
      const interactive = currentState.phase === 'playing' && currentState.activeSeat === 0;
      for (const card of seat.hand) {
        hand.append(renderCard(card, selectedIds, toggleCard, interactive));
      }
      section.append(hand, renderActions(currentState, handlers));
    } else {
      section.append(renderCardBacks(seat.hand.length));
    }
    return section;
  }

  function renderBottomCards(currentState) {
    const wrapper = document.createElement('section');
    wrapper.className = 'bottom-cards';
    const title = document.createElement('h2');
    title.textContent = '\u5e95\u724c';
    wrapper.append(title);
    const row = document.createElement('div');
    row.className = 'bottom-card-row';
    if (currentState.bottomRevealed) {
      for (const card of currentState.bottomCards) {
        row.append(renderCard(card, new Set(), () => {}, false));
      }
    } else {
      for (let index = 0; index < currentState.bottomCards.length; index += 1) {
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

  function renderRoundStats(currentState) {
    const wrapper = document.createElement('section');
    wrapper.className = 'round-stats';
    const summary = document.createElement('p');
    summary.textContent = `\u5e95\u5206 ${currentState.baseScore || 1} \u00b7 \u500d\u6570 ${currentState.multiplier || 1}x \u00b7 \u70b8\u5f39 ${currentState.bombCount || 0} \u00b7 \u738b\u70b8 ${currentState.rocketCount || 0}`;
    wrapper.append(summary);
    const totals = document.createElement('p');
    totals.textContent = `\u603b\u5206 ${currentState.seats.map((seat, index) => `${seat.name} ${currentState.totalScores[index] > 0 ? '+' : ''}${currentState.totalScores[index]}`).join(' / ')}`;
    wrapper.append(totals);
    if (currentState.settlement) {
      const settlement = document.createElement('p');
      settlement.textContent = `\u7ed3\u7b97 ${currentState.seats.map((seat, index) => `${seat.name} ${currentState.roundScores[index] > 0 ? '+' : ''}${currentState.roundScores[index]}`).join(' / ')} \u00b7 ${springLabel(currentState.spring)}`;
      wrapper.append(settlement);
    }
    return wrapper;
  }

  function renderLastPlay(currentState) {
    const wrapper = document.createElement('section');
    wrapper.className = 'last-play';
    const title = document.createElement('h2');
    title.textContent = currentState.lastPlay
      ? `${currentState.seats[currentState.lastPlay.seatIndex].name} \u521a\u51fa`
      : '\u7b49\u5f85\u51fa\u724c';
    wrapper.append(title);
    const row = document.createElement('div');
    row.className = 'played-card-row';
    if (currentState.lastPlay) {
      for (const card of currentState.lastPlay.cards) {
        row.append(renderCard(card, new Set(), () => {}, false));
      }
    }
    wrapper.append(row);
    return wrapper;
  }

  function renderGame(currentState) {
    const root = document.querySelector('#gameRoot');
    const status = document.querySelector('#statusText');
    root.innerHTML = '';
    status.textContent = currentState.message;
    const center = document.createElement('div');
    center.className = 'table-center';
    center.append(renderBottomCards(currentState), renderRoundStats(currentState), renderLastPlay(currentState));
    root.append(
      renderSeat(currentState.seats[1], 1, currentState, handlers),
      renderSeat(currentState.seats[2], 2, currentState, handlers),
      center,
      renderSeat(currentState.seats[0], 0, currentState, handlers),
    );
  }

  function setState(nextState) {
    state = nextState;
    renderGame(state);
    queueAiTurn();
  }

  function toggleCard(cardId) {
    const selected = new Set(state.selectedIds);
    if (selected.has(cardId)) selected.delete(cardId);
    else selected.add(cardId);
    state = { ...state, selectedIds: [...selected] };
    renderGame(state);
  }

  function playSelected() {
    const nextState = playCards(state, 0, selectCardsByIds(state.seats[0].hand, state.selectedIds));
    if (nextState.phase === 'gameOver' && state.phase !== 'gameOver') {
      playSound('win', settlementCue(nextState));
    } else if (nextState.lastPlay !== state.lastPlay) {
      playSoundForPlay(nextState.lastPlay.play);
      playAlarmSound(nextState);
    }
    setState(nextState);
  }

  function passSelected() {
    const nextState = passTurn(state, 0);
    if (nextState.activeSeat !== state.activeSeat || nextState.passCount !== state.passCount) {
      playSound('pass', '\u4e0d\u8981');
    }
    setState(nextState);
  }

  function hint() {
    const target = state.lastPlay ? state.lastPlay.play : null;
    const cards = findHint(state.seats[0].hand, target);
    playSound(cards ? 'hint' : 'pass', cards ? '\u63d0\u793a' : '\u4e0d\u8981');
    state = {
      ...state,
      selectedIds: cards ? cards.map((card) => card.id) : [],
      message: cards ? '\u5df2\u4e3a\u4f60\u9009\u51fa\u4e00\u624b\u724c' : '\u6ca1\u6709\u53ef\u538b\u8fc7\u7684\u724c',
    };
    renderGame(state);
  }

  function newRound() {
    playSound('new', '\u53d1\u724c');
    aiTurnToken += 1;
    setState(createGame({ totalScores: state.totalScores }));
  }

  function playBidSound(wantsLandlord, currentState = state) {
    const isRobbing = currentState.landlordCandidate !== null;
    if (wantsLandlord) {
      playSound(isRobbing ? 'rob' : 'call', isRobbing ? '\u62a2\u5730\u4e3b' : '\u53eb\u5730\u4e3b');
    } else {
      playSound(isRobbing ? 'passRob' : 'passBid', isRobbing ? '\u4e0d\u62a2' : '\u4e0d\u53eb');
    }
  }

  function queueAiTurn() {
    aiTurnToken += 1;
    const token = aiTurnToken;
    if (state.phase === 'bidding' && state.activeSeat !== 0) {
      window.setTimeout(() => {
        if (token !== aiTurnToken || state.phase !== 'bidding' || state.activeSeat === 0) return;
        const seat = state.activeSeat;
        const wantsLandlord = chooseBid(state.seats[seat].hand);
        playBidSound(wantsLandlord, state);
        setState(bid(state, seat, wantsLandlord));
      }, 500);
    }
    if (state.phase === 'playing' && state.activeSeat !== 0) {
      window.setTimeout(() => {
        if (token !== aiTurnToken || state.phase !== 'playing' || state.activeSeat === 0) return;
        const seat = state.activeSeat;
        const target = state.lastPlay ? state.lastPlay.play : null;
        const decision = choosePlay(state.seats[seat].hand, target);
        const nextState = decision.pass ? passTurn(state, seat) : playCards(state, seat, decision.cards);
        if (nextState.phase === 'gameOver' && state.phase !== 'gameOver') {
          playSound('win', settlementCue(nextState));
        } else if (decision.pass) {
          playSound('pass', '\u4e0d\u8981');
        } else {
          playSoundForPlay(nextState.lastPlay.play);
          playAlarmSound(nextState);
        }
        setState(nextState);
      }, 700);
    }
  }

  const handlers = {
    onBidCall: () => {
      playBidSound(true);
      setState(bid(state, 0, true));
    },
    onBidPass: () => {
      playBidSound(false);
      setState(bid(state, 0, false));
    },
    onPlay: playSelected,
    onPass: passSelected,
    onHint: hint,
    onNewRound: newRound,
  };

  document.querySelector('#soundToggleButton').addEventListener('click', toggleSound);
  document.querySelector('#newRoundButton').addEventListener('click', newRound);
  updateSoundButton();
  renderGame(state);
  queueAiTurn();
}());
