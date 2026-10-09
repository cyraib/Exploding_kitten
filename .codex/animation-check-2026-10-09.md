# Original Edition player-experience QA, October 9

Request: execute `Requirement/Original_Edition/animation.check.txt` as a professional game tester, QA engineer, and UX reviewer; do not modify game code; create `GAME_TEST_REPORT.md`.

## Outcome

Created [the full game test report](../GAME_TEST_REPORT.md). No game code, configuration, source asset, or source URL was changed.

Five Brave matches were completed from setup through a winner: normal five-player, aggressive two-player, three-player edge-case, unusual keyboard/interaction two-player, and a dedicated five-player bot-heavy run. The live passes exercised rapid repeated Draw, clicks during action presentation, keyboard controls, target cancellation/retry, pair theft, Favor confirmation, Attack debt, Nope/counter-Nope, Defuse/reinsertion, reload/resume, Settings pause/resume, elimination, spectator flow, and empty-deck endgames. Browser warning/error logs were empty.

The report records no reproduced P0 issue. Its main P1 findings are slow spectator endgames and incomplete modal keyboard focus containment. P2/P3 findings cover premature turn copy during the opening deal, a weak transition between response completion and follow-up choosers, saved-game resume hierarchy, single Cat-card no-effect clarity, short-desktop footer readability, spectator shortcut copy, and singular discard grammar.

## Validation

- Five complete live Brave matches reached a valid winner.
- `npm test`: 52/52; 124 complete automated matches in the current output.
- `npm run check`: passed.
- `node .codex/steam-scene-check.mjs`: 18/18.
- `python .codex/verify_playtest.py`: 351 original asset files unchanged; 146 documentation links resolved; evidence images decoded.
- Desktop viewport checks at 1920x1080, 1600x900, 1366x768, 1280x720, and 1024x768 found no page overflow or off-viewport visible buttons.
- No browser warning/error console entries were returned after the live matches.

## Limitations

Live browser QA used Brave only. Sound was left off. Strategic bot quality was observed but not benchmarked against an external reference AI. The pass did not change the OS reduced-motion preference, perform physical touchscreen testing, or claim exhaustive visual parity with the commercial Steam game. The final dedicated bot-heavy match was left at its completed winner dialog; the normal server remains available at port 4177.
