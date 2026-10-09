# Original Edition Steam-style presentation reconstruction

Task completed: **2026-10-07, Asia/Bangkok** (began 2026-10-06). The user approved implementing the current **Original Edition first**, using the closest practical reconstruction informed by [Steam research](research-animation-steam.md), [gameplay research](research-animation-gameplay.md), the [local app audit](research-animation-app-audit.md) and [retained reference viewer](research-animation/index.html). This implementation is an authored approximation. It does not establish exact parity with the Steam game's art, animation frames, audio, rules, expansion decks or cosmetic inventory.

## Implemented scope and boundaries

The playable scope remains one human against 1–4 local bots using the existing Original Edition engine, configured catalog and saves. New presentation modules supply a paper-and-wood table, cartoon Bean-like seat avatars, illustrated card backs, paw-assisted card flights, event scenes and restrained inspection accents over the supplied card scans. Original source images are preserved; decorative vectors are separate code, with no generated replacement scans.

| Module | Responsibility |
|---|---|
| [steam-table.css](../app/presentation/steam-table.css), [tabletop.svg](../app/presentation/tabletop.svg) | Authored tabletop, paper panels, labels, card backs and responsive table styling. |
| [steam-visuals.js](../app/presentation/steam-visuals.js) | Original SVG Bean-like avatars, seat colors, expressions, costume hints, paw and event symbols. These are not extracted official costumes or rigs. |
| [steam-scenes.js](../app/presentation/steam-scenes.js), [steam-scenes.css](../app/presentation/steam-scenes.css) | DOM/Web Animations choreography for flights and gameplay cues, using caller-provided geometry and animation hooks. |
| [card-art.js](../app/presentation/card-art.js), [card-art.css](../app/presentation/card-art.css) | Small SVG accents for the thirteen known Original artwork scans; hidden, text/icon, replaced and unknown faces receive no artwork overlay. |
| [main.js](../app/main.js), [index.html](../index.html) | Presentation wiring and stylesheets; the engine continues to determine actions, eligibility and information visibility. |
| [verify_steam_animation.py](verify_steam_animation.py) | Independent integrity/syntax/privacy checks described below. |

Card accents use known illustration coordinates and clipping bounds to avoid printed headers/rules. Inspection and eligible hover/focus can animate a rainbow shimmer, blinking eyes, whiskers, speed lines, sparks, hearts, a halo or orbiting particles. The underlying scan and its character silhouette remain static. Unknown or editor-replaced art is deliberately skipped because its coordinates are unverified. Moving flight cards suppress inspection accents.

The presentation continues to respect Calm and system reduced-motion preferences. Animation durations remain local design choices and existing editor tuning hooks remain the integration boundary. The **3000 ms Nope window** is preserved independently of animation pace; bot thinking, self-Nope prevention, counter-Nope, clockwise Attack, saves and game legality remain engine-owned. A source hash check protects both engine and bot implementations. Browser validation must additionally verify reaction start/reset behavior, restart/cancel recovery and information privacy.

## Evidence and validation

Run `python .codex/verify_steam_animation.py`. Optional `--output .codex/steam-animation-integrity.json` writes a separate machine-readable integrity result. The verifier does not modify gameplay, source assets or browser evidence.

It compares every one of the **351 original Assets files** with [the original audit](repository-audit-before.json), compares [engine.js](../app/engine.js) and [bots.js](../app/bots.js) against [the immediate pre-change snapshot](steam-animation-before.json), syntax-checks all `app/presentation/*.js`, verifies the reaction constant is 3000 ms and exercises the overlay API with hidden/face-down/unrevealed, replaced, unknown and icon/text card cases. These checks prove source integrity and the isolated overlay guard; they do not prove a browser cannot reveal information through some other renderer or establish animation parity.

| Validation | Observed result / evidence |
|---|---|
| Existing regression suite | **43/43 passed**, including the existing 164 complete Original/custom simulations. `npm run check` passed, including all new presentation modules. |
| Original assets and gameplay integrity | [Integrity report](steam-animation-integrity.json): **351 originals unchanged**, no additions in `Assets`, engine/bot hashes match the immediate pre-change snapshot, three new JS modules parse, seven overlay privacy/opt-out checks pass, reaction constant remains 3000 ms. |
| Isolated scene behavior | `node .codex/steam-scene-check.mjs`: **9/9 passed** for single-card/hidden-face routing, one visible reveal, epoch restart, rejected/cancelled motion cleanup, all public scenes, Calm draw and editor frame continuity. |
| Browser action/interaction flows | Brave fixtures on separate origin `127.0.0.1:4181`: played card uses one card+paw rig; private Future shows three faces in order; Favor selects from the human hand; pair chooses a seat then five backs with zero face/overlay images, revealing only the selected transfer. Normal draw double-click consumes one card (deck19?18, hand13?14); pause during motion stops later bot decisions. |
| Nope and motion preferences | Normal/Fast/Calm show a fresh **3.0s** response status; self-Nope is unavailable. The counter-Nope fixture restores the action and starts a fresh window. Calm leaves zero foreground motion and disables overlay opt-ins; persistent status remains readable. Bot thinking code remains 500?1200ms and independent of animation scaling. System reduced-motion branches/CSS were reviewed, but the OS preference was not changed for this QA. |
| Hazard, rescue, insertion, death and victory | Kitten draw starts with one back; Defuse flies once; secret bottom insertion has zero face images. Death now hides spent hand cards until the burst/smoke/skeleton scene and moves their backs to discard before victory. [Explosion evidence](steam-animation-elimination.png), [victory evidence](steam-animation-victory.png); final effects0, dead hand0, discard9 in the seeded two-player fixture. |
| Deal, saves and recovery | Fresh five-player start deals one sprite per seat per round, eight cards each/deck16; reload/resume works. Epoch and cancellation behavior are covered by isolated scene checks; editor Reset/replay leaves zero stale nodes. The pre-existing watchdog remains. No new complete browser match or forced watchdog stall was repeated in this presentation task. |
| Inspection/editor integration | Rainbow close-up uses the preserved720px source image with active inert vector overlay; unknown/replaced/text/icon guard cases pass helper checks. Editor Turn preview displays the full-width ribbon, Stamp preview displays the actual Nope choreography, and Reset clears scenes. [Editor evidence](steam-animation-editor-preview.png). All 28 motion/22 feature mappings resolve after updating Future, turn and pointing-hand links. |
| Responsive presentation | [1920?1080](steam-animation-desktop.png), [1366?768](steam-animation-laptop.png), [390?844](steam-animation-mobile.png): page dimensions match viewport with no horizontal overflow, all images load, the phone hand scrolls independently, and mobile action buttons are 36px high. |
| Browser logs | Inspected warning/error logs were empty for gameplay and editor preview runs. |

The game server remains at http://127.0.0.1:4177. Test fixtures are support tooling only and are not exposed by the normal server. The browser tests used isolated fixture/editor saves and did not replace the normal game's saved table.

## Pacing and editor behavior

Normal defaults are locally authored: play/transfer 650ms, hidden draw 700ms, public draw 1080ms (hazard 1240ms), turn 900ms, Nope 950ms, hazard 1100ms, Defuse 1150ms, death 1450ms followed by the 200ms hand dump, Shuffle 900ms and victory 1600ms. Initial deal remains 200ms per parallel round. These values are not measured Steam timings. Fast halves WAAPI durations; Calm/system reduced motion skip travel and retain status/toast/modal feedback.

Existing editor duration defaults act as multipliers for multi-stage scene segments (for example turn-banner 200 is a 1? baseline for the 900ms ribbon). Speed/delay/easing/scale/rotation/opacity/custom frames remain available. Configured final frames persist across stages, and explicit cancellation stops a draw before its next reveal. Future CSS retains its editable keyframes with 0/.28/.56s stagger; Calm/system reduced motion remove the stagger. Custom avatar images replace the reconstructed Bean when the entity asset differs from its old default icon. Sound remains the pre-existing synthesized/configured system.

Source URLs/hashes remain in the research manifests. `tabletop.svg`, Beans, paw, effect symbols and card accents are newly authored code-native vectors informed by those references, not extracted official assets. No original source file was overwritten.

## Remaining limits

- **Flattened artwork:** the supplied scans do not contain the official separated character/background layers. This update adds restrained vectors; it cannot reproduce every character limb, liquid flow or expression inside those scans.
- **Avatars and costumes:** Bean-like figures and costume hints are newly authored SVGs. Official models, wardrobe items, expression rigs, licensed source files and unlock behavior are unavailable locally.
- **Fonts and sound:** condensed system font fallbacks and existing synthesized/configured sound cues are retained. No official font, voice, music, ambience or effects bank has been installed, so typography and audio cannot match the Steam production assets exactly.
- **Timing and camera:** reference footage informs direction, but exact current-build frame timelines, overlaps, easing, physics and camera sequences have not been captured or measured. Local milliseconds are implementation choices.
- **Gameplay and content:** the update implements presentation for the current Original game. The three Steam expansion mechanics, seventeen digital recipe inventories, four selectable cosmetic packs, online Friends/Bubble modes and official tutorials are not added by this task.
- **Parity evidence:** no frame-by-frame comparison against a controlled Steam capture has been completed. The [research capture checklist](research-animation-steam.md) remains the source for unresolved official behavior and assets.
