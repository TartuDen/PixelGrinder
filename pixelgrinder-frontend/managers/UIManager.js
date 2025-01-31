// managers/UIManager.js

import {
  playerBackpack,
  itemsMap,
  deletedItems,
  playerEquippedItems,
  playerSkills,
  allGameSkills,
  skillEnhancements,
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

    this.statsMenu = document.getElementById("stats-menu");
    this.statsContent = document.getElementById("stats-content");
    this.closeStatsButton = document.getElementById("close-stats");

    this.inventoryMenu = document.getElementById("inventory-menu");
    this.inventoryContent = document.getElementById("inventory-content");
    this.closeInventoryButton = document.getElementById("close-inventory");

    this.castingBar = document.getElementById("casting-bar");

    this.castingProgressContainer = document.getElementById(
      "casting-progress-container"
    );
    this.castingProgressFill = document.getElementById("casting-progress-fill");
    this.castingSkillName = document.getElementById("casting-skill-name");

    // Loot UI
    this.lootMenu = document.getElementById("loot-menu");
    if (!this.lootMenu) {
      this.lootMenu = document.createElement("div");
      this.lootMenu.id = "loot-menu";
      this.lootMenu.classList.add("stats-menu");
      this.lootMenu.style.display = "none";
      document.body.appendChild(this.lootMenu);

      this.lootCloseButton = document.createElement("button");
      this.lootCloseButton.id = "loot-close-button";
      this.lootCloseButton.textContent = "Close";
      this.lootCloseButton.addEventListener("click", () => {
        this.lootMenu.style.display = "none";
      });
      this.lootMenu.appendChild(this.lootCloseButton);

      this.lootContent = document.createElement("div");
      this.lootContent.id = "loot-content";
      this.lootMenu.appendChild(this.lootContent);
    } else {
      this.lootCloseButton = document.getElementById("loot-close-button");
      this.lootContent = document.getElementById("loot-content");
    }

    // Skill Book
    this.skillBook = document.getElementById("skill-book");
    if (!this.skillBook) {
      this.skillBook = document.createElement("div");
      this.skillBook.id = "skill-book";
      this.skillBook.classList.add("stats-menu");
      this.skillBook.style.display = "none";
      document.body.appendChild(this.skillBook);

      this.closeSkillBookBtn = document.createElement("button");
      this.closeSkillBookBtn.id = "skill-book-close-button";
      this.closeSkillBookBtn.textContent = "Close";
      this.closeSkillBookBtn.style.marginBottom = "10px";
      this.closeSkillBookBtn.addEventListener("click", () => {
        this.skillBook.style.display = "none";
      });
      this.skillBook.appendChild(this.closeSkillBookBtn);

      this.skillBookContent = document.createElement("div");
      this.skillBookContent.id = "skill-book-content";
      this.skillBook.appendChild(this.skillBookContent);
    } else {
      this.closeSkillBookBtn = document.getElementById("skill-book-close-button");
      this.skillBookContent = document.getElementById("skill-book-content");
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

    if (stats.level > (this.previousLevel || 1)) {
      this.showLevelUpNotification(stats.level);
      this.previousLevel = stats.level;
    }
  }

  // Casting Progress
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

  // Setup Skills (casting bar)
  setupSkills(skills) {
    this.castingBar.innerHTML = "";

    skills.forEach((skill) => {
      const castingSlot = document.createElement("div");
      castingSlot.classList.add("casting-slot");
      castingSlot.setAttribute("data-skill-id", skill.id);

      // Icon
      const img = document.createElement("img");
      img.src = skill.icon;
      img.alt = skill.name;
      castingSlot.appendChild(img);

      // Show skill level
      const levelLabel = document.createElement("div");
      levelLabel.classList.add("skill-level-label");
      levelLabel.textContent = `L${skill.level || 1}`;
      castingSlot.appendChild(levelLabel);

      // Mana cost
      const manaCost = document.createElement("div");
      manaCost.classList.add("mana-cost");
      manaCost.textContent = (skill.manaCost || 0).toFixed(1);
      castingSlot.appendChild(manaCost);

      // Cooldown overlay
      const cooldownOverlay = document.createElement("div");
      cooldownOverlay.classList.add("cooldown-overlay");
      cooldownOverlay.style.display = "none";
      const cooldownTimer = document.createElement("span");
      cooldownTimer.classList.add("cooldown-timer");
      cooldownOverlay.appendChild(cooldownTimer);
      castingSlot.appendChild(cooldownOverlay);

      // Click => skill usage
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

  // Top-left UI (HP/MP/XP)
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
    const hpVal = Math.round(currentHealth);
    const hpMaxVal = Math.round(maxHealth);
    const mpVal = Math.round(currentMana);
    const mpMaxVal = Math.round(maxMana);

    if (this.uiHealthFill && this.healthText) {
      const hpPct = (hpVal / hpMaxVal) * 100;
      this.uiHealthFill.style.width = `${hpPct}%`;
      this.healthText.textContent = `HP: ${hpVal}/${hpMaxVal} (${hpPct.toFixed(0)}%)`;
    }
    if (this.uiManaFill && this.manaText) {
      const mpPct = (mpVal / mpMaxVal) * 100;
      this.uiManaFill.style.width = `${mpPct}%`;
      this.manaText.textContent = `Mana: ${mpVal}/${mpMaxVal} (${mpPct.toFixed(0)}%)`;
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
        0
      )}%)`;
    }
  }

  // Stats Menu
  showStatsMenu(htmlContent) {
    if (!this.statsMenu) return;
    this.statsContent.innerHTML = htmlContent;
    this.statsMenu.style.display = "block";
  }
  hideStatsMenu() {
    if (!this.statsMenu) return;
    this.statsMenu.style.display = "none";
  }

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

  // Inventory Menu ("I")
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
      { label: "Health",         value: Math.round(derivedStats.health) },
      { label: "Mana",           value: Math.round(derivedStats.mana) },
      { label: "Magic Attack",   value: Math.round(derivedStats.magicAttack) },
      { label: "Melee Attack",   value: Math.round(derivedStats.meleeAttack) },
      { label: "Magic Defense",  value: Math.round(derivedStats.magicDefense) },
      { label: "Melee Defense",  value: Math.round(derivedStats.meleeDefense) },
      { label: "Magic Evasion",  value: Math.round(derivedStats.magicEvasion) },
      { label: "Melee Evasion",  value: Math.round(derivedStats.meleeEvasion) },
      { label: "Speed",          value: Math.round(derivedStats.speed) },
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
          // Unavailable cell
          cell.classList.add("closed-cell");
          cell.textContent = "X";
        } else if (value === 0) {
          // Available cell, but currently empty
          cell.classList.add("open-cell");
          cell.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.showItemContextMenu(e, key, null);
          });
        } else {
          // Occupied cell
          let itemId = null;
          let itemQuantity = 1;
          if (typeof value === "object") {
            itemId = value.id;
            itemQuantity = value.quantity;
          } else if (typeof value === "number") {
            itemId = value;
          }

          const itemData = itemsMap[itemId];
          cell.classList.add("open-cell");

          const itemTextDiv = document.createElement("div");
          itemTextDiv.classList.add("item-text");

          if (itemData) {
            if (itemQuantity > 1) {
              itemTextDiv.textContent = `${itemData.name} (x${itemQuantity})`;
            } else {
              itemTextDiv.textContent = itemData.name;
            }
          } else {
            itemTextDiv.textContent = `Unknown(${itemId})`;
          }

          cell.appendChild(itemTextDiv);

          cell.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const passedData = {
              id: itemId,
              quantity: itemQuantity,
            };
            this.showItemContextMenu(e, key, passedData);
          });
        }
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
    container.appendChild(table);
  }

  showItemContextMenu(event, cellKey, itemDataObj) {
    const existingMenu = document.getElementById("inventory-context-menu");
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement("div");
    menu.id = "inventory-context-menu";
    menu.classList.add("inventory-context-menu");
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;

    if (!itemDataObj) {
      const noItemLabel = document.createElement("div");
      noItemLabel.textContent = "No item in this cell.";
      menu.appendChild(noItemLabel);
    } else {
      const { id, quantity } = itemDataObj;
      const itemData = itemsMap[id];

      if (itemData && itemData.slot) {
        const wearOption = document.createElement("div");
        wearOption.textContent = "Wear";
        wearOption.classList.add("menu-option");
        wearOption.addEventListener("click", () => {
          this.scene.playerManager.equipItem(itemData.slot, itemData.id);

          if (quantity > 1) {
            const cellVal = playerBackpack[cellKey];
            if (typeof cellVal === "object") {
              cellVal.quantity -= 1;
              if (cellVal.quantity <= 0) {
                playerBackpack[cellKey] = 0;
              }
            } else {
              playerBackpack[cellKey] = 0;
            }
          } else {
            playerBackpack[cellKey] = 0;
          }
          this.openInventory();
          menu.remove();
        });
        menu.appendChild(wearOption);
      }

      const deleteOption = document.createElement("div");
      deleteOption.textContent = "Delete";
      deleteOption.classList.add("menu-option");
      deleteOption.addEventListener("click", () => {
        deletedItems.push({
          id: id,
          name: itemData ? itemData.name : `Unknown(${id})`,
          deletedAt: new Date().toISOString(),
          reason: "UserDeleted",
        });
        playerBackpack[cellKey] = 0;
        this.openInventory();
        menu.remove();
      });
      menu.appendChild(deleteOption);
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

    // NEW: "Take All" button
    const takeAllButton = document.createElement("button");
    takeAllButton.textContent = "Take All";
    takeAllButton.style.marginBottom = "10px";
    takeAllButton.addEventListener("click", () => {
      // Attempt to take everything in one go
      // We'll go from the end toward the beginning so we can splice safely
      let learnedOrUpgradedSkill = false;

      for (let i = mob.customData.droppedLoot.length - 1; i >= 0; i--) {
        const itemId = mob.customData.droppedLoot[i];
        const skillData = allGameSkills.find((s) => s.id === itemId);

        if (skillData) {
          // It's a skill, so learn/upgrade, do not add to inventory
          const alreadyKnown = playerSkills.find((sk) => sk.id === skillData.id);
          if (!alreadyKnown) {
            // brand new skill
            skillData.level = skillData.level || 1;
            playerSkills.push(skillData);
            this.scene.chatManager.addMessage(`You learned a new skill: ${skillData.name}!`);
          } else {
            // Upgrade existing
            alreadyKnown.level = (alreadyKnown.level || 1) + 1;
            let enh = skillEnhancements[alreadyKnown.name];
            if (!enh) enh = skillEnhancements["default"];

            for (const prop in enh) {
              const pct = enh[prop];
              if (typeof alreadyKnown[prop] === "number") {
                alreadyKnown[prop] *= (1 + pct);
                // clamp if negative
                if ((prop === "castingTime" || prop === "cooldown") && alreadyKnown[prop] < 0) {
                  alreadyKnown[prop] = 0;
                }
              }
            }
            this.scene.chatManager.addMessage(
              `Upgraded skill: ${alreadyKnown.name} to level ${alreadyKnown.level}!`
            );
          }
          mob.customData.droppedLoot.splice(i, 1);
          learnedOrUpgradedSkill = true;
        } else {
          // It's an item
          const success = this.scene.playerManager.addItemToInventory(itemId, 1);
          if (success) {
            mob.customData.droppedLoot.splice(i, 1);
            const itemData = itemsMap[itemId];
            this.scene.chatManager.addMessage(
              `Took "${itemData ? itemData.name : "Unknown"}" (Take All).`
            );
          } else {
            this.scene.chatManager.addMessage(
              `Cannot loot item (ID=${itemId}). Inventory might be full or locked.`
            );
          }
        }
      }

      // If any skill was learned or upgraded, re-setup skill bar
      if (learnedOrUpgradedSkill) {
        this.setupSkills(playerSkills);
        this.scene.inputManager.setupControls(playerSkills);
      }

      this.openLootWindow(mob);
    });
    this.lootContent.appendChild(takeAllButton);

    mob.customData.droppedLoot.forEach((itemId, index) => {
      const itemData = itemsMap[itemId];
      const skillData = allGameSkills.find((s) => s.id === itemId);

      if (itemData) {
        // Regular item
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
        // Skill
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
        const unknownDiv = document.createElement("div");
        unknownDiv.textContent = `Unknown loot ID: ${itemId}`;
        this.lootContent.appendChild(unknownDiv);
      }
    });
  }

  handleLootItem(mob, lootIndex, itemData) {
    // Attempt to add item
    const success = this.scene.playerManager.addItemToInventory(itemData.id, 1);
    if (!success) {
      this.scene.chatManager.addMessage(
        "Your inventory is full or locked. Cannot loot more stuff!"
      );
      return;
    }

    // If success, remove from loot
    mob.customData.droppedLoot.splice(lootIndex, 1);
    this.scene.chatManager.addMessage(
      `Took "${itemData.name}", added to inventory.`
    );

    this.openLootWindow(mob);
  }

  learnSkillFromLoot(mob, lootIndex, skillData) {
    const alreadyKnown = playerSkills.find((sk) => sk.id === skillData.id);
    if (!alreadyKnown) {
      // brand new skill
      skillData.level = skillData.level || 1;
      playerSkills.push(skillData);

      this.scene.chatManager.addMessage(`You learned a new skill: ${skillData.name}!`);
    } else {
      // Upgrade existing skill
      alreadyKnown.level = (alreadyKnown.level || 1) + 1;

      let enh = skillEnhancements[alreadyKnown.name];
      if (!enh) {
        enh = skillEnhancements["default"];
      }

      // Multiply skill stats
      for (const prop in enh) {
        const pct = enh[prop];
        if (typeof alreadyKnown[prop] === "number") {
          alreadyKnown[prop] *= (1 + pct);
          // If castingTime/cooldown => clamp to 0
          if (prop === "castingTime" || prop === "cooldown") {
            if (alreadyKnown[prop] < 0) {
              alreadyKnown[prop] = 0;
            }
          }
        }
      }

      this.scene.chatManager.addMessage(
        `Upgraded skill: ${alreadyKnown.name} to level ${alreadyKnown.level}!`
      );
    }

    mob.customData.droppedLoot.splice(lootIndex, 1);

    // Update skill bar
    this.setupSkills(playerSkills);
    this.scene.inputManager.setupControls(playerSkills);

    // Re-open loot window
    this.openLootWindow(mob);
  }

  // Skill Book
  toggleSkillBook() {
    if (this.skillBook.style.display === "block") {
      this.skillBook.style.display = "none";
      return;
    }

    this.skillBook.style.display = "block";
    this.skillBookContent.innerHTML = `<h3>Skill Book</h3>`;

    playerSkills.forEach((skill) => {
      const skillDiv = document.createElement("div");
      skillDiv.classList.add("skill-entry");

      const title = document.createElement("h4");
      title.textContent = `${skill.name} (Lv. ${skill.level || 1})`;
      skillDiv.appendChild(title);

      const table = document.createElement("table");
      table.classList.add("skill-table");

      const rows = [
        ["Mana Cost", skill.manaCost.toFixed(1)],
        ["Range", skill.range.toFixed(1)],
        ["Magic Attack", skill.magicAttack.toFixed(1)],
        ["Casting Time", skill.castingTime.toFixed(1)],
        ["Cooldown", skill.cooldown.toFixed(1)],
      ];
      rows.forEach(([label, val]) => {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.textContent = label;
        const td2 = document.createElement("td");
        td2.textContent = val;
        tr.appendChild(td1);
        tr.appendChild(td2);
        table.appendChild(tr);
      });

      skillDiv.appendChild(table);
      this.skillBookContent.appendChild(skillDiv);
    });
  }
}
