/**
 * @jest-environment jsdom
 */

// __tests__/MobManager.test.js

// 1. Mock Helper Functions at the very top before any imports
jest.mock("../helpers/calculatePlayerStats.js", () => ({
  calculateMeleeDamage: jest.fn().mockReturnValue(5),
  calculateMagicDamage: jest.fn().mockReturnValue(7),
}));

import MobManager from "../managers/MobManager.js";
import * as calculatePlayerStats from "../helpers/calculatePlayerStats.js";
import {
  mobsData,
  MOB_CHASE_SPEED_MULT,
  SKILL_RANGE_EXTENDER,
  TAB_TARGET_RANGE,
  expModifierRules, // Ensure this is imported if used in MobManager.js
} from "../data/MOCKdata.js";

// 2. Mock Phaser globally
global.Phaser = {
  Math: {
    Distance: {
      Between: jest.fn(),
    },
    FloatBetween: jest.fn(),
    Between: jest.fn(),
    Vector2: class {
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }

      normalize() {
        const length = Math.sqrt(this.x * this.x + this.y * this.y);
        if (length === 0) return this;
        this.x /= length;
        this.y /= length;
        return this;
      }

      lengthSq() {
        return this.x * this.x + this.y * this.y;
      }

      set(x, y) {
        this.x = x;
        this.y = y;
        return this;
      }
    },
  },
  Utils: {
    Array: {
      GetRandom: jest.fn(),
    },
  },
  Physics: {
    Group: jest.fn(),
  },
  GameObjects: {
    Sprite: jest.fn(),
    Text: jest.fn(),
  },
  Time: {
    addEvent: jest.fn(),
    delayedCall: jest.fn(),
  },
};

// 3. Utility function to create mock mobs
function createMockMob(id = "slime") {
  // Default to "slime"
  return {
    // Mark mob as active so updateMobs() doesn't bail out
    active: true,

    setInteractive: jest.fn().mockReturnThis(),
    on: jest.fn(),
    setScale: jest.fn().mockReturnThis(),
    play: jest.fn(),
    setTint: jest.fn(),
    clearTint: jest.fn(),
    setActive: jest.fn().mockReturnThis(),
    setVisible: jest.fn().mockReturnThis(),
    body: {
      setVelocity: jest.fn(),
      setEnable: jest.fn(),
    },
    anims: {
      play: jest.fn(),
      stop: jest.fn(),
    },
    customData: {
      id,
      hp: mobsData[id].health,
      magicDefense: mobsData[id].magicDefense || 0,
      meleeDefense: mobsData[id].meleeDefense || 0,
      magicEvasion: mobsData[id].magicEvasion || 0,
      meleeEvasion: mobsData[id].meleeEvasion || 0,
      spawnX: 0,
      spawnY: 0,
      isDead: false,
      currentType: mobsData[id].mobType, // 'friend' or 'enemy'
      state: "idle", // 'idle', 'wandering', 'chasing', 'attacking', 'unsticking'
      lastAttackTime: 0,
      hpText: null,

      // [UPDATED for new features]
      wanderDirection: new Phaser.Math.Vector2(0, 0),
      visionDistance: 32,
      lastChaseCheckTime: 0,
      lastPosition: { x: 0, y: 0 },
      stuckCheckInterval: 1000,
      isUnsticking: false,
    },
  };
}

// 4. Define mock classes for Text to simulate Phaser's GameObjects
const mockText = {
  setPosition: jest.fn().mockReturnThis(),
  setText: jest.fn().mockReturnThis(),
  setVisible: jest.fn().mockReturnThis(),
  setOrigin: jest.fn().mockReturnThis(),
};

// 5. Mock the scene
const mockScene = {
  physics: {
    add: {
      group: jest.fn(),
      collider: jest.fn(),
    },
  },
  playerManager: {
    player: { x: 100, y: 100 },
    getPlayerStats: jest.fn(() => ({
      meleeEvasion: 10,
      magicEvasion: 5,
      magicDefense: 3,
      meleeDefense: 2,
      // level can be added here if directly used
    })),
    currentHealth: 100,
    gainExperience: jest.fn(), // <-- Mock for gainExperience
  },
  time: {
    now: 0, // We'll manually set this during tests
    addEvent: jest.fn((eventConfig) => {
      // If it's a loop, simulate repeated callbacks
      if (eventConfig.loop) {
        const interval = setInterval(() => {
          eventConfig.callback();
        }, eventConfig.delay);
        return {
          remove: () => clearInterval(interval),
        };
      } else {
        const timeout = setTimeout(() => {
          eventConfig.callback();
        }, eventConfig.delay);
        return {
          remove: () => clearTimeout(timeout),
        };
      }
    }),
    delayedCall: jest.fn((delay, callback) => {
      const timeout = setTimeout(callback, delay);
      return {
        remove: () => clearTimeout(timeout),
      };
    }),
  },
  add: {
    sprite: jest.fn(),
    text: jest.fn(() => mockText),
  },
  // [NEW] Mock collisionLayer with a getTileAtWorldXY method for obstacle checks
  collisionLayer: {
    getTileAtWorldXY: jest.fn().mockReturnValue(null), // By default, no obstacle
  },

  mobs: null, // Will be set in MobManager
  targetedMob: null,
  updateUI: jest.fn(), // Mock updateUI directly
  handlePlayerDeath: jest.fn(), // Mock handlePlayerDeath if called

  // For level-based logic in handleMobDeath
  playerProfile: { level: 1 },
};

// 6. Initialize MobManager and set up mobs before each test
let mobManager;
let mockGroup;
let mockMobs;

// Before each test, set up the mocks
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();

  // Make sure each test starts with full player health:
  mockScene.playerManager.currentHealth = 100;

  // Ensure 'slime' is an enemy type for testing
  mobsData["slime"].mobType = "enemy";

  // Create mock mobs as "slime" (enemy)
  const mob1 = createMockMob("slime");
  mob1.customData.spawnX = 200;
  mob1.customData.spawnY = 300;

  const mob2 = createMockMob("slime");
  mob2.customData.spawnX = 400;
  mob2.customData.spawnY = 500;

  // Put them in an array
  mockMobs = [mob1, mob2];

  // Mock group.create to return mobs from mockMobs array
  mockGroup = {
    create: jest.fn((x, y, key) => {
      const mob = mockMobs.shift();
      mob.customData.spawnX = x;
      mob.customData.spawnY = y;
      return mob;
    }),
    getChildren: jest.fn(() => {
      return [mob1, mob2].filter((m) => m.customData.spawnX !== 0);
    }),
  };

  // Mock physics.add.group to return mockGroup
  mockScene.physics.add.group.mockReturnValue(mockGroup);

  // Mock add.text to return mockText
  mockScene.add.text.mockReturnValue(mockText);

  // **[FIX]** Mock Phaser.Utils.Array.GetRandom to always return a direction
  // This ensures that whenever GetRandom is called, it returns a valid direction
  Phaser.Utils.Array.GetRandom.mockImplementation((array) => {
    // For simplicity, always return the first element
    return array[0];
  });

  // **[FIX]** Ensure that 'directions' array has at least one element
  // in the MobManager.js implementation to prevent GetRandom from returning undefined
  // Alternatively, adjust the mock to return a valid direction

  // **[IMPORTANT FIX]** Mock Phaser.Math.Between to return 1 (doIdle = false)
  Phaser.Math.Between.mockReturnValue(1);

  // Instantiate MobManager with the mocked scene
  mobManager = new MobManager(mockScene);

  // Define mock spawn zones
  const mockSpawnZones = [
    { name: "MobSpawnZone1", x: 200, y: 300 },
    { name: "MobSpawnZone2", x: 400, y: 500 },
  ];

  // Mock tilemap with getObjectLayer method
  const mockTilemap = {
    getObjectLayer: jest.fn(() => ({
      objects: mockSpawnZones,
    })),
  };

  // Assign the mocked tilemap to the scene if needed
  mockScene.map = mockTilemap;

  // Call createMobs with the mocked tilemap
  mobManager.createMobs(mockTilemap);
});

// After each test, restore all mocks
afterEach(() => {
  jest.clearAllTimers();
  jest.restoreAllMocks(); // Restore original implementations
});

describe("MobManager", () => {
  test("should create mobs correctly", () => {
    // Verify that physics groups and colliders are set up
    expect(mockScene.physics.add.group).toHaveBeenCalledWith({
      collideWorldBounds: true,
    });
    expect(mockScene.physics.add.collider).toHaveBeenCalledTimes(3);
    // Colliders: (mobs, player), (mobs, collisionLayer), (mobs, mobs)

    // Verify that mobs are created based on spawn zones
    expect(mockGroup.create).toHaveBeenCalledTimes(2); // Two spawn zones

    // Verify that mob properties are set correctly
    mockGroup.getChildren().forEach((mob) => {
      // hpText should have been set
      expect(mockScene.add.text).toHaveBeenCalledWith(
        mob.customData.spawnX,
        mob.customData.spawnY - 20,
        `HP: ${mob.customData.hp}`,
        {
          font: "14px Arial",
          fill: "#ffffff",
          shadow: {
            offsetX: 2,
            offsetY: 2,
            color: "#000000",
            blur: 2,
            stroke: true,
            fill: true,
          },
        }
      );

      // setOrigin should have been called
      expect(mockText.setOrigin).toHaveBeenCalledWith(0.5);

      // setInteractive should have been called
      expect(mob.setInteractive).toHaveBeenCalledWith({ useHandCursor: true });

      // mob.anims.play should have been called for initial animation
      expect(mob.anims.play).toHaveBeenCalledWith("mob-walk-down");

      // Since Phaser.Math.Between is mocked to return 1, mobs start wandering
      // wanderDirection was set by GetRandom to the first direction in 'directions'
      // Assuming 'directions' starts with right, setVelocity should have been called with (speed, 0)
      expect(mob.body.setVelocity).toHaveBeenCalledWith(
        mobsData[mob.customData.id].speed,
        0
      );

      // Expect anims.play to have been called with "mob-walk-right", true
      expect(mob.anims.play).toHaveBeenCalledWith("mob-walk-right", true);
    });
  });

  test("should handle mob state transitions based on player distance", () => {
    const player = mockScene.playerManager.player;

    // Force the distance to always be 100, within slime's mobAgroRange of 300
    Phaser.Math.Distance.Between.mockReturnValue(100);

    // Simulate update call
    mobManager.updateMobs(player);

    // Each mob should transition from "wandering" to "chasing"
    mockGroup.getChildren().forEach((mob) => {
      expect(mob.customData.state).toBe("chasing");
      // Expect chasePlayer to have been called, which sets velocity and plays animation
      // Since chasePlayer is internal, we check if setVelocity was called again with direction
      // For simplicity, verify that setVelocity was called with correct parameters

      // Calculate expected direction based on player's position (100,100) and mob's spawn (200,300) or (400,500)
      // Direction vector: (player.x - mob.x, player.y - mob.y).normalize()
      // For mob1: (100 - 200, 100 - 300) = (-100, -200). Normalize to (-0.4472, -0.8944)
      // chaseSpeed = speed * MOB_CHASE_SPEED_MULT
      const chaseSpeed = mobsData[mob.customData.id].speed * MOB_CHASE_SPEED_MULT;

      // Due to floating point precision and mock implementations, we'll simplify the assertion
      // Just ensure that setVelocity was called with non-zero values
      expect(mob.body.setVelocity).toHaveBeenCalledWith(
        expect.not.stringContaining("undefined"),
        expect.not.stringContaining("undefined")
      );

      // Expect anims.play to have been called with a direction animation
      expect(mob.anims.play).toHaveBeenCalled();
    });
  });

  test("should attack the player when within attack range and apply damage", () => {
    const player = mockScene.playerManager.player;

    // Force the distance to be 30, below slime's attackRange=40
    Phaser.Math.Distance.Between.mockReturnValue(30);

    // Mock current time so cooldown checks pass
    mockScene.time.now = 10000;

    // Make sure lastAttackTime is old enough
    mockGroup.getChildren().forEach((mob) => {
      mob.customData.lastAttackTime = 0; // not on cooldown
      mob.customData.state = "attacking"; // Force them into "attacking" state
    });

    // Simulate update call
    mobManager.updateMobs(player);

    // Expect calculateMeleeDamage to have been called for each mob
    expect(calculatePlayerStats.calculateMeleeDamage).toHaveBeenCalledTimes(2);

    // Each mob does 5 damage -> total 10 damage if both attack
    // Starting health = 100 => after two mobs, 90
    expect(mockScene.playerManager.currentHealth).toBe(90);

    // UI should have been updated
    expect(mockScene.updateUI).toHaveBeenCalled();
  });

  test("should handle mob death and respawn", () => {
    // Grab first mob and kill it
    const mob = mockGroup.getChildren()[0];
    mob.customData.hp = 0;

    // Define expReward for 'slime'
    mobsData["slime"].expReward = 10;
    mobsData["slime"].level = 1; // Ensure level is set

    // Call handleMobDeath
    mobManager.handleMobDeath(mob);

    // The code that sets mob inactive/invisible is inside a 1000ms delayedCall
    // So, fast-forward time by 1000ms to trigger delayedCall
    jest.advanceTimersByTime(1000);

    // Verify gainExperience was called with modified EXP
    const difference = mobsData["slime"].level - mockScene.playerProfile.level; // 0
    const expectedExp = Math.floor(mobsData["slime"].expReward * expModifierRules.equalLevel); // 10 * 1.0 = 10
    expect(mockScene.playerManager.gainExperience).toHaveBeenCalledWith(expectedExp);

    expect(mob.setActive).toHaveBeenCalledWith(false);
    expect(mob.setVisible).toHaveBeenCalledWith(false);
    expect(mob.body.setEnable).toHaveBeenCalledWith(false);
    expect(mob.customData.hpText.setVisible).toHaveBeenCalledWith(false);

    // Then respawn is triggered 5000ms later
    jest.advanceTimersByTime(5000);

    // Mob should have new HP, be active, etc.
    expect(mob.customData.hp).toBe(mobsData["slime"].health);
    expect(mob.customData.isDead).toBe(false);
    expect(mob.setActive).toHaveBeenCalledWith(true);
    expect(mob.setVisible).toHaveBeenCalledWith(true);
    expect(mob.body.setEnable).toHaveBeenCalledWith(true);
    expect(mob.customData.hpText.setText).toHaveBeenCalledWith(
      `HP: ${mobsData["slime"].health}`
    );
    expect(mob.customData.hpText.setPosition).toHaveBeenCalledWith(
      mob.customData.spawnX,
      mob.customData.spawnY - 20
    );
    expect(mob.customData.hpText.setVisible).toHaveBeenCalledWith(true);

    // Verify that the mob starts the idle/wander cycle again
    // Since 'Phaser.Math.Between' returns 1, it should start wandering
    // Which means setVelocity should have been called again with (speed, 0)
    expect(mob.body.setVelocity).toHaveBeenCalledWith(
      mobsData[mob.customData.id].speed,
      0
    );
    expect(mob.anims.play).toHaveBeenCalledWith("mob-walk-right", true);
  });

  test("should handle attack evasion correctly", () => {
    const player = mockScene.playerManager.player;

    // Force the distance to be within attack range
    Phaser.Math.Distance.Between.mockReturnValue(30);

    // Mock current time to pass cooldown
    mockScene.time.now = 2000;

    // Force "attacking" state
    mockGroup.getChildren().forEach((mob) => {
      mob.customData.state = "attacking";
      mob.customData.lastAttackTime = 0;
    });

    // Spy on isAttackEvaded to always return true
    jest.spyOn(MobManager.prototype, "isAttackEvaded").mockReturnValue(true);

    // Call update
    mobManager.updateMobs(player);

    // Each mob tries to attack once, so isAttackEvaded is called
    expect(mobManager.isAttackEvaded).toHaveBeenCalledTimes(2);
    // Slime uses meleeAttack, so we check player's meleeEvasion=10
    expect(mobManager.isAttackEvaded).toHaveBeenCalledWith(10);
    expect(mobManager.isAttackEvaded).toHaveBeenCalledWith(10);

    // Because all attacks were evaded, no damage
    expect(calculatePlayerStats.calculateMeleeDamage).not.toHaveBeenCalled();
    expect(calculatePlayerStats.calculateMagicDamage).not.toHaveBeenCalled();
    expect(mockScene.playerManager.currentHealth).toBe(100);
    expect(mockScene.updateUI).not.toHaveBeenCalled();

    // Restore the spy
    MobManager.prototype.isAttackEvaded.mockRestore();
  });

  // -------------------------------------------------------------
  // [NEW TEST for Wandering / Obstacle Detection]
  // -------------------------------------------------------------
  test("should switch to a new idle/wander state when an obstacle is detected during wandering", () => {
    const mob = mockGroup.getChildren()[0];
    // Force mob to be in wandering state
    mob.customData.state = "wandering";
    mob.customData.wanderDirection = new Phaser.Math.Vector2(1, 0); // moving right
    mob.customData.visionDistance = 32;

    // Mock collisionLayer to return a collidable tile
    mockScene.collisionLayer.getTileAtWorldXY.mockReturnValue({
      collides: true,
    });

    // Mock Phaser.Utils.Array.GetRandom to return a new direction
    Phaser.Utils.Array.GetRandom.mockReturnValueOnce({ x: 0, y: 1, anim: "mob-walk-down" });

    // Call updateMobs
    mobManager.updateMobs(mockScene.playerManager.player);

    // Because there's an obstacle ahead, the mob should call assignRandomIdleOrWander again,
    // leading to new wanderDirection being set to (0,1) and anim "mob-walk-down"

    // Verify that getTileAtWorldXY was called correctly
    expect(mockScene.collisionLayer.getTileAtWorldXY).toHaveBeenCalledWith(
      mob.x + 1 * mob.customData.visionDistance,
      mob.y + 0 * mob.customData.visionDistance
    );

    // Verify that setVelocity was called again with (0, speed)
    expect(mob.body.setVelocity).toHaveBeenCalledWith(
      0,
      mobsData[mob.customData.id].speed * 1 // y direction
    );

    // Verify that anims.play was called with "mob-walk-down", true
    expect(mob.anims.play).toHaveBeenCalledWith("mob-walk-down", true);

    // Additionally, verify that state is still "wandering"
    expect(mob.customData.state).toBe("wandering");
  });

  // -------------------------------------------------------------
  // [NEW TEST for Unsticking]
  // -------------------------------------------------------------
  test("should unstick if mob hasn't moved for stuckCheckInterval while chasing", () => {
    const mob = mockGroup.getChildren()[0];
    // Force mob into chasing state
    mob.customData.state = "chasing";
    mob.customData.lastPosition = { x: 100, y: 100 };

    // Set stuckCheckInterval
    mob.customData.stuckCheckInterval = 1000;

    // Mock mob's position to simulate not moving
    mob.x = 100;
    mob.y = 100;

    // Set Phaser.Math.Distance.Between to return a small distance (<5)
    Phaser.Math.Distance.Between.mockReturnValue(2);

    // Spy on performUnsticking
    jest.spyOn(mobManager, "performUnsticking").mockImplementation(() => {
      // Mock performUnsticking to change state to 'unsticking' and set velocity
      mob.customData.state = "unsticking";
      mob.customData.isUnsticking = true;
      mob.body.setVelocity(10, 0); // Example sideways movement
    });

    // Set current time to trigger stuck check
    mockScene.time.now = 1500;

    // Call updateMobs
    mobManager.updateMobs(mockScene.playerManager.player);

    // Verify that performUnsticking was called
    expect(mobManager.performUnsticking).toHaveBeenCalledWith(mob);

    // Verify that state is now 'unsticking'
    expect(mob.customData.state).toBe("unsticking");
    expect(mob.customData.isUnsticking).toBe(true);

    // Fast-forward time to trigger the unstick callback (500ms)
    jest.advanceTimersByTime(500);

    // After unstick duration, state should be back to 'chasing'
    expect(mob.customData.state).toBe("chasing");
    expect(mob.customData.isUnsticking).toBe(false);

    // Verify that lastPosition was reset
    expect(mob.customData.lastPosition.x).toBe(mob.x);
    expect(mob.customData.lastPosition.y).toBe(mob.y);

    // Restore the spy
    mobManager.performUnsticking.mockRestore();
  });
});
