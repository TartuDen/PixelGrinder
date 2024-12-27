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
   - Leveling up raises your base stats (Health, Mana), makes tougher zones more accessible, **and grants additional attribute points** you can spend on **INT**, **STR**, **DEX**, or **CON**.

2. **Flow of Progression**  
   - **Kill mobs → Gain XP → Level Up → Allocate Attribute Points → Move to next zone**  
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
   - Each time you level up, you gain additional points to invest in these attributes, shaping your character’s growth.

2. **Any Armor, Any Skill**  
   - Unlike traditional class-based systems, you can freely equip any armor or learn any skill.  
   - Armor types (robe, heavy, leather, etc.) have stat bonuses that synergize with different playstyles.

3. **No Holy Trinity**  
   - Everyone can learn healing spells (if they find the right Skill Stones), so each build can include sustain or support abilities if desired.

---

## Core Mechanics

1. **Level-Based Zones**  
   Venturing into zones appropriate for your level is recommended. Tougher zones carry higher risk but yield better rewards.

2. **Top-Down 2D Pixel Art**  
   Classic retro style with modern, responsive controls.

3. **Replayability**  
   Each zone features unique mobs and loot tables, encouraging repeat visits to farm rare items.

4. **Skill Learning & Improvement from Mobs**  
   - **Basic Weapon & Attack**: You begin with a basic version of each weapon type (staff, bow, dagger, one-handed sword), which provides a simple auto-attack skill. This lets you fight the first mobs in the starting zone and earn your first **Skill Stones**.  
   - **Skill Stones**: Rare drops from mobs that unlock entirely new abilities—ranging from melee combos to healing spells.  
   - **Skill Shards**: Another rare drop that upgrades already learned skills (e.g., increases damage, reduces cooldown, adds area-of-effect, etc.).

5. **Tab-Target Combat**  
   - You must target a mob with your cursor before using skills.  
   - Each skill has its own attributes, including:
     1. **Range**: Close-range (melee) or long-range (spells, bows).  
     2. **Type of Attack**:  
        - **Magic** (staffs, spells)  
        - **Piercing** (daggers, bows)  
        - **Slashing** (one-handed & two-handed swords)  
   - Different attack types may have advantages against certain mobs or synergize with specific buffs.

---

## Equipment & Loot

1. **Weapon Types**  
   - **Staff**: Magic-based attacks for spells or healing.  
   - **Daggers**: Dual-wielding for quick, **piercing** strikes (DEX-oriented).  
   - **One-Handed Sword**: Balanced **slashing** option for STR builds.  
   - **Two-Handed Sword**: High DPS **slashing** potential, best with high STR.  
   - **Bow**: Ranged **piercing** damage, scales well with DEX or hybrid builds.  
   - *(A shield can be paired with a one-handed weapon for extra defense, though not a separate damage type.)*

2. **Armor & Stat Bonuses**  
   - Different armor sets (robe, heavy, leather, etc.) have distinct stat bonuses (e.g., INT-boosting robes, STR-boosting plate).  
   - You can mix armor pieces for a hybrid approach (e.g., wearing heavy gauntlets with a robe chest piece).

3. **Armor Passive Buffs**  
   - Each armor type may also provide **passive buffs** that support certain playstyles.  
   - Some buffs cannot be active together (e.g., Holy cannot coexist with Unholy, Poison conflicts with Bleeding).  
   - **Initial Buff Types** (either for active skills or passives):
     - **Holy** (cannot stack with Unholy)  
     - **Unholy** (cannot stack with Holy)  
     - **Elemental**  
     - **Physical**  
     - **Poison** (cannot stack with Bleeding)  
     - **Bleeding** (cannot stack with Poison)

   Examples:  
   - A robe might offer an **Elemental** buff, increasing elemental skill damage.  
   - Heavy armor might grant a **Holy** buff, boosting healing spells.  
   - Leather armor might provide a **Poison** or **Bleeding** buff, adding a DOT effect to piercing attacks.

4. **Rare Drops**  
   - Equipment and weapons can drop from mobs, but the drop rate is intentionally low.  
   - Encourages repeated mob fights or boss runs to acquire desired gear.

---

## Key Features

- **Browser-Based, Single Player**: Play directly in your web browser without installation.  
- **Flexible Builds**: Create a staff-wielding warrior or a dagger-throwing mage—your imagination is the limit.  
- **Boss Fights**: Each zone may feature stronger mobs or bosses that reward special loot or skill items.  
- **Exploration**: Hidden paths and secrets scattered across each zone.

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
  - **Phaser** (a popular JS framework for 2D games)  
  - **PIXI.js** (for rendering)  
  - **HTML5 Canvas** with plain JavaScript or TypeScript  
- **Backend**:  
  - A simple **SQLite3** database to store player data (e.g., character stats, inventory, progression).  
  - Optionally use **Node.js** with Express (or similar) if you need server-side logic for saving states or running events.

**Suggested Approach**  
- **Phaser + TypeScript**: Common, well-documented for browser games, easy to scale.  
- Or **pure HTML5 Canvas + JavaScript** if you want more control (but you’ll handle many systems manually).

---

## How to Play

1. **Controls**  
   - **Movement**: (WASD or Arrow Keys)  
   - **Attack/Skill**: (Left Mouse, Spacebar, or hotkeys)  
   - **Inventory**: (I key)

2. **Early-Game Tips**  
   - Distribute your 5 attribute points wisely—decide if you want to focus on INT, STR, DEX, or CON.  
   - Target mobs within or slightly above your level for optimal XP gain.  
   - Rely on your starting weapons’ basic attacks to farm early mobs. Save up Skill Stones for abilities you truly want.

3. **Progression**  
   - Invest Skill Stones to unlock new abilities; invest Skill Shards to upgrade them.  
   - Experiment with different armor sets and passive buffs to find powerful synergies.

---

## Roadmap

| Milestone | Description                                               | Status       |
|-----------|-----------------------------------------------------------|--------------|
| Alpha 1   | Basic movement & combat in a browser-based environment    | Complete     |
| Alpha 2   | Implementation of basic skill system, UI improvements     | In Progress  |
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
