// managers/UIManager.js

import {
  playerBackpack,
  itemsMap,
  deletedItems,
  playerEquippedItems,
} from "../data/MOCKdata.js";

import { calculatePlayerStats } from "../helpers/calculatePlayerStats.js";

export default class UIManager {
  constructor(scene) {
    this.scene = scene;

    // UI elements
    this.uiName = document.getElementById("player-name");
    this.uiHealthFill = document.getElementById("health-fill");
    this.uiManaFill = document.getElementById("mana-fill");
    this.uiLevel = document.getElementById("player-level");

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

    // Create if missing:
    if (!this.castingProgressContainer) {
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

  /* Casting Progress */
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

  /* Skill Setup */
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

  /* Top-left UI (HP/MP/XP) */
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
    if (this.uiHealthFill && this.healthText) {
      const hpPct = (currentHealth / maxHealth) * 100;
      this.uiHealthFill.style.width = `${hpPct}%`;
      this.healthText.textContent = `HP: ${currentHealth}/${maxHealth} (${hpPct.toFixed(1)}%)`;
    }
    if (this.uiManaFill && this.manaText) {
      const mpPct = (currentMana / maxMana) * 100;
      this.uiManaFill.style.width = `${mpPct}%`;
      this.manaText.textContent = `Mana: ${currentMana}/${maxMana} (${mpPct.toFixed(1)}%)`;
    }
    if (this.uiName) this.uiName.textContent = name;
    if (this.uiLevel) this.uiLevel.textContent = `Level: ${level}`;

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
      const expPct = (currentExp / expForNextLevel) * 100;

      this.uiExpFill.style.width = `${expPct}%`;
      this.uiExpText.textContent = `EXP: ${currentExp}/${expForNextLevel} (${expPct.toFixed(1)}%)`;
    }
  }

  /* Stats Menu ("B") */
  showStatsMenu(htmlContent) {
    if (!this.statsMenu) return;
    this.statsContent.innerHTML = htmlContent;
    this.statsMenu.style.display = "block";
  }
  hideStatsMenu() {
    if (!this.statsMenu) return;
    this.statsMenu.style.display = "none";
  }

  /* Level-Up Notification */
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

  /* Inventory Menu ("I") */
  toggleInventory() {
    if (!this.inventoryMenu) return;
    if (this.inventoryMenu.style.display === "block") {
      this.closeInventory();
    } else {
      this.openInventory();
    }
  }

  openInventory() {
    // Clear old content
    this.inventoryContent.innerHTML = "";

    // Create 3 columns (blocks)
    const equippedBlock = document.createElement("div");
    equippedBlock.id = "inventory-block-equipped";
    equippedBlock.classList.add("inventory-column");

    const statsBlock = document.createElement("div");
    statsBlock.id = "inventory-block-stats";
    statsBlock.classList.add("inventory-column");

    const gridBlock = document.createElement("div");
    gridBlock.id = "inventory-block-grid";
    gridBlock.classList.add("inventory-column");

    // 1) Equipped items silhouette
    this.renderEquippedItemsBlock(equippedBlock);

    // 2) Derived stats
    this.renderDerivedStatsBlock(statsBlock);

    // 3) Inventory grid
    this.renderInventoryGrid(gridBlock);

    // Append blocks
    this.inventoryContent.appendChild(equippedBlock);
    this.inventoryContent.appendChild(statsBlock);
    this.inventoryContent.appendChild(gridBlock);

    // Show
    this.inventoryMenu.style.display = "block";
  }

  closeInventory() {
    if (!this.inventoryMenu) return;
    this.inventoryMenu.style.display = "none";
  }

  renderEquippedItemsBlock(container) {
    const heading = document.createElement("h3");
    heading.textContent = "Equipped Items";
    container.appendChild(heading);

    const eqContainer = document.createElement("div");
    eqContainer.classList.add("equipment-container");
    container.appendChild(eqContainer);

    const slotsData = [
      { slot: "head",      cssClass: "slot-head",      label: "HEAD" },
      { slot: "shoulders", cssClass: "slot-shoulders", label: "SHOULDERS" },
      { slot: "chest",     cssClass: "slot-chest",     label: "CHEST" },
      { slot: "weapon",    cssClass: "slot-weapon",    label: "WEAPON" },
      { slot: "legs",      cssClass: "slot-legs",      label: "LEGS" },
      { slot: "feet",      cssClass: "slot-feet",      label: "FEET" },
    ];
    slotsData.forEach(({ slot, cssClass, label }) => {
      const slotDiv = document.createElement("div");
      slotDiv.classList.add("equipment-slot", cssClass);

      const equippedItemName = playerEquippedItems[slot];
      if (equippedItemName) {
        // Show item
        slotDiv.textContent = equippedItemName;
        slotDiv.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          this.showEquipmentContextMenu(e, slot, equippedItemName);
        });
      } else {
        // Show slot label
        slotDiv.textContent = label;
        slotDiv.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          this.showEquipmentContextMenu(e, slot, null);
        });
      }
      eqContainer.appendChild(slotDiv);
    });
  }

  renderDerivedStatsBlock(container) {
    const heading = document.createElement("h3");
    heading.textContent = "Final Stats";
    container.appendChild(heading);

    const derivedStats = calculatePlayerStats();
    const statsTable = document.createElement("table");
    statsTable.style.width = "100%";

    const rowData = [
      { label: "Health",         value: derivedStats.health },
      { label: "Mana",           value: derivedStats.mana },
      { label: "Magic Attack",   value: derivedStats.magicAttack },
      { label: "Melee Attack",   value: derivedStats.meleeAttack },
      { label: "Magic Defense",  value: derivedStats.magicDefense },
      { label: "Melee Defense",  value: derivedStats.meleeDefense },
      { label: "Magic Evasion",  value: derivedStats.magicEvasion },
      { label: "Melee Evasion",  value: derivedStats.meleeEvasion },
      { label: "Speed",          value: derivedStats.speed },
    ];

    rowData.forEach((stat) => {
      const tr = document.createElement("tr");
      const tdLabel = document.createElement("td");
      tdLabel.textContent = stat.label;
      const tdValue = document.createElement("td");
      tdValue.textContent = stat.value;
      tr.appendChild(tdLabel);
      tr.appendChild(tdValue);
      statsTable.appendChild(tr);
    });

    container.appendChild(statsTable);
  }

  renderInventoryGrid(container) {
    const heading = document.createElement("h3");
    heading.textContent = "Inventory";
    container.appendChild(heading);

    // This table has fixed layout & 5 columns of 64px each → 320px total
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
          // Empty
          cell.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.showItemContextMenu(e, key, null);
          });
        } else {
          // we have an item
          const itemData = itemsMap[value];
          cell.classList.add("open-cell");

          // .item-text div to avoid stretching the cell
          const itemTextDiv = document.createElement("div");
          itemTextDiv.classList.add("item-text");
          itemTextDiv.textContent = itemData ? itemData.name : `Unknown(${value})`;
          cell.appendChild(itemTextDiv);

          cell.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.showItemContextMenu(e, key, itemData);
          });
        }
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
    container.appendChild(table);
  }

  showItemContextMenu(event, cellKey, itemData) {
    const existingMenu = document.getElementById("inventory-context-menu");
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement("div");
    menu.id = "inventory-context-menu";
    menu.classList.add("inventory-context-menu");
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;

    if (!itemData) {
      const noItemLabel = document.createElement("div");
      noItemLabel.textContent = "No item in this cell.";
      menu.appendChild(noItemLabel);
    } else {
      // "Wear"
      const wearOption = document.createElement("div");
      wearOption.textContent = "Wear";
      wearOption.classList.add("menu-option");
      wearOption.addEventListener("click", () => {
        this.scene.playerManager.equipItem(itemData.slot, itemData.name);
        playerBackpack[cellKey] = 0; // remove from backpack
        this.openInventory();
        menu.remove();
      });
      menu.appendChild(wearOption);

      // "Delete"
      const deleteOption = document.createElement("div");
      deleteOption.textContent = "Delete";
      deleteOption.classList.add("menu-option");
      deleteOption.addEventListener("click", () => {
        deletedItems.push({
          id: itemData.id,
          name: itemData.name,
          deletedAt: new Date().toISOString(),
          reason: "UserDeleted",
        });
        playerBackpack[cellKey] = 0;
        this.openInventory();
        menu.remove();
      });
      menu.appendChild(deleteOption);
    }
    // "Close"
    const closeOption = document.createElement("div");
    closeOption.textContent = "Close";
    closeOption.classList.add("menu-option");
    closeOption.addEventListener("click", () => {
      menu.remove();
    });
    menu.appendChild(closeOption);

    document.body.appendChild(menu);
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

  showEquipmentContextMenu(event, slot, equippedItemName) {
    const existingMenu = document.getElementById("equipment-context-menu");
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement("div");
    menu.id = "equipment-context-menu";
    menu.classList.add("inventory-context-menu");
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;

    if (!equippedItemName) {
      const noItemLabel = document.createElement("div");
      noItemLabel.textContent = "Slot is empty.";
      menu.appendChild(noItemLabel);
    } else {
      // "UNEQUIP"
      const unequipOption = document.createElement("div");
      unequipOption.textContent = "UNEQUIP";
      unequipOption.classList.add("menu-option");
      unequipOption.addEventListener("click", () => {
        this.scene.playerManager.unequipItem(slot);
        this.openInventory();
        menu.remove();
      });
      menu.appendChild(unequipOption);
    }
    // "Close"
    const closeOption = document.createElement("div");
    closeOption.textContent = "Close";
    closeOption.classList.add("menu-option");
    closeOption.addEventListener("click", () => {
      menu.remove();
    });
    menu.appendChild(closeOption);

    document.body.appendChild(menu);
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
