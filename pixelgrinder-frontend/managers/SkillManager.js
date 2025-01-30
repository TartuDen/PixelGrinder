// managers/SkillManager.js

import { SKILL_RANGE_EXTENDER } from "../data/MOCKdata.js";
import { calculateMagicDamage, calculateMeleeDamage } from "../helpers/calculatePlayerStats.js";

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
    // this.skills = this.scene.playerSkills; 
    // (But the scene might pass them differently. Just keep usage consistent.)
    this.skills = this.scene.playerSkills;
  }

  createSkillAnimations() {
    // No extra needed here. 
  }

  isAttackEvaded(evasionStat) {
    const evasionChance = 1 * evasionStat;
    const roll = Phaser.Math.FloatBetween(0, 100);
    return roll < evasionChance;
  }

  useSkill(skill) {
    if (this.isCasting) {
      this.scene.chatManager.addMessage("Currently casting another skill. Please wait.");
      return { success: false };
    }

    if (this.cooldowns[skill.id] && this.cooldowns[skill.id] > 0) {
      this.scene.chatManager.addMessage(
        `${skill.name} is on cooldown for ${this.cooldowns[skill.id].toFixed(1)}s.`
      );
      return { success: false };
    }

    const playerStats = this.getPlayerStats();
    this.scene.chatManager.addMessage(
      `Current Mana: ${playerStats.currentMana} / ${playerStats.maxMana}`
    );
    if (playerStats.currentMana < skill.manaCost) {
      this.scene.chatManager.addMessage("Not enough mana to use this skill.");
      return { success: false };
    }

    const targetedMob = this.scene.targetedMob;
    if (!targetedMob) {
      this.scene.chatManager.addMessage("No target selected for skill casting.");
      return { success: false };
    }

    const player = this.scene.playerManager.player;
    if (!player) {
      this.scene.chatManager.addMessage("PlayerManager.player is undefined.");
      return { success: false };
    }

    const distance = Phaser.Math.Distance.Between(player.x, player.y, targetedMob.x, targetedMob.y);
    if (distance > skill.range) {
      this.scene.chatManager.addMessage(
        `Target is out of range for ${skill.name}. Dist=${distance}, Range=${skill.range}.`
      );
      return { success: false };
    }

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

    this.castingTimer = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        elapsedTime += 0.1;
        this.scene.uiManager.updateCastingProgress(elapsedTime, totalTime);

        if (elapsedTime >= totalTime && this.castingTimer) {
          this.castingTimer.remove(false);
          this.castingTimer = null;
        }
      },
      callbackScope: this,
      loop: true,
    });

    this.delayedCall = this.scene.time.delayedCall(
      skill.castingTime * 1000,
      () => {
        if (!this.isCasting) {
          return;
        }
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
      },
      [],
      this
    );

    this.rangeCheckTimer = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.isCasting || !targetedMob.active) {
          if (this.rangeCheckTimer) {
            this.rangeCheckTimer.remove(false);
            this.rangeCheckTimer = null;
          }
          return;
        }

        const currentDistance = Phaser.Math.Distance.Between(
          this.scene.playerManager.player.x,
          this.scene.playerManager.player.y,
          targetedMob.x,
          targetedMob.y
        );
        const extendedRange = skill.range * SKILL_RANGE_EXTENDER;

        if (currentDistance > extendedRange) {
          this.scene.chatManager.addMessage(
            `Casting of ${skill.name} canceled. Target moved out of extended range.`
          );
          this.cancelCasting();
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  executeSkill(skill, targetedMob) {
    const player = this.scene.playerManager.player;
    this.scene.deductMana(skill.manaCost);

    if (skill.magicAttack > 0 && targetedMob) {
      const playerStats = this.getPlayerStats();
      const mobStats = this.scene.mobManager.getStats(targetedMob);

      const evaded = this.isAttackEvaded(mobStats.magicEvasion || 0);
      if (evaded) {
        this.scene.chatManager.addMessage(
          `${skill.name} was evaded by Mob ${targetedMob.customData.id}.`
        );
      } else {
        const damage = calculateMagicDamage(
          playerStats,
          mobStats,
          skill.magicAttack
        );
        this.scene.mobManager.applyDamageToMob(targetedMob, damage);
        this.scene.chatManager.addMessage(
          `${skill.name} used on Mob ${targetedMob.customData.id}, dealing ${damage} magic damage.`
        );
        this.triggerSkillAnimation(skill, player, targetedMob);
      }

      if (skill.expReward && damage > 0) {
        this.scene.playerManager.gainExperience(skill.expReward);
      }
    }

    if (skill.heal) {
      const amount = skill.heal;
      this.scene.playerManager.currentHealth = Math.min(
        this.scene.playerManager.maxHealth,
        this.scene.playerManager.currentHealth + amount
      );
      this.scene.chatManager.addMessage(`${skill.name} healed for ${amount} HP.`);
    }

    if (skill.cooldown > 0) {
      this.cooldowns[skill.id] = skill.cooldown;
      this.scene.time.addEvent({
        delay: skill.cooldown * 1000,
        callback: () => {
          this.cooldowns[skill.id] = 0;
          this.scene.chatManager.addMessage(`${skill.name} is now off cooldown.`);
          this.scene.uiManager.updateSkillCooldown(skill.id, 0);
        },
        callbackScope: this,
      });
      this.scene.uiManager.updateSkillCooldown(skill.id, skill.cooldown);
    }

    this.scene.emitStatsUpdate();
  }

  triggerSkillAnimation(skill, player, target) {
    const scene = this.scene;
    if (!target) {
      scene.chatManager.addMessage(`No target available for ${skill.name} animation.`);
      return;
    }

    const skillSprite = scene.add.sprite(target.x, target.y, `${skill.name}_anim`);
    skillSprite.setScale(1);
    skillSprite.play(`${skill.name}_anim`);

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

  canUseSkill(skill) {
    if (this.isCasting) return false;
    if (this.cooldowns[skill.id] && this.cooldowns[skill.id] > 0) return false;
    const playerStats = this.getPlayerStats();
    if (playerStats.currentMana < skill.manaCost) return false;
    return true;
  }
}
