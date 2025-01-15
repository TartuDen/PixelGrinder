// __tests__/MobManager.test.js

// 1. Mock Phaser globally before importing any modules that use Phaser
global.Phaser = {
  Math: {
    Distance: {
      Between: jest.fn(),
    },
    FloatBetween: jest.fn(),
    Between: jest.fn(), // Mock Between as a Jest mock function
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

// 2. Now import the modules that use Phaser
import MobManager from "../managers/MobManager.js";
import * as calculatePlayerStats from "../helpers/calculatePlayerStats.js";
import {
  mobsData,
  MOB_CHASE_SPEED_MULT,
  SKILL_RANGE_EXTENDER,
  TAB_TARGET_RANGE,
} from "../data/MOCKdata.js";

// 3. Mock Helper Functions
jest.spyOn(calculatePlayerStats, "calculateMeleeDamage").mockReturnValue(5);
jest.spyOn(calculatePlayerStats, "calculateMagicDamage").mockReturnValue(7);

// 4. Utility function to create mock mobs
function createMockMob(id = "goblin") {
  // Default to "goblin" which is an enemy
  return {
    active: true, // Ensure mobs are active by default
    setInteractive: jest.fn().mockReturnThis(),
    on: jest.fn(),
    setScale: jest.fn().mockReturnThis(),
    play: jest.fn(),
    setTint: jest.fn(),
    clearTint: jest.fn(),
    setActive: jest.fn(function (state) {
      // Update 'active' property when setActive is called
      this.active = state;
      return this;
    }),
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
    x: 0, // Initialize x position
    y: 0, // Initialize y position
  };
}

// 5. Define mock classes for Text to simulate Phaser's GameObjects
const mockText = {
  setPosition: jest.fn().mockReturnThis(),
  setText: jest.fn().mockReturnThis(),
  setVisible: jest.fn().mockReturnThis(),
  setOrigin: jest.fn().mockReturnThis(),
};

// 6. Mock the scene
const mockScene = {
  phaser: Phaser, // Ensure that Phaser is accessible via this.scene.phaser
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
    })),
    currentHealth: 100,
  },
  time: {
    addEvent: jest.fn((eventConfig) => {
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
  uiManager: {
    updateUI: jest.fn(),
  },
};

// 7. Initialize MobManager
let mobManager;
let mockGroup;
let mockMobs;

// 8. Before each test, set up the mocks
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();

  // Reset Phaser Math functions
  Phaser.Math.Distance.Between.mockReset();
  Phaser.Math.FloatBetween.mockReset();
  Phaser.Math.Between.mockReset();

  // Set Phaser.Math.Between to return 2 for 'mob-walk-down'
  Phaser.Math.Between.mockReturnValue(2);

  // Create mock enemy mobs
  const mob1 = createMockMob("goblin"); // Enemy
  mob1.customData.spawnX = 200;
  mob1.customData.spawnY = 300;
  mob1.x = 200; // Set x position
  mob1.y = 300; // Set y position

  const mob2 = createMockMob("goblin"); // Enemy
  mob2.customData.spawnX = 400;
  mob2.customData.spawnY = 500;
  mob2.x = 400; // Set x position
  mob2.y = 500; // Set y position

  // Create an array to hold mock mobs
  mockMobs = [mob1, mob2];

  // Mock group.create to return mobs from mockMobs array
  mockGroup = {
    create: jest.fn((x, y, key) => {
      const mob = mockMobs.shift();
      mob.customData.spawnX = x;
      mob.customData.spawnY = y;
      mob.x = x; // Update x position
      mob.y = y; // Update y position
      return mob;
    }),
    getChildren: jest.fn(() => [
      mockGroup.create.mock.results[0].value,
      mockGroup.create.mock.results[1].value,
    ]),
  };

  // Mock physics.add.group to return the mockGroup and set mockScene.mobs to mockGroup
  mockScene.physics.add.group.mockImplementation(() => {
    mockScene.mobs = mockGroup;
    return mockGroup;
  });

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

afterEach(() => {
  jest.clearAllTimers();
});

describe("MobManager", () => {
  test("should create mobs correctly", () => {
    // Verify that physics groups and colliders are set up
    expect(mockScene.physics.add.group).toHaveBeenCalledWith({
      collideWorldBounds: true,
    });
    expect(mockScene.physics.add.collider).toHaveBeenCalledTimes(3); // Colliders with player, collisionLayer, mobs

    // Verify that mobs are created based on spawn zones
    expect(mockGroup.create).toHaveBeenCalledTimes(2); // Two spawn zones

    // Verify that mob properties are set correctly
    mockGroup.getChildren().forEach((mob) => {
      // mob.customData.hpText should have been set
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

      // mob.anims.play should have been called
      expect(mob.anims.play).toHaveBeenCalledWith("mob-walk-down");
    });
  });

  test("should handle mob state transitions based on player distance", () => {
    const player = mockScene.playerManager.player;

    // Mock Distance.Between to simulate player within aggro range for both mobs
    Phaser.Math.Distance.Between.mockReturnValue(100); // Assuming aggro range > 100

    // Simulate update call
    mobManager.updateMobs(player);

    // Verify that Phaser.Math.Distance.Between was called correctly for each mob
    const children = mockGroup.getChildren();
    children.forEach((mob) => {
      expect(Phaser.Math.Distance.Between).toHaveBeenCalledWith(
        mob.x,
        mob.y,
        player.x,
        player.y
      );
    });

    // Expect each mob's state to change to 'chasing' and setVelocity to be called
    children.forEach((mob) => {
      expect(mob.customData.state).toBe("chasing");
      expect(mob.body.setVelocity).toHaveBeenCalled();
      expect(mob.anims.play).toHaveBeenCalledWith("mob-walk-down");
    });
  });

  test("should attack the player when within attack range and apply damage", () => {
    const player = mockScene.playerManager.player;

    // Mock Distance.Between to simulate player within attack range for both mobs
    Phaser.Math.Distance.Between.mockReturnValue(30); // Within attack range

    // Mock current time
    const mockCurrentTime = 1000;
    mockScene.time.now = mockCurrentTime;

    // Simulate attack cooldown has passed for both mobs
    mockGroup.getChildren().forEach((mob) => {
      mob.customData.lastAttackTime = mockCurrentTime - 5000; // Assuming attackCooldown < 5000
    });

    // Simulate update call
    mobManager.updateMobs(player);

    // Verify that Phaser.Math.Distance.Between was called correctly for each mob
    const children = mockGroup.getChildren();
    children.forEach((mob) => {
      expect(Phaser.Math.Distance.Between).toHaveBeenCalledWith(
        mob.x,
        mob.y,
        player.x,
        player.y
      );
    });

    // Expect calculateMeleeDamage to have been called for each mob
    expect(calculatePlayerStats.calculateMeleeDamage).toHaveBeenCalledTimes(2);

    // Expect player's health to be reduced accordingly
    // Initial health: 100
    // Each attack does 5 damage, total: 10
    expect(mockScene.playerManager.currentHealth).toBe(90);

    // Expect UI to be updated
    expect(mockScene.uiManager.updateUI).toHaveBeenCalled();

    // Verify that attack cooldown is updated
    children.forEach((mob) => {
      expect(mob.customData.lastAttackTime).toBe(mockCurrentTime);
    });
  });

  test("should handle mob death and respawn", () => {
    const player = mockScene.playerManager.player;

    // Select the first mob and set its HP to 0 to simulate death
    const mob = mockGroup.getChildren()[0];
    mob.customData.hp = 0;
    mob.customData.isDead = true;

    // Call handleMobDeath for the dead mob
    mobManager.handleMobDeath(mob);

    // Expect mob to be inactive and invisible
    expect(mob.setActive).toHaveBeenCalledWith(false);
    expect(mob.setVisible).toHaveBeenCalledWith(false);
    expect(mob.body.setEnable).toHaveBeenCalledWith(false);
    expect(mob.customData.hpText.setVisible).toHaveBeenCalledWith(false);

    // Expect delayed call for respawn
    expect(mockScene.time.addEvent).toHaveBeenCalledWith({
      delay: 5000,
      callback: expect.any(Function),
      loop: false,
    });

    // Simulate delayed call (respawn)
    const respawnCallback = mockScene.time.addEvent.mock.calls[0][0].callback;
    respawnCallback();

    // Expect respawnMob to have reset mob properties
    expect(mob.customData.hp).toBe(mobsData["goblin"].health); // Assuming mobsData.goblin.health = 40
    expect(mob.customData.isDead).toBe(false);
    expect(mob.x).toBe(mob.customData.spawnX);
    expect(mob.y).toBe(mob.customData.spawnY);
    expect(mob.setActive).toHaveBeenCalledWith(true);
    expect(mob.setVisible).toHaveBeenCalledWith(true);
    expect(mob.body.setEnable).toHaveBeenCalledWith(true);
    expect(mob.customData.hpText.setText).toHaveBeenCalledWith(
      `HP: ${mobsData["goblin"].health}`
    );
    expect(mob.customData.hpText.setPosition).toHaveBeenCalledWith(
      mob.customData.spawnX,
      mob.customData.spawnY - 20
    );
    expect(mob.customData.hpText.setVisible).toHaveBeenCalledWith(true);
    expect(mob.body.setVelocity).toHaveBeenCalledWith(0, 0);
    expect(mob.anims.play).toHaveBeenCalledWith("mob-walk-down");
  });

  test("should handle attack evasion correctly", () => {
    const player = mockScene.playerManager.player;

    // Mock Distance.Between to simulate player within attack range for both mobs
    Phaser.Math.Distance.Between.mockReturnValue(30); // Within attack range

    // Mock current time
    const mockCurrentTime = 2000;
    mockScene.time.now = mockCurrentTime;

    // Spy on isAttackEvaded and force it to return true (attack is evaded)
    jest.spyOn(mobManager, "isAttackEvaded").mockReturnValue(true);

    // Simulate update call
    mobManager.updateMobs(player);

    // Verify that Phaser.Math.Distance.Between was called correctly for each mob
    const children = mockGroup.getChildren();
    children.forEach((mob) => {
      expect(Phaser.Math.Distance.Between).toHaveBeenCalledWith(
        mob.x,
        mob.y,
        player.x,
        player.y
      );
    });

    // Expect isAttackEvaded to have been called for each mob
    expect(mobManager.isAttackEvaded).toHaveBeenCalledTimes(2);
    expect(mobManager.isAttackEvaded).toHaveBeenCalledWith(10); // meleeEvasion = 10
    expect(mobManager.isAttackEvaded).toHaveBeenCalledWith(10); // For both mobs

    // Expect no damage to be applied
    expect(mockScene.playerManager.currentHealth).toBe(100);
    expect(mockScene.uiManager.updateUI).not.toHaveBeenCalled();
  });
});
