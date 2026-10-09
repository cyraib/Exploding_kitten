# Original Edition update2

Completed 2026-10-04 for [update2.txt](../Requirement/Original_Edition/update2.txt). The user's choices were: block own action but allow counter-Nope; red hand buttons plus a countdown panel; 500–1200 ms bot thinking with full three-second reaction windows. Attack retains the previously chosen next-living-clockwise target.

## Delivered behavior

- The engine's shared `canNope` gate rejects Noping your own action or your own latest Nope. Opponents can respond and the original actor can counter them. Invalid commands remain atomic. A hand Nope button spends that particular physical card.
- Reaction UI shows the original played artwork, cancellation/restoration status, countdown bar, large response button, and a small stack/count of Nopes. Visible held Nope cards get red circular buttons at their right edge; self-response controls disappear.
- Favor and theft show a pointing hand and dashed path from the actor to the victim during public pending and choice phases. Private card identities remain hidden.
- Animated YOUR TURN / BOT TURN banners and active avatar glows make turn ownership clear. Compact status shows alive count and completed-turn number; Attack highlights turns remaining instead.
- Larger, pulsing draw pile and stronger hover feedback precede a single sprite travelling deck → central flip/reveal → hand. Ordinary bot draws remain face down. Discard displays the latest landed card above two offset cards underneath.
- Hover lifts a hand card 12 px; selection lifts it 29 px with stronger outline/shadow. A small PLAY button sits above the selected card alongside the main button. Contextual instructions cover actions and combinations.
- Target mode dims the rest of the table, spotlights valid seats, and centers CHOOSE A PLAYER. Attack enables the next living clockwise seat only; Favor and combos enable eligible opponents.
- Bots show THINKING… and wait 500–1200 ms between activities. This delay is separate from animation duration and from the full 3000 ms reaction window after each played action/Nope.
- A Kitten reveals centrally, with one modest flash and short shake. Available human Defuses glow; clicking one plays a Defused cancellation effect before the secret insertion dialog appears. The dialog, future views and theft choices wait until their preceding animation finishes.
- GAME LOG replaces Table Talk and shows latest public actions first. Private draws and reinsertion positions remain hidden.
- Setup is Select Deck → Select Mode → Start Game. Registry entries currently expose Original Edition and bot play only; name, seat count, difficulty, Back navigation and saved-game continuation work through the flow.

## Files and timing

Runtime changes: [engine](../app/engine.js), [bots](../app/bots.js), [main UI](../app/main.js), [HTML shell](../index.html), [UI configuration](../app/ui-config.js), [visual overrides](../app/update2.css), and [package checks](../package.json). No source asset was edited.

`MOTION` centralizes normal timing: UI 200 ms, card flights 420 ms, major effects 850 ms, dealing 200 ms per flight. The staged human draw totals 820 ms. Fast halves visual durations; Calm/system reduced motion skip flights/flash/shake and remove repetitive motion. Reaction time stays three seconds at every pace. A completed Web Animation is removed from the tracking set and cancelled so filled effects do not accumulate. Reset cancels timers/animations and removes overlays; epoch checks prevent old callbacks affecting a new table.

Existing schema-v1 saves remain accepted. Missing turn counters begin at 1 on the next transition. Old pending reactions without last-Nope metadata conservatively use the original actor for self-Nope eligibility; they still resolve normally and new chains save the added metadata.

## Verification

`npm test`: **36/36 passed**, including three new regression tests, 100 complete games across all seat counts/difficulties, hidden-information checks, conservation checks and HTTP route guards. `npm run check`: passed. This dependency-free app has no build or standalone simulation command; complete simulations run inside the test suite.

Real browser checks exercised the three-step wizard, normal animated deal, floating PLAY, self-Nope hiding, selected-card counter-Nope and restored action, ordinary draw/reveal and bot continuation, direct Favor gift, Kitten draw, highlighted Defuse, secret bottom insertion, newest-first GAME LOG, clockwise Attack spotlight, mobile Favor targets, Calm motion with visible THINKING…, and a clean five-player restart (eight-card hands, deck 16). Inspected warning/error logs were empty. Laptop 1366×768 and phone 390×844 fit without page overflow or broken images; the phone hand scrolls independently.

Repeatable test-only engine fixtures are served by [update2-browser-server.mjs](update2-browser-server.mjs) on localhost:4180, proxying the normal server on 4177. They create valid conserved states and use separate browser storage from the normal 127.0.0.1 game. Run the script manually only for UI checks; fixture routes are never exposed by the normal server. The test server was stopped after verification.

Visual evidence: [Nope controls](original-edition-update2-nope.png), [Favor gesture](original-edition-update2-favor.png), [Kitten and Defuses](original-edition-update2-danger.png), [clockwise spotlight](original-edition-update2-targets.png), and [mobile targeting](original-edition-update2-mobile.png). [Validation record](original-edition-update2-validation.json) includes automated checks and [integrity verification](verify_update2.py).

## Remaining scope

Only Original Edition with bots is playable; additional registry options require their actual rules and controllers. This update did not repeat a full manual match to victory or test every tablet size and accessibility combination. The automated games cover endgame/rule progression. Previously documented missing provenance files, broken legacy links, recipe conflicts and unverified exact artwork-per-print assignments remain. Original assets and surviving source URLs are preserved.
