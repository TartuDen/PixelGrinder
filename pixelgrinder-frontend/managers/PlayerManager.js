//
// managers/PlayerManager.js
//

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

    // NEW: track if the player is currently gathering
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

    // Collision with walls
    this.scene.physics.add.collider(this.player, this.scene.collisionLayer);

    // Start with a default animation
    this.player.anims.play("walk-down");

    // Initialize player stats
    this.updatePlayerStats();
  }

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

  findEmptyBackpackCell() {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const key = `cell_${r}_${c}`;
        if (playerBackpack[key] === 0) {
          return key;
        }
      }
    }
    return null;
  }

  equipItem(slot, itemId) {
    const currentlyEquippedId = playerEquippedItems[slot];
    if (currentlyEquippedId) {
      const oldItem = allItems.find((it) => it.id === currentlyEquippedId);
      if (oldItem) {
        const emptyCell = this.findEmptyBackpackCell();
        if (emptyCell) {
          playerBackpack[emptyCell] = oldItem.id;
          console.log(
            `Moved previously equipped "${oldItem.name}" to inventory cell=${emptyCell}.`
          );
        } else {
          console.warn(
            "No empty cell available in the backpack. Old item remains equipped or is lost!"
          );
        }
      }
    }

    playerEquippedItems[slot] = itemId;
    const newItem = allItems.find((it) => it.id === itemId);
    if (newItem) {
      console.log(`Equipped ${newItem.name} (id=${itemId}) to slot="${slot}".`);
    } else {
      console.warn(`equipItem: no data found for itemId=${itemId}.`);
    }

    this.updatePlayerStats();
    this.scene.emitStatsUpdate();
  }

  unequipItem(slot) {
    const equippedItemId = playerEquippedItems[slot];
    if (!equippedItemId) {
      console.log(`No item is currently equipped in slot: ${slot}`);
      return;
    }

    const emptyCell = this.findEmptyBackpackCell();
    if (!emptyCell) {
      console.warn("No empty cell available in the backpack. Cannot un-equip!");
      return;
    }

    const itemData = allItems.find((i) => i.id === equippedItemId);
    if (!itemData) {
      console.warn(`Could not find item data for equipped item ID=${equippedItemId}`);
      return;
    }

    playerBackpack[emptyCell] = itemData.id;
    playerEquippedItems[slot] = null;
    console.log(
      `Un-equipped "${itemData.name}" from slot=${slot} → moved to cell=${emptyCell}`
    );

    this.updatePlayerStats();
    this.scene.emitStatsUpdate();
  }

  replenishHealthAndMana() {
    this.currentHealth = this.maxHealth;
    this.currentMana = this.maxMana;
    console.log("Player's Health and Mana have been fully replenished.");
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

      // Add gatherSpeed to the returned stats
      gatherSpeed: stats.gatherSpeed || 1,
    };
  }

  handleMovement(cursors, isCasting) {
    if (!this.player || !this.player.body) return;

    // Prevent movement if casting or if gathering
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
