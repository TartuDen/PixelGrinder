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
} from "../data/MOCKdata.js";

// 2. Mock Phaser globally
global.Phaser = {
  Math: {
    Distance: {
      Between: jest.fn(),
    },
    FloatBetween: jest.fn(),
    Between: jest.fn().mockReturnValue(0), // Always return 0 for predictable direction
    Vector2: class {
      // Properly mock Vector2 as a class
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }

      normalize() {
        // Mock normalize, assuming it mutates the vector
        const length = Math.sqrt(this.x * this.x + this.y * this.y);
        if (length === 0) return this;
        this.x /= length;
        this.y /= length;
        return this;
      }

      // Add more methods if needed
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
      state: "idle", // 'idle', 'chasing', 'attacking'
      lastAttackTime: 0,
      hpText: null,
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
      // Optionally, include 'level' here to directly provide it
      // level: 1,
    })),
    currentHealth: 100,
    gainExperience: jest.fn(), // <-- Added mock for gainExperience
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
  mobs: null, // Will be set in MobManager
  targetedMob: null,
  updateUI: jest.fn(), // Mock updateUI directly
  handlePlayerDeath: jest.fn(), // Mock handlePlayerDeath if called
  playerProfile: { level: 1 }, // <-- **Added** playerProfile with 'level'
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

  // Set 'slime' as 'enemy' to align with test expectations
  mobsData["slime"].mobType = "enemy";

  // Create mock mobs as "slime" (enemy)
  const mob1 = createMockMob("slime");
  mob1.customData.spawnX = 200;
  mob1.customData.spawnY = 300;

  const mob2 = createMockMob("slime");
  mob2.customData.spawnX = 400;
  mob2.customData.spawnY = 500;

  // Create an array to hold mock mobs
  mockMobs = [mob1, mob2];

  // Mock group.create to return mobs from mockMobs array
  mockGroup = {
    create: jest.fn((x, y, key) => {
      const mob = mockMobs.shift();
      mob.customData.spawnX = x;
      mob.customData.spawnY = y;
      return mob;
    }),
    getChildren: jest.fn(() => [
      mockGroup.create.mock.results[0]?.value,
      mockGroup.create.mock.results[1]?.value,
    ]),
  };

  // Mock physics.add.group to return the mockGroup
  mockScene.physics.add.group.mockReturnValue(mockGroup);

  // Mock add.text to return mockText with setOrigin
  mockScene.add.text.mockReturnValue(mockText);

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

  // Assign the mocked tilemap to the scene if necessary
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

      // mob.anims.play should have been called for idle movement
      expect(mob.anims.play).toHaveBeenCalledWith("mob-walk-down");

      // assignRandomIdleMovement should have been called via changeDirection
      // Since Phaser.Math.Between returns 0, direction should be "Right"
      expect(mob.body.setVelocity).toHaveBeenCalledWith(
        mobsData[mob.customData.id].speed,
        0
      );
      expect(mob.anims.play).toHaveBeenCalledWith("mob-walk-right", true);
    });
  });

  test("should handle mob state transitions based on player distance", () => {
    const player = mockScene.playerManager.player;

    // Force the distance to always be 100, well within slime's mobAgroRange of 300
    Phaser.Math.Distance.Between.mockReturnValue(100);

    // Simulate update call
    mobManager.updateMobs(player);

    // Each mob should transition from "idle" to "chasing"
    mockGroup.getChildren().forEach((mob) => {
      expect(mob.customData.state).toBe("chasing");
      expect(mob.body.setVelocity).toHaveBeenCalled();
      // We also expect the mob to be animating
      expect(mob.anims.play).toHaveBeenCalled();
      expect(mob.log).not.toBeDefined(); // Ensure log isn't interfering
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

    // Each mob does 5 damage
    // Starting health is 100 -> after two mobs attack, health = 90
    expect(mockScene.playerManager.currentHealth).toBe(90);

    // UI should have been updated
    expect(mockScene.updateUI).toHaveBeenCalled();
  });

  test("should handle mob death and respawn", () => {
    // Grab first mob and kill it
    const mob = mockGroup.getChildren()[0];
    mob.customData.hp = 0;

    // Define expReward for 'slime'
    mobsData["slime"].expReward = 10; // Ensure expReward is set

    // Call handleMobDeath
    mobManager.handleMobDeath(mob);

    // The code that sets mob inactive/invisible is inside a 1000ms delayedCall
    // so we need to fast-forward time to trigger that callback
    jest.advanceTimersByTime(1000);

    // Verify that gainExperience was called with expReward
    expect(mockScene.playerManager.gainExperience).toHaveBeenCalledWith(10);

    expect(mob.setActive).toHaveBeenCalledWith(false);
    expect(mob.setVisible).toHaveBeenCalledWith(false);
    expect(mob.body.setEnable).toHaveBeenCalledWith(false);
    expect(mob.customData.hpText.setVisible).toHaveBeenCalledWith(false);

    // Then respawn is triggered 5000ms later in mobManager.handleMobDeath
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

    // **Use jest.spyOn to mock isAttackEvaded on the prototype to always return true**
    jest.spyOn(MobManager.prototype, "isAttackEvaded").mockReturnValue(true);

    // Call update
    mobManager.updateMobs(player);

    // Each mob tries to attack once, so isAttackEvaded should be called for each
    expect(mobManager.isAttackEvaded).toHaveBeenCalledTimes(2);
    // Slime uses meleeAttack, so we check player's meleeEvasion=10
    expect(mobManager.isAttackEvaded).toHaveBeenCalledWith(10);
    expect(mobManager.isAttackEvaded).toHaveBeenCalledWith(10);

    // **Ensure that calculateMeleeDamage was NOT called**
    expect(calculatePlayerStats.calculateMeleeDamage).not.toHaveBeenCalled();

    // Because all attacks were evaded, no damage
    expect(mockScene.playerManager.currentHealth).toBe(100);
    expect(mockScene.updateUI).not.toHaveBeenCalled();

    // Restore the spy
    MobManager.prototype.isAttackEvaded.mockRestore();
  });
});
