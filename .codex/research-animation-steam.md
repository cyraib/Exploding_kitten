# Exploding Kittens 2 — Steam recreation research and implementation specification

Research date: **2026-10-06, Asia/Bangkok**. Request: [Do_research_animation.txt](../Requirement/Original_Edition/Do_research_animation.txt). User choices: **Exploding Kittens 2, including expansion decks and cosmetic themes; research and implementation specification first**.

This package supplies a sourced visual reference, gameplay contract candidates, implementation map and comparison checklist. It does **not** establish 100% parity: the exact current Steam build, complete per-recipe inventories, every animation, original layered artwork, sound effects and precise input/timer boundaries remain unverified. Unknown values are deliberately empty in the [scene catalogue](research-animation/scene-catalog.json), rather than guessed. No game code/configuration was changed.

Start with the [offline visual reference viewer](research-animation/index.html), then the [gameplay and expansion research](research-animation-gameplay.md) and [current application audit](research-animation-app-audit.md). The viewer contains preserved official screenshots, two animation references and a sampled PC gameplay recording; it is a research artifact, not a playable clone.

## 1. Lock the reference before implementation

The product is [Exploding Kittens 2, Steam app 2999030](https://store.steampowered.com/app/2999030/Exploding_Kittens_2/), developed/published by Marmalade and released 12 August 2024. The [official game page](https://www.marmaladegamestudio.com/games/exploding-kittens-2) confirms customisable Bean avatars, emojis, animated cards, AI/online/friends modes, crossplay and leaderboards. The [Explosive Expansions Pass](https://store.steampowered.com/app/3140320/Exploding_Kittens_2_Explosive_Expansions_Pass/) contains Imploding, Streaking and Barking; four separate cosmetic packs are listed below. These are the chosen reference scope, not features already present locally.

Create a capture header for each later comparison: Steam build ID/version, capture date, operating system, viewport/resolution, UI language, selected recipe, player count, selected environment, outfit/back/emote pack, game mode, timer settings and source frame rate. **Current-build reference ID: unknown.** Launch press images and a 2024 recording cannot prove the current layout/timing. Publisher [patch 0.0.16](https://store.steampowered.com/news/posts/?enddate=1725906768&feed=steam_community_announcements) changed animation timing, lighting and AI speed, illustrating why references must be versioned.

Use these evidence labels throughout implementation:

| Label | Meaning | Permitted use |
|---|---|---|
| Official text | Publisher store/news or developer statement | Product/catalogue facts and stated mechanics, with date/version caveats |
| Observed still | A downloaded official screenshot actually inspected | Appearance at that instant; no motion or interaction-duration claim |
| Observed video sample | Frames actually inspected from a retained video | Visible order/poses in the sampled segment; editing and sampling limits apply |
| Physical candidate | Official physical rulebook | Proposed semantic contract until checked against the digital game |
| Implementation proposal | Our design for the local application | Engineering work plan, not a claim about Marmalade's internals |
| Capture needed | Insufficient evidence | Must be measured before exact parity can pass |

## 2. Sources and preserved evidence

Downloaded originals live entirely under [research-animation/](research-animation/). Existing `Assets/` are untouched. [sources.json](research-animation/sources.json) records remote URLs, source pages, sizes and SHA-256 hashes; [archive-members.json](research-animation/press/archive-members.json) records original press-archive member names/hashes. The original ZIP is retained as downloaded. Steam HLS video is remuxed without video/audio re-encoding; it is a web-delivery reference, not the studio master.

| ID | Source / retained artifact | Inspection and limitation |
|---|---|---|
| S01 | [Official Steam listing](https://store.steampowered.com/app/2999030/Exploding_Kittens_2/), `steam/app-2999030.json` | Current store metadata; five base screenshots preserved, selected visual references inspected |
| S02 | [Official press kit](https://www.marmaladegamestudio.com/exploding-kittens-2-press-kit), [original ZIP](research-animation/press/Exploding_Kittens2_PR_KIT_4e50abde52.zip) | Fourteen members: icon, key art, four logo variants, six screenshots, promotional image, release PDF. Six screenshots visually inspected; PDF retained but not used as visual evidence |
| S03 | [Official Steam trailer](research-animation/video/official-steam-trailer.mp4), [provenance](research-animation/video/source.json); [YouTube link supplied by publisher](https://www.youtube.com/watch?v=rHy0flai5ek) | Downloaded the Steam-delivered trailer and inspected 60 samples at 2 fps. Publisher's YouTube embed is a separate linked reference; do not assume identical edit/master |
| S04 | [The Lost Pixels production portfolio](https://thelostpixels.com/art/), [card-animation montage](research-animation/vendor/ExplodingKittensAnim_1.mp4), [provenance](research-animation/vendor/vendor-sources.json) | 9.10 s, 1920×1080, 30 fps, no audio; inspected 36 frames at 4 fps. In-game edited inspection montage, not a clean animation export. Platform/build unknown |
| S05 | [Stumpt PC gameplay, 19 October 2024](https://www.youtube.com/watch?v=gNPBdjKDHco), [retained recording](research-animation/gameplay/gNPBdjKDHco.mp4), [provenance](research-animation/gameplay/source.json) | Downloaded 29:02 recording at 640×360/30 fps; sparse overview and selected event samples inspected. Not a full current-build playtest; creator voices/editing affect audio and timing |
| S06 | Four cosmetic Steam pages linked in section 4; `steam/<dlc-id>/` | Five screenshots per pack preserved; selected in-game/menu shots inspected. Store media may mix promotional frames and gameplay |
| S07 | [Developer deck catalogue](https://steamcommunity.com/app/2999030/discussions/0/839501827476196256/?l=schinese) | Developer badge checked; English body with Chinese site navigation; seventeen deck/player ranges |
| S08 | [Developer omitted-card explanation](https://steamcommunity.com/app/2999030/discussions/0/563659628006643375/) and [reaction-timer discussion](https://steamcommunity.com/app/2999030/discussions/0/563659628006630392/) | Omitted Curse confirmed; timer explanation tentative, not a millisecond specification |
| S09 | [Official soundtrack](https://store.steampowered.com/app/4911740/Exploding_Kittens_2_Soundtrack/) | Track names/durations/artist checked; no soundtrack audio downloaded or listened to |

Selected PC interaction evidence is indexed in [sample observations](research-animation/gameplay/observations.md), with source-frame sheets. Those historical samples are useful choreography references; all exact-parity fields remain pending.

Reproducible collectors: [collect_references.py](research-animation/collect_references.py), [prepare_video.py](research-animation/prepare_video.py), [collect_gameplay_video.py](research-animation/collect_gameplay_video.py), [sample_frames.py](research-animation/sample_frames.py), [build_reference_catalog.py](research-animation/build_reference_catalog.py). Their Python dependencies are isolated in `research-animation/tools/`; no runtime dependency was added. Video contact sheets are navigation aids, not substitutes for source-frame timestamps.

## 3. Art, layout and animation observations

### Table and player composition

The inspected [official draw screenshot](research-animation/press/extracted/Screenshots/Exploding_Kittens_2_Out_Now_1920x1080_02.png) shows an oblique wooden tabletop with snacks/peripherals at its edges, compact opponents across the upper half, and the local avatar/name at lower left. Cream cards overlap across the bottom and extend below the viewport. A tilted deck sits left of center; played cards sit right. Opponents have red backed-card fans and yellow circular counts. A small battery-like risk widget sits beside the deck. These are visual observations, not evidence of the renderer technology or of the widget's exact formula.

Reconstruction proposal: work on a 1920×1080 composition, using a uniform scale and explicit safe regions. Maintain separate anchors for seat bodies, names/counts, their hand fans, deck, played-card area, private peek and foreground hand. Record 2/3/4/5-seat layouts individually. Fit other aspect ratios from captures; simply stretching the 16:9 board or spreading all seats equally will change its composition. The current app's centered panels and top-row seats require layout/presentation work, not only color edits.

### Visual vocabulary

The [official turn screenshot](research-animation/press/extracted/Screenshots/Exploding_Kittens_2_Out_Now_1920x1080_03.png) shows a pale, glowing horizontal band, large yellow condensed uppercase text with heavy dark outline, and an enlarged costumed Bean. Under it, the table remains visible through a washed-out overlay. The Bean is a rounded body with a circular face, large white eyes, tiny mouth and costume outline. The [mode screenshot](research-animation/press/extracted/Screenshots/Exploding_Kittens_2_Out_Now_1920x1080_06.png) has a warm illustrated room, large cat, and tilted colored illustrated menu tiles with dark outlines.

Proposed asset layers: environment/backdrop, foreground props, seat body/costume, face/eyes/mouth, name/count widgets, card paper/title/icon/artwork, hand/paw, scene overlays, particles and UI. Preserve the hand-drawn contour, paper color and character silhouette at every scale. **Exact font family, weights, spacing, lighting parameters, shader/rig system and original layers were not identified.** A condensed font resemblance is not font identification. Match glyph outlines against captures before selecting a replacement.

### Cards animate internally

The [vendor montage](research-animation/vendor/ExplodingKittensAnim_1.mp4) shows card close-ups tilted left over a dimmed board, with a black rounded rules bubble on the right. Rainbow-Ralphing Cat changes from a rainbow spray to colored liquid columns covering the artwork; Pomeranian Shuffle has dogs/debris around tornado rings. Other briefly sampled illustrations include Alter Future, Lincoln Shuffle, Nope, Skip, Attack and Favor. The following spans describe **montage samples**, not complete animation lengths: Rainbow ~0.75–2.75 s; Pomeranian ~3.00–4.75 s; goat ~5.00–6.25 s; Lincoln ~6.50–7.25 s. See [vendor contact sheet](research-animation/vendor/contact-01.jpg). [Production source](https://thelostpixels.com/art/).

Reconstruction proposal: create a visual variant ID independently of the logical effect ID. Each printed illustration needs its own animation clip/layers/masks/pivots. Reusing one generic `shuffle` effect for every Shuffle illustration cannot match these references. Separate idle/inspection artwork motion from action-resolution scenes. Preserve card paper/title/icon geometry while animating only the illustration where the reference does so. No rig/atlas exports are present in the press archive.

### Foreground hands, reactions and elimination

In sampled [Steam trailer](research-animation/video/official-steam-trailer.mp4) frames, a foreground hand lifts/flips cards (~6–11 s); an opponent hand brings down a Nope and a red response label appears (~12–14.5 s); circular emotes expand around the local avatar (~15–17.5 s). Later cuts show smoke followed by a black skeletal avatar, edge flames and an elimination caption (~23–27.5 s). The trailer uses hard cuts, marketing text and transitions: these spans establish reference poses and composition only. They do not establish normal game durations or a full counter-Nope exchange. See [contact sheet](research-animation/video/contact-sheet.jpg).

The [official explosion still](research-animation/press/extracted/Screenshots/Exploding_Kittens_2_Out_Now_1920x1080_04.png) shows a darkened table, a large flaming hazard card, black skeletal costume silhouette, edge flames and a bottom caption. The [Defuse still](research-animation/press/extracted/Screenshots/Exploding_Kittens_2_Out_Now_1920x1080_05.png) shows a foreground Defuse card/hand beside the flaming Kitten and spark/smoke accents. They show two different scene states; the transition and input availability still need capture.

Reconstruction proposal: coordinate card, hand, avatar, background dimming, caption, particle and audio cues on one cancellable timeline. Give costumes matching foreground hands and death silhouettes where observed. Retain one visual card through movement/hold/discard, with a masked source/destination; do not duplicate the card when state rerenders. Normal private draws must not accidentally disclose a bot card in a dramatic reveal.

### Timing specification

No Steam animation duration, easing curve or response deadline is promoted to a verified number here. The scene catalogue uses `null` for unknown motion/input timings. Existing local values (200 ms UI, 420 ms flight, 850 ms major effect, 820 ms visible draw, 500–1200 ms bot thought and 3000 ms Nope) are documented in the [app audit](research-animation-app-audit.md); **they are not Steam measurements**.

For each measured event, record cue onset, anticipation end, card/hand contact, impact, reveal, hold end, recovery end, and first legal next input. Use actual decoded frame PTS, not contact-sheet labels. Fit translation/scale/rotation separately; measure curves from at least three repetitions and report the frame-rate uncertainty. Record animation time, readability hold, network delay, player decision time, reaction deadline and bot thinking separately. A cut that skips recovery cannot establish the original recovery duration.

## 4. Cosmetic themes and audio

| Pack | Officially named content | Required recreation work |
|---|---|---|
| Base | Bean customization, costumes and emotes; default Game Night/Cat names referenced by [publisher](https://www.linkedin.com/posts/marmalade-game-studio_marmalade-makes-exploding-kittens-2-activity-7439982598744899584--Z0h) | Catalogue every available base outfit/color/back/emote and its actual pose set. Launch pictures are not the whole inventory |
| [Kitchen Chaos](https://store.steampowered.com/app/3140300/Exploding_Kittens_2_Kitchen_Chaos_Pack/) | Slice of Heaven / Yucky Buddy outfits; six Toaster emojis; sauce-style back; Kitchen location | Capture counter/props/lighting, outfit face masks, foreground hands, emoji animation and back presentation |
| [Beach Day](https://store.steampowered.com/app/3140310/Exploding_Kittens_2_Beach_Day_Pack/) | Sea Rat / Glenn Coco outfits; pineapple emojis; beach back/location | Capture beach framing, props/ambient movement, bird/coconut costume and hand/silhouette changes |
| [Mystic Mayhem](https://store.steampowered.com/app/3276090/Exploding_Kittens_2_Mystic_Mayhem_Pack/) | Madame Beatrice / Cauldron Creature; candle emojis; Mystic back; Madame Beatrice's House | Capture dark purple environment, glows/props, costume layering and reaction silhouettes |
| [Santa Claws](https://store.steampowered.com/app/3377260/Exploding_Kittens_2_Santa_Claws_Pack/) | Snow Globe / Wrapped Up; Santa emoji pack/back; Under the Tree | Capture environment loops, costume transparency/reflections, gift-paper layers and emote playback |

[Publisher Santa news](https://www.marmaladegamestudio.com/news/exploding-kittens-2s-santa-claws-pack-delivers-new-festive-outfits-and-more) explicitly describes animated environment assets, but supplies no loop measurements. The retained theme screenshots prove static appearances only. Each theme needs the same interaction capture set; neither background replacement nor screenshots supply moving/occluded layers.

The [official soundtrack DLC](https://store.steampowered.com/app/4911740/Exploding_Kittens_2_Soundtrack/) names Christopher Willis and two tracks: **Exploding Kittens 2 (Title Music), 2:13**, and **Cats, Cards and Chaos!, 2:40**, released 28 August 2026. This verifies catalogue metadata, not how music loops/transitions in the game. Exact draw/play/Nope/hazard/Defuse/elimination/emote/menu cues and ambience remain uncollected. Record them separately from music and creator voiceover. The local six synthesized cues cannot stand in for audio parity.

Asset contract proposal: every visual/audio entry carries ID, logical usage, theme/outfit/illustration variant, source URL, checksum, capture build, dimensions/frame rate, alpha/pivot/mask information, color space and whether it is an original export or a derived reference. Preserve originals under research; import implementation assets to a separate namespace only in a later implementation task. Public press media are references; downloading them does not recover the production source assets.

## 5. Gameplay and expansion parity

The [gameplay companion](research-animation-gameplay.md) contains all **17 officially listed recipes and their supported player ranges**, source-supported digital mechanics, and compact physical-rule candidates for Original, Imploding, Streaking and Barking. It also lists every required edge-case capture. Exact per-recipe/per-seat quantities are **not** established; the physical Recipes for Disaster files must not silently substitute for the digital recipe data.

Important comparison gaps:

- [The developer confirms](https://steamcommunity.com/app/2999030/discussions/0/563659628006643375/) **Curse of the Cat Butt is absent**. Its presence in an old physical expansion does not make it a Steam requirement.
- [The developer deck list](https://steamcommunity.com/app/2999030/discussions/0/839501827476196256/?l=schinese) describes Imploding as 2–5 players, whereas DLC marketing says the player limit increases and the launch mode image mentions five AI opponents. These sources disagree; capture the actual target build/recipe before defining a sixth seat.
- [The developer reaction discussion](https://steamcommunity.com/app/2999030/discussions/0/563659628006630392/) does not establish a universal fixed Nope duration. Preserve this project's prior **full 3000 ms window, blocked self-Nope, allowed counter-Nope, clockwise ordinary Attack** until a later explicit Steam-behavior change is accepted.
- Friends/public matchmaking/crossplay/progression need actual lobby/account/network flows. Single-player heuristic bot strategy is not equivalent to official AI.

The following is an **implementation/capture inventory**, not a claim that every official animation was observed. All exact scene timings/paths remain pending unless later measurements populate the catalogue.

| Scene group | Required variations and input boundaries | Main local work |
|---|---|---|
| Menu/tutorial/setup/deal | Mode/recipe/theme selection, seat count, skip deal, tutorial prompts, starting actor | New screen/layout scenes, recipe setup data, deterministic fixtures |
| Turn/hand/draw | Local/other turn, hover/lift/inspect/select/deselect/drag or click, legal/invalid play, normal/private draw, input restoration | Table anchors, persistent hand/card/hand-puppet renderer |
| Base actions | Each Skip/Attack/Shuffle/Favor/Future illustration; chosen victim/gift; private peek and return | Per-variant artwork clips and event-specific cue timelines |
| Combos | Pair/triple selection, blind theft, named request success/failure, empty target, matching titles | Digital control contract plus private transfer choreography |
| Nope chain | Initial Nope, Yup/counter, repeated counters, eligible seats, late click, cancelled result | Simultaneous response model investigation, deadline/input traces |
| Hazard/rescue/end | Draw Kitten, choose/use Defuse, secret top/middle/bottom reinsertion, no rescue, last survivor/spectator/reward | Coordinated hazard/rescue/death/end scenes and source assets |
| Imploding | First draw/reinsert face-up, visible top warning, fatal next draw; Reverse, Bottom Draw, Targeted Attack, Alter Future, Feral matching | New effects, hazard orientation, direction/debt, bot/save validation |
| Streaking | Protected held hazard, loss/theft of protection, transferred hazard; Super Skip, Mark, Garbage, Catomic, endpoint Swap, five-card Future variants | Held-hazard state/privacy, contribution/reorder/reveal scenes |
| Barking | Matched/unmatched/both-held hazards; Bury, interception, Tower reserve, NOW, Personal Attack, Potluck, Share Future | Persistent traps/reserve/off-turn inputs and targeted hazard scenes |
| Cosmetics/emotes/audio | Every theme/outfit/back/emote in turn/draw/Nope/Defuse/death/win; settings/looping music | Theme manifests, wardrobe animation, emote UI, audio cue bank |
| Online/lifecycle | Create/join, invited players, content sharing, disconnect/reconnect, expiry, abandon/rematch | Authoritative sessions and privacy; separate from animation configuration |

Every captured play gets a trace with actor, legitimate inputs, information visible to each seat, state before/after, response deadline, visual card identity/path, scene cues, sound onset and next enabled input. This is how to verify **every play behaves the same** rather than comparing only attractive screenshots.

## 6. Implementation design for this repository

These are proposals; they were not implemented in this research task. The current checked sources and precise symbols are in [the local audit](research-animation-app-audit.md).

1. **Reference contract:** lock a Steam build and capture the missing scenarios. Store recipe inventories and rules as versioned reference data; keep a conflict register. Approve any behavior delta to existing Original play before changing the engine.
2. **Asset/theme catalogue:** separate `effectId`, `illustrationId`, `animationClipId`, `avatarId`, `outfitId`, `themeId`, `backId` and `emoteId`. Assets may share an effect without sharing artwork or motion. Add validation for atlas/rig/clip schemas; current upload/config support alone is insufficient.
3. **Base scene renderer:** introduce stable scene anchors/persistent visual nodes. Proposed modules: `app/presentation/table-scene.js`, `card-view.js`, `avatar-view.js`, `hand-view.js`, `scene-player.js`, `audio-bank.js`. Choose DOM/SVG sprites or a 2D renderer after testing clipping/occlusion/hand pivots; the observed perspective does not prove the official engine uses 3D.
4. **Cue timelines:** compose card movement, illustration playback, avatar gaze/pose, foreground hand, background wash, particles, text and audio. Proposed cue fields: scene/variant/actor/recipient/visibility, local start, duration, easing or sampled curve, layer/anchor/pivot, mask, clip, audio and cancellation policy. An epoch invalidates reset/old-match cues; cleanup restores masked nodes and releases input exactly once.
5. **Engine-to-scene adapter:** consume committed transitions and public/private observations. Keep legality, deck order, turn debt and win state in the engine; expose no bot hand/insertion index in public scene payloads. Do not let skipped/reduced motion change legal state or response opportunity. Delay visible disclosure until its reference cue without undoing committed rules.
6. **Editor extension:** register scene variants and preview whole scenarios, not only primitive flights. Reuse sandbox fixtures and inspector. Add theme/outfit selectors, frame scrubbing, cue visualization and measured-reference fields; retain current save conflict/backups. Correct the audited `point` selector mapping before relying on that preview.
7. **Expansion engine work:** implement each novel effect/hazard, then state invariants, save migration and bot observation/strategy. Current schema accepts only nine Original effect families; renaming a card cannot add Reverse, held Kittens, reserve theft or NOW timing.
8. **Modes and progression:** once base/expansion interactions are verified, design the chosen human/online functionality, then cosmetics/progression parity. Do not represent a button leading to no mode as a completed official mode.

Use a separate proposed `steam-parity` rules profile if measured digital mechanics differ from the accepted Original profile; never silently overwrite validated local behavior with a physical-rule assumption. The app currently has no online transport, wardrobe rig or event-level scene catalogue. Config-only changes can replace images/colors/fonts/tune existing motions; full target scope needs code and new assets.

## 7. Exact comparison procedure and acceptance gates

Implementation acceptance criteria below are **our proposed quality gates**, not official game specifications.

For each scenario, capture reference/local footage at the same frame rate, viewport, locale, recipe, actor and visual variant. Recreate the relevant deterministic state; a same random seed across unrelated engines does not guarantee the same deck. Match the initial card order explicitly in a test fixture. Synchronize by the observed input/impact cue and compare full frames plus crops for cards/avatars/controls. Use image overlays/difference maps and decoded frame PTS; exclude the external video player's controls and identify creator edits.

- **Rules:** same legal inputs, state result, debt/direction, hidden information, consumed cards, next actor and terminal outcome for every checklist case. Exact recipe counts are a prerequisite.
- **Layout/art:** same asset variant, occlusion, aspect ratio, layer order and typography. Proposed first-pass anchor tolerance is 2 pixels at 1920×1080; it is a diagnostic threshold, not a claim of perfection. Exact art needs matching source/derived assets and per-pixel review.
- **Motion:** same onset, anticipation/contact/impact/reveal/hold/recovery and silhouette at sampled frames. Proposed cue tolerance is one source frame; exact easing/path evaluation uses the full segment. A 360p recording can identify choreography but cannot validate 1080p pixel equality.
- **Input/audio:** compare first enabled frame, deadline, counter window and sound onset. Keep accessibility/motion options as separately named variants when they differ from the reference.
- **Lifecycle:** complete each game, restart during effects, pause/resume/reload, rapid input, invalid input and cancellation; no duplicate cards, stale scene nodes or privacy leakage.
- **Coverage:** record pass/fail/blocked independently for each recipe/player count, base illustration and costume/theme/emote. An unrecorded case is blocked, not passed. Online and AI equality require their own evidence.

Run the appropriate existing `npm test` and `npm run check` after implementation; supplement with real browser play and video comparisons. They test the local implementation, not proof of Steam parity. This documentation-only task validates source/link/hash/catalogue integrity instead of repeating the gameplay suite.

## 8. Remaining capture and asset requirements

The research establishes the product/content map, observed visual structure, selected animation poses, local architecture gaps and an executable comparison plan. To claim exact recreation, still obtain:

1. A pinned current Steam build, actual per-seat recipes and all menu/tutorial/settings/reward flows.
2. Unedited, high-resolution recordings of every listed action/illustration, counter chain, expansion edge case and theme/outfit reaction, including recovery and input availability. Expansion stills are not expansion motion evidence.
3. Full typography/cardback/avatar/wardrobe/emote/environment layers and animation/audio assets, or measured reconstructions validated against them. The press archive contains raster references, not the game's production rig data.
4. Direct measurements of reaction/turn deadlines, hover/drag thresholds, secret insertion UI, simultaneous responses, timeout/reconnection and bot pacing. Official AI decision equality cannot be inferred from a few matches.

The [scene catalogue](research-animation/scene-catalog.json) and [gameplay checklist](research-animation-gameplay.md) keep these gaps explicit. Research/specification is complete for currently obtained evidence; **universal 100% art/animation/gameplay equality is not established and must not be claimed at handoff**.

Validation evidence: [research-animation-validation.json](research-animation-validation.json). Original asset preservation, local link checks, retained-media hashes and reference viewer checks are recorded there. Existing provenance/catalog gaps noted in root memory remain unchanged.
