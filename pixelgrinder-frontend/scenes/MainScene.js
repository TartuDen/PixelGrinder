// scenes/MainScene.js

import UIManager from "../managers/UIManager.js";
import SkillManager from "../managers/SkillManager.js";
import MobManager from "../managers/MobManager.js";
import PlayerManager from "../managers/PlayerManager.js";
import InputManager from "../managers/InputManager.js";
import ChatManager from "../managers/ChatManager.js"; // NEW

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

    this.chatManager = null; // NEW

    this.events = new Phaser.Events.EventEmitter();

    // For gather logic
    this.hoveredGatherTile = null;
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

    // Setup Chat
    this.chatManager = new ChatManager();
    this.chatManager.init();

    // Now that we have chatManager, we can pass it around or just store it in scene
    this.playerManager = new PlayerManager(this);
    this.playerManager.createPlayer(this.map);

    this.physics.add.collider(this.playerManager.player, this.gatherRockLayer);

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

    this.uiManager.setupSkills(playerSkills);

    this.inputManager = new InputManager(
      this,
      this.playerManager,
      this.skillManager
    );
    this.inputManager.setupControls(playerSkills);

    // Create gather tooltip (floating "GATHER" text)
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

    // Track mouse position
    this.input.on("pointermove", (pointer) => {
      this.pointerScreenX = pointer.x;
      this.pointerScreenY = pointer.y;
    });

    // Listen for LEFT-click to gather
    this.input.on("pointerdown", (pointer) => {
      if (pointer.button === 0 && this.hoveredGatherTile) {
        this.attemptGather(this.hoveredGatherTile);
      }
    });

    this.emitStatsUpdate();

    // Skill animations
    this.skillManager.createSkillAnimations();

    // Natural regen
    this.time.addEvent({
      delay: naturalRegeneration.regenerationTime,
      callback: () => this.playerManager.regenerateStats(naturalRegeneration),
      callbackScope: this,
      loop: true,
    });

    // Show initial XP/Level in chat
    const { level, currentExp, nextLevelExp } = this.calculatePlayerLevel(
      playerProfile.totalExp
    );
    this.chatManager.addMessage(`Player Level: ${level}`);
    this.chatManager.addMessage(
      `EXP: ${currentExp} / ${nextLevelExp} to next level`
    );

    // ADD In-Game Buttons for #6
    this.createInGameMenuButtons();
  }

  // Create two new on-screen buttons: "PLAYER INFO" (Inventory) and "SKILL BOOK"
  createInGameMenuButtons() {
    // Create a container DIV to hold both buttons side by side in bottom-right corner
    const menuContainer = document.createElement("div");
    menuContainer.id = "game-menu-container";
    menuContainer.style.position = "fixed";
    menuContainer.style.bottom = "20px";
    menuContainer.style.right = "20px";
    menuContainer.style.zIndex = 9999;
    // Arrange buttons horizontally with some gap
    menuContainer.style.display = "flex";
    menuContainer.style.gap = "10px";
    document.body.appendChild(menuContainer);

    // A small helper function to style both buttons consistently
    function styleGameButton(btn) {
      btn.style.padding = "10px 15px";
      btn.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      btn.style.border = "1px solid #f1c40f";
      btn.style.color = "#f1c40f";
      btn.style.fontFamily = "Cinzel, serif";
      btn.style.fontSize = "14px";
      btn.style.borderRadius = "5px";
      btn.style.cursor = "pointer";
      // If you’d like a simple hover effect:
      btn.addEventListener("mouseenter", () => {
        btn.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      });
    }

    // 1) "PLAYER INFO" Button → toggles inventory
    const playerInfoBtn = document.createElement("button");
    playerInfoBtn.textContent = "PLAYER INFO";
    styleGameButton(playerInfoBtn);
    playerInfoBtn.onclick = () => {
      this.toggleInventoryMenu();
    };
    menuContainer.appendChild(playerInfoBtn);

    // 2) "SKILL BOOK" Button → toggles skill book
    const skillBookBtn = document.createElement("button");
    skillBookBtn.textContent = "SKILL BOOK";
    styleGameButton(skillBookBtn);
    skillBookBtn.onclick = () => {
      this.uiManager.toggleSkillBook();
    };
    menuContainer.appendChild(skillBookBtn);
  }

  update(time, delta) {
    const cursors = this.inputManager.getInputKeys();
    const isCasting = this.skillManager.isCasting;

    this.playerManager.handleMovement(cursors, isCasting);

    this.mobManager.updateMobs(this.playerManager.player);

    // GATHER HOVER LOGIC:
    this.hoveredGatherTile = null;
    this.gatherTooltip.style.display = "none";

    const worldPoint = this.cameras.main.getWorldPoint(
      this.pointerScreenX,
      this.pointerScreenY
    );
    const tile = this.gatherRockLayer.getTileAtWorldXY(
      worldPoint.x,
      worldPoint.y
    );

    if (tile) {
      this.hoveredGatherTile = tile;
      this.input.setDefaultCursor("pointer");
      // Show "GATHER" tooltip near the cursor
      this.gatherTooltip.style.display = "block";
      this.gatherTooltip.style.left = `${this.pointerScreenX + 10}px`;
      this.gatherTooltip.style.top = `${this.pointerScreenY + 10}px`;
    } else {
      this.input.setDefaultCursor("default");
    }
  }

  loadAssets() {
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

    this.collisionLayer = this.map.createLayer("collisions", tileset, 0, 0);
    this.collisionLayer.setCollisionByExclusion([-1, 0]);

    // GATHER layer:
    this.gatherRockLayer = this.map.createLayer("gather_rock", tileset, 0, 0);

    // #3 Add collision so we can't walk over gatherable
    this.gatherRockLayer.setCollisionByExclusion([-1]);
  }

  defineAnimations() {
    // Player anims
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("mage", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("mage", { start: 6, end: 11 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("mage", { start: 12, end: 17 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("mage", { start: 18, end: 23 }),
      frameRate: 8,
      repeat: -1,
    });

    // Mobs
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

    this.anims.create({
      key: "mob-dead",
      frames: this.anims.generateFrameNumbers("$dead", { start: 7, end: 7 }),
      frameRate: 0,
      repeat: 0,
    });

    // Skills
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

  // Attempt to gather from the tile
  attemptGather(tile) {
    const px = this.playerManager.player.x;
    const py = this.playerManager.player.y;

    const tileWorldX =
      this.gatherRockLayer.tileToWorldX(tile.x) + this.map.tileWidth / 2;
    const tileWorldY =
      this.gatherRockLayer.tileToWorldY(tile.y) + this.map.tileHeight / 2;

    const distance = Phaser.Math.Distance.Between(
      px,
      py,
      tileWorldX,
      tileWorldY
    );
    if (distance > GATHER_RANGE) {
      this.chatManager.addMessage("Too far to gather this resource.");
      return;
    }

    // If we're already gathering or casting
    if (this.playerManager.isGathering || this.skillManager.isCasting) {
      this.chatManager.addMessage("You're busy and can't gather right now.");
      return;
    }

    this.chatManager.addMessage("Starting gathering...");
    this.playerManager.isGathering = true;

    const playerStats = this.playerManager.getPlayerStats();
    const gatherSpeed = playerStats.gatherSpeed || 1;
    const baseTime = 3; // base gather time
    const gatherTime = baseTime / gatherSpeed;

    this.uiManager.showCastingProgress("Gathering...", gatherTime);

    let elapsedTime = 0;
    const step = 0.1;

    this.gatherTimer = this.time.addEvent({
      delay: step * 1000,
      loop: true,
      callback: () => {
        elapsedTime += step;
        this.uiManager.updateCastingProgress(elapsedTime, gatherTime);

        // Check if player moved out of range
        const newDist = Phaser.Math.Distance.Between(
          this.playerManager.player.x,
          this.playerManager.player.y,
          tileWorldX,
          tileWorldY
        );
        if (newDist > GATHER_RANGE) {
          this.chatManager.addMessage("Gather canceled (moved out of range).");
          this.cancelGather();
        }

        if (elapsedTime >= gatherTime) {
          this.finishGather(tile);
        }
      },
    });
  }

  finishGather(tile) {
    this.chatManager.addMessage("Gather complete!");

    if (this.gatherTimer) {
      this.gatherTimer.remove(false);
      this.gatherTimer = null;
    }
    this.playerManager.isGathering = false;
    this.uiManager.hideCastingProgress();

    // Remove tile from gather_rock layer
    this.gatherRockLayer.removeTileAt(tile.x, tile.y);

    // Give item to inventory (simple_rock ID=4000 as example)
    this.playerManager.addItemToInventory(4000, 1);

    this.chatManager.addMessage(
      "You gathered a 'simple_rock'. Added to inventory!"
    );
  }

  cancelGather() {
    if (this.gatherTimer) {
      this.gatherTimer.remove(false);
      this.gatherTimer = null;
    }
    this.playerManager.isGathering = false;
    this.uiManager.hideCastingProgress();
  }

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
      this.chatManager.addMessage(
        `Congratulations! You've reached Level ${level}!`
      );
      this.playerManager.updatePlayerStats();
      this.playerManager.replenishHealthAndMana();
    }

    this.emitStatsUpdate();
    return { level, currentExp, nextLevelExp };
  }

  gainExperience(amount) {
    playerProfile.totalExp += amount;
    this.chatManager.addMessage(
      `Gained ${amount} EXP. Total EXP: ${playerProfile.totalExp}`
    );
    const { level, currentExp, nextLevelExp } = this.calculatePlayerLevel(
      playerProfile.totalExp
    );
    this.chatManager.addMessage(`Player Level: ${level}`);
    this.chatManager.addMessage(
      `EXP: ${currentExp} / ${nextLevelExp} to next level`
    );
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
    // If you truly want to remove all console logs, you could remove below;
    // or optionally send a summary to chat.
    this.chatManager.addMessage("=== Player Stats Summary ===");
    const stats = this.playerManager.getPlayerStats();
    this.chatManager.addMessage(JSON.stringify(stats, null, 2));
  }

  useSkill(skill) {
    const result = this.skillManager.useSkill(skill);
    if (result.success) {
      this.playerManager.updatePlayerStats();
    }
  }

  deductMana(amount) {
    this.chatManager.addMessage(`Deducting ${amount} mana.`);
    this.playerManager.currentMana = Math.max(
      0,
      this.playerManager.currentMana - amount
    );
    this.chatManager.addMessage(
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
    this.chatManager.addMessage("Player died!");
    this.time.delayedCall(2000, () => {
      this.scene.restart();
    });
  }

  toggleInventoryMenu() {
    this.uiManager.toggleInventory();
  }
}
