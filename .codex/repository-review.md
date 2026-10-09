# Repository review and unresolved gaps

Reviewed 2026-10-04 (Asia/Bangkok), for [the memory-update requirement](../Requirement/update_memories.txt). See [root memory](../memory.md) for the concise snapshot and task log, and [repository map](repository-map.md) for schemas and edition-specific notes.

## Evidence and scope

The initial folder contained 353 files / 104,271,447 bytes. `Assets/` contained 351 files: 265 images, 12 PDFs, 51 Markdown files, 12 JSON files, and 11 CSV files. The other two files were `AGENTS.md` and the requirement. `.codex/` existed but was empty. There was no root log or `.git` directory.

The [initial audit](repository-audit-before.json) captured existing-file hashes before changing AGENTS or adding memory documents. It already includes the newly added audit script, so its top-level file count is 354. Reports omit their own `repository-audit*.json` outputs from inventory to avoid self-reference.

| Check | Result |
|---|---|
| Complete file enumeration / SHA-256 inventory | Recorded for the whole snapshot |
| UTF-8 text reading | All existing Markdown, JSON, CSV, requirement text, plus the new auditor read; later memory documents included in final audit |
| Deck JSON/CSV inventory consistency | 11 / 11 pass; totals, zones, family/type counts, paw splits, CSV fields, and asset paths agree |
| Standard edition folder files | All eight expected files exist in every deck folder |
| Recipe data | 15 recipes / 51 variants parse; variant ingredient totals agree |
| Recipe ingredient supply | Two existing overages independently reproduced against box inventory |
| Existing images | All 265 decode: 181 JPG, 62 PNG, 22 WebP |
| Existing PDFs | All 12 open; 24 pages in total |
| Image-based rulebooks | Both pages of Barking and Imploding rendered and visually inspected for structure and major setup/effect distinctions |
| Asset preservation | All 351 pre-existing Assets file hashes unchanged |
| New memory-document links | All resolve |
| Existing Markdown links | Initially 18 broken occurrences; creating root memory resolves AGENTS' link, leaving 17 across five missing target paths |

The [final audit](repository-audit.json) holds exact current counters, image dimensions, PDF page/text metadata, source references, hashes, and each broken-link occurrence. Its image/PDF counters include any additional files added later, so consult paths before comparing future runs. The automated low-text PDF flag catches Imploding pages 1-2 and Barking page 2; Barking page 1 was also visually inspected because its main content is image-based.

This review establishes the local structure and internal consistency. It does not independently confirm every paraphrased rule against every diagram, visually inspect all artwork, assign images to printed copies, or fetch current online sources. No PDF or downloaded image was edited. Temporary rulebook preview was removed after review.

## Missing or unavailable items

| Absent path | Evidence / implication |
|---|---|
| `Assets/decks/README.md` | Thirteen existing links point here: 11 deck READMEs plus Assets and cards overviews |
| `Assets/components/README.md` | Linked from Assets overview; directory is absent |
| `Assets/components/tower-of-power.png` | Linked by Barking README; separate accessory illustration is unavailable |
| `Assets/manifest.json` | Linked from Assets overview; original per-file URL/size/hash provenance cannot be checked |
| `.codex/asset-path-migration.json` | Linked from Assets overview; historical source-path migration cannot be reproduced |
| `Assets/decks/SOURCE_NOTES.md` | Described by previous session notes but absent in this snapshot |
| `Assets/site-ui/` | Named in Assets overview but absent; no UI assets currently available there |
| `Requirement/1.Original.txt` | Mentioned by IDE context, not present on disk; original requirements cannot be assumed |
| Historical downloader, organizer, verifier, logs | `.codex/` was empty; their past implementation/report claims are not live validation |

The absent root `memory.md` and `.codex/memory.md` were created during this task. Existing asset documentation was retained unchanged; broken legacy links are openly recorded rather than replaced with misleading placeholder files. Restore missing material in a separately scoped task from verified sources or backups.

## Provenance precautions

Previous session memory described a larger 283-binary-asset library and an original download manifest. Current inspection finds 277 binary assets (265 images plus 12 PDFs). Treat prior counts as historical context only. Without the old manifest, the identities/source hashes of every absent asset cannot be established.

The new audit's SHA-256 values are a **current preservation baseline**, not historical download checksums. Rulebook URLs, inventory-page URLs, and recipe URLs are retained from surviving local records in the [map](repository-map.md) and the audit's source index. Do not label inferred site paths as verified individual-image download URLs. Any future download should record its exact URL, fetch date, output path, and checksum while preserving files already present.

## Outstanding data decisions

- Exact per-edition artwork-to-copy assignments remain unverified. Shared image counts cannot determine quantities.
- Attack of the Attacks' 3-player Super Skip and 5-player Targeted Attack ingredient counts exceed the Recipes for Disaster box inventory. The source conflicts remain in both structured recipe data and affected Markdown notes.
- Sticky Fingers' five-player starting-hand discrepancy remains; consult the printed booklet for the intended printing.
- The 15 online recipes are not an established replacement for the exact 13 printed box booklets, whose scans are unavailable.
- Zombie Apocalypse's combined 2-9-player setup/interactions are not fully specified by the local PDF. Preserve the official tutorial reference rather than invent a merged-deck recipe.
- Barking's older hand-exchange artwork and supplied explosion rulebook describe different printings. Preserve original art while choosing/documenting one rules version for future gameplay.
- Printable accessory templates and exact source-download provenance for individual images are incomplete.

## Completion record

The requested repository-memory task is complete: root catch-up log created, detailed findings and repeatable verification saved in `.codex/`, navigation-only `.codex/memory.md` created, and AGENTS explicitly directs every new project chat/task to read the log. No asset recovery or gameplay implementation was requested by this requirement.
