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

    // Casting bar
    this.castingBarSlots = document.querySelectorAll(
      "#casting-bar .casting-slot"
    );

    // Removed casting indicator references
    // this.castingIndicator = document.getElementById("casting-indicator");
    // this.castingText = document.getElementById("casting-text");
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
    const healthPercent = (currentHealth / maxHealth) * 100;
    this.uiHealthFill.style.width = `${healthPercent}%`;
    this.healthText.textContent = `HP: ${currentHealth}/${maxHealth} (${healthPercent.toFixed(
      1
    )}%)`;

    // Update mana
    const manaPercent = (currentMana / maxMana) * 100;
    this.uiManaFill.style.width = `${manaPercent}%`;
    this.manaText.textContent = `Mana: ${currentMana}/${maxMana} (${manaPercent.toFixed(
      1
    )}%)`;

    // Update basic info
    this.uiName.textContent = name;
    this.uiLevel.textContent = `Level: ${level}`;
    this.uiXP.textContent = `XP: ${xp}`;
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
    const cooldownOverlay = castingSlot.querySelector(".cooldown-overlay"); // Defined within scope
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

  /**
   * Setup skill slots with event listeners if needed.
   * Also, set the skill icons dynamically based on skill data.
   * @param {Array} skills - Array of skill objects
   */
  setupSkills(skills) {
    skills.forEach((skill) => {
      const castingSlot = document.querySelector(
        `.casting-slot[data-skill-id="${skill.id}"]`
      );
      if (castingSlot) {
        const img = castingSlot.querySelector('img');
        if (img) {
          img.src = skill.icon;
          img.alt = skill.name;
        }
        castingSlot.addEventListener("click", () => {
          // Trigger skill usage in the MainScene
          this.scene.useSkill(skill);
        });
      }
    });
  }
}
