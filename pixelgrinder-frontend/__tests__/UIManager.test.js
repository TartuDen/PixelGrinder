// __tests__/UIManager.test.js
import UIManager from "../managers/UIManager.js";

describe("UIManager", () => {
  let uiManager;
  let mockScene;

  beforeEach(() => {
    jest.useFakeTimers(); // Enable fake timers before any DOM or instantiation

    // Set up DOM elements required by UIManager
    document.body.innerHTML = `
      <div id="player-name"></div>
      <div id="health-fill"></div>
      <div id="mana-fill"></div>
      <div id="player-level"></div>
      <div id="player-xp"></div>
      <span id="health-text"></span>
      <span id="mana-text"></span>
      <div id="stats-menu" style="display: none">
        <div id="stats-content"></div>
        <button id="close-stats"></button>
      </div>
      <div id="casting-bar">
        <div class="casting-slot" data-skill-id="1">
          <img src="" alt="Skill 1 Icon" />
          <div class="mana-cost">5</div>
          <div class="cooldown-overlay" style="display: none">
            <span class="cooldown-timer"></span>
          </div>
        </div>
      </div>
    `;

    // Mock the Phaser Scene and its methods
    mockScene = {
      useSkill: jest.fn(),
      time: {
        addEvent: jest.fn(({ delay, callback, loop, callbackScope }) => {
          if (loop) {
            const intervalId = setInterval(() => {
              callback.call(callbackScope);
            }, delay);
            return {
              stop: () => clearInterval(intervalId),
              remove: () => clearInterval(intervalId),
            };
          } else {
            const timeoutId = setTimeout(() => {
              callback.call(callbackScope);
            }, delay);
            return {
              stop: () => clearTimeout(timeoutId),
              remove: () => clearTimeout(timeoutId),
            };
          }
        }),
        removeEvent: jest.fn((event) => {
          event.remove();
        }),
      },
      // Add other mocked methods or properties if needed
    };

    uiManager = new UIManager(mockScene);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Reset timers after each test
  });

  test("updates UI correctly", () => {
    const playerStats = {
      name: "Omigod",
      currentHealth: 80,
      maxHealth: 100,
      currentMana: 120,
      maxMana: 150,
      level: 2,
      xp: 50,
    };

    uiManager.updateUI(playerStats);

    expect(document.getElementById("player-name").textContent).toBe("Omigod");
    expect(document.getElementById("health-fill").style.width).toBe("80%");
    expect(document.getElementById("mana-fill").style.width).toBe("80%");
    expect(document.getElementById("player-level").textContent).toBe("Level: 2");
    expect(document.getElementById("player-xp").textContent).toBe("XP: 50");
    expect(document.getElementById("health-text").textContent).toBe("HP: 80/100 (80.0%)");
    expect(document.getElementById("mana-text").textContent).toBe("Mana: 120/150 (80.0%)");
  });

  test("handles skill cooldown correctly", () => {
    const skillId = 1;
    const cooldownTime = 5.0; // in seconds

    const castingSlot = document.querySelector(`.casting-slot[data-skill-id="${skillId}"]`);
    const cooldownOverlay = castingSlot.querySelector(".cooldown-overlay");
    const cooldownTimer = castingSlot.querySelector(".cooldown-timer");

    expect(cooldownOverlay.style.display).toBe("none");

    // Start the cooldown
    uiManager.updateSkillCooldown(skillId, cooldownTime);

    // Initially, cooldown-overlay should be "flex" and timer should display "5.0"
    expect(cooldownOverlay.style.display).toBe("flex");
    expect(cooldownTimer.textContent).toBe("5.0");

    // Check that addEvent was called with correct parameters
    expect(mockScene.time.addEvent).toHaveBeenCalledWith({
      delay: 100, // 0.1 seconds
      callback: expect.any(Function),
      loop: true,
      callbackScope: uiManager,
    });

    // Simulate the passage of time by advancing timers
    // For a 5-second cooldown with 0.1-second intervals
    // Total number of calls: 50
    jest.advanceTimersByTime(5000); // Advance time by 5 seconds

    // Now, cooldown-overlay should be "none" and timer should be empty
    expect(cooldownOverlay.style.display).toBe("none");
    expect(castingSlot.querySelector(".cooldown-timer").textContent).toBe("");
  });

  // Add more tests as needed
});
