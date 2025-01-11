// managers/UIManager.js

export default class UIManager {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene instance.
   */
  constructor(scene) {
    this.scene = scene; // Store the scene reference

    // Existing UI element references
    this.uiName = document.getElementById("player-name");
    this.uiHealthFill = document.getElementById("health-fill");
    this.uiManaFill = document.getElementById("mana-fill");
    this.uiLevel = document.getElementById("player-level");
    this.uiXP = document.getElementById("player-xp");

    this.healthText = document.getElementById("health-text");
    this.manaText = document.getElementById("mana-text");

    this.statsMenu = document.getElementById("stats-menu");
    this.statsContent = document.getElementById("stats-content");
    this.closeStatsButton = document.getElementById("close-stats");

    // Casting bar container
    this.castingBar = document.getElementById("casting-bar");
    console.log("castingBar:", this.castingBar);

    // Casting Progress Elements
    this.castingProgressContainer = document.getElementById(
      "casting-progress-container"
    );
    this.castingProgressFill = document.getElementById("casting-progress-fill");
    this.castingSkillName = document.getElementById("casting-skill-name");

    if (!document.getElementById("casting-progress-container")) {
      // Create container
      this.castingProgressContainer = document.createElement("div");
      this.castingProgressContainer.id = "casting-progress-container";

      // Create skill name display
      this.castingSkillName = document.createElement("div");
      this.castingSkillName.id = "casting-skill-name";
      this.castingProgressContainer.appendChild(this.castingSkillName);

      // Create progress fill
      this.castingProgressFill = document.createElement("div");
      this.castingProgressFill.id = "casting-progress-fill";
      this.castingProgressContainer.appendChild(this.castingProgressFill);

      // Append to body or a specific UI container
      document.body.appendChild(this.castingProgressContainer);
    }
  }

  /**
   * Initialize UIManager with a callback for closing the stats menu
   * @param {Function} onCloseStatsCallback - Function to call when stats menu is closed
   */
  init(onCloseStatsCallback) {
    // Hook up close button for stats
    if (this.closeStatsButton) {
      this.closeStatsButton.addEventListener("click", () => {
        this.hideStatsMenu();
        if (typeof onCloseStatsCallback === "function") {
          onCloseStatsCallback();
        }
      });
    }
  }

  /**
   * Show the casting progress bar.
   * @param {string} skillName - Name of the skill being cast.
   * @param {number} totalTime - Total casting time in seconds.
   */
  showCastingProgress(skillName, totalTime) {
    if (this.castingProgressContainer) {
      this.castingSkillName.textContent = `Casting: ${skillName}`;
      this.castingProgressFill.style.width = "0%";
      this.castingProgressContainer.style.display = "block";
    }
  }

  /**
   * Update the casting progress bar.
   * @param {number} elapsedTime - Elapsed casting time in seconds.
   * @param {number} totalTime - Total casting time in seconds.
   */
  updateCastingProgress(elapsedTime, totalTime) {
    if (this.castingProgressFill) {
      const progressPercent = (elapsedTime / totalTime) * 100;
      this.castingProgressFill.style.width = `${progressPercent}%`;
    }
  }

  /**
   * Hide the casting progress bar.
   */
  hideCastingProgress() {
    if (this.castingProgressContainer) {
      this.castingProgressContainer.style.display = "none";
      this.castingProgressFill.style.width = "0%";
      this.castingSkillName.textContent = "";
    }
  }

  /**
   * Setup skill slots with event listeners and dynamic icons.
   * Dynamically creates casting slots based on the skills array.
   * @param {Array} skills - Array of skill objects
   */
  setupSkills(skills) {
    // Clear existing casting slots to prevent duplicates
    this.castingBar.innerHTML = "";

    skills.forEach((skill) => {
      // Create casting-slot div
      const castingSlot = document.createElement("div");
      castingSlot.classList.add("casting-slot");
      castingSlot.setAttribute("data-skill-id", skill.id);

      // Create img element for skill icon
      const img = document.createElement("img");
      img.src = skill.icon;
      img.alt = skill.name;
      castingSlot.appendChild(img);

      // Create mana-cost div
      const manaCost = document.createElement("div");
      manaCost.classList.add("mana-cost");
      manaCost.textContent = skill.manaCost;
      castingSlot.appendChild(manaCost);

      // Create cooldown-overlay div
      const cooldownOverlay = document.createElement("div");
      cooldownOverlay.classList.add("cooldown-overlay");
      cooldownOverlay.style.display = "none"; // Initially hidden

      // Create cooldown-timer span
      const cooldownTimer = document.createElement("span");
      cooldownTimer.classList.add("cooldown-timer");
      cooldownOverlay.appendChild(cooldownTimer);

      castingSlot.appendChild(cooldownOverlay);

      // Add click event listener to trigger skill usage
      castingSlot.addEventListener("click", () => {
        this.scene.useSkill(skill);
      });

      // Append the castingSlot to the castingBar
      this.castingBar.appendChild(castingSlot);
    });
  }

  /**
   * Update the top-left UI bars and text.
   */
  updateUI({
    name,
    currentHealth,
    maxHealth,
    currentMana,
    maxMana,
    level,
    xp,
  }) {
    // Update health
    if (this.uiHealthFill && this.healthText) {
      const healthPercent = (currentHealth / maxHealth) * 100;
      this.uiHealthFill.style.width = `${healthPercent}%`;
      this.healthText.textContent = `HP: ${currentHealth}/${maxHealth} (${healthPercent.toFixed(
        1
      )}%)`;
    } else {
      console.warn("Health elements not found in the DOM.");
    }

    // Update mana
    if (this.uiManaFill && this.manaText) {
      const manaPercent = (currentMana / maxMana) * 100;
      this.uiManaFill.style.width = `${manaPercent}%`;
      this.manaText.textContent = `Mana: ${currentMana}/${maxMana} (${manaPercent.toFixed(
        1
      )}%)`;
    } else {
      console.warn("Mana elements not found in the DOM.");
    }

    // Update basic info
    if (this.uiName) this.uiName.textContent = name;
    else console.warn("Player name element not found.");

    if (this.uiLevel) this.uiLevel.textContent = `Level: ${level}`;
    else console.warn("Player level element not found.");

    if (this.uiXP) this.uiXP.textContent = `XP: ${xp}`;
    else console.warn("Player XP element not found.");
  }

  /**
   * Update skill cooldown overlay.
   * @param {number} skillId - ID of the skill
   * @param {number} cooldownTime - Remaining cooldown time in seconds
   */
  updateSkillCooldown(skillId, cooldownTime) {
    const castingSlot = document.querySelector(
      `.casting-slot[data-skill-id="${skillId}"]`
    );
    if (!castingSlot) return;

    const cooldownOverlay = castingSlot.querySelector(".cooldown-overlay");
    const cooldownTimer = castingSlot.querySelector(".cooldown-timer");

    if (cooldownTime > 0) {
      cooldownOverlay.style.display = "flex";
      cooldownTimer.textContent = cooldownTime.toFixed(1);
      // Start countdown
      this.startCooldownCountdown(cooldownTime, castingSlot);
    } else {
      cooldownOverlay.style.display = "none";
      cooldownTimer.textContent = "";
    }
  }

  /**
   * Start cooldown countdown for a skill.
   * @param {number} cooldownTime - Total cooldown time in seconds
   * @param {HTMLElement} castingSlot - The casting slot element
   */
  startCooldownCountdown(cooldownTime, castingSlot) {
    const cooldownTimer = castingSlot.querySelector(".cooldown-timer");
    const cooldownOverlay = castingSlot.querySelector(".cooldown-overlay");
    if (!cooldownTimer || !cooldownOverlay) return;

    let remainingTime = cooldownTime;

    // Clear any existing timers
    if (castingSlot.cooldownTimerEvent) {
      this.scene.time.removeEvent(castingSlot.cooldownTimerEvent);
    }

    // Update the timer every 0.1 seconds
    castingSlot.cooldownTimerEvent = this.scene.time.addEvent({
      delay: 100, // 0.1 seconds
      callback: () => {
        remainingTime -= 0.1;
        if (remainingTime <= 0) {
          remainingTime = 0;
          cooldownOverlay.style.display = "none";
          cooldownTimer.textContent = "";
          castingSlot.cooldownTimerEvent.remove(false);
        } else {
          cooldownTimer.textContent = remainingTime.toFixed(1);
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * Show the stats menu with the provided HTML content.
   * @param {string} htmlContent - HTML string to inject into the stats menu
   */
  showStatsMenu(htmlContent) {
    if (!this.statsMenu) return;
    this.statsContent.innerHTML = htmlContent;
    this.statsMenu.style.display = "block";
  }

  /**
   * Hide the stats menu.
   */
  hideStatsMenu() {
    if (!this.statsMenu) return;
    this.statsMenu.style.display = "none";
  }
}
