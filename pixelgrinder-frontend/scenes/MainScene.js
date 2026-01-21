// File: scenes/MainScene.js

import UIManager from "../managers/UIManager.js";
import SkillManager from "../managers/SkillManager.js";
import MobManager from "../managers/MobManager.js";
import PlayerManager from "../managers/PlayerManager.js";
import InputManager from "../managers/InputManager.js";
import ChatManager from "../managers/ChatManager.js";
import GatherManager from "../managers/GatherManager.js";
import NPCManager from "../managers/NPCManager.js";
import {
  naturalRegeneration,
  playerProfile,
  playerSkills,
  playerEquippedItems,
  playerBackpack,
  TAB_TARGET_RANGE,
  playerBaseStats,
  playerGrowthStats,
  allGameSkills,
} from "../data/MOCKdata.js";
import {
  loadSave,
  saveGame as persistSave,
  clearSave,
} from "../services/SaveService.js";

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

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
    this.npcManager = null;
    this.autoSaveTimer = null;
    this.isPlayerDead = false;

    this.events = new Phaser.Events.EventEmitter();
  }

  preload() {
    // Tiled map
    this.load.tilemapTiledJSON("Map1", "assets/map/map1..tmj");
    this.load.image("terrain", "assets/map/terrain.png");

    // =======================
    //  MOBS (NEW GoblinBeast)
    // =======================
    // Walking (288x48 → 6 frames × 48px width)
    this.load.spritesheet(
      "goblinBeast-walk-down",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Down/Png/GoblinBeastDownWalk.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "goblinBeast-walk-left",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Left/Png/GoblinBeastLeftWalk.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "goblinBeast-walk-right",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Right/Png/GoblinBeastRightWalk.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "goblinBeast-walk-up",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Up/Png/GoblinBeastUpWalk.png",
      { frameWidth: 48, frameHeight: 48 }
    );

    // Death (480x48 → 10 frames × 48px width)
    this.load.spritesheet(
      "goblinBeast-death-down",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Down/Png/GoblinBeastDownDeath.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "goblinBeast-death-left",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Left/Png/GoblinBeastLeftDeath.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "goblinBeast-death-right",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Right/Png/GoblinBeastRightDeath.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "goblinBeast-death-up",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Up/Png/GoblinBeastUpDeath.png",
      { frameWidth: 48, frameHeight: 48 }
    );

    // Attack (512x48 → 8 frames × 64px width)
    this.load.spritesheet(
      "goblinBeast-attack-down",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Down/Png/GoblinBeastDownAttack01.png",
      { frameWidth: 64, frameHeight: 48 }
    );
    this.load.spritesheet(
      "goblinBeast-attack-left",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Left/Png/GoblinBeastLeftAttack01.png",
      { frameWidth: 64, frameHeight: 48 }
    );
    this.load.spritesheet(
      "goblinBeast-attack-right",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Right/Png/GoblinBeastRightAttack01.png",
      { frameWidth: 64, frameHeight: 48 }
    );
    this.load.spritesheet(
      "goblinBeast-attack-up",
      "assets/MOBS/Foozle_2DC0016_Lucifer_Goblin_Beast_Pixel_Art/Up/Png/GoblinBeastUpAttack01.png",
      { frameWidth: 64, frameHeight: 48 }
    );

    // ============ Player Skins ============
    // Necromancer
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

    // Necromancer cast, idle, etc.
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

    // Necromancer idle
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

    // Warrior
    this.load.spritesheet(
      "warrior-run-down",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Down/Png/WarriorDownWalk.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "warrior-run-up",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Up/Png/WarriorUpWalk.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "warrior-run-left",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Left/Png/WarriorLeftWalk.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "warrior-run-right",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Right/Png/WarriorRightWalk.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    // Attack
    this.load.spritesheet(
      "warrior-cast-down",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Down/Png/WarriorDownAttack01.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "warrior-cast-left",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Left/Png/WarriorLeftAttack01.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "warrior-cast-right",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Right/Png/WarriorRightAttack01.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "warrior-cast-up",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Up/Png/WarriorUpAttack01.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    // Idle
    this.load.spritesheet(
      "warrior-idle-down",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Down/Png/WarriorDownIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "warrior-idle-left",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Left/Png/WarriorLeftIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "warrior-idle-right",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Right/Png/WarriorRightIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "warrior-idle-up",
      "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Up/Png/WarriorUpIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );

    // Sorceress
    this.load.spritesheet(
      "sorceress-run-down",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Down/Png/SorceressDownRun.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "sorceress-run-up",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Up/Png/SorceressUpRun.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "sorceress-run-left",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Left/Png/SorceressLeftRun.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "sorceress-run-right",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Right/Png/SorceressRightRun.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    // Attack
    this.load.spritesheet(
      "sorceress-cast-down",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Down/Png/SorceressDownAttack01.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "sorceress-cast-left",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Left/Png/SorceressLeftAttack01.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "sorceress-cast-right",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Right/Png/SorceressRightAttack01.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "sorceress-cast-up",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Up/Png/SorceressUpAttack01.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    // Idle
    this.load.spritesheet(
      "sorceress-idle-down",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Down/Png/SorceressDownIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "sorceress-idle-left",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Left/Png/SorceressLeftIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "sorceress-idle-right",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Right/Png/SorceressRightIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "sorceress-idle-up",
      "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Up/Png/SorceressUpIdle.png",
      { frameWidth: 48, frameHeight: 48 }
    );

    // Skills
    allGameSkills.forEach((skill) => {
      this.load.spritesheet(`${skill.name}_anim`, skill.skillImage, {
        frameWidth: 72,
        frameHeight: 72,
      });
    });

    // NPCs
    this.load.spritesheet("npc-vendor", "assets/npc_vendor_sheet.png", {
      frameWidth: 29,
      frameHeight: 34,
    });
  }

  create() {
    this.previousLevel = playerProfile.level;
    this.playerSkills = playerSkills;

    // Create map
    this.createTilemap();
    // Define animations for player, mobs, skills
    this.defineAnimations();

    // Chat
    this.chatManager = new ChatManager();
    this.chatManager.init();

    // Player
    this.playerManager = new PlayerManager(this);
    this.playerManager.createPlayer(this.map);
    // Allow collisions with gather_rock
    this.physics.add.collider(this.playerManager.player, this.gatherRockLayer);

    const saveData = loadSave();
    if (saveData && saveData.playerState) {
      const { x, y, currentHealth, currentMana } = saveData.playerState;
      if (Number.isFinite(x) && Number.isFinite(y)) {
        this.playerManager.player.setPosition(x, y);
      }
      if (Number.isFinite(currentHealth)) {
        this.playerManager.currentHealth =
          currentHealth > 0 ? currentHealth : this.playerManager.maxHealth;
      }
      if (Number.isFinite(currentMana)) {
        this.playerManager.currentMana = currentMana;
      }
    }

    // Skill Manager
    this.skillManager = new SkillManager(this, () =>
      this.playerManager.getPlayerStats()
    );
    this.skillManager.preloadSkills();

    // Camera
    this.setupCamera();

    // UI
    this.uiManager = new UIManager(this);
    this.uiManager.init(() => {
      this.uiManager.hideStatsMenu();
      this.scene.resume();
    });

    // Mobs
    this.mobManager = new MobManager(this);
    this.mobManager.createMobs(this.map);

    // Skill hotbar
    this.uiManager.setupSkills(playerSkills);

    // Input
    this.inputManager = new InputManager(
      this,
      this.playerManager,
      this.skillManager
    );
    this.inputManager.setupControls(playerSkills);

    // Gathering
    this.gatherManager = new GatherManager(
      this,
      this.playerManager,
      this.uiManager,
      this.chatManager
    );
    this.gatherManager.init(this.gatherRockLayer);

    // NPC Vendors
    this.npcManager = new NPCManager(this);
    this.npcManager.createNPCs("start_zone", this.map);
    if (this.npcManager.npcs) {
      this.physics.add.collider(
        this.playerManager.player,
        this.npcManager.npcs
      );
    }

    // Emit stats on init
    this.emitStatsUpdate();
    this.skillManager.createSkillAnimations();

    // Natural regen
    this.time.addEvent({
      delay: naturalRegeneration.regenerationTime,
      callback: () => this.playerManager.regenerateStats(naturalRegeneration),
      loop: true,
    });

    // Show initial XP
    const { level, currentExp, nextLevelExp } = this.calculatePlayerLevel(
      playerProfile.totalExp
    );
    this.chatManager.addMessage(`Player Level: ${level}`);
    this.chatManager.addMessage(
      `EXP: ${currentExp} / ${nextLevelExp} to next level`
    );

    // In-game menu
    this.createInGameMenuButtons();

    this.startAutoSave();
  }

  update(time, delta) {
    const cursors = this.inputManager.getInputKeys();
    const isCasting = this.skillManager.isCasting;

    // Player movement
    this.playerManager.handleMovement(cursors, isCasting);

    // Mobs AI
    this.mobManager.updateMobs(this.playerManager.player);

    // Gathering logic
    if (this.gatherManager) {
      this.gatherManager.update();
    }

    if (this.npcManager) {
      this.npcManager.update();
    }
  }

  // ------------------------------
  //      TILEMAP LAYERS
  // ------------------------------
  createTilemap() {
    this.map = this.make.tilemap({ key: "Map1" });
    const tileset = this.map.addTilesetImage("terrain", "terrain");

    // background, paths - walkable
    this.backgroundLayer = this.map.createLayer("background", tileset, 0, 0);
    this.pathsLayer = this.map.createLayer("paths", tileset, 0, 0);

    // collisions, gather_rock - collidable
    this.collisionLayer = this.map.createLayer("collisions", tileset, 0, 0);
    // Mark all tiles (except -1) as colliding in collisions layer
    this.collisionLayer.setCollisionByExclusion([-1]);

    this.gatherRockLayer = this.map.createLayer("gather_rock", tileset, 0, 0);
    // Mark all tiles (except -1) as colliding in gather_rock layer
    this.gatherRockLayer.setCollisionByExclusion([-1]);
  }

  // ------------------------------
  //     ANIMATIONS
  // ------------------------------
  defineAnimations() {
    // =======================
    // Necromancer
    // =======================
    this.anims.create({
      key: "necromancer-run-down",
      frames: this.anims.generateFrameNumbers("necromancer-run-down", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-run-up",
      frames: this.anims.generateFrameNumbers("necromancer-run-up", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-run-left",
      frames: this.anims.generateFrameNumbers("necromancer-run-left", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-run-right",
      frames: this.anims.generateFrameNumbers("necromancer-run-right", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // cast
    this.anims.create({
      key: "necromancer-cast-down",
      frames: this.anims.generateFrameNumbers("necromancer-cast-down", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "necromancer-cast-left",
      frames: this.anims.generateFrameNumbers("necromancer-cast-left", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "necromancer-cast-right",
      frames: this.anims.generateFrameNumbers("necromancer-cast-right", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "necromancer-cast-up",
      frames: this.anims.generateFrameNumbers("necromancer-cast-up", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: 0,
    });

    // idle
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

    // =======================
    // WARRIOR
    // =======================
    this.anims.create({
      key: "warrior-run-down",
      frames: this.anims.generateFrameNumbers("warrior-run-down", {
        start: 0,
        end: 5,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-run-up",
      frames: this.anims.generateFrameNumbers("warrior-run-up", {
        start: 0,
        end: 5,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-run-left",
      frames: this.anims.generateFrameNumbers("warrior-run-left", {
        start: 0,
        end: 5,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-run-right",
      frames: this.anims.generateFrameNumbers("warrior-run-right", {
        start: 0,
        end: 5,
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: "warrior-cast-down",
      frames: this.anims.generateFrameNumbers("warrior-cast-down", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "warrior-cast-left",
      frames: this.anims.generateFrameNumbers("warrior-cast-left", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "warrior-cast-right",
      frames: this.anims.generateFrameNumbers("warrior-cast-right", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "warrior-cast-up",
      frames: this.anims.generateFrameNumbers("warrior-cast-up", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: 0,
    });

    this.anims.create({
      key: "warrior-idle-down",
      frames: this.anims.generateFrameNumbers("warrior-idle-down", {
        start: 0,
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-idle-left",
      frames: this.anims.generateFrameNumbers("warrior-idle-left", {
        start: 0,
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-idle-right",
      frames: this.anims.generateFrameNumbers("warrior-idle-right", {
        start: 0,
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-idle-up",
      frames: this.anims.generateFrameNumbers("warrior-idle-up", {
        start: 0,
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });

    // =======================
    // SORCERESS
    // =======================
    this.anims.create({
      key: "sorceress-run-down",
      frames: this.anims.generateFrameNumbers("sorceress-run-down", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-run-up",
      frames: this.anims.generateFrameNumbers("sorceress-run-up", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-run-left",
      frames: this.anims.generateFrameNumbers("sorceress-run-left", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-run-right",
      frames: this.anims.generateFrameNumbers("sorceress-run-right", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // cast
    this.anims.create({
      key: "sorceress-cast-down",
      frames: this.anims.generateFrameNumbers("sorceress-cast-down", {
        start: 0,
        end: 4,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "sorceress-cast-left",
      frames: this.anims.generateFrameNumbers("sorceress-cast-left", {
        start: 0,
        end: 4,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "sorceress-cast-right",
      frames: this.anims.generateFrameNumbers("sorceress-cast-right", {
        start: 0,
        end: 4,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "sorceress-cast-up",
      frames: this.anims.generateFrameNumbers("sorceress-cast-up", {
        start: 0,
        end: 4,
      }),
      frameRate: 10,
      repeat: 0,
    });

    // idle
    this.anims.create({
      key: "sorceress-idle-down",
      frames: this.anims.generateFrameNumbers("sorceress-idle-down", {
        start: 0,
        end: 5,
      }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-idle-left",
      frames: this.anims.generateFrameNumbers("sorceress-idle-left", {
        start: 0,
        end: 5,
      }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-idle-right",
      frames: this.anims.generateFrameNumbers("sorceress-idle-right", {
        start: 0,
        end: 5,
      }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-idle-up",
      frames: this.anims.generateFrameNumbers("sorceress-idle-up", {
        start: 0,
        end: 5,
      }),
      frameRate: 6,
      repeat: -1,
    });

    // =======================
    // Goblin Beast (for "slime")
    // =======================
    // Walk
    this.anims.create({
      key: "goblinBeast-walk-down",
      frames: this.anims.generateFrameNumbers("goblinBeast-walk-down", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "goblinBeast-walk-left",
      frames: this.anims.generateFrameNumbers("goblinBeast-walk-left", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "goblinBeast-walk-right",
      frames: this.anims.generateFrameNumbers("goblinBeast-walk-right", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "goblinBeast-walk-up",
      frames: this.anims.generateFrameNumbers("goblinBeast-walk-up", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Death
    this.anims.create({
      key: "goblinBeast-death-down",
      frames: this.anims.generateFrameNumbers("goblinBeast-death-down", {
        start: 0,
        end: 9,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "goblinBeast-death-left",
      frames: this.anims.generateFrameNumbers("goblinBeast-death-left", {
        start: 0,
        end: 9,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "goblinBeast-death-right",
      frames: this.anims.generateFrameNumbers("goblinBeast-death-right", {
        start: 0,
        end: 9,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "goblinBeast-death-up",
      frames: this.anims.generateFrameNumbers("goblinBeast-death-up", {
        start: 0,
        end: 9,
      }),
      frameRate: 10,
      repeat: 0,
    });

    // Attack
    this.anims.create({
      key: "goblinBeast-attack-down",
      frames: this.anims.generateFrameNumbers("goblinBeast-attack-down", {
        start: 0,
        end: 7,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "goblinBeast-attack-left",
      frames: this.anims.generateFrameNumbers("goblinBeast-attack-left", {
        start: 0,
        end: 7,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "goblinBeast-attack-right",
      frames: this.anims.generateFrameNumbers("goblinBeast-attack-right", {
        start: 0,
        end: 7,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "goblinBeast-attack-up",
      frames: this.anims.generateFrameNumbers("goblinBeast-attack-up", {
        start: 0,
        end: 7,
      }),
      frameRate: 10,
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

    // =======================
    // NPC Vendor (6x4 sheet)
    // =======================
    const npcFrameCount = 6;
    const npcRows = {
      down: 0,
      up: 1,
      right: 2,
      left: 3,
    };
    Object.entries(npcRows).forEach(([dir, row]) => {
      this.anims.create({
        key: `npc-walk-${dir}`,
        frames: this.anims.generateFrameNumbers("npc-vendor", {
          start: row * npcFrameCount,
          end: row * npcFrameCount + (npcFrameCount - 1),
        }),
        frameRate: 8,
        repeat: -1,
      });
    });
  }

  // ------------------------------
  //     CAMERA
  // ------------------------------
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

  // ------------------------------
  //     UI + MENUS
  // ------------------------------
  createInGameMenuButtons() {
    const existingMenu = document.getElementById("game-menu-container");
    if (existingMenu) {
      return;
    }
    const menuContainer = document.createElement("div");
    menuContainer.id = "game-menu-container";
    document.body.appendChild(menuContainer);

    const playerInfoBtn = document.createElement("button");
    playerInfoBtn.textContent = "PLAYER INFO";
    playerInfoBtn.classList.add("in-game-menu-button");
    playerInfoBtn.onclick = () => {
      this.toggleInventoryMenu();
    };
    menuContainer.appendChild(playerInfoBtn);

    const skillBookBtn = document.createElement("button");
    skillBookBtn.textContent = "SKILL BOOK";
    skillBookBtn.classList.add("in-game-menu-button");
    skillBookBtn.onclick = () => {
      this.uiManager.toggleSkillBook();
    };
    menuContainer.appendChild(skillBookBtn);

    const newGameBtn = document.createElement("button");
    newGameBtn.textContent = "NEW GAME";
    newGameBtn.classList.add("in-game-menu-button");
    newGameBtn.onclick = () => {
      const confirmed = window.confirm(
        "Start a new game? Your current save will be deleted."
      );
      if (!confirmed) return;
      clearSave();
      const menuContainer = document.getElementById("game-menu-container");
      if (menuContainer) {
        menuContainer.remove();
      }
      this.scene.start("CharacterCreationScene");
    };
    menuContainer.appendChild(newGameBtn);
  }

  // ------------------------------
  //     PLAYER LEVEL, EXP
  // ------------------------------
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

  // ------------------------------
  //     STATS / UI UPDATES
  // ------------------------------
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
      gold: playerProfile.gold,
      gameMode: playerProfile.gameMode,
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
      gold: playerProfile.gold,
      gameMode: playerProfile.gameMode,
    };
    this.uiManager.updateUI(uiStats);
  }

  // Stats Menu
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

  // ------------------------------
  //     SKILL USAGE
  // ------------------------------
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

  // ------------------------------
  //     TARGETING
  // ------------------------------
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

  // ------------------------------
  //     PLAYER DEATH
  // ------------------------------
  handlePlayerDeath() {
    const mode = playerProfile.gameMode || "normal";
    this.chatManager.addMessage("Player died!");
    if (this.mobManager) {
      this.mobManager.clearAggro();
    }

    if (mode === "hardcore") {
      if (this.isPlayerDead) return;
      this.isPlayerDead = true;
      const deathText = this.add
        .text(
          this.cameras.main.worldView.centerX,
          this.cameras.main.worldView.centerY,
          "You died permanently",
          {
            font: "20px Arial",
            fill: "#ff5555",
            stroke: "#000000",
            strokeThickness: 3,
          }
        )
        .setOrigin(0.5);
      this.tweens.add({
        targets: deathText,
        alpha: 0,
        duration: 1500,
        delay: 500,
        onComplete: () => deathText.destroy(),
      });
      clearSave();
      this.time.delayedCall(2000, () => {
        this.isPlayerDead = false;
        this.scene.start("CharacterCreationScene");
      });
      return;
    }

    if (this.isPlayerDead) return;
    this.isPlayerDead = true;
    const respawnText = this.add
      .text(
        this.cameras.main.worldView.centerX,
        this.cameras.main.worldView.centerY,
        "You died. Respawning in 5...",
        {
          font: "20px Arial",
          fill: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
        }
      )
      .setOrigin(0.5);
    let secondsLeft = 5;
    const countdownTimer = this.time.addEvent({
      delay: 1000,
      repeat: 4,
      callback: () => {
        secondsLeft -= 1;
        respawnText.setText(`You died. Respawning in ${secondsLeft}...`);
      },
    });

    this.time.delayedCall(5000, () => {
      countdownTimer.remove(false);
      respawnText.destroy();
      const heroStart = this.map.findObject(
        "GameObjects",
        (obj) => obj.name === "HeroStart"
      );
      if (heroStart) {
        this.playerManager.player.setPosition(heroStart.x, heroStart.y);
      }
      this.playerManager.replenishHealthAndMana();
      this.updateUI();
      this.emitStatsUpdate();
      this.saveGame();
      this.isPlayerDead = false;
    });

    return;
  }

  toggleInventoryMenu() {
    this.uiManager.toggleInventory();
  }

  startAutoSave() {
    if (this.autoSaveTimer) {
      this.autoSaveTimer.remove(false);
    }
    this.autoSaveTimer = this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: () => this.saveGame(),
    });
  }

  saveGame() {
    const player = this.playerManager.player;
    const payload = {
      playerProfile: deepClone(playerProfile),
      playerBaseStats: deepClone(playerBaseStats),
      playerEquippedItems: deepClone(playerEquippedItems),
      playerBackpack: deepClone(playerBackpack),
      playerSkills: deepClone(playerSkills),
      playerState: {
        x: player.x,
        y: player.y,
        currentHealth: this.playerManager.currentHealth,
        currentMana: this.playerManager.currentMana,
      },
    };
    persistSave(payload);
  }
}
