// managers/MobManager.js

import { mobsData } from "../data/MOCKdata.js";
import { calculateMeleeDamage, calculateMagicDamage } from "../helpers/calculatePlayerStats.js";

export default class MobManager {
  constructor(scene) {
    this.scene = scene;
    this.mobs = null; // physics group
  }

  createMobs(tilemap) {
    // Create group
    this.mobs = this.scene.physics.add.group({ collideWorldBounds: true });

    // Collide with scene layers
    this.scene.physics.add.collider(this.mobs, this.scene.player);
    this.scene.physics.add.collider(this.mobs, this.scene.collisionLayer);
    this.scene.physics.add.collider(this.mobs, this.mobs);

    // Get spawn zones from the tilemap
    const mobSpawns = tilemap
      .getObjectLayer("GameObjects")
      .objects.filter((obj) => obj.name.startsWith("MobSpawnZone"));

    mobSpawns.forEach((spawnZone) => {
      const mobTypeID = "slime"; // You might want to vary this based on spawnZone properties
      const mobInfo = mobsData[mobTypeID];
      const mob = this.mobs.create(spawnZone.x, spawnZone.y, "characters");

      mob.customData = {
        id: mobTypeID,
        hp: mobInfo.health,
        magicDefense: mobInfo.magicDefense, // Ensure magicDefense is part of mobInfo
        spawnX: spawnZone.x,
        spawnY: spawnZone.y,
        isDead: false,
        currentType: mobInfo.mobType, // 'friend' or 'enemy'
        state: "idle",               // 'idle', 'chasing', 'attacking'
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
        mob.x, mob.y,
        player.x, player.y
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
      if (!mob.active || mob.customData.isDead || mob.customData.state !== "idle") {
        return;
      }
      const randomDirection = Phaser.Math.Between(0, 3);
      const speed = 50;

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

    const chaseSpeed = 80;
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
    const playerStats = this.scene.getPlayerStats();
    let damage = 0;

    if (mobInfo.meleeAttack >= mobInfo.magicAttack) {
      // Melee
      damage = calculateMeleeDamage(mobStats, playerStats);
    } else {
      // Magic
      damage = calculateMagicDamage(mobStats, playerStats);
    }

    console.log(`Mob "${mob.customData.id}" attacks player for ${damage} damage.`);
    this.scene.currentHealth = Math.max(0, this.scene.currentHealth - damage);
    this.scene.updateUI(); // reflect damage

    if (this.scene.currentHealth <= 0) {
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

    console.log(`Respawning mob "${mob.customData.id}" at (${mob.x},${mob.y}).`);
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
        this.chasePlayer(mob, this.scene.player, mobsData[mob.customData.id]);
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
      meleeDefense: mob.customData.meleeDefense, // Ensure meleeDefense is present
      // Add other stats if necessary
    };
  }
}
