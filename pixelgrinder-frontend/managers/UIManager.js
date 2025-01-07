// managers/UIManager.js

export default class UIManager {
  constructor() {
    // Grab references
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
  updateUI({ name, currentHealth, maxHealth, currentMana, maxMana, level, xp }) {
    // Update health
    const healthPercent = (currentHealth / maxHealth) * 100;
    this.uiHealthFill.style.width = `${healthPercent}%`;
    this.healthText.textContent = `HP: ${currentHealth}/${maxHealth}`;

    // Update mana
    const manaPercent = (currentMana / maxMana) * 100;
    this.uiManaFill.style.width = `${manaPercent}%`;
    this.manaText.textContent = `Mana: ${currentMana}/${maxMana}`;

    // Update basic info
    this.uiName.textContent = name;
    this.uiLevel.textContent = `Level: ${level}`;
    this.uiXP.textContent = `XP: ${xp}`;
  }

  /**
   * Populate the 10 skill slots with icons & mana costs.
   * @param {Array} skills - array of skill data
   */
  setupSkills(skills) {
    const maxSlots = 10;
    skills.forEach((skill, index) => {
      if (index >= maxSlots) return;

      const slotEl = this.castingBarSlots[index];
      slotEl.innerHTML = `
        <img src="${skill.icon}" alt="${skill.name}" class="skill-icon" />
        <span class="mana-cost">${skill.manaCost}</span>
      `;
    });
  }

  /**
   * Show stats menu with provided HTML content
   */
  showStatsMenu(htmlContent) {
    if (!this.statsMenu) return;
    this.statsContent.innerHTML = htmlContent;
    this.statsMenu.style.display = "block";
  }

  /**
   * Hide stats menu
   */
  hideStatsMenu() {
    if (!this.statsMenu) return;
    this.statsMenu.style.display = "none";
  }
}
