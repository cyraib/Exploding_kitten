# Game Test Report

Test date: 2026-10-09 (Asia/Bangkok)  
Build tested: current local Original Edition at `http://127.0.0.1:4177`  
Primary browser: Brave  
Verdict: no reproduced game-breaking rule, state-corruption, crash, or progression defect. The release-blocking risk is low, but spectator pacing, modal keyboard behavior, and several feedback gaps keep the experience from feeling fully finished.

## Test Coverage

Five live matches were completed from setup to a winner:

1. Normal five-player Clever-bot match, including an immediate Kitten, Defuse, random reinsertion, Attack debt, chained Nopes, human elimination, spectator mode, and a bot winner.
2. Fast two-player aggressive-input match, including double-click Shuffle, clicks during its response animation, three near-simultaneous Draw clicks, Favor, two Defuses, and a human win.
3. Three-player Casual edge-case match, including illegal Defuse play, incompatible selections, target cancel/retry, hidden pair theft, midgame reload/resume, Favor, Attack debt, elimination, and a bot winner.
4. Two-player unusual-action match, including keyboard Escape/Enter, canceled and completed targeting, pair theft, double-click Attack, Settings during bot play, repeated `D` presses during an opponent action, Defuse, and a bot winner.
5. Dedicated five-player Clever-bot match, including Nope cancellation, Favor confirmation, two human Defuses, bot rescues, multiple eliminations, spectator mode, and a bot winner.

Additional validation:

- `npm test`: 52/52 passed, including 124 complete automated matches (100 Original Edition plus 24 custom-deck matches).
- `npm run check`: passed.
- `node .codex/steam-scene-check.mjs`: 18/18 presentation checks passed.
- `python .codex/verify_playtest.py`: 351 original asset files unchanged, 146 documentation links resolved, and existing evidence images decoded.
- Brave warning/error console: empty after the live runs.
- Desktop layout: 1920x1080, 1600x900, 1366x768, 1280x720, and 1024x768 had no page overflow or off-viewport visible buttons.

## Critical Issues

No P0 critical issue was reproduced.

Rapid clicks did not duplicate draws or actions, saves resumed correctly, invalid commands remained atomic, matches reached valid winners, and no console crash occurred.

## Major Issues

### M1 - UX ISSUE / PACING - Eliminated players can wait too long for the bot-only endgame (P1)

- **Problem:** Spectator mode has no fast-forward or automatic pace reduction after the human is eliminated.
- **How to reproduce:** Start a five-player Smooth/Clever game, draw until eliminated while three or four bots remain, then watch without opening Settings.
- **Expected behavior:** The remaining game should stay understandable while offering a clear `Speed up`, `Skip to result`, or spectator-only accelerated pace.
- **Current behavior:** The normal match took about 85 seconds from the human's elimination to the winner dialog. Bot action chains still show repeated full response windows, thinking delays, and effect staging even though the human can no longer act.
- **Likely cause:** The same scheduling and fixed three-second reaction presentation is used for active play and eliminated-human spectator play.
- **Suggested fix:** Preserve rule resolution, but add a spectator control that accelerates bot thinking and non-human presentation. Keep a normal-speed option for players who want to watch.
- **Related file/component:** `app/main.js` scheduling/reaction flow; spectator branch in hand/footer rendering; Settings animation pace.

### M2 - UX ISSUE / ACCESSIBILITY - Dialog keyboard focus is not contained (P1)

- **Problem:** Keyboard focus can leave an open modal and land on the page root.
- **How to reproduce:** Open `How to play`, press Tab repeatedly, and inspect the focused element. The observed cycle was `Got it` -> page root outside `#modal` -> dialog container -> close button.
- **Expected behavior:** Tab and Shift+Tab should cycle only through meaningful controls inside the open dialog; closing should restore focus to the opener.
- **Current behavior:** Focus leaves the dialog every cycle. Background toolbar and setup controls also remain locator-visible behind the modal, even though the backdrop blocks ordinary pointer input.
- **Likely cause:** `showModal()` calls the native dialog API but does not establish initial focus, a focus loop, background `inert`, or explicit focus restoration.
- **Suggested fix:** Focus the close button or first primary action when opening, trap Tab within enabled modal controls, set the game surface inert while open, and restore focus to the invoking control on close.
- **Related file/component:** `index.html` `#modal`; `app/main.js` `showModal()`, `hideModal()`, and `closePanel()`.

## Minor Issues

### m1 - UX ISSUE - Opening deal announces the turn before interaction is ready (P2)

- **Problem:** During the first seconds of the deal, the UI says it is the player's turn while the hand is incomplete and controls are disabled.
- **How to reproduce:** Start a five-player match and inspect the table about one second into the deal.
- **Expected behavior:** Show `Dealing cards... 4/8` or keep the turn instruction hidden until all eight cards and controls are ready.
- **Current behavior:** The test showed four visible cards, `Your turn - pick a card to play, or draw to finish`, and disabled Draw/Play controls. The deal completed correctly after roughly 3.5 seconds.
- **Likely cause:** Game state enters the human turn before the presentation queue finishes the opening deal.
- **Suggested fix:** Add an explicit non-interactive dealing status and reveal the normal selection instruction only on the deal-complete callback.
- **Related file/component:** `app/main.js` render/busy state; deal presentation queue.

### m2 - UX ISSUE - Pair/triple resolution has a quiet gap after the response window (P2)

- **Problem:** The hidden-card chooser can appear noticeably after the response countdown ends, without a strong persistent resolving state.
- **How to reproduce:** Play a matching pair, choose a target, and wait through the full Nope window. In Fast mode, the chooser was not yet visible at 4.5 seconds and appeared about 1.2 seconds later.
- **Expected behavior:** The transition should remain visibly connected: `Response complete` -> transfer animation -> `Choose a hidden card`.
- **Current behavior:** The response panel disappears before the chooser appears, making the game briefly feel stalled.
- **Likely cause:** The fixed reaction deadline, transfer scene, and modal render occur sequentially with no persistent bridge label.
- **Suggested fix:** Keep the interaction caption visible or add `Resolving steal...` until the chooser is interactive.
- **Related file/component:** `app/main.js` reaction scheduling, `renderInteraction()`, and steal modal rendering; presentation flight timing.

### m3 - UX ISSUE - Reload recovery looks like a reset before the player notices Resume (P2)

- **Problem:** Reloading an active game opens the first setup step rather than the saved table.
- **How to reproduce:** Reload during the human turn of a three-player match.
- **Expected behavior:** Either resume automatically or present saved-game recovery as the dominant first action.
- **Current behavior:** The full setup wizard appears with a smaller `Your 3-player table is waiting. Continue saved game` note. State was preserved exactly after clicking it, but the initial view can make a player think progress was lost.
- **Likely cause:** Startup always opens the setup panel and treats resume as a secondary option.
- **Suggested fix:** Make `Continue saved game` the primary yellow action, show turn/player summary, and move `Start a new table` to a secondary action.
- **Related file/component:** `app/main.js` setup panel and `resumeSaved` markup.

### m4 - UX ISSUE - Single Cat-card discard is legal but insufficiently explained (P2)

- **Problem:** A single Cat card can be played and discarded with no effect, but its hand description only explains pairs and triples.
- **How to reproduce:** Select one Cattermelon and press Play.
- **Expected behavior:** The player should be warned before spending a powerless card or the selection hint should clearly say `No effect alone - discard anyway`.
- **Current behavior:** Play is enabled, the card is discarded, and only the Game Log explains `A single cat has no effect. Save a matching pair or triple for a combo.`
- **Likely cause:** The engine intentionally permits no-effect single-card plays, while the card description focuses on combo use.
- **Suggested fix:** Add the warning to the selection hint and card close-up. A lightweight confirmation is appropriate for first-time users but should be suppressible.
- **Related file/component:** `app/main.js` selection hint/detail panel; Cat-card catalog copy; `app/engine.js` single-card play rule.

### m5 - UI ISSUE - Small-desktop footer text is too faint and too small (P2)

- **Problem:** At 1024x768, the bot/mode status and keyboard shortcut legend are difficult to read and sit very close to the lower edge.
- **How to reproduce:** Use a 1024x768 viewport with a full five-player hand.
- **Expected behavior:** Secondary information should remain legible at the smallest supported desktop size.
- **Current behavior:** Nothing overflows, but 7-8 px footer text with reduced opacity is visibly weak against the table, especially the shortcut legend.
- **Likely cause:** Compact desktop rules reduce footer typography and opacity to preserve hand space.
- **Suggested fix:** Use at least 9-10 px effective text, stronger contrast, and a little more bottom padding at short desktop heights.
- **Related file/component:** `app/styles.css` `.table-footer`; `app/presentation/steam-table.css` responsive footer rules.

### m6 - POLISH ISSUE - Spectator mode still advertises unusable keyboard actions (P3)

- **Problem:** Eliminated players continue to see `D draw`, `Enter play`, and `Esc clear` even though their hand is empty and actions are disabled.
- **How to reproduce:** Become eliminated and remain to spectate.
- **Expected behavior:** Replace the shortcut legend with spectator controls or a concise `Watching remaining bots` message.
- **Current behavior:** The instruction line remains unchanged while the central status correctly says the player is spectating.
- **Likely cause:** The footer shortcut markup is static.
- **Suggested fix:** Render a spectator-specific footer and place any future speed-up control there.
- **Related file/component:** `index.html` `.table-footer`; `app/main.js` footer rendering.

### m7 - POLISH ISSUE - Discard count grammar is unfinished (P3)

- **Problem:** The pile caption says `1 cards played`.
- **How to reproduce:** Play or discard exactly one card.
- **Expected behavior:** `1 card played`.
- **Current behavior:** The plural string is unconditional.
- **Likely cause:** A fixed template is used for all counts.
- **Suggested fix:** Add singular/plural formatting.
- **Related file/component:** `app/main.js` discard count rendering.

## Missing Feedback / Animation

### Action: Opening deal

- **Current:** Cards arrive sequentially, but the normal turn instruction appears before the deal completes.
- **Problem:** Disabled controls look broken to a first-time player.
- **Recommended:** Show `Dealing cards... n/8`, keep the hand non-actionable, then pulse Draw/Play once the turn begins.

### Action: Pair/triple after the Nope window

- **Current:** The response panel ends, then the hidden-card chooser appears after the remaining transfer/resolution delay.
- **Problem:** The quiet interval can read as a stall.
- **Recommended:** Hold a visible `Resolving steal...` caption through the handoff and focus the first hidden-card choice when ready.

### Action: Playing one Cat card

- **Current:** The card moves to discard and the explanation appears only in Game Log.
- **Problem:** A player may think the combo failed or accidentally waste a card.
- **Recommended:** Before play, show `No effect alone`; after play, show a short `Discarded - no effect` toast.

### Action: Human elimination with bots remaining

- **Current:** Elimination feedback is clear, then normal bot pacing continues.
- **Problem:** The player has no meaningful input and can lose track of why the wait is long.
- **Recommended:** Transition to a spectator strip with `Normal`, `Fast`, and `Skip to result` controls; do not remove Game Log access.

### Action: Reloading an active match

- **Current:** The setup modal reappears with a secondary resume note.
- **Problem:** The saved state initially looks absent.
- **Recommended:** Lead with `Continue turn 12 - 3 players alive`, then offer `New table` secondarily.

### Action: Invalid or ignored input during animation

- **Current:** State remains safe, but most ignored clicks are silent.
- **Problem:** Rapid users cannot tell whether the click was intentionally rejected or missed.
- **Recommended:** Keep disabled styling strong and optionally show one non-spamming `Wait for this action to finish` hint.

## UX Confusion Points

- `Why can I not draw yet?` during the opening deal even though the screen already says `Your turn`.
- `Did the game freeze?` in the gap between a completed response window and a steal chooser.
- `Why did that Cat card do nothing?` after a legal single-card discard.
- `Did reload erase my game?` before the player notices the small saved-game resume note.
- `Why am I still waiting?` during a long bot-only endgame after human elimination.
- `What do D and Enter do now?` when the shortcut legend remains visible in spectator mode.
- Keyboard-only players can lose their place when Tab exits the modal focus sequence.

## Bot Issues

No illegal bot move, private-information leak, stuck bot turn, invalid target, or incorrect winner was reproduced.

Observed bots used Attack, Skip, Shuffle, See the Future, Favor, pair combos, Nope/counter-Nope, Defuse, and reinsertion legally. The automated suite also completed 100 Original Edition bot games across seat counts and both personalities.

The remaining bot-facing issue is presentation, not legality:

- **P1 UX/PACING:** bot-only endgames are too slow for an eliminated human.
- **P2 FEEDBACK:** chains of bot actions are individually logged, but the gap between a response and the next chooser/effect needs a persistent resolving label.
- **Code Review Finding:** Clever bots are covered for known top-deck hazards and Favor valuation, but live QA did not objectively score strategic quality against a reference AI. No claim is made that the AI is optimal.

## Visual / UI Issues

- No overlap, clipping, page overflow, or unreachable visible buttons were found at the five tested desktop resolutions.
- The 1024x768 layout remains functional, but footer/status text is below a comfortable reading size and contrast.
- Disabled states prevented state-changing input, although the opening-deal instruction did not explain why the controls were disabled.
- Selected cards, Defuse-ready cards, targets, active seats, eliminated seats, turn debt, deck count, discard, and winner state were visible and remained synchronized.
- The modal is visually clear, but keyboard focus containment is incomplete.
- Minor copy polish remains: `1 cards played`.

## Edge Cases Found

- Three near-simultaneous Draw clicks all completed at the UI automation layer, but only one card left the deck and the turn advanced once.
- Double-click Shuffle plus extra Draw/card clicks during its response animation produced one discard and no duplicate action.
- Double-clicking Defuse outside danger did nothing and changed no state.
- Clicking incompatible cards retained only a legal current selection; it did not create an invalid mixed play.
- Escape cleared a card selection and canceled target selection without spending cards.
- Enter opened the target chooser for a valid pair.
- Double-click Attack dispatched immediately to the next clockwise player with no target picker.
- Repeated `D` presses during a bot action did not draw or skip turns.
- Opening Settings paused bot decisions; returning resumed the pending flow.
- Midgame reload preserved hand and discard exactly after `Continue saved game`.
- Hidden theft showed only generic card backs, and the received card appeared only after selection.
- Favor transferred exactly one selected card only after confirmation.
- Defuse insertion completed at random and bottom positions without exposing the Kitten face or public index.
- Eliminated humans entered spectator mode and bots completed the match.
- Empty-deck endgames reached a valid single winner.
- No warning/error console entries appeared across the completed live runs.

## Suggested Improvements

- **P0 - game-breaking:** None from this test pass.
- **P1 - important gameplay/UX:** Add spectator acceleration; implement a complete modal focus trap and focus restoration.
- **P2 - polish with meaningful clarity impact:** Add deal progress, bridge response-to-resolution gaps, clarify powerless single Cat plays, promote saved-game resume, and improve short-desktop footer readability.
- **P3 - optional enhancement:** Spectator-specific footer copy, singular discard grammar, and a restrained ignored-input hint.

## Top 10 Things To Fix Next

1. **P1:** Add `Fast` and `Skip to result` controls for bot-only play after human elimination.
2. **P1:** Trap keyboard focus inside every modal and restore focus to its opener.
3. **P2:** Replace premature `Your turn` copy with explicit opening-deal progress until controls are ready.
4. **P2:** Keep a `Resolving...` status visible between Nope completion and pair/triple/Favor follow-up UI.
5. **P2:** Make saved-game resume the primary startup action when a valid active save exists.
6. **P2:** Warn that a single Cat card has no effect before it is discarded.
7. **P2:** Raise footer/status font size and contrast at 1024x768 and other short desktop heights.
8. **P3:** Replace play shortcuts with spectator controls/messages after elimination.
9. **P3:** Change `1 cards played` to `1 card played`.
10. **P3:** Add one restrained feedback message for ignored input during blocking animations.

## Release Answer

If released today, the game is unlikely to feel broken from rules or state corruption. It will most often feel unfinished when the human is forced to watch a long bot-only endgame, when keyboard focus escapes a modal, or when the presentation enters a brief state with no clear explanation (opening deal, post-reaction resolution, single Cat discard, or reload recovery). Fixing the first five items above would produce the largest immediate improvement without redesigning the game or changing the authoritative engine.
