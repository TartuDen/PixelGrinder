// managers/SkillManager.js
import { playerSkills, mobsData } from "../data/MOCKdata.js";
import {
  calculateMagicDamage,
  calculateMeleeDamage,
} from "../helpers/calculatePlayerStats.js";

export default class SkillManager {
  /**
   * @param {Phaser.Scene} scene 
   * @param {Function} getPlayerStats - a function that returns current player stats
   */
  constructor(scene, getPlayerStats) {
    this.scene = scene;
    this.getPlayerStats = getPlayerStats;
  }

  /**
   * Preload skill icons & sprites
   */
  preloadSkills() {
    playerSkills.forEach((skill, index) => {
      this.scene.load.image(`skill-icon-${index}`, skill.icon);
      this.scene.load.spritesheet(`skill-sprite-${index}`, skill.skillImage, {
        frameWidth: 72,
        frameHeight: 72,
      });
    });
  }

  /**
   * Create skill animations
   */
  createSkillAnimations() {
    playerSkills.forEach((skill, index) => {
      const animKey = `skill-anim-${index}`;
      this.scene.anims.create({
        key: animKey,
        frames: this.scene.anims.generateFrameNumbers(`skill-sprite-${index}`, {
          start: skill.animationSeq[0],
          end: skill.animationSeq[1],
        }),
        frameRate: 10,
        repeat: 0,
      });
    });
  }

  /**
   * Use a skill on a target
   * @param {*} skill - skill data object
   * @param {Number} playerCurrentMana
   * @param {*} target - mob sprite
   */
  useSkill(skill, playerCurrentMana, target) {
    if (playerCurrentMana < skill.manaCost) {
      console.log(`Not enough mana for ${skill.name}!`);
      return { success: false, damage: 0 };
    }
    if (!target) {
      console.log(`No target for skill: ${skill.name}`);
      return { success: false, damage: 0 };
    }

    let damage = 0;
    const { magicAttack, meleeAttack } = skill;

    if (magicAttack > 0) {
      damage = this.useMagicSkill(skill, target);
    } else if (meleeAttack > 0) {
      damage = this.useMeleeSkill(skill, target);
    } else {
      console.log(`Skill ${skill.name} has no recognized damage type!`);
      return { success: false, damage: 0 };
    }

    return { success: true, damage };
  }

  useMagicSkill(skill, target) {
    const mobKey = target.customData.id;
    const mobStats = mobsData[mobKey];
    const playerStats = this.getPlayerStats();

    let baseDamage = calculateMagicDamage(playerStats, mobStats);
    baseDamage += skill.magicAttack;

    // Show animation
    this.playSkillAnimation(skill, target.x, target.y);
    return baseDamage;
  }

  useMeleeSkill(skill, target) {
    const mobKey = target.customData.id;
    const mobStats = mobsData[mobKey];
    const playerStats = this.getPlayerStats();

    let baseDamage = calculateMeleeDamage(playerStats, mobStats);
    baseDamage += skill.meleeAttack;

    this.playSkillAnimation(skill, target.x, target.y);
    return baseDamage;
  }

  /**
   * Play skill animation at x,y
   */
  playSkillAnimation(skill, x, y) {
    const skillIndex = playerSkills.indexOf(skill);
    if (skillIndex === -1) {
      console.log(`Skill not found: ${skill.name}`);
      return;
    }

    const animKey = `skill-anim-${skillIndex}`;
    if (!this.scene.anims.exists(animKey)) {
      console.log(`Animation does not exist: ${animKey}`);
      return;
    }

    const sprite = this.scene.add.sprite(x, y, `skill-sprite-${skillIndex}`);
    sprite.anims.play(animKey);
    sprite.setScale(1.5);

    sprite.on("animationcomplete", () => {
      sprite.destroy();
    });
  }
}
