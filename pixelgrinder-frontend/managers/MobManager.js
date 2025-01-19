// managers/MobManager.js

import {
  mobsData,
  MOB_CHASE_SPEED_MULT,
  SKILL_RANGE_EXTENDER,
  TAB_TARGET_RANGE,
  expModifierRules, // <-- import the new exp rules
} from "../data/MOCKdata.js";
import {
  calculateMeleeDamage,
  calculateMagicDamage,
} from "../helpers/calculatePlayerStats.js";

export default class MobManager {
  constructor(scene) {
    this.scene = scene;
    this.mobs = null; // physics group
  }

  createMobs(tilemap) {
    // Create group
    this.mobs = this.scene.physics.add.group({ collideWorldBounds: true });

    // Collide with scene layers
    this.scene.physics.add.collider(this.mobs, this.scene.playerManager.player);
    this.scene.physics.add.collider(this.mobs, this.scene.collisionLayer);
    this.scene.physics.add.collider(this.mobs, this.mobs);

    // Get spawn zones from the tilemap
    const mobSpawns = tilemap
      .getObjectLayer("GameObjects")
      .objects.filter((obj) => obj.name.startsWith("MobSpawnZone"));

    mobSpawns.forEach((spawnZone) => {
      // For demonstration, let's just spawn "slime" at each spawn zone.
      // In your actual game, you might parse spawnZone properties to decide mob type.
      const mobTypeID = "slime";
      const mobInfo = mobsData[mobTypeID];
      const mob = this.mobs.create(spawnZone.x, spawnZone.y, "characters");

      mob.customData = {
        id: mobTypeID,
        hp: mobInfo.health,
        magicDefense: mobInfo.magicDefense || 0,
        meleeDefense: mobInfo.meleeDefense || 0,
        magicEvasion: mobInfo.magicEvasion || 0,
        meleeEvasion: mobInfo.meleeEvasion || 0,
        spawnX: spawnZone.x,
        spawnY: spawnZone.y,
        isDead: false,
        currentType: mobInfo.mobType, // 'friend' or 'enemy'
        state: "idle",
        lastAttackTime: 0,
        hpText: null,
      };

      // HP text above mob
      mob.customData.hpText = this.scene.add
        .text(spawnZone.x, spawnZone.y - 20, `HP: ${mob.customData.hp}`, {
          font: "14px Arial",
          fill: "#ffffff",
          shadow: {
            offsetX: 2,
            offsetY: 2,
            color: "#000000",
            blur: 2,
            stroke: true,
            fill: true,
          },
        })
        .setOrigin(0.5);

      // Make the mob clickable
      mob.setInteractive({ useHandCursor: true });
      mob.on("pointerdown", () => {
        this.scene.onMobClicked(mob);
      });

      mob.setScale(1);
      mob.anims.play("mob-walk-down");
      this.assignRandomIdleMovement(mob);
    });
  }

  /**
   * Determines if an attack is evaded based on the defender's evasion stat.
   *
   * @param {number} evasionStat - The evasion stat of the defender.
   * @returns {boolean} - True if the attack is evaded; otherwise, false.
   */
  isAttackEvaded(evasionStat) {
    const evasionChance = 1 * evasionStat; // 1% per evasion point
    const roll = Phaser.Math.FloatBetween(0, 100);
    return roll < evasionChance;
  }

  /**
   * Update AI for each mob
   */
  updateMobs(player) {
    this.mobs.getChildren().forEach((mob) => {
      if (!mob.active || mob.customData.isDead) return;

      // Keep HP text above the mob
      if (mob.customData.hpText) {
        mob.customData.hpText.setPosition(mob.x, mob.y - 20);
      }

      const mobKey = mob.customData.id;
      const mobInfo = mobsData[mobKey];
      if (!mobInfo) return;

      const distanceToPlayer = Phaser.Math.Distance.Between(
        mob.x,
        mob.y,
        player.x,
        player.y
      );

      if (mob.customData.currentType !== "enemy") {
        // If it's not an enemy, maybe it just does random movement
        return;
      }

      switch (mob.customData.state) {
        case "idle":
          if (distanceToPlayer <= mobInfo.mobAgroRange) {
            mob.customData.state = "chasing";
            console.log(`Mob "${mobKey}" starts chasing player.`);
            this.chasePlayer(mob, player, mobInfo);
          }
          break;
        case "chasing":
          if (distanceToPlayer > mobInfo.mobAgroRange) {
            // Lost player
            this.stopChasing(mob);
            console.log(`Mob "${mobKey}" stops chasing (out of range).`);
          } else if (distanceToPlayer > mobInfo.attackRange) {
            // Keep chasing
            this.chasePlayer(mob, player, mobInfo);
          } else {
            // Switch to attacking
            mob.body.setVelocity(0, 0);
            mob.anims.stop();
            mob.customData.state = "attacking";
            console.log(`Mob "${mobKey}" is attacking player.`);
          }
          break;
        case "attacking":
          if (distanceToPlayer > mobInfo.attackRange) {
            mob.customData.state = "chasing";
            console.log(`Mob "${mobKey}" resumes chasing player.`);
          } else {
            // Attack logic
            this.mobAttackPlayer(mob, mobInfo);
          }
          break;
      }
    });
  }

  /**
   * Simple random movement for idle mobs
   */
  assignRandomIdleMovement(mob) {
    const changeDirection = () => {
      if (
        !mob.active ||
        mob.customData.isDead ||
        mob.customData.state !== "idle"
      ) {
        return;
      }
      const mobInfo = mobsData[mob.customData.id];
      if (!mobInfo) return;

      const speed = mobInfo.speed; // Use speed from mobsData

      const randomDirection = Phaser.Math.Between(0, 3);

      switch (randomDirection) {
        case 0: // Right
          mob.body.setVelocity(speed, 0);
          mob.anims.play("mob-walk-right", true);
          break;
        case 1: // Left
          mob.body.setVelocity(-speed, 0);
          mob.anims.play("mob-walk-left", true);
          break;
        case 2: // Down
          mob.body.setVelocity(0, speed);
          mob.anims.play("mob-walk-down", true);
          break;
        case 3: // Up
          mob.body.setVelocity(0, -speed);
          mob.anims.play("mob-walk-up", true);
          break;
      }

      this.scene.time.addEvent({
        delay: Phaser.Math.Between(3000, 7000),
        callback: changeDirection,
        callbackScope: this,
      });
    };

    changeDirection();
  }

  /**
   * Make the mob chase the player
   */
  chasePlayer(mob, player, mobInfo) {
    const direction = new Phaser.Math.Vector2(player.x - mob.x, player.y - mob.y);
    direction.normalize();

    const chaseSpeed = mobInfo.speed * MOB_CHASE_SPEED_MULT;
    mob.body.setVelocity(direction.x * chaseSpeed, direction.y * chaseSpeed);

    if (Math.abs(direction.x) > Math.abs(direction.y)) {
      if (direction.x > 0) {
        mob.anims.play("mob-walk-right", true);
      } else {
        mob.anims.play("mob-walk-left", true);
      }
    } else {
      if (direction.y > 0) {
        mob.anims.play("mob-walk-down", true);
      } else {
        mob.anims.play("mob-walk-up", true);
      }
    }
  }

  /**
   * Stop chasing and return to idle
   */
  stopChasing(mob) {
    mob.customData.state = "idle";
    mob.body.setVelocity(0, 0);
    this.assignRandomIdleMovement(mob);
  }

  /**
   * Mob attempts to attack the player
   */
  mobAttackPlayer(mob, mobInfo) {
    const currentTime = this.scene.time.now;
    if (currentTime < mob.customData.lastAttackTime + mobInfo.attackCooldown) {
      return; // still on cooldown
    }

    mob.customData.lastAttackTime = currentTime;

    // Decide melee or magic
    const mobStats = {
      magicAttack: mobInfo.magicAttack,
      meleeAttack: mobInfo.meleeAttack,
    };
    const playerStats = this.scene.playerManager.getPlayerStats();
    let damage = 0;

    if (mobInfo.meleeAttack >= mobInfo.magicAttack) {
      // Melee
      const meleeEvasion = playerStats.meleeEvasion || 0;
      const evaded = this.isAttackEvaded(meleeEvasion);

      if (evaded) {
        console.log(
          `Player evaded melee attack from Mob "${mob.customData.id}".`
        );
        return; // Prevent further execution
      }

      damage = calculateMeleeDamage(mobStats, playerStats);
      console.log(
        `Mob "${mob.customData.id}" attacks player for ${damage} melee damage.`
      );
    } else {
      // Magic
      const magicEvasion = playerStats.magicEvasion || 0;
      const evaded = this.isAttackEvaded(magicEvasion);

      if (evaded) {
        console.log(
          `Player evaded magic attack from Mob "${mob.customData.id}".`
        );
        return; // Prevent further execution
      }

      damage = calculateMagicDamage(mobStats, playerStats);
      console.log(
        `Mob "${mob.customData.id}" casts magic on player for ${damage} magic damage.`
      );
    }

    // Apply damage only if not evaded
    this.scene.playerManager.currentHealth = Math.max(
      0,
      this.scene.playerManager.currentHealth - damage
    );
    this.scene.updateUI(); // reflect damage

    if (this.scene.playerManager.currentHealth <= 0) {
      this.scene.handlePlayerDeath();
    }
  }

  /**
   * Called when a mob's HP reaches 0
   */
  handleMobDeath(mob) {
    mob.customData.isDead = true;
    mob.body.setVelocity(0, 0);
    mob.anims.play("mob-dead", true);

    // Determine the final experience reward with level-based multipliers
    const mobInfo = mobsData[mob.customData.id];
    const baseExp = mobInfo.expReward || 0;

    // Grab levels
    const mobLevel = mobInfo.level || 1;
    const playerLevel = this.scene.playerManager.getPlayerStats().level
      ? this.scene.playerManager.getPlayerStats().level
      : this.scene.playerProfile.level;

    // Calculate difference: mobLevel - playerLevel
    const difference = mobLevel - playerLevel;
    const finalExp = this.calculateModifiedExp(baseExp, difference);

    // Grant final EXP
    if (finalExp > 0) {
      this.scene.playerManager.gainExperience(finalExp);
      console.log(
        `Player gained ${finalExp} (modified) EXP from defeating ${mob.customData.id}.`
      );
    } else {
      console.log(
        `Player is too high level or difference is too large (difference=${difference}). No EXP awarded.`
      );
    }

    // Hide after a short delay
    this.scene.time.delayedCall(1000, () => {
      mob.setActive(false).setVisible(false);
      mob.body.setEnable(false);
      mob.customData.hpText.setVisible(false);

      // Respawn after 5s
      this.scene.time.addEvent({
        delay: 5000,
        callback: () => {
          this.respawnMob(mob);
        },
      });
    });
  }

  /**
   * Returns the final EXP after applying the level difference rules.
   * @param {number} baseExp - The mob's base EXP reward
   * @param {number} difference - (mobLevel - playerLevel)
   * @returns {number} finalExp
   */
  calculateModifiedExp(baseExp, difference) {
    // difference = mobLevel - playerLevel
    // For example rules:
    //   >= +5 => 120%
    //   +4 => 115%
    //   +3 => 110%
    //   +2 => 105%
    //   +1 => 103%
    //   0 => 100%
    //   -1 => 97%
    //   -2 => 90%
    //   -3 => 80%
    //   -4 => 75%
    //   -5 => 50%
    //   below -5 => 0

    let multiplier = 1.0; // default

    if (difference >= 5) {
      multiplier = expModifierRules.mobAtLeast5Higher; // 1.2 => 120%
    } else if (difference === 4) {
      multiplier = expModifierRules.mob4Higher; // 1.15
    } else if (difference === 3) {
      multiplier = expModifierRules.mob3Higher; // 1.1
    } else if (difference === 2) {
      multiplier = expModifierRules.mob2Higher; // 1.05
    } else if (difference === 1) {
      multiplier = expModifierRules.mob1Higher; // 1.03
    } else if (difference === 0) {
      multiplier = expModifierRules.equalLevel; // 1.0
    } else if (difference === -1) {
      multiplier = expModifierRules.player1Higher; // 0.97
    } else if (difference === -2) {
      multiplier = expModifierRules.player2Higher; // 0.9
    } else if (difference === -3) {
      multiplier = expModifierRules.player3Higher; // 0.8
    } else if (difference === -4) {
      multiplier = expModifierRules.player4Higher; // 0.75
    } else if (difference === -5) {
      multiplier = expModifierRules.player5Higher; // 0.5
    } else if (difference < -5) {
      multiplier = expModifierRules.none; // 0 => no exp
    }

    const finalExp = Math.floor(baseExp * multiplier);
    return finalExp;
  }

  /**
   * Respawn a dead mob
   */
  respawnMob(mob) {
    const mobInfo = mobsData[mob.customData.id];
    if (!mobInfo) return;

    mob.customData.hp = mobInfo.health;
    mob.customData.currentType = mobInfo.mobType;
    mob.customData.state = "idle";
    mob.customData.isDead = false;

    mob.x = mob.customData.spawnX;
    mob.y = mob.customData.spawnY;

    mob.setActive(true).setVisible(true);
    mob.body.setEnable(true);

    mob.customData.hpText.setText(`HP: ${mob.customData.hp}`);
    mob.customData.hpText.setPosition(mob.x, mob.y - 20);
    mob.customData.hpText.setVisible(true);

    mob.body.setVelocity(0, 0);
    mob.anims.play("mob-walk-down");
    mob.clearTint();

    console.log(
      `Respawning mob "${mob.customData.id}" at (${mob.x}, ${mob.y}).`
    );
    this.assignRandomIdleMovement(mob);
  }

  /**
   * Apply damage to mob
   */
  applyDamageToMob(mob, damage) {
    mob.customData.hp = Math.max(0, mob.customData.hp - damage);
    mob.customData.hpText.setText(`HP: ${mob.customData.hp}`);

    if (mob.customData.hp <= 0) {
      console.log("Mob died!");
      this.handleMobDeath(mob);
      this.scene.targetedMob = null;
    } else {
      // If mob was friend, it becomes enemy
      if (mob.customData.currentType === "friend") {
        mob.customData.currentType = "enemy";
        mob.customData.state = "chasing";
        console.log(`Mob "${mob.customData.id}" became enemy.`);
        this.chasePlayer(
          mob,
          this.scene.playerManager.player,
          mobsData[mob.customData.id]
        );
      }
    }
  }

  /**
   * Retrieve stats of a given mob
   * @param {Phaser.GameObjects.Sprite} mob
   * @returns {Object} mobStats
   */
  getStats(mob) {
    return {
      magicDefense: mob.customData.magicDefense,
      meleeDefense: mob.customData.meleeDefense,
      magicEvasion: mob.customData.magicEvasion,
      meleeEvasion: mob.customData.meleeEvasion,
    };
  }

  /**
   * Cycle through available targets within range.
   */
  cycleTarget(player, range, callback) {
    const mobsInRange = this.mobs.getChildren().filter((mob) => {
      if (mob.customData.isDead) return false;
      const distance = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        mob.x,
        mob.y
      );
      return distance <= range;
    });

    if (mobsInRange.length === 0) {
      console.log("No mobs within TAB targeting range.");
      return;
    }

    // Sort mobs by distance from the player (closest first)
    mobsInRange.sort((a, b) => {
      const distanceA = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        a.x,
        a.y
      );
      const distanceB = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        b.x,
        b.y
      );
      return distanceA - distanceB;
    });

    // Cycle to the next target
    this.scene.currentTargetIndex =
      (this.scene.currentTargetIndex + 1) % mobsInRange.length;

    // Set the new targeted mob
    const mob = mobsInRange[this.scene.currentTargetIndex];
    this.scene.targetedMob = mob;

    // Highlight the targeted mob
    this.highlightMob(mob);

    console.log(`Targeted Mob: ${mob.customData.id} at (${mob.x}, ${mob.y})`);

    if (typeof callback === "function") {
      callback();
    }
  }

  highlightMob(mob) {
    // Clear previous tints
    this.mobs.getChildren().forEach((m) => m.clearTint());

    // Apply a tint to the targeted mob
    mob.setTint(0xff0000);
  }

  onMobClicked(mob) {
    if (!mob.active) return;

    // Clear previous tints
    this.mobs.getChildren().forEach((m) => m.clearTint());

    mob.setTint(0xff0000);
    this.scene.targetedMob = mob;

    // Re-compute the sorted list
    const player = this.scene.playerManager.player;
    const mobsInRange = this.mobs.getChildren().filter((mob) => {
      if (mob.customData.isDead) return false;
      const distance = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        mob.x,
        mob.y
      );
      return distance <= TAB_TARGET_RANGE;
    });

    mobsInRange.sort((a, b) => {
      const distanceA = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        a.x,
        a.y
      );
      const distanceB = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        b.x,
        b.y
      );
      return distanceA - distanceB;
    });

    // Update currentTargetIndex based on clicked mob
    this.scene.currentTargetIndex = mobsInRange.indexOf(mob);

    console.log(`Mob clicked: ${mob.customData.id} at (${mob.x}, ${mob.y})`);
  }
}
