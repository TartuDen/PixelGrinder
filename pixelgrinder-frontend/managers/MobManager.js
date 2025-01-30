// managers/MobManager.js

import {
  mobsData,
  MOB_CHASE_SPEED_MULT,
  SKILL_RANGE_EXTENDER,
  TAB_TARGET_RANGE,
  expModifierRules,
  MOB_CORPSE_DURATION,
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
      const mobTypeID = "slime"; // example
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
        idleTimer: null,
        wanderTimer: null,
        wanderDirection: new Phaser.Math.Vector2(0, 0),
        visionDistance: 50,
        lastChaseCheckTime: 0,
        lastPosition: { x: spawnZone.x, y: spawnZone.y },
        stuckCheckInterval: 1000,
        isUnsticking: false,
        droppedLoot: [],
      };

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

      mob.setInteractive({ useHandCursor: true });
      mob.on("pointerdown", () => {
        this.scene.onMobClicked(mob);
      });

      mob.setScale(1);
      mob.anims.play("mob-walk-down");

      this.assignRandomIdleOrWander(mob);
    });
  }

  isAttackEvaded(evasionStat) {
    const evasionChance = 1 * evasionStat;
    const roll = Phaser.Math.FloatBetween(0, 100);
    return roll < evasionChance;
  }

  updateMobs(player) {
    this.mobs.getChildren().forEach((mob) => {
      if (!mob.active || mob.customData.isDead) return;

      if (mob.customData.hpText) {
        mob.customData.hpText.setPosition(mob.x, mob.y - 20);
      }

      const mobKey = mob.customData.id;
      const mobInfo = mobsData[mobKey];
      if (!mobInfo) return;

      if (mob.customData.currentType !== "enemy") {
        // Friend: only idle/wander
        if (mob.customData.state === "wandering") {
          this.updateWandering(mob);
        }
        return;
      }

      // Enemy logic:
      const distanceToPlayer = Phaser.Math.Distance.Between(
        mob.x,
        mob.y,
        player.x,
        player.y
      );

      switch (mob.customData.state) {
        case "idle":
          if (distanceToPlayer <= mobInfo.mobAgroRange) {
            mob.customData.state = "chasing";
            mob.body.setVelocity(0, 0);
            this.scene.chatManager.addMessage(
              `Mob "${mobKey}" starts chasing player.`
            );
          }
          break;

        case "wandering":
          this.updateWandering(mob);
          if (distanceToPlayer <= mobInfo.mobAgroRange) {
            mob.customData.state = "chasing";
            mob.body.setVelocity(0, 0);
            this.scene.chatManager.addMessage(
              `Mob "${mobKey}" starts chasing player.`
            );
          }
          break;

        case "chasing":
          this.updateChasing(mob, player, mobInfo, distanceToPlayer);
          break;

        case "attacking":
          this.updateAttacking(mob, player, mobInfo, distanceToPlayer);
          break;

        case "unsticking":
          // do nothing
          break;
      }
    });
  }

  // IDLE / WANDERING
  assignRandomIdleOrWander(mob) {
    if (!mob.active || mob.customData.isDead) return;

    if (mob.customData.idleTimer) {
      mob.customData.idleTimer.remove();
      mob.customData.idleTimer = null;
    }
    if (mob.customData.wanderTimer) {
      mob.customData.wanderTimer.remove();
      mob.customData.wanderTimer = null;
    }

    const doIdle = Phaser.Math.Between(0, 1) === 0;
    if (doIdle) {
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
      this.startWandering(mob);
    }
  }

  startWandering(mob) {
    if (!mob.active || mob.customData.isDead) return;

    mob.customData.state = "wandering";

    const mobInfo = mobsData[mob.customData.id];
    const speed = mobInfo.speed;

    const directions = [
      { x: 1, y: 0, anim: "mob-walk-right" },
      { x: -1, y: 0, anim: "mob-walk-left" },
      { x: 0, y: 1, anim: "mob-walk-down" },
      { x: 0, y: -1, anim: "mob-walk-up" },
    ];
    const chosen = Phaser.Utils.Array.GetRandom(directions);

    mob.customData.wanderDirection.set(chosen.x, chosen.y);
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

  updateWandering(mob) {
    const dir = mob.customData.wanderDirection;
    if (dir.lengthSq() === 0) return;

    const nextX = mob.x + dir.x * mob.customData.visionDistance;
    const nextY = mob.y + dir.y * mob.customData.visionDistance;

    const tile = this.scene.collisionLayer.getTileAtWorldXY(nextX, nextY);
    if (tile && tile.collides) {
      this.assignRandomIdleOrWander(mob);
    }
  }

  // CHASING
  updateChasing(mob, player, mobInfo, distanceToPlayer) {
    if (distanceToPlayer > mobInfo.mobAgroRange) {
      this.scene.chatManager.addMessage(
        `Mob "${mob.customData.id}" stops chasing (out of range).`
      );
      this.stopChasing(mob);
      return;
    }
    if (distanceToPlayer <= mobInfo.attackRange) {
      mob.customData.state = "attacking";
      mob.body.setVelocity(0, 0);
      mob.anims.stop();
      this.scene.chatManager.addMessage(
        `Mob "${mob.customData.id}" is attacking player.`
      );
      return;
    }

    this.chasePlayer(mob, player, mobInfo);

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
        this.scene.chatManager.addMessage(
          `Mob "${mob.customData.id}" is stuck. Attempting to unstick...`
        );
        mob.customData.state = "unsticking";
        mob.customData.isUnsticking = true;
        this.performUnsticking(mob);
      } else {
        mob.customData.lastPosition.x = mob.x;
        mob.customData.lastPosition.y = mob.y;
      }
    }
  }

  chasePlayer(mob, player, mobInfo) {
    const direction = new Phaser.Math.Vector2(player.x - mob.x, player.y - mob.y).normalize();
    const chaseSpeed = mobInfo.speed * MOB_CHASE_SPEED_MULT;

    mob.body.setVelocity(direction.x * chaseSpeed, direction.y * chaseSpeed);

    if (Math.abs(direction.x) > Math.abs(direction.y)) {
      if (direction.x > 0) mob.anims.play("mob-walk-right", true);
      else mob.anims.play("mob-walk-left", true);
    } else {
      if (direction.y > 0) mob.anims.play("mob-walk-down", true);
      else mob.anims.play("mob-walk-up", true);
    }
  }

  stopChasing(mob) {
    mob.body.setVelocity(0, 0);
    mob.customData.state = "idle";
    this.assignRandomIdleOrWander(mob);
  }

  performUnsticking(mob) {
    if (!mob.active || mob.customData.isDead) return;

    const pickLeft = Phaser.Math.Between(0, 1) === 0;
    const vx = mob.body.velocity.x;
    const vy = mob.body.velocity.y;
    const currentDir = new Phaser.Math.Vector2(vx, vy).normalize();

    let turnDir;
    if (pickLeft) {
      turnDir = new Phaser.Math.Vector2(currentDir.y, -currentDir.x);
    } else {
      turnDir = new Phaser.Math.Vector2(-currentDir.y, currentDir.x);
    }

    const mobInfo = mobsData[mob.customData.id];
    const sideSpeed = mobInfo.speed;

    mob.body.setVelocity(turnDir.x * sideSpeed, turnDir.y * sideSpeed);

    if (Math.abs(turnDir.x) > Math.abs(turnDir.y)) {
      if (turnDir.x > 0) mob.anims.play("mob-walk-right", true);
      else mob.anims.play("mob-walk-left", true);
    } else {
      if (turnDir.y > 0) mob.anims.play("mob-walk-down", true);
      else mob.anims.play("mob-walk-up", true);
    }

    this.scene.time.addEvent({
      delay: 500,
      callback: () => {
        mob.customData.state = "chasing";
        mob.customData.isUnsticking = false;
        mob.customData.lastPosition.x = mob.x;
        mob.customData.lastPosition.y = mob.y;
      },
    });
  }

  // ATTACKING
  updateAttacking(mob, player, mobInfo, distanceToPlayer) {
    if (distanceToPlayer > mobInfo.attackRange) {
      mob.customData.state = "chasing";
      this.scene.chatManager.addMessage(
        `Mob "${mob.customData.id}" resumes chasing player.`
      );
      return;
    }
    this.mobAttackPlayer(mob, mobInfo);
  }

  mobAttackPlayer(mob, mobInfo) {
    const currentTime = this.scene.time.now;
    if (currentTime < mob.customData.lastAttackTime + mobInfo.attackCooldown) {
      return;
    }
    mob.customData.lastAttackTime = currentTime;

    const mobStats = {
      magicAttack: mobInfo.magicAttack,
      meleeAttack: mobInfo.meleeAttack,
    };
    const playerStats = this.scene.playerManager.getPlayerStats();
    let damage = 0;

    if (mobInfo.meleeAttack >= mobInfo.magicAttack) {
      const meleeEvasion = playerStats.meleeEvasion || 0;
      const evaded = this.isAttackEvaded(meleeEvasion);
      if (evaded) {
        this.scene.chatManager.addMessage(
          `Player evaded melee attack from Mob "${mob.customData.id}".`
        );
        return;
      }
      damage = calculateMeleeDamage(mobStats, playerStats);
      this.scene.chatManager.addMessage(
        `Mob "${mob.customData.id}" attacks player for ${damage} melee damage.`
      );
    } else {
      const magicEvasion = playerStats.magicEvasion || 0;
      const evaded = this.isAttackEvaded(magicEvasion);
      if (evaded) {
        this.scene.chatManager.addMessage(
          `Player evaded magic attack from Mob "${mob.customData.id}".`
        );
        return;
      }
      damage = calculateMagicDamage(mobStats, playerStats);
      this.scene.chatManager.addMessage(
        `Mob "${mob.customData.id}" casts magic on player for ${damage} magic damage.`
      );
    }

    this.scene.playerManager.currentHealth = Math.max(
      0,
      this.scene.playerManager.currentHealth - damage
    );
    this.scene.updateUI();

    if (this.scene.playerManager.currentHealth <= 0) {
      this.scene.handlePlayerDeath();
    }
  }

  // DEATH / RESPAWN / DAMAGE
  handleMobDeath(mob) {
    mob.customData.isDead = true;
    mob.body.setVelocity(0, 0);
    mob.anims.play("mob-dead", true);

    const mobInfo = mobsData[mob.customData.id];
    const baseExp = mobInfo.expReward || 0;
    const mobLevel = mobInfo.level || 1;
    const playerLevel = this.scene.playerManager.getPlayerStats().level;

    const difference = mobLevel - playerLevel;
    const finalExp = this.calculateModifiedExp(baseExp, difference);
    if (finalExp > 0) {
      this.scene.playerManager.gainExperience(finalExp);
      this.scene.chatManager.addMessage(
        `Player gained ${finalExp} EXP from defeating ${mob.customData.id}.`
      );
    } else {
      this.scene.chatManager.addMessage(
        `No EXP awarded. (Level diff = ${difference}).`
      );
    }

    // Generate loot
    mob.customData.droppedLoot = this.generateLoot(mobInfo.lootTable);
    this.scene.chatManager.addMessage(
      `Mob dropped loot: ${JSON.stringify(mob.customData.droppedLoot)}`
    );

    // Keep the corpse for MOB_CORPSE_DURATION, then respawn
    this.scene.time.addEvent({
      delay: MOB_CORPSE_DURATION,
      callback: () => {
        this.respawnMob(mob);
      },
    });
  }

  calculateModifiedExp(baseExp, difference) {
    const {
      mobAtLeast5Higher,
      mob4Higher,
      mob3Higher,
      mob2Higher,
      mob1Higher,
      equalLevel,
      player1Higher,
      player2Higher,
      player3Higher,
      player4Higher,
      player5Higher,
      none,
    } = expModifierRules;

    let multiplier = 1.0;
    if (difference >= 5) {
      multiplier = mobAtLeast5Higher;
    } else if (difference === 4) {
      multiplier = mob4Higher;
    } else if (difference === 3) {
      multiplier = mob3Higher;
    } else if (difference === 2) {
      multiplier = mob2Higher;
    } else if (difference === 1) {
      multiplier = mob1Higher;
    } else if (difference === 0) {
      multiplier = equalLevel;
    } else if (difference === -1) {
      multiplier = player1Higher;
    } else if (difference === -2) {
      multiplier = player2Higher;
    } else if (difference === -3) {
      multiplier = player3Higher;
    } else if (difference === -4) {
      multiplier = player4Higher;
    } else if (difference === -5) {
      multiplier = player5Higher;
    } else if (difference < -5) {
      multiplier = none;
    }
    return Math.floor(baseExp * multiplier);
  }

  generateLoot(lootTable = []) {
    const loot = [];
    lootTable.forEach((entry) => {
      const roll = Math.random() * 100;
      if (roll < entry.chance) {
        loot.push(entry.itemId);
      }
    });
    return loot;
  }

  respawnMob(mob) {
    const mobInfo = mobsData[mob.customData.id];
    if (!mobInfo) return;

    mob.customData.hp = mobInfo.health;
    mob.customData.currentType = mobInfo.mobType;
    mob.customData.state = "idle";
    mob.customData.isDead = false;
    mob.customData.droppedLoot = [];

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

    this.scene.chatManager.addMessage(
      `Respawning mob "${mob.customData.id}" at (${mob.x}, ${mob.y}).`
    );
    this.assignRandomIdleOrWander(mob);
  }

  applyDamageToMob(mob, damage) {
    mob.customData.hp = Math.max(0, mob.customData.hp - damage);
    mob.customData.hpText.setText(`HP: ${mob.customData.hp}`);

    if (mob.customData.hp <= 0) {
      this.scene.chatManager.addMessage("Mob died!");
      this.handleMobDeath(mob);
      this.scene.targetedMob = null;
    } else {
      // If mob was friend, it becomes enemy
      if (mob.customData.currentType === "friend") {
        mob.customData.currentType = "enemy";
        mob.customData.state = "chasing";
        this.scene.chatManager.addMessage(
          `Mob "${mob.customData.id}" became enemy (now chasing).`
        );
        this.chasePlayer(mob, this.scene.playerManager.player, mobsData[mob.customData.id]);
      }
    }
  }

  getStats(mob) {
    return {
      magicDefense: mob.customData.magicDefense,
      meleeDefense: mob.customData.meleeDefense,
      magicEvasion: mob.customData.magicEvasion,
      meleeEvasion: mob.customData.meleeEvasion,
    };
  }

  cycleTarget(player, range, callback) {
    const mobsInRange = this.mobs.getChildren().filter((mob) => {
      if (mob.customData.isDead) return false;
      const distance = Phaser.Math.Distance.Between(player.x, player.y, mob.x, mob.y);
      return distance <= range;
    });

    if (mobsInRange.length === 0) {
      this.scene.chatManager.addMessage("No mobs within TAB targeting range.");
      return;
    }

    mobsInRange.sort((a, b) => {
      const distanceA = Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y);
      const distanceB = Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y);
      return distanceA - distanceB;
    });

    this.scene.currentTargetIndex =
      (this.scene.currentTargetIndex + 1) % mobsInRange.length;

    const mob = mobsInRange[this.scene.currentTargetIndex];
    this.scene.targetedMob = mob;
    this.highlightMob(mob);

    this.scene.chatManager.addMessage(
      `Targeted Mob: ${mob.customData.id} at (${mob.x}, ${mob.y})`
    );
    if (typeof callback === "function") callback();
  }

  highlightMob(mob) {
    this.mobs.getChildren().forEach((m) => m.clearTint());
    mob.setTint(0xff0000);
  }

  onMobClicked(mob) {
    if (!mob.active) return;

    // If mob is dead with loot, open loot window
    if (mob.customData.isDead && mob.customData.droppedLoot.length > 0) {
      this.scene.chatManager.addMessage(
        `Mob corpse clicked - opening loot window...`
      );
      this.scene.uiManager.openLootWindow(mob);
      return;
    }

    this.mobs.getChildren().forEach((m) => m.clearTint());
    mob.setTint(0xff0000);
    this.scene.targetedMob = mob;

    const player = this.scene.playerManager.player;
    const mobsInRange = this.mobs.getChildren().filter((mobItem) => {
      if (mobItem.customData.isDead) return false;
      const distance = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        mobItem.x,
        mobItem.y
      );
      return distance <= range;
    });

    // If you want the clicked mob to reorder the TAB cycle index, do so:
    // (But note that "range" is not defined here, you might want TAB_TARGET_RANGE)
    // We'll keep the user’s existing approach.

    this.scene.chatManager.addMessage(
      `Mob clicked: ${mob.customData.id} at (${mob.x}, ${mob.y})`
    );
  }
}
