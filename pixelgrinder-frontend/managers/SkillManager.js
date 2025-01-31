// managers/SkillManager.js

import { SKILL_RANGE_EXTENDER } from "../data/MOCKdata.js";
import {
  calculateMagicDamage,
  calculateMeleeDamage,
} from "../helpers/calculatePlayerStats.js";

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
    this.skills = this.scene.playerSkills;
  }

  createSkillAnimations() {
    // If your MainScene already defines skill animations, you can do nothing here
  }

  isAttackEvaded(evasionStat) {
    const roll = Phaser.Math.FloatBetween(0, 100);
    return roll < evasionStat;
  }

  useSkill(skill) {
    if (this.isCasting) {
      this.scene.chatManager.addMessage("Currently casting another skill.");
      return { success: false };
    }
    if (this.cooldowns[skill.id] && this.cooldowns[skill.id] > 0) {
      const cdTime = this.cooldowns[skill.id].toFixed(1);
      this.scene.chatManager.addMessage(
        `${skill.name} is on cooldown for ${cdTime}s.`
      );
      return { success: false };
    }

    const playerStats = this.getPlayerStats();
    const neededMana = Math.round(skill.manaCost);
    if (playerStats.currentMana < neededMana) {
      this.scene.chatManager.addMessage("Not enough mana to use this skill.");
      return { success: false };
    }

    const targetedMob = this.scene.targetedMob;
    if (!targetedMob) {
      this.scene.chatManager.addMessage("No target selected.");
      return { success: false };
    }

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

    // If there's a castingTime
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

    this.scene.chatManager.addMessage(`Casting ${skill.name}...`);
    this.scene.uiManager.showCastingProgress(skill.name, skill.castingTime);

    const totalTime = skill.castingTime;
    let elapsedTime = 0;

    // Timer to update progress bar
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

    // Range-check loop
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

  executeSkill(skill, targetedMob) {
    // Deduct mana
    const manaNeeded = Math.round(skill.manaCost);
    this.scene.deductMana(manaNeeded);

    // If skill has magicAttack
    if (skill.magicAttack > 0 && targetedMob) {
      const playerStats = this.getPlayerStats();
      const mobStats = this.scene.mobManager.getStats(targetedMob);

      const evaded = this.isAttackEvaded(mobStats.magicEvasion || 0);
      if (evaded) {
        this.scene.chatManager.addMessage(
          `${skill.name} was evaded by Mob ${targetedMob.customData.id}.`
        );
      } else {
        let damage = calculateMagicDamage(playerStats, mobStats, skill.magicAttack);
        damage = Math.round(damage);
        this.scene.mobManager.applyDamageToMob(targetedMob, damage);

        this.scene.chatManager.addMessage(
          `${skill.name} hit Mob ${targetedMob.customData.id} for ${damage} magic damage.`
        );
        this.triggerSkillAnimation(skill, targetedMob);
      }
    }

    // If skill has a heal property
    if (skill.heal) {
      const amount = Math.round(skill.heal);
      const p = this.scene.playerManager;
      p.currentHealth = Math.min(p.maxHealth, p.currentHealth + amount);
      this.scene.chatManager.addMessage(`${skill.name} healed for ${amount}.`);
    }

    // If skill has a cooldown
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

    this.scene.emitStatsUpdate();
  }

  triggerSkillAnimation(skill, targetedMob) {
    if (!targetedMob) return;

    const scene = this.scene;
    const skillSprite = scene.add.sprite(targetedMob.x, targetedMob.y, `${skill.name}_anim`);
    skillSprite.setScale(1);
    skillSprite.play(`${skill.name}_anim`);

    skillSprite.on("animationcomplete", () => {
      scene.tweens.add({
        targets: skillSprite,
        alpha: 0,
        duration: 500,
        onComplete: () => skillSprite.destroy(),
      });
    });
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
