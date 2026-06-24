# Dou Dizhu Card Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static single-player Dou Dizhu web game where one human player can play complete classic-rule rounds against two AI opponents.

**Architecture:** Use plain ESM JavaScript modules with no build step. Pure game modules own cards, rule evaluation, AI choices, and game-state transitions; DOM modules render state and wire user actions without duplicating rules.

**Tech Stack:** Static `index.html`, CSS, browser ESM modules, Node 16 for a no-dependency custom test runner.

---

## File Structure

- Create `package.json`: defines `npm test` as `node tests/run-tests.js` and marks the project as ESM.
- Create `tests/run-tests.js`: minimal test harness that discovers `*.test.js` files and reports pass/fail.
- Create `tests/test-utils.js`: helpers for test card creation and assertions.
- Create `src/cards.js`: card constants, deck creation, shuffle, deal, sort, and hand mutation helpers.
- Create `tests/cards.test.js`: deck/deal/sort tests.
- Create `src/rules.js`: play evaluation and comparison for all supported classic Dou Dizhu card types.
- Create `tests/rules.test.js`: recognition and comparison coverage for every supported play type.
- Create `src/ai.js`: bidding score, candidate generation, hint selection, and simple AI play selection.
- Create `tests/ai.test.js`: AI legality and hint tests.
- Create `src/game.js`: round creation, bidding transitions, play/pass transitions, and game-over detection.
- Create `tests/game.test.js`: state-machine tests for bidding, playing, passing, and winning.
- Create `index.html`: static app shell.
- Create `styles.css`: classic green card-table styling.
- Create `src/ui.js`: DOM rendering and event binding.
- Create `src/main.js`: browser entrypoint that connects game state, UI, and AI turns.

## Task 1: Test Harness And Card Model

**Files:**
- Create: `package.json`
- Create: `tests/run-tests.js`
- Create: `tests/test-utils.js`
- Create: `tests/cards.test.js`
- Create: `src/cards.js`

- [ ] **Step 1: Write the failing card tests**

Create `tests/cards.test.js`:

```js
import assert from 'assert';
import {
  createDeck,
  dealCards,
  getCardLabel,
  sortCards,
} from '../src/cards.js';

export function run() {
  const deck = createDeck();
  assert.strictEqual(deck.length, 54, 'deck has 54 cards');
  assert.strictEqual(new Set(deck.map((card) => card.id)).size, 54, 'deck card ids are unique');

  const labels = deck.map(getCardLabel);
  assert(labels.includes('3\u2660'), 'deck includes regular suited cards');
  assert(labels.includes('\u5c0f\u738b'), 'deck includes small joker');
  assert(labels.includes('\u5927\u738b'), 'deck includes big joker');

  const deal = dealCards(deck);
  assert.strictEqual(deal.hands.length, 3, 'deal creates three hands');
  assert.deepStrictEqual(deal.hands.map((hand) => hand.length), [17, 17, 17], 'each player gets 17 cards');
  assert.strictEqual(deal.bottomCards.length, 3, 'deal reserves 3 bottom cards');

  const mixed = [
    { id: 'D-3', rank: '3', value: 3 },
    { id: 'J-BJ', rank: 'BJ', value: 17 },
    { id: 'S-A', rank: 'A', value: 14 },
  ];
  assert.deepStrictEqual(sortCards(mixed).map((card) => card.rank), ['BJ', 'A', '3']);
}
```

- [ ] **Step 2: Create the test harness**

Create `package.json`:

```json
{
  "name": "doudizhu-card-game",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node tests/run-tests.js"
  }
}
```

Create `tests/run-tests.js`:

```js
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const testDir = path.dirname(new URL(import.meta.url).pathname);
const normalizedTestDir = process.platform === 'win32' && testDir.startsWith('/')
  ? testDir.slice(1)
  : testDir;

const testFiles = fs
  .readdirSync(normalizedTestDir)
  .filter((file) => file.endsWith('.test.js'))
  .sort();

let passed = 0;

for (const file of testFiles) {
  const fullPath = path.join(normalizedTestDir, file);
  try {
    const module = await import(pathToFileURL(fullPath).href);
    module.run();
    passed += 1;
    console.log(`PASS ${file}`);
  } catch (error) {
    console.error(`FAIL ${file}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
    break;
  }
}

if (!process.exitCode) {
  console.log(`${passed}/${testFiles.length} test files passed`);
}
```

Create `tests/test-utils.js`:

```js
import assert from 'assert';

export function testCard(rank, suit = 'S') {
  const values = {
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
    '2': 15,
    SJ: 16,
    BJ: 17,
  };
  return {
    id: `${suit}-${rank}-${Math.random().toString(36).slice(2)}`,
    rank,
    suit,
    value: values[rank],
  };
}

export function cardsFromRanks(ranks) {
  const suitCycle = ['S', 'H', 'C', 'D'];
  const seen = new Map();
  return ranks.map((rank) => {
    const count = seen.get(rank) || 0;
    seen.set(rank, count + 1);
    const suit = rank === 'SJ' || rank === 'BJ' ? 'JOKER' : suitCycle[count % suitCycle.length];
    return testCard(rank, suit);
  });
}

export function assertPlay(play, expected) {
  assert(play, 'expected a valid play');
  assert.strictEqual(play.type, expected.type, 'play type');
  if (expected.mainRank) {
    assert.strictEqual(play.mainRank, expected.mainRank, 'main rank');
  }
  if (expected.length) {
    assert.strictEqual(play.length, expected.length, 'play length');
  }
}
```

- [ ] **Step 3: Run the failing test**

Run: `npm test`

Expected: FAIL with an import error for `../src/cards.js`, proving the card module does not exist yet.

- [ ] **Step 4: Implement the card module**

Create `src/cards.js`:

```js
export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'SJ', 'BJ'];
export const RANK_VALUES = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 3]));
export const SUITS = ['\u2660', '\u2665', '\u2663', '\u2666'];
export const RED_SUITS = new Set(['\u2665', '\u2666']);

export function createDeck() {
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

export function shuffleDeck(deck, rng = Math.random) {
  const copy = deck.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function dealCards(deck) {
  return {
    hands: [
      sortCards(deck.slice(0, 17)),
      sortCards(deck.slice(17, 34)),
      sortCards(deck.slice(34, 51)),
    ],
    bottomCards: sortCards(deck.slice(51, 54)),
  };
}

export function sortCards(cards, direction = 'desc') {
  const multiplier = direction === 'asc' ? 1 : -1;
  return cards.slice().sort((left, right) => {
    if (left.value !== right.value) {
      return (left.value - right.value) * multiplier;
    }
    return String(left.suit).localeCompare(String(right.suit)) * multiplier;
  });
}

export function getCardLabel(card) {
  if (card.rank === 'SJ') return '\u5c0f\u738b';
  if (card.rank === 'BJ') return '\u5927\u738b';
  return `${card.rank}${card.suit}`;
}

export function removeCards(hand, cardsToRemove) {
  const removeIds = new Set(cardsToRemove.map((card) => card.id));
  return hand.filter((card) => !removeIds.has(card.id));
}

export function findCardsByIds(hand, cardIds) {
  const idSet = new Set(cardIds);
  return hand.filter((card) => idSet.has(card.id));
}
```

- [ ] **Step 5: Run the card tests**

Run: `npm test`

Expected: PASS for `cards.test.js` with `1/1 test files passed`.

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json tests/run-tests.js tests/test-utils.js tests/cards.test.js src/cards.js
git commit -m "feat: add card model and test harness"
```

Expected: commit succeeds.

## Task 2: Rule Recognition

**Files:**
- Create: `tests/rules.test.js`
- Create: `src/rules.js`

- [ ] **Step 1: Write failing rule recognition tests**

Create `tests/rules.test.js`:

```js
import assert from 'assert';
import { cardsFromRanks, assertPlay } from './test-utils.js';
import { canBeat, evaluatePlay } from '../src/rules.js';

export function run() {
  assertPlay(evaluatePlay(cardsFromRanks(['3'])), { type: 'single', mainRank: '3', length: 1 });
  assertPlay(evaluatePlay(cardsFromRanks(['4', '4'])), { type: 'pair', mainRank: '4', length: 2 });
  assertPlay(evaluatePlay(cardsFromRanks(['5', '5', '5'])), { type: 'triple', mainRank: '5', length: 3 });
  assertPlay(evaluatePlay(cardsFromRanks(['6', '6', '6', '9'])), { type: 'tripleSingle', mainRank: '6', length: 4 });
  assertPlay(evaluatePlay(cardsFromRanks(['7', '7', '7', '10', '10'])), { type: 'triplePair', mainRank: '7', length: 5 });
  assertPlay(evaluatePlay(cardsFromRanks(['3', '4', '5', '6', '7'])), { type: 'straight', mainRank: '7', length: 5 });
  assertPlay(evaluatePlay(cardsFromRanks(['4', '4', '5', '5', '6', '6'])), { type: 'consecutivePairs', mainRank: '6', length: 6 });
  assertPlay(evaluatePlay(cardsFromRanks(['8', '8', '8', '9', '9', '9'])), { type: 'airplane', mainRank: '9', length: 6 });
  assertPlay(evaluatePlay(cardsFromRanks(['8', '8', '8', '9', '9', '9', '3', '4'])), { type: 'airplaneSingles', mainRank: '9', length: 8 });
  assertPlay(evaluatePlay(cardsFromRanks(['8', '8', '8', '9', '9', '9', '3', '3', '4', '4'])), { type: 'airplanePairs', mainRank: '9', length: 10 });
  assertPlay(evaluatePlay(cardsFromRanks(['J', 'J', 'J', 'J'])), { type: 'bomb', mainRank: 'J', length: 4 });
  assertPlay(evaluatePlay(cardsFromRanks(['Q', 'Q', 'Q', 'Q', '3', '4'])), { type: 'fourTwoSingles', mainRank: 'Q', length: 6 });
  assertPlay(evaluatePlay(cardsFromRanks(['K', 'K', 'K', 'K', '5', '5', '6', '6'])), { type: 'fourTwoPairs', mainRank: 'K', length: 8 });
  assertPlay(evaluatePlay(cardsFromRanks(['SJ', 'BJ'])), { type: 'rocket', mainRank: 'BJ', length: 2 });

  assert.strictEqual(evaluatePlay(cardsFromRanks(['3', '4', '5', '6', '2'])), null, 'straight cannot include 2');
  assert.strictEqual(evaluatePlay(cardsFromRanks(['3', '3', '4', '4'])), null, 'two pairs are not consecutive pairs');
  assert.strictEqual(evaluatePlay(cardsFromRanks(['3', '3', '3', '4', '4', '5'])), null, 'invalid mixed selection is rejected');

  assert.strictEqual(canBeat(cardsFromRanks(['4']), cardsFromRanks(['3'])), true, 'higher single beats lower single');
  assert.strictEqual(canBeat(cardsFromRanks(['4', '4']), cardsFromRanks(['3', '3'])), true, 'higher pair beats lower pair');
  assert.strictEqual(canBeat(cardsFromRanks(['5', '5']), cardsFromRanks(['4'])), false, 'different normal types cannot compare');
  assert.strictEqual(canBeat(cardsFromRanks(['6', '6', '6', '6']), cardsFromRanks(['A'])), true, 'bomb beats non-bomb');
  assert.strictEqual(canBeat(cardsFromRanks(['SJ', 'BJ']), cardsFromRanks(['2', '2', '2', '2'])), true, 'rocket beats bomb');
  assert.strictEqual(canBeat(cardsFromRanks(['A', 'A', 'A', 'A']), cardsFromRanks(['K', 'K', 'K', 'K'])), true, 'higher bomb beats lower bomb');
}
```

- [ ] **Step 2: Run the failing rule tests**

Run: `npm test`

Expected: FAIL with an import error for `../src/rules.js`.

- [ ] **Step 3: Implement rule recognition and comparison**

Create `src/rules.js`:

```js
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
```

- [ ] **Step 4: Run all rule tests**

Run: `npm test`

Expected: PASS for `cards.test.js` and `rules.test.js` with `2/2 test files passed`.

- [ ] **Step 5: Commit**

Run:

```bash
git add tests/rules.test.js src/rules.js
git commit -m "feat: add doudizhu rule evaluator"
```

Expected: commit succeeds.

## Task 3: AI And Hints

**Files:**
- Create: `tests/ai.test.js`
- Create: `src/ai.js`

- [ ] **Step 1: Write failing AI tests**

Create `tests/ai.test.js`:

```js
import assert from 'assert';
import { chooseBid, choosePlay, findHint } from '../src/ai.js';
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
}
```

- [ ] **Step 2: Run the failing AI tests**

Run: `npm test`

Expected: FAIL with an import error for `../src/ai.js`.

- [ ] **Step 3: Implement simple AI and hint generation**

Create `src/ai.js`:

```js
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
```

- [ ] **Step 4: Run AI tests**

Run: `npm test`

Expected: PASS for `cards.test.js`, `rules.test.js`, and `ai.test.js` with `3/3 test files passed`.

- [ ] **Step 5: Commit**

Run:

```bash
git add tests/ai.test.js src/ai.js
git commit -m "feat: add simple doudizhu ai"
```

Expected: commit succeeds.

## Task 4: Game State Machine

**Files:**
- Create: `tests/game.test.js`
- Create: `src/game.js`

- [ ] **Step 1: Write failing game-state tests**

Create `tests/game.test.js`:

```js
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
```

- [ ] **Step 2: Run failing game-state tests**

Run: `npm test`

Expected: FAIL with an import error for `../src/game.js`.

- [ ] **Step 3: Implement game state transitions**

Create `src/game.js`:

```js
import { createDeck, dealCards, findCardsByIds, removeCards, shuffleDeck, sortCards } from './cards.js';
import { canBeat, evaluatePlay } from './rules.js';

const SEATS = [
  { id: 'player', name: '\u4f60', kind: 'human' },
  { id: 'ai-left', name: '\u5de6\u5bb6 AI', kind: 'ai' },
  { id: 'ai-right', name: '\u53f3\u5bb6 AI', kind: 'ai' },
];

function nextSeat(index) {
  return (index + 1) % 3;
}

function cloneState(state) {
  return {
    ...state,
    seats: state.seats.map((seat) => ({ ...seat, hand: seat.hand.slice() })),
    bottomCards: state.bottomCards.slice(),
    bids: state.bids.slice(),
    selectedIds: state.selectedIds.slice(),
  };
}

export function createGame(options = {}) {
  const deck = options.deck || shuffleDeck(createDeck(), options.rng || Math.random);
  const deal = dealCards(deck);
  return {
    phase: 'bidding',
    seats: SEATS.map((seat, index) => ({
      ...seat,
      hand: deal.hands[index],
      role: 'farmer',
    })),
    bottomCards: deal.bottomCards,
    landlord: null,
    activeSeat: 0,
    bids: [],
    bidPasses: 0,
    lastPlay: null,
    passCount: 0,
    selectedIds: [],
    winnerSide: null,
    message: '\u8bf7\u9009\u62e9\u662f\u5426\u53eb\u5730\u4e3b',
  };
}

export function bid(state, seatIndex, wantsLandlord) {
  if (state.phase !== 'bidding' || state.activeSeat !== seatIndex) {
    return { ...state, message: '\u8fd8\u6ca1\u6709\u8f6e\u5230\u8be5\u73a9\u5bb6\u53eb\u5730\u4e3b' };
  }

  if (wantsLandlord) {
    const next = cloneState(state);
    next.phase = 'playing';
    next.landlord = seatIndex;
    next.activeSeat = seatIndex;
    next.seats = next.seats.map((seat, index) => ({
      ...seat,
      role: index === seatIndex ? 'landlord' : 'farmer',
      hand: index === seatIndex ? sortCards(seat.hand.concat(next.bottomCards)) : seat.hand,
    }));
    next.message = `${next.seats[seatIndex].name} \u6210\u4e3a\u5730\u4e3b`;
    return next;
  }

  const next = cloneState(state);
  next.bids.push({ seatIndex, wantsLandlord: false });
  next.bidPasses += 1;
  if (next.bidPasses >= 3) {
    return createGame();
  }
  next.activeSeat = nextSeat(seatIndex);
  next.message = `${next.seats[seatIndex].name} \u4e0d\u53eb`;
  return next;
}

export function selectCardsByIds(hand, ids) {
  return findCardsByIds(hand, ids);
}

export function selectCardsByRanks(hand, ranks) {
  const remaining = hand.slice();
  return ranks.map((rank) => {
    const index = remaining.findIndex((card) => card.rank === rank);
    if (index === -1) {
      throw new Error(`Card rank not found in hand: ${rank}`);
    }
    const [card] = remaining.splice(index, 1);
    return card;
  });
}

export function playCards(state, seatIndex, cards) {
  if (state.phase !== 'playing' || state.activeSeat !== seatIndex) {
    return { ...state, message: '\u8fd8\u6ca1\u6709\u8f6e\u5230\u8be5\u73a9\u5bb6\u51fa\u724c' };
  }

  const play = evaluatePlay(cards);
  if (!play) {
    return { ...state, message: '\u8bf7\u9009\u62e9\u6709\u6548\u724c\u578b' };
  }
  if (state.lastPlay && !canBeat(play, state.lastPlay.play)) {
    return { ...state, message: '\u5fc5\u987b\u5927\u8fc7\u4e0a\u5bb6\u51fa\u724c' };
  }

  const next = cloneState(state);
  next.seats[seatIndex].hand = removeCards(next.seats[seatIndex].hand, cards);
  next.lastPlay = { seatIndex, play, cards: sortCards(cards) };
  next.passCount = 0;
  next.selectedIds = [];

  if (next.seats[seatIndex].hand.length === 0) {
    next.phase = 'gameOver';
    next.winnerSide = next.landlord === seatIndex ? 'landlord' : 'farmers';
    next.message = next.winnerSide === 'landlord' ? '\u5730\u4e3b\u83b7\u80dc' : '\u519c\u6c11\u83b7\u80dc';
    return next;
  }

  next.activeSeat = nextSeat(seatIndex);
  next.message = `${next.seats[seatIndex].name} \u51fa\u724c`;
  return next;
}

export function passTurn(state, seatIndex) {
  if (state.phase !== 'playing' || state.activeSeat !== seatIndex) {
    return { ...state, message: '\u8fd8\u6ca1\u6709\u8f6e\u5230\u8be5\u73a9\u5bb6\u64cd\u4f5c' };
  }
  if (!state.lastPlay) {
    return { ...state, message: '\u5f53\u524d\u5fc5\u987b\u51fa\u724c' };
  }

  const next = cloneState(state);
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
```

- [ ] **Step 4: Run game-state tests**

Run: `npm test`

Expected: PASS for `cards.test.js`, `rules.test.js`, `ai.test.js`, and `game.test.js` with `4/4 test files passed`.

- [ ] **Step 5: Commit**

Run:

```bash
git add tests/game.test.js src/game.js
git commit -m "feat: add doudizhu game state"
```

Expected: commit succeeds.

## Task 5: Static UI Shell

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `src/ui.js`
- Create: `src/main.js`

- [ ] **Step 1: Write a failing smoke test for required app files**

Create `tests/app-files.test.js`:

```js
import assert from 'assert';
import fs from 'fs';

export function run() {
  const html = fs.readFileSync('index.html', 'utf8');
  assert(html.includes('&#26007;&#22320;&#20027;'), 'index contains game title');
  assert(html.includes('src/main.js'), 'index loads main module');

  const css = fs.readFileSync('styles.css', 'utf8');
  assert(css.includes('.card-table'), 'styles include card table');
  assert(css.includes('.playing-card'), 'styles include playing cards');

  const ui = fs.readFileSync('src/ui.js', 'utf8');
  assert(ui.includes('renderGame'), 'ui exports renderGame');
}
```

- [ ] **Step 2: Run the failing smoke test**

Run: `npm test`

Expected: FAIL with missing `index.html`.

- [ ] **Step 3: Create the HTML shell**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>&#26007;&#22320;&#20027;</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <main class="app-shell">
    <section class="scorebar" aria-live="polite">
      <div>
        <h1>&#26007;&#22320;&#20027;</h1>
        <p id="statusText">&#27491;&#22312;&#21457;&#29260;...</p>
      </div>
      <button id="newRoundButton" class="icon-text-button" type="button">&#26032;&#19968;&#23616;</button>
    </section>
    <section id="gameRoot" class="card-table" aria-label="&#26007;&#22320;&#20027;&#29260;&#26700;"></section>
  </main>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create classic table styles**

Create `styles.css`:

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: "Microsoft YaHei", Arial, sans-serif;
  background: #18211c;
  color: #fff8e8;
}

button {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
}

.scorebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  background: #122019;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.scorebar h1 {
  margin: 0;
  font-size: 28px;
}

.scorebar p {
  margin: 6px 0 0;
  color: #d9e0d4;
}

.card-table {
  position: relative;
  min-height: calc(100vh - 86px);
  padding: 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 45%, rgba(255, 239, 175, 0.13), transparent 34%),
    radial-gradient(circle at 50% 45%, #246b48 0, #18513a 46%, #0e3027 100%);
}

.seat {
  position: absolute;
  width: min(260px, 28vw);
  min-height: 116px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(7, 18, 15, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.seat-ai-left {
  left: 28px;
  top: 42px;
}

.seat-ai-right {
  right: 28px;
  top: 42px;
}

.seat-player {
  left: 50%;
  right: auto;
  bottom: 24px;
  width: min(920px, calc(100vw - 40px));
  transform: translateX(-50%);
}

.seat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-weight: 700;
}

.landlord-badge {
  padding: 4px 8px;
  border-radius: 6px;
  background: #f2c14e;
  color: #221707;
  font-size: 12px;
}

.ai-card-row,
.played-card-row,
.hand-row,
.bottom-card-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-card-row {
  justify-content: flex-start;
}

.card-back,
.playing-card {
  width: 54px;
  height: 76px;
  border-radius: 7px;
  flex: 0 0 auto;
}

.card-back {
  margin-left: -34px;
  background:
    linear-gradient(45deg, rgba(255, 255, 255, 0.16) 25%, transparent 25% 50%, rgba(255, 255, 255, 0.16) 50% 75%, transparent 75%),
    #9d2f2b;
  background-size: 12px 12px;
  border: 2px solid #f7dfba;
}

.card-back:first-child {
  margin-left: 0;
}

.playing-card {
  position: relative;
  display: grid;
  place-items: start center;
  margin-left: -18px;
  padding-top: 8px;
  border: 1px solid rgba(0, 0, 0, 0.22);
  background: #fffdf5;
  color: #171717;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22);
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.playing-card:first-child {
  margin-left: 0;
}

.playing-card.red {
  color: #c7342f;
}

.playing-card.selected {
  transform: translateY(-18px);
  box-shadow: 0 16px 24px rgba(0, 0, 0, 0.28);
}

.table-center {
  position: absolute;
  inset: 190px 18% 230px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 14px;
  align-items: center;
  justify-items: center;
  pointer-events: none;
}

.bottom-cards {
  display: grid;
  gap: 8px;
  justify-items: center;
}

.bottom-cards h2,
.last-play h2 {
  margin: 0;
  font-size: 14px;
  color: #d9e0d4;
}

.last-play {
  display: grid;
  gap: 8px;
  justify-items: center;
  min-height: 112px;
}

.action-bar {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
}

.action-button,
.icon-text-button {
  border: 0;
  border-radius: 7px;
  padding: 10px 16px;
  color: #1d1607;
  background: #f2c14e;
  font-weight: 800;
  cursor: pointer;
}

.action-button.secondary,
.icon-text-button {
  background: #fff8e8;
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

@media (max-width: 820px) {
  .seat {
    width: 42vw;
  }

  .seat-player {
    width: calc(100vw - 24px);
  }

  .card-table {
    padding: 12px;
  }

  .playing-card,
  .card-back {
    width: 44px;
    height: 64px;
    font-size: 15px;
  }
}
```

- [ ] **Step 5: Create UI renderer**

Create `src/ui.js`:

```js
import { getCardLabel } from './cards.js';

function cardClass(card, selected) {
  return `playing-card ${card.color === 'red' ? 'red' : 'black'} ${selected ? 'selected' : ''}`;
}

function renderCard(card, selectedIds, onToggleCard, interactive) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = cardClass(card, selectedIds.has(card.id));
  button.textContent = getCardLabel(card);
  button.disabled = !interactive;
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
    for (const card of seat.hand) {
      hand.append(renderCard(card, selectedIds, handlers.onToggleCard, state.phase === 'playing' && state.activeSeat === 0));
    }
    section.append(hand);
    section.append(renderActions(state, handlers));
  } else {
    section.append(renderCardBacks(seat.hand.length));
  }

  return section;
}

function renderActions(state, handlers) {
  const bar = document.createElement('div');
  bar.className = 'action-bar';

  if (state.phase === 'bidding' && state.activeSeat === 0) {
    const callButton = actionButton('\u53eb\u5730\u4e3b', handlers.onBidCall);
    const passButton = actionButton('\u4e0d\u53eb', handlers.onBidPass, 'secondary');
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

function actionButton(text, handler, variant = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `action-button ${variant}`;
  button.textContent = text;
  button.addEventListener('click', handler);
  return button;
}

function renderBottomCards(state) {
  const wrapper = document.createElement('section');
  wrapper.className = 'bottom-cards';
  const title = document.createElement('h2');
  title.textContent = '\u5e95\u724c';
  wrapper.append(title);
  const row = document.createElement('div');
  row.className = 'bottom-card-row';
  for (const card of state.bottomCards) {
    row.append(renderCard(card, new Set(), () => {}, false));
  }
  wrapper.append(row);
  return wrapper;
}

function renderLastPlay(state) {
  const wrapper = document.createElement('section');
  wrapper.className = 'last-play';
  const title = document.createElement('h2');
  title.textContent = state.lastPlay ? `${state.seats[state.lastPlay.seatIndex].name} \u521a\u51fa` : '\u7b49\u5f85\u51fa\u724c';
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
  center.append(renderBottomCards(state), renderLastPlay(state));

  root.append(
    renderSeat(state.seats[1], 1, state, handlers),
    renderSeat(state.seats[2], 2, state, handlers),
    center,
    renderSeat(state.seats[0], 0, state, handlers),
  );
}
```

- [ ] **Step 6: Create browser entrypoint**

Create `src/main.js`:

```js
import { chooseBid, choosePlay, findHint } from './ai.js';
import { createGame, bid, passTurn, playCards, selectCardsByIds } from './game.js';
import { renderGame } from './ui.js';

let state = createGame();

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
  state = { ...state, selectedIds: [...selected] };
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
  const cards = findHint(state.seats[0].hand, target);
  state = { ...state, selectedIds: cards ? cards.map((card) => card.id) : [], message: cards ? '\u5df2\u4e3a\u4f60\u9009\u51fa\u4e00\u624b\u724c' : '\u6ca1\u6709\u53ef\u538b\u8fc7\u7684\u724c' };
  render();
}

function queueAiTurn() {
  if (state.phase === 'bidding' && state.activeSeat !== 0) {
    window.setTimeout(() => {
      const seat = state.activeSeat;
      setState(bid(state, seat, chooseBid(state.seats[seat].hand)));
    }, 500);
  }

  if (state.phase === 'playing' && state.activeSeat !== 0) {
    window.setTimeout(() => {
      const seat = state.activeSeat;
      const target = state.lastPlay ? state.lastPlay.play : null;
      const decision = choosePlay(state.seats[seat].hand, target);
      setState(decision.pass ? passTurn(state, seat) : playCards(state, seat, decision.cards));
    }, 700);
  }
}

function render() {
  renderGame(state, {
    onToggleCard: toggleCard,
    onBidCall: () => setState(bid(state, 0, true)),
    onBidPass: () => setState(bid(state, 0, false)),
    onPlay: playSelected,
    onPass: passSelected,
    onHint: hint,
    onNewRound: () => setState(createGame()),
  });
}

document.querySelector('#newRoundButton').addEventListener('click', () => setState(createGame()));
render();
queueAiTurn();
```

- [ ] **Step 7: Run smoke and unit tests**

Run: `npm test`

Expected: PASS for all existing test files including `app-files.test.js`.

- [ ] **Step 8: Commit**

Run:

```bash
git add index.html styles.css src/ui.js src/main.js tests/app-files.test.js
git commit -m "feat: add static doudizhu interface"
```

Expected: commit succeeds.

## Task 6: Browser Playability Pass

**Files:**
- Modify: `src/ai.js`
- Modify: `src/game.js`
- Modify: `src/ui.js`
- Modify: `src/main.js`
- Modify: `styles.css`
- Test: `tests/ai.test.js`
- Test: `tests/game.test.js`

- [ ] **Step 1: Run the automated suite before manual QA**

Run: `npm test`

Expected: PASS for all test files.

- [ ] **Step 2: Open the game locally**

Open `E:\myProject\games\card\index.html` in a browser.

Expected: the classic green table appears, the player's hand is visible, two AI seats show card backs, and the status text asks the player whether to call landlord.

- [ ] **Step 3: Verify bidding**

Manual actions:

1. Click the Call Landlord button.
2. Confirm the player gets a landlord badge.
3. Confirm the player's hand count increases from 17 to 20.
4. Click the New Round button.
5. Click the Pass Bid button and watch AI bidding continue.

Expected: bidding always reaches either a landlord assignment or a fresh deal if everyone passes.

- [ ] **Step 4: Verify human play controls**

Manual actions:

1. Start a round where the player is landlord.
2. Select one card and click the Play button.
3. Wait for AI turns.
4. Click the Hint button when it is the player's turn.
5. Click the Pass button when a previous play exists.

Expected: selected cards rise visually, legal plays leave the hand, hint selects a legal response when available, and passing is disabled when the player is leading.

- [ ] **Step 5: Verify full-round completion**

Manual action: play until any seat reaches zero cards.

Expected: the game shows either a landlord win or farmers win message, disables normal play controls, and exposes the New Round action.

- [ ] **Step 6: Patch any QA failures with tests first**

If a rule, AI, or state bug appears, write a focused failing test in the relevant test file before changing production code. Example for an invalid pass bug in `tests/game.test.js`:

```js
const illegalPass = passTurn(landlordGame, 0);
assert.strictEqual(illegalPass.phase, 'playing');
assert.strictEqual(illegalPass.message, '\u5f53\u524d\u5fc5\u987b\u51fa\u724c');
```

Run: `npm test`

Expected: the new test fails for the observed behavior. Then patch the corresponding module and rerun `npm test` until it passes.

- [ ] **Step 7: Commit QA fixes**

Run:

```bash
git add src tests styles.css index.html
git commit -m "fix: polish doudizhu playability"
```

Expected: commit succeeds if QA produced code changes. If QA produced no code changes, skip this commit and record that no changes were needed.

## Task 7: Final Verification

**Files:**
- Read: `docs/superpowers/specs/2026-06-24-doudizhu-card-game-design.md`
- Read: `docs/superpowers/plans/2026-06-24-doudizhu-card-game.md`
- Check: `index.html`
- Check: `src/*.js`
- Check: `tests/*.js`

- [ ] **Step 1: Run automated verification**

Run: `npm test`

Expected: all test files pass with no uncaught errors.

- [ ] **Step 2: Check Git status**

Run: `git -c safe.directory=E:/myProject/games/card status --short`

Expected: no unexpected uncommitted files. If QA changes are intentionally left uncommitted, list them in the final response.

- [ ] **Step 3: Verify the spec checklist manually**

Confirm these requirements are present in code:

- Static app opens through `index.html`.
- One human player faces two AI seats.
- Deck has 54 cards and deals 17/17/17 plus 3 bottom cards.
- Bidding assigns a landlord and gives the landlord bottom cards.
- Rule engine recognizes all listed classic play types.
- Bomb and rocket comparison rules are implemented.
- Human can select cards, play, pass, ask for hint, and start a new round.
- AI can bid, lead, follow, and pass legally.
- Game detects landlord or farmer victory.
- UI uses the classic green-table direction.

- [ ] **Step 4: Final response**

Report:

- Files created.
- Test command and result.
- Manual browser checks completed or not completed.
- How to run the game: open `E:\myProject\games\card\index.html`.
