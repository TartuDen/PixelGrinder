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

    // Player stats
    this.currentMana = 0;
    this.currentHealth = 0;
    this.maxMana = 0;
    this.maxHealth = 0;
  }

  createPlayer(tilemap) {
    const heroStart = tilemap.findObject(
      "GameObjects",
      (obj) => obj.name === "HeroStart"
    );
    this.player = this.scene.physics.add.sprite(
      heroStart.x,
      heroStart.y,
      "characters"
    );
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1);

    // Collision with walls
    this.scene.physics.add.collider(this.player, this.scene.collisionLayer);

    // Start with a default animation
    this.player.anims.play("walk-down");

    // Initialize player stats based on equipment
    this.updatePlayerStats();
  }

  /**
   * Recalculates and updates player stats, including speed.
   */
  updatePlayerStats() {
    const stats = calculatePlayerStats();
    this.maxHealth = stats.health;
    this.maxMana = stats.mana;

    if (this.currentHealth === 0) {
      this.currentHealth = this.maxHealth;
      console.log(`Player Health Initialized to Max: ${this.currentHealth}`);
    } else {
      this.currentHealth = Math.min(this.currentHealth, this.maxHealth);
    }

    if (this.currentMana === 0) {
      this.currentMana = this.maxMana;
      console.log(`Player Mana Initialized to Max: ${this.currentMana}`);
    } else {
      this.currentMana = Math.min(this.currentMana, this.maxMana);
    }

    const MIN_SPEED = 50;
    const MAX_SPEED = 200;
    this.playerSpeed = Phaser.Math.Clamp(stats.speed, MIN_SPEED, MAX_SPEED);

    console.log(`Player Speed Updated: ${this.playerSpeed}`);

    // Notify MainScene to update UI
    this.scene.emitStatsUpdate();
  }

  /**
   * Find the first empty backpack cell (where value===0).
   * Returns the cell key (e.g. "cell_2_3") or null if none found.
   */
  findEmptyBackpackCell() {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const key = `cell_${r}_${c}`;
        if (playerBackpack[key] === 0) {
          return key;
        }
      }
    }
    return null; // no empty cell found
  }

  /**
   * Equip an item and update stats. If there's already an item in that slot,
   * move that old item into an empty backpack cell.
   */
  equipItem(itemType, itemName) {
    // 1) If we already have an item equipped in that slot, move it into inventory
    const currentlyEquippedName = playerEquippedItems[itemType];
    if (currentlyEquippedName) {
      // Find the old item in allItems
      const oldItem = allItems.find((it) => it.name === currentlyEquippedName);
      if (oldItem) {
        // Find an empty cell
        const emptyCell = this.findEmptyBackpackCell();
        if (emptyCell) {
          // Put the old item into that backpack cell
          playerBackpack[emptyCell] = oldItem.id;
          console.log(
            `Moved previously equipped "${oldItem.name}" to inventory cell=${emptyCell}.`
          );
        } else {
          console.warn(
            "No empty cell available in the backpack. The old item remains equipped or is lost!"
          );
        }
      }
    }

    // 2) Now equip the new item
    playerEquippedItems[itemType] = itemName;
    console.log(`Equipped ${itemName} to ${itemType}`);

    // 3) Recalculate and update stats
    this.updatePlayerStats();
    this.scene.emitStatsUpdate();
  }

  /**
   * Un-equip an item from the given slot and place it into an empty backpack cell.
   * @param {string} slot - e.g. "weapon", "head", "chest", "shoulders", "legs", "feet"
   */
  unequipItem(slot) {
    const equippedItemName = playerEquippedItems[slot];
    if (!equippedItemName) {
      console.log(`No item is currently equipped in slot: ${slot}`);
      return;
    }

    // Find empty cell
    const emptyCell = this.findEmptyBackpackCell();
    if (!emptyCell) {
      console.warn("No empty cell available in the backpack. Cannot un-equip!");
      return;
    }

    // Find the item by name
    const itemData = allItems.find((i) => i.name === equippedItemName);
    if (!itemData) {
      console.warn(`Could not find item data for equipped item: ${equippedItemName}`);
      return;
    }

    // Place in backpack
    playerBackpack[emptyCell] = itemData.id;

    // Remove from equipped
    playerEquippedItems[slot] = null;
    console.log(`Un-equipped "${equippedItemName}" from slot ${slot} → moved to cell ${emptyCell}`);

    // Update stats
    this.updatePlayerStats();
    this.scene.emitStatsUpdate();
  }

  /**
   * Replenish player's Health and Mana to full.
   */
  replenishHealthAndMana() {
    this.currentHealth = this.maxHealth;
    this.currentMana = this.maxMana;
    console.log("Player's Health and Mana have been fully replenished.");
    this.scene.emitStatsUpdate();
  }

  getPlayerStats() {
    return {
      currentMana: this.currentMana,
      maxMana: this.maxMana,
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      magicAttack: calculatePlayerStats().magicAttack,
      meleeAttack: calculatePlayerStats().meleeAttack,
      magicDefense: calculatePlayerStats().magicDefense,
      meleeDefense: calculatePlayerStats().meleeDefense,
      magicEvasion: calculatePlayerStats().magicEvasion,
      meleeEvasion: calculatePlayerStats().meleeEvasion,
      speed: this.playerSpeed,
      level: playerProfile.level,
    };
  }

  handleMovement(cursors, isCasting) {
    if (!this.player || !this.player.body) return;

    // Prevent movement if casting
    if (isCasting) {
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

    console.log(
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
