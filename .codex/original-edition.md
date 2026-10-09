# Original Edition implementation notes

Implemented 2026-10-04 (Asia/Bangkok) for [the Original Edition requirement](../Requirement/Original_Edition/requirement.txt). Gameplay was read from the existing extracted Markdown and structured inventory; the original PDF was not needed as an implementation input. The supplied [animation lab](../Requirement/Original_Edition/exploding-kittens-animation-lab-en.html) is a visual reference, preserved unchanged.

## Delivered behavior

One human starts against 1–4 bots (2–5 total players), with selectable name and Casual/Clever behavior. Setup uses the exact 56-card box inventory, separates unused cards, deals a guaranteed Defuse and seven other cards per player, applies the two-extra-Defuse exception at 2–3 players, and inserts players-minus-one Kittens after dealing.

Play, draw, Skip, Attack stacking, Shuffle, private top-three future viewing, target-chosen Favor, random-steal pairs, named-request triples, Nope/counter-Nope chains, rescue/reinsertion, elimination, skipped dead seats, and immediate last-survivor victory are implemented. Any matching title may form a pair/triple; cat names remain distinct. Combo cards do not perform their individual effects. No five-different-card combo or expansion mechanic is added.

The visual design uses the reference's coral/teal/sand table, cream cards, dark outlines, hand fan, bot seats, piles, and stamps. Following [update1](original-edition-update1.md), complete supplied artwork scans provide card faces, future views, and flights. Icons remain on seats and decorative elements. Artwork does not claim an exact printed copy/edition mapping.

Extras: saved-game resume, public action history, concise rules, close-up card help, sound synthesized locally, keyboard shortcuts, menu/visibility pause, fast/calm motion, system reduced-motion support, responsive hand scrolling, a winner screen, and bot spectating after human elimination.

## Files and architecture

Latest behavior and checks: [update2](original-edition-update2.md). It supersedes the initial UI timing and reaction eligibility described below. Setup now has three steps; bots think for 500–1200 ms; each action retains a full three-second reaction window. The actor cannot Nope their own action, but may counter an opponent's Nope. All 36 current tests pass, including 100 complete games.

| File | Purpose |
|---|---|
| [index.html](../index.html) | Accessible static table and dialog shell |
| [app/catalog.js](../app/catalog.js) | Original inventory metadata, local assets, colors, readable summaries |
| [app/engine.js](../app/engine.js) | Pure serializable command transitions, setup, phases, rules, conservation checks |
| [app/bots.js](../app/bots.js) | Decisions from restricted `botView`, independent of actual deck/opponent hands |
| [app/main.js](../app/main.js) | Human choices, rendering, animations, persistence, bot scheduling, sound |
| [app/styles.css](../app/styles.css) | Table/card/modal design and responsive/reduced-motion layouts |
| [app/update2.css](../app/update2.css) | Turn, targeting, hand actions, hazard/reaction presentation and responsive overrides |
| [app/ui-config.js](../app/ui-config.js) | Shared motion timing, setup deck/mode registry and contextual selection hints |
| [package.json](../package.json) | Dependency-free start/test/syntax-check commands; Node ≥22 |
| [serve.mjs](serve.mjs) | Loopback-only static server on 4177, health identity, MIME types, path guards |
| [launch.ps1](launch.ps1) | Start or reuse this game's server; launch the default browser |
| [create-shortcut.ps1](create-shortcut.ps1) | Rebuild the project-root Windows shortcut after moving the folder |
| [README.md](../README.md) | Launch and gameplay instructions |
| [engine tests](tests/engine.test.js) | Rule, inventory, hidden-information, persistence, complete-game simulations |
| [server test](tests/server.test.js) | Real HTTP routes, all card assets, MIME behavior, internal-path/traversal rejection |

The shortcut is `Play Original Edition.lnk` in the project root. Its absolute launch-script path requires regeneration if the folder is moved. Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .codex/create-shortcut.ps1` to regenerate it.

## Engine phases and important invariants

Phases: `turn`, `reaction`, `steal`, `favor`, `future`, `danger`, `insert`, `gameover`. `transition()` clones the previous state, validates the actor/phase/selection, applies a command, checks all card identities/counts, and returns the next state. Invalid commands cannot partially change a game.

`deck[0]` is the next draw. Every physical card has a unique `<type>:<copy-index>` UID. All 56 cards must remain exactly once across hands, deck, discard, removed setup cards, and the pending drawn Kitten. Future views are references/copies, not extra physical cards.

An Attack from an ordinary turn assigns two turns. An Attack under an existing Attack transfers all current/remaining untaken turns and adds two. One Skip, ordinary draw, or Defuse/reinsertion completes one turn. Attack debt remains until cleared; elimination clears the eliminated player's remaining turns.

Played cards enter the engine discard before the Nope window; the UI reveals them there only when their flight lands. The human may Nope at any time during a reaction, including another responder's slot. Each Nope flips cancellation and resets the pass cycle; all response cards stay discarded. The UI gives one full three-second window, then batches clockwise passes/bot decisions until resolution or a bot Nope. A counter-Nope opens a fresh window after its animation. Kittens and Defuses never enter the Nope window.

Favor and triples never reveal an entire opposing hand. A human pair opens `steal` after uncancelled resolution, mixes the target hand, and accepts a validated face-down slot index through `STEAL`; bot pairs choose randomly. No opposing identities or UIDs enter the choice DOM. Public history hides private draws and reinsertion positions. Bot draws and bot-to-bot private transfers animate face down; played cards and drawn hazards are public. Only the human future view renders its card faces. Bot future views remain absent from the DOM.

Bots are given `botView`: own hand and known top-card types, public counts/living seats, turn debt, and pending public actions. They never receive draw-pile order or opposing hands. Peeks shift after draws and are invalidated by Shuffle/reinsertion. The inserter remembers a top Kitten only when they personally chose that position. Clever bots act on this legitimate information and prefer retaining Defuses; Casual bots are less aggressive.

## Animation and lifecycle

Effects use actual source/destination DOM rectangles and Web Animations transform/opacity keyframes. Engine state is committed and saved before animation, so interrupted effects cannot alter card ownership or scoring. A busy lock prevents overlapping gameplay commands.

Flights cover human/bot play, normal draws, gifts/theft, rescue, and hidden reinsertion. Shuffle uses face-down cards; Attack, Nope, danger, Defuse, explosion, and victory have separate effects. Reduced-motion/Calm removes flights and shortens effects. Sound defaults off, uses Web Audio after interaction, and can fail without blocking gameplay.

An epoch token plus animation/timer cleanup prevents a previous game's callbacks from affecting a restart. Menus block bot scheduling. Pause and hidden-tab handling stop subsequent bot decisions; an in-flight committed command may finish its animation. Refresh resumes the saved engine phase, including private peeks, Nope responses, Favor choices, and insertion.

The mobile grid uses `minmax(0,1fr)` so the full table cannot expand to the hand's intrinsic width. Only the hand container scrolls horizontally. Short-height desktop rules keep all hand controls and the footer visible.

## Running and maintaining

```powershell
npm start
npm test
npm run check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .codex/launch.ps1 -NoBrowser
```

The server binds `127.0.0.1:4177`. The launcher verifies `/__health` identifies this application before reusing a server. Start output/error logs and the launched PID are kept in `.codex/server.log`, `.codex/server-errors.log`, and `.codex/server.pid`. A server process can stay running after the browser closes; the next shortcut launch reuses it.

`serve.mjs` exposes only the index, app files, and Assets. It rejects internal scripts/logs, unsupported methods, and paths escaping permitted directories, including encoded traversal. The HTTP test uses an isolated process on port 4178 and stops it afterward.

Browser storage keys: `ek-original-save-v1` for the complete local game, `ek-original-preferences-v1` for preferences. Saves carry an engine version and conservation checks; invalid saves are ignored. Storage failure leaves in-memory gameplay available and labels the table unsaved. This is a local game, so browser storage is not a multiplayer authority or a security boundary.

If the source deck inventory changes, update `app/catalog.js` and run the inventory-equality test. Original artwork/icon URLs refer directly to the existing Assets; do not edit or overwrite those files.

## Validation and remaining scope

Automated verification: **30 tests pass**, including 100 complete simulated games across all 2–5-player counts, conservation after every command, setup quantities, Attack arithmetic, Nope parity, rescue boundaries, pair/triple rules, Favor choice, future order, elimination/win, invalid-command atomicity, save round-trip, and bot information limits. The HTTP test checks all 13 types' icon/art routes and rejects internal/traversal requests. All source files pass syntax checks.

Browser verification uses the actual application and visible controls, with all three motion settings, laptop and phone viewport checks, saved private-peek resume, draws/bot advancement, Nope/counter-Nope behavior, Favor gift selection, pair targeting, Defuse, secret reinsertion, and Attack continuation. The match continued through human elimination, bot spectating, and Jazzy's victory; One more round then correctly dealt a five-player game with eight cards each and 16 cards in the draw pile. Pause/resume was also verified. See the saved [mobile preview](original-edition-mobile.png) and [desktop preview](original-edition-preview.png) for final visual evidence; exact completion checks are recorded in [the validation record](original-edition-validation.json).

Asset hashes were compared with the pre-existing snapshot: all 351 original Assets files remain unchanged. Missing legacy provenance/catalog/component files and the 17 pre-existing broken links remain outside this gameplay task. No PDF, source artwork, reference HTML, or requirement was changed.

Human multiplayer, server-authoritative online play, additional editions/expansions, and verified artwork-per-print mappings remain future work. Clever bots use a heuristic strategy, not an exhaustive search. There are no runtime dependencies, CDN fonts, network analytics, or required external services.

## Final playtest (2026-10-05)

See [final playtest notes](original-edition-playtest.md) for current fixes, six complete browser matches, 39 passing tests with 140 complete simulations, all-phase save validation and animation-failure recovery. This supersedes the earlier test counts and remaining manual-play limitation above.
