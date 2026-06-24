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
