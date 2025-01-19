// managers/PlayerManager.js

import { calculatePlayerStats } from "../helpers/calculatePlayerStats.js";
import { playerProfile } from "../data/MOCKdata.js"; // Import playerProfile to access level

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
    const heroStart = tilemap.findObject("GameObjects", (obj) => obj.name === "HeroStart");
    this.player = this.scene.physics.add.sprite(heroStart.x, heroStart.y, "characters");
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

    // Initialize currentHealth and currentMana to max if they are 0
    if (this.currentHealth === 0) {
      this.currentHealth = this.maxHealth;
      console.log(`Player Health Initialized to Max: ${this.currentHealth}`);
    } else {
      // Ensure currentHealth does not exceed maxHealth
      this.currentHealth = Math.min(this.currentHealth, this.maxHealth);
    }

    if (this.currentMana === 0) {
      this.currentMana = this.maxMana;
      console.log(`Player Mana Initialized to Max: ${this.currentMana}`);
    } else {
      // Ensure currentMana does not exceed maxMana
      this.currentMana = Math.min(this.currentMana, this.maxMana);
    }

    // Update player speed with constraints
    const MIN_SPEED = 50;
    const MAX_SPEED = 200;
    this.playerSpeed = Phaser.Math.Clamp(stats.speed, MIN_SPEED, MAX_SPEED);

    console.log(`Player Speed Updated: ${this.playerSpeed}`);

    // Notify MainScene to update UI
    this.scene.emitStatsUpdate();
  }

  /**
   * Replenish player's Health and Mana to full.
   */
  replenishHealthAndMana() {
    this.currentHealth = this.maxHealth;
    this.currentMana = this.maxMana;
    console.log("Player's Health and Mana have been fully replenished upon leveling up.");
    
    // Notify MainScene to update UI
    this.scene.emitStatsUpdate();
  }

  /**
   * Get current player stats, including speed and level.
   */
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
      level: playerProfile.level, // <--- Added level
      // Add other stats if necessary
    };
  }

  /**
   * Handle player movement based on input.
   * @param {Object} cursors - The input keys.
   * @param {boolean} isCasting - Flag indicating if a skill is being cast.
   */
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

    // Normalize and scale the velocity so that player can't move faster along a diagonal
    this.player.body.velocity.normalize().scale(this.playerSpeed);
  }

  /**
   * Equip an item and update stats.
   * @param {string} itemType - Type of the item (e.g., weapon, head).
   * @param {string} itemName - Name of the item to equip.
   */
  equipItem(itemType, itemName) {
    this.scene.playerEquippedItems[itemType] = itemName;
    console.log(`Equipped ${itemName} to ${itemType}`);

    // Recalculate and update player stats
    this.updatePlayerStats();

    // Update the UI to reflect changes
    this.scene.emitStatsUpdate();
  }

  /**
   * Regenerate player stats naturally over time.
   * Called periodically via a timed event.
   */
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

    // Update the UI to reflect regeneration
    this.scene.emitStatsUpdate();
  }

  /**
   * Method to handle gaining experience.
   * @param {number} amount - Amount of EXP to gain.
   */
  gainExperience(amount) {
    this.scene.gainExperience(amount);
  }
}
