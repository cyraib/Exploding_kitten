# Original Edition interaction update 1

Implemented 2026-10-04 (Asia/Bangkok) from [update1.txt](../Requirement/Original_Edition/update1.txt). The user clarified that Attack must retain its next-living-player clockwise target, with its arrow shown.

## Changes

- Complete supplied card artwork from the [Original asset map](../Assets/decks/exploding-kittens-original-edition/asset-map.md) now appears on hand cards, discard cards, future peeks, and face-up flights. Existing catalog artwork paths already matched that map. Original asset files and source references are untouched; these are illustrative family images, not verified print assignments.
- Favor gifts are selected directly from the human hand. The prompt names the recipient and highlights selectable cards; it stays available until the human chooses.
- Favor, pair, and triple target selection uses arrows and buttons beneath living opponent seats. Triples retain their requested-card selector. Attack shows all living opponents but enables only the next clockwise seat; the engine rejects any supplied non-clockwise target.
- An uncancelled human pair mixes the opponent's hand and opens a grid of indistinguishable backs. `STEAL` validates the chosen index and transfers exactly one physical card. Empty targets safely skip the choice. Cancelled pairs never open it. Bots retain random theft, and their view receives only public theft participants/counts.
- A visible three-second action window offers Nope whenever the human is alive and has one, regardless of whose clockwise response slot is current. Expiration passes the human and processes bot responses clockwise; a bot Nope stops that batch. Any Nope/counter-Nope resets a full three-second window after animation. Fast/Calm/reduced motion changes animation duration, not response duration. The human can also counter their own Nope when they hold another, as allowed by the rules.
- Bot activities are spaced at least three seconds after the previous completed activity. Drawing, Kitten rescue, and insertion remain non-Nopable. Human turn choices, Favor gifts, blind-card choices, future viewing, and secret insertion remain deliberate choices rather than expiring automatically.
- Each new game animates eight rounds of dealing to all seats, with bot cards face down. Human cards reveal as their individual flights land. The engine owns the complete deal before animation; controls stay locked until completion.
- Incoming cards and played discard cards are suppressed in their destination render until their flight lands. A played card leaves the hand immediately and has only one visible representation during flight, resolving the duplicate-card bug. This also covers Nope, Defuse, transfers, and multi-card combos.
- Restart cancels effects and response timers. Pause, menus, and hidden tabs stop scheduling; resuming a pending action starts a fresh three-second window. Existing version-1 saves remain supported, and new blind-theft saves restore the choice phase.

## Validation

Only three focused engine tests were added, per the requested limited testing: blind-slot selection/conservation and invalid-slot atomicity; a human Nope during another seat's response; and clockwise Attack target validation. Existing Favor, combo, and Nope tests were reused. See [the validation record](original-edition-update1-validation.json) for commands and browser observations.

The full 100-game regression suite was not rerun for this update. Extensive manual play, unusual reaction chains, and device combinations remain for user testing. Shared scans retain their original printed labels, including artwork from related printings; choosing one mapped family image does not establish exact Original Edition print provenance.
