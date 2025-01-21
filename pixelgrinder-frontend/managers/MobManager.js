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
      // Example: always spawn "slime"
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

        // For idle/wandering logic
        idleTimer: null,
        wanderTimer: null,
        wanderDirection: new Phaser.Math.Vector2(0, 0),
        visionDistance: 50, // how far ahead to check for obstacles

        // For chasing/stuck logic
        lastChaseCheckTime: 0,
        lastPosition: { x: spawnZone.x, y: spawnZone.y },
        stuckCheckInterval: 1000, // check every 1 second
        isUnsticking: false,
      };

      // HP text above the mob
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

      // Begin idle/wander cycle
      this.assignRandomIdleOrWander(mob);
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
   * Update loop for all mobs. Called from scene's update().
   */
  updateMobs(player) {
    this.mobs.getChildren().forEach((mob) => {
      if (!mob.active || mob.customData.isDead) return;

      // Update HP text position
      if (mob.customData.hpText) {
        mob.customData.hpText.setPosition(mob.x, mob.y - 20);
      }

      const mobKey = mob.customData.id;
      const mobInfo = mobsData[mobKey];
      if (!mobInfo) return;

      // Non-enemy mobs only idle/wander, skip chase/attack
      if (mob.customData.currentType !== "enemy") {
        if (mob.customData.state === "wandering") {
          this.updateWandering(mob);
        }
        return;
      }

      // Enemy mobs: check distance to player
      const distanceToPlayer = Phaser.Math.Distance.Between(
        mob.x,
        mob.y,
        player.x,
        player.y
      );

      switch (mob.customData.state) {
        case "idle":
          // If player is within agro range, start chasing
          if (distanceToPlayer <= mobInfo.mobAgroRange) {
            mob.customData.state = "chasing";
            mob.body.setVelocity(0, 0);
            console.log(`Mob "${mobKey}" starts chasing player.`);
          }
          // If wandering, do obstacle checks
          break;

        case "wandering":
          // Still do idle/wandering logic
          this.updateWandering(mob);
          // If player is within agro range
          if (distanceToPlayer <= mobInfo.mobAgroRange) {
            mob.customData.state = "chasing";
            mob.body.setVelocity(0, 0);
            console.log(`Mob "${mobKey}" starts chasing player.`);
          }
          break;

        case "chasing":
          this.updateChasing(mob, player, mobInfo, distanceToPlayer);
          break;

        case "attacking":
          this.updateAttacking(mob, player, mobInfo, distanceToPlayer);
          break;

        case "unsticking":
          // Do nothing special here, the unstick logic runs via a timer
          // that eventually returns mob to 'chasing' state
          break;
      }
    });
  }

  // --------------------------------------------------------
  // IDLE / WANDERING LOGIC
  // --------------------------------------------------------

  /**
   * Decide whether the mob is going to idle or wander next.
   * Use random durations and a 50/50 chance to pick one or the other.
   */
  assignRandomIdleOrWander(mob) {
    if (!mob.active || mob.customData.isDead) return;

    // Clear any old timers
    if (mob.customData.idleTimer) {
      mob.customData.idleTimer.remove();
      mob.customData.idleTimer = null;
    }
    if (mob.customData.wanderTimer) {
      mob.customData.wanderTimer.remove();
      mob.customData.wanderTimer = null;
    }

    const doIdle = Phaser.Math.Between(0, 1) === 0; // 50% chance

    if (doIdle) {
      // IDLE
      mob.customData.state = "idle";
      mob.body.setVelocity(0, 0);
      mob.anims.stop();

      const idleDuration = Phaser.Math.Between(2000, 5000);
      mob.customData.idleTimer = this.scene.time.addEvent({
        delay: idleDuration,
        callback: () => {
          this.startWandering(mob);
        },
      });
    } else {
      // WANDER
      this.startWandering(mob);
    }
  }

  /**
   * Put the mob into a wandering state in a random direction
   * for a random duration.
   */
  startWandering(mob) {
    if (!mob.active || mob.customData.isDead) return;

    mob.customData.state = "wandering";

    const mobInfo = mobsData[mob.customData.id];
    const speed = mobInfo.speed;

    // Possible directions
    const directions = [
      { x: 1, y: 0, anim: "mob-walk-right" },
      { x: -1, y: 0, anim: "mob-walk-left" },
      { x: 0, y: 1, anim: "mob-walk-down" },
      { x: 0, y: -1, anim: "mob-walk-up" },
    ];
    const chosen = Phaser.Utils.Array.GetRandom(directions);

    mob.customData.wanderDirection.set(chosen.x, chosen.y);

    // Set velocity and anim
    mob.body.setVelocity(chosen.x * speed, chosen.y * speed);
    mob.anims.play(chosen.anim, true);

    const wanderDuration = Phaser.Math.Between(3000, 7000);
    mob.customData.wanderTimer = this.scene.time.addEvent({
      delay: wanderDuration,
      callback: () => {
        this.assignRandomIdleOrWander(mob);
      },
      loop: false,
    });
  }

  /**
   * While wandering, periodically check if there's an obstacle
   * ahead. If so, pick a new idle/wander state.
   */
  updateWandering(mob) {
    const dir = mob.customData.wanderDirection;
    if (dir.lengthSq() === 0) return; // not moving, no check

    // Look ahead
    const nextX = mob.x + dir.x * mob.customData.visionDistance;
    const nextY = mob.y + dir.y * mob.customData.visionDistance;

    const tile = this.scene.collisionLayer.getTileAtWorldXY(nextX, nextY);
    if (tile && tile.collides) {
      // Obstacle ahead, choose new state
      this.assignRandomIdleOrWander(mob);
    }
  }

  // --------------------------------------------------------
  // CHASING LOGIC
  // --------------------------------------------------------

  /**
   * Called each frame while mob is in "chasing" state.
   */
  updateChasing(mob, player, mobInfo, distanceToPlayer) {
    // If player too far, stop chasing
    if (distanceToPlayer > mobInfo.mobAgroRange) {
      console.log(`Mob "${mob.customData.id}" stops chasing (out of range).`);
      this.stopChasing(mob);
      return;
    }

    // If in attack range, switch to attacking
    if (distanceToPlayer <= mobInfo.attackRange) {
      mob.customData.state = "attacking";
      mob.body.setVelocity(0, 0);
      mob.anims.stop();
      console.log(`Mob "${mob.customData.id}" is attacking player.`);
      return;
    }

    // Otherwise keep chasing
    this.chasePlayer(mob, player, mobInfo);

    // Check if stuck
    const now = this.scene.time.now;
    if (now - mob.customData.lastChaseCheckTime >= mob.customData.stuckCheckInterval) {
      mob.customData.lastChaseCheckTime = now;
      const distMoved = Phaser.Math.Distance.Between(
        mob.x,
        mob.y,
        mob.customData.lastPosition.x,
        mob.customData.lastPosition.y
      );

      if (distMoved < 5) {
        // Stuck
        console.log(`Mob "${mob.customData.id}" is stuck. Attempting to unstick...`);
        mob.customData.state = "unsticking";
        mob.customData.isUnsticking = true;
        this.performUnsticking(mob);
      } else {
        // Update lastPosition
        mob.customData.lastPosition.x = mob.x;
        mob.customData.lastPosition.y = mob.y;
      }
    }
  }

  /**
   * Actually set velocity and animation to chase the player.
   */
  chasePlayer(mob, player, mobInfo) {
    const direction = new Phaser.Math.Vector2(player.x - mob.x, player.y - mob.y).normalize();
    const chaseSpeed = mobInfo.speed * MOB_CHASE_SPEED_MULT;

    mob.body.setVelocity(direction.x * chaseSpeed, direction.y * chaseSpeed);

    // Choose animation
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
   * Stop chasing and return to idle/wander.
   */
  stopChasing(mob) {
    mob.body.setVelocity(0, 0);
    mob.customData.state = "idle";
    this.assignRandomIdleOrWander(mob);
  }

  // --------------------------------------------------------
  // UNSTICKING LOGIC
  // --------------------------------------------------------

  /**
   * Called when mob is stuck in chasing state. Turn left or right for a moment,
   * then go back to chasing.
   */
  performUnsticking(mob) {
    if (!mob.active || mob.customData.isDead) return;

    // Randomly pick left or right turn
    const pickLeft = Phaser.Math.Between(0, 1) === 0;
    // Current chase direction from velocity
    const vx = mob.body.velocity.x;
    const vy = mob.body.velocity.y;
    const currentDir = new Phaser.Math.Vector2(vx, vy).normalize();

    // Turn left: (dx, dy) -> (dy, -dx)
    // Turn right: (dx, dy) -> (-dy, dx)
    let turnDir;
    if (pickLeft) {
      turnDir = new Phaser.Math.Vector2(currentDir.y, -currentDir.x);
    } else {
      turnDir = new Phaser.Math.Vector2(-currentDir.y, currentDir.x);
    }

    const mobInfo = mobsData[mob.customData.id];
    const sideSpeed = mobInfo.speed;

    // Move sideways briefly
    mob.body.setVelocity(turnDir.x * sideSpeed, turnDir.y * sideSpeed);

    // Set animation for the turn
    if (Math.abs(turnDir.x) > Math.abs(turnDir.y)) {
      if (turnDir.x > 0) mob.anims.play("mob-walk-right", true);
      else mob.anims.play("mob-walk-left", true);
    } else {
      if (turnDir.y > 0) mob.anims.play("mob-walk-down", true);
      else mob.anims.play("mob-walk-up", true);
    }

    // After half a second, return to chasing
    this.scene.time.addEvent({
      delay: 500, // Duration of sideways movement in milliseconds
      callback: () => {
        mob.customData.state = "chasing";
        mob.customData.isUnsticking = false;

        // Reset position tracking
        mob.customData.lastPosition.x = mob.x;
        mob.customData.lastPosition.y = mob.y;
      },
    });
  }

  // --------------------------------------------------------
  // ATTACKING LOGIC
  // --------------------------------------------------------

  updateAttacking(mob, player, mobInfo, distanceToPlayer) {
    if (distanceToPlayer > mobInfo.attackRange) {
      mob.customData.state = "chasing";
      console.log(`Mob "${mob.customData.id}" resumes chasing player.`);
      return;
    }
    // Otherwise, continue attacking
    this.mobAttackPlayer(mob, mobInfo);
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
        console.log(`Player evaded melee attack from Mob "${mob.customData.id}".`);
        return;
      }

      damage = calculateMeleeDamage(mobStats, playerStats);
      console.log(`Mob "${mob.customData.id}" attacks player for ${damage} melee damage.`);
    } else {
      // Magic
      const magicEvasion = playerStats.magicEvasion || 0;
      const evaded = this.isAttackEvaded(magicEvasion);

      if (evaded) {
        console.log(`Player evaded magic attack from Mob "${mob.customData.id}".`);
        return;
      }

      damage = calculateMagicDamage(mobStats, playerStats);
      console.log(`Mob "${mob.customData.id}" casts magic on player for ${damage} magic damage.`);
    }

    // Apply damage
    this.scene.playerManager.currentHealth = Math.max(
      0,
      this.scene.playerManager.currentHealth - damage
    );
    this.scene.updateUI(); // reflect damage

    if (this.scene.playerManager.currentHealth <= 0) {
      this.scene.handlePlayerDeath();
    }
  }

  // --------------------------------------------------------
  // DEATH / RESPAWN / DAMAGE
  // --------------------------------------------------------

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
        `Player is too high level or difference too large (difference=${difference}). No EXP awarded.`
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
   * Returns the final EXP after applying level difference rules.
   */
  calculateModifiedExp(baseExp, difference) {
    let multiplier = 1.0;
    if (difference >= 5) {
      multiplier = expModifierRules.mobAtLeast5Higher; // e.g. 1.2
    } else if (difference === 4) {
      multiplier = expModifierRules.mob4Higher; // e.g. 1.15
    } else if (difference === 3) {
      multiplier = expModifierRules.mob3Higher; // e.g. 1.1
    } else if (difference === 2) {
      multiplier = expModifierRules.mob2Higher; // e.g. 1.05
    } else if (difference === 1) {
      multiplier = expModifierRules.mob1Higher; // e.g. 1.03
    } else if (difference === 0) {
      multiplier = expModifierRules.equalLevel; // e.g. 1.0
    } else if (difference === -1) {
      multiplier = expModifierRules.player1Higher; // e.g. 0.97
    } else if (difference === -2) {
      multiplier = expModifierRules.player2Higher; // e.g. 0.9
    } else if (difference === -3) {
      multiplier = expModifierRules.player3Higher; // e.g. 0.8
    } else if (difference === -4) {
      multiplier = expModifierRules.player4Higher; // e.g. 0.75
    } else if (difference === -5) {
      multiplier = expModifierRules.player5Higher; // e.g. 0.5
    } else if (difference < -5) {
      multiplier = expModifierRules.none; // 0 => no exp
    }
    return Math.floor(baseExp * multiplier);
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

    console.log(`Respawning mob "${mob.customData.id}" at (${mob.x}, ${mob.y}).`);
    this.assignRandomIdleOrWander(mob);
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
        this.chasePlayer(mob, this.scene.playerManager.player, mobsData[mob.customData.id]);
      }
    }
  }

  /**
   * Retrieve stats of a given mob
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
   * Cycle through available targets within range (TAB targeting).
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

    // Sort by distance (closest first)
    mobsInRange.sort((a, b) => {
      const distanceA = Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y);
      const distanceB = Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y);
      return distanceA - distanceB;
    });

    // Cycle to next target
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
    const mobsInRange = this.mobs.getChildren().filter((mobItem) => {
      if (mobItem.customData.isDead) return false;
      const distance = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        mobItem.x,
        mobItem.y
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
