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

  // --------------------------------------------------------------
  //  CREATE / LOAD
  // --------------------------------------------------------------

  loadAssets() {
    // 1) Tilemap JSON
    this.load.tilemapTiledJSON("Map1", "assets/map/map1..tmj");

    // 2) Tileset image
    this.load.image("terrain", "assets/map/terrain.png");

    // 3) Player mage sprite (new!)
    this.load.spritesheet("mage", "assets/mage.png", {
      frameWidth: 36, // approximated
      frameHeight: 37 // approximated
    });

    // 4) Mob sprite (unchanged)
    this.load.spritesheet("characters", "assets/characters.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    // 5) Dead mob sprite
    this.load.spritesheet("$dead", "assets/$dead.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    // 6) Skill animations
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

    // background layer
    this.backgroundLayer = this.map.createLayer("background", tileset, 0, 0);

    // paths layer (also just a background)
    this.pathsLayer = this.map.createLayer("paths", tileset, 0, 0);

    // collisions layer
    this.collisionLayer = this.map.createLayer("collisions", tileset, 0, 0);
    this.collisionLayer.setCollisionByExclusion([-1, 0]);
  }

  defineAnimations() {
    //
    // PLAYER animations (from new mage.png)
    //
    // The sprite is 4 rows x 7 columns; each row has 6 frames + 1 empty column
    // So row frames are (rowIndex*7) .. (rowIndex*7 + 5)
    // Row 0 => walk-down => frames 0..5
    // Row 1 => walk-up   => frames 7..12
    // Row 2 => walk-right => frames 14..19
    // Row 3 => walk-left => frames 21..26
    //
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("mage", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("mage", { start: 6, end: 11 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("mage", { start: 12, end: 17 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("mage", { start: 18, end: 23 }),
      frameRate: 8,
      repeat: -1
    });

    //
    // MOB animations (unchanged, from "characters.png")
    //
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

    // Dead mob
    this.anims.create({
      key: "mob-dead",
      frames: this.anims.generateFrameNumbers("$dead", { start: 7, end: 7 }),
      frameRate: 0,
      repeat: 0,
    });

    //
    // SKILL animations
    //
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

  // --------------------------------------------------------------
  //  OTHER METHODS (same as before)
  // --------------------------------------------------------------

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

    if (level > oldLevel) {
      for (let lvl = oldLevel; lvl < level; lvl++) {
        for (const statKey in playerGrowthStats) {
          playerBaseStats[statKey] += playerGrowthStats[statKey];
        }
      }
      playerProfile.level = level;
      console.log(`Congratulations! You've reached Level ${level}!`);
      this.playerManager.updatePlayerStats();
      this.playerManager.replenishHealthAndMana();
    }

    this.emitStatsUpdate();
    return { level, currentExp, nextLevelExp };
  }

  gainExperience(amount) {
    playerProfile.totalExp += amount;
    console.log(`Gained ${amount} EXP. Total EXP: ${playerProfile.totalExp}`);
    const { level, currentExp, nextLevelExp } = this.calculatePlayerLevel(
      playerProfile.totalExp
    );
    console.log(`Player Level: ${level}`);
    console.log(`EXP: ${currentExp} / ${nextLevelExp} to next level`);
  }

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

  updateUI(stats) {
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
    // same as before
    // ...
  }

  summarizePlayerStats() {
    console.log("=== Player Stats Summary ===");
    console.table(this.playerManager.getPlayerStats());
    console.log("============================");
  }

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

  handlePlayerDeath() {
    console.log("Player died!");
    this.time.delayedCall(2000, () => {
      this.scene.restart();
    });
  }

  toggleInventoryMenu() {
    this.uiManager.toggleInventory();
  }
}
