/**
 * @jest-environment jsdom
 */

// __tests__/PlayerManager.test.js

// 1. Mock Phaser globally
global.Phaser = {
  Physics: {
    Arcade: {
      Sprite: class {
        constructor(scene, x, y, texture) {
          this.scene = scene;
          this.x = x;
          this.y = y;
          this.texture = texture;
          this.body = {
            setVelocity: jest.fn(),
            setVelocityY: jest.fn(),
            setVelocityX: jest.fn(),
            setEnable: jest.fn(),
            velocity: {
              x: 0,
              y: 0,
              normalize: jest.fn().mockReturnThis(), // Mock normalize to return the velocity object
              scale: jest.fn(), // Mock scale
            },
          };
          this.setScale = jest.fn().mockReturnThis();
          this.setCollideWorldBounds = jest.fn(); // Correctly mock setCollideWorldBounds on the sprite
          this.anims = {
            play: jest.fn(),
            stop: jest.fn(),
          };
          this.setInteractive = jest.fn().mockReturnThis();
        }

        setInteractive(options) {
          // Mock method to simulate setting interactivity
          return this;
        }

        on(event, callback) {
          // Mock method to simulate event listeners
          return this;
        }

        setCollideWorldBounds(enable) {
          // Mock method
          return this;
        }

        setScale(scale) {
          this.scale = scale;
          return this;
        }
      },
      Group: class {
        constructor(config) {
          this.config = config;
          this.getChildren = jest.fn().mockReturnValue([]);
        }

        create(x, y, texture) {
          return new Phaser.Physics.Arcade.Sprite(null, x, y, texture);
        }

        addCollider(object1, object2) {
          // Mock collider addition
        }
      },
      Collider: jest.fn(),
    },
  },
  Math: {
    Clamp: jest.fn((value, min, max) => Math.min(Math.max(value, min), max)),
    Distance: {
      Between: jest.fn((x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
      }),
    },
    FloatBetween: jest.fn((min, max) => Math.random() * (max - min) + min),
  },
  Input: {
    Keyboard: {
      KeyCodes: {
        W: "W",
        S: "S",
        A: "A",
        D: "D",
        ONE: "ONE",
        TWO: "TWO",
        THREE: "THREE",
        FOUR: "FOUR",
        FIVE: "FIVE",
        SIX: "SIX",
        SEVEN: "SEVEN",
        EIGHT: "EIGHT",
        NINE: "NINE",
        TAB: "TAB",
        B: "B",
      },
      addKey: jest.fn(),
      addKeys: jest.fn(),
      addCapture: jest.fn(),
    },
  },
  Time: {
    addEvent: jest.fn(),
    delayedCall: jest.fn(),
  },
  Tweens: {
    add: jest.fn(),
  },
  Events: {
    EventEmitter: class {
      constructor() {
        this.listeners = {};
      }

      on(event, listener, context) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push({ listener, context });
      }

      emit(event, data) {
        if (this.listeners[event]) {
          this.listeners[event].forEach(({ listener, context }) => {
            listener.call(context, data);
          });
        }
      }
    },
  },
  // Add other Phaser global mocks as needed
};

// 2. Mock calculatePlayerStats helper function
jest.mock("../helpers/calculatePlayerStats.js", () => ({
  calculatePlayerStats: jest.fn(),
  calculateMagicDamage: jest.fn(),
  calculateMeleeDamage: jest.fn(),
}));

// 3. Mock the MOCKdata.js module with all necessary exports
jest.mock("../data/MOCKdata.js", () => ({
  playerProfile: {
    class: "mage",
    name: "TestPlayer",
    level: 1,
    totalExp: 0,
  },
  playerBaseStats: {
    health: 100,
    mana: 150,
    intellect: 3,
    strength: 0,
    dexterity: 3,
    constitution: 4,
    speed: 50,
  },
  playerGrowthStats: {
    health: 7,
    mana: 10,
    intellect: 1,
    strength: 1,
    dexterity: 1,
    constitution: 1,
    speed: 3,
  },
  weaponItems: [
    {
      id: 1,
      name: "basic_staff",
      type: "staff",
      slot: "weapon",
      health: 0,
      mana: 10,
      magicAttack: 3,
      meleeAttack: 1,
      magicDefense: 0,
      meleeDefense: 0,
      magicEvasion: 0,
      meleeEvasion: 0,
      speed: 0,
    },
  ],
  armorItems: [
    {
      id: 100,
      name: "common_robe_chest",
      type: "robe",
      slot: "chest",
      health: 10,
      mana: 12,
      magicAttack: 0,
      meleeAttack: 0,
      magicDefense: 0,
      meleeDefense: 0,
      magicEvasion: 0,
      meleeEvasion: 0,
      speed: 0,
    },
    // Add other armors as needed
  ],
  playerEquippedItems: {
    weapon: "basic_staff",
    head: null,
    chest: null,
    shoulders: null,
    legs: null,
    feet: null,
  },
  // Provide a default or partial backpack so we can test
  playerBackpack: {
    cell_0_0: 0,
    cell_0_1: 0,
    cell_1_0: 0,
    cell_1_1: 0,
    cell_2_0: null,
    cell_2_1: null,
    // ... up to cell_5_4 if needed
  },
  // Minimal skill list
  playerSkills: [
    {
      id: 1,
      name: "magic_wip",
      manaCost: 5,
      range: 150,
      magicAttack: 2,
      meleeAttack: 0,
      castingTime: 0,
      cooldown: 2,
      icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_04.png",
      skillImage: "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/4_1.png",
      animationSeq: [0, 7],
    },
  ],
  mobsData: {
    slime: {
      name: "Slime",
      level: 2,
      attackRange: 40,
      health: 50,
      mana: 0,
      magicAttack: 0,
      meleeAttack: 2,
      magicDefense: 2,
      meleeDefense: 30,
      magicEvasion: 1,
      meleeEvasion: 1,
      mobType: "friend",
      mobAgroRange: 300,
      attackCooldown: 2000,
      speed: 20,
      expReward: 10,
    },
  },
  naturalRegeneration: {
    manaRegen: 3,
    hpRegen: 4,
    regenerationTime: 5000,
  },
  TAB_TARGET_RANGE: 400,
  MOB_CHASE_SPEED_MULT: 2.0,
  SKILL_RANGE_EXTENDER: 1.1,
  expModifierRules: {
    mobAtLeast5Higher: 1.2,
    mob4Higher: 1.15,
    mob3Higher: 1.1,
    mob2Higher: 1.05,
    mob1Higher: 1.03,
    equalLevel: 1.0,
    player1Higher: 0.97,
    player2Higher: 0.9,
    player3Higher: 0.8,
    player4Higher: 0.75,
    player5Higher: 0.5,
    none: 0.0,
  },
  // IMPORTANT: add allItems so PlayerManager.equipItem() won't fail:
  allItems: [
    {
      id: 1,
      name: "basic_staff",
      type: "staff",
      slot: "weapon",
      health: 0,
      mana: 10,
      magicAttack: 3,
      meleeAttack: 1,
      magicDefense: 0,
      meleeDefense: 0,
      magicEvasion: 0,
      meleeEvasion: 0,
      speed: 0,
    },
    {
      id: 2,
      name: "Excalibur",
      type: "sword",
      slot: "weapon",
      health: 10,
      mana: 0,
      magicAttack: 0,
      meleeAttack: 10,
      magicDefense: 0,
      meleeDefense: 2,
      magicEvasion: 0,
      meleeEvasion: 0,
      speed: 2,
    },
    {
      id: 100,
      name: "common_robe_chest",
      type: "robe",
      slot: "chest",
      health: 10,
      mana: 12,
      magicAttack: 0,
      meleeAttack: 0,
      magicDefense: 0,
      meleeDefense: 0,
      magicEvasion: 0,
      meleeEvasion: 0,
      speed: 0,
    },
  ],
  itemsMap: {}, // Not strictly needed for this test, but you can add more if needed
  deletedItems: [], // If you test item deletions, you'll need this
}));

import PlayerManager from "../managers/PlayerManager.js";
import { calculatePlayerStats } from "../helpers/calculatePlayerStats.js";
import {
  playerProfile,
  playerGrowthStats,
  playerEquippedItems,
  playerBackpack,
  allItems,
  itemsMap,
} from "../data/MOCKdata.js"; // Make sure the mock is applied

describe("PlayerManager", () => {
  let mockScene;
  let playerManager;
  let mockPlayerSprite;
  let tilemap;

  beforeEach(() => {
    jest.clearAllMocks();

    // 1. Mock tilemap object with findObject method
    tilemap = {
      findObject: jest.fn().mockReturnValue({ x: 100, y: 150 }),
    };

    // 2. Mock player sprite with enhanced velocity
    mockPlayerSprite = new Phaser.Physics.Arcade.Sprite(
      null,
      100,
      150,
      "characters"
    );

    // 3. Mock scene with physics
    mockScene = {
      physics: {
        add: {
          sprite: jest.fn().mockReturnValue(mockPlayerSprite),
          collider: jest.fn(),
        },
      },
      collisionLayer: {}, // Mock collision layer

      // The scene typically has these methods from MainScene
      emitStatsUpdate: jest.fn(), // For updating the UI
      gainExperience: jest.fn(),  // For awarding XP
      playerEquippedItems,        // from our mock
      playerBackpack,             // from our mock
    };

    // 4. Initialize PlayerManager with the mocked scene
    playerManager = new PlayerManager(mockScene);

    // 5. Assign the mocked player sprite to playerManager.player
    playerManager.player = mockPlayerSprite;

    // 6. Reset playerProfile
    playerProfile.level = 1;
    playerProfile.totalExp = 0;

    // Custom defaults
    playerManager.currentHealth = 120;
    playerManager.maxHealth = 120;
    playerManager.currentMana = 80;
    playerManager.maxMana = 80;
    playerManager.playerSpeed = 100;

    // Mock calculatePlayerStats default
    calculatePlayerStats.mockReturnValue({
      health: 120,
      mana: 80,
      magicAttack: 10,
      meleeAttack: 5,
      magicDefense: 3,
      meleeDefense: 2,
      magicEvasion: 1,
      meleeEvasion: 1,
      speed: 100,
    });
  });

  // 1. Test Constructor
  test("should create player correctly", () => {
    // Overwrite mock so we see a difference
    calculatePlayerStats.mockReturnValue({
      health: 150,
      mana: 100,
      magicAttack: 20,
      meleeAttack: 15,
      magicDefense: 10,
      meleeDefense: 8,
      magicEvasion: 5,
      meleeEvasion: 3,
      speed: 120,
    });

    const spyUpdatePlayerStats = jest.spyOn(playerManager, "updatePlayerStats");

    // Call createPlayer
    playerManager.createPlayer(tilemap);

    expect(tilemap.findObject).toHaveBeenCalledWith(
      "GameObjects",
      expect.any(Function)
    );
    expect(mockScene.physics.add.sprite).toHaveBeenCalledWith(
      100,
      150,
      "characters"
    );
    expect(mockPlayerSprite.setCollideWorldBounds).toHaveBeenCalledWith(true);
    expect(mockPlayerSprite.setScale).toHaveBeenCalledWith(1);
    expect(mockScene.physics.add.collider).toHaveBeenCalledWith(
      mockPlayerSprite,
      mockScene.collisionLayer
    );
    expect(spyUpdatePlayerStats).toHaveBeenCalled();
    expect(mockPlayerSprite.anims.play).toHaveBeenCalledWith("walk-down");

    spyUpdatePlayerStats.mockRestore();
  });

  // 2. Test updatePlayerStats when currentHealth and currentMana are zero
  test("should update player stats correctly when currentHealth/currentMana = 0", () => {
    playerManager.currentHealth = 0;
    playerManager.currentMana = 0;

    calculatePlayerStats.mockReturnValue({
      health: 150,
      mana: 120,
      magicAttack: 18,
      meleeAttack: 14,
      magicDefense: 9,
      meleeDefense: 7,
      magicEvasion: 4,
      meleeEvasion: 2,
      speed: 110,
    });

    playerManager.updatePlayerStats();

    expect(playerManager.maxHealth).toBe(150);
    expect(playerManager.maxMana).toBe(120);
    // both had been zero, so they get set to max
    expect(playerManager.currentHealth).toBe(150);
    expect(playerManager.currentMana).toBe(120);

    expect(global.Phaser.Math.Clamp).toHaveBeenCalledWith(110, 50, 200);
    expect(playerManager.playerSpeed).toBe(110);
    expect(mockScene.emitStatsUpdate).toHaveBeenCalled();
  });

  // 3. Test updatePlayerStats when currentHealth/currentMana are non-zero
  test("should update player stats correctly when currentHealth/currentMana are non-zero and below max", () => {
    playerManager.currentHealth = 100;
    playerManager.currentMana = 80;
    playerManager.maxHealth = 150;
    playerManager.maxMana = 120;
    playerManager.playerSpeed = 100;

    calculatePlayerStats.mockReturnValue({
      health: 150,
      mana: 120,
      magicAttack: 18,
      meleeAttack: 14,
      magicDefense: 9,
      meleeDefense: 7,
      magicEvasion: 4,
      meleeEvasion: 2,
      speed: 110,
    });

    playerManager.updatePlayerStats();
    // It won't raise them to 150/120 because we already have 100/80
    expect(playerManager.currentHealth).toBe(100);
    expect(playerManager.currentMana).toBe(80);

    expect(playerManager.maxHealth).toBe(150);
    expect(playerManager.maxMana).toBe(120);
    expect(global.Phaser.Math.Clamp).toHaveBeenCalledWith(110, 50, 200);
    expect(playerManager.playerSpeed).toBe(110);
    expect(mockScene.emitStatsUpdate).toHaveBeenCalled();
  });

  // 4. Test getPlayerStats method
  test("getPlayerStats should return correct stats", () => {
    calculatePlayerStats.mockReturnValue({
      health: 120,
      mana: 80,
      magicAttack: 22,
      meleeAttack: 18,
      magicDefense: 11,
      meleeDefense: 9,
      magicEvasion: 5,
      meleeEvasion: 3,
      speed: 100,
    });

    playerManager.currentHealth = 100;
    playerManager.currentMana = 70;
    playerManager.maxHealth = 120;
    playerManager.maxMana = 80;
    playerManager.playerSpeed = 100;

    const stats = playerManager.getPlayerStats();

    // Because each property calls calculatePlayerStats() individually in the code,
    // check how many times we expect it. In the original code, it references each property:
    //   magicAttack, meleeAttack, magicDefense, meleeDefense, magicEvasion, meleeEvasion
    // That can add up to multiple calls to calculatePlayerStats(). If you see 6 calls, it’s correct.
    expect(calculatePlayerStats).toHaveBeenCalledTimes(6);

    expect(stats).toEqual({
      currentMana: 70,
      maxMana: 80,
      currentHealth: 100,
      maxHealth: 120,
      magicAttack: 22,
      meleeAttack: 18,
      magicDefense: 11,
      meleeDefense: 9,
      magicEvasion: 5,
      meleeEvasion: 3,
      speed: 100,
      level: 1,
    });
  });

  // 5. Test handleMovement when not casting
  test("should handle player movement correctly when not casting", () => {
    mockPlayerSprite.body.velocity.x = 0;
    mockPlayerSprite.body.velocity.y = 0;
    playerManager.playerSpeed = 100;

    const mockCursors = {
      up: { isDown: true },
      down: { isDown: false },
      left: { isDown: false },
      right: { isDown: false },
    };

    playerManager.handleMovement(mockCursors, false);

    expect(mockPlayerSprite.body.setVelocity).toHaveBeenCalledWith(0);
    expect(mockPlayerSprite.body.setVelocityY).toHaveBeenCalledWith(-100);
    expect(mockPlayerSprite.anims.play).toHaveBeenCalledWith("walk-up", true);
    expect(mockPlayerSprite.body.velocity.normalize).toHaveBeenCalled();
    expect(mockPlayerSprite.body.velocity.scale).toHaveBeenCalledWith(100);
  });

  // 6. Test handleMovement when casting
  test("should stop player movement and animations when casting", () => {
    mockPlayerSprite.body.velocity.x = 50;
    mockPlayerSprite.body.velocity.y = 50;

    const mockCursors = {
      up: { isDown: true },
      down: { isDown: false },
      left: { isDown: true },
      right: { isDown: false },
    };

    // isCasting = true
    playerManager.handleMovement(mockCursors, true);

    expect(mockPlayerSprite.body.setVelocity).toHaveBeenCalledWith(0);
    expect(mockPlayerSprite.anims.stop).toHaveBeenCalled();
    expect(mockPlayerSprite.body.velocity.normalize).not.toHaveBeenCalled();
    expect(mockPlayerSprite.body.velocity.scale).not.toHaveBeenCalled();
  });

  // 7. Test equipItem method (new item, no old item in slot)
  test("should equip an item and update stats correctly when no old item in slot", () => {
    // Let's say the slot is 'weapon' but currently it's "basic_staff"
    // We want to equip "Excalibur" so the old item is "basic_staff"
    mockScene.playerEquippedItems.weapon = null; // <--- no item currently in weapon slot

    calculatePlayerStats.mockReturnValue({
      health: 150,
      mana: 120,
      magicAttack: 22,
      meleeAttack: 18,
      magicDefense: 11,
      meleeDefense: 9,
      magicEvasion: 5,
      meleeEvasion: 3,
      speed: 103,
    });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const spyUpdatePlayerStats = jest.spyOn(playerManager, "updatePlayerStats");

    playerManager.equipItem("weapon", "Excalibur");

    expect(mockScene.playerEquippedItems.weapon).toBe("Excalibur");
    expect(spyUpdatePlayerStats).toHaveBeenCalled();
    expect(mockScene.emitStatsUpdate).toHaveBeenCalled();

    // The final logs
    expect(consoleSpy).toHaveBeenCalledWith("Equipped Excalibur to weapon");

    consoleSpy.mockRestore();
    spyUpdatePlayerStats.mockRestore();
  });

  // 8. Test equipItem method (already have an old item in slot)
  test("should move the old item to the first empty backpack cell if there's an old item in that slot", () => {
    // Suppose player already has "basic_staff" equipped in the weapon slot
    mockScene.playerEquippedItems.weapon = "basic_staff";
    // And let's set up the backpack so the first cell_0_0 is empty:
    mockScene.playerBackpack.cell_0_0 = 0; // empty

    // Now we equip "Excalibur"
    playerManager.equipItem("weapon", "Excalibur");

    // The old item was "basic_staff". We expect it to appear in cell_0_0
    expect(mockScene.playerBackpack.cell_0_0).not.toBe(0);
    expect(mockScene.playerBackpack.cell_0_0).toBe(1); 
    // Because in our mocked data, "basic_staff" has id=1

    // The new item is "Excalibur" in the slot
    expect(mockScene.playerEquippedItems.weapon).toBe("Excalibur");
  });

  // 9. Test regenerateStats method
  test("should regenerate player stats naturally", () => {
    playerManager.currentHealth = 90;
    playerManager.currentMana = 80;
    playerManager.maxHealth = 150;
    playerManager.maxMana = 120;

    const regenerationData = {
      manaRegen: 10,
      hpRegen: 5,
    };
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    playerManager.regenerateStats(regenerationData);
    expect(playerManager.currentMana).toBe(90);
    expect(playerManager.currentHealth).toBe(95);
    expect(mockScene.emitStatsUpdate).toHaveBeenCalledTimes(1);

    // if we do it again while near max
    playerManager.currentHealth = 148;
    playerManager.currentMana = 115;
    playerManager.regenerateStats(regenerationData);
    expect(playerManager.currentHealth).toBe(150);
    expect(playerManager.currentMana).toBe(120);

    expect(consoleSpy).toHaveBeenCalledWith(`Regenerated +10 mana, +5 HP`);
    expect(consoleSpy).toHaveBeenCalledWith(`Regenerated +5 mana, +2 HP`);

    consoleSpy.mockRestore();
  });

  // 10. Test gainExperience method
  test("gainExperience should simply call scene.gainExperience", () => {
    playerProfile.level = 1;
    playerProfile.totalExp = 90;

    jest.spyOn(console, "log").mockImplementation(() => {});

    playerManager.gainExperience(20);
    // We just expect that it delegates to scene.gainExperience
    expect(mockScene.gainExperience).toHaveBeenCalledWith(20);

    console.log.mockRestore();
  });

  // =================
  // Growth stats example
  // =================
  describe("playerGrowthStats", () => {
    test("should apply growth stats, then replenish", () => {
      // Pretend we just leveled up from 1 to 2
      playerProfile.level = 2;

      calculatePlayerStats.mockReturnValue({
        health: 127,  // 120 + 7
        mana: 90,     // 80 + 10
        magicAttack: 22,
        meleeAttack: 18,
        magicDefense: 11,
        meleeDefense: 9,
        magicEvasion: 5,
        meleeEvasion: 3,
        speed: 103,
      });

      playerManager.updatePlayerStats();
      expect(playerManager.maxHealth).toBe(127);
      expect(playerManager.maxMana).toBe(90);

      playerManager.replenishHealthAndMana();
      expect(playerManager.currentHealth).toBe(127);
      expect(playerManager.currentMana).toBe(90);

      // Called once in updatePlayerStats, once in replenishHealthAndMana
      expect(mockScene.emitStatsUpdate).toHaveBeenCalledTimes(2);
    });
  });

  // =================
  // expModifierRules
  // =================
  describe("expModifierRules checks", () => {
    const { expModifierRules } = require("../data/MOCKdata.js");

    test("mob is 3 levels higher => 1.1 multiplier", () => {
      playerProfile.level = 1;
      const mobLevel = 4; // difference = 3
      const baseExp = 100;

      let multiplier = 1.0;
      const difference = mobLevel - playerProfile.level;
      if (difference >= 5) {
        multiplier = expModifierRules.mobAtLeast5Higher;
      } else if (difference === 4) {
        multiplier = expModifierRules.mob4Higher;
      } else if (difference === 3) {
        multiplier = expModifierRules.mob3Higher; // 1.1
      } else if (difference === 2) {
        multiplier = expModifierRules.mob2Higher;
      } else if (difference === 1) {
        multiplier = expModifierRules.mob1Higher;
      } else if (difference === 0) {
        multiplier = expModifierRules.equalLevel;
      } else if (difference === -1) {
        multiplier = expModifierRules.player1Higher;
      } else if (difference === -2) {
        multiplier = expModifierRules.player2Higher;
      } else if (difference === -3) {
        multiplier = expModifierRules.player3Higher;
      } else if (difference === -4) {
        multiplier = expModifierRules.player4Higher;
      } else if (difference === -5) {
        multiplier = expModifierRules.player5Higher;
      } else {
        multiplier = expModifierRules.none;
      }

      const finalExp = Math.floor(baseExp * multiplier);
      expect(finalExp).toBe(Math.floor(100 * 1.1)); // 110
    });

    test("mob is 2 levels below => 0.9 multiplier", () => {
      playerProfile.level = 3;
      const mobLevel = 1; // difference = -2
      const baseExp = 100;

      let multiplier = 1.0;
      const difference = mobLevel - playerProfile.level;
      if (difference >= 5) {
        multiplier = expModifierRules.mobAtLeast5Higher;
      } else if (difference === 4) {
        multiplier = expModifierRules.mob4Higher;
      } else if (difference === 3) {
        multiplier = expModifierRules.mob3Higher;
      } else if (difference === 2) {
        multiplier = expModifierRules.mob2Higher;
      } else if (difference === 1) {
        multiplier = expModifierRules.mob1Higher;
      } else if (difference === 0) {
        multiplier = expModifierRules.equalLevel;
      } else if (difference === -1) {
        multiplier = expModifierRules.player1Higher;
      } else if (difference === -2) {
        multiplier = expModifierRules.player2Higher; // 0.9
      } else if (difference === -3) {
        multiplier = expModifierRules.player3Higher;
      } else if (difference === -4) {
        multiplier = expModifierRules.player4Higher;
      } else if (difference === -5) {
        multiplier = expModifierRules.player5Higher;
      } else {
        multiplier = expModifierRules.none;
      }
      const finalExp = Math.floor(baseExp * multiplier);
      expect(finalExp).toBe(Math.floor(100 * 0.9)); // 90
    });

    test("mob is 6 levels higher => 1.2 multiplier", () => {
      playerProfile.level = 2;
      const mobLevel = 8; // difference = 6 => "mobAtLeast5Higher": 1.2
      const baseExp = 100;

      let multiplier = 1.0;
      const difference = mobLevel - playerProfile.level;
      if (difference >= 5) {
        multiplier = expModifierRules.mobAtLeast5Higher; // 1.2
      } else if (difference === 4) {
        multiplier = expModifierRules.mob4Higher;
      } else if (difference === 3) {
        multiplier = expModifierRules.mob3Higher;
      } else if (difference === 2) {
        multiplier = expModifierRules.mob2Higher;
      } else if (difference === 1) {
        multiplier = expModifierRules.mob1Higher;
      } else if (difference === 0) {
        multiplier = expModifierRules.equalLevel;
      } else if (difference === -1) {
        multiplier = expModifierRules.player1Higher;
      } else if (difference === -2) {
        multiplier = expModifierRules.player2Higher;
      } else if (difference === -3) {
        multiplier = expModifierRules.player3Higher;
      } else if (difference === -4) {
        multiplier = expModifierRules.player4Higher;
      } else if (difference === -5) {
        multiplier = expModifierRules.player5Higher;
      } else {
        multiplier = expModifierRules.none;
      }
      const finalExp = Math.floor(baseExp * multiplier);
      expect(finalExp).toBe(Math.floor(100 * 1.2)); // 120
    });

    test("mob is more than 5 levels below => 0 multiplier", () => {
      playerProfile.level = 6;
      const mobLevel = 0; // difference = -6 => "none": 0.0
      const baseExp = 100;

      let multiplier = 1.0;
      const difference = mobLevel - playerProfile.level;
      if (difference >= 5) {
        multiplier = expModifierRules.mobAtLeast5Higher;
      } else if (difference === 4) {
        multiplier = expModifierRules.mob4Higher;
      } else if (difference === 3) {
        multiplier = expModifierRules.mob3Higher;
      } else if (difference === 2) {
        multiplier = expModifierRules.mob2Higher;
      } else if (difference === 1) {
        multiplier = expModifierRules.mob1Higher;
      } else if (difference === 0) {
        multiplier = expModifierRules.equalLevel;
      } else if (difference === -1) {
        multiplier = expModifierRules.player1Higher;
      } else if (difference === -2) {
        multiplier = expModifierRules.player2Higher;
      } else if (difference === -3) {
        multiplier = expModifierRules.player3Higher;
      } else if (difference === -4) {
        multiplier = expModifierRules.player4Higher;
      } else if (difference === -5) {
        multiplier = expModifierRules.player5Higher;
      } else {
        multiplier = expModifierRules.none; // 0
      }
      const finalExp = Math.floor(baseExp * multiplier);
      expect(finalExp).toBe(0);
    });
  });
});
