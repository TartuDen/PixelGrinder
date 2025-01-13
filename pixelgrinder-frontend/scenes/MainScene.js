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
  }

  preload() {
    // Load default assets (tilemap, etc.)
    this.loadAssets();
  }

  create() {
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

    // Update the UI once at the start
    this.updateUI();

    // Create skill animations
    this.skillManager.createSkillAnimations();

    // Natural regeneration
    this.time.addEvent({
      delay: naturalRegeneration.regenerationTime,
      callback: () => this.playerManager.regenerateStats(naturalRegeneration),
      callbackScope: this,
      loop: true,
    });
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

  // --------------------------------------------------------------
  //  UI
  // --------------------------------------------------------------
  updateUI() {
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
      // Generate stats HTML using the updated function
      const statsHTML = this.generateStatsHTML();
      this.uiManager.showStatsMenu(statsHTML);

      // Pause the scene
      this.scene.pause();
    }
  }

  generateStatsHTML() {
    const { class: cls, name, level } = playerProfile;

    // Retrieve base stats
    const baseStats = { ...playerBaseStats };

    // Retrieve equipment stats
    const equipmentSlots = [
      "weapon",
      "head",
      "chest",
      "shoulders",
      "legs",
      "feet",
    ];
    const equippedItems = equipmentSlots
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

    equippedItems.forEach(({ slot, item }) => {
      const headerName = `${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${
        item.name
      }`;
      headers += `<th>${headerName}</th>`;
    });

    headers += `<th>Derived</th></tr>`;

    // Start building the table
    let tableHTML = `
      <table>
        <thead>
          ${headers}
        </thead>
        <tbody>
    `;

    // Define the list of stats to display
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

    // Populate table rows
    statList.forEach((stat) => {
      let row = `<tr><td>${stat.label}</td>`;

      // Base value
      const baseValue = baseStats[stat.key] || 0;
      row += `<td>${baseValue}</td>`;

      // Equipment contributions
      equippedItems.forEach(({ item }) => {
        const value = item[stat.key] !== undefined ? item[stat.key] : 0;
        row += `<td>${value}</td>`;
      });

      // Derived value
      const derivedValue =
        derivedStats[stat.key] !== undefined ? derivedStats[stat.key] : 0;
      row += `<td>${derivedValue}</td>`;

      row += `</tr>`;
      tableHTML += row;
    });

    // Close the table
    tableHTML += `
        </tbody>
      </table>
    `;

    // Add Player Info (Name, Class, Level) above the table
    const playerInfoHTML = `
      <div class="player-info">
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Class:</strong> ${cls}</p>
        <p><strong>Level:</strong> ${level}</p>
      </div>
    `;

    // Combine Player Info and Table
    return `
      ${playerInfoHTML}
      ${tableHTML}
    `;
  }

  generateStatsTable(title, stats) {
    let rows = "";
    for (const [key, value] of Object.entries(stats)) {
      const formattedKey = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      rows += `
        <tr>
          <th>${formattedKey}</th>
          <td>${value}</td>
        </tr>
      `;
    }
    return `
      <h3>${title}</h3>
      <table>
        <thead>
          <tr>
            <th>Stat</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // --------------------------------------------------------------
  //  Summarize Stats in Console
  // --------------------------------------------------------------
  summarizePlayerStats() {
    console.log("=== Player Stats Summary ===");
    console.table(this.playerManager.getPlayerStats());
    console.log("============================");
  }

  // --------------------------------------------------------------
  //  Skills
  // --------------------------------------------------------------
  useSkill(skill) {
    const result = this.skillManager.useSkill(skill);

    if (result.success) {
      // Update player stats if necessary
      this.playerManager.updatePlayerStats();
    }
  }

  deductMana(amount) {
    console.log(`Deducting ${amount} mana.`);
    this.playerManager.currentMana = Math.max(
      0,
      this.playerManager.currentMana - amount
    );
    console.log(
      `Current Mana after deduction: ${this.playerManager.currentMana}`
    );
    // Update the UI to reflect mana deduction
    this.updateUI();
  }

  // --------------------------------------------------------------
  //  Targeting
  // --------------------------------------------------------------
  cycleTarget() {
    this.mobManager.cycleTarget(
      this.playerManager.player,
      TAB_TARGET_RANGE,
      () => {
        this.updateUI();
      }
    );
  }

  highlightMob(mob) {
    this.mobManager.highlightMob(mob);
  }

  onMobClicked(mob) {
    this.mobManager.onMobClicked(mob);
    this.updateUI();
  }

  // --------------------------------------------------------------
  //  Player Death
  // --------------------------------------------------------------
  handlePlayerDeath() {
    console.log("Player died!");
    // Implement game-over or respawn logic here
    // For example, restart the scene after a delay
    this.time.delayedCall(2000, () => {
      this.scene.restart();
    });
  }

  // --------------------------------------------------------------
  //  Asset Loading & World Setup
  // --------------------------------------------------------------
  loadAssets() {
    // Tilemap JSON
    this.load.tilemapTiledJSON("Map0", "assets/map/map0..tmj");

    // Tileset image
    this.load.image("tmw_desert_spacing", "assets/map/tmw_desert_spacing.png");

    // Other assets
    this.load.image("player", "assets/player.png");

    // Characters sprite sheet
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
    this.map = this.make.tilemap({ key: "Map0" });
    const tileset = this.map.addTilesetImage(
      "tmw_desert_spacing",
      "tmw_desert_spacing"
    );

    // Background layer
    this.backgroundLayer = this.map.createLayer("background", tileset, 0, 0);

    // Collisions layer
    this.collisionLayer = this.map.createLayer("collisions", tileset, 0, 0);
    this.collisionLayer.setCollision([
      30, 31, 32, 37, 38, 39, 40, 45, 46, 47, 48,
    ]);
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
