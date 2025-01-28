//
// managers/UIManager.js
//

import {
  playerBackpack,
  itemsMap,
  deletedItems,
  playerEquippedItems,
  playerSkills,
  allGameSkills,
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

    // Create if missing
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

    // //// NEW LOOT UI ////
    this.lootMenu = document.getElementById("loot-menu");
    if (!this.lootMenu) {
      this.lootMenu = document.createElement("div");
      this.lootMenu.id = "loot-menu";
      this.lootMenu.classList.add("stats-menu");
      this.lootMenu.style.display = "none";
      document.body.appendChild(this.lootMenu);
    }

    this.lootCloseButton = document.createElement("button");
    this.lootCloseButton.textContent = "Close";
    this.lootCloseButton.addEventListener("click", () => {
      this.lootMenu.style.display = "none";
    });
    this.lootMenu.appendChild(this.lootCloseButton);

    this.lootContent = document.createElement("div");
    this.lootContent.id = "loot-content";
    this.lootMenu.appendChild(this.lootContent);

    // //// NEW SKILL BOOK ////
    this.skillBook = document.createElement("div");
    this.skillBook.id = "skill-book";
    this.skillBook.classList.add("stats-menu");
    this.skillBook.style.display = "none";
    document.body.appendChild(this.skillBook);

    this.closeSkillBookBtn = document.createElement("button");
    this.closeSkillBookBtn.textContent = "Close";
    this.closeSkillBookBtn.style.marginBottom = "10px";
    this.closeSkillBookBtn.addEventListener("click", () => {
      this.skillBook.style.display = "none";
    });
    this.skillBook.appendChild(this.closeSkillBookBtn);

    this.skillBookContent = document.createElement("div");
    this.skillBookContent.id = "skill-book-content";
    this.skillBook.appendChild(this.skillBookContent);
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
    // Rebuild the skill bar
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
      this.healthText.textContent = `HP: ${currentHealth}/${maxHealth} (${hpPct.toFixed(
        1
      )}%)`;
    }
    if (this.uiManaFill && this.manaText) {
      const mpPct = (currentMana / maxMana) * 100;
      this.uiManaFill.style.width = `${mpPct}%`;
      this.manaText.textContent = `Mana: ${currentMana}/${maxMana} (${mpPct.toFixed(
        1
      )}%)`;
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
      this.uiExpText.textContent = `EXP: ${currentExp}/${expForNextLevel} (${expPct.toFixed(
        1
      )}%)`;
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
    this.inventoryContent.innerHTML = "";

    const equippedBlock = document.createElement("div");
    equippedBlock.id = "inventory-block-equipped";
    equippedBlock.classList.add("inventory-column");

    const statsBlock = document.createElement("div");
    statsBlock.id = "inventory-block-stats";
    statsBlock.classList.add("inventory-column");

    const gridBlock = document.createElement("div");
    gridBlock.id = "inventory-block-grid";
    gridBlock.classList.add("inventory-column");

    this.renderEquippedItemsBlock(equippedBlock);
    this.renderDerivedStatsBlock(statsBlock);
    this.renderInventoryGrid(gridBlock);

    this.inventoryContent.appendChild(equippedBlock);
    this.inventoryContent.appendChild(statsBlock);
    this.inventoryContent.appendChild(gridBlock);

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

      const equippedItemId = playerEquippedItems[slot];
      if (equippedItemId) {
        const itemData = itemsMap[equippedItemId];
        slotDiv.textContent = itemData ? itemData.name : `Unknown(${equippedItemId})`;
        slotDiv.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          this.showEquipmentContextMenu(e, slot, equippedItemId);
        });
      } else {
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
          cell.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.showItemContextMenu(e, key, null);
          });
        } else {
          const itemData = itemsMap[value];
          cell.classList.add("open-cell");

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
      const isWearable = itemData.slot && itemData.type;
      if (isWearable) {
        const wearOption = document.createElement("div");
        wearOption.textContent = "Wear";
        wearOption.classList.add("menu-option");
        wearOption.addEventListener("click", () => {
          this.scene.playerManager.equipItem(itemData.slot, itemData.id);
          playerBackpack[cellKey] = 0; // remove from backpack
          this.openInventory();
          menu.remove();
        });
        menu.appendChild(wearOption);
      }

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

  showEquipmentContextMenu(event, slot, equippedItemId) {
    const existingMenu = document.getElementById("equipment-context-menu");
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement("div");
    menu.id = "equipment-context-menu";
    menu.classList.add("inventory-context-menu");
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;

    if (!equippedItemId) {
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

  //// LOOT UI ////
  openLootWindow(mob) {
    this.lootContent.innerHTML = "";
    this.lootMenu.style.display = "block";

    const title = document.createElement("h3");
    title.textContent = `Loot from ${mob.customData.id}`;
    this.lootContent.appendChild(title);

    if (mob.customData.droppedLoot.length === 0) {
      const noLoot = document.createElement("p");
      noLoot.textContent = "No loot.";
      this.lootContent.appendChild(noLoot);
      return;
    }

    mob.customData.droppedLoot.forEach((itemId, index) => {
      // Check if it's an item in itemsMap
      const itemData = itemsMap[itemId];
      // Or a skill in allGameSkills
      const skillData = allGameSkills.find((s) => s.id === itemId);

      if (itemData) {
        // Normal item
        const itemDiv = document.createElement("div");
        itemDiv.textContent = itemData.name;
        itemDiv.style.marginBottom = "5px";

        const takeButton = document.createElement("button");
        takeButton.textContent = "Take Item";
        takeButton.addEventListener("click", () => {
          this.handleLootItem(mob, index, itemData);
        });
        itemDiv.appendChild(takeButton);

        this.lootContent.appendChild(itemDiv);
      } else if (skillData) {
        // It's a skill from allGameSkills
        const skillDiv = document.createElement("div");
        skillDiv.textContent = `${skillData.name} (Skill)`;
        skillDiv.style.marginBottom = "5px";

        const learnButton = document.createElement("button");
        learnButton.textContent = "Learn Skill";
        learnButton.addEventListener("click", () => {
          this.learnSkillFromLoot(mob, index, skillData);
        });
        skillDiv.appendChild(learnButton);

        this.lootContent.appendChild(skillDiv);
      } else {
        // Unknown
        const unknownDiv = document.createElement("div");
        unknownDiv.textContent = `Unknown loot ID: ${itemId}`;
        this.lootContent.appendChild(unknownDiv);
      }
    });
  }

  handleLootItem(mob, lootIndex, itemData) {
    const emptyCell = this.scene.playerManager.findEmptyBackpackCell();
    if (!emptyCell) {
      alert("No space in backpack!");
      return;
    }
    // place item in backpack
    playerBackpack[emptyCell] = itemData.id;

    // Remove from mob's loot
    mob.customData.droppedLoot.splice(lootIndex, 1);
    console.log(`Took "${itemData.name}", put in cell=${emptyCell}`);

    // Refresh the loot window
    this.openLootWindow(mob);
  }

  learnSkillFromLoot(mob, lootIndex, skillData) {
    // see if player already knows it
    const alreadyKnown = playerSkills.find((sk) => sk.id === skillData.id);
    if (alreadyKnown) {
      alert("You already know this skill!");
    } else {
      // teach the player this new skill
      playerSkills.push(skillData);
      alert(`You learned a new skill: ${skillData.name}!`);

      // Refresh the skill bar
      this.setupSkills(playerSkills);

      // Also re-bind the skill hotkeys
      this.scene.inputManager.setupControls(playerSkills);
    }

    // Remove from the mob's loot array
    mob.customData.droppedLoot.splice(lootIndex, 1);
    this.openLootWindow(mob);
  }

  //// SKILL BOOK ////
  toggleSkillBook() {
    if (this.skillBook.style.display === "block") {
      this.skillBook.style.display = "none";
      return;
    }

    this.skillBook.style.display = "block";
    this.skillBookContent.innerHTML = "<h3>Skill Book</h3>";

    playerSkills.forEach((skill) => {
      const skillDiv = document.createElement("div");
      skillDiv.textContent = `${skill.name} (ManaCost: ${skill.manaCost}, CD: ${skill.cooldown}s)`;
      this.skillBookContent.appendChild(skillDiv);
    });
  }
}
