// File: managers/SkillManager.js

import { SKILL_RANGE_EXTENDER } from "../data/MOCKdata.js";
import {
  calculateMagicDamage,
  calculateMeleeDamage,
} from "../helpers/calculatePlayerStats.js";
import { isAttackEvaded, triggerSkillAnimation } from "../helpers/combat.js";

export default class SkillManager {
  constructor(scene, getPlayerStatsCallback) {
    this.scene = scene;
    this.getPlayerStats = getPlayerStatsCallback;

    this.skills = [];
    this.cooldowns = {};
    this.isCasting = false;
    this.currentCastingSkill = null;

    this.castingTimer = null;
    this.rangeCheckTimer = null;
    this.delayedCall = null;
  }

  preloadSkills() {
    // Load the player's known skills.
    this.skills = this.scene.playerSkills;
  }

  createSkillAnimations() {
    // If your MainScene already defines skill animations,
    // you can skip or keep this empty.
  }

  useSkill(skill) {
    // If we are already casting something else, block.
    if (this.isCasting) {
      this.scene.chatManager.addMessage("Currently casting another skill.");
      return { success: false };
    }

    // If skill is on cooldown
    if (this.cooldowns[skill.id] && this.cooldowns[skill.id] > 0) {
      const cdTime = this.cooldowns[skill.id].toFixed(1);
      this.scene.chatManager.addMessage(
        `${skill.name} is on cooldown for ${cdTime}s.`
      );
      return { success: false };
    }

    // Check mana
    const playerStats = this.getPlayerStats();
    const neededMana = Math.round(skill.manaCost);
    if (playerStats.currentMana < neededMana) {
      this.scene.chatManager.addMessage("Not enough mana to use this skill.");
      return { success: false };
    }

    // --- SELF-CAST SKILL (range=0) ---
    if (skill.range <= 0) {
      // Bypass target checks
      if (skill.castingTime > 0) {
        this.castSkill(skill, null /*no mob needed*/);
      } else {
        this.executeSkill(skill, null);
      }
      return { success: true };
    }

    // Otherwise, we have a normal (offensive or melee) skill that needs a target
    const targetedMob = this.scene.targetedMob;
    if (!targetedMob) {
      this.scene.chatManager.addMessage("No target selected.");
      return { success: false };
    }

    // Check range
    const distance = Phaser.Math.Distance.Between(
      this.scene.playerManager.player.x,
      this.scene.playerManager.player.y,
      targetedMob.x,
      targetedMob.y
    );
    if (distance > skill.range) {
      this.scene.chatManager.addMessage(
        `Target out of range for ${skill.name}. Dist=${distance.toFixed(
          1
        )}, Range=${skill.range.toFixed(1)}.`
      );
      return { success: false };
    }

    // Start cast if needed
    if (skill.castingTime > 0) {
      this.castSkill(skill, targetedMob);
    } else {
      this.executeSkill(skill, targetedMob);
    }
    return { success: true };
  }

  castSkill(skill, targetedMob) {
    this.isCasting = true;
    this.currentCastingSkill = skill;

    // Show progress
    this.scene.chatManager.addMessage(`Casting ${skill.name}...`);
    this.scene.uiManager.showCastingProgress(skill.name, skill.castingTime);

    const totalTime = skill.castingTime;
    let elapsedTime = 0;

    // Timer for updating progress bar
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

    // Delayed call for finishing cast
    this.delayedCall = this.scene.time.delayedCall(
      skill.castingTime * 1000,
      () => {
        if (!this.isCasting) return;

        // Actually perform the skill effect
        this.executeSkill(skill, targetedMob);

        // End casting
        this.isCasting = false;
        this.currentCastingSkill = null;

        if (this.castingTimer) {
          this.castingTimer.remove(false);
          this.castingTimer = null;
        }
        this.scene.uiManager.hideCastingProgress();

        // Clean up range check
        if (this.rangeCheckTimer) {
          this.rangeCheckTimer.remove(false);
          this.rangeCheckTimer = null;
        }
        this.delayedCall = null;
      }
    );

    // If we have a mob target, do a range check loop
    if (targetedMob) {
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
          const dist = Phaser.Math.Distance.Between(
            this.scene.playerManager.player.x,
            this.scene.playerManager.player.y,
            targetedMob.x,
            targetedMob.y
          );
          const extendedRange = skill.range * SKILL_RANGE_EXTENDER;
          if (dist > extendedRange) {
            this.scene.chatManager.addMessage(
              `Casting of ${skill.name} canceled. Target left extended range.`
            );
            this.cancelCasting();
          }
        },
      });
    }
  }

  executeSkill(skill, targetedMob) {
    // Deduct mana
    const manaNeeded = Math.round(skill.manaCost);
    this.scene.deductMana(manaNeeded);

    // ===================
    // 1) SELF-CAST LOGIC
    // ===================
    if (skill.range <= 0) {
      // If skill has direct healing values
      let hpHealed = skill.healHP || 0;
      let mpHealed = skill.healMP || 0;

      // Apply the healing to the player
      const p = this.scene.playerManager;
      const oldHP = p.currentHealth;
      const oldMP = p.currentMana;

      p.currentHealth = Math.min(p.maxHealth, p.currentHealth + hpHealed);
      p.currentMana = Math.min(p.maxMana, p.currentMana + mpHealed);

      const actualHPgain = p.currentHealth - oldHP;
      const actualMPgain = p.currentMana - oldMP;

      this.scene.chatManager.addMessage(
        `${skill.name} restored +${actualHPgain} HP and +${actualMPgain} MP to you.`
      );

      // Optional animation near the player
      triggerSkillAnimation(this.scene, skill, this.scene.playerManager.player);

    } else {
      // =====================
      // 2) NORMAL (Offensive)
      // =====================
      if (targetedMob) {
        const playerStats = this.getPlayerStats();
        const mobStats = this.scene.mobManager.getStats(targetedMob);

        // MAGIC Attack check
        if (skill.magicAttack > 0) {
          const evaded = isAttackEvaded(mobStats.magicEvasion || 0);
          if (evaded) {
            this.scene.chatManager.addMessage(
              `${skill.name} was evaded by Mob ${targetedMob.customData.id}.`
            );
          } else {
            // Add skill's magicAttack to player's own
            let damage = calculateMagicDamage(
              { ...playerStats }, // attacker stats
              mobStats,
              skill.magicAttack
            );
            damage = Math.round(damage);
            this.scene.mobManager.applyDamageToMob(targetedMob, damage);

            this.scene.chatManager.addMessage(
              `${skill.name} hit Mob ${targetedMob.customData.id} for ${damage} magic damage.`
            );
            triggerSkillAnimation(this.scene, skill, targetedMob);
          }
        }
        // MELEE Attack check
        else if (skill.meleeAttack > 0) {
          const evaded = isAttackEvaded(mobStats.meleeEvasion || 0);
          if (evaded) {
            this.scene.chatManager.addMessage(
              `${skill.name} was evaded by Mob ${targetedMob.customData.id}.`
            );
          } else {
            // Combine player's meleeAttack + skill's meleeAttack
            const combinedStats = {
              ...playerStats,
              meleeAttack: playerStats.meleeAttack + skill.meleeAttack,
            };
            let damage = calculateMeleeDamage(combinedStats, mobStats);
            damage = Math.round(damage);
            this.scene.mobManager.applyDamageToMob(targetedMob, damage);

            this.scene.chatManager.addMessage(
              `${skill.name} hit Mob ${targetedMob.customData.id} for ${damage} melee damage.`
            );
            triggerSkillAnimation(this.scene, skill, targetedMob);
          }
        }
      }
    }

    // ===================
    // 3) HANDLE COOLDOWN
    // ===================
    if (skill.cooldown > 0) {
      this.cooldowns[skill.id] = skill.cooldown;
      this.scene.uiManager.updateSkillCooldown(skill.id, skill.cooldown);

      this.scene.time.addEvent({
        delay: skill.cooldown * 1000,
        callback: () => {
          this.cooldowns[skill.id] = 0;
          this.scene.chatManager.addMessage(`${skill.name} is off cooldown.`);
          this.scene.uiManager.updateSkillCooldown(skill.id, 0);
        },
      });
    }

    // Finally update UI
    this.scene.emitStatsUpdate();
  }

  cancelCasting() {
    if (!this.isCasting) return;

    this.scene.chatManager.addMessage(
      `Casting of ${this.currentCastingSkill.name} canceled.`
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

  canUseSkill(skill) {
    if (this.isCasting) return false;
    if (this.cooldowns[skill.id] && this.cooldowns[skill.id] > 0) return false;
    const playerStats = this.getPlayerStats();
    return playerStats.currentMana >= Math.round(skill.manaCost);
  }
}
