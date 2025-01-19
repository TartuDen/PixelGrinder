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
      name: "basic_staff",
      type: "staff",
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
    // Add other weapons as needed
  ],
  armorItems: [
    {
      name: "common_robe_chest",
      type: "robe",
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
    legs: "swift_gauntlets",
    feet: "light_boots",
  },
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
    // Add other skills as needed
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
    goblin: {
      name: "Goblin",
      level: 5,
      attackRange: 40,
      health: 40,
      mana: 0,
      magicAttack: 3,
      meleeAttack: 4,
      magicDefense: 2,
      meleeDefense: 5,
      magicEvasion: 2,
      meleeEvasion: 2,
      mobType: "enemy",
      mobAgroRange: 300,
      attackCooldown: 1500,
      speed: 70,
      expReward: 22,
    },
    // Add more mobs here...
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
}));

import PlayerManager from "../managers/PlayerManager.js";
import { calculatePlayerStats } from "../helpers/calculatePlayerStats.js";
import { playerProfile, playerGrowthStats } from "../data/MOCKdata.js"; // Import the mocked playerProfile and playerGrowthStats

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
      null, // scene will be assigned later
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
      playerEquippedItems: {
        weapon: "basic_staff",
        head: null,
        chest: null,
        shoulders: null,
        legs: "swift_gauntlets",
        feet: "light_boots",
      }, // Mock equipped items

      // Mocked methods used by PlayerManager
      emitStatsUpdate: jest.fn(), // Used by updatePlayerStats, etc.
      gainExperience: jest.fn(),  // Used by gainExperience method
    };

    // 4. Initialize PlayerManager with the mocked scene
    playerManager = new PlayerManager(mockScene);

    // 5. Assign the mocked player sprite to playerManager.player
    playerManager.player = mockPlayerSprite;

    // 6. Reset playerProfile and playerBaseStats
    playerProfile.level = 1;
    playerProfile.totalExp = 0;

    mockScene.playerEquippedItems.weapon = "basic_staff";
    mockScene.playerEquippedItems.head = null;
    mockScene.playerEquippedItems.chest = null;
    mockScene.playerEquippedItems.shoulders = null;
    mockScene.playerEquippedItems.legs = "swift_gauntlets";
    mockScene.playerEquippedItems.feet = "light_boots";

    playerManager.currentHealth = 120;
    playerManager.maxHealth = 120;
    playerManager.currentMana = 80;
    playerManager.maxMana = 80;
    playerManager.playerSpeed = 100;

    // Mock calculatePlayerStats to return updated stats
    calculatePlayerStats.mockReturnValue({
      health: playerManager.maxHealth + playerGrowthStats.health, // 120 + 7 = 127
      mana: playerManager.maxMana + playerGrowthStats.mana,       // 80 + 10 = 90
      magicAttack: 22,
      meleeAttack: 18,
      magicDefense: 11,
      meleeDefense: 9,
      magicEvasion: 5,
      meleeEvasion: 3,
      speed: Phaser.Math.Clamp(playerManager.playerSpeed + playerGrowthStats.speed, 50, 200), // 100 + 3 = 103
    });
  });

  // 1. Test Constructor
  test("should create player correctly", () => {
    // Mock calculatePlayerStats to return specific stats
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

    // Spy on updatePlayerStats
    const spyUpdatePlayerStats = jest.spyOn(playerManager, "updatePlayerStats");

    // Call createPlayer
    playerManager.createPlayer(tilemap);

    // Verify that findObject was called correctly
    expect(tilemap.findObject).toHaveBeenCalledWith(
      "GameObjects",
      expect.any(Function)
    );

    // Verify that physics.add.sprite was called with correct parameters
    expect(mockScene.physics.add.sprite).toHaveBeenCalledWith(
      100,
      150,
      "characters"
    );

    // Verify that sprite methods were called
    expect(mockPlayerSprite.setCollideWorldBounds).toHaveBeenCalledWith(true);
    expect(mockPlayerSprite.setScale).toHaveBeenCalledWith(1);

    // Verify collider setup
    expect(mockScene.physics.add.collider).toHaveBeenCalledWith(
      mockPlayerSprite,
      mockScene.collisionLayer
    );

    // Verify that updatePlayerStats was called
    expect(spyUpdatePlayerStats).toHaveBeenCalled();

    // Verify that default animation was played
    expect(mockPlayerSprite.anims.play).toHaveBeenCalledWith("walk-down");

    // Restore spy
    spyUpdatePlayerStats.mockRestore();
  });

  // 2. Test updatePlayerStats when currentHealth and currentMana are zero
  test("should update player stats correctly when currentHealth and currentMana are zero", () => {
    // Initialize player stats
    playerManager.currentHealth = 0;
    playerManager.currentMana = 0;

    // Mock calculatePlayerStats to return specific stats
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

    // Verify that calculatePlayerStats was called
    expect(calculatePlayerStats).toHaveBeenCalled();

    // Verify that maxHealth and maxMana were set
    expect(playerManager.maxHealth).toBe(150);
    expect(playerManager.maxMana).toBe(120);

    // Verify that currentHealth and currentMana were initialized to max
    expect(playerManager.currentHealth).toBe(150);
    expect(playerManager.currentMana).toBe(120);

    // Verify that playerSpeed was clamped correctly
    expect(global.Phaser.Math.Clamp).toHaveBeenCalledWith(110, 50, 200);
    expect(playerManager.playerSpeed).toBe(110);

    // Verify that emitStatsUpdate was called
    expect(mockScene.emitStatsUpdate).toHaveBeenCalled();
  });

  // 3. Test updatePlayerStats when currentHealth and currentMana are non-zero and below max
  test("should update player stats correctly when currentHealth and currentMana are non-zero and below max", () => {
    // Initialize player stats
    playerManager.currentHealth = 100;
    playerManager.currentMana = 80;
    playerManager.maxHealth = 150;
    playerManager.maxMana = 120;
    playerManager.playerSpeed = 100;

    // Mock calculatePlayerStats to return specific stats
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

    // Verify that calculatePlayerStats was called
    expect(calculatePlayerStats).toHaveBeenCalled();

    // Verify that maxHealth and maxMana were set
    expect(playerManager.maxHealth).toBe(150);
    expect(playerManager.maxMana).toBe(120);

    // Verify that currentHealth and currentMana were clamped if needed
    expect(playerManager.currentHealth).toBe(100); // stays the same
    expect(playerManager.currentMana).toBe(80);

    // Verify that playerSpeed was clamped correctly
    expect(global.Phaser.Math.Clamp).toHaveBeenCalledWith(110, 50, 200);
    expect(playerManager.playerSpeed).toBe(110);

    // Verify that emitStatsUpdate was called
    expect(mockScene.emitStatsUpdate).toHaveBeenCalled();
  });

  // 4. Test getPlayerStats method
  test("getPlayerStats should return correct stats", () => {
    // Mock calculatePlayerStats to return specific stats
    calculatePlayerStats.mockReturnValue({
      magicAttack: 22,
      magicDefense: 11,
      magicEvasion: 5,
      meleeAttack: 18,
      meleeDefense: 9,
      meleeEvasion: 3,
    });

    // Initialize player stats
    playerManager.currentHealth = 120;
    playerManager.currentMana = 80;
    playerManager.maxHealth = 150;
    playerManager.maxMana = 120;
    playerManager.playerSpeed = 100;

    const stats = playerManager.getPlayerStats();

    // Because getPlayerStats references each stat from calculatePlayerStats,
    // it calls `calculatePlayerStats()` 6 times (one for each .magicAttack, .meleeAttack, etc).
    // So we expect 6 calls instead of 1:
    expect(calculatePlayerStats).toHaveBeenCalledTimes(6);

    // Verify returned stats
    expect(stats).toEqual({
      currentMana: 80,
      maxMana: 120,
      currentHealth: 120,
      maxHealth: 150,
      magicAttack: 22,
      meleeAttack: 18,
      magicDefense: 11,
      meleeDefense: 9,
      magicEvasion: 5,
      meleeEvasion: 3,
      speed: 100,
      level: 1, // Ensure 'level' is included as mocked
    });
  });

  // 5. Test handleMovement when not casting
  test("should handle player movement correctly when not casting", () => {
    // Initialize player sprite body velocity to zero
    mockPlayerSprite.body.velocity.x = 0;
    mockPlayerSprite.body.velocity.y = 0;

    // Mock playerSpeed
    playerManager.playerSpeed = 100;

    // Mock cursors input
    const mockCursors = {
      up: { isDown: true },
      down: { isDown: false },
      left: { isDown: false },
      right: { isDown: false },
    };

    // Call handleMovement
    playerManager.handleMovement(mockCursors, false);

    // Verify that setVelocity was called to reset velocity
    expect(mockPlayerSprite.body.setVelocity).toHaveBeenCalledWith(0);

    // Verify that setVelocityY was called correctly
    expect(mockPlayerSprite.body.setVelocityY).toHaveBeenCalledWith(-100);

    // Verify that appropriate animation was played
    expect(mockPlayerSprite.anims.play).toHaveBeenCalledWith("walk-up", true);

    // Verify that velocity.normalize was called
    expect(mockPlayerSprite.body.velocity.normalize).toHaveBeenCalled();

    // Verify that velocity.scale was called with playerSpeed
    expect(mockPlayerSprite.body.velocity.scale).toHaveBeenCalledWith(100);
  });

  // 6. Test handleMovement when casting
  test("should stop player movement and animations when casting", () => {
    // Initialize player sprite body velocity to some value
    mockPlayerSprite.body.velocity.x = 50;
    mockPlayerSprite.body.velocity.y = 50;

    // Mock cursors input (values don't matter since isCasting is true)
    const mockCursors = {
      up: { isDown: true },
      down: { isDown: false },
      left: { isDown: true },
      right: { isDown: false },
    };

    // Call handleMovement with isCasting = true
    playerManager.handleMovement(mockCursors, true);

    // Verify that setVelocity was called to stop movement
    expect(mockPlayerSprite.body.setVelocity).toHaveBeenCalledWith(0);

    // Verify that animations were stopped
    expect(mockPlayerSprite.anims.stop).toHaveBeenCalled();

    // Verify that velocity.normalize was NOT called (since movement is stopped)
    expect(mockPlayerSprite.body.velocity.normalize).not.toHaveBeenCalled();

    // Verify that velocity.scale was NOT called
    expect(mockPlayerSprite.body.velocity.scale).not.toHaveBeenCalled();
  });

  // 7. Test equipItem method
  test("should equip an item and update stats correctly", () => {
    // Initialize player stats
    playerManager.currentHealth = 100;
    playerManager.currentMana = 50;
    playerManager.maxHealth = 150;
    playerManager.maxMana = 120;
    playerManager.playerSpeed = 100;

    // Mock calculatePlayerStats to return updated stats after equipping
    calculatePlayerStats.mockReturnValue({
      health: 150 + 7, // 150 + 7 = 157
      mana: 120 + 10,   // 120 + 10 = 130
      magicAttack: 22,
      meleeAttack: 18,
      magicDefense: 11,
      meleeDefense: 9,
      magicEvasion: 5,
      meleeEvasion: 3,
      speed: Phaser.Math.Clamp(100 + 3, 50, 200), // 103
    });

    // Spy on console.log
    jest.spyOn(console, "log").mockImplementation(() => {});

    // Spy on updatePlayerStats
    const spyUpdatePlayerStats = jest.spyOn(playerManager, "updatePlayerStats");

    // Call equipItem
    playerManager.equipItem("weapon", "Excalibur");

    // Verify that the item was equipped
    expect(mockScene.playerEquippedItems.weapon).toBe("Excalibur");

    // Verify that calculatePlayerStats was called
    expect(calculatePlayerStats).toHaveBeenCalled();

    // Verify that updatePlayerStats was called
    expect(spyUpdatePlayerStats).toHaveBeenCalled();

    // Verify that emitStatsUpdate was called
    expect(mockScene.emitStatsUpdate).toHaveBeenCalled();

    // Verify console logs
    expect(console.log).toHaveBeenCalledWith("Equipped Excalibur to weapon");
    expect(console.log).toHaveBeenCalledWith(
      `Player Speed Updated: 103`
    );

    // Restore spies
    spyUpdatePlayerStats.mockRestore();
    console.log.mockRestore();
  });

  // 8. Test regenerateStats method
  test("should regenerate player stats naturally over time", () => {
    // Initialize player stats
    playerManager.currentHealth = 90;
    playerManager.currentMana = 80;
    playerManager.maxHealth = 150;
    playerManager.maxMana = 120;

    // Define regeneration data
    const regenerationData = {
      manaRegen: 10,
      hpRegen: 5,
    };

    // Mock console.log to suppress logs during tests
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Call regenerateStats
    playerManager.regenerateStats(regenerationData);

    // Verify that currentMana and currentHealth were updated correctly
    expect(playerManager.currentMana).toBe(90); // 80 +10 = 90
    expect(playerManager.currentHealth).toBe(95); // 90 +5 =95

    // Ensure that values do not exceed max
    playerManager.currentHealth = 148;
    playerManager.currentMana = 115;
    playerManager.regenerateStats(regenerationData);
    expect(playerManager.currentHealth).toBe(150); // Clamped to maxHealth
    expect(playerManager.currentMana).toBe(120); // Clamped to maxMana

    // Now, we expect `emitStatsUpdate` to have been called twice
    expect(mockScene.emitStatsUpdate).toHaveBeenCalledTimes(2);

    // Verify console logs for regeneration
    expect(consoleSpy).toHaveBeenCalledWith(`Regenerated +10 mana, +5 HP`);
    expect(consoleSpy).toHaveBeenCalledWith(`Regenerated +5 mana, +2 HP`);

    // Restore console.log
    consoleSpy.mockRestore();
  });

  // 9. Test gainExperience method when level up is triggered
  test("gainExperience should add EXP correctly and trigger level up when threshold is crossed", () => {
    // Setup
    // Assuming playerProfile.level is 1
    playerProfile.level = 1;
    playerProfile.totalExp = 90; // Close to level 2 (100 needed)

    // Mock console.log to suppress logs during tests
    jest.spyOn(console, "log").mockImplementation(() => {});

    // Call gainExperience
    playerManager.gainExperience(20);

    // Ensure we called `scene.gainExperience`
    expect(mockScene.gainExperience).toHaveBeenCalledWith(20);

    // Restore console.log
    console.log.mockRestore();
  });

  // 10. Test gainExperience method when level up is not triggered
  test("gainExperience should not trigger level up when threshold is not crossed", () => {
    // Setup
    // Assuming playerProfile.level is 2
    playerProfile.level = 2;
    playerProfile.totalExp = 200;

    // Mock console.log to suppress logs during tests
    jest.spyOn(console, "log").mockImplementation(() => {});

    // Call gainExperience
    playerManager.gainExperience(30);

    // We only expect scene.gainExperience(30)
    expect(mockScene.gainExperience).toHaveBeenCalledWith(30);

    // Restore console.log
    console.log.mockRestore();
  });

  // =================
  // playerGrowthStats tests
  // =================
  describe("playerGrowthStats", () => {
    test("should correctly increase player attributes based on playerGrowthStats when leveling up", () => {
      // Simulate leveling up by increasing playerProfile.level
      playerProfile.level = 2;

      // Call updatePlayerStats to apply growth
      playerManager.updatePlayerStats();

      // Now, to simulate the replenishment of health and mana upon leveling up,
      // you need to call replenishHealthAndMana
      playerManager.replenishHealthAndMana();

      // Verify that stats have increased correctly
      expect(playerManager.maxHealth).toBe(127); // 120 + 7
      expect(playerManager.maxMana).toBe(90);    // 80 + 10
      expect(playerManager.playerSpeed).toBe(103); // 100 + 3, clamped between 50 and 200

      // Verify that currentHealth and currentMana are updated to max
      expect(playerManager.currentHealth).toBe(127);
      expect(playerManager.currentMana).toBe(90);

      // Verify that emitStatsUpdate was called
      expect(mockScene.emitStatsUpdate).toHaveBeenCalledTimes(2); // once for updatePlayerStats and once for replenishHealthAndMana
    });
  });

  // =================
  // expModifierRules tests
  // =================
  describe("expModifierRules", () => {
    const { expModifierRules } = require("../data/MOCKdata.js"); // Import the mocked expModifierRules

    test("should apply correct EXP multiplier when mob is 3 levels higher than player", () => {
      // Ensure player level is 1
      playerProfile.level = 1;

      // Mob is 4, which is 3 levels higher than player (mobLevel - playerLevel = 3)
      const mobLevel = 4;
      const levelDifference = mobLevel - playerProfile.level; // 3
      const expectedMultiplier = expModifierRules.mob3Higher; // 1.1
      const baseExp = 100;
      const expectedExp = Math.floor(baseExp * expectedMultiplier); // 110

      // Simulate the calculation as in MobManager
      const levelDiff = mobLevel - playerProfile.level;
      let multiplier = 1.0;

      if (levelDiff >= 5) {
        multiplier = expModifierRules.mobAtLeast5Higher;
      } else if (levelDiff === 4) {
        multiplier = expModifierRules.mob4Higher;
      } else if (levelDiff === 3) {
        multiplier = expModifierRules.mob3Higher;
      } else if (levelDiff === 2) {
        multiplier = expModifierRules.mob2Higher;
      } else if (levelDiff === 1) {
        multiplier = expModifierRules.mob1Higher;
      } else if (levelDiff === 0) {
        multiplier = expModifierRules.equalLevel;
      } else if (levelDiff === -1) {
        multiplier = expModifierRules.player1Higher;
      } else if (levelDiff === -2) {
        multiplier = expModifierRules.player2Higher;
      } else if (levelDiff === -3) {
        multiplier = expModifierRules.player3Higher;
      } else if (levelDiff === -4) {
        multiplier = expModifierRules.player4Higher;
      } else if (levelDiff === -5) {
        multiplier = expModifierRules.player5Higher;
      } else {
        multiplier = expModifierRules.none;
      }

      const finalExp = Math.floor(baseExp * multiplier);
      expect(finalExp).toBe(expectedExp);
    });

    test("should apply correct EXP multiplier when mob is 2 levels below player", () => {
      // Player level is 3
      playerProfile.level = 3;

      // Mob is 1, which is 2 levels below (mobLevel - playerLevel = -2)
      const mobLevel = 1; // difference = -2
      const expectedMultiplier = expModifierRules.player2Higher; // 0.9
      const baseExp = 100;
      const expectedExp = Math.floor(baseExp * expectedMultiplier); // 90

      // Simulate the calculation as in MobManager
      const levelDiff = mobLevel - playerProfile.level;
      let multiplier = 1.0;

      if (levelDiff >= 5) {
        multiplier = expModifierRules.mobAtLeast5Higher;
      } else if (levelDiff === 4) {
        multiplier = expModifierRules.mob4Higher;
      } else if (levelDiff === 3) {
        multiplier = expModifierRules.mob3Higher;
      } else if (levelDiff === 2) {
        multiplier = expModifierRules.mob2Higher;
      } else if (levelDiff === 1) {
        multiplier = expModifierRules.mob1Higher;
      } else if (levelDiff === 0) {
        multiplier = expModifierRules.equalLevel;
      } else if (levelDiff === -1) {
        multiplier = expModifierRules.player1Higher;
      } else if (levelDiff === -2) {
        multiplier = expModifierRules.player2Higher;
      } else if (levelDiff === -3) {
        multiplier = expModifierRules.player3Higher;
      } else if (levelDiff === -4) {
        multiplier = expModifierRules.player4Higher;
      } else if (levelDiff === -5) {
        multiplier = expModifierRules.player5Higher;
      } else {
        multiplier = expModifierRules.none;
      }

      const finalExp = Math.floor(baseExp * multiplier);
      expect(finalExp).toBe(expectedExp);
    });

    test("should apply correct EXP multiplier when mob is 6 levels higher than player", () => {
      // Player level is 2
      playerProfile.level = 2;

      // Mob is 8, which is 6 levels higher (mobLevel - playerLevel = 6)
      const mobLevel = 8;
      const levelDifference = mobLevel - playerProfile.level; // 6
      const expectedMultiplier = expModifierRules.mobAtLeast5Higher; // 1.2
      const baseExp = 100;
      const expectedExp = Math.floor(baseExp * expectedMultiplier); // 120

      // Simulate the calculation as in MobManager
      const levelDiff = mobLevel - playerProfile.level;
      let multiplier = 1.0;

      if (levelDiff >= 5) {
        multiplier = expModifierRules.mobAtLeast5Higher;
      } else if (levelDiff === 4) {
        multiplier = expModifierRules.mob4Higher;
      } else if (levelDiff === 3) {
        multiplier = expModifierRules.mob3Higher;
      } else if (levelDiff === 2) {
        multiplier = expModifierRules.mob2Higher;
      } else if (levelDiff === 1) {
        multiplier = expModifierRules.mob1Higher;
      } else if (levelDiff === 0) {
        multiplier = expModifierRules.equalLevel;
      } else if (levelDiff === -1) {
        multiplier = expModifierRules.player1Higher;
      } else if (levelDiff === -2) {
        multiplier = expModifierRules.player2Higher;
      } else if (levelDiff === -3) {
        multiplier = expModifierRules.player3Higher;
      } else if (levelDiff === -4) {
        multiplier = expModifierRules.player4Higher;
      } else if (levelDiff === -5) {
        multiplier = expModifierRules.player5Higher;
      } else {
        multiplier = expModifierRules.none;
      }

      const finalExp = Math.floor(baseExp * multiplier);
      expect(finalExp).toBe(expectedExp);
    });

    test("should apply correct EXP multiplier when mob is more than 5 levels below player", () => {
      // Player level is 6
      playerProfile.level = 6;

      // Mob is 0, which is 6 levels below (mobLevel - playerLevel = -6)
      const mobLevel = 0; // difference = -6
      const expectedMultiplier = expModifierRules.none; // 0.0
      const baseExp = 100;
      const expectedExp = Math.floor(baseExp * expectedMultiplier); // 0

      // Simulate the calculation as in MobManager
      const levelDiff = mobLevel - playerProfile.level;
      let multiplier = 1.0;

      if (levelDiff >= 5) {
        multiplier = expModifierRules.mobAtLeast5Higher;
      } else if (levelDiff === 4) {
        multiplier = expModifierRules.mob4Higher;
      } else if (levelDiff === 3) {
        multiplier = expModifierRules.mob3Higher;
      } else if (levelDiff === 2) {
        multiplier = expModifierRules.mob2Higher;
      } else if (levelDiff === 1) {
        multiplier = expModifierRules.mob1Higher;
      } else if (levelDiff === 0) {
        multiplier = expModifierRules.equalLevel;
      } else if (levelDiff === -1) {
        multiplier = expModifierRules.player1Higher;
      } else if (levelDiff === -2) {
        multiplier = expModifierRules.player2Higher;
      } else if (levelDiff === -3) {
        multiplier = expModifierRules.player3Higher;
      } else if (levelDiff === -4) {
        multiplier = expModifierRules.player4Higher;
      } else if (levelDiff === -5) {
        multiplier = expModifierRules.player5Higher;
      } else {
        multiplier = expModifierRules.none;
      }

      const finalExp = Math.floor(baseExp * multiplier);
      expect(finalExp).toBe(expectedExp);
    });
  });
});
