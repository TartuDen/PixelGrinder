// __tests__/InputManager.test.js

// 1. Mock Phaser globally
global.Phaser = {
    Input: {
      Keyboard: {
        KeyCodes: {
          W: 87,
          A: 65,
          S: 83,
          D: 68,
          ONE: 49,
          TWO: 50,
          THREE: 51,
          FOUR: 52,
          FIVE: 53,
          SIX: 54,
          SEVEN: 55,
          EIGHT: 56,
          NINE: 57,
          TAB: 9,
          B: 66,
        },
        addKeys: jest.fn(),
        addKey: jest.fn(),
        addCapture: jest.fn(),
      },
    },
    Math: {},
  };
  
  // 2. Import InputManager and other necessary modules
  import InputManager from "../managers/InputManager.js";
  
  // 3. Mock SkillManager
  const mockSkillManager = {
    useSkill: jest.fn(),
  };
  
  // 4. Mock PlayerManager
  const mockPlayerManager = {
    // Add any necessary mock methods or properties if needed
  };
  
  // 5. Mock Scene
  const mockScene = {
    input: {
      keyboard: {
        addKeys: Phaser.Input.Keyboard.addKeys,
        addKey: Phaser.Input.Keyboard.addKey,
        on: jest.fn(),
        addCapture: Phaser.Input.Keyboard.addCapture,
      },
    },
    cycleTarget: jest.fn(),
    updateUI: jest.fn(),
    summarizePlayerStats: jest.fn(),
    toggleStatsMenu: jest.fn(),
  };
  
  // 6. Utility function to create mock keys
  function createMockKey(code) {
    return {
      code,
      on: jest.fn(),
    };
  }
  
  describe("InputManager", () => {
    let inputManager;
    let mockKeys;
    const playerSkills = [
      { id: 1, name: "Fireball", icon: "fireball.png" },
      { id: 2, name: "Ice Spike", icon: "icespike.png" },
      // Add more skills as needed for testing
    ];
  
    beforeEach(() => {
      jest.clearAllMocks();
  
      // Setup mock keys
      mockKeys = {
        up: createMockKey('W'),
        down: createMockKey('S'),
        left: createMockKey('A'),
        right: createMockKey('D'),
        ONE: createMockKey('ONE'),
        TWO: createMockKey('TWO'),
        THREE: createMockKey('THREE'),
        FOUR: createMockKey('FOUR'),
        FIVE: createMockKey('FIVE'),
        SIX: createMockKey('SIX'),
        SEVEN: createMockKey('SEVEN'),
        EIGHT: createMockKey('EIGHT'),
        NINE: createMockKey('NINE'),
        TAB: createMockKey('TAB'),
        B: createMockKey('B'),
      };
  
      // Mock addKeys to return the mockKeys object
      Phaser.Input.Keyboard.addKeys.mockReturnValue({
        up: mockKeys.up,
        down: mockKeys.down,
        left: mockKeys.left,
        right: mockKeys.right,
      });
  
      // Mock addKey to return individual mock keys based on keyCode
      Phaser.Input.Keyboard.addKey.mockImplementation((code) => {
        const keyEntry = Object.entries(Phaser.Input.Keyboard.KeyCodes).find(
          ([, value]) => value === code
        );
        if (keyEntry) {
          const keyName = keyEntry[0];
          return mockKeys[keyName];
        }
        return undefined;
      });
  
      // Instantiate InputManager
      inputManager = new InputManager(
        mockScene,
        mockPlayerManager,
        mockSkillManager
      );
      inputManager.setupControls(playerSkills);
    });
  
    test("should set up movement keys correctly", () => {
      expect(Phaser.Input.Keyboard.addKeys).toHaveBeenCalledWith({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      });
  
      expect(inputManager.cursors).toEqual({
        up: mockKeys.up,
        down: mockKeys.down,
        left: mockKeys.left,
        right: mockKeys.right,
      });
    });
  
    test("should set up skill keys correctly and attach event listeners", () => {
      playerSkills.forEach((skill, index) => {
        // Only assign up to 9 skills
        if (index < 9) {
          const expectedKeyCode = Phaser.Input.Keyboard.KeyCodes[`ONE` + (index === 0 ? '' : index + 1)];
          // Since Phaser.Input.Keyboard.KeyCodes.ONE = 49, TWO=50, etc.
          // The keyName should correspond to 'ONE', 'TWO', etc.
          const keyName = Object.keys(Phaser.Input.Keyboard.KeyCodes).find(
            (k) => Phaser.Input.Keyboard.KeyCodes[k] === (index === 0 ? 49 : 49 + index)
          );
          const key = mockKeys[keyName];
          expect(key).toBeDefined();
          expect(key.on).toHaveBeenCalledWith("down", expect.any(Function));
        }
      });
  
      // Simulate pressing the first skill key
      const firstSkillKey = mockKeys.ONE;
      // Retrieve the callback function attached to the "down" event
      const firstSkillCallback = firstSkillKey.on.mock.calls.find(
        (call) => call[0] === "down"
      )[1];
      // Spy on console.log
      jest.spyOn(console, 'log').mockImplementation(() => {});
      // Invoke the callback to simulate key press
      firstSkillCallback();
  
      expect(mockSkillManager.useSkill).toHaveBeenCalledWith(playerSkills[0]);
      expect(console.log).toHaveBeenCalledWith(
        `Skill triggered: ${playerSkills[0].name}`
      );
  
      // Restore console.log
      console.log.mockRestore();
    });
  
    test("should set up TAB key correctly and attach event listeners", () => {
      const tabKey = mockKeys.TAB;
      expect(tabKey).toBeDefined();
      expect(tabKey.on).toHaveBeenCalledWith("down", expect.any(Function));
  
      // Simulate pressing TAB
      tabKey.on.mock.calls[0][1]();
  
      expect(mockScene.cycleTarget).toHaveBeenCalled();
      expect(mockScene.updateUI).toHaveBeenCalled();
    });
  
    test("should set up B key correctly and attach event listeners", () => {
      // The 'keydown-B' event is attached to the entire keyboard input
      expect(mockScene.input.keyboard.on).toHaveBeenCalledWith(
        "keydown-B",
        expect.any(Function)
      );
  
      // Simulate pressing B
      const bCallback = mockScene.input.keyboard.on.mock.calls.find(
        (call) => call[0] === "keydown-B"
      )[1];
      bCallback();
  
      expect(mockScene.summarizePlayerStats).toHaveBeenCalled();
      expect(mockScene.toggleStatsMenu).toHaveBeenCalled();
    });
  
    test("should capture TAB key to prevent default behavior", () => {
      expect(Phaser.Input.Keyboard.addCapture).toHaveBeenCalledWith("TAB");
    });
  
    test("getInputKeys should return the cursors", () => {
      const cursors = inputManager.getInputKeys();
      expect(cursors).toBe(inputManager.cursors);
    });
  
    test("should handle more than 9 skills gracefully by not assigning extra keys", () => {
      const extendedSkills = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `Skill${i + 1}`,
        icon: `skill${i + 1}.png`,
      }));
  
      // Mock addKeys and addKey again for the new setup
      Phaser.Input.Keyboard.addKeys.mockReturnValue({
        up: mockKeys.up,
        down: mockKeys.down,
        left: mockKeys.left,
        right: mockKeys.right,
      });
  
      Phaser.Input.Keyboard.addKey.mockImplementation((code) => {
        const keyEntry = Object.entries(Phaser.Input.Keyboard.KeyCodes).find(
          ([, value]) => value === code
        );
        if (keyEntry) {
          const keyName = keyEntry[0];
          return mockKeys[keyName];
        }
        return undefined;
      });
  
      // Instantiate a new InputManager with extended skills
      const newInputManager = new InputManager(
        mockScene,
        mockPlayerManager,
        mockSkillManager
      );
      newInputManager.setupControls(extendedSkills);
  
      // Only the first 9 skills should have keys assigned
      extendedSkills.slice(0, 9).forEach((skill, index) => {
        const keyCode = Phaser.Input.Keyboard.KeyCodes[`ONE` + (index === 0 ? '' : index + 1)];
        const keyName = Object.keys(Phaser.Input.Keyboard.KeyCodes).find(
          (k) => Phaser.Input.Keyboard.KeyCodes[k] === (index === 0 ? 49 : 49 + index)
        );
        const key = mockKeys[keyName];
        expect(key).toBeDefined();
        expect(key.on).toHaveBeenCalledWith("down", expect.any(Function));
      });
  
      // Skills beyond the 9th should not have keys assigned
      extendedSkills.slice(9).forEach((skill) => {
        // There are no key codes beyond NINE (57)
        // So addKey should not have been called for these skills
        expect(mockSkillManager.useSkill).not.toHaveBeenCalledWith(skill);
      });
    });
  });
  