# PixelGrinder Goals And Progress

## Vision
- Single-player, browser-based RPG with grinding-based progression.
- Deployed to itch.io (HTML5 build).
- Local saves now, optional cloud saves later.

## V1 Feature Goals
- Starting zone (level 1-7) with combat progression and loot drops.
- Boss encounters in the zone.
- Town area with fixed NPC vendor(s) that sell/buy gear and consumables.
- No story or crafting for v1.

## Progress Log
- Added Vite build setup and moved assets to `pixelgrinder-frontend/public`.
- Implemented local save system with autosave and load-on-start.
- Added NPC vendor system and shop UI (buy/sell + gold display).
- Converted content data into separate modules (`data/content/*`).
- Improved mob cooldown cleanup and menu duplication handling.

## Current Focus
- Wire data-driven zones and NPCs to map content.
- Build town area in the starting zone.
- Implement basic boss encounter for the starting zone.

## Next Steps
- Add consumables (HP/MP potions) and vendor stock.
- Add zone transitions and zone-specific mob tables.
- Balance combat progression and loot rates.
- Add "New Game" / clear save option.
- Prepare itch.io build and release checklist.
