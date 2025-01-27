// scenes/MainScene.js

import UIManager from "../managers/UIManager.js";
import SkillManager from "../managers/SkillManager.js";
import MobManager from "../managers/MobManager.js";
import PlayerManager from "../managers/PlayerManager.js";
import InputManager from "../managers/InputManager.js";

import { calculatePlayerStats } from "../helpers/calculatePlayerStats.js";

import {
  naturalRegeneration,
  playerProfile,
  playerSkills,
  TAB_TARGET_RANGE,
  playerBaseStats,
  playerGrowthStats,
  playerEquippedItems,
  weaponItems,
  armorItems,
} from "../data/MOCKdata.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");

    this.currentTargetIndex = -1;
    this.targetedMob = null;

    // Managers
    this.uiManager = null;
    this.skillManager = null;
    this.mobManager = null;
    this.playerManager = null;
    this.inputManager = null;

    // Event emitter
    this.events = new Phaser.Events.EventEmitter();
  }

  preload() {
    // Load default assets (tilemap, etc.)
    this.loadAssets();
  }

  create() {
    // Initialize previous level tracker
    this.previousLevel = playerProfile.level;
    this.createTilemap();
    this.defineAnimations();

    // Initialize Player Manager before SkillManager
    this.playerManager = new PlayerManager(this);
    this.playerManager.createPlayer(this.map); // Pass the tilemap

    // Initialize SkillManager with a callback to get player stats
    this.skillManager = new SkillManager(this, () =>
      this.playerManager.getPlayerStats()
    );
    this.skillManager.preloadSkills();

    this.setupCamera();

    // Initialize UIManager
    this.uiManager = new UIManager(this);
    this.uiManager.init(() => {
      this.uiManager.hideStatsMenu();
      this.scene.resume();
    });

    // Initialize MobManager
    this.mobManager = new MobManager(this);
    this.mobManager.createMobs(this.map);

    // Setup UI
    this.uiManager.setupSkills(playerSkills);

    // Initialize Input Manager
    this.inputManager = new InputManager(
      this,
      this.playerManager,
      this.skillManager
    );
    this.inputManager.setupControls(playerSkills);

    // Emit initial stats to update the UI
    this.emitStatsUpdate();

    // Create skill animations
    this.skillManager.createSkillAnimations();

    // Natural regeneration
    this.time.addEvent({
      delay: naturalRegeneration.regenerationTime,
      callback: () => this.playerManager.regenerateStats(naturalRegeneration),
      callbackScope: this,
      loop: true,
    });

    // Calculate and log player level
    const { level, currentExp, nextLevelExp } = this.calculatePlayerLevel(
      playerProfile.totalExp
    );
    console.log(`Player Level: ${level}`);
    console.log(`EXP: ${currentExp} / ${nextLevelExp} to next level`);
  }

  update(time, delta) {
    const cursors = this.inputManager.getInputKeys();
    const isCasting = this.skillManager.isCasting;

    // Handle player movement
    this.playerManager.handleMovement(cursors, isCasting);

    // Update mobs
    this.mobManager.updateMobs(this.playerManager.player);

    // UI is managed by UIManager, no need to update UI every frame
  }

  /**
   * Helper function to calculate player's level based on total EXP.
   */
  calculatePlayerLevel(totalExp) {
    let oldLevel = playerProfile.level; 
    let level = 1;
    let expForNextLevel = 100; 
    let accumulatedExp = 0;

    while (totalExp >= accumulatedExp + expForNextLevel && level < 50) {
      accumulatedExp += expForNextLevel;
      level += 1;
      expForNextLevel = Math.floor(expForNextLevel * 1.5); 
    }

    const currentExp = totalExp - accumulatedExp;
    const nextLevelExp = expForNextLevel;

    // Check if level has changed
    if (level > oldLevel) {
      // For each level gained:
      for (let lvl = oldLevel; lvl < level; lvl++) {
        for (const statKey in playerGrowthStats) {
          playerBaseStats[statKey] += playerGrowthStats[statKey];
        }
      }

      playerProfile.level = level;
      console.log(`Congratulations! You've reached Level ${level}!`);

      // Update the player's stats so new max HP/MP are calculated
      this.playerManager.updatePlayerStats();

      // Replenish (fill up) to new max HP/MP
      this.playerManager.replenishHealthAndMana();
    }

    // Emit event with updated stats
    this.emitStatsUpdate();

    return { level, currentExp, nextLevelExp };
  }

  /**
   * Method to handle gaining experience.
   */
  gainExperience(amount) {
    playerProfile.totalExp += amount;
    console.log(`Gained ${amount} EXP. Total EXP: ${playerProfile.totalExp}`);

    // Recalculate level based on new total EXP
    const { level, currentExp, nextLevelExp } = this.calculatePlayerLevel(
      playerProfile.totalExp
    );

    console.log(`Player Level: ${level}`);
    console.log(`EXP: ${currentExp} / ${nextLevelExp} to next level`);
  }

  /**
   * Emit statsUpdated event with current stats
   */
  emitStatsUpdate() {
    const playerStats = this.playerManager.getPlayerStats();
    this.events.emit("statsUpdated", {
      name: playerProfile.name,
      currentHealth: playerStats.currentHealth,
      maxHealth: playerStats.maxHealth,
      currentMana: playerStats.currentMana,
      maxMana: playerStats.maxMana,
      level: playerProfile.level,
      xp: playerProfile.totalExp,
      speed: playerStats.speed,
    });
  }

  // --------------------------------------------------------------
  //  UI
  // --------------------------------------------------------------
  updateUI(stats) {
    // This method is now redundant as UI updates are handled via events.
    // We'll leave it as is if you have other UI tasks in the future.
    const playerStats = this.playerManager.getPlayerStats();

    const uiStats = {
      name: playerProfile.name,
      currentHealth: playerStats.currentHealth,
      maxHealth: playerStats.maxHealth,
      currentMana: playerStats.currentMana,
      maxMana: playerStats.maxMana,
      level: playerProfile.level,
      xp: playerProfile.totalExp,
      speed: playerStats.speed,
    };

    // Update the UI via UIManager
    this.uiManager.updateUI(uiStats);
  }

  toggleStatsMenu() {
    if (this.uiManager.statsMenu.style.display === "block") {
      this.uiManager.hideStatsMenu();
      this.scene.resume();
    } else {
      const statsHTML = this.generateStatsHTML();
      this.uiManager.showStatsMenu(statsHTML);
      this.scene.pause();
    }
  }

  generateStatsHTML() {
    const { class: cls, name, level } = playerProfile;

    // Retrieve base stats
    const baseStats = { ...playerBaseStats };

    // Retrieve equipment stats
    const equipmentSlots = ["weapon", "head", "chest", "shoulders", "legs", "feet"];
    const equippedItemsData = equipmentSlots
      .map((slot) => {
        const itemName = playerEquippedItems[slot];
        if (!itemName) return null;

        // Determine if the slot is for weapons or armor
        const isWeaponSlot = slot === "weapon";
        const itemsArray = isWeaponSlot ? weaponItems : armorItems;

        const item = itemsArray.find((i) => i.name === itemName);
        if (item) {
          return { slot, item };
        }
        return null;
      })
      .filter((e) => e !== null);

    // Calculate derived stats using calculatePlayerStats
    const derivedStats = calculatePlayerStats();

    // Prepare table headers
    let headers = `
      <tr>
        <th>Stat</th>
        <th>Base</th>
    `;

    equippedItemsData.forEach(({ slot, item }) => {
      const headerName = `${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${item.name}`;
      headers += `<th>${headerName}</th>`;
    });

    headers += `<th>Derived</th></tr>`;

    let tableHTML = `
      <table>
        <thead>
          ${headers}
        </thead>
        <tbody>
    `;

    const statList = [
      { key: "health", label: "Health" },
      { key: "mana", label: "Mana" },
      { key: "intellect", label: "Intellect" },
      { key: "strength", label: "Strength" },
      { key: "dexterity", label: "Dexterity" },
      { key: "constitution", label: "Constitution" },
      { key: "speed", label: "Speed" },
      { key: "magicAttack", label: "Magic Attack" },
      { key: "meleeAttack", label: "Melee Attack" },
      { key: "magicDefense", label: "Magic Defense" },
      { key: "meleeDefense", label: "Melee Defense" },
      { key: "magicEvasion", label: "Magic Evasion" },
      { key: "meleeEvasion", label: "Melee Evasion" },
    ];

    statList.forEach((stat) => {
      let row = `<tr><td>${stat.label}</td>`;

      // Base value
      const baseValue = baseStats[stat.key] || 0;
      row += `<td>${baseValue}</td>`;

      // Equipment contributions
      equippedItemsData.forEach(({ item }) => {
        const value = item[stat.key] !== undefined ? item[stat.key] : 0;
        row += `<td>${value !== 0 ? value : ""}</td>`;
      });

      // Derived value
      const derivedValue = derivedStats[stat.key] || 0;
      row += `<td>${derivedValue}</td>`;

      row += `</tr>`;
      tableHTML += row;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    const playerInfoHTML = `
      <div class="player-info">
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Class:</strong> ${cls}</p>
        <p><strong>Level:</strong> ${level}</p>
      </div>
    `;

    return `
      ${playerInfoHTML}
      ${tableHTML}
    `;
  }

  // For console debugging
  summarizePlayerStats() {
    console.log("=== Player Stats Summary ===");
    console.table(this.playerManager.getPlayerStats());
    console.log("============================");
  }

  // Skills
  useSkill(skill) {
    const result = this.skillManager.useSkill(skill);
    if (result.success) {
      this.playerManager.updatePlayerStats();
    }
  }

  deductMana(amount) {
    console.log(`Deducting ${amount} mana.`);
    this.playerManager.currentMana = Math.max(
      0,
      this.playerManager.currentMana - amount
    );
    console.log(`Current Mana after deduction: ${this.playerManager.currentMana}`);
    this.emitStatsUpdate();
  }

  // Targeting
  cycleTarget() {
    this.mobManager.cycleTarget(
      this.playerManager.player,
      TAB_TARGET_RANGE,
      () => {
        this.emitStatsUpdate();
      }
    );
  }

  highlightMob(mob) {
    this.mobManager.highlightMob(mob);
  }

  onMobClicked(mob) {
    this.mobManager.onMobClicked(mob);
    this.emitStatsUpdate();
  }

  // Player Death
  handlePlayerDeath() {
    console.log("Player died!");
    this.time.delayedCall(2000, () => {
      this.scene.restart();
    });
  }

  // Inventory toggle
  toggleInventoryMenu() {
    this.uiManager.toggleInventory();
  }

  // Asset loading & world setup
  loadAssets() {
    // Tilemap JSON
    this.load.tilemapTiledJSON("Map1", "assets/map/map1..tmj");

    // Tileset image
    this.load.image("terrain", "assets/map/terrain.png");

    // Player
    this.load.image("player", "assets/player.png");
    this.load.spritesheet("characters", "assets/characters.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Dead mob sprite
    this.load.spritesheet("$dead", "assets/$dead.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Load skill animation spritesheets
    playerSkills.forEach((skill) => {
      this.load.spritesheet(`${skill.name}_anim`, skill.skillImage, {
        frameWidth: 72,
        frameHeight: 72,
      });
    });
  }

  createTilemap() {
    this.map = this.make.tilemap({ key: "Map1" });
    const tileset = this.map.addTilesetImage("terrain", "terrain");

    this.backgroundLayer = this.map.createLayer("background", tileset, 0, 0);

    this.pathsLayer = this.map.createLayer("paths", tileset, 0, 0);

    // "collisions" layer fix: We will collide with all non-zero tiles
    this.collisionLayer = this.map.createLayer("collisions", tileset, 0, 0);

    // Instead of using a hardcoded list of tile IDs, collide with any non-zero tile:
    this.collisionLayer.setCollisionByExclusion([-1, 0]);
  }

  defineAnimations() {
    // Player animations
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 0,
        end: 2,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 12,
        end: 14,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 24,
        end: 26,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 36,
        end: 38,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Mob animations
    this.anims.create({
      key: "mob-walk-down",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 48,
        end: 50,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-left",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 60,
        end: 62,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-right",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 72,
        end: 74,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-up",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 84,
        end: 86,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Dead mob animation
    this.anims.create({
      key: "mob-dead",
      frames: this.anims.generateFrameNumbers("$dead", { start: 7, end: 7 }),
      frameRate: 0,
      repeat: 0,
    });

    // Skill Animations
    playerSkills.forEach((skill) => {
      this.anims.create({
        key: `${skill.name}_anim`,
        frames: this.anims.generateFrameNumbers(`${skill.name}_anim`, {
          start: 0,
          end: skill.animationSeq[1],
        }),
        frameRate: 15,
        repeat: 0,
      });
    });
  }

  setupCamera() {
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.physics.world.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.startFollow(this.playerManager.player);
  }
}
