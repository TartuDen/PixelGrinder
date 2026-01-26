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
import { map1Data } from "../data/generated/map1Data.js";
import { generateProceduralMap } from "../data/generated/proceduralMap.js";
import { mapMode, mapSeed, zoneWidth, zoneHeight, editorEnabled } from "../config.js";
import { calculateLevelProgress } from "../helpers/experience.js";
import { makeDraggable } from "../helpers/drag.js";
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

    this.editorActive = false;
    this.editorData = null;
    this.editorUI = null;
    this.editorLayer = "background";
    this.editorTileIndex = 0;
    this.editorIsPainting = false;
    this.editorMode = "tiles";
    this.editorSpawnSelection = null;
    this.editorSpawnOverlay = null;
    this.editorSpawnDrag = null;
    this.editorPalette = null;
    this.editorAutoTile = null;
    this.editorAutoTileEnabled = false;
    this.editorPaletteSelection = null;
    this.editorPaletteSelecting = false;
    this.editorPaletteSelectionStart = null;
    this.editorBlendBaseTile = 0;
    this.editorUndoStack = [];
    this.editorCurrentChanges = null;
    this.editorCurrentLayer = null;
    this.editorCameraDrag = null;
    this.editorPrevZoom = null;
    this.adminNpcPlacementActive = false;
    this.adminNpcPrevZoom = null;
    this.minimapOffset = { x: 0, y: 0 };
    this.minimapDragActive = false;
    this.minimapDragOffset = { x: 0, y: 0 };
    this.editorRoadSet = null;
    this.editorRoadOffset = 0;
    this.editorRoadTargetLayer = "paths";
    this.editorTileIndexOverlay = null;

    this.events = new Phaser.Events.EventEmitter();
  }

  preload() {
    // Tiled map (removed; using generated map data)
    this.load.image("terrain", "assets/map/terrain.png");

    // =======================
    //  MOBS (NEW GoblinBeast)
    // =======================
    this.load.spritesheet("mobs-sheet", "assets/mobs.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
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
    this.mobManager = null;
    this.uiManager = null;

    document.body.classList.remove("char-creation-active");

    if (!this.anims.__pgWrapped) {
      const originalCreate = this.anims.create.bind(this.anims);
      this.anims.create = (config) => {
        try {
          return originalCreate(config);
        } catch (err) {
          const details = [
            "Animation create failed",
            `key: ${config?.key}`,
            `frames: ${config?.frames ? "present" : "missing"}`,
            `frameRate: ${config?.frameRate}`,
            `repeat: ${config?.repeat}`,
            err?.stack || err?.message || String(err),
          ].join("\n");
          console.error(details);
          if (window.__pgDebugOverlay) {
            window.__pgDebugOverlay("Animation create failed", details);
          }
          return null;
        }
      };
      this.anims.__pgWrapped = true;
    }

    this.previousLevel = playerProfile.level;
    this.playerSkills = playerSkills;

    // Create map
    this.createTilemap();
    // Define animations once (AnimationManager is global across scene restarts)
    if (!this.anims.exists("necromancer-run-down")) {
      this.defineAnimations();
    }

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
    this.cameras.main.roundPixels = true;

    // UI
    this.uiManager = new UIManager(this);
    this.uiManager.init(() => {
      this.uiManager.hideStatsMenu();
      this.scene.resume();
    });

    // Mobs
    this.mobManager = new MobManager(this);
    this.mobManager.createMobs(this.map);

    // Minimap
    this.createMinimap();

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
    this.currentZoneId = "start_zone";
    this.npcManager.createNPCs(this.currentZoneId, this.map);
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
      callback: () => {
        if (this.uiManager?.isAdminOpen) {
          return;
        }
        this.playerManager.regenerateStats(naturalRegeneration);
      },
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
    this.uiManager.createInGameMenuButtons();

    this.startAutoSave();

    if (editorEnabled) {
      this.initMapEditor();
    }

    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
      if (this.editorActive) return;
      if (!this.adminNpcPlacementActive && !this.uiManager?.isAdminOpen) return;
      if (pointer?.event?.preventDefault) {
        pointer.event.preventDefault();
      }
      const zoomStep = 0.1;
      const minZoom = 0.2;
      const maxZoom = 3;
      const direction = deltaY > 0 ? -1 : 1;
      const nextZoom = Phaser.Math.Clamp(
        this.cameras.main.zoom + direction * zoomStep,
        minZoom,
        maxZoom
      );
      this.cameras.main.setZoom(nextZoom);
    });

    this.input.on("pointerdown", (pointer) => {
      if (!this.uiManager?.isAdminOpen || this.editorActive) return;
      if (!this.minimapConfig) return;
      const { size } = this.minimapConfig;
      const origin = this.getMinimapOrigin();
      const withinX = pointer.x >= origin.x && pointer.x <= origin.x + size;
      const withinY = pointer.y >= origin.y && pointer.y <= origin.y + size;
      if (!withinX || !withinY) return;
      this.minimapDragActive = true;
      this.minimapDragOffset = {
        x: pointer.x - origin.x,
        y: pointer.y - origin.y,
      };
    });

    this.input.on("pointermove", (pointer) => {
      if (!this.minimapDragActive) return;
      const { size, padding } = this.minimapConfig || { size: 0, padding: 0 };
      const cam = this.cameras.main;
      const baseX = cam.width - size - padding;
      const baseY = padding;
      const nextX = pointer.x - this.minimapDragOffset.x;
      const nextY = pointer.y - this.minimapDragOffset.y;
      const minX = -baseX;
      const maxX = cam.width - size - baseX;
      const minY = -baseY;
      const maxY = cam.height - size - baseY;
      this.minimapOffset.x = Phaser.Math.Clamp(nextX, minX, maxX);
      this.minimapOffset.y = Phaser.Math.Clamp(nextY, minY, maxY);
      this.updateMinimapEntities();
    });

    this.input.on("pointerup", () => {
      if (!this.minimapDragActive) return;
      this.minimapDragActive = false;
    });
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

    this.updateMinimapEntities();
    this.updateEditorTileOverlay();
  }

  // ------------------------------
  //      TILEMAP LAYERS
  // ------------------------------
  createTilemap() {
    let data =
      mapMode === "procedural"
        ? generateProceduralMap({
            seed: mapSeed,
            width: zoneWidth,
            height: zoneHeight,
          })
        : map1Data;
    const editorOverride = this.loadEditorMapOverride();
    if (editorOverride) {
      data = editorOverride;
    }

    this.map = this.make.tilemap({
      tileWidth: data.tileWidth,
      tileHeight: data.tileHeight,
      width: data.width,
      height: data.height,
    });
    const tileset = this.map.addTilesetImage("terrain", "terrain");

    this.backgroundLayer = this.map.createBlankLayer("background", tileset, 0, 0);
    this.pathsLayer = this.map.createBlankLayer("paths", tileset, 0, 0);
    this.collisionLayer = this.map.createBlankLayer("collisions", tileset, 0, 0);
    this.gatherRockLayer = this.map.createBlankLayer("gather_rock", tileset, 0, 0);

    if (data.layers.background) {
      this.backgroundLayer.putTilesAt(data.layers.background, 0, 0);
    }
    if (data.layers.paths) {
      this.pathsLayer.putTilesAt(data.layers.paths, 0, 0);
    }
    if (data.layers.collisions) {
      this.collisionLayer.putTilesAt(data.layers.collisions, 0, 0);
      this.collisionLayer.setCollisionByExclusion([-1]);
    }
    if (data.layers.gather_rock) {
      this.gatherRockLayer.putTilesAt(data.layers.gather_rock, 0, 0);
      this.gatherRockLayer.setCollisionByExclusion([-1]);
    }

    const objects = Object.keys(data.objects || {}).map((name) => ({
      name,
      objects: data.objects[name],
    }));
    this.map.objects = objects;

    this.editorData = data;
  }

  initMapEditor() {
    this.editorActive = false;
    this.editorLayer = "background";
    this.editorTileIndex = 0;
    this.editorMode = "tiles";

    this.editorUI = document.getElementById("map-editor");
    if (!this.editorUI) {
      this.editorUI = document.createElement("div");
      this.editorUI.id = "map-editor";
      this.editorUI.style.display = "none";
      this.editorUI.innerHTML = `
        <div class="map-editor-header">Map Editor (F2)</div>
        <div class="map-editor-row">
          <label>Mode</label>
          <select id="map-editor-mode">
            <option value="tiles">tiles</option>
            <option value="terrain">terrain</option>
            <option value="spawns">spawns</option>
          </select>
        </div>
        <div class="map-editor-row">
          <label>Layer</label>
          <select id="map-editor-layer">
            <option value="background">background</option>
            <option value="paths">paths</option>
            <option value="collisions">collisions</option>
            <option value="gather_rock">gather_rock</option>
          </select>
        </div>
        <div class="map-editor-row">
          <label>Tile Index</label>
          <input id="map-editor-tile" type="number" min="-1" step="1" value="0" />
        </div>
        <div class="map-editor-row">
          <label>Base Tile</label>
          <input id="map-editor-base-tile" type="number" min="-1" step="1" value="0" />
        </div>
        <div class="map-editor-row">
          <label>Sets</label>
          <select id="map-editor-road-set">
            <option value="0" data-target="paths">road 1</option>
            <option value="3" data-target="paths">road 2</option>
            <option value="6" data-target="paths">road 3</option>
            <option value="0" data-target="paths" data-row="6" data-col="0">grass 1</option>
            <option value="0" data-target="paths" data-row="6" data-col="3">grass 2</option>
            <option value="0" data-target="paths" data-row="6" data-col="6">grass 3</option>
            <option value="0" data-target="paths" data-row="12" data-col="0">sand 1</option>
            <option value="0" data-target="paths" data-row="12" data-col="3">sand 2</option>
            <option value="0" data-target="collisions" data-row="6" data-col="9">tallGrass 1</option>
            <option value="0" data-target="collisions" data-row="6" data-col="12">tallGrass 2</option>
            <option value="0" data-target="collisions" data-row="6" data-col="15">tallGrass 3</option>
            <option value="0" data-target="collisions" data-row="12" data-col="6">innerWater 1</option>
            <option value="0" data-target="collisions" data-row="12" data-col="9">fire 1</option>
            <option value="9" data-target="collisions">abyss 1</option>
            <option value="12" data-target="collisions">abyss 2</option>
            <option value="15" data-target="collisions">abyss 3</option>
            <option value="18" data-target="collisions">water 1</option>
          </select>
        </div>
        <div class="map-editor-row">
          <label>Tile IDs</label>
          <input id="map-editor-show-ids" type="checkbox" checked />
        </div>
        <div class="map-editor-row">
          <label>Auto</label>
          <input id="map-editor-autotile" type="checkbox" />
        </div>
        <div class="map-editor-section">
          <div class="map-editor-subheader">Palette</div>
          <div class="map-editor-palette-wrap">
            <canvas id="map-editor-palette"></canvas>
          </div>
        </div>
        <div class="map-editor-section">
          <div class="map-editor-subheader">Spawn Zones</div>
          <div class="map-editor-row">
            <label>Zone</label>
            <select id="map-editor-spawn-list"></select>
          </div>
          <div class="map-editor-row">
            <label>X</label>
            <input id="map-editor-spawn-x" type="number" step="1" />
          </div>
          <div class="map-editor-row">
            <label>Y</label>
            <input id="map-editor-spawn-y" type="number" step="1" />
          </div>
          <div class="map-editor-row">
            <label>W</label>
            <input id="map-editor-spawn-w" type="number" min="1" step="1" />
          </div>
          <div class="map-editor-row">
            <label>H</label>
            <input id="map-editor-spawn-h" type="number" min="1" step="1" />
          </div>
          <div class="map-editor-row">
            <button id="map-editor-spawn-add">Add Zone</button>
            <button id="map-editor-spawn-remove">Remove Zone</button>
          </div>
          <div class="map-editor-row">
            <button id="map-editor-spawn-apply">Apply Zone</button>
          </div>
        </div>
        <div class="map-editor-row">
          <button id="map-editor-save">Save Local</button>
          <button id="map-editor-download">Download JSON</button>
        </div>
        <div class="map-editor-row">
          <button id="map-editor-clear">Clear Layer</button>
        </div>
        <div class="map-editor-help">
          Tiles: Paint LMB | Erase Shift+LMB | Pick Alt+LMB<br />
          Auto: Drag 3x3 palette block | Draw to auto-edge<br />
          Terrain: Blend edges using Base Tile + Auto set<br />
          Spawns: Drag zone to move | Edit X/Y/W/H then Apply
        </div>
      `;
      document.body.appendChild(this.editorUI);
    }

    const editorHeader = this.editorUI.querySelector(".map-editor-header");
    if (editorHeader && !this.editorUI.__pgDraggable) {
      const rect = this.editorUI.getBoundingClientRect();
      this.editorUI.style.left = `${rect.left}px`;
      this.editorUI.style.top = `${rect.top}px`;
      this.editorUI.style.right = "auto";
      this.editorUI.style.bottom = "auto";
      editorHeader.style.cursor = "move";
      makeDraggable(this.editorUI, editorHeader);
      this.editorUI.__pgDraggable = true;
    }

    const modeSelect = this.editorUI.querySelector("#map-editor-mode");
    const layerSelect = this.editorUI.querySelector("#map-editor-layer");
    const tileInput = this.editorUI.querySelector("#map-editor-tile");
    const baseTileInput = this.editorUI.querySelector("#map-editor-base-tile");
    const roadSetInput = this.editorUI.querySelector("#map-editor-road-set");
    const showIdsInput = this.editorUI.querySelector("#map-editor-show-ids");
    const autoToggle = this.editorUI.querySelector("#map-editor-autotile");
    const paletteCanvas = this.editorUI.querySelector("#map-editor-palette");
    const spawnList = this.editorUI.querySelector("#map-editor-spawn-list");
    const spawnX = this.editorUI.querySelector("#map-editor-spawn-x");
    const spawnY = this.editorUI.querySelector("#map-editor-spawn-y");
    const spawnW = this.editorUI.querySelector("#map-editor-spawn-w");
    const spawnH = this.editorUI.querySelector("#map-editor-spawn-h");
    const spawnAddBtn = this.editorUI.querySelector("#map-editor-spawn-add");
    const spawnRemoveBtn = this.editorUI.querySelector("#map-editor-spawn-remove");
    const spawnApplyBtn = this.editorUI.querySelector("#map-editor-spawn-apply");
    const saveBtn = this.editorUI.querySelector("#map-editor-save");
    const downloadBtn = this.editorUI.querySelector("#map-editor-download");
    const clearBtn = this.editorUI.querySelector("#map-editor-clear");

    modeSelect.addEventListener("change", () => {
      this.editorMode = modeSelect.value;
      this.renderEditorSpawnOverlay();
    });
    layerSelect.addEventListener("change", () => {
      this.editorLayer = layerSelect.value;
      this.updateEditorSetOptions(layerSelect, roadSetInput);
    });
    tileInput.addEventListener("change", () => {
      const nextValue = Number(tileInput.value);
      if (Number.isFinite(nextValue)) {
        this.editorTileIndex = Math.floor(nextValue);
        this.renderEditorPalette();
      }
    });
    baseTileInput.addEventListener("change", () => {
      const nextValue = Number(baseTileInput.value);
      if (Number.isFinite(nextValue)) {
        this.editorBlendBaseTile = Math.floor(nextValue);
      }
    });
    roadSetInput.addEventListener("change", () => {
      const option = roadSetInput.selectedOptions[0];
      if (!option) return;
      this.applyEditorRoadSelection(option, layerSelect);
    });
    showIdsInput.addEventListener("change", () => {
      if (!this.editorTileIndexOverlay) return;
      this.editorTileIndexOverlay.enabled = showIdsInput.checked;
      this.editorTileIndexOverlay.container.setVisible(
        this.editorActive && this.editorTileIndexOverlay.enabled
      );
    });
    autoToggle.addEventListener("change", () => {
      this.editorAutoTileEnabled = autoToggle.checked;
    });
    saveBtn.addEventListener("click", () => this.saveEditorMap());
    downloadBtn.addEventListener("click", () => this.downloadEditorMap());
    clearBtn.addEventListener("click", () => this.clearEditorLayer());
    spawnList.addEventListener("change", () => {
      const selectedId = Number(spawnList.value);
      const zone = this.getEditorSpawnZones().find((entry) => entry.id === selectedId);
      this.selectEditorSpawnZone(zone || null);
    });
    spawnAddBtn.addEventListener("click", () => this.addEditorSpawnZone());
    spawnRemoveBtn.addEventListener("click", () => this.removeEditorSpawnZone());
    spawnApplyBtn.addEventListener("click", () =>
      this.applyEditorSpawnInputs({
        x: spawnX.value,
        y: spawnY.value,
        w: spawnW.value,
        h: spawnH.value,
      })
    );

    const toggleEditor = () => {
      this.editorActive = !this.editorActive;
      this.editorUI.style.display = this.editorActive ? "block" : "none";
      this.toggleEditorHud(this.editorActive);
      this.renderEditorSpawnOverlay();
      if (this.editorActive) {
        this.editorPrevZoom = this.cameras.main.zoom;
        this.cameras.main.stopFollow();
      } else {
        this.cameras.main.setZoom(this.editorPrevZoom || 1);
        this.startCenteredFollow();
      }
      if (this.editorTileIndexOverlay) {
        this.editorTileIndexOverlay.container.setVisible(
          this.editorActive && this.editorTileIndexOverlay.enabled
        );
      }
    };
    this.input.keyboard.on("keydown-F2", toggleEditor);
    const mapEditorToggle = document.getElementById("map-editor-toggle-button");
    if (mapEditorToggle && !mapEditorToggle.__pgBound) {
      mapEditorToggle.__pgBound = true;
      mapEditorToggle.addEventListener("click", toggleEditor);
    }
    document.addEventListener("contextmenu", (event) => {
      if (!this.editorActive) return;
      event.preventDefault();
    });
    this.input.keyboard.on("keydown", (event) => {
      if (!this.editorActive) return;
      const isUndo =
        (event.key === "z" || event.key === "Z") && (event.ctrlKey || event.metaKey);
      if (!isUndo) return;
      event.preventDefault();
      this.undoEditorAction();
    });
    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.editorActive) return;
      if (pointer?.event?.preventDefault) {
        pointer.event.preventDefault();
      }
      const zoomStep = 0.1;
      const minZoom = 0.2;
      const maxZoom = 3;
      const direction = deltaY > 0 ? -1 : 1;
      const nextZoom = Phaser.Math.Clamp(
        this.cameras.main.zoom + direction * zoomStep,
        minZoom,
        maxZoom
      );
      this.cameras.main.setZoom(nextZoom);
    });

    this.input.on("pointerdown", (pointer) => {
      if (!this.editorActive) return;
      if (pointer.rightButtonDown()) {
        this.editorCameraDrag = {
          startX: pointer.x,
          startY: pointer.y,
          scrollX: this.cameras.main.scrollX,
          scrollY: this.cameras.main.scrollY,
        };
        return;
      }
      if (this.editorMode === "spawns") {
        this.handleEditorSpawnPointerDown(pointer);
        return;
      }
      if (this.editorMode === "terrain") {
        this.editorIsPainting = true;
        this.editorCurrentChanges = new Map();
        this.editorCurrentLayer = this.editorLayer;
        this.handleEditorTerrainPaint(pointer);
        return;
      }
      this.editorIsPainting = true;
      this.editorCurrentChanges = new Map();
      this.editorCurrentLayer = this.editorLayer;
      this.handleEditorPaint(pointer);
    });

    this.input.on("pointerup", () => {
      if (!this.editorActive) return;
      if (this.editorMode === "spawns") {
        this.editorSpawnDrag = null;
        this.editorIsPainting = false;
        return;
      }
      if (this.editorCameraDrag) {
        this.editorCameraDrag = null;
        return;
      }
      this.editorIsPainting = false;
      this.commitEditorChanges();
    });

    this.input.on("pointermove", (pointer) => {
      if (!this.editorActive) return;
      if (this.editorMode === "spawns") {
        this.handleEditorSpawnPointerMove(pointer);
        return;
      }
      if (this.editorCameraDrag) {
        const camera = this.cameras.main;
        const dx = (this.editorCameraDrag.startX - pointer.x) / camera.zoom;
        const dy = (this.editorCameraDrag.startY - pointer.y) / camera.zoom;
        camera.scrollX = this.editorCameraDrag.scrollX + dx;
        camera.scrollY = this.editorCameraDrag.scrollY + dy;
        return;
      }
      if (this.editorMode === "terrain") {
        if (!this.editorIsPainting) return;
        this.handleEditorTerrainPaint(pointer);
        return;
      }
      if (!this.editorIsPainting) return;
      this.handleEditorPaint(pointer);
    });

    this.ensureEditorObjects();
    this.initEditorPalette(paletteCanvas);
    this.updateEditorSetOptions(layerSelect, roadSetInput);
    const selectedRoadOption = roadSetInput?.selectedOptions?.[0];
    if (selectedRoadOption) {
      this.applyEditorRoadSelection(selectedRoadOption, layerSelect);
    } else {
      this.editorRoadSet = this.createEditorRoadSet(this.editorRoadOffset);
      this.editorRoadTargetLayer = "paths";
    }
    this.initEditorTileOverlay();
    this.updateEditorSpawnList();
    this.renderEditorSpawnOverlay();
  }

  toggleEditorHud(isEditorActive) {
    const playerInfo = document.getElementById("player-info");
    if (playerInfo) {
      playerInfo.style.display = isEditorActive ? "none" : "";
    }

    const castingBar = document.getElementById("casting-bar");
    if (castingBar) {
      castingBar.style.display = isEditorActive ? "none" : "";
    }

    const menuContainer = document.getElementById("game-menu-container");
    if (menuContainer) {
      menuContainer.style.display = isEditorActive ? "none" : "";
    }

    const chat = document.getElementById("system-chat");
    if (chat) {
      chat.style.display = isEditorActive ? "none" : "";
    }

    const minimapVisible = !isEditorActive;
    if (this.minimapBase) this.minimapBase.setVisible(minimapVisible);
    if (this.minimapEntities) this.minimapEntities.setVisible(minimapVisible);
    if (this.minimapFrame) this.minimapFrame.setVisible(minimapVisible);
    if (this.minimapMask) this.minimapMask.setVisible(false);
    if (minimapVisible) {
      this.updateMinimapEntities();
    }
  }

  setAdminNpcPlacementActive(enabled) {
    if (this.adminNpcPlacementActive === enabled) return;
    this.adminNpcPlacementActive = enabled;
    this.npcManager?.setAdminPlacementEnabled(enabled);
    if (enabled) {
      this.adminNpcPrevZoom = this.cameras.main.zoom;
      this.cameras.main.stopFollow();
    } else {
      this.cameras.main.setZoom(this.adminNpcPrevZoom || 1);
      this.startCenteredFollow();
    }
  }

  createEditorRoadSet(offset = 0) {
    const tiles = [
      [42 + offset, 43 + offset, 44 + offset],
      [63 + offset, 64 + offset, 65 + offset],
      [84 + offset, 85 + offset, 86 + offset],
    ];
    const tileSet = new Set();
    tiles.forEach((row) => row.forEach((idx) => tileSet.add(idx)));
    const innerCorners = {
      nw: 23 + offset,
      ne: 22 + offset,
      sw: 2 + offset,
      se: 1 + offset,
    };
    Object.values(innerCorners).forEach((idx) => tileSet.add(idx));
    return { tiles, tileSet, innerCorners };
  }

  getEditorRoadOffsetFromOption(option) {
    if (!option) return 0;
    const row = Number(option.dataset.row);
    const col = Number(option.dataset.col);
    if (Number.isFinite(row) || Number.isFinite(col)) {
      const columns = this.editorPalette?.columns || 0;
      if (!columns) return 0;
      const rowOffset = Number.isFinite(row) ? row : 0;
      const colOffset = Number.isFinite(col) ? col : 0;
      return rowOffset * columns + colOffset;
    }
    const nextValue = Number(option.value);
    return Number.isFinite(nextValue) ? Math.floor(nextValue) : 0;
  }

  applyEditorRoadSelection(option, layerSelect) {
    this.editorRoadOffset = this.getEditorRoadOffsetFromOption(option);
    this.editorRoadSet = this.createEditorRoadSet(this.editorRoadOffset);
    this.editorRoadTargetLayer = option.dataset.target || "paths";
    if (this.editorMode === "terrain") {
      this.editorLayer = this.editorRoadTargetLayer;
      if (layerSelect) {
        layerSelect.value = this.editorLayer;
      }
    }
  }

  updateEditorSetOptions(layerSelect, roadSetInput) {
    if (!layerSelect || !roadSetInput) return;
    const activeLayer = layerSelect.value;
    const options = Array.from(roadSetInput.options);
    let firstVisible = null;
    options.forEach((option) => {
      const target = option.dataset.target || "paths";
      const visible = target === activeLayer;
      option.hidden = !visible;
      if (visible && !firstVisible) {
        firstVisible = option;
      }
    });
    if (firstVisible && roadSetInput.selectedOptions[0]?.hidden) {
      roadSetInput.value = firstVisible.value;
      this.applyEditorRoadSelection(firstVisible, layerSelect);
    }
  }

  initEditorTileOverlay() {
    if (this.editorTileIndexOverlay) return;
    const container = this.add.container(0, 0);
    container.setDepth(3500);
    container.setVisible(false);
    this.editorTileIndexOverlay = {
      container,
      pool: [],
      enabled: true,
    };
  }

  updateEditorTileOverlay() {
    if (!this.editorTileIndexOverlay) return;
    const overlay = this.editorTileIndexOverlay;
    if (!this.editorActive || !overlay.enabled || this.editorMode === "spawns") {
      overlay.container.setVisible(false);
      return;
    }
    const layer = this.getEditorLayer();
    if (!layer) return;
    overlay.container.setVisible(true);

    const tileW = this.map.tileWidth;
    const tileH = this.map.tileHeight;
    const view = this.cameras.main.worldView;
    const startX = Phaser.Math.Clamp(Math.floor(view.x / tileW) - 1, 0, this.map.width - 1);
    const endX = Phaser.Math.Clamp(
      Math.floor((view.x + view.width) / tileW) + 1,
      0,
      this.map.width - 1
    );
    const startY = Phaser.Math.Clamp(
      Math.floor(view.y / tileH) - 1,
      0,
      this.map.height - 1
    );
    const endY = Phaser.Math.Clamp(
      Math.floor((view.y + view.height) / tileH) + 1,
      0,
      this.map.height - 1
    );

    let index = 0;
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = layer.getTileAt(x, y);
        const value = tile ? tile.index : -1;
        let label = overlay.pool[index];
        if (!label) {
          label = this.add.text(0, 0, "", {
            font: "10px Arial",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 2,
          });
          label.setDepth(3500);
          label.setAlpha(0.7);
          overlay.container.add(label);
          overlay.pool.push(label);
        }
        label.setPosition(x * tileW + 2, y * tileH + 2);
        label.setText(String(value));
        label.setVisible(true);
        index += 1;
      }
    }

    for (let i = index; i < overlay.pool.length; i += 1) {
      overlay.pool[i].setVisible(false);
    }
  }

  initEditorPalette(canvas) {
    if (!canvas) return;
    const texture = this.textures.get("terrain");
    const image = texture?.getSourceImage();
    if (!image || !image.width || !image.height) {
      return;
    }
    const tileWidth = this.map?.tileWidth || 32;
    const tileHeight = this.map?.tileHeight || 32;
    const maxWidth = 220;
    const scale = Math.min(1, maxWidth / image.width);
    const columns = Math.floor(image.width / tileWidth);
    const rows = Math.floor(image.height / tileHeight);
    canvas.width = Math.floor(image.width * scale);
    canvas.height = Math.floor(image.height * scale);
    this.editorPalette = {
      canvas,
      ctx: canvas.getContext("2d"),
      image,
      tileWidth,
      tileHeight,
      scale,
      columns,
      rows,
    };
    const getPaletteTile = (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const localX = (event.clientX - rect.left) * scaleX;
      const localY = (event.clientY - rect.top) * scaleY;
      const tileX = Math.floor(localX / (tileWidth * scale));
      const tileY = Math.floor(localY / (tileHeight * scale));
      if (tileX < 0 || tileY < 0 || tileX >= columns || tileY >= rows) {
        return null;
      }
      return { tileX, tileY };
    };

    const updateSelection = (start, end) => {
      const minX = Math.min(start.tileX, end.tileX);
      const minY = Math.min(start.tileY, end.tileY);
      const maxX = Math.max(start.tileX, end.tileX);
      const maxY = Math.max(start.tileY, end.tileY);
      this.editorPaletteSelection = {
        startX: minX,
        startY: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      };
    };

    const finalizeSelection = () => {
      if (!this.editorPaletteSelection) return;
      const { startX, startY, width, height } = this.editorPaletteSelection;
      if (width === 1 && height === 1) {
        const nextIndex = startY * columns + startX;
        this.editorTileIndex = nextIndex;
        const tileInput = this.editorUI.querySelector("#map-editor-tile");
        tileInput.value = String(nextIndex);
        this.editorPaletteSelection = null;
        this.renderEditorPalette();
        return;
      }
      if (width === 3 && height === 3) {
        const tiles = [];
        const tileSet = new Set();
        for (let y = 0; y < height; y += 1) {
          const row = [];
          for (let x = 0; x < width; x += 1) {
            const idx = (startY + y) * columns + (startX + x);
            row.push(idx);
            tileSet.add(idx);
          }
          tiles.push(row);
        }
        this.editorAutoTile = {
          tiles,
          tileSet,
        };
        const centerIndex = tiles[1][1];
        this.editorTileIndex = centerIndex;
        const tileInput = this.editorUI.querySelector("#map-editor-tile");
        tileInput.value = String(centerIndex);
      } else {
        this.editorAutoTile = null;
      }
      this.renderEditorPalette();
    };

    canvas.addEventListener("mousedown", (event) => {
      if (!this.editorPalette) return;
      if (event.button !== 0) return;
      const start = getPaletteTile(event);
      if (!start) return;
      this.editorPaletteSelecting = true;
      this.editorPaletteSelectionStart = start;
      updateSelection(start, start);
      this.renderEditorPalette();
    });

    canvas.addEventListener("mousemove", (event) => {
      if (!this.editorPaletteSelecting) return;
      if (!this.editorPaletteSelectionStart) return;
      const end = getPaletteTile(event);
      if (!end || !this.editorPaletteSelection) return;
      updateSelection(this.editorPaletteSelectionStart, end);
      this.renderEditorPalette();
    });

    const endSelection = (event) => {
      if (!this.editorPaletteSelecting) return;
      this.editorPaletteSelecting = false;
      if (!this.editorPaletteSelectionStart) return;
      const end = getPaletteTile(event);
      if (end) {
        updateSelection(this.editorPaletteSelectionStart, end);
      }
      this.editorPaletteSelectionStart = null;
      finalizeSelection();
    };

    canvas.addEventListener("mouseup", endSelection);
    canvas.addEventListener("mouseleave", endSelection);
    this.renderEditorPalette();
  }

  renderEditorPalette() {
    if (!this.editorPalette) return;
    const { ctx, image, tileWidth, tileHeight, scale, columns, rows, canvas } =
      this.editorPalette;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= columns; x += 1) {
      const px = Math.floor(x * tileWidth * scale) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y += 1) {
      const py = Math.floor(y * tileHeight * scale) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
      ctx.stroke();
    }
    if (this.editorPaletteSelection) {
      const { startX, startY, width, height } = this.editorPaletteSelection;
      ctx.strokeStyle = "rgba(66,153,245,0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        startX * tileWidth * scale + 1,
        startY * tileHeight * scale + 1,
        width * tileWidth * scale - 2,
        height * tileHeight * scale - 2
      );
    }
    if (Number.isFinite(this.editorTileIndex) && this.editorTileIndex >= 0) {
      const tileX = this.editorTileIndex % columns;
      const tileY = Math.floor(this.editorTileIndex / columns);
      ctx.strokeStyle = "rgba(245,209,66,0.95)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        tileX * tileWidth * scale + 1,
        tileY * tileHeight * scale + 1,
        tileWidth * scale - 2,
        tileHeight * scale - 2
      );
    }
  }

  ensureEditorObjects() {
    if (!this.editorData) return;
    if (!this.editorData.objects) {
      this.editorData.objects = {};
    }
    if (!Array.isArray(this.editorData.objects.GameObjects)) {
      this.editorData.objects.GameObjects = [];
    }
  }

  getEditorSpawnZones() {
    this.ensureEditorObjects();
    if (!this.editorData || !this.editorData.objects?.GameObjects) {
      return [];
    }
    return this.editorData.objects.GameObjects.filter((obj) =>
      obj.name?.startsWith("MobSpawnZone")
    );
  }

  updateEditorSpawnList() {
    if (!this.editorUI) return;
    const spawnList = this.editorUI.querySelector("#map-editor-spawn-list");
    if (!spawnList) return;
    const zones = this.getEditorSpawnZones();
    spawnList.innerHTML = "";
    zones.forEach((zone) => {
      const option = document.createElement("option");
      option.value = String(zone.id);
      option.textContent = zone.name || `Zone ${zone.id}`;
      spawnList.appendChild(option);
    });
    if (this.editorSpawnSelection) {
      const exists = zones.some((zone) => zone.id === this.editorSpawnSelection.id);
      if (!exists) {
        this.editorSpawnSelection = null;
      }
    }
    if (!this.editorSpawnSelection && zones.length > 0) {
      this.editorSpawnSelection = zones[0];
    }
    if (this.editorSpawnSelection) {
      spawnList.value = String(this.editorSpawnSelection.id);
    }
    this.syncEditorSpawnInputs();
  }

  syncEditorSpawnInputs() {
    if (!this.editorUI) return;
    const spawnX = this.editorUI.querySelector("#map-editor-spawn-x");
    const spawnY = this.editorUI.querySelector("#map-editor-spawn-y");
    const spawnW = this.editorUI.querySelector("#map-editor-spawn-w");
    const spawnH = this.editorUI.querySelector("#map-editor-spawn-h");
    if (!spawnX || !spawnY || !spawnW || !spawnH) return;
    if (!this.editorSpawnSelection) {
      spawnX.value = "";
      spawnY.value = "";
      spawnW.value = "";
      spawnH.value = "";
      return;
    }
    spawnX.value = String(Math.round(this.editorSpawnSelection.x || 0));
    spawnY.value = String(Math.round(this.editorSpawnSelection.y || 0));
    spawnW.value = String(Math.round(this.editorSpawnSelection.width || 0));
    spawnH.value = String(Math.round(this.editorSpawnSelection.height || 0));
  }

  selectEditorSpawnZone(zone) {
    this.editorSpawnSelection = zone;
    this.syncEditorSpawnInputs();
    this.renderEditorSpawnOverlay();
  }

  applyEditorSpawnInputs(values) {
    if (!this.editorSpawnSelection) return;
    const nextX = Number(values.x);
    const nextY = Number(values.y);
    const nextW = Number(values.w);
    const nextH = Number(values.h);
    if (Number.isFinite(nextX)) this.editorSpawnSelection.x = nextX;
    if (Number.isFinite(nextY)) this.editorSpawnSelection.y = nextY;
    if (Number.isFinite(nextW) && nextW > 0) {
      this.editorSpawnSelection.width = nextW;
    }
    if (Number.isFinite(nextH) && nextH > 0) {
      this.editorSpawnSelection.height = nextH;
    }
    this.clampSpawnZoneToBounds(this.editorSpawnSelection);
    this.syncEditorObjectsToMap();
    this.syncEditorSpawnInputs();
    this.renderEditorSpawnOverlay();
  }

  addEditorSpawnZone() {
    if (!this.editorData || !this.map) return;
    this.ensureEditorObjects();
    let maxIndex = 0;
    let maxId = 0;
    this.editorData.objects.GameObjects.forEach((obj) => {
      if (Number.isFinite(obj.id)) {
        maxId = Math.max(maxId, obj.id);
      }
      if (obj.name?.startsWith("MobSpawnZone")) {
        const suffix = Number(obj.name.replace("MobSpawnZone", ""));
        if (Number.isFinite(suffix)) {
          maxIndex = Math.max(maxIndex, suffix);
        }
      }
    });

    const tileWidth = this.map?.tileWidth || 32;
    const tileHeight = this.map?.tileHeight || 32;
    const defaultSize = tileWidth * 3;
    const spawnPos = this.getEditorSpawnAddPosition(defaultSize, defaultSize);
    const newZone = {
      id: maxId + 1,
      name: `MobSpawnZone${maxIndex + 1}`,
      type: "",
      x: spawnPos.x,
      y: spawnPos.y,
      width: defaultSize,
      height: defaultSize,
      rotation: 0,
      visible: true,
    };
    this.editorData.objects.GameObjects.push(newZone);
    this.selectEditorSpawnZone(newZone);
    this.updateEditorSpawnList();
    this.syncEditorObjectsToMap();
    this.renderEditorSpawnOverlay();
  }

  removeEditorSpawnZone() {
    if (!this.editorSpawnSelection) return;
    const zones = this.editorData.objects.GameObjects;
    const index = zones.findIndex(
      (zone) => zone.id === this.editorSpawnSelection.id
    );
    if (index === -1) return;
    zones.splice(index, 1);
    this.editorSpawnSelection = null;
    this.updateEditorSpawnList();
    this.syncEditorObjectsToMap();
    this.renderEditorSpawnOverlay();
  }

  getEditorSpawnAddPosition(width, height) {
    const pointer = this.input.activePointer;
    const mapWidth = this.map?.widthInPixels || 0;
    const mapHeight = this.map?.heightInPixels || 0;
    let x = mapWidth / 2;
    let y = mapHeight / 2;
    if (
      pointer &&
      pointer.worldX >= 0 &&
      pointer.worldY >= 0 &&
      pointer.worldX <= mapWidth &&
      pointer.worldY <= mapHeight
    ) {
      x = pointer.worldX;
      y = pointer.worldY;
    } else if (this.playerManager?.player) {
      x = this.playerManager.player.x;
      y = this.playerManager.player.y;
    }
    x -= width / 2;
    y -= height / 2;
    return {
      x: Math.max(0, Math.min(mapWidth - width, Math.round(x))),
      y: Math.max(0, Math.min(mapHeight - height, Math.round(y))),
    };
  }

  clampSpawnZoneToBounds(zone) {
    if (!this.map) return;
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    zone.width = Math.max(1, Math.round(zone.width || 0));
    zone.height = Math.max(1, Math.round(zone.height || 0));
    zone.x = Math.max(0, Math.min(mapWidth - zone.width, Math.round(zone.x || 0)));
    zone.y = Math.max(0, Math.min(mapHeight - zone.height, Math.round(zone.y || 0)));
  }

  syncEditorObjectsToMap() {
    if (!this.editorData) return;
    const objects = Object.keys(this.editorData.objects || {}).map((name) => ({
      name,
      objects: this.editorData.objects[name],
    }));
    this.map.objects = objects;
  }

  renderEditorSpawnOverlay() {
    if (!this.editorSpawnOverlay) {
      this.editorSpawnOverlay = this.add.graphics();
      this.editorSpawnOverlay.setDepth(3000);
    }
    this.editorSpawnOverlay.clear();
    if (!this.editorActive || this.editorMode !== "spawns") return;
    const zones = this.getEditorSpawnZones();
    zones.forEach((zone) => {
      const isSelected =
        this.editorSpawnSelection && this.editorSpawnSelection.id === zone.id;
      const stroke = isSelected ? 0xf5d142 : 0x6abf69;
      const fill = isSelected ? 0xf5d142 : 0x6abf69;
      this.editorSpawnOverlay.lineStyle(2, stroke, 0.9);
      this.editorSpawnOverlay.fillStyle(fill, 0.12);
      this.editorSpawnOverlay.strokeRect(zone.x, zone.y, zone.width, zone.height);
      this.editorSpawnOverlay.fillRect(zone.x, zone.y, zone.width, zone.height);
    });
  }

  findEditorSpawnZoneAt(x, y) {
    const zones = this.getEditorSpawnZones();
    for (let i = zones.length - 1; i >= 0; i -= 1) {
      const zone = zones[i];
      if (
        x >= zone.x &&
        y >= zone.y &&
        x <= zone.x + zone.width &&
        y <= zone.y + zone.height
      ) {
        return zone;
      }
    }
    return null;
  }

  handleEditorSpawnPointerDown(pointer) {
    const zone = this.findEditorSpawnZoneAt(pointer.worldX, pointer.worldY);
    if (!zone) {
      this.selectEditorSpawnZone(null);
      return;
    }
    this.selectEditorSpawnZone(zone);
    this.editorSpawnDrag = {
      zone,
      offsetX: pointer.worldX - zone.x,
      offsetY: pointer.worldY - zone.y,
    };
  }

  handleEditorSpawnPointerMove(pointer) {
    if (!this.editorSpawnDrag) return;
    const zone = this.editorSpawnDrag.zone;
    zone.x = pointer.worldX - this.editorSpawnDrag.offsetX;
    zone.y = pointer.worldY - this.editorSpawnDrag.offsetY;
    this.clampSpawnZoneToBounds(zone);
    this.syncEditorObjectsToMap();
    this.syncEditorSpawnInputs();
    this.renderEditorSpawnOverlay();
  }

  handleEditorPaint(pointer) {
    const tileX = this.map.worldToTileX(pointer.worldX);
    const tileY = this.map.worldToTileY(pointer.worldY);
    if (tileX < 0 || tileY < 0 || tileX >= this.map.width || tileY >= this.map.height) {
      return;
    }
    const erase = pointer.event.shiftKey;
    const pick = pointer.event.altKey;
    const layer = this.getEditorLayer();
    if (!layer) return;

    if (pick) {
      const tile = layer.getTileAt(tileX, tileY);
      if (tile) {
        this.editorTileIndex = tile.index;
        const tileInput = this.editorUI.querySelector("#map-editor-tile");
        tileInput.value = String(this.editorTileIndex);
        this.renderEditorPalette();
      }
      return;
    }

    if (this.editorAutoTileEnabled && this.editorAutoTile) {
      this.applyEditorAutoTile(layer, tileX, tileY, erase, this.editorCurrentChanges);
      return;
    }

    const value = erase ? -1 : this.editorTileIndex;
    this.setEditorTileValue(layer, tileX, tileY, value, this.editorCurrentChanges);
    this.refreshEditorLayerCollision();
  }

  handleEditorTerrainPaint(pointer) {
    const tileX = this.map.worldToTileX(pointer.worldX);
    const tileY = this.map.worldToTileY(pointer.worldY);
    if (tileX < 0 || tileY < 0 || tileX >= this.map.width || tileY >= this.map.height) {
      return;
    }
    const layer =
      this.editorRoadTargetLayer === "collisions"
        ? this.collisionLayer
        : this.getEditorLayer();
    if (!layer) return;
    const erase = pointer.event.shiftKey;
    if (this.editorRoadTargetLayer === "paths" || this.editorRoadTargetLayer === "collisions") {
      const autoSet = this.editorRoadSet || this.editorAutoTile;
      if (!autoSet) return;
      this.applyEditorAutoTile(layer, tileX, tileY, erase, this.editorCurrentChanges, autoSet);
      return;
    }
    if (!this.editorAutoTile) return;
    this.applyEditorTerrainBlend(layer, tileX, tileY, this.editorCurrentChanges);
  }

  setEditorTileValue(layer, tileX, tileY, value, changes) {
    const prev = this.getEditorTileIndexAt(layer, tileX, tileY);
    if (prev === value) return;
    this.recordEditorTileChange(changes, tileX, tileY, prev, value);
    layer.putTileAt(value, tileX, tileY);
    if (this.editorData?.layers?.[this.editorLayer]) {
      this.editorData.layers[this.editorLayer][tileY][tileX] = value;
    }
  }

  refreshEditorLayerCollision() {
    if (this.editorLayer === "collisions") {
      this.collisionLayer.setCollisionByExclusion([-1]);
    }
    if (this.editorLayer === "gather_rock") {
      this.gatherRockLayer.setCollisionByExclusion([-1]);
    }
  }

  getEditorTileIndexAt(layer, tileX, tileY) {
    const tile = layer.getTileAt(tileX, tileY);
    return tile ? tile.index : -1;
  }

  isEditorAutoTile(index, autoSet = this.editorAutoTile) {
    if (!autoSet?.tileSet) return false;
    return autoSet.tileSet.has(index);
  }

  pickEditorAutoTileIndex(layer, tileX, tileY, autoSet = this.editorAutoTile) {
    const hasNeighbor = (x, y) => {
      if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) {
        return false;
      }
      const idx = this.getEditorTileIndexAt(layer, x, y);
      return this.isEditorAutoTile(idx, autoSet);
    };

    const hasN = hasNeighbor(tileX, tileY - 1);
    const hasS = hasNeighbor(tileX, tileY + 1);
    const hasW = hasNeighbor(tileX - 1, tileY);
    const hasE = hasNeighbor(tileX + 1, tileY);
    const hasNW = hasNeighbor(tileX - 1, tileY - 1);
    const hasNE = hasNeighbor(tileX + 1, tileY - 1);
    const hasSW = hasNeighbor(tileX - 1, tileY + 1);
    const hasSE = hasNeighbor(tileX + 1, tileY + 1);

    const { tiles } = autoSet || {};
    if (!tiles) return this.editorTileIndex;
    const innerCorners = autoSet?.innerCorners || {};
    const connections = [hasN, hasS, hasW, hasE].filter(Boolean).length;
    if (connections <= 1) {
      return tiles[1][1];
    }
    if ((hasN && hasS && !hasE && !hasW) || (hasE && hasW && !hasN && !hasS)) {
      return tiles[1][1];
    }
    if (hasN && hasW && !hasNW && innerCorners.nw !== undefined) {
      return innerCorners.nw;
    }
    if (hasN && hasE && !hasNE && innerCorners.ne !== undefined) {
      return innerCorners.ne;
    }
    if (hasS && hasW && !hasSW && innerCorners.sw !== undefined) {
      return innerCorners.sw;
    }
    if (hasS && hasE && !hasSE && innerCorners.se !== undefined) {
      return innerCorners.se;
    }
    if (!hasN && !hasW) return tiles[0][0];
    if (!hasN && !hasE) return tiles[0][2];
    if (!hasS && !hasW) return tiles[2][0];
    if (!hasS && !hasE) return tiles[2][2];
    if (!hasN) return tiles[0][1];
    if (!hasS) return tiles[2][1];
    if (!hasW) return tiles[1][0];
    if (!hasE) return tiles[1][2];
    return tiles[1][1];
  }

  hasEditorAutoTileNeighbor(layer, tileX, tileY, autoSet = this.editorAutoTile) {
    const hasNeighbor = (x, y) => {
      if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) {
        return false;
      }
      const idx = this.getEditorTileIndexAt(layer, x, y);
      return this.isEditorAutoTile(idx, autoSet);
    };
    return (
      hasNeighbor(tileX, tileY - 1) ||
      hasNeighbor(tileX, tileY + 1) ||
      hasNeighbor(tileX - 1, tileY) ||
      hasNeighbor(tileX + 1, tileY)
    );
  }

  applyEditorTerrainBlend(layer, tileX, tileY, changes) {
    const baseTile = Number.isFinite(this.editorBlendBaseTile)
      ? this.editorBlendBaseTile
      : null;
    const radius = 1;
    const minX = Math.max(0, tileX - radius);
    const maxX = Math.min(this.map.width - 1, tileX + radius);
    const minY = Math.max(0, tileY - radius);
    const maxY = Math.min(this.map.height - 1, tileY + radius);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const idx = this.getEditorTileIndexAt(layer, x, y);
        if (this.isEditorAutoTile(idx)) continue;
        if (baseTile !== null && idx !== baseTile) continue;
        if (!this.hasEditorAutoTileNeighbor(layer, x, y)) continue;
        const nextIndex = this.pickEditorAutoTileIndex(layer, x, y);
        this.setEditorTileValue(layer, x, y, nextIndex, changes);
      }
    }

    const updateRadius = 2;
    const updateMinX = Math.max(0, tileX - updateRadius);
    const updateMaxX = Math.min(this.map.width - 1, tileX + updateRadius);
    const updateMinY = Math.max(0, tileY - updateRadius);
    const updateMaxY = Math.min(this.map.height - 1, tileY + updateRadius);
    for (let y = updateMinY; y <= updateMaxY; y += 1) {
      for (let x = updateMinX; x <= updateMaxX; x += 1) {
        const idx = this.getEditorTileIndexAt(layer, x, y);
        if (!this.isEditorAutoTile(idx)) continue;
        const nextIndex = this.pickEditorAutoTileIndex(layer, x, y);
        this.setEditorTileValue(layer, x, y, nextIndex, changes);
      }
    }

    this.refreshEditorLayerCollision();
  }

  applyEditorAutoTile(layer, tileX, tileY, erase, changes, autoSet = this.editorAutoTile) {
    if (erase) {
      this.setEditorTileValue(layer, tileX, tileY, -1, changes);
    } else {
      const nextIndex = this.pickEditorAutoTileIndex(layer, tileX, tileY, autoSet);
      this.setEditorTileValue(layer, tileX, tileY, nextIndex, changes);
    }

    const minX = Math.max(0, tileX - 1);
    const maxX = Math.min(this.map.width - 1, tileX + 1);
    const minY = Math.max(0, tileY - 1);
    const maxY = Math.min(this.map.height - 1, tileY + 1);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const idx = this.getEditorTileIndexAt(layer, x, y);
        if (!this.isEditorAutoTile(idx, autoSet)) continue;
        const nextIndex = this.pickEditorAutoTileIndex(layer, x, y, autoSet);
        if (nextIndex === idx) continue;
        this.setEditorTileValue(layer, x, y, nextIndex, changes);
      }
    }

    this.refreshEditorLayerCollision();
  }

  recordEditorTileChange(changes, tileX, tileY, prev, next) {
    if (!changes) return;
    const key = `${tileX},${tileY}`;
    const existing = changes.get(key);
    if (existing) {
      existing.next = next;
      return;
    }
    changes.set(key, { x: tileX, y: tileY, prev, next });
  }

  commitEditorChanges() {
    if (!this.editorCurrentChanges || this.editorCurrentChanges.size === 0) {
      this.editorCurrentChanges = null;
      this.editorCurrentLayer = null;
      return;
    }
    const changes = Array.from(this.editorCurrentChanges.values());
    this.editorUndoStack.push({
      layer: this.editorCurrentLayer || this.editorLayer,
      changes,
    });
    if (this.editorUndoStack.length > 50) {
      this.editorUndoStack.shift();
    }
    this.editorCurrentChanges = null;
    this.editorCurrentLayer = null;
  }

  undoEditorAction() {
    const action = this.editorUndoStack.pop();
    if (!action || !action.changes) return;
    const layer = this.getEditorLayerByName(action.layer);
    if (!layer) return;
    action.changes.forEach((change) => {
      this.setEditorTileValue(layer, change.x, change.y, change.prev, null);
    });
    this.refreshEditorLayerCollision();
  }

  getEditorLayerByName(name) {
    if (name === "background") return this.backgroundLayer;
    if (name === "paths") return this.pathsLayer;
    if (name === "collisions") return this.collisionLayer;
    if (name === "gather_rock") return this.gatherRockLayer;
    return null;
  }

  getEditorLayer() {
    if (this.editorLayer === "background") return this.backgroundLayer;
    if (this.editorLayer === "paths") return this.pathsLayer;
    if (this.editorLayer === "collisions") return this.collisionLayer;
    if (this.editorLayer === "gather_rock") return this.gatherRockLayer;
    return null;
  }

  saveEditorMap() {
    if (!this.editorData) return;
    localStorage.setItem("pg_editor_map", JSON.stringify(this.editorData));
    if (window.__pgDebugOverlay) {
      window.__pgDebugOverlay("Editor", "Saved map to localStorage.");
    }
  }

  downloadEditorMap() {
    if (!this.editorData) return;
    const blob = new Blob([JSON.stringify(this.editorData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pg_map.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  clearEditorLayer() {
    const layer = this.getEditorLayer();
    if (!layer || !this.editorData?.layers?.[this.editorLayer]) return;
    const rows = this.editorData.layers[this.editorLayer];
    const changes = new Map();
    for (let y = 0; y < rows.length; y += 1) {
      for (let x = 0; x < rows[y].length; x += 1) {
        const prev = rows[y][x];
        if (prev === -1) continue;
        this.recordEditorTileChange(changes, x, y, prev, -1);
        rows[y][x] = -1;
        layer.putTileAt(-1, x, y);
      }
    }
    if (this.editorLayer === "collisions") {
      this.collisionLayer.setCollisionByExclusion([-1]);
    }
    if (this.editorLayer === "gather_rock") {
      this.gatherRockLayer.setCollisionByExclusion([-1]);
    }
    if (changes.size > 0) {
      this.editorUndoStack.push({
        layer: this.editorLayer,
        changes: Array.from(changes.values()),
      });
      if (this.editorUndoStack.length > 50) {
        this.editorUndoStack.shift();
      }
    }
  }

  loadEditorMapOverride() {
    if (!editorEnabled) return null;
    try {
      const raw = localStorage.getItem("pg_editor_map");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.layers || !parsed.width || !parsed.height) {
        return null;
      }
      return parsed;
    } catch (err) {
      return null;
    }
  }

  // ------------------------------
  //          MINIMAP
  // ------------------------------
  createMinimap() {
    const size = Math.round(130 * 0.7);
    const padding = 12;
    const zoom = 2;
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    const scale = (size / mapWidth) * zoom;

    this.minimapConfig = {
      size,
      padding,
      zoom,
      scale,
      mapWidth,
      mapHeight,
    };

    this.minimapBase = this.add.graphics();
    this.minimapBase.setScrollFactor(0);
    this.minimapBase.setDepth(2000);

    this.minimapEntities = this.add.graphics();
    this.minimapEntities.setScrollFactor(0);
    this.minimapEntities.setDepth(2001);

    this.minimapMask = this.add.graphics();
    this.minimapMask.setScrollFactor(0);
    this.minimapMask.setDepth(1999);
    this.minimapMask.setVisible(false);
    this.minimapMaskShape = this.minimapMask.createGeometryMask();
    this.minimapBase.setMask(this.minimapMaskShape);
    this.minimapEntities.setMask(this.minimapMaskShape);

    this.minimapFrame = this.add.graphics();
    this.minimapFrame.setScrollFactor(0);
    this.minimapFrame.setDepth(2002);

    this.updateMinimapMask();
    this.drawMinimapBase();
    this.updateMinimapEntities();
  }

  getMinimapOrigin() {
    const { size, padding } = this.minimapConfig;
    const cam = this.cameras.main;
    return {
      x: Math.max(0, cam.width - size - padding + (this.minimapOffset?.x || 0)),
      y: Math.max(0, padding + (this.minimapOffset?.y || 0)),
    };
  }

  updateMinimapMask() {
    if (!this.minimapMask) return;
    const { size } = this.minimapConfig;
    const origin = this.getMinimapOrigin();
    this.minimapMask.clear();
    this.minimapMask.fillStyle(0xffffff, 1);
    this.minimapMask.setPosition(origin.x, origin.y);
    this.minimapMask.fillRect(0, 0, size, size);
  }

  drawMinimapBase() {
    const { size, scale } = this.minimapConfig;
    const origin = this.getMinimapOrigin();
    const tileW = this.map.tileWidth * scale;
    const tileH = this.map.tileHeight * scale;

    this.minimapBase.clear();
    this.minimapBase.fillStyle(0x111111, 1);
    this.minimapBase.fillRect(0, 0, this.minimapConfig.mapWidth * scale, this.minimapConfig.mapHeight * scale);
    this.minimapBase.fillStyle(0x2a2a2a, 1);

    for (let y = 0; y < this.map.height; y += 1) {
      for (let x = 0; x < this.map.width; x += 1) {
        const collisionTile = this.collisionLayer.getTileAt(x, y);
        const gatherTile = this.gatherRockLayer.getTileAt(x, y);
        if (
          (collisionTile && collisionTile.collides) ||
          (gatherTile && gatherTile.collides)
        ) {
          continue;
        }
        this.minimapBase.fillRect(x * tileW, y * tileH, tileW, tileH);
      }
    }
  }

  updateMinimapEntities() {
    if (!this.minimapEntities || !this.playerManager?.player) return;
    this.updateMinimapMask();
    const { size, scale, mapWidth, mapHeight } = this.minimapConfig;
    const origin = this.getMinimapOrigin();
    const mapWidthScaled = mapWidth * scale;
    const mapHeightScaled = mapHeight * scale;

    const player = this.playerManager.player;
    const playerScaledX = Phaser.Math.Clamp(player.x, 0, mapWidth) * scale;
    const playerScaledY = Phaser.Math.Clamp(player.y, 0, mapHeight) * scale;
    const viewX = Phaser.Math.Clamp(
      playerScaledX - size / 2,
      0,
      Math.max(0, mapWidthScaled - size)
    );
    const viewY = Phaser.Math.Clamp(
      playerScaledY - size / 2,
      0,
      Math.max(0, mapHeightScaled - size)
    );

    this.minimapBase.setPosition(origin.x - viewX, origin.y - viewY);
    this.minimapEntities.setPosition(origin.x - viewX, origin.y - viewY);
    this.minimapEntities.clear();
    this.minimapEntities.fillStyle(0xffffff, 1);
    this.drawMinimapPlayerPointer(playerScaledX, playerScaledY, 4);

    if (this.mobManager?.mobs) {
      this.minimapEntities.fillStyle(0xff3b30, 1);
      this.mobManager.mobs.getChildren().forEach((mob) => {
        if (!mob.active || mob.customData.isDead) return;
        const mx = Phaser.Math.Clamp(mob.x, 0, mapWidth) * scale;
        const my = Phaser.Math.Clamp(mob.y, 0, mapHeight) * scale;
        this.minimapEntities.fillCircle(mx, my, 1.5);
      });
    }

    this.minimapFrame.clear();
    this.minimapFrame.setPosition(origin.x, origin.y);
    this.minimapFrame.lineStyle(1, 0x3a3a3a, 1);
    this.minimapFrame.strokeRect(0, 0, size, size);
  }

  drawMinimapPlayerPointer(x, y, size) {
    const dir = this.playerManager?.lastDirection || "down";
    let angle = 0;
    if (dir === "up") angle = -Math.PI / 2;
    if (dir === "right") angle = 0;
    if (dir === "down") angle = Math.PI / 2;
    if (dir === "left") angle = Math.PI;

    const tipX = x + Math.cos(angle) * size;
    const tipY = y + Math.sin(angle) * size;
    const leftAngle = angle + Math.PI * 0.75;
    const rightAngle = angle - Math.PI * 0.75;
    const leftX = x + Math.cos(leftAngle) * (size * 0.8);
    const leftY = y + Math.sin(leftAngle) * (size * 0.8);
    const rightX = x + Math.cos(rightAngle) * (size * 0.8);
    const rightY = y + Math.sin(rightAngle) * (size * 0.8);

    this.minimapEntities.fillTriangle(
      tipX,
      tipY,
      leftX,
      leftY,
      rightX,
      rightY
    );
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
    const mobSheetKey = "mobs-sheet";
    const mobCols = 12;
    const mobFramesPerDir = 3;
    const mobDirs = [
      { name: "down", rowOffset: 0 },
      { name: "left", rowOffset: 1 },
      { name: "right", rowOffset: 2 },
      { name: "up", rowOffset: 3 },
    ];
    for (let mobIndex = 0; mobIndex < 8; mobIndex += 1) {
      const baseRow = Math.floor(mobIndex / 4) * 4;
      const baseCol = (mobIndex % 4) * mobFramesPerDir;
      mobDirs.forEach((dir) => {
        const row = baseRow + dir.rowOffset;
        const start = row * mobCols + baseCol;
        const end = start + mobFramesPerDir - 1;
        this.anims.create({
          key: `mob${mobIndex}-walk-${dir.name}`,
          frames: this.anims.generateFrameNumbers(mobSheetKey, { start, end }),
          frameRate: 6,
          repeat: -1,
        });
      });
    }

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
      const animKey = `${skill.name}_anim`;
      if (this.anims.exists(animKey)) {
        return;
      }
      if (!this.textures.exists(animKey)) {
        console.warn(`[anim] Missing texture for ${animKey}`);
        return;
      }
      const texture = this.textures.get(animKey);
      const frameNames = texture.getFrameNames();
      const numericFrames = frameNames
        .map((name) => Number(name))
        .filter((value) => Number.isFinite(value));
      const maxFrame = numericFrames.length > 0 ? Math.max(...numericFrames) : 0;
      const start = Number.isFinite(skill.animationSeq?.[0])
        ? skill.animationSeq[0]
        : 0;
      const end = Number.isFinite(skill.animationSeq?.[1])
        ? Math.min(skill.animationSeq[1], maxFrame)
        : start;
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(animKey, {
          start,
          end,
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
    this.startCenteredFollow();
  }

  startCenteredFollow() {
    if (!this.playerManager?.player) return;
    this.cameras.main.startFollow(this.playerManager.player, true, 1, 1, 0, 0);
    this.cameras.main.setFollowOffset(0, 0);
    this.cameras.main.centerOn(
      this.playerManager.player.x,
      this.playerManager.player.y
    );
  }

  // ------------------------------
  //     UI + MENUS
  // ------------------------------
  // ------------------------------
  //     PLAYER LEVEL, EXP
  // ------------------------------
  calculatePlayerLevel(totalExp) {
    const oldLevel = playerProfile.level;
    const { level, currentExp, nextLevelExp } =
      calculateLevelProgress(totalExp);

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
    if (this.uiManager?.isAdminOpen) {
      this.uiManager.selectAdminMob(mob.customData.id, mob);
    }
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
