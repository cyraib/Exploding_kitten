# Repository map

Reviewed 2026-10-04 (Asia/Bangkok). Start with [root memory](../memory.md); read the [review and limitations](repository-review.md) before restoration work. The asset structure below records the initial review. A playable app has since been added: see [Original Edition notes](original-edition.md) and [the app README](../README.md) for `app/`, `index.html`, tests, server, and launch shortcut.

## Structure and responsibilities

```text
Exploding_kitten/
  AGENTS.md                   New-chat, logging, and asset-preservation rules
  memory.md                   Concise current status plus task history
  Requirement/
    update_memories.txt        Current repository-memory requirement
  Assets/
    README.md                 Existing overview with some missing references
    cards/
      README.md               45-family catalog
      <family>/               PNG icon(s)
        artworks/             Shared JPG artwork variants
    decks/
      <edition-or-expansion>/  11 folders, each with the standard eight files
      exploding-kittens-recipes-for-disaster/
        field-guide.pdf       Supplementary two-page card reference
        recipes/
          README.md           Online recipe index
          recipes.json        15 recipes and 51 player-count variants
          <recipe-id>.md      15 ingredient/setup tables and conflict notes
  .codex/
    memory.md                 Navigation to the root log only
    repository-map.md         Detailed context and source references
    repository-review.md      Verification results and unresolved gaps
    audit_repository.py      Reusable local audit; never changes source assets
    repository-audit-before.json  Initial inventory/hash baseline
    repository-audit.json    Latest local inspection report
```

No application code, HTML gameplay page, npm package, dependency lockfile, or Git metadata exists in this snapshot. The Python auditor was added for this task; `.codex/` had no files before it. Do not assume historical downloader/organizer scripts are available.

## Per-deck files

| File | Responsibility |
|---|---|
| `deck.json` | Structured box contents, source URLs, components, card rules, and mapping limitations |
| `cards.csv` | Flat copy of card inventory fields; suitable for consistency checks/import |
| `README.md` | Human-readable totals, card table, local asset references, and sources |
| `instructions.md` | Paraphrased setup, turn timing, edition exceptions, card effects, source coverage |
| `asset-map.md` | Shared icon/artwork links for each named type |
| `rules.pdf` | Original edition rulebook; all 11 have two pages |
| `photo.webp`, `logo.webp` | Original box photo and logo |

Recipes for Disaster's additional `field-guide.pdf` also has two pages. Each deck's documentation says original PDFs are authoritative; historical claims of complete source coverage in those documents are not a substitute for checking the PDF for a future rules change.

## Inventory schema

Deck-level fields include `id`, `name`, `kind`, `players`, `total_cards`, `draw_deck_inventory_cards`, `card_families`, `distinct_named_card_types`, `components`, `rules_pdf`, `rules_source_url`, `inventory_source_url`, `inventory_definition`, `cards`, and `limitations`. Recipes for Disaster also names `supplementary_field_guide`.

`players` is descriptive text, not a normalized numeric array. `kind` is `Standalone` or `Expansion`. `total_cards` includes special cards; `draw_deck_inventory_cards` is the inventory in zone `deck`, before setup/dealing. It is not the post-setup draw-pile count.

Each card contains:

| Fields | Meaning |
|---|---|
| `id`, `name`, `family` | Stable named identity and effect family; named cats share `cat-card` |
| `count`, `with_paw`, `without_paw` | Copy quantity and paw split; split must sum to `count` |
| `zone` | `deck`, or `playmat` for Godcat/Devilcat |
| `icon`, `asset_folder`, `artwork_files` | Project-root-relative asset paths, not relative to `deck.json` |
| `artwork_mapping` | Explicit mapping caveat; family candidates generally lack verified edition print assignments |
| `count_source` | Existing PDF/page or other inventory attribution |
| `rule` | Paraphrased effect and timing restrictions |

CSV columns are `id,name,family,count,with_paw,without_paw,zone,icon,asset_folder,count_source`; all 11 CSVs currently match their JSON rows and order. Do not infer card quantities from the number of artwork files. Several original filenames contain spelling errors; preserve them.

## Recipe schema and source conflicts

`recipes.json` is an array. Each recipe has `id`, `name`, `source_url`, `play_time_minutes`, `variants`, and `issues`. A variant contains `players`, `starting_regular_cards`, `starting_defuses`, `cards`, and `total_cards`. Ingredient rows have `id`, `name`, `count`, and `source_label`, preserving the original label alongside normalized names.

The local recipe index describes these as supplementary online setups retrieved 2026-10-04, not verified scans of the 13 printed booklets. Their recorded URLs have not been refreshed in this task. The 15 Markdown recipe tables and structured data remain unchanged.

| Recipe / player count | Existing unresolved issue |
|---|---|
| [Attack of the Attacks](../Assets/decks/exploding-kittens-recipes-for-disaster/recipes/attack-of-the-attacks.md), 3 | Requests 4 Super Skips; box has 2 |
| Attack of the Attacks, 5 | Requests 6 Targeted Attacks; box has 4 |
| [Sticky Fingers](../Assets/decks/exploding-kittens-recipes-for-disaster/recipes/sticky-fingers.md), 5 | Main PDF illustration uses 5 regular starting cards; online data uses 7 |

These are source conflicts, not permission to silently substitute ingredients or starting hands. Use the relevant printed booklet or verified source to resolve a future request.

## Edition differences to retain

- **Original / Cat Burglar:** Low-player leftover-Defuse exception; Cat Burglar adds a foam accessory, not a card. Its request/pass/save/death behavior is documented separately.
- **NSFW:** October 2023 sheet returns at most two extra Defuses, unlike the older Original four-player setup. Named cats differ; retain the normalized Schrodinger name and original stable paths.
- **Party Pack:** Use marked non-Kitten subset for 2-3 players, unmarked for 4-7, both for 8-10. Totals excluding Exploding Kittens are 44 / 67 / 111. Preserve the per-card split rather than hard-coding a guessed subset.
- **Good vs. Evil:** 55 physical cards, 53 ordinary cards, and two playmat specials. Armageddon, Godcat, and Devilcat have special zones/lifecycles. There is no Skip in this edition.
- **Zombie Kittens:** Zombie Kitten replaces Defuse; marked/unmarked non-Kitten subsets are 24 / 33. Death retains the hidden hand; dead-player timing, NOW permissions, and mandatory revival have dedicated exceptions. The combined 2-9-player setup remains incomplete locally.
- **2-Player:** 32 cards, one Exploding Kitten, three Defuses, and three named cat identities; do not import the Original five-cat inventory.
- **Imploding:** Expansion setup differs from simply appending cards. Face-down draw flips/reinserts the hazard; face-up draw eliminates. Streaking cannot protect against it. Its two-player variant has a specific extra hazard.
- **Streaking:** Extra-hazard setup; keeping one held Exploding Kitten safe depends on retaining Streaking. Transfers, blind hands, and loss of protection have explicit procedures.
- **Barking:** Supplied PDF uses Defuse-or-explode; some older art uses hand exchange. Tower of Power reserves a six-card stash and redirects theft. NOW, Bury/Imploding, blind effects, and I'll Take That have documented interactions.
- **Recipes for Disaster:** 121 cards are an ingredient library; choose a recipe, not the full box as a default deck. Use its supplemental Field Guide for effects, while retaining main-PDF and booklet distinctions.

Attack stacking, rescue/draw turn endings, death presentation, and Defuse setup must be taken from the selected edition. Do not impose a universal five-different-card combo on sheets that only establish pairs/triples.

## Surviving source URLs

The inventory page pattern is `https://explodi.ng/decks/<deck-id>`; all 11 exact URLs survive in their `deck.json`. The shared family page is a reference category, not verified per-image download provenance. Recipe entries retain exact URLs beginning `https://www.explodingkittens.com/pages/recipes?name=`.

| Local deck ID | Recorded rulebook URL |
|---|---|
| exploding-kittens-original-edition | https://dumekj556jp75.cloudfront.net/exploding-kittens/English.pdf |
| exploding-kittens-nsfw-edition | https://cdn.shopify.com/s/files/1/0345/9180/1483/files/EKG-NSFW_Instructions_20OCT23.pdf |
| exploding-kittens-cat-burglar-edition | https://ek-instructions.s3.amazonaws.com/cat-burglar/EKCB_instructions_17SEP21_r11.pdf |
| exploding-kittens-party-pack-edition | https://dumekj556jp75.cloudfront.net/ek-party-pack/EK_Party_Pack-Rules_wAttack.pdf |
| exploding-kittens-recipes-for-disaster | https://dumekj556jp75.cloudfront.net/recipes-for-disaster/RFD_instructions.pdf |
| exploding-kittens-good-vs-evil | https://cdn.shopify.com/s/files/1/0345/9180/1483/files/EK-GVE-6_Instructions_09NOV2022_R2.pdf |
| exploding-kittens-zombie-kittens | https://ek-instructions.s3.amazonaws.com/ek-zombie-kittens/zombie-kittens-rules.pdf |
| exploding-kittens-2-player-edition | https://dumekj556jp75.cloudfront.net/ek-2player/ek2p-English.pdf |
| imploding-kittens-expansion | https://dumekj556jp75.cloudfront.net/imploding-kittens/imploding-english.pdf |
| streaking-kittens-expansion | https://ek-instructions.s3.amazonaws.com/streaking-kittens/streaking-kittens-rules.pdf |
| barking-kittens-expansion | https://dumekj556jp75.cloudfront.net/barking-kittens/barking-kittens-rules.pdf |

These URLs are copied from local records, not verified as currently reachable. The complete surviving text-reference index is `source_urls_in_local_text` in the [audit report](repository-audit.json). The absent original manifest prevents confirming individual image download URLs or historical source hashes. The supplementary Field Guide's precise download URL is not recorded in the surviving local deck fields; do not guess it.

## Repeatable review

```powershell
python .codex/audit_repository.py --report .codex/repository-audit.json --baseline .codex/repository-audit-before.json
```

The script resolves the project root from its own location, reads all relevant text, parses JSON/CSV, checks card paths and standard deck files, decodes images, opens/extracts PDF text, hashes all inventoried files, and reports local Markdown links. It also checks recipe totals and derives ingredient overages from the box inventory. Generated `repository-audit*.json`, `.git`, and Python cache files are excluded from inventory. Binary decode and link existence checks do not establish correct artwork mappings or rule interpretations.

The exit status fails on file-inspection errors, inconsistent deck/recipe totals, or changed/missing pre-existing Assets files when compared to the baseline. Missing Markdown targets and documented ingredient overages remain report findings rather than causing failure. Baseline comparison covers all pre-existing Assets files, including documentation, not AGENTS or new memory notes.
