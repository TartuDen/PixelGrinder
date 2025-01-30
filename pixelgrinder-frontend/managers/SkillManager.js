// managers/SkillManager.js

import { SKILL_RANGE_EXTENDER } from "../data/MOCKdata.js";
import {
  calculateMagicDamage,
  calculateMeleeDamage,
} from "../helpers/calculatePlayerStats.js";

export default class SkillManager {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene (MainScene).
   * @param {Function} getPlayerStatsCallback - A callback to retrieve current player stats.
   */
  constructor(scene, getPlayerStatsCallback) {
    this.scene = scene;
    this.getPlayerStats = getPlayerStatsCallback;

    this.skills = [];     // All available skills (populated in preloadSkills)
    this.cooldowns = {};  // Track skill cooldowns
    this.isCasting = false;
    this.currentCastingSkill = null;

    this.castingTimer = null;      // Timer for the casting progress
    this.rangeCheckTimer = null;   // Timer that checks distance while casting
    this.delayedCall = null;       // Delayed call for finishing the cast
  }

  /**
   * Called in Scene.create() to load the skill data from the Scene’s playerSkills.
   */
  preloadSkills() {
    // If you’re storing them in this.scene.playerSkills, do:
    this.skills = this.scene.playerSkills;
  }

  /**
   * Called after scene loads & creates the animations in defineAnimations.
   * If you want any additional skill animations, place them here or in MainScene.defineAnimations.
   */
  createSkillAnimations() {
    // If your MainScene already defines the skill animations,
    // you can skip or leave this method empty.
  }

  /**
   * Returns true if an attack is evaded (based on evasionStat).
   */
  isAttackEvaded(evasionStat) {
    const evasionChance = 1 * evasionStat; // e.g. 1% per stat point
    const roll = Phaser.Math.FloatBetween(0, 100);
    return roll < evasionChance;
  }

  /**
   * Attempts to use a given skill:
   *  - Checks if already casting or if skill is on cooldown
   *  - Checks if enough mana
   *  - Checks if we have a target in range
   *  - If castingTime > 0, starts cast; else executes immediately
   */
  useSkill(skill) {
    if (this.isCasting) {
      this.scene.chatManager.addMessage("Currently casting another skill. Please wait.");
      return { success: false };
    }

    // Cooldown check
    if (this.cooldowns[skill.id] && this.cooldowns[skill.id] > 0) {
      this.scene.chatManager.addMessage(
        `${skill.name} is on cooldown for ${this.cooldowns[skill.id].toFixed(1)}s.`
      );
      return { success: false };
    }

    // Mana check
    const playerStats = this.getPlayerStats();
    this.scene.chatManager.addMessage(
      `Current Mana: ${playerStats.currentMana} / ${playerStats.maxMana}`
    );
    if (playerStats.currentMana < skill.manaCost) {
      this.scene.chatManager.addMessage("Not enough mana to use this skill.");
      return { success: false };
    }

    // Must have a target
    const targetedMob = this.scene.targetedMob;
    if (!targetedMob) {
      this.scene.chatManager.addMessage("No target selected for skill casting.");
      return { success: false };
    }

    // Check distance to target
    const player = this.scene.playerManager.player;
    if (!player) {
      this.scene.chatManager.addMessage("PlayerManager.player is undefined.");
      return { success: false };
    }

    const distance = Phaser.Math.Distance.Between(
      player.x,
      player.y,
      targetedMob.x,
      targetedMob.y
    );
    if (distance > skill.range) {
      this.scene.chatManager.addMessage(
        `Target is out of range for ${skill.name}. Dist=${distance}, Range=${skill.range}.`
      );
      return { success: false };
    }

    // If skill has a casting time, begin cast; else execute
    if (skill.castingTime > 0) {
      this.castSkill(skill, targetedMob);
    } else {
      this.executeSkill(skill, targetedMob);
    }
    return { success: true };
  }

  /**
   * Starts the skill’s casting process, showing a progress bar
   * and checking if the target moves away or we get interrupted.
   */
  castSkill(skill, targetedMob) {
    this.isCasting = true;
    this.currentCastingSkill = skill;

    this.scene.chatManager.addMessage(`Casting ${skill.name}...`);
    this.scene.uiManager.showCastingProgress(skill.name, skill.castingTime);

    const totalTime = skill.castingTime;
    let elapsedTime = 0;

    // Update progress bar every 100ms
    this.castingTimer = this.scene.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        elapsedTime += 0.1;
        this.scene.uiManager.updateCastingProgress(elapsedTime, totalTime);

        if (elapsedTime >= totalTime && this.castingTimer) {
          this.castingTimer.remove(false);
          this.castingTimer = null;
        }
      },
    });

    // After skill.castingTime, execute the skill
    this.delayedCall = this.scene.time.delayedCall(
      skill.castingTime * 1000,
      () => {
        // If we got canceled mid-cast, do nothing
        if (!this.isCasting) return;

        this.executeSkill(skill, targetedMob);
        this.isCasting = false;
        this.currentCastingSkill = null;

        if (this.castingTimer) {
          this.castingTimer.remove(false);
          this.castingTimer = null;
        }
        this.scene.uiManager.hideCastingProgress();

        if (this.rangeCheckTimer) {
          this.rangeCheckTimer.remove(false);
          this.rangeCheckTimer = null;
        }
        this.delayedCall = null;
      }
    );

    // Start range checking every 100ms
    this.rangeCheckTimer = this.scene.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!this.isCasting || !targetedMob.active) {
          if (this.rangeCheckTimer) {
            this.rangeCheckTimer.remove(false);
            this.rangeCheckTimer = null;
          }
          return;
        }
        // If target moves beyond extended range, cancel cast
        const dist = Phaser.Math.Distance.Between(
          this.scene.playerManager.player.x,
          this.scene.playerManager.player.y,
          targetedMob.x,
          targetedMob.y
        );
        const extendedRange = skill.range * SKILL_RANGE_EXTENDER;
        if (dist > extendedRange) {
          this.scene.chatManager.addMessage(
            `Casting of ${skill.name} canceled. Target moved out of extended range.`
          );
          this.cancelCasting();
        }
      },
    });
  }

  /**
   * Executes the skill effect (damage/heal) and triggers the skill animation.
   * Also sets the cooldown if needed.
   */
  executeSkill(skill, targetedMob) {
    // Deduct mana cost
    this.scene.deductMana(skill.manaCost);

    // Possibly deal magic damage
    if (skill.magicAttack > 0 && targetedMob) {
      const playerStats = this.getPlayerStats();
      const mobStats = this.scene.mobManager.getStats(targetedMob);

      const evaded = this.isAttackEvaded(mobStats.magicEvasion || 0);
      if (evaded) {
        this.scene.chatManager.addMessage(
          `${skill.name} was evaded by Mob ${targetedMob.customData.id}.`
        );
      } else {
        // Calculate actual damage
        const damage = calculateMagicDamage(
          playerStats,
          mobStats,
          skill.magicAttack
        );
        // Apply damage to mob
        this.scene.mobManager.applyDamageToMob(targetedMob, damage);

        this.scene.chatManager.addMessage(
          `${skill.name} used on Mob ${targetedMob.customData.id}, dealing ${damage} magic damage.`
        );

        // **Play skill animation** on the mob’s position
        this.triggerSkillAnimation(skill, targetedMob);
      }

      // Optional: reward extra EXP if skill has "expReward"
      if (skill.expReward && damage > 0) {
        this.scene.playerManager.gainExperience(skill.expReward);
      }
    }

    // If skill has a heal property
    if (skill.heal) {
      const amount = skill.heal;
      const p = this.scene.playerManager;
      p.currentHealth = Math.min(p.maxHealth, p.currentHealth + amount);
      this.scene.chatManager.addMessage(`${skill.name} healed for ${amount} HP.`);
    }

    // Start cooldown if > 0
    if (skill.cooldown > 0) {
      this.cooldowns[skill.id] = skill.cooldown;
      // Setup a timed event to reset the cooldown
      this.scene.time.addEvent({
        delay: skill.cooldown * 1000,
        callback: () => {
          this.cooldowns[skill.id] = 0;
          this.scene.chatManager.addMessage(`${skill.name} is now off cooldown.`);
          this.scene.uiManager.updateSkillCooldown(skill.id, 0);
        },
      });
      // Update UI for cooldown
      this.scene.uiManager.updateSkillCooldown(skill.id, skill.cooldown);
    }

    // Update UI (HP/Mana bars, etc.)
    this.scene.emitStatsUpdate();
  }

  /**
   * Actually spawn and play the skill animation at the target’s location.
   */
  triggerSkillAnimation(skill, targetedMob) {
    if (!targetedMob) {
      this.scene.chatManager.addMessage(
        `No target found for animation of ${skill.name}.`
      );
      return;
    }

    const scene = this.scene;
    // Create a sprite at the mob’s position
    const skillSprite = scene.add.sprite(
      targetedMob.x,
      targetedMob.y,
      `${skill.name}_anim`  // The loaded texture key
    );
    skillSprite.setScale(1);

    // Attempt to play the animation
    const animKey = `${skill.name}_anim`; // e.g. "magic_wip_anim"
    // If the animation doesn't exist or fails, Phaser warns "Missing animation"
    skillSprite.play(animKey);

    // Once animation completes, fade out & destroy
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
   * Cancels the current cast if we’re in the middle of one.
   */
  cancelCasting() {
    if (!this.isCasting) return;

    this.scene.chatManager.addMessage(
      `Casting of ${this.currentCastingSkill.name} has been canceled.`
    );

    this.isCasting = false;
    this.currentCastingSkill = null;

    if (this.castingTimer) {
      this.castingTimer.remove(false);
      this.castingTimer = null;
    }
    if (this.rangeCheckTimer) {
      this.rangeCheckTimer.remove(false);
      this.rangeCheckTimer = null;
    }
    if (this.delayedCall) {
      this.delayedCall.remove(false);
      this.delayedCall = null;
    }

    this.scene.uiManager.hideCastingProgress();
  }

  /**
   * Returns whether the skill can be used (not on cooldown, not casting, enough mana).
   */
  canUseSkill(skill) {
    if (this.isCasting) return false;
    if (this.cooldowns[skill.id] && this.cooldowns[skill.id] > 0) return false;
    const playerStats = this.getPlayerStats();
    if (playerStats.currentMana < skill.manaCost) return false;
    return true;
  }
}
