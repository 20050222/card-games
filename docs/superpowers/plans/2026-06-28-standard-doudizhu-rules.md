# Standard Doudizhu Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the local Doudizhu game closer to classic Tencent/Huanle Doudizhu core rules.

**Architecture:** Keep the existing plain JavaScript structure. `src/rules.js` owns card type detection and comparisons; `src/game.js` owns round state, bidding, multiplier, spring, alarms, and settlement; `src/ui.js` renders state. `src/browser-app.js` remains the direct-open browser bundle and must be kept in sync.

**Tech Stack:** Vanilla JavaScript modules, direct-open browser bundle, Node-based tests.

---

### Task 1: Core Round Accounting

**Files:**
- Modify: `tests/game.test.js`
- Modify: `src/game.js`

- [ ] Add failing tests for base score, multiplier, rob multiplier, bomb/rocket multiplier, spring/anti-spring, alarm text, and final scores.
- [ ] Run `npm test` and verify the new tests fail on missing accounting fields.
- [ ] Implement state fields: `baseScore`, `multiplier`, `bidMultiplier`, `bombCount`, `rocketCount`, `playActionCounts`, `playedCardCounts`, `lastAlarm`, `spring`, `roundScores`, and `settlement`.
- [ ] Update bidding to double multiplier on every rob landlord action.
- [ ] Update `playCards` to double multiplier for bombs and rockets, track each successful play, detect alarms, detect spring/anti-spring, and calculate landlord/farmer score deltas.
- [ ] Run `npm test` and verify green.

### Task 2: UI and Direct-Open Bundle

**Files:**
- Modify: `tests/app-files.test.js`
- Modify: `src/ui.js`
- Modify: `src/browser-app.js`

- [ ] Add failing static tests that require multiplier, score settlement, spring, and alarm support in the browser bundle.
- [ ] Render base score, current multiplier, and settlement in the table center/status text.
- [ ] Keep bottom cards hidden until landlord confirmation.
- [ ] Sync the updated `game.js` behavior into `src/browser-app.js`.
- [ ] Update sound cues for rob landlord, bombs, rockets, alarms, spring, and final settlement.
- [ ] Run `npm test`, `node --check src/browser-app.js`, and a DOM smoke test.

### Task 3: Verification and Commit

**Files:**
- All modified files.

- [ ] Run `npm test`.
- [ ] Run `node --check src/browser-app.js`, `node --check src/game.js`, and `node --check src/ui.js`.
- [ ] Run `git diff --check`.
- [ ] Run the DOM smoke script for the direct-open bundle.
- [ ] Commit with `feat: align doudizhu rules with classic scoring`.
