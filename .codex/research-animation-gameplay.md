# Exploding Kittens 2: gameplay research and parity specification

Research date: **2026-10-06, Asia/Bangkok**. Companion to the [main Steam animation/art research](research-animation-steam.md).

This document supports a future implementation of the user's selected target: Exploding Kittens 2 on Steam, including its expansion decks and cosmetic themes. It records source-supported behavior, physical-rule candidates, and evidence still required. **No runtime code was changed and no complete Steam parity is claimed.** No gameplay video frames were viewed by the author of this companion document.

## Evidence levels and implementation boundary

- **Digital documentation:** publisher product pages, announcements, Steam achievements, and developer-badged replies. These support the specific statements attached to their links, but do not establish unmentioned controls or timing.
- **Physical candidate:** an official rulebook supplies a proposed semantic contract. Verify the Steam build before using it as an exact digital contract, particularly recipe setup and expansion interactions.
- **Proposed verification:** a capture or acceptance case specifies work still needed; it is not an observed Steam behavior.

The local game currently implements Original Edition against bots. Existing user decisions to reject self-Nope, allow counter-Nope, retain a full 3000 ms reaction window, and keep ordinary Attack clockwise remain in force. This research does not replace them with inferred Steam behavior. Expanded gameplay will require engine implementation as well as presentation work; novel mechanics cannot be supplied through artwork or the existing editor alone.

## Verified target and content groups

The selected product is [Exploding Kittens 2, Steam app 2999030](https://store.steampowered.com/app/2999030/Exploding_Kittens_2/), released 12 August 2024. The store identifies single-player, online PvP, animated cards, avatar customisation and emojis. Its [Explosive Expansions Pass](https://store.steampowered.com/app/3140320/Exploding_Kittens_2_Explosive_Expansions_Pass/) covers Imploding, Streaking and Barking. The latter two are released content, despite outdated future-release language on the [bundle page](https://store.steampowered.com/bundle/43785/Exploding_Kittens_2_CatAstrophic_Edition/?l=polish).

The cosmetic packs have separately advertised outfit, emoji, card-back and location content: [Kitchen Chaos](https://store.steampowered.com/app/3140300/Exploding_Kittens_2_Kitchen_Chaos_Pack/), [Beach Day](https://store.steampowered.com/app/3140310/Exploding_Kittens_2_Beach_Day_Pack/), [Mystic Mayhem](https://store.steampowered.com/app/3276090/Exploding_Kittens_2_Mystic_Mayhem_Pack/) and [Santa Claws](https://store.steampowered.com/app/3377260/Exploding_Kittens_2_Santa_Claws_Pack/). These must be modelled separately from gameplay recipe inventories. Exact visual contents and movements are addressed by the main research.

## Digital deck catalogue

The following **17-deck** catalogue and player limits come from [Davi's developer-badged Steam reply](https://steamcommunity.com/app/2999030/discussions/0/839501827476196256/?l=schinese). Navigation is Chinese; the original developer replies are English. Grouping is corroborated by the bundle and expansion announcements.

| Content group | Deck | Players |
|---|---|---:|
| Base | Exploding Kittens | 2-5 |
| Imploding | Imploding Kittens | 2-5 |
| Imploding | Lightning Kittens | 2-4 |
| Streaking | Streaking Kittens | 2-5 |
| Streaking | Danger Mode | 2-4 |
| Streaking | Attack of the Attacks | 2-5 |
| Barking | Barking Kittens | 2-5 |
| Barking | Black Hole | 2-5 |
| Barking | Power Play | 2-5 |
| Barking | Sharing Is Caring | 2-5 |
| Barking | Nope Sauce | 2-5 |
| Barking | Meowsochist | 2-5 |
| Barking | Sticky Fingers | 2-5 |
| Barking | Eye for an Eye | 3-5 |
| Barking | Card Hoarders | 2-4 |
| Barking | Mind Games | 2-5 |
| Barking | Cat Fight | 2-4 |

**Conflict to resolve on the target build:** the expansion-pass page advertises an increased player limit, whereas this developer catalogue lists its namesake deck at 2-5. Physical Imploding supports six; that is not sufficient evidence for six-player Steam support. Use the developer limits provisionally and verify setup controls.

The [Streaking launch announcement](https://www.marmaladegamestudio.com/news/exploding-kittens-2-launches-streaking-kittens-plus-content-sharing) identifies five new flows: swap pile endpoints, persistently reveal an opponent card, contribute one card per hand and shuffle, move the Exploding Kittens atop the pile, and retain a Kitten through Streaking protection. Its recipes emphasize theft, greater hazard density, and Attack chains. The [Barking launch announcement](https://www.marmaladegamestudio.com/news/exploding-kittens-2-adds-eleven-new-decks-with-barking-kittens-expansion) confirms eight new cards and eleven recipes. These announcements provide themes and abilities, **not exact per-player inventories**.

## Digital expansion interactions and modes

The [publisher's Steam announcements](https://steamcommunity.com/app/2999030/allnews/) document these Barking flows: Bury draws then secretly returns a card; I'll Take That intercepts another player's next draw; Tower redirects theft to its reserve; Alter Future NOW privately reorders three; Personal Attack establishes three own turns; Potluck adds one card per player atop the pile in turn order; Share Future reorders three and shows the next player; Barking threatens its partner's holder or leaves its unmatched played card exposed as a later target.

The same source describes Friends mode: sign into Bubble, create/join a room by code, optionally invite Bubble/Steam friends. A host can share owned expansions with joined friends across platforms; public Play With Others does not share content. Mixed-expansion recipes are supported. These are documented flows, not an observed current UI walkthrough.

The [Steam achievement catalogue](https://steamcommunity.com/stats/2999030/achievements/) corroborates Nope-to-Yup counters, theft, hard single-player difficulty, online matches, ranking, marked cards, retained Streaking/Exploding pairs, intercepted draws, and Barking calls. Achievements do not determine the full AI difficulty menu, rating formula or reward UI.

## Verified differences and unresolved timing

**Curse of the Cat Butt is absent.** [Davi explicitly confirms its deliberate omission](https://steamcommunity.com/app/2999030/discussions/0/563659628006643375/). Do not implement that physical card solely because it exists in the local asset archive.

**A fixed universal Steam Nope duration is not established.** In [a separate developer reply](https://steamcommunity.com/app/2999030/discussions/0/563659628006630392/), Davi says the target should have the same timer as other players, while tentatively attributing shorter combo/Shuffle windows to animations and promising confirmation. The player's 4-5-second/1-second report is neither a measured specification nor an instruction to reproduce a suspected bug. Record response availability and expiry separately from the animation envelope. Self-Nope eligibility also needs direct Steam observation.

[Patch 0.0.16](https://store.steampowered.com/news/posts/?enddate=1725906768&feed=steam_community_announcements) changed animation timing, lighting and AI speed. [Patch 0.0.15](https://store.steampowered.com/news/posts/?enddate=1725297773&feed=steam_community_announcements) added a setup-animation skip and announced a future turn timer. These historical announcements establish drift, not present timings. Pin the build, mode, recipe, player count, theme and capture frame rate before measuring fidelity. The [official support page](https://www.marmaladegamestudio.com/support) currently says its knowledge base is temporarily offline.

## Candidate physical contracts

Each block below is a short independent paraphrase of one official rulebook, kept below 200 source-derived words. They are candidates for Steam verification, not evidence that the digital menus, choices, quantities or animation stages match the physical edition.

### Original candidate

Source: [official Original PDF](https://dumekj556jp75.cloudfront.net/exploding-kittens/English.pdf); local archive: [rules.pdf](../Assets/decks/exploding-kittens-original-edition/rules.pdf).

- Deal seven ordinary cards and one Defuse. Insert players-minus-one hazards; two/three-player games retain two extra Defuses.
- Multiple actions may precede the concluding draw. Ordinary Attack transfers outstanding turns plus two; Skip satisfies one turn.
- Favor's victim chooses the gift. Pairs steal blindly; triples request a named card and fail when absent. Matching action titles may form combos.
- See Future preserves private top-three order; Shuffle randomizes the pile.
- Nope precedes resolution, may cancel combos/other Nopes, and cannot cancel a Kitten or Defuse. Cancelled cards remain discarded.
- Defuse discards itself and secretly reinserts the hazard. Without rescue, discard the eliminated hand/hazard. Last survivor wins.

### Imploding candidate

Source: [official Imploding PDF](https://dumekj556jp75.cloudfront.net/imploding-kittens/imploding-english.pdf); local archive: [rules.pdf](../Assets/decks/imploding-kittens-expansion/rules.pdf). The image-based local field guide was rendered and inspected.

- First face-down Imploding draw: secretly reinsert face-up, without Defuse. A face-up draw eliminates its recipient; Nope, Defuse and Streaking cannot rescue it. Discard after elimination.
- Its face-up border warns when atop the pile. Shuffle must conceal its position.
- Reverse changes direction and satisfies one turn; at two players it acts as Skip.
- Bottom Draw resolves the bottom card and satisfies one turn.
- Alter Future privately reorders three without ending the turn.
- Targeted Attack chooses another seat; play continues from that victim. Transfer outstanding turns plus two.
- Feral substitutes only for powerless cat identities.

### Streaking candidate

Source: [official Streaking PDF](https://ek-instructions.s3.amazonaws.com/streaking-kittens/streaking-kittens-rules.pdf); local archive: [rules.pdf](../Assets/decks/streaking-kittens-expansion/rules.pdf).

- A held Streaking protects one held Exploding Kitten. Losing protection immediately requires Defuse/elimination.
- Receiving a transferred Kitten requires rescue; it does not satisfy the receiver's ordinary turn draw. Streaking cannot protect against Imploding.
- Garbage contributions include the actor and skip empty hands; a protected Kitten may be contributed.
- Mark is random, persists while held, and clears on theft.
- Catomic reveals/removes Exploding Kittens, shuffles the remainder, returns them atop face-down, and ends one turn. Leave Imploding in the remainder.
- Super Skip ends all outstanding own turns.
- Five-card Future variants preserve/reorder five respectively.
- Endpoint Swap neither inspects cards nor ends the turn.
- Physical hazard count equals player count because Streaking can retain one. Steam recipe setup still requires independent evidence.

### Barking candidate

Source: [official Barking PDF](https://dumekj556jp75.cloudfront.net/barking-kittens/barking-kittens-rules.pdf); local archive: [rules.pdf](../Assets/decks/barking-kittens-expansion/rules.pdf). Both image-based local pages were rendered and inspected.

- Barking cannot be Noped and does not end the actor's turn. Both cards can target a chosen seat; an unmatched played card leaves the hand. Dispose of both after the turn.
- Tower reserves six setup cards, redirects all theft, including Favor/triples, to blind reserve theft, and never adds reserve cards to its owner's hand.
- I'll Take That cannot stack on an already targeted seat. The victim privately inspects and transfers their next draw, completing that draw turn; the recipient resolves its hazard.
- Bury is forbidden while I'll Take That targets the actor; preserve an Imploding card's drawn orientation.
- NOW may act between actions outside one's turn, never during a resolving action.
- Potluck follows current direction, actor first. Share Future reveals only to the next seat.
- Personal Attack establishes three own turns; later Attacks transfer remaining debt.

## Implementation and capture matrix

This matrix is a proposed acceptance contract. Every row requires direct target-build evidence before its Steam fidelity can be marked verified.

| Interaction family | Existing local coverage | Required Steam capture / expansion implementation |
|---|---|---|
| Setup and deck choice | Original setup and bots; configurable existing-effect inventories | All 17 recipe inventories by supported player count, initial hands, starting seat, reserves, setup skip |
| Draw / hand / play | Normal draw, selected-card play, multiple actions | Hover/drag/click semantics, cancellation, invalid action feedback, exact enabled-input boundaries |
| Turn debt and targeting | Clockwise Attack, Skip, debt transfer | Partial debt, Reverse, Targeted Attack jump, Personal Attack, Super Skip; prompts and direction markers |
| Theft and transfer | Favor choice, blind pair, named triple | Empty hands, failed named requests, reveal policy, Tower reserve theft/exhaustion, intercepted draw |
| Reaction | User-defined 3000 ms window, self-Nope rejection, counter-Nope | Nope/Yup chains, self attempt, late expiry, simultaneous responders, per-action timing and legal NOW boundaries |
| Pile inspection / change | Private top-three peek, Shuffle, secret reinsertion | Reorder three/five, share-next-seat view, endpoint swap, bottom draw, Garbage, Potluck and Catomic |
| Hazard / rescue | Exploding draw, Defuse and elimination | First/second Imploding, face-up warning, Streaking retention/loss/transfer, Barking all possession states, Bury |
| Persistent metadata | Living seats, hands and debt | Mark visibility/clearance, exposed Barking, Tower owner/reserve, I'll Take That target, play direction |
| Endgame | Spectating and last-survivor victory | Elimination animation/input locks, spectator reveal policy, result screen, rematch, rewards/ranking |
| Modes and services | Local human-versus-bot only | Current tutorial, full difficulty menu, Friends, public lobby, timeouts, reconnect, crossplay |
| Cosmetics | Local supplied art/configuration | Every theme/outfit/back/emoji under identical actions; determine whether geometry or effect animation changes |

The existing editor can register compatible card variants and tune presentation. It cannot supply unknown expansion semantics. Future work should add explicit engine effects and hidden/public state first, then connect verified presentation events; avoid encoding rule decisions inside animation callbacks.

## Recording format and required scenarios

For each clip, record target build/version, platform, resolution, capture frame rate, mode, recipe, seat count, cosmetic selections, and whether video speed was altered. Record actor, legal inputs, each seat's visible information, response start/expiry, committed engine result, source/target card zones, animation anticipation/impact/recovery, sound onset, and the next enabled input. Retain raw captures and source links. Do not write guessed millisecond values into a fidelity configuration.

Minimum capture checklist:

1. Every supported recipe/player-count setup: exact quantities, initial hands, starting seat and reserve creation.
2. Normal draw, hover/select/play, cancel/invalid action and multiple actions before drawing.
3. Every base action; blind pair, successful/failed triple and empty target hand.
4. Nope -> Yup -> Nope, self-action attempt, off-turn response, late response, expiry and simultaneous responses.
5. Attack chains, partially consumed debt, Reverse during debt, Targeted jump, Personal Attack and Super Skip.
6. Defuse reinsertion at top/middle/bottom, missing rescue, elimination, final survivor and spectator/result screen.
7. First/second Imploding draw, visible top warning, Shuffle, Bury and bottom draw involving Imploding.
8. Streaking retention, stolen Kitten, lost protection, multiple hazards, Mark clearance, Garbage and Potluck.
9. Every theft route through Tower, reserve exhaustion, empty hand, and I'll Take That hazard interception.
10. Barking unmatched/matched/both-held/rescued/lethal; NOW during another turn; privately shared future.
11. Tutorial progression, timeout automation, disconnect/reconnect, rematch and reward/ranking flow.
12. Repeat representative actions across every theme/outfit/back/emoji and check movement/effect differences.

## Evidence still required before exact parity

No reviewed authoritative source supplies current per-player recipe inventories, randomization seeds, AI strategy, present timeout values, Nope millisecond boundaries, drag thresholds, secret-insertion geometry, tutorial scripts or detailed reward formulas. The physical 56/20/15/20-card box inventories do not establish digital recipe quantities. Public descriptions and isolated images cannot prove every branch of play.

The research therefore enables structured implementation and verification planning. It does **not** establish that an exact clone can already be implemented, or that all play will already match Steam. Obtain reproducible captures or directly inspect the selected Steam build for the unresolved fields, then update each matrix row with its evidence and confidence.
