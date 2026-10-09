# Original Edition final playtest

Completed 2026-10-05 (Asia/Bangkok), started 2026-10-04, for [playtest.txt](../Requirement/Original_Edition/playtest.txt).

## Fixes and causes

- Drawing left a selected card lifted during the bot turn, and its play hint hid response instructions. Selections now clear on committed commands and phase/seat changes. Hand buttons accept input only on the human turn, Favor gifts, or valid Defuse interaction; Nope retains its separate response buttons. Disabled cards no longer lift on hover.
- Card-conserving malformed saves could contain impossible Attack debt, missing live Kittens, stale special interactions, mismatched future peeks, or invalid response actors/targets/pass cycles. `assertState` now rejects these before resume. Existing valid schema-v1 saves and saves missing the legacy turn counter remain supported. Rejected saves return to setup.
- A final explosion under Attack left the finished match displaying owed turns. Victory clears the engine debt and the status says MATCH OVER. Completed matches show the actual winner instead of spectator instructions. Human victory says YOU WIN.
- No-Defuse danger incorrectly asked for a highlighted Defuse. It now explicitly directs the human to accept elimination. Bot Defuse messages name the bot instead of asking the human to choose an insertion position.
- The victory dialog could open before the explosion/victory effects finished. It now waits for the committed event presentation to finish.
- An animation whose `finished` promise never settled could retain the input lock. Each animation now has a timeout of at least 1200 ms (or duration + 500 ms), then cancels its effect. Dispatch cleanup removes stale sprites; restart clears old toasts. A test-only stalled-animation browser scenario confirmed recovery.
- Audio-context resume rejections are caught, preserving optional sound without unhandled promise rejection.

## Browser matches

All commands below were performed through the real browser UI. Test storage used localhost ports separately from the normal 127.0.0.1 game.

| Match | Setup | Outcome and observations |
|---|---|---|
| 1 | Fresh 2 players, Clever, Normal then Fast | Peachy won; human peek/reload, triple request, Favor, Shuffle, Attack, Skip, Defuse, late-game reload and elimination |
| 2 | Fresh 3 players, Casual, Fast | Prootzel won; human Favor gift, repeated Defuses, spectator continuation, last-card/empty-deck danger, bot elimination |
| 3 | Fresh 4 players, Casual, Fast | Prootzel won; pair cancellation, stacked Attacks, Skip, future peek, human/bot Defuses, multiple eliminations |
| 4 | Fresh 5 players, Casual, Fast | Peachy won; three successful face-down pair choices, Favor, Shuffle, Skip, Attack, human Defuse and four eliminations |
| 5 | Original initial deal, seed 29, 2 players, Casual, Calm | Peachy won; danger and insertion reload under Attack, bottom insertion consumed one owed turn, late-game reload |
| 6 | Original initial deal, seed 1019, 2 players, Casual, Normal | Human won; three Defuses spent as a legal named-request triple, opponent Defuse received, bot pairs, three human draws, bot explosion |

Match 6 used test-only `Math.random = () => .99` for reproducible bot choices; the deck still came from the unchanged engine's seeded setup. The first four matches used ordinary random setup/outcomes. No engine action or card ownership was injected after the starting state in either seeded full match.

## Focused replays and regression

- Counter-Nope: resumed a cancelled Skip, spent the chosen hand Nope, saw 2 NOPES / RESTORED and a fresh 3.0-second timer; own-response buttons disappeared and Skip resolved to the bot turn.
- Six-turn Attack: rapid double-play of Skip consumed one card and one turn (6 -> 5); rapid double draw drew one Kitten; Defuse/bottom reinsertion consumed one turn (5 -> 4), with 4 turns restored after reload.
- Last-card rescue: deck 1 -> 0 on hazard draw, legal insertion into the empty pile, same human still owed one turn; subsequent no-Defuse elimination ended the match with MATCH OVER.
- Save checks: normal turn, private future view, danger, insertion, Attack debt and late-game reloads. Bot progression after reload remained legal. Impossible save returned to setup with no Continue control. Automated round trips cover all eight phases, including Favor, theft and gameover.
- Stalled animation: fixture returns an animation object whose completion never resolves. Double-play spent one Skip; Settings safely interrupted presentation; closing it restored a full reaction window, zero stale sprites remained, and bots continued.
- Pause/menus suspend bot decisions. Sound-on/off labels and empty error logs verified; Calm avoids card flights and repetitive motion. Normal and Fast presentation remained readable during complete matches.
- Clean five-player restart deals eight cards each and deck 16, clearing selections, target arrows, reaction/danger panels and prior effects.
- Desktop visual inspection at 1920x1080 and 1366x768; hand controls and cards fit. A browser viewport mismatch briefly made a test click miss; reapplying the documented viewport resolved it, so no game fix was attributed to that driver issue.
- Captured console warnings/errors were empty on inspected tables. Existing HTTP checks fetch all Original card art/icon routes and reject internal paths/traversal.

## Evidence and maintenance

- [Validation record](original-edition-playtest-validation.json), [human victory](original-edition-playtest-victory.png), [desktop table](original-edition-playtest-desktop.png), [laptop table](original-edition-playtest-laptop.png).
- [Focused regression tests](tests/playtest.test.js), [test-only browser server](playtest-server.mjs), [integrity verifier](verify_playtest.py).
- Launch normal game: `npm start`, http://127.0.0.1:4177. Run `npm test` and `npm run check`.
- Replays: start the normal server, then `node .codex/playtest-server.mjs`; visit localhost:4181/fixture/counter, attack, combos, bad-save, last-card, human-win, seeded-win, or fault. Test routes and injected randomness/animation faults are never served by the normal game server. The fixture server was stopped after QA.

## Actual remaining limitations

Local human-versus-bot Original Edition only; heuristic bots; shared artwork assignments are illustrative. Browser validation used Brave on Windows and the listed desktop sizes; other browsers and full assistive-technology coverage were not tested. Earlier missing provenance files, legacy broken asset-document links and recipe conflicts remain documented in root memory. No important reachable gameplay blocker or runtime error remained in the tested scenarios.
