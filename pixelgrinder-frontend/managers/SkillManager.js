// managers/SkillManager.js

import { SKILL_RANGE_EXTENDER } from "../data/MOCKdata.js";
import { calculateMagicDamage } from "../helpers/calculatePlayerStats.js"; // Ensure correct path

export default class SkillManager {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene instance.
   * @param {Function} getPlayerStatsCallback - Callback to retrieve current player stats.
   */
  constructor(scene, getPlayerStatsCallback) {
    this.scene = scene;
    this.getPlayerStats = getPlayerStatsCallback;

    this.skills = []; // Array to store all available skills.
    this.cooldowns = {}; // Object to track cooldown timers for each skill.
    this.isCasting = false; // Flag to indicate if a skill is currently being cast.
    this.currentCastingSkill = null; // Reference to the skill being cast.

    this.castingTimer = null; // To track casting progress
    this.rangeCheckTimer = null; // To periodically check if mob is within extended range
  }

  /**
   * Preloads skills from the player's skill list.
   * Assumes that `playerSkills` is available in MainScene.js and passed correctly.
   */
  preloadSkills() {
    // Assuming skills are accessible via `playerSkills` in the MainScene.
    this.skills = this.scene.playerSkills;
  }

  /**
   * Creates any necessary skill-specific animations.
   * Placeholder for future animation integrations.
   */
  createSkillAnimations() {
    // Animations are already defined in MainScene.js
    // No additional setup required here
  }

  /**
   * Attempts to use a specified skill.
   * Handles casting time and cooldowns based on skill attributes.
   *
   * @param {Object} skill - The skill object to be used.
   * @returns {Object} - Result of the skill usage attempt.
   */
  useSkill(skill) {
    // Prevent using another skill while casting.
    if (this.isCasting) {
      console.log("Currently casting another skill. Please wait.");
      return { success: false };
    }

    // Check if the skill is on cooldown.
    if (this.cooldowns[skill.id] && this.cooldowns[skill.id] > 0) {
      console.log(
        `${skill.name} is on cooldown for ${this.cooldowns[skill.id].toFixed(
          1
        )} more seconds.`
      );
      return { success: false };
    }

    // Retrieve current player stats.
    const playerStats = this.getPlayerStats();
    console.log(
      `Current Mana: ${playerStats.currentMana} / ${playerStats.maxMana}`
    ); // Debug log
    if (playerStats.currentMana < skill.manaCost) {
      console.log("Not enough mana to use this skill.");
      return { success: false };
    }

    // Get the targeted mob
    const targetedMob = this.scene.targetedMob;
    if (!targetedMob) {
      console.log("No target selected for skill casting.");
      return { success: false };
    }

    // Calculate distance to the targeted mob
    const distance = Phaser.Math.Distance.Between(
      this.scene.player.x,
      this.scene.player.y,
      targetedMob.x,
      targetedMob.y
    );

    if (distance > skill.range) {
      console.log(
        `Target is out of range for ${skill.name}. Current distance: ${distance}, Required range: ${skill.range}`
      );
      return { success: false };
    }

    // If the skill has a casting time, initiate casting; otherwise, execute immediately.
    if (skill.castingTime > 0) {
      this.castSkill(skill, targetedMob);
    } else {
      this.executeSkill(skill, targetedMob);
    }

    return { success: true };
  }

  /**
   * Initiates the casting process for a skill with a casting time.
   *
   * @param {Object} skill - The skill object being cast.
   * @param {Phaser.GameObjects.Sprite} targetedMob - The mob being targeted.
   */
  castSkill(skill, targetedMob) {
    this.isCasting = true;
    this.currentCastingSkill = skill;

    console.log(`Casting ${skill.name}...`);

    // Show the casting progress bar
    this.scene.uiManager.showCastingProgress(skill.name, skill.castingTime);

    const totalTime = skill.castingTime;
    let elapsedTime = 0;

    // Update casting progress every 100ms
    this.castingTimer = this.scene.time.addEvent({
      delay: 100, // 0.1 seconds
      callback: () => {
        elapsedTime += 0.1;
        this.scene.uiManager.updateCastingProgress(elapsedTime, totalTime);

        if (elapsedTime >= totalTime) {
          this.castingTimer.remove(false);
        }
      },
      callbackScope: this,
      loop: true,
    });

    // Schedule skill execution after casting time
    this.scene.time.delayedCall(
      skill.castingTime * 1000,
      () => {
        this.executeSkill(skill, targetedMob);
        this.isCasting = false;
        this.currentCastingSkill = null;
        this.castingTimer.remove(false);

        // Hide the casting progress bar
        this.scene.uiManager.hideCastingProgress();

        // Remove range check timer if still active
        if (this.rangeCheckTimer) {
          this.rangeCheckTimer.remove(false);
          this.rangeCheckTimer = null;
        }
      },
      [],
      this
    );

    // Start range checking
    this.rangeCheckTimer = this.scene.time.addEvent({
      delay: 100, // Check every 100ms
      callback: () => {
        if (!this.isCasting || !targetedMob.active) {
          // If casting has ended or mob is inactive, stop checking
          if (this.rangeCheckTimer) {
            this.rangeCheckTimer.remove(false);
            this.rangeCheckTimer = null;
          }
          return;
        }

        // Calculate current distance
        const currentDistance = Phaser.Math.Distance.Between(
          this.scene.player.x,
          this.scene.player.y,
          targetedMob.x,
          targetedMob.y
        );

        // Calculate extended range
        const extendedRange = skill.range * SKILL_RANGE_EXTENDER;

        if (currentDistance > extendedRange) {
          console.log(
            `Casting of ${skill.name} canceled. Target moved out of extended range.`
          );
          this.cancelCasting();
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * Executes the effects of a skill, such as dealing damage or healing.
   * Initiates the skill's cooldown.
   * Also triggers the skill animation.
   *
   * @param {Object} skill - The skill object to execute.
   * @param {Phaser.GameObjects.Sprite} targetedMob - The mob being targeted.
   */
  executeSkill(skill, targetedMob) {
    const player = this.scene.player;

    // Deduct mana
    this.scene.deductMana(skill.manaCost);

    // Apply skill effects (damage, healing, etc.)
    if (skill.magicAttack > 0 && targetedMob) {
      const playerStats = this.getPlayerStats();
      const mobStats = this.scene.mobManager.getStats(targetedMob);

      const damage = calculateMagicDamage(
        playerStats,
        mobStats,
        skill.magicAttack
      );

      this.scene.mobManager.applyDamageToMob(targetedMob, damage);
      console.log(
        `${skill.name} used on Mob ${targetedMob.customData.id}, dealing ${damage} magic damage.`
      );

      // Trigger skill animation
      this.triggerSkillAnimation(skill, player, targetedMob);
    }

    if (skill.heal) {
      this.scene.currentHealth = Math.min(
        this.scene.maxHealth,
        this.scene.currentHealth + skill.heal
      );
      console.log(`${skill.name} healed for ${skill.heal} HP.`);
    }

    if (skill.cooldown > 0) {
      this.cooldowns[skill.id] = skill.cooldown;

      // Schedule cooldown end
      this.scene.time.addEvent({
        delay: skill.cooldown * 1000,
        callback: () => {
          this.cooldowns[skill.id] = 0;
          console.log(`${skill.name} is now off cooldown.`);
          this.scene.uiManager.updateSkillCooldown(skill.id, 0);
        },
        callbackScope: this,
      });

      // Update UI with cooldown
      this.scene.uiManager.updateSkillCooldown(skill.id, skill.cooldown);
    }

    // Refresh UI
    this.scene.updateUI();
  }

  /**
   * Triggers the skill animation at the targeted mob's location.
   *
   * @param {Object} skill - The skill object being used.
   * @param {Phaser.GameObjects.Sprite} player - The player sprite.
   * @param {Phaser.GameObjects.Sprite} target - The targeted mob sprite.
   */
  triggerSkillAnimation(skill, player, target) {
    const scene = this.scene;

    if (!target) {
      console.warn(`No target available for skill: ${skill.name}`);
      return;
    }

    // Create a sprite at the target's position
    const skillSprite = scene.add.sprite(
      target.x,
      target.y,
      `${skill.name}_anim`
    );
    skillSprite.setScale(1); // Adjust scale as needed

    // Play the animation
    skillSprite.play(`${skill.name}_anim`);

    // Optional: Add a slight offset if needed (e.g., above the mob)
    // skillSprite.y -= 20;

    // Add a fade-out effect after the animation completes
    skillSprite.on("animationcomplete", () => {
      scene.tweens.add({
        targets: skillSprite,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          skillSprite.destroy();
        },
      });
    });
  }

  /**
   * Cancels the current casting process.
   */
  cancelCasting() {
    if (!this.isCasting) return;

    console.log(`Casting of ${this.currentCastingSkill.name} has been canceled.`);

    // Remove casting timer
    if (this.castingTimer) {
      this.castingTimer.remove(false);
      this.castingTimer = null;
    }

    // Remove range check timer
    if (this.rangeCheckTimer) {
      this.rangeCheckTimer.remove(false);
      this.rangeCheckTimer = null;
    }

    // Reset casting flags
    this.isCasting = false;
    this.currentCastingSkill = null;

    // Hide the casting progress bar
    this.scene.uiManager.hideCastingProgress();
  }

  /**
   * Checks if a skill can be used based on casting and cooldown states.
   *
   * @param {Object} skill - The skill object to check.
   * @returns {boolean} - True if the skill can be used; otherwise, false.
   */
  canUseSkill(skill) {
    if (this.isCasting) return false;
    if (this.cooldowns[skill.id] && this.cooldowns[skill.id] > 0) return false;
    const playerStats = this.getPlayerStats();
    if (playerStats.currentMana < skill.manaCost) return false;
    return true;
  }
}
