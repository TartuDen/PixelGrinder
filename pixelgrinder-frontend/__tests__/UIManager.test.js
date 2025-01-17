// __tests__/UIManager.test.js

/**
 * @jest-environment jsdom
 */

// 1. Import necessary modules
import UIManager from "../managers/UIManager.js";

// 2. Mock Phaser globally
global.Phaser = {
  Scene: class {
    constructor() {
      this.useSkill = jest.fn();
      this.time = {
        addEvent: jest.fn(),
        removeEvent: jest.fn(),
      };
    }
  },
  Physics: {
    Arcade: {
      Sprite: class {
        constructor(scene, x, y, texture) {
          this.scene = scene;
          this.x = x;
          this.y = y;
          this.texture = texture;
          // Additional properties if needed
        }
      },
      Group: class {},
      Collider: jest.fn(),
    },
  },
  Math: {
    Clamp: jest.fn((value, min, max) => Math.min(Math.max(value, min), max)),
  },
  Input: {
    Keyboard: {
      KeyCodes: {
        // Define any key codes if necessary
      },
      addKey: jest.fn(),
      addKeys: jest.fn(),
      addCapture: jest.fn(),
    },
  },
  Time: {
    addEvent: jest.fn(),
    removeEvent: jest.fn(),
  },
  Tweens: {
    add: jest.fn(),
  },
};

// 3. Begin test suite
describe("UIManager", () => {
  let mockScene;
  let uiManager;

  // 4. Setup DOM elements before each test
  beforeEach(() => {
    // Clear the document body
    document.body.innerHTML = "";

    // Create necessary DOM elements
    document.body.innerHTML = `
      <div id="player-name"></div>
      <div id="health-fill"></div>
      <div id="mana-fill"></div>
      <div id="player-level"></div>
      <div id="player-xp"></div>
      <div id="health-text"></div>
      <div id="mana-text"></div>
      <div id="stats-menu" style="display: none;">
        <div id="stats-content"></div>
        <button id="close-stats">Close</button>
      </div>
      <div id="casting-bar"></div>
    `;

    // Mock casting-progress-container does not exist initially
    // UIManager should create it if not present

    // Initialize mockScene
    mockScene = new Phaser.Scene();

    // Initialize UIManager
    uiManager = new UIManager(mockScene);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 5. Test Constructor
  test("constructor should assign existing DOM elements correctly", () => {
    expect(uiManager.uiName).toBe(document.getElementById("player-name"));
    expect(uiManager.uiHealthFill).toBe(document.getElementById("health-fill"));
    expect(uiManager.uiManaFill).toBe(document.getElementById("mana-fill"));
    expect(uiManager.uiLevel).toBe(document.getElementById("player-level"));
    expect(uiManager.uiXP).toBe(document.getElementById("player-xp"));
    expect(uiManager.healthText).toBe(document.getElementById("health-text"));
    expect(uiManager.manaText).toBe(document.getElementById("mana-text"));
    expect(uiManager.statsMenu).toBe(document.getElementById("stats-menu"));
    expect(uiManager.statsContent).toBe(document.getElementById("stats-content"));
    expect(uiManager.closeStatsButton).toBe(document.getElementById("close-stats"));
    expect(uiManager.castingBar).toBe(document.getElementById("casting-bar"));
  });

  test("constructor should create and append casting-progress-container if not present", () => {
    // Remove casting-progress-container if it exists
    const existingContainer = document.getElementById("casting-progress-container");
    if (existingContainer) {
      existingContainer.remove();
    }

    // Re-initialize UIManager to trigger constructor logic
    uiManager = new UIManager(mockScene);

    const castingProgressContainer = document.getElementById("casting-progress-container");
    expect(castingProgressContainer).not.toBeNull();
    expect(castingProgressContainer.id).toBe("casting-progress-container");

    const castingSkillName = document.getElementById("casting-skill-name");
    const castingProgressFill = document.getElementById("casting-progress-fill");

    expect(castingSkillName).not.toBeNull();
    expect(castingSkillName.id).toBe("casting-skill-name");
    expect(castingSkillName.textContent).toBe("");

    expect(castingProgressFill).not.toBeNull();
    expect(castingProgressFill.id).toBe("casting-progress-fill");
    expect(castingProgressFill.style.width).toBe("0%");

    expect(castingProgressContainer.style.display).toBe("block"); // As per showCastingProgress
  });

  // 6. Test init method
  test("init should attach event listener to closeStatsButton", () => {
    // Spy on hideStatsMenu and onCloseStatsCallback
    jest.spyOn(uiManager, "hideStatsMenu");
    const onCloseStatsCallback = jest.fn();

    uiManager.init(onCloseStatsCallback);

    // Simulate click on closeStatsButton
    const closeButton = document.getElementById("close-stats");
    closeButton.click();

    // Verify hideStatsMenu was called
    expect(uiManager.hideStatsMenu).toHaveBeenCalled();

    // Verify onCloseStatsCallback was called
    expect(onCloseStatsCallback).toHaveBeenCalled();
  });

  // 7. Test showCastingProgress
  test("showCastingProgress should display casting progress with correct skill name and reset width", () => {
    uiManager.showCastingProgress("Fireball", 3);

    const castingSkillName = document.getElementById("casting-skill-name");
    const castingProgressFill = document.getElementById("casting-progress-fill");
    const castingProgressContainer = document.getElementById("casting-progress-container");

    expect(castingSkillName.textContent).toBe("Casting: Fireball");
    expect(castingProgressFill.style.width).toBe("0%");
    expect(castingProgressContainer.style.display).toBe("block");
  });

  // 8. Test updateCastingProgress
  test("updateCastingProgress should update the width of the casting progress bar correctly", () => {
    uiManager.showCastingProgress("Fireball", 3);
    uiManager.updateCastingProgress(1.5, 3);

    const castingProgressFill = document.getElementById("casting-progress-fill");
    expect(castingProgressFill.style.width).toBe("50%");
  });

  // 9. Test hideCastingProgress
  test("hideCastingProgress should hide the casting progress bar and reset styles/text", () => {
    // First show the casting progress
    uiManager.showCastingProgress("Fireball", 3);

    // Now hide it
    uiManager.hideCastingProgress();

    const castingSkillName = document.getElementById("casting-skill-name");
    const castingProgressFill = document.getElementById("casting-progress-fill");
    const castingProgressContainer = document.getElementById("casting-progress-container");

    expect(castingSkillName.textContent).toBe("");
    expect(castingProgressFill.style.width).toBe("0%");
    expect(castingProgressContainer.style.display).toBe("none");
  });

  // 10. Test setupSkills
  test("setupSkills should create skill slots with correct icons, mana costs, and event listeners", () => {
    // Mock skills array
    const skills = [
      {
        id: 1,
        name: "Fireball",
        manaCost: 10,
        icon: "fireball.png",
      },
      {
        id: 2,
        name: "Ice Spike",
        manaCost: 8,
        icon: "icespike.png",
      },
    ];

    // Spy on scene.useSkill
    jest.spyOn(mockScene, "useSkill");

    uiManager.setupSkills(skills);

    const castingBar = document.getElementById("casting-bar");
    const skillSlots = castingBar.querySelectorAll(".casting-slot");
    expect(skillSlots.length).toBe(2);

    skillSlots.forEach((slot, index) => {
      const skill = skills[index];

      const img = slot.querySelector("img");
      expect(img).not.toBeNull();
      expect(img.src).toContain(skill.icon);
      expect(img.alt).toBe(skill.name);

      const manaCostDiv = slot.querySelector(".mana-cost");
      expect(manaCostDiv).not.toBeNull();
      expect(manaCostDiv.textContent).toBe(String(skill.manaCost));

      // Simulate click on the skill slot
      slot.click();

      // Verify that scene.useSkill was called with the correct skill
      expect(mockScene.useSkill).toHaveBeenCalledWith(skill);
    });
  });

  // 11. Test updateUI
  test("updateUI should correctly update health, mana, name, level, and XP UI elements", () => {
    const uiStats = {
      name: "Omigod",
      currentHealth: 80,
      maxHealth: 150,
      currentMana: 60,
      maxMana: 120,
      level: 5,
      xp: 2000,
    };

    uiManager.updateUI(uiStats);

    // Health
    const healthFill = document.getElementById("health-fill");
    const healthText = document.getElementById("health-text");
    expect(healthFill.style.width).toBe("53.33333333333333%"); // (80/150)*100
    expect(healthText.textContent).toBe("HP: 80/150 (53.3%)");

    // Mana
    const manaFill = document.getElementById("mana-fill");
    const manaText = document.getElementById("mana-text");
    expect(manaFill.style.width).toBe("50%"); // (60/120)*100
    expect(manaText.textContent).toBe("Mana: 60/120 (50.0%)");

    // Name
    const nameElement = document.getElementById("player-name");
    expect(nameElement.textContent).toBe("Omigod");

    // Level
    const levelElement = document.getElementById("player-level");
    expect(levelElement.textContent).toBe("Level: 5");

    // XP
    const xpElement = document.getElementById("player-xp");
    expect(xpElement.textContent).toBe("XP: 2000");
  });

  // 12. Test updateSkillCooldown
  test("updateSkillCooldown should show cooldown overlay and start countdown when cooldownTime > 0", () => {
    // Mock addEvent for cooldown countdown
    const mockRemoveEvent = jest.fn();
    mockScene.time.addEvent.mockReturnValue({
      remove: mockRemoveEvent,
    });

    // Setup a skill slot
    const skill = {
      id: 1,
      name: "Fireball",
      manaCost: 10,
    };
    uiManager.setupSkills([skill]);

    // Start cooldown
    uiManager.updateSkillCooldown(skill.id, 5);

    const castingSlot = document.querySelector(`.casting-slot[data-skill-id="${skill.id}"]`);
    const cooldownOverlay = castingSlot.querySelector(".cooldown-overlay");
    const cooldownTimer = castingSlot.querySelector(".cooldown-timer");

    expect(cooldownOverlay.style.display).toBe("flex");
    expect(cooldownTimer.textContent).toBe("5.0");

    // Verify that startCooldownCountdown was called internally
    expect(mockScene.time.addEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        delay: 100,
        callback: expect.any(Function),
        callbackScope: uiManager,
        loop: true,
      })
    );

    // Simulate the callback being called twice
    const eventCallback = mockScene.time.addEvent.mock.calls[0][0].callback;
    eventCallback(); // elapsedTime = 4.9
    expect(cooldownTimer.textContent).toBe("4.9");

    eventCallback(); // elapsedTime = 4.8
    expect(cooldownTimer.textContent).toBe("4.8");
  });

  test("updateSkillCooldown should hide cooldown overlay when cooldownTime <= 0", () => {
    // Setup a skill slot
    const skill = {
      id: 1,
      name: "Fireball",
      manaCost: 10,
    };
    uiManager.setupSkills([skill]);

    // Start cooldown with time <= 0
    uiManager.updateSkillCooldown(skill.id, 0);

    const castingSlot = document.querySelector(`.casting-slot[data-skill-id="${skill.id}"]`);
    const cooldownOverlay = castingSlot.querySelector(".cooldown-overlay");
    const cooldownTimer = castingSlot.querySelector(".cooldown-timer");

    expect(cooldownOverlay.style.display).toBe("none");
    expect(cooldownTimer.textContent).toBe("");
  });

  // 13. Test startCooldownCountdown
  test("startCooldownCountdown should update cooldown timer and hide overlay when cooldown completes", () => {
    // Mock addEvent for cooldown countdown
    let cooldownCallback;
    mockScene.time.addEvent.mockImplementation((config) => {
      cooldownCallback = config.callback;
      return {
        remove: jest.fn(),
      };
    });

    // Setup a skill slot
    const skill = {
      id: 1,
      name: "Fireball",
      manaCost: 10,
    };
    uiManager.setupSkills([skill]);

    // Start cooldown
    uiManager.updateSkillCooldown(skill.id, 0.2); // 0.2 seconds

    const castingSlot = document.querySelector(`.casting-slot[data-skill-id="${skill.id}"]`);
    const cooldownOverlay = castingSlot.querySelector(".cooldown-overlay");
    const cooldownTimer = castingSlot.querySelector(".cooldown-timer");

    expect(cooldownOverlay.style.display).toBe("flex");
    expect(cooldownTimer.textContent).toBe("0.2");

    // Simulate the callback being called multiple times
    cooldownCallback(); // remainingTime = 0.1
    expect(cooldownTimer.textContent).toBe("0.1");
    expect(cooldownOverlay.style.display).toBe("flex");

    cooldownCallback(); // remainingTime = 0.0
    expect(cooldownTimer.textContent).toBe("0.0");
    expect(cooldownOverlay.style.display).toBe("none");
  });

  // 14. Test showStatsMenu and hideStatsMenu
  test("showStatsMenu should display the stats menu with provided HTML content", () => {
    const htmlContent = "<p>Player Stats</p>";
    uiManager.showStatsMenu(htmlContent);

    const statsMenu = document.getElementById("stats-menu");
    const statsContent = document.getElementById("stats-content");

    expect(statsContent.innerHTML).toBe(htmlContent);
    expect(statsMenu.style.display).toBe("block");
  });

  test("hideStatsMenu should hide the stats menu", () => {
    // First show the stats menu
    uiManager.showStatsMenu("<p>Player Stats</p>");

    // Now hide it
    uiManager.hideStatsMenu();

    const statsMenu = document.getElementById("stats-menu");
    expect(statsMenu.style.display).toBe("none");
  });
});
