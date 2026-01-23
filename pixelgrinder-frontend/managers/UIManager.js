// File: managers/UIManager.js

import {
  availableCharacterSkins,
  playerProfile,
  playerBaseStats,
  playerGrowthStats,
  playerBackpack,
  itemsMap,
  deletedItems,
  playerEquippedItems,
  playerSkills,
  allGameSkills,
  mobsData,
  defaultMobsData,
  naturalRegeneration,
  skillEnhancements,
  SKILL_RANGE_EXTENDER,
} from "../data/MOCKdata.js";
import { calculatePlayerStats } from "../helpers/calculatePlayerStats.js";
import { calculateLevelProgress } from "../helpers/experience.js";
import { makeDraggable } from "../helpers/drag.js";
import {
  saveAdminOverrides,
  clearAdminOverrides,
} from "../services/AdminOverrides.js";
import { clearSave } from "../services/SaveService.js";

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
    this.uiGold = document.getElementById("player-gold");
    this.uiMode = document.getElementById("player-mode");

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

    // Shop Menu
    this.shopMenu = document.getElementById("shop-menu");
    this.shopCloseButton = document.getElementById("shop-close-button");
    this.shopContent = document.getElementById("shop-content");
    this.currentVendor = null;

    // Casting bar & progress
    this.castingBar = document.getElementById("casting-bar");
    this.castingProgressContainer = document.getElementById("casting-progress-container");
    this.castingProgressFill = document.getElementById("casting-progress-fill");
    this.castingSkillName = document.getElementById("casting-skill-name");

    // Tooltip
    this.tooltipEl = document.createElement("div");
    this.tooltipEl.className = "game-tooltip";
    this.tooltipEl.style.display = "none";
    document.body.appendChild(this.tooltipEl);

    // Admin panel
    this.adminToggleButton = document.getElementById("admin-toggle-button");
    this.adminPanel = document.getElementById("admin-panel");
    this.adminCloseButton = document.getElementById("admin-close");
    this.adminResetButton = document.getElementById("admin-reset");
    this.adminTabs = document.querySelectorAll(".admin-tab");
    this.adminTabPanels = document.querySelectorAll(".admin-tab-panel");
    this.adminMobList = document.getElementById("admin-mobs-list");
    this.adminMobFields = document.getElementById("admin-mob-fields");
    this.adminMobLoot = document.getElementById("admin-mob-loot");
    this.adminAddLootRow = document.getElementById("admin-add-loot-row");
    this.adminPlayerFields = document.getElementById("admin-player-fields");
    this.adminSkillList = document.getElementById("admin-skills-list");
    this.adminSkillFields = document.getElementById("admin-skill-fields");
    this.adminSelectedMobId = null;
    this.adminSelectedMobInstance = null;
    this.adminSelectedSkillId = null;
    this.adminSaveTimer = null;
    this.adminDebugTimer = null;
    this.adminMobDebug = null;

    // Keep track of up to 9 skill slots
    this.skillBarSlots = new Array(9).fill(null);

    // Make menus draggable if no drag-header found
    if (this.inventoryMenu && !this.inventoryMenu.querySelector(".drag-header")) {
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

    // Tooltip follow mouse
    document.addEventListener("mousemove", (ev) => {
      this.updateTooltipPosition(ev);
    });
  }

  createInGameMenuButtons() {
    const existingMenu = document.getElementById("game-menu-container");
    if (existingMenu) {
      return;
    }
    const menuContainer = document.createElement("div");
    menuContainer.id = "game-menu-container";
    document.body.appendChild(menuContainer);

    const playerInfoBtn = document.createElement("button");
    playerInfoBtn.textContent = "PLAYER INFO";
    playerInfoBtn.classList.add("in-game-menu-button");
    playerInfoBtn.onclick = () => {
      this.scene.toggleInventoryMenu();
    };
    menuContainer.appendChild(playerInfoBtn);

    const skillBookBtn = document.createElement("button");
    skillBookBtn.textContent = "SKILL BOOK";
    skillBookBtn.classList.add("in-game-menu-button");
    skillBookBtn.onclick = () => {
      this.toggleSkillBook();
    };
    menuContainer.appendChild(skillBookBtn);

    const newGameBtn = document.createElement("button");
    newGameBtn.textContent = "NEW GAME";
    newGameBtn.classList.add("in-game-menu-button");
    newGameBtn.onclick = () => {
      const confirmed = window.confirm(
        "Start a new game? Your current save will be deleted."
      );
      if (!confirmed) return;
      clearSave();
      const menuContainer = document.getElementById("game-menu-container");
      if (menuContainer) {
        menuContainer.remove();
      }
      this.scene.scene.start("CharacterCreationScene");
    };
    menuContainer.appendChild(newGameBtn);
  }

  // -----------------------------
  // INIT + EVENT SETUP
  // -----------------------------
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
        this.renderCastingBar(); // hide empty slots now that skillbook is closed
      });
    }
    if (this.lootCloseButton) {
      this.lootCloseButton.addEventListener("click", () => {
        this.lootMenu.style.display = "none";
      });
    }
    if (this.shopCloseButton) {
      this.shopCloseButton.addEventListener("click", () => {
        this.closeShop();
      });
    }
    if (this.scene.events) {
      this.scene.events.on("statsUpdated", this.handleStatsUpdate, this);
    }

    this.initAdminPanel();
  }

  handleStatsUpdate(stats) {
    this.updateUI(stats);
    if (stats.level > (this.previousLevel || 1)) {
      this.showLevelUpNotification(stats.level);
      this.previousLevel = stats.level;
    }
  }

  // -----------------------------
  // TOOLTIP
  // -----------------------------
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

  // -----------------------------
  // MAIN UI UPDATES
  // -----------------------------
  updateUI({ name, currentHealth, maxHealth, currentMana, maxMana, level, xp, gold, gameMode }) {
    const hpVal = Math.round(currentHealth);
    const hpMaxVal = Math.round(maxHealth);
    const mpVal = Math.round(currentMana);
    const mpMaxVal = Math.round(maxMana);

    if (this.uiHealthFill && this.healthText) {
      const hpPct = (hpVal / hpMaxVal) * 100;
      this.uiHealthFill.style.width = `${hpPct}%`;
      this.healthText.innerText = `HP: ${hpVal}/${hpMaxVal} (${hpPct.toFixed(0)}%)`;
    }
    if (this.uiManaFill && this.manaText) {
      const mpPct = (mpVal / mpMaxVal) * 100;
      this.uiManaFill.style.width = `${mpPct}%`;
      this.manaText.innerText = `Mana: ${mpVal}/${mpMaxVal} (${mpPct.toFixed(0)}%)`;
    }
    if (this.uiName) this.uiName.innerText = name;
    if (this.uiLevel) this.uiLevel.innerText = `Level: ${level}`;
    if (this.uiGold) this.uiGold.innerText = `Gold: ${gold ?? 0}`;
    if (this.uiMode) {
      const modeLabel = gameMode ? gameMode.toUpperCase() : "NORMAL";
      this.uiMode.innerText = `Mode: ${modeLabel}`;
    }

    const { currentExp, nextLevelExp } = calculateLevelProgress(xp);
    const expForNextLevel = nextLevelExp;
    const expPct = (currentExp / expForNextLevel) * 100;
    if (this.uiExpFill && this.uiExpText) {
      this.uiExpFill.style.width = `${expPct}%`;
      this.uiExpText.innerText = `EXP: ${currentExp}/${expForNextLevel} (${expPct.toFixed(0)}%)`;
    }
  }

  // -----------------------------
  // SHOP UI
  // -----------------------------
  openShop(vendor) {
    if (!this.shopMenu || !this.shopContent) return;
    this.currentVendor = vendor;
    this.renderShop();
    this.shopMenu.style.display = "block";
  }

  closeShop() {
    if (!this.shopMenu) return;
    this.shopMenu.style.display = "none";
    this.currentVendor = null;
  }

  renderShop() {
    if (!this.currentVendor || !this.shopContent) return;
    const vendor = this.currentVendor;

    this.shopContent.innerHTML = `<h3>${vendor.name}</h3>`;

    const columns = document.createElement("div");
    columns.className = "shop-columns";

    const vendorPanel = document.createElement("div");
    vendorPanel.className = "shop-panel";
    vendorPanel.innerHTML = "<h4>Buy</h4>";

    vendor.inventory.forEach((itemId) => {
      const itemData = itemsMap[itemId];
      if (!itemData) return;
      const price = Math.max(0, itemData.price || 0);

      const row = document.createElement("div");
      row.className = "shop-item";
      row.innerText = `${this.formatItemName(itemData.name)} - ${price}g`;

      const buyBtn = document.createElement("button");
      buyBtn.innerText = "Buy";
      buyBtn.addEventListener("click", () => {
        if (playerProfile.gold < price) {
          this.scene.chatManager.addMessage("Not enough gold.");
          return;
        }
        const success = this.scene.playerManager.addItemToInventory(itemId, 1);
        if (!success) {
          this.scene.chatManager.addMessage("Inventory full.");
          return;
        }
        playerProfile.gold -= price;
        this.scene.emitStatsUpdate();
        if (this.inventoryMenu && this.inventoryMenu.style.display !== "none") {
          this.openInventory();
        }
        this.renderShop();
      });
      row.appendChild(buyBtn);
      vendorPanel.appendChild(row);
    });

    const sellPanel = document.createElement("div");
    sellPanel.className = "shop-panel";
    sellPanel.innerHTML = "<h4>Sell</h4>";

    Object.entries(playerBackpack).forEach(([cellKey, cellVal]) => {
      if (cellVal === null || cellVal === 0) return;
      const itemId = typeof cellVal === "object" ? cellVal.id : cellVal;
      const quantity = typeof cellVal === "object" ? cellVal.quantity : 1;
      const itemData = itemsMap[itemId];
      if (!itemData) return;

      const price = Math.max(1, Math.floor((itemData.price || 0) * 0.5));
      const row = document.createElement("div");
      row.className = "shop-item";
      const label =
        quantity > 1
          ? `${this.formatItemName(itemData.name)} x${quantity} - ${price}g`
          : `${this.formatItemName(itemData.name)} - ${price}g`;
      row.innerText = label;

      const sellBtn = document.createElement("button");
      sellBtn.innerText = "Sell";
      sellBtn.addEventListener("click", () => {
        if (typeof cellVal === "object") {
          cellVal.quantity -= 1;
          if (cellVal.quantity <= 0) {
            playerBackpack[cellKey] = 0;
          }
        } else {
          playerBackpack[cellKey] = 0;
        }
        playerProfile.gold += price;
        this.scene.emitStatsUpdate();
        if (this.inventoryMenu && this.inventoryMenu.style.display !== "none") {
          this.openInventory();
        }
        this.renderShop();
      });
      row.appendChild(sellBtn);
      sellPanel.appendChild(row);
    });

    columns.appendChild(vendorPanel);
    columns.appendChild(sellPanel);
    this.shopContent.appendChild(columns);
  }

  // -----------------------------
  // STATS MENU
  // -----------------------------
  showStatsMenu(htmlContent) {
    if (!this.statsMenu) return;
    this.statsContent.innerHTML = htmlContent;
    this.statsMenu.style.display = "block";
  }
  hideStatsMenu() {
    if (!this.statsMenu) return;
    this.statsMenu.style.display = "none";
  }

  // -----------------------------
  // INVENTORY
  // -----------------------------
  toggleInventory() {
    if (!this.inventoryMenu) return;
    const currentlyVisible = this.inventoryMenu.style.display === "block";
    this.inventoryMenu.style.display = currentlyVisible ? "none" : "block";
    if (!currentlyVisible) {
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
          if (itemData.iconCol !== undefined && itemData.iconRow !== undefined) {
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

            if (itemData.iconCol !== undefined && itemData.iconRow !== undefined) {
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
      // Option: Delete
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

  // -----------------------------
  // SKILL BOOK
  // -----------------------------
  toggleSkillBook() {
    if (!this.skillBook) return;
    if (this.skillBook.style.display === "block") {
      this.skillBook.style.display = "none";
      this.renderCastingBar();
    } else {
      this.skillBook.style.display = "block";
      this.updateSkillBook();
      this.renderCastingBar();
    }
  }

  updateSkillBook() {
    if (!this.skillBook) return;
    this.skillBookContent.innerHTML =
      "<h3>Skill Book</h3><div class='skill-card-container'></div>";
    const container = this.skillBookContent.querySelector(".skill-card-container");

    for (const skill of playerSkills) {
      const card = document.createElement("div");
      card.classList.add("skill-card");
      card.setAttribute("draggable", "true");

      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("sourceType", "skillbook");
        e.dataTransfer.setData("skillId", skill.id);
      });

      const header = document.createElement("div");
      header.classList.add("skill-card-header");
      if (skill.icon) {
        const icon = document.createElement("img");
        icon.classList.add("skill-icon");
        icon.src = skill.icon;
        icon.alt = skill.name;
        header.appendChild(icon);
      }
      const title = document.createElement("h4");
      title.innerText = `${skill.name} (Lv. ${skill.level || 1})`;
      header.appendChild(title);

      card.appendChild(header);

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

  // -----------------------------
  // CASTING BAR
  // -----------------------------
  renderCastingBar() {
    if (!this.castingBar) return;
    this.castingBar.innerHTML = "";

    const skillBookOpen = this.isSkillBookOpen();

    for (let i = 0; i < 9; i++) {
      const assignedSkill = this.skillBarSlots[i];
      if (!skillBookOpen && !assignedSkill) {
        continue;
      }

      const slot = document.createElement("div");
      slot.classList.add("casting-slot");
      slot.setAttribute("data-slot-index", i.toString());

      // If skillbook is open, allow dropping
      if (skillBookOpen) {
        slot.addEventListener("dragover", (e) => {
          e.preventDefault();
        });
        slot.addEventListener("drop", (e) => {
          e.preventDefault();
          this.handleCastingSlotDrop(e, i);
        });
      }

      if (assignedSkill) {
        // If skillbook is open => can drag from slot
        if (skillBookOpen) {
          slot.setAttribute("draggable", "true");
          slot.addEventListener("dragstart", (ev) => {
            ev.dataTransfer.setData("sourceType", "castingSlot");
            ev.dataTransfer.setData("sourceSlot", i.toString());
          });
          slot.addEventListener("dragend", (ev) => {
            if (ev.dataTransfer.dropEffect === "none") {
              this.skillBarSlots[i] = null;
              this.renderCastingBar();
              this.scene.inputManager.setupControls();
            }
          });
        }

        // Icon
        const img = document.createElement("img");
        img.src = assignedSkill.icon;
        img.alt = assignedSkill.name;
        slot.appendChild(img);

        // SHOW KEY (Requirement #4: show which key is assigned)
        const keyLabel = document.createElement("div");
        keyLabel.style.position = "absolute";
        keyLabel.style.top = "2px";
        keyLabel.style.left = "2px";
        keyLabel.style.backgroundColor = "rgba(0,0,0,0.6)";
        keyLabel.style.color = "#fff";
        keyLabel.style.fontSize = "10px";
        keyLabel.style.padding = "1px 3px";
        keyLabel.style.borderRadius = "3px";
        keyLabel.innerText = `Key: ${i + 1}`;
        slot.appendChild(keyLabel);

        // Level label
        const levelLabel = document.createElement("div");
        levelLabel.classList.add("skill-level-label");
        levelLabel.innerText = `L${assignedSkill.level || 1}`;
        slot.appendChild(levelLabel);

        // Mana cost
        const manaCost = document.createElement("div");
        manaCost.classList.add("mana-cost");
        manaCost.innerText = (assignedSkill.manaCost || 0).toFixed(1);
        slot.appendChild(manaCost);

        // Cooldown overlay
        const cooldownOverlay = document.createElement("div");
        cooldownOverlay.classList.add("cooldown-overlay");
        cooldownOverlay.style.display = "none";
        const cooldownTimer = document.createElement("span");
        cooldownTimer.classList.add("cooldown-timer");
        cooldownOverlay.appendChild(cooldownTimer);
        slot.appendChild(cooldownOverlay);

        slot.addEventListener("click", () => {
          this.scene.useSkill(assignedSkill);
        });
      }

      this.castingBar.appendChild(slot);
    }
  }

  handleCastingSlotDrop(e, dropSlotIndex) {
    const sourceType = e.dataTransfer.getData("sourceType");
    if (!sourceType) return;

    if (sourceType === "skillbook") {
      const skillIdStr = e.dataTransfer.getData("skillId");
      if (!skillIdStr) return;
      const skillId = parseInt(skillIdStr);

      const foundSkill = playerSkills.find((s) => s.id === skillId);
      if (!foundSkill) return;

      this.skillBarSlots[dropSlotIndex] = foundSkill;
      this.renderCastingBar();
      this.scene.inputManager.setupControls();

    } else if (sourceType === "castingSlot") {
      const oldSlotStr = e.dataTransfer.getData("sourceSlot");
      if (oldSlotStr === "") return;
      const oldSlotIndex = parseInt(oldSlotStr);
      if (oldSlotIndex === dropSlotIndex) return;

      const skillToMove = this.skillBarSlots[oldSlotIndex];
      this.skillBarSlots[oldSlotIndex] = null;
      this.skillBarSlots[dropSlotIndex] = skillToMove;
      this.renderCastingBar();
      this.scene.inputManager.setupControls();
    }
  }

  isSkillBookOpen() {
    return this.skillBook && this.skillBook.style.display === "block";
  }

  setupSkills(skills) {
    this.skillBarSlots = new Array(9).fill(null);
    for (let i = 0; i < skills.length && i < 9; i++) {
      this.skillBarSlots[i] = skills[i];
    }
    this.renderCastingBar();
  }

  // -----------------------------
  // CASTING PROGRESS
  // -----------------------------
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
  updateSkillCooldown(skillId, cooldownTime) {
    const slotIndex = this.skillBarSlots.findIndex((sk) => sk && sk.id === skillId);
    if (slotIndex < 0) return;

    const slot = this.castingBar.querySelector(
      `.casting-slot[data-slot-index="${slotIndex}"]`
    );
    if (!slot) return;

    const cooldownOverlay = slot.querySelector(".cooldown-overlay");
    const cooldownTimer = slot.querySelector(".cooldown-timer");
    if (cooldownTime > 0) {
      cooldownOverlay.style.display = "flex";
      cooldownTimer.innerText = cooldownTime.toFixed(1);
      this.startCooldownCountdown(cooldownTime, slotIndex);
    } else {
      cooldownOverlay.style.display = "none";
      cooldownTimer.innerText = "";
    }
  }

  startCooldownCountdown(cooldownTime, slotIndex) {
    const slot = this.castingBar.querySelector(
      `.casting-slot[data-slot-index="${slotIndex}"]`
    );
    if (!slot) return;
    const cooldownTimer = slot.querySelector(".cooldown-timer");
    const cooldownOverlay = slot.querySelector(".cooldown-overlay");
    if (!cooldownTimer || !cooldownOverlay) return;

    let remainingTime = cooldownTime;
    if (slot.cooldownTimerEvent) {
      this.scene.time.removeEvent(slot.cooldownTimerEvent);
    }
    slot.cooldownTimerEvent = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        remainingTime -= 0.1;
        if (remainingTime <= 0) {
          cooldownOverlay.style.display = "none";
          cooldownTimer.innerText = "";
          slot.cooldownTimerEvent.remove(false);
        } else {
          cooldownTimer.innerText = remainingTime.toFixed(1);
        }
      },
      loop: true,
    });
  }

  // -----------------------------
  // LOOT WINDOW
  // -----------------------------
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
      let newlyLearnedSkill = null;

      for (let i = mob.customData.droppedLoot.length - 1; i >= 0; i--) {
        const itemId = mob.customData.droppedLoot[i];
        const skillData = allGameSkills.find((s) => s.id === itemId);
        if (skillData) {
          const alreadyKnown = playerSkills.find((sk) => sk.id === skillData.id);
          if (!alreadyKnown) {
            skillData.level = skillData.level || 1;
            playerSkills.push(skillData);
            newlyLearnedSkill = skillData;
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
          mob.customData.droppedLoot.splice(i, 1);
          learnedOrUpgradedSkill = true;
        } else {
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
        if (this.skillBook && this.skillBook.style.display !== "none") {
          this.updateSkillBook();
        }
        if (newlyLearnedSkill) {
          const emptyIndex = this.skillBarSlots.findIndex((slot) => slot === null);
          if (emptyIndex !== -1) {
            this.skillBarSlots[emptyIndex] = newlyLearnedSkill;
            this.renderCastingBar();
          }
        }
        this.scene.inputManager.setupControls();
      }
      if (this.inventoryMenu && this.inventoryMenu.style.display !== "none") {
        this.openInventory();
      }
      this.openLootWindow(mob);
    });
    this.lootContent.appendChild(takeAllButton);

    mob.customData.droppedLoot.forEach((itemId, index) => {
      const itemData = itemsMap[itemId];
      const skillData = allGameSkills.find((s) => s.id === itemId);

      if (itemData) {
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
    let newlyLearned = null;

    if (!alreadyKnown) {
      skillData.level = skillData.level || 1;
      playerSkills.push(skillData);
      newlyLearned = skillData;
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

    if (this.skillBook && this.skillBook.style.display !== "none") {
      this.updateSkillBook();
    }
    if (newlyLearned) {
      const emptyIndex = this.skillBarSlots.findIndex((slot) => slot === null);
      if (emptyIndex !== -1) {
        this.skillBarSlots[emptyIndex] = newlyLearned;
        this.renderCastingBar();
      }
    }
    this.scene.inputManager.setupControls();

    if (this.inventoryMenu.style.display !== "none") {
      this.openInventory();
    }
    this.openLootWindow(mob);
  }

  // -----------------------------
  // ADMIN PANEL
  // -----------------------------
  initAdminPanel() {
    if (!this.adminToggleButton || !this.adminPanel) return;
    this.adminToggleButton.addEventListener("click", () =>
      this.toggleAdminPanel()
    );
    const adminHeader = this.adminPanel.querySelector(".admin-panel-header");
    if (adminHeader) {
      makeDraggable(this.adminPanel, adminHeader);
    }
    if (this.adminCloseButton) {
      this.adminCloseButton.addEventListener("click", () =>
        this.hideAdminPanel()
      );
    }
    if (this.adminResetButton) {
      this.adminResetButton.addEventListener("click", () => {
        this.hardResetAdminOverrides();
      });
    }
    this.adminTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        this.switchAdminTab(tab.dataset.tab);
      });
    });
    this.renderAdminPanel();
  }

  toggleAdminPanel() {
    if (!this.adminPanel) return;
    const isOpen = this.adminPanel.style.display === "block";
    if (isOpen) {
      this.hideAdminPanel();
    } else {
      this.adminPanel.style.display = "block";
      this.isAdminOpen = true;
      this.renderAdminPanel();
      this.startAdminDebugUpdates();
    }
  }

  hideAdminPanel() {
    if (!this.adminPanel) return;
    this.adminPanel.style.display = "none";
    this.isAdminOpen = false;
    this.stopAdminDebugUpdates();
  }

  selectAdminMob(mobId, mobInstance = null) {
    if (!mobId || !mobsData[mobId]) return;
    this.adminSelectedMobId = mobId;
    this.adminSelectedMobInstance = mobInstance || this.findAdminMobInstance(mobId);
    this.renderAdminMobsList();
    this.renderAdminMobDetails(mobId);
  }

  hardResetAdminOverrides() {
    clearAdminOverrides();
    clearSave();
    if (defaultMobsData && typeof defaultMobsData === "object") {
      Object.keys(mobsData).forEach((key) => delete mobsData[key]);
      Object.keys(defaultMobsData).forEach((key) => {
        mobsData[key] = JSON.parse(JSON.stringify(defaultMobsData[key]));
        this.scene.mobManager?.applyMobTypeChanges(key);
      });
      this.renderAdminPanel();
    }
    const url = new URL(window.location.href);
    url.searchParams.set("reset", Date.now().toString());
    window.location.href = url.toString();
  }

  switchAdminTab(tabId) {
    if (!tabId) return;
    this.adminTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabId);
    });
    this.adminTabPanels.forEach((panel) => {
      panel.classList.toggle(
        "active",
        panel.id === `admin-tab-${tabId}`
      );
    });
  }

  renderAdminPanel() {
    this.renderAdminMobsList();
    this.renderAdminPlayerPanel();
    this.renderAdminSkillsList();
  }

  renderAdminMobsList() {
    if (!this.adminMobList) return;
    const mobIds = Object.keys(mobsData);
    this.adminMobList.innerHTML = "";
    if (!this.adminSelectedMobId || !mobsData[this.adminSelectedMobId]) {
      this.adminSelectedMobId = mobIds[0] || null;
    }
    mobIds.forEach((mobId) => {
      const mobInfo = mobsData[mobId];
      const item = document.createElement("div");
      item.className = "admin-list-item";
      item.classList.toggle("active", mobId === this.adminSelectedMobId);

      const thumb = this.createMobThumbnail(mobId, mobInfo);
      const label = document.createElement("div");
      label.innerText = mobInfo.name ? `${mobInfo.name} (${mobId})` : mobId;

      item.appendChild(thumb);
      item.appendChild(label);
      item.addEventListener("click", () => {
        this.adminSelectedMobId = mobId;
        this.adminSelectedMobInstance = this.findAdminMobInstance(mobId);
        this.renderAdminMobsList();
        this.renderAdminMobDetails(mobId);
      });
      this.adminMobList.appendChild(item);
    });
    if (this.adminSelectedMobId) {
      this.renderAdminMobDetails(this.adminSelectedMobId);
    }
  }

  renderAdminMobDetails(mobId) {
    if (!this.adminMobFields || !mobId) return;
    const mobInfo = mobsData[mobId];
    if (!mobInfo) return;
    if (typeof mobInfo.scale !== "number") {
      mobInfo.scale = 1;
    }
    const fieldMeta = {
      level: { unit: "lvl", help: "Mob level used for EXP scaling." },
      attackRange: { unit: "px", help: "Distance required to attack." },
      health: { unit: "hp", help: "Max health for this mob." },
      mana: { unit: "mp", help: "Max mana for this mob." },
      magicAttack: { help: "Base magic attack power." },
      meleeAttack: { help: "Base melee attack power." },
      magicDefense: { help: "Reduces incoming magic damage." },
      meleeDefense: { help: "Reduces incoming melee damage." },
      magicEvasion: { unit: "%", help: "Chance to evade magic attacks." },
      meleeEvasion: { unit: "%", help: "Chance to evade melee attacks." },
      mobType: { help: "friend = passive, enemy = aggressive." },
      mobAgroRange: { unit: "px", help: "Range to acquire/refresh aggro." },
      attackCooldown: { unit: "ms", help: "Delay between basic attacks." },
      speed: { unit: "px/s", help: "Movement speed." },
      expReward: { unit: "xp", help: "Base EXP awarded on kill." },
      healingSkillHPThreshold: {
        unit: "ratio",
        help: "Heal when HP drops below this fraction (0-1).",
      },
      behaviorProfile: { help: "AI style: melee/caster/skirmisher." },
      preferredRange: { unit: "px", help: "Preferred combat distance." },
      leashRadius: { unit: "px", help: "Max distance from spawn before leashing." },
      aggroDuration: { unit: "ms", help: "How long to remember aggro." },
      strafeChance: { unit: "ratio", help: "Chance to strafe when fighting." },
      fleeHpPct: { unit: "ratio", help: "HP fraction to begin fleeing." },
      scale: { unit: "x", help: "Sprite scale multiplier." },
    };
    this.adminMobFields.innerHTML = "";
    const { section: propsSection, body: propsBody } =
      this.createAccordionSection("Mob Properties");
    const fieldsGrid = document.createElement("div");
    fieldsGrid.className = "admin-fields";
    propsBody.appendChild(fieldsGrid);

    Object.keys(mobInfo).forEach((key) => {
      if (key === "lootTable" || key === "skillIds") return;
      const value = mobInfo[key];
      const meta = fieldMeta[key] || {};
      const options =
        key === "mobType"
          ? [
              { value: "friend", label: "friend" },
              { value: "enemy", label: "enemy" },
            ]
          : null;
      const field = this.createAdminField({
        label: key,
        value: Array.isArray(value) ? value.join(", ") : value,
        valueType: Array.isArray(value) ? "array" : typeof value,
        options,
        labelSuffix: meta.unit,
        helpText: meta.help,
        onChange: (nextValue) => {
          if (Array.isArray(value)) {
            mobInfo[key] = nextValue;
          } else if (typeof value === "number") {
            mobInfo[key] = Number.isFinite(nextValue) ? nextValue : value;
          } else {
            mobInfo[key] = nextValue;
          }
          this.scene.mobManager?.applyMobTypeChanges(mobId);
          this.scheduleAdminOverridesSave();
        },
      });
      fieldsGrid.appendChild(field);
    });
    this.adminMobFields.appendChild(propsSection);

    const { section: skillsSection, body: skillsBody } =
      this.createAccordionSection("Skills", true);
    this.adminMobFields.appendChild(skillsSection);
    this.renderAdminMobSkills(mobId, skillsBody);

    const { section: debugSection, body: debugBody } =
      this.createAccordionSection("Debug", true);
    this.adminMobFields.appendChild(debugSection);
    this.renderAdminMobDebug(mobId, debugBody);

    const { section: lootSection, body: lootBody } =
      this.createAccordionSection("Loot Table", true);
    if (this.adminMobLoot && this.adminAddLootRow) {
      lootBody.appendChild(this.adminMobLoot);
      lootBody.appendChild(this.adminAddLootRow);
    }
    this.adminMobFields.appendChild(lootSection);

    this.renderAdminMobLoot(mobId);
  }

  renderAdminMobSkills(mobId, container) {
    if (!mobId || !container) return;
    const mobInfo = mobsData[mobId];
    if (!mobInfo) return;
    if (!Array.isArray(mobInfo.skillIds)) {
      mobInfo.skillIds = [];
    }

    container.innerHTML = "";
    const list = document.createElement("div");
    list.className = "admin-skill-list";

    const skills = [...allGameSkills].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
    skills.forEach((skill) => {
      const label = document.createElement("label");
      label.className = "admin-skill-option";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = mobInfo.skillIds.includes(skill.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          if (!mobInfo.skillIds.includes(skill.id)) {
            mobInfo.skillIds.push(skill.id);
          }
        } else {
          mobInfo.skillIds = mobInfo.skillIds.filter((id) => id !== skill.id);
        }
        this.scene.mobManager?.applyMobTypeChanges(mobId);
        this.scheduleAdminOverridesSave();
      });

      const text = document.createElement("span");
      text.innerText = `${skill.name} (${skill.id})`;

      label.appendChild(checkbox);
      label.appendChild(text);
      list.appendChild(label);
    });

    container.appendChild(list);
  }

  renderAdminMobDebug(mobId, container) {
    if (!container) return;
    container.innerHTML = "";
    const pre = document.createElement("pre");
    pre.className = "admin-debug-text";
    pre.innerText = "Select a mob instance to see debug info.";
    container.appendChild(pre);
    this.adminMobDebug = pre;
    this.updateAdminMobDebug(mobId);
  }

  startAdminDebugUpdates() {
    if (this.adminDebugTimer) return;
    this.adminDebugTimer = setInterval(() => {
      if (!this.isAdminOpen) return;
      this.updateAdminMobDebug(this.adminSelectedMobId);
    }, 250);
  }

  stopAdminDebugUpdates() {
    if (this.adminDebugTimer) {
      clearInterval(this.adminDebugTimer);
      this.adminDebugTimer = null;
    }
  }

  findAdminMobInstance(mobId) {
    const mobs = this.scene.mobManager?.mobs?.getChildren?.() || [];
    const alive = mobs.find((mob) => mob.customData?.id === mobId && !mob.customData.isDead);
    return alive || mobs.find((mob) => mob.customData?.id === mobId) || null;
  }

  updateAdminMobDebug(mobId) {
    if (!this.adminMobDebug) return;
    const mob = this.adminSelectedMobInstance || this.findAdminMobInstance(mobId);
    if (!mob || !mob.customData) {
      this.adminMobDebug.innerText = "No mob instance found.";
      return;
    }

    const mobInfo = mobsData[mob.customData.id] || {};
    const player = this.scene.playerManager?.player;
    const distanceToPlayer = player
      ? Phaser.Math.Distance.Between(mob.x, mob.y, player.x, player.y)
      : null;
    const distanceToSpawn = mob.customData.spawnX !== undefined
      ? Phaser.Math.Distance.Between(
          mob.x,
          mob.y,
          mob.customData.spawnX,
          mob.customData.spawnY
        )
      : null;
    const velocity = mob.body?.velocity || { x: 0, y: 0 };
    const speedSq = (velocity.x || 0) * (velocity.x || 0) + (velocity.y || 0) * (velocity.y || 0);
    const attackRange = Number.isFinite(mobInfo.attackRange) ? mobInfo.attackRange : null;
    const aggroRange = Number.isFinite(mobInfo.mobAgroRange) ? mobInfo.mobAgroRange : null;
    const inAttackRange =
      distanceToPlayer !== null && attackRange !== null
        ? distanceToPlayer <= attackRange
        : null;
    const inAggroRange =
      distanceToPlayer !== null && aggroRange !== null
        ? distanceToPlayer <= aggroRange
        : null;
    const leashRadius = Number.isFinite(mobInfo.leashRadius) ? mobInfo.leashRadius : null;
    const leashExceeded =
      distanceToSpawn !== null && leashRadius !== null
        ? distanceToSpawn > leashRadius
        : null;
    const castRemaining =
      mob.customData.castDuration > 0
        ? Math.max(
            0,
            (mob.customData.castStartTime + mob.customData.castDuration - this.scene.time.now) / 1000
          )
        : 0;
    const lastAttackAge = mob.customData.lastAttackTime
      ? Math.max(0, this.scene.time.now - mob.customData.lastAttackTime)
      : null;

    this.adminMobDebug.innerText = [
      `id: ${mob.customData.id}`,
      `state: ${mob.customData.state}`,
      `type: ${mob.customData.currentType}`,
      `pos: ${Math.round(mob.x)}, ${Math.round(mob.y)}`,
      `velocity: ${Math.round(velocity.x || 0)}, ${Math.round(velocity.y || 0)} (spd^2=${Math.round(speedSq)})`,
      `hp: ${Math.round(mob.customData.hp)} / ${mobInfo.health ?? "?"}`,
      `mana: ${Math.round(mob.customData.mana)} / ${mobInfo.mana ?? 0}`,
      `casting: ${mob.customData.isCastingSkill ? "yes" : "no"}`,
      `cast_remaining: ${castRemaining.toFixed(2)}s`,
      `last_dir: ${mob.customData.lastDirection || "?"}`,
      `aggro_age: ${mob.customData.lastAggroTime ? (this.scene.time.now - mob.customData.lastAggroTime) + "ms" : "none"}`,
      `last_seen: ${
        mob.customData.lastSeenPosition
          ? `${Math.round(mob.customData.lastSeenPosition.x)}, ${Math.round(mob.customData.lastSeenPosition.y)}`
          : "none"
      }`,
      `dist_to_player: ${distanceToPlayer !== null ? distanceToPlayer.toFixed(1) : "n/a"}`,
      `in_aggro_range: ${inAggroRange === null ? "n/a" : inAggroRange ? "yes" : "no"}`,
      `in_attack_range: ${inAttackRange === null ? "n/a" : inAttackRange ? "yes" : "no"}`,
      `dist_to_spawn: ${distanceToSpawn !== null ? distanceToSpawn.toFixed(1) : "n/a"}`,
      `leash_exceeded: ${leashExceeded === null ? "n/a" : leashExceeded ? "yes" : "no"}`,
      `attack_range: ${attackRange ?? "n/a"}`,
      `aggro_range: ${aggroRange ?? "n/a"}`,
      `preferred_range: ${mobInfo.preferredRange ?? "n/a"}`,
      `flee_hp_pct: ${mobInfo.fleeHpPct ?? "n/a"}`,
      `healing_threshold: ${mob.customData.healingThreshold ?? "n/a"}`,
      `attack_cooldown: ${mobInfo.attackCooldown ?? "n/a"}ms`,
      `last_attack_age: ${lastAttackAge !== null ? `${lastAttackAge}ms` : "none"}`,
      `speed: ${mobInfo.speed ?? "n/a"}`,
      `path: ${mob.customData.path ? `${mob.customData.pathIndex}/${mob.customData.path.length}` : "none"}`,
      `waiting_for_path: ${mob.customData.waitingForPath ? "yes" : "no"}`,
      `leash_radius: ${leashRadius ?? "n/a"}`,
      `aggro_duration: ${mobInfo.aggroDuration ?? "n/a"}`,
      `behavior: ${mobInfo.behaviorProfile || "?"}`,
      `unsticking: ${mob.customData.isUnsticking ? "yes" : "no"}`,
    ].join("\n");
  }

  renderAdminMobLoot(mobId) {
    if (!this.adminMobLoot || !this.adminAddLootRow) return;
    const mobInfo = mobsData[mobId];
    if (!mobInfo) return;
    if (!Array.isArray(mobInfo.lootTable)) {
      mobInfo.lootTable = [];
    }

    this.adminMobLoot.innerHTML = "";
    const table = document.createElement("table");
    table.className = "admin-loot-table";
    const header = document.createElement("tr");
    ["Item", "Chance", ""].forEach((label) => {
      const th = document.createElement("th");
      th.innerText = label;
      header.appendChild(th);
    });
    table.appendChild(header);

    mobInfo.lootTable.forEach((entry, index) => {
      const row = document.createElement("tr");

      const itemCell = document.createElement("td");
      const itemSelect = document.createElement("select");
      const itemIds = Object.keys(itemsMap)
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
        .sort((a, b) => a - b);
      itemIds.forEach((id) => {
        const option = document.createElement("option");
        const item = itemsMap[id];
        option.value = id;
        option.textContent = item ? `${id} - ${item.name}` : `${id}`;
        itemSelect.appendChild(option);
      });
      itemSelect.value = entry.itemId ?? "";
      itemSelect.addEventListener("change", (event) => {
        entry.itemId = Number(event.target.value);
        this.scene.mobManager?.applyMobTypeChanges(mobId);
        this.scheduleAdminOverridesSave();
      });
      itemCell.appendChild(itemSelect);

      const chanceCell = document.createElement("td");
      const chanceInput = document.createElement("input");
      chanceInput.type = "number";
      chanceInput.step = "0.1";
      chanceInput.value = entry.chance ?? 0;
      chanceInput.addEventListener("change", (event) => {
        entry.chance = Number(event.target.value) || 0;
        this.scene.mobManager?.applyMobTypeChanges(mobId);
        this.scheduleAdminOverridesSave();
      });
      chanceCell.appendChild(chanceInput);

      const removeCell = document.createElement("td");
      const removeButton = document.createElement("button");
      removeButton.className = "admin-btn";
      removeButton.innerText = "Remove";
      removeButton.addEventListener("click", () => {
        mobInfo.lootTable.splice(index, 1);
        this.scene.mobManager?.applyMobTypeChanges(mobId);
        this.renderAdminMobLoot(mobId);
        this.scheduleAdminOverridesSave();
      });
      removeCell.appendChild(removeButton);

      row.appendChild(itemCell);
      row.appendChild(chanceCell);
      row.appendChild(removeCell);
      table.appendChild(row);
    });

    this.adminMobLoot.appendChild(table);
    this.adminAddLootRow.onclick = () => {
      mobInfo.lootTable.push({ itemId: 0, chance: 0 });
      this.scene.mobManager?.applyMobTypeChanges(mobId);
      this.renderAdminMobLoot(mobId);
      this.scheduleAdminOverridesSave();
    };
  }

  renderAdminPlayerPanel() {
    if (!this.adminPlayerFields) return;
    this.adminPlayerFields.innerHTML = "";
    const profileMeta = {
      level: { unit: "lvl", help: "Player level." },
      totalExp: { unit: "xp", help: "Total accumulated experience." },
      gold: { unit: "gp", help: "Player gold." },
      gameMode: { help: "normal = respawn, hardcore = permadeath." },
    };
    const baseMeta = {
      health: { unit: "hp", help: "Base health pool." },
      mana: { unit: "mp", help: "Base mana pool." },
      intellect: { help: "Primary stat for magic damage/defense." },
      strength: { help: "Primary stat for melee damage/defense." },
      dexterity: { help: "Primary stat for evasion/accuracy." },
      constitution: { help: "Primary stat for survivability." },
      speed: { unit: "px/s", help: "Base movement speed." },
      gatherSpeed: { unit: "x", help: "Gather speed multiplier." },
    };
    const growthMeta = {
      health: { unit: "hp/lvl", help: "Health gained per level." },
      mana: { unit: "mp/lvl", help: "Mana gained per level." },
      intellect: { unit: "/lvl", help: "Intellect gained per level." },
      strength: { unit: "/lvl", help: "Strength gained per level." },
      dexterity: { unit: "/lvl", help: "Dexterity gained per level." },
      constitution: { unit: "/lvl", help: "Constitution gained per level." },
      speed: { unit: "px/s/lvl", help: "Speed gained per level." },
    };
    const regenMeta = {
      manaRegen: { unit: "mp/tick", help: "Mana regen per tick." },
      hpRegen: { unit: "hp/tick", help: "Health regen per tick." },
      regenerationTime: { unit: "ms", help: "Time between regen ticks." },
    };

    const profileSection = this.createAccordionSection("Profile", true);
    this.renderAdminObjectSection(
      "Profile",
      playerProfile,
      (key, nextValue) => {
        if (key === "level") {
          const oldLevel = playerProfile.level;
          const safeLevel = Math.max(1, Math.floor(Number(nextValue) || 1));
          this.applyLevelChange(oldLevel, safeLevel);
          playerProfile.level = safeLevel;
          this.scene.playerManager.updatePlayerStats();
          this.scene.updateUI();
          this.scene.emitStatsUpdate();
          this.renderAdminPlayerPanel();
          this.scheduleAdminOverridesSave();
          return;
        }
        playerProfile[key] = nextValue;
        if (key === "selectedSkin" && nextValue) {
          this.scene.playerManager.selectedSkinKey = nextValue;
        }
        this.scene.updateUI();
        this.scene.emitStatsUpdate();
        this.scheduleAdminOverridesSave();
      },
      profileSection.body,
      profileMeta
    );
    this.adminPlayerFields.appendChild(profileSection.section);

    const baseSection = this.createAccordionSection("Base Stats", true);
    this.renderAdminObjectSection(
      "Base Stats",
      playerBaseStats,
      (key, nextValue) => {
        playerBaseStats[key] = nextValue;
        this.scene.playerManager.updatePlayerStats();
        this.scene.updateUI();
        this.scene.emitStatsUpdate();
        this.scheduleAdminOverridesSave();
      },
      baseSection.body,
      baseMeta
    );
    this.adminPlayerFields.appendChild(baseSection.section);

    const growthSection = this.createAccordionSection("Growth Stats", false);
    this.renderAdminObjectSection(
      "Growth Stats",
      playerGrowthStats,
      (key, nextValue) => {
        playerGrowthStats[key] = nextValue;
        this.scene.playerManager.updatePlayerStats();
        this.scene.updateUI();
        this.scene.emitStatsUpdate();
        this.scheduleAdminOverridesSave();
      },
      growthSection.body,
      growthMeta
    );
    this.adminPlayerFields.appendChild(growthSection.section);

    const regenSection = this.createAccordionSection("Regeneration", false);
    this.renderAdminObjectSection(
      "Regeneration",
      naturalRegeneration,
      (key, nextValue) => {
        naturalRegeneration[key] = nextValue;
        this.scheduleAdminOverridesSave();
      },
      regenSection.body,
      regenMeta
    );
    this.adminPlayerFields.appendChild(regenSection.section);

    const stateSection = this.createAccordionSection("Current State", false);
    this.renderAdminPlayerStateSection(stateSection.body);
    this.adminPlayerFields.appendChild(stateSection.section);

    const equippedSection = this.createAccordionSection("Equipped Items", false);
    this.renderAdminEquippedItemsSection(equippedSection.body);
    this.adminPlayerFields.appendChild(equippedSection.section);
  }

  renderAdminPlayerStateSection(container) {
    const currentHealthField = this.createAdminField({
      label: "currentHealth",
      value: this.scene.playerManager.currentHealth,
      valueType: "number",
      onChange: (nextValue) => {
        this.scene.playerManager.currentHealth = Number.isFinite(nextValue)
          ? nextValue
          : this.scene.playerManager.currentHealth;
        this.scene.updateUI();
        this.scene.emitStatsUpdate();
      },
    });
    const currentManaField = this.createAdminField({
      label: "currentMana",
      value: this.scene.playerManager.currentMana,
      valueType: "number",
      onChange: (nextValue) => {
        this.scene.playerManager.currentMana = Number.isFinite(nextValue)
          ? nextValue
          : this.scene.playerManager.currentMana;
        this.scene.updateUI();
        this.scene.emitStatsUpdate();
      },
    });
    container.appendChild(currentHealthField);
    container.appendChild(currentManaField);
  }

  renderAdminEquippedItemsSection(container) {
    Object.keys(playerEquippedItems).forEach((slot) => {
      const options = this.getItemOptionsForSlot(slot);
      const field = this.createAdminField({
        label: slot,
        value: playerEquippedItems[slot] ?? "",
        valueType: "select",
        options,
        onChange: (nextValue) => {
          playerEquippedItems[slot] = nextValue ? Number(nextValue) : null;
          this.scene.playerManager.updatePlayerStats();
          this.scene.updateUI();
          this.scene.emitStatsUpdate();
          this.scheduleAdminOverridesSave();
        },
      });
      container.appendChild(field);
    });
  }

  renderAdminSkillsList() {
    if (!this.adminSkillList) return;
    this.adminSkillList.innerHTML = "";
    const skillIds = allGameSkills.map((skill) => skill.id);
    if (
      !this.adminSelectedSkillId ||
      !allGameSkills.find((skill) => skill.id === this.adminSelectedSkillId)
    ) {
      this.adminSelectedSkillId = skillIds[0] || null;
    }
    allGameSkills.forEach((skill) => {
      const item = document.createElement("div");
      item.className = "admin-list-item";
      item.classList.toggle("active", skill.id === this.adminSelectedSkillId);

      const thumb = document.createElement("div");
      thumb.className = "admin-thumb";
      thumb.innerText = skill.name?.slice(0, 2) || "SK";

      const label = document.createElement("div");
      label.innerText = skill.name || `Skill ${skill.id}`;

      item.appendChild(thumb);
      item.appendChild(label);
      item.addEventListener("click", () => {
        this.adminSelectedSkillId = skill.id;
        this.renderAdminSkillsList();
        this.renderAdminSkillDetails(skill.id);
      });
      this.adminSkillList.appendChild(item);
    });
    if (this.adminSelectedSkillId) {
      this.renderAdminSkillDetails(this.adminSelectedSkillId);
    }
  }

  renderAdminSkillDetails(skillId) {
    if (!this.adminSkillFields) return;
    const skill = allGameSkills.find((sk) => sk.id === skillId);
    if (!skill) return;
    const skillMeta = {
      manaCost: { unit: "mp", help: "Mana cost per cast." },
      range: { unit: "px", help: "Max cast range." },
      magicAttack: { help: "Magic damage added by the skill." },
      meleeAttack: { help: "Melee damage added by the skill." },
      castingTime: { unit: "s", help: "Cast time before effect." },
      cooldown: { unit: "s", help: "Cooldown after cast." },
      level: { unit: "lvl", help: "Skill level." },
      healHP: { unit: "hp", help: "Health restored by the skill." },
      healMP: { unit: "mp", help: "Mana restored by the skill." },
    };
    this.adminSkillFields.innerHTML = "";
    const { section, body } = this.createAccordionSection("Skill Properties");
    const fieldsGrid = document.createElement("div");
    fieldsGrid.className = "admin-fields";
    body.appendChild(fieldsGrid);
    Object.keys(skill).forEach((key) => {
      const value = skill[key];
      const isArray = Array.isArray(value);
      const meta = skillMeta[key] || {};
      const field = this.createAdminField({
        label: key,
        value: isArray ? value.join(", ") : value,
        valueType: isArray ? "array" : typeof value,
        disabled: key === "id",
        labelSuffix: meta.unit,
        helpText: meta.help,
        onChange: (nextValue) => {
          if (isArray) {
            skill[key] = nextValue;
          } else if (typeof value === "number") {
            skill[key] = Number.isFinite(nextValue) ? nextValue : value;
          } else {
            skill[key] = nextValue;
          }
          this.syncPlayerSkillsWithGameSkills();
          this.scene.mobManager?.refreshMobSkillsFromLoot();
          this.setupSkills(playerSkills);
          this.scheduleAdminOverridesSave();
        },
      });
      fieldsGrid.appendChild(field);
    });
    this.adminSkillFields.appendChild(section);
  }

  syncPlayerSkillsWithGameSkills() {
    playerSkills.forEach((playerSkill) => {
      const skill = allGameSkills.find((sk) => sk.id === playerSkill.id);
      if (!skill) return;
      Object.assign(playerSkill, { ...skill });
    });
  }

  renderAdminObjectSection(title, obj, onFieldChange, container, fieldMeta = {}) {
    const target = container || this.adminPlayerFields;
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const valueType = Array.isArray(value) ? "array" : typeof value;
      const meta = fieldMeta[key] || {};
      const options =
        key === "selectedSkin"
          ? availableCharacterSkins.map((skin) => ({
              value: skin.key,
              label: skin.displayName,
            }))
          : key === "gameMode"
            ? [
                { value: "normal", label: "Normal" },
                { value: "hardcore", label: "Hardcore" },
              ]
          : null;
      const field = this.createAdminField({
        label: key,
        value: value,
        valueType,
        options,
        labelSuffix: meta.unit,
        helpText: meta.help,
        onChange: (nextValue) => {
          if (valueType === "number" && !Number.isFinite(nextValue)) {
            return;
          }
          onFieldChange(key, nextValue);
        },
      });
      target.appendChild(field);
    });
  }

  createAccordionSection(title, startOpen = true) {
    const section = document.createElement("div");
    section.className = "admin-accordion";
    if (!startOpen) {
      section.classList.add("collapsed");
    }

    const header = document.createElement("div");
    header.className = "admin-accordion-header";

    const titleEl = document.createElement("span");
    titleEl.innerText = title;
    header.appendChild(titleEl);

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "admin-copy-btn";
    copyButton.innerText = "Copy";
    copyButton.addEventListener("click", (event) => {
      event.stopPropagation();
      this.copyAdminSection(title, body);
    });
    header.appendChild(copyButton);

    header.addEventListener("click", (event) => {
      if (event.target.closest(".admin-copy-btn")) {
        return;
      }
      section.classList.toggle("collapsed");
    });

    const body = document.createElement("div");
    body.className = "admin-accordion-body";

    section.appendChild(header);
    section.appendChild(body);

    return { section, body };
  }

  copyAdminSection(title, body) {
    if (!body) return;
    const text = this.buildAdminSectionCopy(title, body);
    if (!text) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  buildAdminSectionCopy(title, body) {
    const lines = [];
    if (title) {
      lines.push(title);
    }
    const fields = Array.from(body.querySelectorAll(".admin-field"));
    if (fields.length > 0) {
      fields.forEach((field) => {
        const labelEl = field.querySelector("label");
        const inputEl = field.querySelector("input, select, textarea");
        const rawLabel = labelEl ? labelEl.textContent : "field";
        const label = rawLabel.replace(/\s*\?\s*$/, "");
        let value = "";
        if (inputEl) {
          if (inputEl.tagName === "SELECT") {
            value = inputEl.value;
          } else if (inputEl.type === "checkbox") {
            value = inputEl.checked ? "true" : "false";
          } else {
            value = inputEl.value;
          }
        } else {
          value = field.textContent || "";
        }
        lines.push(`${label}: ${value}`.trim());
      });
      return lines.join("\n").trim();
    }

    const pre = body.querySelector("pre");
    if (pre) {
      lines.push(pre.textContent || "");
      return lines.join("\n").trim();
    }

    const text = body.innerText || body.textContent || "";
    if (text) {
      lines.push(text);
    }
    return lines.join("\n").trim();
  }

  applyLevelChange(oldLevel, newLevel) {
    if (!Number.isFinite(oldLevel) || !Number.isFinite(newLevel)) return;
    const delta = newLevel - oldLevel;
    if (delta === 0) return;
    Object.keys(playerGrowthStats).forEach((statKey) => {
      const growth = playerGrowthStats[statKey];
      if (!Number.isFinite(growth)) return;
      const updated = (playerBaseStats[statKey] || 0) + growth * delta;
      if (statKey === "health" || statKey === "mana") {
        playerBaseStats[statKey] = Math.max(1, updated);
      } else {
        playerBaseStats[statKey] = Math.max(0, updated);
      }
    });
  }

  createAdminField({
    label,
    value,
    valueType,
    onChange,
    options,
    disabled,
    labelSuffix,
    helpText,
  }) {
    const wrapper = document.createElement("div");
    wrapper.className = "admin-field";
    const labelEl = document.createElement("label");
    labelEl.innerText = labelSuffix ? `${label} (${labelSuffix})` : label;
    if (helpText) {
      labelEl.title = helpText;
      const help = document.createElement("span");
      help.className = "admin-field-help";
      help.innerText = "?";
      help.title = helpText;
      labelEl.appendChild(help);
    }
    wrapper.appendChild(labelEl);

    let input;
    if (options && Array.isArray(options)) {
      input = document.createElement("select");
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "-- none --";
      input.appendChild(empty);
      options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        input.appendChild(option);
      });
      input.value = value ?? "";
    } else {
      input = document.createElement("input");
      if (valueType === "number") {
        input.type = "number";
        input.step = "0.1";
        input.value = Number.isFinite(value) ? value : 0;
      } else {
        input.type = "text";
        input.value = value ?? "";
      }
      if (valueType === "array") {
        input.type = "text";
        input.value = Array.isArray(value) ? value.join(", ") : value ?? "";
      }
    }
    if (disabled) {
      input.disabled = true;
    }
    input.addEventListener("change", (event) => {
      const rawValue = event.target.value;
      let nextValue = rawValue;
      if (valueType === "number") {
        nextValue = Number(rawValue);
      } else if (valueType === "array") {
        nextValue = rawValue
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .map((part) => Number(part))
          .filter((num) => Number.isFinite(num));
      }
      if (onChange) {
        onChange(nextValue);
      }
    });
    wrapper.appendChild(input);
    return wrapper;
  }

  getItemOptionsForSlot(slot) {
    const items = Object.values(itemsMap).filter((item) => {
      if (!item || !item.slot) return false;
      return item.slot === slot;
    });
    return items.map((item) => ({
      value: item.id,
      label: `${item.id} - ${item.name}`,
    }));
  }

  createMobThumbnail(mobId, mobInfo) {
    const thumb = document.createElement("div");
    thumb.className = "admin-thumb";
    const spriteKey = mobInfo.spriteKey || "";
    const mobIndex =
      spriteKey.startsWith("mob") && Number.isFinite(Number(spriteKey.slice(3)))
        ? Number(spriteKey.slice(3))
        : null;
    const frameIndex =
      mobIndex !== null && mobIndex >= 0 && mobIndex < 8
        ? Math.floor(mobIndex / 4) * 4 * 12 + (mobIndex % 4) * 3
        : null;

    if (frameIndex !== null && this.scene.textures.exists("mobs-sheet")) {
      const texture = this.scene.textures.get("mobs-sheet");
      const frame = texture.get(String(frameIndex));
      if (frame && frame.source && frame.source.image) {
        const canvas = document.createElement("canvas");
        canvas.width = 26;
        canvas.height = 26;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          frame.source.image,
          frame.cutX,
          frame.cutY,
          frame.cutWidth,
          frame.cutHeight,
          0,
          0,
          26,
          26
        );
        thumb.appendChild(canvas);
        return thumb;
      }
    }

    const spriteTextureKey = `${spriteKey}-walk-down`;
    if (spriteKey && this.scene.textures.exists(spriteTextureKey)) {
      const texture = this.scene.textures.get(spriteTextureKey);
      const frame = texture.get(0);
      if (frame && frame.source && frame.source.image) {
        const canvas = document.createElement("canvas");
        canvas.width = 26;
        canvas.height = 26;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          frame.source.image,
          frame.cutX,
          frame.cutY,
          frame.cutWidth,
          frame.cutHeight,
          0,
          0,
          26,
          26
        );
        thumb.appendChild(canvas);
        return thumb;
      }
    }

    thumb.innerText = mobInfo.name?.slice(0, 2) || mobId.slice(0, 2);
    return thumb;
  }

  scheduleAdminOverridesSave() {
    if (this.adminSaveTimer) {
      clearTimeout(this.adminSaveTimer);
    }
    this.adminSaveTimer = setTimeout(() => {
      this.saveAdminOverridesNow();
    }, 250);
  }

  saveAdminOverridesNow() {
    const payload = {
      mobsData: JSON.parse(JSON.stringify(mobsData)),
      playerProfile: JSON.parse(JSON.stringify(playerProfile)),
      playerBaseStats: JSON.parse(JSON.stringify(playerBaseStats)),
      playerGrowthStats: JSON.parse(JSON.stringify(playerGrowthStats)),
      naturalRegeneration: JSON.parse(JSON.stringify(naturalRegeneration)),
      playerEquippedItems: JSON.parse(JSON.stringify(playerEquippedItems)),
      allGameSkills: JSON.parse(JSON.stringify(allGameSkills)),
    };
    saveAdminOverrides(payload);
  }

  // -----------------------------
  // LEVEL-UP NOTIFICATION
  // -----------------------------
  showLevelUpNotification(newLevel) {
    const notification = document.createElement("div");
    notification.classList.add("level-up-notification");
    notification.innerText = `Level Up! Now Level ${newLevel}!`;
    document.body.appendChild(notification);

    notification.offsetHeight;
    notification.classList.add("show");
    this.scene.time.delayedCall(3000, () => {
      notification.classList.remove("show");
      this.scene.time.delayedCall(500, () => {
        notification.remove();
      });
    });
  }
}
