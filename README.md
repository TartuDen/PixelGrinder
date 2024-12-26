# PixelGrinder

**PixelGrinder** is a single-player, browser-based top-down pixel art RPG that emphasizes level-based progression and flexible character builds. Journey through distinct zones, battle challenging mobs, and grow your character’s power step by step—all within your web browser.

---

## Table of Contents

1. [Game Concept](#game-concept)  
2. [The World](#the-world)  
3. [Player Progression](#player-progression)  
4. [Character Customization & Stats](#character-customization--stats)  
5. [Core Mechanics](#core-mechanics)  
6. [Equipment & Loot](#equipment--loot)  
7. [Key Features](#key-features)  
8. [Planned Features](#planned-features)  
9. [Tech Stack & Implementation](#tech-stack--implementation)  
10. [How to Play](#how-to-play)  
11. [Roadmap](#roadmap)  
12. [Contributing](#contributing)  
13. [License](#license)  
14. [Missing or Suggested Information](#missing-or-suggested-information)

---

## Game Concept

**PixelGrinder** combines classic RPG elements—like leveling up and stat allocation—with a modern twist on flexibility and skill-based growth. Rather than locking you into a class, you can freely mix and match skills, weapons, and armor to create your ideal playstyle.

---

## The World

1. **Level-Based Zones**  
   - The world is divided into zones (e.g., Starting Location, Forest of Trials, Desert of Desolation), each with a recommended level range.  
   - Zones are designed for sequential progression, but you can revisit previous ones for additional loot or Skill Stones.

2. **Starting Zone**  
   - You begin in a level 1–5 zone designed to teach you the game’s basics.

3. **Mob Scaling**  
   - Enemies generally match the recommended zone level (±5).  
   - Different zones feature unique monsters with distinct loot tables.

---

## Player Progression

1. **Experience & Leveling**  
   - Defeat mobs close to your level to earn experience.  
   - Leveling up raises your base stats (Health, Mana) and makes tougher zones more accessible.

2. **Flow of Progression**  
   - **Kill mobs → Gain XP → Level Up → Move to next zone**  
   - Most initial progression and gear acquisition comes from mob grinding.  
   - Equipment drops are intentionally rare, encouraging players to explore and defeat more mobs.

3. **Future Progression**  
   - Gathering and crafting systems are planned for later updates, providing alternative progression paths.

---

## Character Customization & Stats

1. **Attributes**  
   - At character creation, you receive **5 attribute points** to distribute among:
     - **INT** (increases magical prowess, damage, or healing effectiveness)  
     - **STR** (boosts physical attacks, overall strength)  
     - **DEX** (improves accuracy, agility, possibly crit rate)  
     - **CON** (raises health pool and survivability)  

2. **Any Armor, Any Skill**  
   - Unlike traditional class-based systems, you can freely equip any armor or learn any skill.  
   - Armor types (robes, heavy armor, leather, etc.) have stat bonuses that synergize with different playstyles.  

3. **No Holy Trinity**  
   - Everyone can learn healing spells (if they find the right Skill Stones), so each build can include sustain or support abilities if desired.

---

## Core Mechanics

1. **Level-Based Zones**  
   Venture into zones appropriate for your level. Tougher zones carry higher risk but better rewards.

2. **Top-Down 2D Pixel Art**  
   Classic retro style with modern, responsive controls.

3. **Replayability**  
   Each zone features unique mobs and loot tables, encouraging repeat visits to farm rare items.

4. **Skill Learning & Improvement from Mobs**  
   - **Basic Skill**: You start with one basic skill (e.g., a simple melee strike or minor spell).  
   - **Skill Stones**: Rare drops from mobs that unlock entirely new abilities—ranging from melee combos to healing spells.  
   - **Skill Shards**: Another type of rare drop that upgrades already learned skills (e.g., increases damage, reduces cooldown, adds area-of-effect, etc.).  

---

## Equipment & Loot

1. **Weapon Types**  
   - **Staff**: Good for focusing on magic damage or healing.  
   - **Two Knives**: Dual-wielding for quick strikes, ideal for DEX builds.  
   - **One-Handed Sword**: Balanced option for STR builds.  
   - **Shield**: Added defense; pair with one-handed weapon for a tanky setup.  
   - **Two-Handed Sword**: Heavy DPS potential, best for high STR.  
   - **Bow**: Ranged physical damage, scaling well with DEX or hybrid builds.

2. **Armor & Stat Bonuses**  
   - Different armor sets (robe, heavy, etc.) have distinct stat bonuses (e.g., INT-boosting robes, STR-boosting plate, etc.).  
   - You can mix armor pieces for a hybrid approach (e.g., wearing heavy gauntlets with a robe chest piece).

3. **Rare Drops**  
   - Equipment and weapons can drop from mobs, but the drop rate is intentionally low.  
   - Encourages repeated mob fights or boss runs to acquire desired gear.

---

## Key Features

- **Browser-Based, Single Player**: Play directly in your web browser. No installation required.  
- **Flexible Builds**: Create a staff-wielding warrior or a dagger-throwing mage if you want.  
- **Boss Fights**: Each zone may feature stronger mobs or bosses that reward special loot or skill items.  
- **Exploration**: Hidden paths and secrets scattered across zones.

---

## Planned Features

1. **Crafting System**  
   - Future updates will introduce gathering and crafting, offering alternative ways to obtain gear beyond rare drops.
2. **Questing & Storyline**  
   - NPCs and quest lines for structured play and narrative depth.
3. **Further Zones & Bosses**  
   - Continuous expansion of the game world with new areas and tougher encounters.

---

## Tech Stack & Implementation

- **Frontend**: Since this is a browser-based 2D game, you could use:
  - **Phaser** (a popular JS framework for 2D games),  
  - **PIXI.js** (for rendering), or  
  - **HTML5 Canvas** with plain JavaScript or TypeScript.  
- **Backend**:  
  - A simple **SQLite3** database can store player data (e.g., character stats, inventory, progression).  
  - You could use **Node.js** with Express (or a similar framework) if you need a server-side component for saving game states or handling updates.  

**Suggested Approach**  
- **Phaser + TypeScript** is a common and well-documented combo for browser games, offering a balance of simplicity and scalability.  
- If you want to keep it extremely minimal, **pure HTML5 Canvas + JavaScript** is also viable, but may require more manual setup for physics, input handling, etc.

---

## How to Play

1. **Controls**  
   - **Movement**: (WASD or Arrow Keys) to navigate.  
   - **Attack/Skill**: (Left Mouse, Spacebar, or custom hotkeys).  
   - **Inventory**: (I key).

2. **Early-Game Tips**  
   - Distribute your 5 attribute points wisely—decide if you want to focus on INT, STR, DEX, or CON.  
   - Target mobs within or slightly above your level for optimal XP gain.  
   - Rare drops (gear, Skill Stones, Skill Shards) can take time, so expect a grind.

3. **Progression**  
   - Invest Skill Stones to unlock new abilities, and Skill Shards to upgrade them.  
   - Experiment with different armor and weapons for unique stat combinations.

---

## Roadmap

| Milestone | Description                                               | Status       |
|-----------|-----------------------------------------------------------|--------------|
| Alpha 1   | Basic movement & combat in a browser-based environment    | In Progress  |
| Alpha 2   | Implementation of basic skill system, UI improvements     | Pending      |
| Beta 1    | Multiple zones & mobs, introduction of Skill Stones       | Pending      |
| Beta 2    | Crafting, gathering, advanced mob/boss mechanics          | Pending      |
| Release   | Feature-complete version                                  | TBD          |

---

## Contributing

We welcome contributions! Whether it’s bug fixes, new features, or general feedback:

1. **Fork** this repository.  
2. Create your feature branch (`git checkout -b feature/my-new-feature`).  
3. Commit your changes (`git commit -m 'Add some feature'`).  
4. **Push** to the branch (`git push origin feature/my-new-feature`).  
5. Create a new Pull Request.

> **Potential To-Do**:  
> - Provide coding style guidelines or a Code of Conduct for contributors.

---

## License

> **TBD**  
> If you choose an open-source license (e.g., MIT, GPL), specify it here. Otherwise, detail usage restrictions for your code and assets.

---

## Missing or Suggested Information

- **Story/Lore**: Consider a backstory to enhance immersion.  
- **Additional Details on Stats**: Clarify exact formulas or synergy (e.g., how INT affects spells or healing).  
- **Asset Credits**: For music, sound effects, pixel art, etc.  
- **Testing & QA**: Provide guidelines for reporting bugs or testing new features.  
- **Platform Compatibility**: While primarily browser-based, note if mobile/tablet support is planned.
