// managers/PlayerManager.js

import { calculatePlayerStats } from "../helpers/calculatePlayerStats.js";
import {
  playerProfile,
  playerEquippedItems,
  playerBackpack,
  allItems,
} from "../data/MOCKdata.js";

export default class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.player = null;
    this.playerSpeed = 100;

    this.currentMana = 0;
    this.currentHealth = 0;
    this.maxMana = 0;
    this.maxHealth = 0;

    // Track if we are in a "gathering" state
    this.isGathering = false;
  }

  createPlayer(tilemap) {
    const heroStart = tilemap.findObject(
      "GameObjects",
      (obj) => obj.name === "HeroStart"
    );
    this.player = this.scene.physics.add.sprite(
      heroStart.x,
      heroStart.y,
      "mage"
    );
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1);

    this.scene.physics.add.collider(this.player, this.scene.collisionLayer);

    this.player.anims.play("walk-down");

    this.updatePlayerStats();
  }

  updatePlayerStats() {
    const stats = calculatePlayerStats();
    this.maxHealth = stats.health;
    this.maxMana = stats.mana;

    if (this.currentHealth === 0) {
      this.currentHealth = this.maxHealth;
      this.scene.chatManager.addMessage(
        `Player Health Initialized to Max: ${this.currentHealth}`
      );
    } else {
      this.currentHealth = Math.min(this.currentHealth, this.maxHealth);
    }

    if (this.currentMana === 0) {
      this.currentMana = this.maxMana;
      this.scene.chatManager.addMessage(
        `Player Mana Initialized to Max: ${this.currentMana}`
      );
    } else {
      this.currentMana = Math.min(this.currentMana, this.maxMana);
    }

    const MIN_SPEED = 50;
    const MAX_SPEED = 200;
    this.playerSpeed = Phaser.Math.Clamp(stats.speed, MIN_SPEED, MAX_SPEED);

    this.scene.chatManager.addMessage(`Player Speed Updated: ${this.playerSpeed}`);

    this.scene.emitStatsUpdate();
  }

  findEmptyBackpackCell() {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const key = `cell_${r}_${c}`;
        const cellVal = playerBackpack[key];
        // cellVal could be 0 or null => empty
        if (cellVal === 0 || cellVal === null) {
          return key;
        }
      }
    }
    return null;
  }

  /**
   * #4: Only items with ID >= 4000 are stackable. 
   * Otherwise, treat them as unique (no stacking).
   */
  addItemToInventory(itemId, quantity = 1) {
    // Check if the item is stackable:
    const isStackable = itemId >= 4000;

    if (isStackable) {
      // 1) Try to find if there's already a stack of this item:
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 5; c++) {
          const key = `cell_${r}_${c}`;
          const val = playerBackpack[key]; // val might be: 0, null, number, or { id, quantity }

          if (val && typeof val === "object" && val.id === itemId) {
            // We already have a stack here
            val.quantity += quantity;
            this.scene.chatManager.addMessage(
              `Stacked +${quantity} onto existing item in ${key}. New total: ${val.quantity}`
            );
            return true;
          } else if (val !== null && typeof val === "number" && val === itemId) {
            // We have exactly one item stored as a plain number
            playerBackpack[key] = { id: itemId, quantity: 1 + quantity };
            this.scene.chatManager.addMessage(
              `Converted single item to stack in ${key}.`
            );
            return true;
          }
        }
      }
    }

    // 2) If not stackable or no existing stack found, find an empty cell
    const emptyCell = this.findEmptyBackpackCell();
    if (!emptyCell) {
      this.scene.chatManager.addMessage("No empty cell available for new item!");
      return false;
    }

    // Put a new item in the empty cell
    if (isStackable) {
      playerBackpack[emptyCell] = { id: itemId, quantity };
    } else {
      // Store as a plain number
      playerBackpack[emptyCell] = itemId;
    }
    this.scene.chatManager.addMessage(
      `Placed itemId=${itemId} x${quantity} into cell ${emptyCell}.`
    );
    return true;
  }

  equipItem(slot, itemId) {
    const currentlyEquippedId = playerEquippedItems[slot];
    if (currentlyEquippedId) {
      const oldItem = allItems.find((it) => it.id === currentlyEquippedId);
      if (oldItem) {
        const emptyCell = this.findEmptyBackpackCell();
        if (emptyCell) {
          playerBackpack[emptyCell] = oldItem.id;
          this.scene.chatManager.addMessage(
            `Moved previously equipped "${oldItem.name}" to inventory cell=${emptyCell}.`
          );
        } else {
          this.scene.chatManager.addMessage(
            "No empty cell available in the backpack. Old item remains equipped or is lost!"
          );
        }
      }
    }

    playerEquippedItems[slot] = itemId;
    const newItem = allItems.find((it) => it.id === itemId);
    if (newItem) {
      this.scene.chatManager.addMessage(
        `Equipped ${newItem.name} (id=${itemId}) to slot="${slot}".`
      );
    } else {
      this.scene.chatManager.addMessage(
        `equipItem: no data found for itemId=${itemId}.`
      );
    }

    this.updatePlayerStats();
    this.scene.emitStatsUpdate();
  }

  unequipItem(slot) {
    const equippedItemId = playerEquippedItems[slot];
    if (!equippedItemId) {
      this.scene.chatManager.addMessage(
        `No item is currently equipped in slot: ${slot}`
      );
      return;
    }

    const emptyCell = this.findEmptyBackpackCell();
    if (!emptyCell) {
      this.scene.chatManager.addMessage(
        "No empty cell available in the backpack. Cannot un-equip!"
      );
      return;
    }

    const itemData = allItems.find((i) => i.id === equippedItemId);
    if (!itemData) {
      this.scene.chatManager.addMessage(
        `Could not find item data for equipped item ID=${equippedItemId}`
      );
      return;
    }

    playerBackpack[emptyCell] = itemData.id;
    playerEquippedItems[slot] = null;
    this.scene.chatManager.addMessage(
      `Un-equipped "${itemData.name}" from slot=${slot} → moved to cell=${emptyCell}`
    );

    this.updatePlayerStats();
    this.scene.emitStatsUpdate();
  }

  replenishHealthAndMana() {
    this.currentHealth = this.maxHealth;
    this.currentMana = this.maxMana;
    this.scene.chatManager.addMessage("Player's Health and Mana fully replenished.");
    this.scene.emitStatsUpdate();
  }

  getPlayerStats() {
    const stats = calculatePlayerStats();
    return {
      currentMana: this.currentMana,
      maxMana: this.maxMana,
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      magicAttack: stats.magicAttack,
      meleeAttack: stats.meleeAttack,
      magicDefense: stats.magicDefense,
      meleeDefense: stats.meleeDefense,
      magicEvasion: stats.magicEvasion,
      meleeEvasion: stats.meleeEvasion,
      speed: this.playerSpeed,
      level: playerProfile.level,

      gatherSpeed: stats.gatherSpeed || 1,
    };
  }

  handleMovement(cursors, isCasting) {
    if (!this.player || !this.player.body) return;

    // Prevent movement if casting or gathering
    if (isCasting || this.isGathering) {
      this.player.body.setVelocity(0);
      this.player.anims.stop();
      return;
    }

    this.player.body.setVelocity(0);

    if (cursors.up.isDown) {
      this.player.body.setVelocityY(-this.playerSpeed);
      this.player.anims.play("walk-up", true);
    } else if (cursors.down.isDown) {
      this.player.body.setVelocityY(this.playerSpeed);
      this.player.anims.play("walk-down", true);
    }

    if (cursors.left.isDown) {
      this.player.body.setVelocityX(-this.playerSpeed);
      this.player.anims.play("walk-left", true);
    } else if (cursors.right.isDown) {
      this.player.body.setVelocityX(this.playerSpeed);
      this.player.anims.play("walk-right", true);
    }

    if (
      !cursors.up.isDown &&
      !cursors.down.isDown &&
      !cursors.left.isDown &&
      !cursors.right.isDown
    ) {
      this.player.anims.stop();
    }

    this.player.body.velocity.normalize().scale(this.playerSpeed);
  }

  regenerateStats(regenerationData) {
    const beforeMana = this.currentMana;
    this.currentMana = Math.min(
      this.maxMana,
      this.currentMana + regenerationData.manaRegen
    );

    const beforeHealth = this.currentHealth;
    this.currentHealth = Math.min(
      this.maxHealth,
      this.currentHealth + regenerationData.hpRegen
    );

    this.scene.chatManager.addMessage(
      `Regenerated +${this.currentMana - beforeMana} mana, +${
        this.currentHealth - beforeHealth
      } HP`
    );
    this.scene.emitStatsUpdate();
  }

  gainExperience(amount) {
    this.scene.gainExperience(amount);
  }
}
