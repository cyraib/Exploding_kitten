# Exploding Kittens · Original Edition

A playable local game for one human against **1–4 bots**, using the supplied Original Edition inventory and existing card assets.

Double-click **[Play Original Edition.lnk](Play%20Original%20Edition.lnk)** in this folder. It starts a local server and opens the game in your default browser. Node.js 22 or newer must be installed; no package installation is required.

The running game is at **http://127.0.0.1:4177**. For a terminal launch:

```powershell
npm start
```

## Playing

- Follow **Select Deck → Select Mode → Start Game**, then set your name, choose 1–4 opponents, and pick Casual or Clever bots. Every player starts with one Defuse plus seven other cards.
- Select a card, then choose the nearby **PLAY** control or the main **Play** button, or **double-click a single card** to play it. Select two or three cards with the same title for a combo. Select a different title to replace the selection; click a selected card again to deselect it.
- Drag cards to arrange your hand, use **Alt + Left / Right** on a focused card, or select a card and use the small left/right arrangement buttons. **Group matching** groups exact titles. Arrangement survives refresh; drawn and received cards join matching cards in the displayed hand.
- Choose **Draw & end turn** or click the draw pile. Drawing happens at the end of a turn.
- Actions wait through a **three-second Nope window** after their animation. Use a red circular button beside a held Nope card or the large countdown-panel button. You cannot Nope your own action or your own Nope; you can counter an opponent's Nope to restore your action. Each Nope starts a fresh three-second window; letting the timer expire passes your response. Draws, Kittens, and Defuses cannot be Noped. Fast/Calm motion keeps the full response time.
- Target arrows let you choose a living opponent for Favor and combos. Attack plays immediately against the next living player clockwise.
- When a bot asks you for a Favor, click a card **in your hand**, then confirm **Give card**, or choose another. A matching pair lets you pick one of the opponent's mixed, face-down cards after responses finish; a matching triple requests a specific title.
- New games animate the eight-card deal. Hand, discard, future views, and flights use the supplied full card artwork from the asset map.
- When you draw a Kitten, click a glowing **Defuse in your hand**, watch the Defused effect, then choose its secret reinsertion position. Defuse finishes only one attacked turn.
- Persistent turn status identifies the active player. Bots show **THINKING…** for 500–1200 ms between activities. Favor and theft show a static actor-to-recipient arrow. Compact status prioritizes remaining Attack turns.
- The last living player wins. If you explode earlier, you can watch the remaining bots finish.

**D** draws, **Enter** plays the selection, and **Esc** clears it while the table is active. Settings offers Normal, Fast, and Calm motion, sound, and a new table. The game also respects system reduced-motion preferences. Rules, card close-ups, and the public **GAME LOG** (latest actions first) are available during play.

Games save automatically in this browser. After reopening or refreshing, choose **Continue saved game**. Menus and Pause suspend bot decisions. Switching tabs keeps the game running; hidden-page animations finish or skip travel, with worker-assisted deadlines and catch-up on return. Browser/OS sleep or freezing can still delay execution. The interface scales with available width and height; on narrow screens, scroll the hand horizontally to reach every card.

## Implementation and checks

The engine is separate from the UI, and bots receive their own hand, remembered peeks, and public opponent counts. The 56-card inventory, low-player Defuse setup, attacks, rescue, elimination, and pair/triple combinations follow the [existing Original Edition instructions](Assets/decks/exploding-kittens-original-edition/instructions.md). Original downloaded files are preserved. Shared artwork illustrates card types; exact edition print assignments remain unverified.

```powershell
npm test
npm run check
```

Feature details, validation, and maintenance notes: [.codex/original-edition.md](.codex/original-edition.md). Current project status and task history: [memory.md](memory.md).

Latest interaction update: [.codex/original-edition-update2.md](.codex/original-edition-update2.md).

Latest fixes: [October 7 requirement and validation](.codex/bug-fix-7.10.md), completed October 9. Presentation keeps the warm wooden table and Bean-like avatars with short card transfers, Shuffle packet mixing, face-down Kitten insertion and compact event feedback. Decorative paws, large turn announcements, screen shake, idle pulses and card-art overlays are removed. The [earlier Steam-style reconstruction](.codex/steam-animation-implementation.md) supplies the reference context; official assets and exact timings remain unavailable. Rules and the three-second response window remain unchanged.

This version supports local bot play. Human multiplayer and online networking are future work.

## Developer dashboard

Click **EDITOR** in the toolbar or open **http://127.0.0.1:4177/app/editor/index.html**. Kitten Studio provides live interface editing, all 28 animation/transition entries, 22 feature maps with actual code links, card/deck/entity management, an asset browser, global search, visual inspection and a separate debug sandbox. Drafts preview live; **Save project** writes `app/config/project.json` with a backup. Export/import and undo/reset are available.

Custom decks can reuse implemented Original Edition effects. New expansion mechanics still require engine code. Normal games retain private information and three-second Nope windows; debug scenarios freeze automatic timers and use separate browser saves. Read the [dashboard guide and boundaries](.codex/uiux-editor.md). Validation: `npm test`, `npm run check`, and `python .codex/verify_uiux_editor.py`.

Final playtest, fixes, complete-match evidence and regression coverage: [.codex/original-edition-playtest.md](.codex/original-edition-playtest.md).
