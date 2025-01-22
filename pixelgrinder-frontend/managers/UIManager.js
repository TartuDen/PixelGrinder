// managers/UIManager.js

import { playerBackpack, itemsMap, deletedItems } from "../data/MOCKdata.js";

export default class UIManager {
  constructor(scene) {
    this.scene = scene;

    // Existing UI element references
    this.uiName = document.getElementById("player-name");
    this.uiHealthFill = document.getElementById("health-fill");
    this.uiManaFill = document.getElementById("mana-fill");
    this.uiLevel = document.getElementById("player-level");
    this.uiXP = document.getElementById("player-xp");

    this.uiExpFill = document.getElementById("exp-fill");
    this.uiExpText = document.getElementById("exp-text");

    this.healthText = document.getElementById("health-text");
    this.manaText = document.getElementById("mana-text");

    // Stats Menu
    this.statsMenu = document.getElementById("stats-menu");
    this.statsContent = document.getElementById("stats-content");
    this.closeStatsButton = document.getElementById("close-stats");

    // Inventory Menu
    this.inventoryMenu = document.getElementById("inventory-menu");
    this.inventoryContent = document.getElementById("inventory-content");
    this.closeInventoryButton = document.getElementById("close-inventory");

    // Casting bar
    this.castingBar = document.getElementById("casting-bar");

    // Casting Progress
    this.castingProgressContainer = document.getElementById(
      "casting-progress-container"
    );
    this.castingProgressFill = document.getElementById("casting-progress-fill");
    this.castingSkillName = document.getElementById("casting-skill-name");

    if (!document.getElementById("casting-progress-container")) {
      this.castingProgressContainer = document.createElement("div");
      this.castingProgressContainer.id = "casting-progress-container";

      this.castingSkillName = document.createElement("div");
      this.castingSkillName.id = "casting-skill-name";
      this.castingProgressContainer.appendChild(this.castingSkillName);

      this.castingProgressFill = document.createElement("div");
      this.castingProgressFill.id = "casting-progress-fill";
      this.castingProgressContainer.appendChild(this.castingProgressFill);

      document.body.appendChild(this.castingProgressContainer);
    }
  }

  init(onCloseStatsCallback) {
    if (this.closeStatsButton) {
      this.closeStatsButton.addEventListener("click", () => {
        this.hideStatsMenu();
        if (typeof onCloseStatsCallback === "function") {
          onCloseStatsCallback();
        }
      });
    }

    if (this.closeInventoryButton) {
      this.closeInventoryButton.addEventListener("click", () => {
        this.closeInventory();
      });
    }

    if (this.scene.events) {
      this.scene.events.on("statsUpdated", this.handleStatsUpdate, this);
    }
  }

  handleStatsUpdate(stats) {
    this.updateUI(stats);

    // If player level changed, show a notification
    if (stats.level > (this.previousLevel || 1)) {
      this.showLevelUpNotification(stats.level);
      this.previousLevel = stats.level;
    }
  }

  // ---------------------------
  // Casting Progress
  // ---------------------------
  showCastingProgress(skillName, totalTime) {
    if (this.castingProgressContainer) {
      this.castingSkillName.textContent = `Casting: ${skillName}`;
      this.castingProgressFill.style.width = "0%";
      this.castingProgressContainer.style.display = "block";
    }
  }

  updateCastingProgress(elapsedTime, totalTime) {
    if (this.castingProgressFill) {
      const progressPercent = (elapsedTime / totalTime) * 100;
      this.castingProgressFill.style.width = `${progressPercent}%`;
    }
  }

  hideCastingProgress() {
    if (this.castingProgressContainer) {
      this.castingProgressContainer.style.display = "none";
      this.castingProgressFill.style.width = "0%";
      this.castingSkillName.textContent = "";
    }
  }

  // ---------------------------
  // Skills Setup
  // ---------------------------
  setupSkills(skills) {
    this.castingBar.innerHTML = "";

    skills.forEach((skill) => {
      const castingSlot = document.createElement("div");
      castingSlot.classList.add("casting-slot");
      castingSlot.setAttribute("data-skill-id", skill.id);

      const img = document.createElement("img");
      img.src = skill.icon;
      img.alt = skill.name;
      castingSlot.appendChild(img);

      const manaCost = document.createElement("div");
      manaCost.classList.add("mana-cost");
      manaCost.textContent = skill.manaCost;
      castingSlot.appendChild(manaCost);

      const cooldownOverlay = document.createElement("div");
      cooldownOverlay.classList.add("cooldown-overlay");
      cooldownOverlay.style.display = "none";

      const cooldownTimer = document.createElement("span");
      cooldownTimer.classList.add("cooldown-timer");
      cooldownOverlay.appendChild(cooldownTimer);

      castingSlot.appendChild(cooldownOverlay);

      // Click to cast skill
      castingSlot.addEventListener("click", () => {
        this.scene.useSkill(skill);
      });

      this.castingBar.appendChild(castingSlot);
    });
  }

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
      this.startCooldownCountdown(cooldownTime, castingSlot);
    } else {
      cooldownOverlay.style.display = "none";
      cooldownTimer.textContent = "";
    }
  }

  startCooldownCountdown(cooldownTime, castingSlot) {
    const cooldownTimer = castingSlot.querySelector(".cooldown-timer");
    const cooldownOverlay = castingSlot.querySelector(".cooldown-overlay");
    if (!cooldownTimer || !cooldownOverlay) return;

    let remainingTime = cooldownTime;

    // Clear any existing timers
    if (castingSlot.cooldownTimerEvent) {
      this.scene.time.removeEvent(castingSlot.cooldownTimerEvent);
    }

    castingSlot.cooldownTimerEvent = this.scene.time.addEvent({
      delay: 100,
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

  // ---------------------------
  // Top-left UI update (HP/MP/XP)
  // ---------------------------
  updateUI({
    name,
    currentHealth,
    maxHealth,
    currentMana,
    maxMana,
    level,
    xp,
    speed,
  }) {
    // Health
    if (this.uiHealthFill && this.healthText) {
      const healthPercent = (currentHealth / maxHealth) * 100;
      this.uiHealthFill.style.width = `${healthPercent}%`;
      this.healthText.textContent = `HP: ${currentHealth}/${maxHealth} (${healthPercent.toFixed(
        1
      )}%)`;
    }

    // Mana
    if (this.uiManaFill && this.manaText) {
      const manaPercent = (currentMana / maxMana) * 100;
      this.uiManaFill.style.width = `${manaPercent}%`;
      this.manaText.textContent = `Mana: ${currentMana}/${maxMana} (${manaPercent.toFixed(
        1
      )}%)`;
    }

    // Player name & level
    if (this.uiName) this.uiName.textContent = name;
    if (this.uiLevel) this.uiLevel.textContent = `Level: ${level}`;

    // EXP
    if (this.uiExpFill && this.uiExpText) {
      let expForNextLevel = 100;
      let accumulatedExp = 0;
      let tempLevel = 1;

      while (xp >= accumulatedExp + expForNextLevel && tempLevel < 50) {
        accumulatedExp += expForNextLevel;
        tempLevel += 1;
        expForNextLevel = Math.floor(expForNextLevel * 1.5);
      }

      const currentExp = xp - accumulatedExp;
      const expPercent = (currentExp / expForNextLevel) * 100;

      this.uiExpFill.style.width = `${expPercent}%`;
      this.uiExpText.textContent = `EXP: ${currentExp}/${expForNextLevel} (${expPercent.toFixed(
        1
      )}%)`;
    }
  }

  // ---------------------------
  // Stats Menu
  // ---------------------------
  showStatsMenu(htmlContent) {
    if (!this.statsMenu) return;
    this.statsContent.innerHTML = htmlContent;
    this.statsMenu.style.display = "block";
  }

  hideStatsMenu() {
    if (!this.statsMenu) return;
    this.statsMenu.style.display = "none";
  }

  // ---------------------------
  // Level-Up Notification
  // ---------------------------
  showLevelUpNotification(newLevel) {
    const notification = document.createElement("div");
    notification.classList.add("level-up-notification");
    notification.textContent = `Level Up! Now at Level ${newLevel}!`;
    document.body.appendChild(notification);

    notification.style.opacity = 1;
    notification.style.transform = "translateY(0)";

    this.scene.time.delayedCall(
      3000,
      () => {
        notification.style.opacity = 0;
        notification.style.transform = "translateY(-20px)";
        setTimeout(() => {
          notification.remove();
        }, 500);
      },
      [],
      this
    );
  }

  // -------------------------------------------
  // Inventory Menu
  // -------------------------------------------
  toggleInventory() {
    if (!this.inventoryMenu) return;

    if (this.inventoryMenu.style.display === "block") {
      this.closeInventory();
    } else {
      this.openInventory();
    }
  }

  openInventory() {
    this.renderInventoryGrid();
    this.inventoryMenu.style.display = "block";
  }

  closeInventory() {
    if (!this.inventoryMenu) return;
    this.inventoryMenu.style.display = "none";
  }

  /**
   * Builds a 5×6 grid from playerBackpack.
   *  - null => cell is closed (X)
   *  - 0 => cell is open but empty
   *  - item ID => item in cell
   */
  renderInventoryGrid() {
    if (!this.inventoryContent) return;

    this.inventoryContent.innerHTML = "";

    const table = document.createElement("table");
    table.classList.add("inventory-table");

    for (let r = 0; r < 6; r++) {
      const row = document.createElement("tr");

      for (let c = 0; c < 5; c++) {
        const cell = document.createElement("td");

        const key = `cell_${r}_${c}`;
        const value = playerBackpack[key];

        if (value === null) {
          cell.classList.add("closed-cell");
          cell.textContent = "X";
        } else if (value === 0) {
          cell.classList.add("open-cell");
          cell.textContent = "Empty";
          // Right-click => show context menu
          cell.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.showItemContextMenu(e, key, null);
          });
        } else {
          // We have an item ID
          const itemData = itemsMap[value];
          cell.classList.add("open-cell");
          if (itemData) {
            cell.textContent = `ID: ${itemData.id}\n${itemData.name}`;
          } else {
            cell.textContent = `??? (ID: ${value})`;
          }

          cell.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.showItemContextMenu(e, key, itemData);
          });
        }

        row.appendChild(cell);
      }

      table.appendChild(row);
    }

    this.inventoryContent.appendChild(table);
  }

  /**
   * Show a small context menu with "Wear" / "Delete"
   */
  showItemContextMenu(event, cellKey, itemData) {
    const existingMenu = document.getElementById("inventory-context-menu");
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement("div");
    menu.id = "inventory-context-menu";
    menu.classList.add("inventory-context-menu");
    menu.style.position = "absolute";
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;

    if (!itemData) {
      // No item
      const noItemLabel = document.createElement("div");
      noItemLabel.textContent = "No item in this cell.";
      menu.appendChild(noItemLabel);
    } else {
      // Wear
      const wearOption = document.createElement("div");
      wearOption.textContent = "Wear";
      wearOption.classList.add("menu-option");
      wearOption.addEventListener("click", () => {
        console.log(`Wearing item ID=${itemData.id} name=${itemData.name}`);

        // Actually equip the item
        this.scene.playerManager.equipItem(itemData.slot, itemData.name);

        // Remove from the backpack
        playerBackpack[cellKey] = 0;

        // Re-render inventory
        this.renderInventoryGrid();

        menu.remove();
      });
      menu.appendChild(wearOption);

      // Delete
      const deleteOption = document.createElement("div");
      deleteOption.textContent = "Delete";
      deleteOption.classList.add("menu-option");
      deleteOption.addEventListener("click", () => {
        console.log(`Delete item ID=${itemData.id} from cell=${cellKey}`);

        // 1) Record it in deletedItems
        deletedItems.push({
          id: itemData.id,
          name: itemData.name,
          deletedAt: new Date().toISOString(),
          reason: "UserDeleted",
        });

        // 2) Remove it from backpack
        playerBackpack[cellKey] = 0;

        // Re-render the inventory
        this.renderInventoryGrid();

        menu.remove();
      });
      menu.appendChild(deleteOption);
    }

    // Close
    const closeOption = document.createElement("div");
    closeOption.textContent = "Close";
    closeOption.classList.add("menu-option");
    closeOption.addEventListener("click", () => {
      menu.remove();
    });
    menu.appendChild(closeOption);

    document.body.appendChild(menu);

    // Remove the menu if user clicks outside
    document.addEventListener(
      "click",
      (e2) => {
        if (e2.target !== menu && !menu.contains(e2.target)) {
          menu.remove();
        }
      },
      { once: true }
    );
  }
}
