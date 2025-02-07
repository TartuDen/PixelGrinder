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

    this.currentTargetIndex = -1;
    this.targetedMob = null;

    this.uiManager = null;
    this.skillManager = null;
    this.mobManager = null;
    this.playerManager = null;
    this.inputManager = null;
    this.chatManager = null;
    this.gatherManager = null;

    this.events = new Phaser.Events.EventEmitter();
  }

  preload() {
    this.loadAssets();
  }

  create() {
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

    // Show initial XP/Level
    const { level, currentExp, nextLevelExp } = this.calculatePlayerLevel(
      playerProfile.totalExp
    );
    this.chatManager.addMessage(`Player Level: ${level}`);
    this.chatManager.addMessage(
      `EXP: ${currentExp} / ${nextLevelExp} to next level`
    );

    // Create menu buttons in bottom-right
    this.createInGameMenuButtons();
  }

  update(time, delta) {
    const cursors = this.inputManager.getInputKeys();
    const isCasting = this.skillManager.isCasting;
    this.playerManager.handleMovement(cursors, isCasting);
    this.mobManager.updateMobs(this.playerManager.player);

    if (this.gatherManager) {
      this.gatherManager.update();
    }
  }

  loadAssets() {
    // ----------------------
    // TILEMAP & TILES
    // ----------------------
    this.load.tilemapTiledJSON("Map1", "assets/map/map1..tmj");
    this.load.image("terrain", "assets/map/terrain.png");

    // ----------------------
    // MOBS
    // ----------------------
    this.load.spritesheet("mobs", "assets/mobs.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("dead_mobs", "assets/dead_mobs.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    // ----------------------
    // NECROMANCER (PLAYER)
    this.load.spritesheet(
      "necromancer-run-down",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Down/Png/NecromancerDownRun.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "necromancer-run-up",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Up/Png/NecromancerUpRun.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "necromancer-run-left",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Left/Png/NecromancerLeftRun.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "necromancer-run-right",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Right/Png/NecromancerRightRun.png",
      { frameWidth: 48, frameHeight: 48 }
    );

    // CAST (7 frames, 48x48)
    this.load.spritesheet(
      "necromancer-cast-down",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Down/Png/NecromancerDownAttack02.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "necromancer-cast-left",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Left/Png/NecromancerLeftAttack02.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "necromancer-cast-right",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Right/Png/NecromancerRightAttack02.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "necromancer-cast-up",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Up/Png/NecromancerUpAttack02.png",
      { frameWidth: 48, frameHeight: 48 }
    );

    // IDLE (6 frames, 48x48)
    this.load.spritesheet(
      "necromancer-idle-down",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Down/Png/NecromancerDownIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "necromancer-idle-left",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Left/Png/NecromancerLefttIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "necromancer-idle-right",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Right/Png/NecromancerRightIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "necromancer-idle-up",
      "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Up/Png/NecromancerUpIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );

    // ----------------------
    // SKILLS
    // ----------------------
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

    this.gatherRockLayer = this.map.createLayer("gather_rock", tileset, 0, 0);
    this.gatherRockLayer.setCollisionByExclusion([-1]);
  }

  defineAnimations() {
    // ------------------------------------------------
    // NECROMANCER (PLAYER) ANIMATIONS
    // ------------------------------------------------

    // RUN (7 frames: index 0..6)
    this.anims.create({
      key: "necromancer-run-down",
      frames: this.anims.generateFrameNumbers("necromancer-run-down", {
        start: 0,
        end: 6,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-run-up",
      frames: this.anims.generateFrameNumbers("necromancer-run-up", {
        start: 0,
        end: 6,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-run-left",
      frames: this.anims.generateFrameNumbers("necromancer-run-left", {
        start: 0,
        end: 6,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-run-right",
      frames: this.anims.generateFrameNumbers("necromancer-run-right", {
        start: 0,
        end: 6,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // CAST (7 frames: index 0..6, does NOT repeat)
    this.anims.create({
      key: "necromancer-cast-down",
      frames: this.anims.generateFrameNumbers("necromancer-cast-down", {
        start: 0,
        end: 6,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "necromancer-cast-left",
      frames: this.anims.generateFrameNumbers("necromancer-cast-left", {
        start: 0,
        end: 6,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "necromancer-cast-right",
      frames: this.anims.generateFrameNumbers("necromancer-cast-right", {
        start: 0,
        end: 6,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "necromancer-cast-up",
      frames: this.anims.generateFrameNumbers("necromancer-cast-up", {
        start: 0,
        end: 6,
      }),
      frameRate: 10,
      repeat: 0,
    });

    // IDLE (6 frames: index 0..5)
    this.anims.create({
      key: "necromancer-idle-down",
      frames: this.anims.generateFrameNumbers("necromancer-idle-down", {
        start: 0,
        end: 5,
      }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-idle-left",
      frames: this.anims.generateFrameNumbers("necromancer-idle-left", {
        start: 0,
        end: 5,
      }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-idle-right",
      frames: this.anims.generateFrameNumbers("necromancer-idle-right", {
        start: 0,
        end: 5,
      }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-idle-up",
      frames: this.anims.generateFrameNumbers("necromancer-idle-up", {
        start: 0,
        end: 5,
      }),
      frameRate: 6,
      repeat: -1,
    });

    // ------------------------------------------------
    // MOBS
    // ------------------------------------------------
    this.anims.create({
      key: "mob-walk-down",
      frames: this.anims.generateFrameNumbers("mobs", {
        start: 48,
        end: 50,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-left",
      frames: this.anims.generateFrameNumbers("mobs", {
        start: 60,
        end: 62,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-right",
      frames: this.anims.generateFrameNumbers("mobs", {
        start: 72,
        end: 74,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-up",
      frames: this.anims.generateFrameNumbers("mobs", {
        start: 84,
        end: 86,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-dead",
      frames: this.anims.generateFrameNumbers("dead_mobs", { start: 7, end: 7 }),
      frameRate: 0,
      repeat: 0,
    });

    // ------------------------------------------------
    // SKILLS (already existing, unchanged)
    // ------------------------------------------------
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

  createInGameMenuButtons() {
    const menuContainer = document.createElement("div");
    menuContainer.id = "game-menu-container";
    document.body.appendChild(menuContainer);

    // PLAYER INFO
    const playerInfoBtn = document.createElement("button");
    playerInfoBtn.textContent = "PLAYER INFO";
    playerInfoBtn.classList.add("in-game-menu-button");
    playerInfoBtn.onclick = () => {
      this.toggleInventoryMenu();
    };
    menuContainer.appendChild(playerInfoBtn);

    // SKILL BOOK
    const skillBookBtn = document.createElement("button");
    skillBookBtn.textContent = "SKILL BOOK";
    skillBookBtn.classList.add("in-game-menu-button");
    skillBookBtn.onclick = () => {
      this.uiManager.toggleSkillBook();
    };
    menuContainer.appendChild(skillBookBtn);
  }

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

    if (level > oldLevel) {
      for (let lvl = oldLevel; lvl < level; lvl++) {
        // Increase base stats
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
      `Gained ${amount} EXP (Total: ${playerProfile.totalExp})`
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
