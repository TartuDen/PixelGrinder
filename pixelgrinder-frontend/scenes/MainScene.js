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
    // Tiled map for the main game
    this.load.tilemapTiledJSON("Map1", "assets/map/map1..tmj"); // Ensure path is correct
    this.load.image("terrain", "assets/map/terrain.png");

    // Mobs
    this.load.spritesheet("mobs", "assets/mobs.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("dead_mobs", "assets/dead_mobs.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    // ============ Player skins ================
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

    // Necromancer cast
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
  }

  create() {
    this.previousLevel = playerProfile.level;

    this.createTilemap();
    this.defineAnimations();

    // Chat
    this.chatManager = new ChatManager();
    this.chatManager.init();

    // Player
    this.playerManager = new PlayerManager(this);
    this.playerManager.createPlayer(this.map);

    this.physics.add.collider(this.playerManager.player, this.gatherRockLayer);

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
    this.chatManager.addMessage(`EXP: ${currentExp} / ${nextLevelExp} to next level`);

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
    // =======================
    // NECROMANCER
    // =======================
    // If your run-down sprite has frames 0..5, do end: 5
    this.anims.create({
      key: "necromancer-run-down",
      frames: this.anims.generateFrameNumbers("necromancer-run-down", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-run-up",
      frames: this.anims.generateFrameNumbers("necromancer-run-up", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-run-left",
      frames: this.anims.generateFrameNumbers("necromancer-run-left", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-run-right",
      frames: this.anims.generateFrameNumbers("necromancer-run-right", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });

    // cast
    this.anims.create({
      key: "necromancer-cast-down",
      frames: this.anims.generateFrameNumbers("necromancer-cast-down", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "necromancer-cast-left",
      frames: this.anims.generateFrameNumbers("necromancer-cast-left", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "necromancer-cast-right",
      frames: this.anims.generateFrameNumbers("necromancer-cast-right", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "necromancer-cast-up",
      frames: this.anims.generateFrameNumbers("necromancer-cast-up", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });

    // idle
    this.anims.create({
      key: "necromancer-idle-down",
      frames: this.anims.generateFrameNumbers("necromancer-idle-down", { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-idle-left",
      frames: this.anims.generateFrameNumbers("necromancer-idle-left", { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-idle-right",
      frames: this.anims.generateFrameNumbers("necromancer-idle-right", { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "necromancer-idle-up",
      frames: this.anims.generateFrameNumbers("necromancer-idle-up", { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });

    // =======================
    // WARRIOR
    // =======================
    this.anims.create({
      key: "warrior-run-down",
      frames: this.anims.generateFrameNumbers("warrior-run-down", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-run-up",
      frames: this.anims.generateFrameNumbers("warrior-run-up", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-run-left",
      frames: this.anims.generateFrameNumbers("warrior-run-left", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-run-right",
      frames: this.anims.generateFrameNumbers("warrior-run-right", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: "warrior-cast-down",
      frames: this.anims.generateFrameNumbers("warrior-cast-down", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "warrior-cast-left",
      frames: this.anims.generateFrameNumbers("warrior-cast-left", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "warrior-cast-right",
      frames: this.anims.generateFrameNumbers("warrior-cast-right", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "warrior-cast-up",
      frames: this.anims.generateFrameNumbers("warrior-cast-up", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });

    this.anims.create({
      key: "warrior-idle-down",
      frames: this.anims.generateFrameNumbers("warrior-idle-down", { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-idle-left",
      frames: this.anims.generateFrameNumbers("warrior-idle-left", { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-idle-right",
      frames: this.anims.generateFrameNumbers("warrior-idle-right", { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "warrior-idle-up",
      frames: this.anims.generateFrameNumbers("warrior-idle-up", { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });

    // =======================
    // SORCERESS
    // =======================
    // If your run-down sprite only has frames 0..5, do end=5; if it truly has 7 frames, keep 6 or 7
    this.anims.create({
      key: "sorceress-run-down",
      frames: this.anims.generateFrameNumbers("sorceress-run-down", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-run-up",
      frames: this.anims.generateFrameNumbers("sorceress-run-up", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-run-left",
      frames: this.anims.generateFrameNumbers("sorceress-run-left", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-run-right",
      frames: this.anims.generateFrameNumbers("sorceress-run-right", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });

    // cast
    this.anims.create({
      key: "sorceress-cast-down",
      frames: this.anims.generateFrameNumbers("sorceress-cast-down", { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "sorceress-cast-left",
      frames: this.anims.generateFrameNumbers("sorceress-cast-left", { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "sorceress-cast-right",
      frames: this.anims.generateFrameNumbers("sorceress-cast-right", { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "sorceress-cast-up",
      frames: this.anims.generateFrameNumbers("sorceress-cast-up", { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0,
    });

    // idle
    this.anims.create({
      key: "sorceress-idle-down",
      frames: this.anims.generateFrameNumbers("sorceress-idle-down", { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-idle-left",
      frames: this.anims.generateFrameNumbers("sorceress-idle-left", { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-idle-right",
      frames: this.anims.generateFrameNumbers("sorceress-idle-right", { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "sorceress-idle-up",
      frames: this.anims.generateFrameNumbers("sorceress-idle-up", { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });

    // =======================
    // MOBS
    // =======================
    this.anims.create({
      key: "mob-walk-down",
      frames: this.anims.generateFrameNumbers("mobs", { start: 48, end: 50 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-left",
      frames: this.anims.generateFrameNumbers("mobs", { start: 60, end: 62 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-right",
      frames: this.anims.generateFrameNumbers("mobs", { start: 72, end: 74 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-up",
      frames: this.anims.generateFrameNumbers("mobs", { start: 84, end: 86 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-dead",
      frames: this.anims.generateFrameNumbers("dead_mobs", { start: 7, end: 7 }),
      frameRate: 0,
      repeat: 0,
    });

    // =======================
    // SKILLS
    // =======================
    allGameSkills.forEach((skill) => {
      // If "magic_wip_anim" only has frames 0..3, but you did animationSeq [0,7], you must fix it:
      this.anims.create({
        key: `${skill.name}_anim`,
        frames: this.anims.generateFrameNumbers(`${skill.name}_anim`, {
          start: 0,
          end: skill.animationSeq[1], // if it only has 4 frames, use 3
        }),
        frameRate: 15,
        repeat: 0,
      });
    });
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.playerManager.player);
  }

  createInGameMenuButtons() {
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
