// File: managers/UIManager.js

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

function makeDraggable(elmnt, dragHandle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  dragHandle.onmousedown = dragMouseDown;
  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
  }
  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

export default class UIManager {
  constructor(scene) {
    this.scene = scene;

    // Basic elements
    this.uiName = document.getElementById("player-name");
    this.uiHealthFill = document.getElementById("health-fill");
    this.uiManaFill = document.getElementById("mana-fill");
    this.uiExpFill = document.getElementById("exp-fill");
    this.uiExpText = document.getElementById("exp-text");
    this.healthText = document.getElementById("health-text");
    this.manaText = document.getElementById("mana-text");
    this.uiLevel = document.getElementById("player-level");

    // Menus
    this.statsMenu = document.getElementById("stats-menu");
    this.statsContent = document.getElementById("stats-content");
    this.closeStatsButton = document.getElementById("close-stats");

    this.inventoryMenu = document.getElementById("inventory-menu");
    this.inventoryContent = document.getElementById("inventory-content");
    this.closeInventoryButton = document.getElementById("close-inventory");

    // Skill Book
    this.skillBook = document.getElementById("skill-book");
    this.closeSkillBookBtn = document.getElementById("skill-book-close-button");
    this.skillBookContent = document.getElementById("skill-book-content");

    // Loot Menu
    this.lootMenu = document.getElementById("loot-menu");
    this.lootCloseButton = document.getElementById("loot-close-button");
    this.lootContent = document.getElementById("loot-content");

    // Casting
    this.castingBar = document.getElementById("casting-bar");
    this.castingProgressContainer = document.getElementById(
      "casting-progress-container"
    );
    this.castingProgressFill = document.getElementById("casting-progress-fill");
    this.castingSkillName = document.getElementById("casting-skill-name");

    // Tooltip Element
    this.tooltipEl = document.createElement("div");
    this.tooltipEl.className = "game-tooltip";
    this.tooltipEl.style.display = "none";
    document.body.appendChild(this.tooltipEl);

    // Create drag headers (if missing)
    if (
      this.inventoryMenu &&
      !this.inventoryMenu.querySelector(".drag-header")
    ) {
      const invHeader = document.createElement("div");
      invHeader.className = "drag-header";
      invHeader.innerText = "Player Info";
      this.inventoryMenu.insertBefore(invHeader, this.inventoryMenu.firstChild);
      makeDraggable(this.inventoryMenu, invHeader);
    }
    if (this.skillBook && !this.skillBook.querySelector(".drag-header")) {
      const header = document.createElement("div");
      header.className = "drag-header";
      header.innerText = "Skill Book";
      this.skillBook.insertBefore(header, this.skillBook.firstChild);
      makeDraggable(this.skillBook, header);
    }
    if (this.lootMenu && !this.lootMenu.querySelector(".drag-header")) {
      const header = document.createElement("div");
      header.className = "drag-header";
      header.innerText = "Loot Window";
      this.lootMenu.insertBefore(header, this.lootMenu.firstChild);
      makeDraggable(this.lootMenu, header);
    }

    // Tooltip follows the mouse
    document.addEventListener("mousemove", (ev) => {
      this.updateTooltipPosition(ev);
    });
  }

  // --------------------
  // TOOLTIP METHODS
  // --------------------
  showTooltip(text) {
    this.tooltipEl.innerText = text;
    this.tooltipEl.style.display = "block";
  }
  hideTooltip() {
    this.tooltipEl.style.display = "none";
  }
  updateTooltipPosition(ev) {
    if (this.tooltipEl.style.display !== "none") {
      const offset = 12;
      this.tooltipEl.style.left = ev.pageX + offset + "px";
      this.tooltipEl.style.top = ev.pageY + offset + "px";
    }
  }

  // Returns a string with item details.
  getItemTooltipText(itemData) {
    if (!itemData) return "";
    let text = `${this.formatItemName(itemData.name)}`;
    if (itemData.type) text += `\nType: ${itemData.type}`;
    if (itemData.slot) text += `\nSlot: ${itemData.slot}`;
    let stats = [];
    if (itemData.health) stats.push(`HP: +${itemData.health}`);
    if (itemData.mana) stats.push(`Mana: +${itemData.mana}`);
    if (itemData.magicAttack) stats.push(`Magic Atk: +${itemData.magicAttack}`);
    if (itemData.meleeAttack) stats.push(`Melee Atk: +${itemData.meleeAttack}`);
    if (itemData.magicDefense) stats.push(`Magic Def: +${itemData.magicDefense}`);
    if (itemData.meleeDefense) stats.push(`Melee Def: +${itemData.meleeDefense}`);
    if (itemData.magicEvasion) stats.push(`Magic Eva: +${itemData.magicEvasion}`);
    if (itemData.meleeEvasion) stats.push(`Melee Eva: +${itemData.meleeEvasion}`);
    if (itemData.speed) stats.push(`Speed: +${itemData.speed}`);
    if (stats.length > 0) text += "\n" + stats.join(", ");
    return text;
  }

  formatItemName(name) {
    let base = name.replace(/\.[^/.]+$/, "");
    let words = base.split(/[_-]+/);
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
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
    if (this.closeSkillBookBtn) {
      this.closeSkillBookBtn.addEventListener("click", () => {
        this.skillBook.style.display = "none";
      });
    }
    if (this.lootCloseButton) {
      this.lootCloseButton.addEventListener("click", () => {
        this.lootMenu.style.display = "none";
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

  updateUI({ name, currentHealth, maxHealth, currentMana, maxMana, level, xp }) {
    const hpVal = Math.round(currentHealth);
    const hpMaxVal = Math.round(maxHealth);
    const mpVal = Math.round(currentMana);
    const mpMaxVal = Math.round(maxMana);

    if (this.uiHealthFill && this.healthText) {
      const hpPct = (hpVal / hpMaxVal) * 100;
      this.uiHealthFill.style.width = `${hpPct}%`;
      this.healthText.innerText = `HP: ${hpVal}/${hpMaxVal} (${hpPct.toFixed(
        0
      )}%)`;
    }
    if (this.uiManaFill && this.manaText) {
      const mpPct = (mpVal / mpMaxVal) * 100;
      this.uiManaFill.style.width = `${mpPct}%`;
      this.manaText.innerText = `Mana: ${mpVal}/${mpMaxVal} (${mpPct.toFixed(
        0
      )}%)`;
    }
    if (this.uiName) this.uiName.innerText = name;
    if (this.uiLevel) this.uiLevel.innerText = `Level: ${level}`;

    // Calculate how close we are to next level for the EXP bar
    let expForNextLevel = 100,
      accumulatedExp = 0,
      tempLevel = 1;
    while (xp >= accumulatedExp + expForNextLevel && tempLevel < 50) {
      accumulatedExp += expForNextLevel;
      tempLevel++;
      expForNextLevel = Math.floor(expForNextLevel * 1.5);
    }
    const currentExp = xp - accumulatedExp;
    const expPct = (currentExp / expForNextLevel) * 100;
    if (this.uiExpFill && this.uiExpText) {
      this.uiExpFill.style.width = `${expPct}%`;
      this.uiExpText.innerText = `EXP: ${currentExp}/${expForNextLevel} (${expPct.toFixed(
        0
      )}%)`;
    }
  }

  // ============================
  // Stats Menu
  // ============================
  showStatsMenu(htmlContent) {
    if (!this.statsMenu) return;
    this.statsContent.innerHTML = htmlContent;
    this.statsMenu.style.display = "block";
  }
  hideStatsMenu() {
    if (!this.statsMenu) return;
    this.statsMenu.style.display = "none";
  }

  // ============================
  // Inventory
  // ============================
  toggleInventory() {
    if (!this.inventoryMenu) return;
    this.inventoryMenu.style.display =
      this.inventoryMenu.style.display === "block" ? "none" : "block";
    if (this.inventoryMenu.style.display === "block") {
      this.openInventory();
    }
  }
  openInventory() {
    if (!this.inventoryMenu) return;
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

  // -----------------------------
  // Equipped Items Block
  // -----------------------------
  renderEquippedItemsBlock(container) {
    const heading = document.createElement("h3");
    heading.innerText = "Equipped Items";
    container.appendChild(heading);

    const eqContainer = document.createElement("div");
    eqContainer.classList.add("equipment-container");
    container.appendChild(eqContainer);

    const slotsData = [
      { slot: "head", label: "HEAD" },
      { slot: "shoulders", label: "SHOULDERS" },
      { slot: "chest", label: "CHEST" },
      { slot: "weapon", label: "WEAPON" },
      { slot: "legs", label: "LEGS" },
      { slot: "feet", label: "FEET" },
    ];

    slotsData.forEach(({ slot, label }) => {
      const slotDiv = document.createElement("div");
      slotDiv.classList.add("equipment-slot");
      const equippedItemId = playerEquippedItems[slot];
      if (equippedItemId) {
        const itemData = itemsMap[equippedItemId];
        if (itemData && itemData.icon) {
          const iconContainer = document.createElement("div");
          iconContainer.className = "icon-container";
          if (
            itemData.iconCol !== undefined &&
            itemData.iconRow !== undefined
          ) {
            const iconDiv = document.createElement("div");
            iconDiv.classList.add("item-icon");
            iconDiv.style.backgroundImage = `url(${itemData.icon})`;
            iconDiv.style.backgroundSize = "320px 320px";
            const posX = -((itemData.iconCol - 1) * 64);
            const posY = -((itemData.iconRow - 1) * 64);
            iconDiv.style.backgroundPosition = `${posX}px ${posY}px`;
            iconContainer.appendChild(iconDiv);
          } else {
            const img = document.createElement("img");
            img.src = itemData.icon;
            img.alt = itemData.name;
            iconContainer.appendChild(img);
          }
          slotDiv.appendChild(iconContainer);
          // Show tooltip on hover
          slotDiv.addEventListener("mouseenter", () => {
            const tipText = this.getItemTooltipText(itemData);
            this.showTooltip(tipText);
          });
          slotDiv.addEventListener("mouseleave", () => {
            this.hideTooltip();
          });
        } else {
          slotDiv.addEventListener("mouseenter", () => {
            this.showTooltip(`Unknown item (ID=${equippedItemId})`);
          });
          slotDiv.addEventListener("mouseleave", () => {
            this.hideTooltip();
          });
        }
        slotDiv.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          this.showEquipmentContextMenu(e, slot, equippedItemId);
        });
      } else {
        slotDiv.addEventListener("mouseenter", () => {
          this.showTooltip(`${label.toUpperCase()} (empty)`);
        });
        slotDiv.addEventListener("mouseleave", () => {
          this.hideTooltip();
        });
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
    heading.innerText = "Final Stats";
    container.appendChild(heading);
    const derivedStats = calculatePlayerStats();
    const statsTable = document.createElement("table");
    statsTable.classList.add("derived-stats-table");
    const rowData = [
      { label: "Health", value: Math.round(derivedStats.health) },
      { label: "Mana", value: Math.round(derivedStats.mana) },
      { label: "Magic Attack", value: Math.round(derivedStats.magicAttack) },
      { label: "Melee Attack", value: Math.round(derivedStats.meleeAttack) },
      { label: "Magic Defense", value: Math.round(derivedStats.magicDefense) },
      { label: "Melee Defense", value: Math.round(derivedStats.meleeDefense) },
      { label: "Magic Evasion", value: Math.round(derivedStats.magicEvasion) },
      { label: "Melee Evasion", value: Math.round(derivedStats.meleeEvasion) },
      { label: "Speed", value: Math.round(derivedStats.speed) },
    ];
    rowData.forEach((stat) => {
      const tr = document.createElement("tr");
      const tdLabel = document.createElement("td");
      tdLabel.innerText = stat.label;
      const tdValue = document.createElement("td");
      tdValue.innerText = stat.value;
      tr.appendChild(tdLabel);
      tr.appendChild(tdValue);
      statsTable.appendChild(tr);
    });
    container.appendChild(statsTable);
  }

  renderInventoryGrid(container) {
    const heading = document.createElement("h3");
    heading.innerText = "Inventory";
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
          cell.innerText = "X";
        } else if (value === 0) {
          cell.classList.add("open-cell");
          cell.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.showItemContextMenu(e, key, null);
          });
        } else {
          let itemId = typeof value === "object" ? value.id : value;
          let itemQuantity = typeof value === "object" ? value.quantity : 1;
          const itemData = itemsMap[itemId];
          cell.classList.add("open-cell");
          if (itemData && itemData.icon) {
            const iconContainer = document.createElement("div");
            iconContainer.className = "icon-container";
            if (
              itemData.iconCol !== undefined &&
              itemData.iconRow !== undefined
            ) {
              const iconDiv = document.createElement("div");
              iconDiv.classList.add("item-icon");
              iconDiv.style.backgroundImage = `url(${itemData.icon})`;
              iconDiv.style.backgroundSize = "320px 320px";
              const posX = -((itemData.iconCol - 1) * 64);
              const posY = -((itemData.iconRow - 1) * 64);
              iconDiv.style.backgroundPosition = `${posX}px ${posY}px`;
              iconContainer.appendChild(iconDiv);
            } else {
              const img = document.createElement("img");
              img.src = itemData.icon;
              img.alt = itemData.name;
              iconContainer.appendChild(img);
            }
            cell.appendChild(iconContainer);
          }
          const nameDiv = document.createElement("div");
          if (itemData) {
            nameDiv.innerText =
              itemQuantity > 1
                ? `${this.formatItemName(itemData.name)} (x${itemQuantity})`
                : this.formatItemName(itemData.name);
            cell.addEventListener("mouseenter", () => {
              const tipText = this.getItemTooltipText(itemData);
              this.showTooltip(tipText);
            });
            cell.addEventListener("mouseleave", () => {
              this.hideTooltip();
            });
          } else {
            nameDiv.innerText = `Unknown(${itemId})`;
            cell.addEventListener("mouseenter", () => {
              this.showTooltip(`Unknown Item (ID=${itemId})`);
            });
            cell.addEventListener("mouseleave", () => {
              this.hideTooltip();
            });
          }
          cell.appendChild(nameDiv);
          cell.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const passedData = { id: itemId, quantity: itemQuantity };
            this.showItemContextMenu(e, key, passedData);
          });
        }
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
    container.appendChild(table);
  }

  // Right-click on inventory item
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
      noItemLabel.innerText = "No item in this cell.";
      menu.appendChild(noItemLabel);
    } else {
      const { id, quantity } = itemDataObj;
      const itemData = itemsMap[id];
      if (itemData && itemData.slot) {
        const wearOption = document.createElement("div");
        wearOption.innerText = "Wear";
        wearOption.classList.add("menu-option");
        wearOption.addEventListener("click", () => {
          this.scene.playerManager.equipItem(itemData.slot, itemData.id);
          if (quantity > 1) {
            const cellVal = playerBackpack[cellKey];
            if (typeof cellVal === "object") {
              cellVal.quantity -= 1;
              if (cellVal.quantity <= 0) playerBackpack[cellKey] = 0;
            } else {
              playerBackpack[cellKey] = 0;
            }
          } else {
            playerBackpack[cellKey] = 0;
          }
          if (this.inventoryMenu.style.display !== "none") {
            this.openInventory();
          }
          menu.remove();
        });
        menu.appendChild(wearOption);
      }
      const deleteOption = document.createElement("div");
      deleteOption.innerText = "Delete";
      deleteOption.classList.add("menu-option");
      deleteOption.addEventListener("click", () => {
        deletedItems.push({
          id: id,
          name: itemData ? itemData.name : `Unknown(${id})`,
          deletedAt: new Date().toISOString(),
          reason: "UserDeleted",
        });
        playerBackpack[cellKey] = 0;
        if (this.inventoryMenu.style.display !== "none") {
          this.openInventory();
        }
        menu.remove();
      });
      menu.appendChild(deleteOption);
    }
    const closeOption = document.createElement("div");
    closeOption.innerText = "Close";
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

  // Right-click on equipped item
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
      noItemLabel.innerText = "Slot is empty.";
      menu.appendChild(noItemLabel);
    } else {
      const unequipOption = document.createElement("div");
      unequipOption.innerText = "UNEQUIP";
      unequipOption.classList.add("menu-option");
      unequipOption.addEventListener("click", () => {
        this.scene.playerManager.unequipItem(slot);
        if (this.inventoryMenu.style.display !== "none") {
          this.openInventory();
        }
        menu.remove();
      });
      menu.appendChild(unequipOption);
    }
    const closeOption = document.createElement("div");
    closeOption.innerText = "Close";
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

  // ============================
  // Skill Book
  // ============================
  updateSkillBook() {
    if (this.skillBook && this.skillBook.style.display !== "none") {
      // Clear previous content and add a header.
      this.skillBookContent.innerHTML =
        "<h3>Skill Book</h3><div class='skill-card-container'></div>";
      const container = this.skillBookContent.querySelector(
        ".skill-card-container"
      );

      for (const skill of playerSkills) {
        // Create the outer card.
        const card = document.createElement("div");
        card.classList.add("skill-card");

        // Card header: contains the icon and the title.
        const header = document.createElement("div");
        header.classList.add("skill-card-header");

        // Skill icon (if available)
        if (skill.icon) {
          const icon = document.createElement("img");
          icon.classList.add("skill-icon");
          icon.src = skill.icon;
          icon.alt = skill.name;
          header.appendChild(icon);
        }

        // Skill title (name and level)
        const title = document.createElement("h4");
        title.innerText = `${skill.name} (Lv. ${skill.level || 1})`;
        header.appendChild(title);
        card.appendChild(header);

        // Card details: show a compact summary of key stats.
        const details = document.createElement("div");
        details.classList.add("skill-card-details");
        const rangeDisplay = skill.range > 0 ? skill.range : "Self";
        details.innerHTML = `
          <p>
            <span><strong>Mana:</strong> ${skill.manaCost.toFixed(1)}</span>
            <span><strong>Range:</strong> ${rangeDisplay}</span>
          </p>
          <p>
            <span><strong>Casting:</strong> ${skill.castingTime.toFixed(1)}</span>
            <span><strong>Cooldown:</strong> ${skill.cooldown.toFixed(1)}</span>
          </p>
        `;
        card.appendChild(details);

        container.appendChild(card);
      }
    }
  }

  toggleSkillBook() {
    if (!this.skillBook) return;
    if (this.skillBook.style.display === "block") {
      this.skillBook.style.display = "none";
    } else {
      this.skillBook.style.display = "block";
      this.updateSkillBook();
    }
  }

  // ============================
  // Casting Progress
  // ============================
  showCastingProgress(skillName, totalTime) {
    if (this.castingProgressContainer) {
      this.castingSkillName.innerText = `Casting: ${skillName}`;
      this.castingProgressFill.style.width = "0%";
      this.castingProgressContainer.style.display = "block";
    }
  }
  updateCastingProgress(elapsedTime, totalTime) {
    if (this.castingProgressFill) {
      const pct = (elapsedTime / totalTime) * 100;
      this.castingProgressFill.style.width = `${pct}%`;
    }
  }
  hideCastingProgress() {
    if (this.castingProgressContainer) {
      this.castingProgressContainer.style.display = "none";
      this.castingProgressFill.style.width = "0%";
      this.castingSkillName.innerText = "";
    }
  }

  setupSkills(skills) {
    if (!this.castingBar) return;
    this.castingBar.innerHTML = "";
    for (const skill of skills) {
      const castingSlot = document.createElement("div");
      castingSlot.classList.add("casting-slot");
      castingSlot.setAttribute("data-skill-id", skill.id);

      // Skill icon
      const img = document.createElement("img");
      img.src = skill.icon;
      img.alt = skill.name;
      castingSlot.appendChild(img);

      // Show skill level label in top-right corner
      const levelLabel = document.createElement("div");
      levelLabel.classList.add("skill-level-label");
      levelLabel.innerText = `L${skill.level || 1}`;
      castingSlot.appendChild(levelLabel);

      // Mana cost in bottom-left
      const manaCost = document.createElement("div");
      manaCost.classList.add("mana-cost");
      manaCost.innerText = (skill.manaCost || 0).toFixed(1);
      castingSlot.appendChild(manaCost);

      // Cooldown overlay
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
    }
  }

  updateSkillCooldown(skillId, cooldownTime) {
    const slot = document.querySelector(
      `.casting-slot[data-skill-id="${skillId}"]`
    );
    if (!slot) return;
    const cooldownOverlay = slot.querySelector(".cooldown-overlay");
    const cooldownTimer = slot.querySelector(".cooldown-timer");
    if (cooldownTime > 0) {
      cooldownOverlay.style.display = "flex";
      cooldownTimer.innerText = cooldownTime.toFixed(1);
      this.startCooldownCountdown(cooldownTime, slot);
    } else {
      cooldownOverlay.style.display = "none";
      cooldownTimer.innerText = "";
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
          cooldownOverlay.style.display = "none";
          cooldownTimer.innerText = "";
          castingSlot.cooldownTimerEvent.remove(false);
        } else {
          cooldownTimer.innerText = remainingTime.toFixed(1);
        }
      },
      loop: true,
    });
  }

  // ============================
  // Loot Window
  // ============================
  openLootWindow(mob) {
    if (!this.lootContent || !this.lootMenu) return;
    this.lootContent.innerHTML = "";
    this.lootMenu.style.display = "block";

    const title = document.createElement("h3");
    title.innerText = `Loot from ${mob.customData.id}`;
    this.lootContent.appendChild(title);

    if (mob.customData.droppedLoot.length === 0) {
      const noLoot = document.createElement("p");
      noLoot.innerText = "No loot.";
      this.lootContent.appendChild(noLoot);
      return;
    }

    const takeAllButton = document.createElement("button");
    takeAllButton.innerText = "Take All";
    takeAllButton.classList.add("loot-button");
    takeAllButton.addEventListener("click", () => {
      let learnedOrUpgradedSkill = false;
      for (let i = mob.customData.droppedLoot.length - 1; i >= 0; i--) {
        const itemId = mob.customData.droppedLoot[i];
        const skillData = allGameSkills.find((s) => s.id === itemId);
        if (skillData) {
          const alreadyKnown = playerSkills.find((sk) => sk.id === skillData.id);
          if (!alreadyKnown) {
            skillData.level = skillData.level || 1;
            playerSkills.push(skillData);
            this.scene.chatManager.addMessage(
              `You learned a new skill: ${skillData.name}!`
            );
          } else {
            // skill already known => level it up
            alreadyKnown.level = (alreadyKnown.level || 1) + 1;
            let enh =
              skillEnhancements[alreadyKnown.name] || skillEnhancements.default;
            for (const prop in enh) {
              const pct = enh[prop];
              if (typeof alreadyKnown[prop] === "number") {
                alreadyKnown[prop] *= 1 + pct;
                if (
                  (prop === "castingTime" || prop === "cooldown") &&
                  alreadyKnown[prop] < 0
                ) {
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
          // normal item loot
          const success = this.scene.playerManager.addItemToInventory(itemId, 1);
          if (success) {
            mob.customData.droppedLoot.splice(i, 1);
            const itemData = itemsMap[itemId];
            this.scene.chatManager.addMessage(
              `Took "${itemData ? itemData.name : "Unknown"}" (Take All).`
            );
          } else {
            this.scene.chatManager.addMessage(
              `Cannot loot item (ID=${itemId}). Inventory might be full.`
            );
          }
        }
      }
      if (learnedOrUpgradedSkill) {
        this.setupSkills(playerSkills);
        this.scene.inputManager.setupControls(playerSkills);
        if (this.skillBook && this.skillBook.style.display !== "none") {
          this.updateSkillBook();
        }
      }
      this.openLootWindow(mob);
    });
    this.lootContent.appendChild(takeAllButton);

    mob.customData.droppedLoot.forEach((itemId, index) => {
      const itemData = itemsMap[itemId];
      const skillData = allGameSkills.find((s) => s.id === itemId);

      if (itemData) {
        // normal item
        const itemDiv = document.createElement("div");
        itemDiv.innerText = itemData.name;
        itemDiv.classList.add("loot-item");
        const takeButton = document.createElement("button");
        takeButton.innerText = "Take Item";
        takeButton.classList.add("loot-button");
        takeButton.addEventListener("click", () => {
          this.handleLootItem(mob, index, itemData);
        });
        itemDiv.appendChild(takeButton);
        this.lootContent.appendChild(itemDiv);

      } else if (skillData) {
        // skill loot
        const skillDiv = document.createElement("div");
        skillDiv.innerText = `${skillData.name} (Skill)`;
        skillDiv.classList.add("loot-item");
        const learnButton = document.createElement("button");
        learnButton.innerText = "Learn Skill";
        learnButton.classList.add("loot-button");
        learnButton.addEventListener("click", () => {
          this.learnSkillFromLoot(mob, index, skillData);
        });
        skillDiv.appendChild(learnButton);
        this.lootContent.appendChild(skillDiv);

      } else {
        // unknown
        const unknownDiv = document.createElement("div");
        unknownDiv.innerText = `Unknown loot ID: ${itemId}`;
        this.lootContent.appendChild(unknownDiv);
      }
    });
  }

  handleLootItem(mob, lootIndex, itemData) {
    const success = this.scene.playerManager.addItemToInventory(itemData.id, 1);
    if (!success) {
      this.scene.chatManager.addMessage(
        "Inventory might be full/locked. Cannot loot!"
      );
      return;
    }
    mob.customData.droppedLoot.splice(lootIndex, 1);
    this.scene.chatManager.addMessage(`Took "${itemData.name}".`);
    if (this.inventoryMenu.style.display !== "none") {
      this.openInventory();
    }
    this.openLootWindow(mob);
  }

  learnSkillFromLoot(mob, lootIndex, skillData) {
    const alreadyKnown = playerSkills.find((sk) => sk.id === skillData.id);
    if (!alreadyKnown) {
      skillData.level = skillData.level || 1;
      playerSkills.push(skillData);
      this.scene.chatManager.addMessage(
        `You learned a new skill: ${skillData.name}!`
      );
    } else {
      alreadyKnown.level = (alreadyKnown.level || 1) + 1;
      let enh = skillEnhancements[alreadyKnown.name] || skillEnhancements.default;
      for (const prop in enh) {
        const pct = enh[prop];
        if (typeof alreadyKnown[prop] === "number") {
          alreadyKnown[prop] *= 1 + pct;
          if (
            (prop === "castingTime" || prop === "cooldown") &&
            alreadyKnown[prop] < 0
          ) {
            alreadyKnown[prop] = 0;
          }
        }
      }
      this.scene.chatManager.addMessage(
        `Upgraded skill: ${alreadyKnown.name} to level ${alreadyKnown.level}!`
      );
    }
    mob.customData.droppedLoot.splice(lootIndex, 1);
    this.setupSkills(playerSkills);
    this.scene.inputManager.setupControls(playerSkills);
    if (this.inventoryMenu.style.display !== "none") {
      this.openInventory();
    }
    if (this.skillBook && this.skillBook.style.display !== "none") {
      this.updateSkillBook();
    }
    this.openLootWindow(mob);
  }

  showLevelUpNotification(newLevel) {
    const notification = document.createElement("div");
    notification.classList.add("level-up-notification");
    notification.innerText = `Level Up! Now Level ${newLevel}!`;
    document.body.appendChild(notification);
    this.scene.time.delayedCall(3000, () => {
      notification.remove();
    });
  }
}
