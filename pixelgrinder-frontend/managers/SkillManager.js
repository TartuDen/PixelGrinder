// managers/SkillManager.js

/**
 * SkillManager
 * 
 * Handles the usage of player skills, including casting times and cooldowns.
 * Integrates with UIManager for visual feedback.
 */

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
    // Implement skill-specific animations here if needed.
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
      console.log(`${skill.name} is on cooldown for ${this.cooldowns[skill.id].toFixed(1)} more seconds.`);
      return { success: false };
    }

    // Retrieve current player stats.
    const playerStats = this.getPlayerStats();
    if (playerStats.currentMana < skill.manaCost) {
      console.log("Not enough mana to use this skill.");
      return { success: false };
    }

    // If the skill has a casting time, initiate casting; otherwise, execute immediately.
    if (skill.castingTime > 0) {
      this.castSkill(skill);
    } else {
      this.executeSkill(skill);
    }

    return { success: true };
  }

  /**
   * Initiates the casting process for a skill with a casting time.
   * 
   * @param {Object} skill - The skill object being cast.
   */
  castSkill(skill) {
    this.isCasting = true;
    this.currentCastingSkill = skill;

    console.log(`Casting ${skill.name}...`);

    // Display the casting indicator in the UI.
    // Removed: No casting indicator modal.

    // Schedule the execution of the skill after the casting time.
    this.scene.time.delayedCall(
      skill.castingTime * 1000,
      () => {
        this.executeSkill(skill);
        this.isCasting = false;
        this.currentCastingSkill = null;

        // Hide the casting indicator from the UI.
        // Removed: No casting indicator modal.

        // Removed: No audio
      },
      [],
      this
    );
  }

  /**
   * Executes the effects of a skill, such as dealing damage or healing.
   * Initiates the skill's cooldown.
   * 
   * @param {Object} skill - The skill object to execute.
   */
  executeSkill(skill) {
    const player = this.scene.player;
    const targetedMob = this.scene.targetedMob;

    // Deduct the skill's mana cost from the player.
    this.scene.deductMana(skill.manaCost);

    // Apply damage to the targeted mob if the skill deals damage.
    if (skill.magicAttack > 0 && targetedMob) {
      this.scene.mobManager.applyDamageToMob(targetedMob, skill.magicAttack);
      console.log(`${skill.name} used on Mob ${targetedMob.customData.id}, dealing ${skill.magicAttack} magic damage.`);
    }

    // Apply healing to the player if the skill heals.
    if (skill.heal) {
      this.scene.currentHealth = Math.min(this.scene.maxHealth, this.scene.currentHealth + skill.heal);
      console.log(`${skill.name} healed for ${skill.heal} HP.`);
    }

    // Start the skill's cooldown if applicable.
    if (skill.cooldown > 0) {
      this.cooldowns[skill.id] = skill.cooldown;

      // Schedule the end of the cooldown.
      this.scene.time.addEvent({
        delay: skill.cooldown * 1000,
        callback: () => {
          this.cooldowns[skill.id] = 0;
          console.log(`${skill.name} is now off cooldown.`);
          this.scene.uiManager.updateSkillCooldown(skill.id, 0);
        },
        callbackScope: this,
      });

      // Update the UI to show the cooldown overlay.
      this.scene.uiManager.updateSkillCooldown(skill.id, skill.cooldown);
    }

    // Refresh the UI to reflect changes in mana and health.
    this.scene.updateUI();
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
