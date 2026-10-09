# Local implementation audit for the Steam animation research

Inspected: **2026-10-06, Asia/Bangkok**. Scope: the current `app/` game and Kitten Studio editor. Companion: [Steam research and implementation specification](research-animation-steam.md). This document records local facts and proposed implementation boundaries; it does not establish the official game's rules, artwork, frame timings or expansion availability.

The local game is Original Edition with one human and 1-4 bots. It has a useful configuration/editor foundation, but its current renderer and engine cannot reproduce the full Steam Exploding Kittens 2 experience through configuration alone. No application code or downloaded assets were changed for this audit.

## Verified baseline

Live inspection of [project.json](../app/config/project.json) found **13 cards, 1 deck, 26 UI components, 28 animations, 22 feature mappings, 5 entities and 6 sounds**. The theme object is empty; defaults come from CSS. Entities are one human template and four bot templates. There are no configured music or font entities, and all six sound asset paths are empty. The asset/config file inventory contains static JPG/PNG/WebP images and rules/data; it contains no audio/font files or avatar sprite/rig manifests.

The app renders HTML/CSS and uses the Web Animations API. There is no canvas/WebGL scene, skeletal character runtime, screen choreography registry or online match transport. The current local server is a static/editor API server; same-origin `postMessage` connects the editor iframe, not players.

| System | Actual source/symbol | Local behavior and boundary |
|---|---|---|
| Screen layout | [index.html](../index.html), lines 14-53; [styles.css](../app/styles.css), lines 1-15; [update2.css](../app/update2.css), lines 3-60 | Header, all bots across the top, center draw/discard piles, bottom human hand, fixed overlays and HTML dialog. Responsive CSS overrides exist. The background is CSS gradients, not an official theme environment. |
| Card catalog | [catalog.js](../app/catalog.js), `BASE_CARDS` line 4 and `CARDS` line 136 | Thirteen Original card identities. Configuration overlays the base definitions. Current faces use shared local artwork scans rather than verified Steam exports. |
| Card appearance | [main.js](../app/main.js), `cardFace` line 76 and `backFace` line 82; [styles.css](../app/styles.css), lines 7-9 and 37 | Card face can be full image, icon or text. Backs are CSS panels with text/symbols. Full image uses `object-fit:fill`, which can distort differing artwork aspect ratios. |
| Hand layout | [main.js](../app/main.js), `renderHand` line 127; [styles.css](../app/styles.css), line 8; [update2.css](../app/update2.css), lines 22-24 | Overlapping flex row with small rotations; independently scrolls when wide. Hover raises 12 px; selection raises 29 px and outlines yellow. Human hand is rerendered with `innerHTML`, so stateful character/card motion cannot rely on persistent child DOM. |
| Opponents | [main.js](../app/main.js), `render` lines 89-94; [runtime.js](../app/config/runtime.js), `applyPresentation` lines 69-77 | Static cat icons inside rounded seats, three generic mini-card backs, actual count badge, active glow and thinking rock. Bot image can be replaced. No expressive animated avatar, emote or outfit system. Human avatar is a text symbol, and the existing entity asset assignment only replaces bot `.avatar img`. |
| Engine | [engine.js](../app/engine.js), `createGame` line 106, `transition` line 140, `resolve` line 56 | Original setup/effects, matching pairs/triples, rescue, elimination and victory. Engine commands are separate from presentation. |
| Bots | [bots.js](../app/bots.js), `chooseBotAction` line 6 | Heuristic Casual/Clever bots using restricted observations. Personality templates can override name/icon/difficulty; they do not implement official AI or scripted character reactions. |
| Persistence | [main.js](../app/main.js), lines 9-18 and `save` line 37; [engine.js](../app/engine.js), `SAVE_VERSION` line 3 and `assertState` line 290 | Local browser saves. Catalog/inventory snapshots protect current games. Expanded state requires explicit migration and validation. |

## Motion and timing hooks

[ui-config.js](../app/ui-config.js), `MOTION` line 3 defines UI 200 ms, common card 420 ms, major reveal/effect 850 ms, deal 200 ms. These are **local defaults**, not measurements of Steam footage.

[runtime.js](../app/config/runtime.js), `animationSettings` line 10 reads overrides from `project.animations`; its fallback easing is `cubic-bezier(.22,.75,.22,1)`. `tuneFrames` line 17 appends scale/rotation, adjusts opacity and modifies intermediate vertical excursion while preserving measured endpoints. `presentationCSS` line 28 sets CSS timing/keyframes and component styles. [main.js](../app/main.js), `animate` line 330 applies these settings, awaits completion and uses a recovery timeout. Fast halves JavaScript duration; Calm/system reduced motion suppresses most movement (`isCalm`/`duration`, lines 30-31). The settings are not a frame-accurate timeline or event scheduler.

| Event / primitive | Current timing and geometry | Actual hook |
|---|---|---|
| Play / transfer / insertion | Common 420 ms flight; measured DOM centers; middle keyframe at offset .4 uses 36% displacement, -36 px rise and slight rotation; card scales to target. Private bot draw/insertion flies a back. | `fly`, [main.js](../app/main.js):342; `eventFx`:407 |
| Initial deal | Eight sequential rounds; each round's players fly in parallel at 200 ms. Human cards reveal upon arrival; no official deal staging or camera motion. | `newGame`, [main.js](../app/main.js):290 |
| Visible draw | Five stages: pile to center 210 ms; back-to-edge 100 ms; face-from-edge 100 ms; center hold 200 ms; center to hand 210 ms. Default total **820 ms**. `draw-reveal` setting is scaled by each segment's share of 820. Hidden normal bot draws use common flight. | `drawReveal`, [main.js](../app/main.js):368 |
| Turn banner | Fade/slide/scale into centered position, 200 ms. Separate CSS active-avatar glow. | `render`, [main.js](../app/main.js):102-108 |
| Nope / Attack / explosion | Large text stamp, 850 ms, elastic scale/rotation stages. Current explosion is `BOOM!`, not an animated character death scene. | `stamp`, [main.js](../app/main.js):359; `eventFx`:429-434 |
| Kitten danger | Parallel red flash and horizontal shake, 850 ms; shake amplitude starts at 5 px. | `dangerMoment`, [main.js](../app/main.js):389 |
| Defuse | Greyed Kitten artwork, check mark and DEFUSED label fade/scale, 850 ms; then secret insertion dialog. | `defuseMoment`, [main.js](../app/main.js):399; `renderModal`:208 |
| Shuffle | Five CSS card-back ghosts fan and return, 420 ms; no independent shuffle sound cue. | `eventFx`, [main.js](../app/main.js):435-438 |
| Victory | 28 simple rectangular confetti pieces; configured duration 850 ms; victory HTML dialog opens after effects. | `confetti`, [main.js](../app/main.js):441; `renderModal`:224 |
| Future / hidden theft | Future appears in an HTML dialog with three cards; theft uses numbered generic backs; no scene-level camera or official interaction choreography. | `renderModal`, [main.js](../app/main.js):203-223 |

`dispatch` ([main.js](../app/main.js):449) commits engine state, saves, hides destination cards, rerenders and then **awaits events in order**. This avoids duplicate cards but means render/state changes precede their visual playback. Matching an official scene that overlaps action flight, avatar reaction, title overlay and sound will need a cue timeline or parallel presentation composition. The engine should continue to own legality and state; the presentation should own reveal timing and camera/character cues.

Current 9 CSS keyframe definitions are `dialogIn`, `futureIn`, `activeGlow`, `thinkRock`, `deckPulse`, `nopePulse`, `handPath`, `point` and `defuseGlow`. Their current runtime timing overrides are respectively 240, 500, 1600, 800, 1800, 1000, 800, 500 and 1000 ms. The nine transition entries cover icon button, opponent opacity, deck, button, card, toast, response progress, steal-back and the update2 deck override. Common timing controls can tune these; new named animation data entries do not acquire a gameplay trigger automatically.

**Mapping caution discovered during audit:** the `point` entry in [project.json](../app/config/project.json), lines 1472-1496, targets `.deck.ready-to-draw`, although the actual `point` animation is attached to `.pointing-hand` in [update2.css](../app/update2.css), lines 34-35. Its configured 500 ms/ease override therefore changes the ready deck's timing rather than the pointing hand's 800 ms/ease-in-out timing. Correct and recheck this mapping during implementation before treating all editor maps as authoritative. The two deck transition entries also target the same selector; later configuration/CSS precedence must be considered when measuring effective runtime timings. No correction was made in this research task.

## Gameplay timing constraints

- The normal response window is hardcoded to **3000 ms** in [main.js](../app/main.js), line 18, and `schedule` line 481. It starts after presentation finishes; each Nope restarts it. Changing animation speed does not change reaction timing. Any Steam timing mismatch must be documented and explicitly approved as a rules/interaction change before altering this prior user choice.
- Bots think **500-1200 ms** (`schedule`, line 516), independently of motion. This is local pacing, not observed official AI pacing.
- Attack always transfers to the next living clockwise seat (`resolve`, [engine.js](../app/engine.js):78-86), as previously requested by the user. Arbitrary Targeted Attack cannot be supplied by merely changing the card label or target CSS.
- No self-Nope; counter-Nope allowed (`canNope`, [engine.js](../app/engine.js):4-7). Inputs are disabled while the presentation is busy. Menus/pause stop scheduling. These are behaviors to check against evidence, not assumptions about EK2.
- Normal draws and bot hands remain private. Presentation reference captures must distinguish public action cards from private information. The sandbox can expose full state, but normal UI and bot observations must remain restricted.

## Artwork, audio and editor integration

[runtime.js](../app/config/runtime.js):28-79 supports one active theme object, component CSS/state/device overrides, backgrounds, local fonts, bot icons and static presentation entities. It does **not** provide selectable cosmetic packs, theme-specific scenes/animations, persistent character rigs, layered wardrobe assets, emote wheels, unlocks or an account inventory. Full replacement of a bot image is possible now; dressing/animating a character is new presentation code.

`sound` ([main.js](../app/main.js):56) uses six cues: play 400 Hz, draw 540 Hz, Nope 180 Hz, danger 115 Hz, Defuse 750 Hz and win 920 Hz. Each currently uses a triangle oscillator with about 200 ms duration and an exponential frequency/gain envelope. Uploaded audio can replace a cue, but current playback creates an `Audio` per cue and does not provide synchronized beat/voice/ambience mixing, per-theme cue banks, preload/decode management or official audio assets. `syncMusic` (line 49) supports one looping music entity following the sound toggle. Original media must be preserved; new assets need separate paths and source/permission records.

Useful existing tools:

- [editor.js](../app/editor/editor.js):49-54 edits card artwork/effect references, animation parameters/keyframes and entities; line 84 replaces central asset references; line 104 uploads separate unique files.
- [bridge.js](../app/editor/bridge.js):57-77 previews the real JavaScript primitives; CSS/transition entries use sample elements rather than an entire game scene. Line 87 supports pause, 0.25 playback speed, resume and cancel. These are good tools for frame comparison after new scenes are wired.
- [bridge.js](../app/editor/bridge.js):23-55 runs deterministic engine fixtures: create table, give/remove cards, reorder deck, force Kitten/Defuse/Attack/Nope/Future, eliminate and victory. `main.js`:636-644 exposes the real presentation functions only for `?editor=1` and isolates sandbox saves.
- [bridge.js](../app/editor/bridge.js):92-100 reports element rectangles/computed styles/current animations and maintained source mappings; it does not automatically trace every event handler or measure official footage.
- [.codex/serve.mjs](serve.mjs):62-68 stores uploads in `app/config/uploads/` with unique filenames; supported image/audio/font extensions are limited and assets are capped at 8 MB. Existing editor support is for static images, GIFs, audio and fonts; a rig/atlas/scene asset format would need registration, validation and loading support.

## Implementation boundary for the main specification

| Requested target | Configuration work now | Required code or external evidence |
|---|---|---|
| Colors, text, font, backdrop, card image, static avatar | Theme/UI/card/entity references and local asset uploads | Verified artwork/font/audio availability, aspect ratios and screen crops; component geometry if different from the current DOM. |
| Existing motion timing/easing/scale | Animation settings and keyframe overrides | Frame-by-frame official captures. Detailed measured flight paths should stay derived from layout, not fixed screen pixels. |
| Card-specific animated effects / avatar reactions | Assign existing flight/cue; static effect entities | New event-specific scene/cue routing, layered avatar animation, emotion state and lifecycles. Data cannot turn a static effect entity into a triggered scene. |
| Multiple cosmetic themes | Manually replace the active theme/UI/entity assets | New theme-pack schema, selector, asset manifests and theme-specific effects/audio. Keep visual theme selection separate from legal card inventory. |
| Imploding / Streaking / Barking mechanics | Reference library exists locally; no playable expansion schema/effects | Novel engine transitions, hazard state/visibility/setup, validation, save migration, bots and special prompts; verify the actual Steam variant rules before using physical expansion rules. |
| Additional action cards | New names/art/quantities reusing one supported effect | `EFFECTS` in [validation.js](../app/config/validation.js):1 allows only attack-2x, skip, favor, shuffle, see-the-future-3x, nope, defuse, exploding-kitten and cat-card. Reverse, targeted attacks, altered futures, wildcard matching and expansion hazards require implemented effects. |
| Official modes / human multiplayer | One available bots mode in [ui-config.js](../app/ui-config.js):9-11 | Online authoritative sessions, turn/reaction synchronization, privacy, reconnection, lobby/matchmaking and account/progression systems, where included in the approved target scope. |

The editor also assumes canonical Defuse/Nope/Kitten identities and enabled decks with at least six Defuses, four Kittens and 35 ordinary cards ([validation.js](../app/config/validation.js):25-47). This is suitable for current 2-5-player Original setup, not proof that every EK2 expansion/deck can use the same setup logic. `assertState` enforces the live hazard count and eight fixed phases, so adding expansion hazards or held hazards is not a configuration-only change.

Recommended implementation order once the research specification is accepted: freeze the official product/version/reference scenarios; prepare traceable asset/theme manifests; implement the observed base-game layout and presentation timeline; add avatar/theme scene support; implement and validate each expansion's rules and private information; finally compare the same seeded scenarios and screen sizes against the reference videos. Existing Original behavior should remain the regression baseline unless the accepted Steam rules specification explicitly changes it.

## Validation of this audit

Read root [memory.md](../memory.md) first, then checked the current source/configuration files and editor guide. Verified configuration counts and exact local timings from live files; searched `app/` and the server for networking and expansion implementations. No gameplay tests or browser matches were needed for this documentation-only audit. No claim of official visual/rules parity is made; official sources and capture evidence belong in the companion research specification.
