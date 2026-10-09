# Original Edition bug-fix requirement, October 7

Completed **2026-10-09, Asia/Bangkok**, after implementation and initial browser checks on October 7. Request: [bug_fix_7.10.txt](../Requirement/Original_Edition/bug_fix_7.10.txt). Evidence: [validation](bug-fix-7.10-validation.json), [integrity](bug-fix-7.10-integrity.json), [desktop](bug-fix-7.10-desktop.png), [phone Favor confirmation](bug-fix-7.10-mobile-favor.png).

## Delivered behavior

| Request | Result |
|---|---|
| Remove unnecessary animation | Removed automatic turn overlays, duplicate Attack stamp, paw rigs/gestures, screen shake, confetti, idle pulses, bouncing cues and decorative card-art overlays. Persistent status, short flights and compact action feedback remain. Explicit editor turn previews remain available. |
| Remake Shuffle | Six card backs split into two packets, interleave and square over the draw pile. No orbit or face exposure. |
| Fix briefly disappearing played card | Flight opacity stays at one. An arrival callback exposes the destination before removing the sprite. Applied the same handoff to draws and transfers. |
| Keep running after switching tabs | Removed visibility-driven Pause. Hidden-page effects finish and subsequent travel skips; a dedicated worker assists deadlines, with a main-thread fallback and deadline catch-up on return. Manual Pause and menus still stop bot decisions. |
| Auto-scale/responsive UI | Available viewport width/height drive table, piles and hand sizing. Short landscape places piles beside the hand; portrait keeps independent hand scrolling. Extremely narrow and short windows intentionally allow vertical scrolling instead of clipping controls. |
| Confirm Favor gift | Selecting a hand card displays its name and recipient. Give card confirms once; Choose another keeps the card. Fixed light-button contrast in the dark confirmation panel. |
| Arrange hand and align received cards | Drag, selected-card arrow controls, Alt + Left/Right and Group matching. A separate UID-only display order survives refresh. New cards join the last matching exact type, otherwise append. Engine hand and blind-theft indexes remain independent. |
| Double-click to play | Real double-click plays the clicked single card. Selection updates preserve the DOM node so the browser recognizes the gesture. Combos still use matching selections plus Play. Favor still requires confirmation. |
| Attack without target selection | Single Attack dispatches immediately; the engine selects the next living clockwise player. Favor/combos retain target selection. |
| Remake bomb reinsertion | Upper deck packet lifts, a back slides into the gap, then the packet closes. The scene receives no card identity, deck contents or chosen insertion index. All positions share the same public choreography. |

Normal authored timings are now short: hand transfer 300ms; visible draw 560ms (Kitten 640ms); Shuffle 540ms; reinsertion 580ms; compact feedback about 380ms. Fast, Calm, reduced motion and editor timing multipliers remain available. Every Nope/counter-Nope retains a full **3000ms** after its animation.

## Files and boundaries

Runtime changes: `app/main.js`, `app/hand-order.js`, `app/decision-clock.js`, `app/background-clock.js`, `app/presentation/steam-scenes.js`, `app/presentation/steam-scenes.css`, `app/presentation/steam-table.css`, `app/presentation/card-art.css`, `package.json`, `README.md`, and root `memory.md`.

Support changes: `.codex/tests/hand-order.test.js`, `.codex/tests/decision-clock.test.js`, `.codex/steam-scene-check.mjs`, `.codex/playtest-server.mjs`, this note, the linked JSON reports/screenshots and fixture/launcher runtime logs. The fixture server remains separate on port 4181 and is stopped after QA. The ordinary server does not expose fixture routes. `.codex/memory.md` remains navigation only.

No engine or bot change, original asset rewrite, download or source URL change occurred. The integrity report confirms both protected runtime hashes and all **351** original Assets files.

## Validation

- `npm test`: **52/52**, including the existing 164 complete simulated matches. Nine added tests cover stable immutable hand ordering, exact types, UID-only order, preserved theft indexes, full deadlines, stale-message cancellation, one-time catch-up and worker fallback.
- `npm run check`: passed, including all three new modules.
- `node .codex/steam-scene-check.mjs`: **18/18**, including opaque arrival handoff, cancellation/epoch cleanup, draw privacy, packet mixing and secret reinsertion.
- `python .codex/verify_steam_animation.py --output .codex/bug-fix-7.10-integrity.json`: passed; original files and engine/bot hashes unchanged.
- Brave UI checks: Favor select/cancel/confirm (10 to 9 hand cards only after confirmation), keyboard and actual drag reorder, grouping and reload/resume. Fixed a setup render wiping the saved order and replayed successfully. Double-click Attack removed one card, showed one flight and a 3.0s reaction status with zero target buttons.
- Shuffle completed with one discard, enabled Draw and zero effects. Kitten draw/Defuse/secret bottom insertion showed three backs and zero face images; the dialog closed and play continued. Pair showed five generic backs and zero face images. A triple requested Defuse; the new `defuse:4` appeared directly after the two existing Defuses.
- Responsive checks: 1920x1080, 1366x768, 390x844, 320x568, 844x390 and 568x320; page dimensions matched the viewport, controls and cards were bounded, and inspected images loaded. Phone Favor confirmation has 36px buttons and independent hand scrolling.
- Controlled browser tabs remain visible during automation. An explicitly labeled test-only fixture simulated `document.hidden`: a bot's remaining attacked turn progressed, deck 38 to 37, human turn resumed, Pause was not set, and effects were zero. This exercises the real app visibility handler and worker clock; it does not prove native browser freeze behavior.
- Inspected gameplay warning/error logs were empty. Targeted browser checks were used rather than a new full manual match.
- Final counter-Nope replay restored Skip, showed a fresh 3.0s response status and hid the human's self-Nope control.

## Remaining limits

Official insertion frames, assets and exact timing remain unavailable; the new deck choreography is a closest reconstruction informed by retained references, not frame parity. Browser/OS sleep, frozen/discarded tabs and a closed browser can still defer JavaScript. Deadline catch-up resumes pending activity on return. Automated background QA used a simulated visibility condition because the controlled browser did not emit real hidden-tab events.

Desktop drag and phone-sized controls were verified. Physical touchscreen long-press dragging was not tested; mobile users can use the visible arrangement arrows and Group matching. Existing expansion/multiplayer/provenance limitations remain as documented in root memory.
