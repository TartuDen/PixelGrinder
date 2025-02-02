// File: scenes/MainScene.js
import UIManager from "../managers/UIManager.js";
import SkillManager from "../managers/SkillManager.js";
import MobManager from "../managers/MobManager.js";
import PlayerManager from "../managers/PlayerManager.js";
import InputManager from "../managers/InputManager.js";
import ChatManager from "../managers/ChatManager.js";
import GatherManager from "../managers/GatherManager.js";

import {
  naturalRegeneration,
  playerProfile,
  playerSkills,
  TAB_TARGET_RANGE,
  playerBaseStats,
  playerGrowthStats,
  allGameSkills,
} from "../data/MOCKdata.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");

    // Targeting
    this.currentTargetIndex = -1;
    this.targetedMob = null;

    // Managers
    this.uiManager = null;
    this.skillManager = null;
    this.mobManager = null;
    this.playerManager = null;
    this.inputManager = null;
    this.chatManager = null;
    this.gatherManager = null;

    // We'll use a custom event emitter for certain UI updates
    this.events = new Phaser.Events.EventEmitter();
  }

  preload() {
    this.loadAssets();
  }

  create() {
    // Record the player's initial level to detect level-ups
    this.previousLevel = playerProfile.level;

    // 1) Create tilemap & define animations
    this.createTilemap();
    this.defineAnimations();

    // 2) Chat Manager
    this.chatManager = new ChatManager();
    this.chatManager.init();

    // 3) Player Manager
    this.playerManager = new PlayerManager(this);
    this.playerManager.createPlayer(this.map);

    // Add collision with gatherRockLayer
    this.physics.add.collider(this.playerManager.player, this.gatherRockLayer);

    // 4) Skill Manager
    this.skillManager = new SkillManager(this, () =>
      this.playerManager.getPlayerStats()
    );
    this.skillManager.preloadSkills();

    // 5) Camera
    this.setupCamera();

    // 6) UI Manager
    this.uiManager = new UIManager(this);
    this.uiManager.init(() => {
      this.uiManager.hideStatsMenu();
      this.scene.resume();
    });

    // 7) Mobs
    this.mobManager = new MobManager(this);
    this.mobManager.createMobs(this.map);

    // Set up skill hotbar for player's known skills
    this.uiManager.setupSkills(playerSkills);

    // 8) Input Manager
    this.inputManager = new InputManager(
      this,
      this.playerManager,
      this.skillManager
    );
    this.inputManager.setupControls(playerSkills);

    // 9) Gather Manager
    this.gatherManager = new GatherManager(
      this,
      this.playerManager,
      this.uiManager,
      this.chatManager
    );
    this.gatherManager.init(this.gatherRockLayer);

    // Emit initial UI update
    this.emitStatsUpdate();

    // Create skill animations
    this.skillManager.createSkillAnimations();

    // Start natural regen
    this.time.addEvent({
      delay: naturalRegeneration.regenerationTime,
      callback: () => this.playerManager.regenerateStats(naturalRegeneration),
      loop: true,
    });

    // Show initial XP/Level in chat
    const { level, currentExp, nextLevelExp } = this.calculatePlayerLevel(
      playerProfile.totalExp
    );
    this.chatManager.addMessage(`Player Level: ${level}`);
    this.chatManager.addMessage(`EXP: ${currentExp} / ${nextLevelExp} to next level`);

    // Create menu buttons in bottom-right
    this.createInGameMenuButtons();
  }

  update(time, delta) {
    // 1) Movement & Casting
    const cursors = this.inputManager.getInputKeys();
    const isCasting = this.skillManager.isCasting;
    this.playerManager.handleMovement(cursors, isCasting);

    // 2) Mob AI
    this.mobManager.updateMobs(this.playerManager.player);

    // 3) Gathering loop
    if (this.gatherManager) {
      this.gatherManager.update();
    }
  }

  // -------------------------------------------------
  // Load game assets
  // -------------------------------------------------
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

    // Load skill sprite sheets
    allGameSkills.forEach((skill) => {
      this.load.spritesheet(`${skill.name}_anim`, skill.skillImage, {
        frameWidth: 72,
        frameHeight: 72,
      });
    });
  }

  // -------------------------------------------------
  // Tilemap
  // -------------------------------------------------
  createTilemap() {
    this.map = this.make.tilemap({ key: "Map1" });
    const tileset = this.map.addTilesetImage("terrain", "terrain");

    this.backgroundLayer = this.map.createLayer("background", tileset, 0, 0);
    this.pathsLayer = this.map.createLayer("paths", tileset, 0, 0);
    this.collisionLayer = this.map.createLayer("collisions", tileset, 0, 0);
    this.collisionLayer.setCollisionByExclusion([-1, 0]);

    // The GATHER layer
    this.gatherRockLayer = this.map.createLayer("gather_rock", tileset, 0, 0);
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
      frames: this.anims.generateFrameNumbers("characters", { start: 48, end: 50 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-left",
      frames: this.anims.generateFrameNumbers("characters", { start: 60, end: 62 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-right",
      frames: this.anims.generateFrameNumbers("characters", { start: 72, end: 74 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-up",
      frames: this.anims.generateFrameNumbers("characters", { start: 84, end: 86 }),
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

  // -------------------------------------------------
  // In-Game Menu Buttons in bottom-right
  // -------------------------------------------------
  createInGameMenuButtons() {
    const menuContainer = document.createElement("div");
    menuContainer.id = "game-menu-container";
    menuContainer.style.position = "fixed";
    menuContainer.style.bottom = "20px";
    menuContainer.style.right = "20px";
    menuContainer.style.zIndex = 9999;
    menuContainer.style.display = "flex";
    menuContainer.style.gap = "10px";
    document.body.appendChild(menuContainer);

    const styleButton = (btn) => {
      btn.style.padding = "10px 15px";
      btn.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      btn.style.border = "1px solid #f1c40f";
      btn.style.color = "#f1c40f";
      btn.style.fontFamily = "Cinzel, serif";
      btn.style.fontSize = "14px";
      btn.style.borderRadius = "5px";
      btn.style.cursor = "pointer";
      btn.addEventListener("mouseenter", () => {
        btn.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      });
    };

    // PLAYER INFO button
    const playerInfoBtn = document.createElement("button");
    playerInfoBtn.textContent = "PLAYER INFO";
    styleButton(playerInfoBtn);
    playerInfoBtn.onclick = () => {
      this.toggleInventoryMenu();
    };
    menuContainer.appendChild(playerInfoBtn);

    // SKILL BOOK button
    const skillBookBtn = document.createElement("button");
    skillBookBtn.textContent = "SKILL BOOK";
    styleButton(skillBookBtn);
    skillBookBtn.onclick = () => {
      this.uiManager.toggleSkillBook();
    };
    menuContainer.appendChild(skillBookBtn);
  }

  // -------------------------------------------------
  // Experience & Level
  // -------------------------------------------------
  calculatePlayerLevel(totalExp) {
    const oldLevel = playerProfile.level;
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

    // If level changed
    if (level > oldLevel) {
      for (let lvl = oldLevel; lvl < level; lvl++) {
        for (const statKey in playerGrowthStats) {
          playerBaseStats[statKey] += playerGrowthStats[statKey];
        }
      }
      playerProfile.level = level;
      this.chatManager.addMessage(`Congratulations! You've reached Level ${level}!`);
      this.playerManager.updatePlayerStats();
      this.playerManager.replenishHealthAndMana();
    }

    this.emitStatsUpdate();
    return { level, currentExp, nextLevelExp };
  }

  gainExperience(amount) {
    playerProfile.totalExp += amount;
    this.chatManager.addMessage(`Gained ${amount} EXP (Total: ${playerProfile.totalExp})`);

    const { level, currentExp, nextLevelExp } = this.calculatePlayerLevel(
      playerProfile.totalExp
    );
    this.chatManager.addMessage(`Player Level: ${level}`);
    this.chatManager.addMessage(`EXP: ${currentExp} / ${nextLevelExp} to next level`);
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
    return `<p>Display player's detailed stats here.</p>`;
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
