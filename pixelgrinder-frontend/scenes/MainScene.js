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
  allGameSkills,
  // IMPORTANT: We'll use GATHER_RANGE in our gathering logic
  GATHER_RANGE,
} from "../data/MOCKdata.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");

    this.currentTargetIndex = -1;
    this.targetedMob = null;

    this.uiManager = null;
    this.skillManager = null;
    this.mobManager = null;
    this.playerManager = null;
    this.inputManager = null;

    // Event emitter
    this.events = new Phaser.Events.EventEmitter();

    // We'll track the tile under the cursor in gather_rock
    this.hoveredGatherTile = null;

    // For convenience, store the last pointer position
    this.pointerScreenX = 0;
    this.pointerScreenY = 0;
  }

  preload() {
    this.loadAssets();
  }

  create() {
    this.previousLevel = playerProfile.level;

    this.createTilemap();
    this.defineAnimations();

    this.playerManager = new PlayerManager(this);
    this.playerManager.createPlayer(this.map);

    this.skillManager = new SkillManager(this, () =>
      this.playerManager.getPlayerStats()
    );
    this.skillManager.preloadSkills();

    this.setupCamera();

    this.uiManager = new UIManager(this);
    this.uiManager.init(() => {
      this.uiManager.hideStatsMenu();
      this.scene.resume();
    });

    this.mobManager = new MobManager(this);
    this.mobManager.createMobs(this.map);

    // Set up skill bar
    this.uiManager.setupSkills(playerSkills);

    // Input manager
    this.inputManager = new InputManager(
      this,
      this.playerManager,
      this.skillManager
    );
    this.inputManager.setupControls(playerSkills);

    // Create a tooltip element for "GATHER"
    this.gatherTooltip = document.createElement("div");
    this.gatherTooltip.style.position = "fixed";
    this.gatherTooltip.style.background = "rgba(0, 0, 0, 0.7)";
    this.gatherTooltip.style.color = "#f1c40f";
    this.gatherTooltip.style.padding = "3px 5px";
    this.gatherTooltip.style.borderRadius = "4px";
    this.gatherTooltip.style.fontFamily = "Cinzel, serif";
    this.gatherTooltip.style.display = "none";
    this.gatherTooltip.innerText = "GATHER";
    document.body.appendChild(this.gatherTooltip);

    // Listen for pointer move to track position
    this.input.on("pointermove", (pointer) => {
      this.pointerScreenX = pointer.x;
      this.pointerScreenY = pointer.y;
    });

    // Listen for right-click to attempt gathering
    this.input.on("pointerdown", (pointer) => {
      if (pointer.rightButtonDown() && this.hoveredGatherTile) {
        this.attemptGather(this.hoveredGatherTile);
      }
    });

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

    // Initial EXP/level logs
    const { level, currentExp, nextLevelExp } = this.calculatePlayerLevel(
      playerProfile.totalExp
    );
    console.log(`Player Level: ${level}`);
    console.log(`EXP: ${currentExp} / ${nextLevelExp} to next level`);
  }

  update(time, delta) {
    const cursors = this.inputManager.getInputKeys();
    const isCasting = this.skillManager.isCasting;

    // Handle normal movement
    this.playerManager.handleMovement(cursors, isCasting);

    // Mobs update
    this.mobManager.updateMobs(this.playerManager.player);

    // ----- GATHERING TILE HOVER LOGIC -----
    // 1) Reset hovered tile
    this.hoveredGatherTile = null;
    this.gatherTooltip.style.display = "none";

    // Convert screen coords to world coords
    const worldPoint = this.cameras.main.getWorldPoint(
      this.pointerScreenX,
      this.pointerScreenY
    );

    // 2) Check if there's a tile in "gather_rock" at those coords
    const tile = this.gatherRockLayer.getTileAtWorldXY(worldPoint.x, worldPoint.y);
    if (tile) {
      // We have a gatherable tile
      this.hoveredGatherTile = tile;
      this.input.setDefaultCursor("pointer");

      // Position the tooltip near the mouse
      this.gatherTooltip.style.display = "block";
      this.gatherTooltip.style.left = `${this.pointerScreenX + 10}px`;
      this.gatherTooltip.style.top = `${this.pointerScreenY + 10}px`;
    } else {
      // Otherwise normal cursor
      this.input.setDefaultCursor("default");
    }
    // --------------------------------------
  }

  // --------------------------------------------------------------
  //  CREATE / LOAD
  // --------------------------------------------------------------
  loadAssets() {
    // existing code...
    this.load.tilemapTiledJSON("Map1", "assets/map/map1..tmj");
    this.load.image("terrain", "assets/map/terrain.png");
    this.load.spritesheet("mage", "assets/mage.png", {
      frameWidth: 36,
      frameHeight: 37,
    });
    this.load.spritesheet("characters", "assets/characters.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("$dead", "assets/$dead.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    allGameSkills.forEach((skill) => {
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

    // Collision layer
    this.collisionLayer = this.map.createLayer("collisions", tileset, 0, 0);
    this.collisionLayer.setCollisionByExclusion([-1, 0]);

    // *** The new gather_rock tile layer ***
    //    Ensure your Tiled map has a tile layer named exactly "gather_rock".
    this.gatherRockLayer = this.map.createLayer("gather_rock", tileset, 0, 0);
  }

  defineAnimations() {
    //
    // PLAYER animations (from new mage.png)
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
    // MOB animations
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
    // ---------------------------------------------------------
    //  Create animations for *all* game skills, not just the
    //  player's current skill set. This way newly looted skills
    //  also have their animation data ready.
    // ---------------------------------------------------------
    allGameSkills.forEach((skill) => {
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
    // existing code...
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

  // ----------------------------------------------------------------
  // Attempt to gather from a tile in gather_rock layer
  // ----------------------------------------------------------------
  attemptGather(tile) {
    // 1) Check distance from player to tile
    const px = this.playerManager.player.x;
    const py = this.playerManager.player.y;

    // Convert tile coords back to actual world coords
    // By default, each tile is map.tileWidth x map.tileHeight
    // So the tile's center might be e.g. 
    const tileWorldX = this.gatherRockLayer.tileToWorldX(tile.x) + this.map.tileWidth/2;
    const tileWorldY = this.gatherRockLayer.tileToWorldY(tile.y) + this.map.tileHeight/2;

    const distance = Phaser.Math.Distance.Between(px, py, tileWorldX, tileWorldY);
    if (distance > GATHER_RANGE) {
      console.log("Too far to gather this resource.");
      return;
    }

    // If we're already gathering or casting, do nothing
    if (this.playerManager.isGathering || this.skillManager.isCasting) {
      return;
    }

    // 2) Start "gathering" animation 
    //    We'll reuse the UI's casting bar concept.
    console.log("Starting gathering...");

    this.playerManager.isGathering = true;

    // The gather time can be e.g. 3 seconds / gatherSpeed
    const playerStats = this.playerManager.getPlayerStats();
    const gatherSpeed = playerStats.gatherSpeed || 1;
    const gatherTime = 3 / gatherSpeed; // 3 second base, scale by gatherSpeed

    // Show progress bar
    this.uiManager.showCastingProgress("Gathering...", gatherTime);

    let elapsedTime = 0;
    const updateInterval = 0.1; // every 0.1s
    this.gatherTimer = this.time.addEvent({
      delay: updateInterval * 1000,
      loop: true,
      callback: () => {
        elapsedTime += updateInterval;
        this.uiManager.updateCastingProgress(elapsedTime, gatherTime);

        // If out of range during gathering, cancel
        const newDist = Phaser.Math.Distance.Between(
          this.playerManager.player.x,
          this.playerManager.player.y,
          tileWorldX,
          tileWorldY
        );
        if (newDist > GATHER_RANGE) {
          console.log("Gather canceled (moved out of range).");
          this.cancelGather();
        }

        // If done
        if (elapsedTime >= gatherTime) {
          // complete
          this.finishGather(tile);
        }
      },
    });
  }

  // Called if we successfully finish gathering
  finishGather(tile) {
    console.log("Gather complete!");

    // Cleanup
    if (this.gatherTimer) {
      this.gatherTimer.remove(false);
      this.gatherTimer = null;
    }
    this.playerManager.isGathering = false;
    this.uiManager.hideCastingProgress();

    // Remove tile from the gather_rock layer
    this.gatherRockLayer.removeTileAt(tile.x, tile.y);

    // Optionally, give some item or resource, add to inventory, etc.
    // e.g. player gets "Stone" item or something:
    console.log("You gathered some resources!");
  }

  // Called if we must cancel the gathering
  cancelGather() {
    if (this.gatherTimer) {
      this.gatherTimer.remove(false);
      this.gatherTimer = null;
    }
    this.playerManager.isGathering = false;
    this.uiManager.hideCastingProgress();
  }

  // ----------------------------------------------------------------
  //  Other methods remain the same
  // ----------------------------------------------------------------
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
    return `
      <p>This is where you'd show the player's stats in HTML form.</p>
    `;
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
    console.log(
      `Current Mana after deduction: ${this.playerManager.currentMana}`
    );
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
