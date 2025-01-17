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
              velocity: { x: 0, y: 0 },
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
          W: 'W',
          S: 'S',
          A: 'A',
          D: 'D',
          ONE: 'ONE',
          TWO: 'TWO',
          THREE: 'THREE',
          FOUR: 'FOUR',
          FIVE: 'FIVE',
          SIX: 'SIX',
          SEVEN: 'SEVEN',
          EIGHT: 'EIGHT',
          NINE: 'NINE',
          TAB: 'TAB',
          B: 'B',
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
    // Add other Phaser global mocks as needed
  };
  
  // 2. Mock calculatePlayerStats helper function
  jest.mock("../helpers/calculatePlayerStats.js", () => ({
    calculatePlayerStats: jest.fn(),
    calculateMagicDamage: jest.fn(),
    calculateMeleeDamage: jest.fn(),
  }));
  
  import PlayerManager from "../managers/PlayerManager.js";
  import { calculatePlayerStats } from "../helpers/calculatePlayerStats.js";
  
  describe("PlayerManager", () => {
    let mockScene;
    let playerManager;
    let mockPlayerSprite;
    let tilemap;
  
    beforeEach(() => {
      jest.clearAllMocks();
  
      // 1. Mock scene with physics and updateUI
      mockScene = {
        physics: {
          add: {
            sprite: jest.fn(),
            collider: jest.fn(),
          },
        },
        collisionLayer: {}, // Mock collision layer
        updateUI: jest.fn(),
      };
  
      // 2. Mock tilemap object with findObject method
      tilemap = {
        findObject: jest.fn().mockReturnValue({ x: 100, y: 150 }),
      };
  
      // 3. Mock player sprite
      mockPlayerSprite = new Phaser.Physics.Arcade.Sprite(
        mockScene,
        100,
        150,
        "characters"
      );
  
      // 4. Mock physics.add.sprite to return the mocked player sprite
      mockScene.physics.add.sprite.mockReturnValue(mockPlayerSprite);
  
      // 5. Initialize PlayerManager with the mocked scene
      playerManager = new PlayerManager(mockScene);
  
      // 6. Assign the mocked player sprite to playerManager.player
      playerManager.player = mockPlayerSprite;
    });
  
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
  
    test("should update player stats correctly when currentHealth and currentMana are zero", () => {
      // Initialize player stats
      playerManager.currentHealth = 0;
      playerManager.currentMana = 0;
  
      // Mock calculatePlayerStats to return specific stats
      calculatePlayerStats.mockReturnValue({
        health: 200,
        mana: 150,
        magicAttack: 25,
        meleeAttack: 20,
        magicDefense: 15,
        meleeDefense: 12,
        magicEvasion: 7,
        meleeEvasion: 5,
        speed: 130,
      });
  
      playerManager.updatePlayerStats();
  
      // Verify that calculatePlayerStats was called
      expect(calculatePlayerStats).toHaveBeenCalled();
  
      // Verify that maxHealth and maxMana were set
      expect(playerManager.maxHealth).toBe(200);
      expect(playerManager.maxMana).toBe(150);
  
      // Verify that currentHealth and currentMana were initialized to max
      expect(playerManager.currentHealth).toBe(200);
      expect(playerManager.currentMana).toBe(150);
  
      // Verify that playerSpeed was clamped correctly
      expect(global.Phaser.Math.Clamp).toHaveBeenCalledWith(130, 50, 200);
      expect(playerManager.playerSpeed).toBe(130);
    });
  
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
  
      // Verify that currentHealth and currentMana were clamped to max if needed
      expect(playerManager.currentHealth).toBe(100); // 100 < 150
      expect(playerManager.currentMana).toBe(80); // 80 < 120
  
      // Verify that playerSpeed was clamped correctly
      expect(global.Phaser.Math.Clamp).toHaveBeenCalledWith(110, 50, 200);
      expect(playerManager.playerSpeed).toBe(110);
    });
  
    test("getPlayerStats should return correct stats", () => {
      // Mock calculatePlayerStats to return specific stats
      calculatePlayerStats.mockReturnValue({
        magicAttack: 22,
        meleeAttack: 18,
        magicDefense: 11,
        meleeDefense: 9,
        magicEvasion: 5,
        meleeEvasion: 3,
      });
  
      // Initialize player stats
      playerManager.currentHealth = 120;
      playerManager.maxHealth = 150;
      playerManager.currentMana = 90;
      playerManager.maxMana = 120;
      playerManager.playerSpeed = 115;
  
      const stats = playerManager.getPlayerStats();
  
      // Verify that calculatePlayerStats was called six times (once for each stat)
      expect(calculatePlayerStats).toHaveBeenCalledTimes(6);
  
      // Verify returned stats
      expect(stats).toEqual({
        currentMana: 90,
        maxMana: 120,
        currentHealth: 120,
        maxHealth: 150,
        magicAttack: 22,
        meleeAttack: 18,
        magicDefense: 11,
        meleeDefense: 9,
        magicEvasion: 5,
        meleeEvasion: 3,
        speed: 115,
      });
    });
  
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
    });
  
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
    });
  
    test("should equip an item and update stats correctly", () => {
      // Initialize player stats
      playerManager.currentHealth = 100;
      playerManager.currentMana = 50;
      playerManager.maxHealth = 150;
      playerManager.maxMana = 120;
      playerManager.playerSpeed = 100;
  
      // Mock calculatePlayerStats to return updated stats after equipping
      calculatePlayerStats.mockReturnValue({
        health: 180,
        mana: 150,
        magicAttack: 30,
        meleeAttack: 25,
        magicDefense: 15,
        meleeDefense: 12,
        magicEvasion: 7,
        meleeEvasion: 5,
        speed: 140,
      });
  
      // Mock scene.playerEquippedItems
      mockScene.playerEquippedItems = {};
  
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
  
      // Verify that updateUI was called
      expect(mockScene.updateUI).toHaveBeenCalled();
  
      // Verify console logs
      expect(console.log).toHaveBeenCalledWith("Equipped Excalibur to weapon");
      expect(console.log).toHaveBeenCalledWith(
        `Player Speed Updated: ${playerManager.playerSpeed}`
      );
  
      // Restore spies
      spyUpdatePlayerStats.mockRestore();
      console.log.mockRestore();
    });
  
    test("should regenerate player stats correctly", () => {
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
      expect(playerManager.currentMana).toBe(80 + 10); // Expected: 90
      expect(playerManager.currentHealth).toBe(90 + 5); // Expected: 95
  
      // Ensure that values do not exceed max
      playerManager.currentHealth = 148;
      playerManager.currentMana = 115;
      playerManager.regenerateStats(regenerationData);
      expect(playerManager.currentHealth).toBe(150); // Clamped to maxHealth
      expect(playerManager.currentMana).toBe(120); // Clamped to maxMana
  
      // Verify that updateUI was called
      expect(mockScene.updateUI).toHaveBeenCalledTimes(2); // Called twice
  
      // Verify console logs for regeneration
      expect(consoleSpy).toHaveBeenCalledWith(`Regenerated +10 mana, +5 HP`);
      expect(consoleSpy).toHaveBeenCalledWith(`Regenerated +5 mana, +2 HP`);
  
      // Restore console.log
      consoleSpy.mockRestore();
    });
  });
  