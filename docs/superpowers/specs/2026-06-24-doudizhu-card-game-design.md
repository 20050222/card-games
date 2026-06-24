# Dou Dizhu Card Game Design

## Summary

Build a single-player Dou Dizhu game as a static web app. The player competes against two computer AI opponents in a classic green-table card room. The game runs locally by opening `index.html`; it does not require a framework, build step, server, or internet connection.

## Goals

- Let one human player play complete Dou Dizhu rounds against two AI players.
- Support a full classic rule set: single, pair, triple, triple with single, triple with pair, straight, consecutive pairs, airplane, airplane with wings, four with two, bomb, and rocket.
- Provide a clear classic card-table interface with readable cards, obvious turn state, landlord identity, bottom cards, and action controls.
- Include player assistance through selectable cards and a "hint" action.
- End each round with a clear landlord/farmer win result and a restart option.

## Non-Goals

- Online multiplayer.
- Accounts, persistence, leaderboards, payments, or matchmaking.
- Advanced AI search or machine-learning behavior.
- Build tooling, dependency installation, or packaged desktop/mobile apps.

## Delivery Format

The app will be a static web project:

- `index.html` loads the game.
- `styles.css` defines the classic green-table visual system.
- JavaScript files under `src/` hold the deck model, rule evaluator, game state, AI, and UI rendering.
- Tests will run locally with Node where possible for pure rule and AI functions. Browser behavior will also be manually verified by opening `index.html`.

## User Experience

On page load, a new round starts. The game shuffles one 54-card deck, deals 17 cards to each seat, and reserves 3 bottom cards. Seats are arranged as classic table positions: player at the bottom, AI opponents around the top-left and top-right area. Cards in the player's hand are visible and sorted by rank; AI cards are shown as backs with remaining-card counts.

The round begins with a call-landlord phase. Each seat can call or pass. For the first version, AI call decisions are based on hand strength. The player sees "Call Landlord" and "Pass" controls when it is their turn. The selected landlord receives the 3 bottom cards, the bottom cards are revealed, and play begins.

During play, the active player must beat the last valid play unless they are leading a new trick. The human player can click cards to select them, use "Hint" to select a legal response, click "Play" to submit, or click "Pass" when passing is legal. AI players automatically choose a small legal play that beats the current play, or pass when no reasonable response exists.

When one seat has no cards left, the game shows the winner side: landlord or farmers. The user can start a new round.

## Rules

Card ranks are ordered from low to high:

`3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2, small joker, big joker`

The rule engine must identify and compare these play types:

- Single: one card.
- Pair: two cards of the same rank.
- Triple: three cards of the same rank.
- Triple with single: three of a kind plus one extra card.
- Triple with pair: three of a kind plus one extra pair.
- Straight: at least five consecutive single ranks, excluding 2 and jokers.
- Consecutive pairs: at least three consecutive pairs, excluding 2 and jokers.
- Airplane: at least two consecutive triples, excluding 2 and jokers.
- Airplane with single wings: consecutive triples plus the same number of single kickers.
- Airplane with pair wings: consecutive triples plus the same number of pair kickers.
- Four with two singles: four of a kind plus two single kickers.
- Four with two pairs: four of a kind plus two pairs.
- Bomb: four of a kind.
- Rocket: small joker plus big joker.

Comparison rules:

- A play can beat another play only if it has the same type and same structural length, with a higher main rank.
- Bomb beats any non-bomb, non-rocket play.
- Higher bomb beats lower bomb.
- Rocket beats every other play.
- A player can lead with any valid play.

## Game State

The game state will track:

- Seats: human, AI 1, AI 2.
- Each seat's hand.
- Bottom cards.
- Landlord seat.
- Current phase: deal, bidding, playing, game over.
- Active seat.
- Last non-pass play.
- Consecutive pass count.
- Current selected cards for the human player.
- Round result.

State transitions must be deterministic and owned by the game controller. Rendering should read state and update the DOM without duplicating rule logic.

## AI

The first AI version should be simple but playable:

- Bidding: estimate hand strength from jokers, twos, bombs, and high cards. Call landlord above a threshold, otherwise pass.
- Leading: choose the smallest valid combination from the hand, preferring low singles, then pairs, then other low combinations. Preserve bombs and rocket unless the AI has no better strategic option.
- Following: find the smallest legal play that beats the current play. Use bombs only when the current play is strong or no ordinary response exists.

This AI is intentionally lightweight. It should produce legal, understandable play rather than expert-level strategy.

## Interface Design

The visual direction is classic table:

- Green felt table background.
- White playing cards with red/black suits.
- Clear seat labels and landlord badge.
- Bottom cards displayed near the center/top.
- Last played cards displayed in the middle of the table.
- Human hand fanned or slightly overlapped along the bottom.
- Action buttons near the player's hand: Play, Pass, Hint, New Round as appropriate.
- Status text indicates whose turn it is and what action is expected.

The interface should be responsive enough for desktop and common laptop widths. Mobile optimization is secondary, but the layout should avoid text overlap and keep cards usable on narrower screens.

## Error Handling

Invalid player actions should not break the game. If the player tries to submit an invalid selection, the UI should show a short Chinese message explaining the problem, such as invalid card type or must beat previous play. Passing is disabled when the player is leading a new trick. Buttons should be disabled outside their valid phase.

## Testing Strategy

Rule logic carries the highest risk and must be covered by automated tests:

- Deck creation produces 54 unique cards.
- Dealing gives each seat 17 cards and reserves 3 bottom cards.
- Every supported play type is recognized.
- Invalid combinations are rejected.
- Same-type comparisons use main rank and length correctly.
- Bomb and rocket override rules work correctly.
- Game-state transitions advance turns, reset trick state after passes, and detect round end.
- AI only returns legal plays or legal passes.

The final app should also be verified manually in a browser:

- Start a new round.
- Complete bidding.
- Select and play cards.
- Use hint.
- Pass when legal.
- Let AI turns advance.
- Finish a round and start another.

## Open Decisions Resolved

- Game mode: one human player versus two AI opponents.
- Rule scope: full classic Dou Dizhu card types.
- Visual style: classic green card table.
- Delivery format: static webpage opened through `index.html`.
