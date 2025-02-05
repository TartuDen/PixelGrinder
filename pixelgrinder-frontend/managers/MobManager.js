// File: managers/MobManager.js

import {
  mobsData,
  MOB_CHASE_SPEED_MULT,
  SKILL_RANGE_EXTENDER,
  TAB_TARGET_RANGE,
  expModifierRules,
  MOB_CORPSE_DURATION,
  allGameSkills,
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
    this.scene.physics.add.collider(this.mobs, this.scene.gatherRockLayer);
    this.scene.physics.add.collider(this.mobs, this.mobs);

    // Get spawn zones from the tilemap
    const mobSpawns = tilemap
      .getObjectLayer("GameObjects")
      .objects.filter((obj) => obj.name.startsWith("MobSpawnZone"));

    mobSpawns.forEach((spawnZone) => {
      // For demonstration, always spawn "slime" here
      const mobTypeID = "slime";
      const mobInfo = mobsData[mobTypeID];
      const mob = this.mobs.create(spawnZone.x, spawnZone.y, "characters");

      mob.setPushable(false);

      mob.customData = {
        id: mobTypeID,
        hp: mobInfo.health,
        mana: mobInfo.mana || 0,
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

        // For wandering
        idleTimer: null,
        wanderTimer: null,
        wanderDirection: new Phaser.Math.Vector2(0, 0),
        visionDistance: 50,
        lastChaseCheckTime: 0,
        lastPosition: { x: spawnZone.x, y: spawnZone.y },
        stuckCheckInterval: 1000,
        isUnsticking: false,

        droppedLoot: [],

        // Skills and skill usage
        mobSkills: this.extractMobSkillsFromLoot(mobInfo.lootTable),
        mobSkillCooldowns: {},
        isCastingSkill: false,
        healingThreshold: mobInfo.healingSkillHPThreshold || 0.3,
      };

      // Create an overhead container for name + HP + Mana
      this.createMobUIContainer(mob, mobInfo);

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

  // ------------------------------------------
  // Create small container: Name, HP bar, Mana
  // ------------------------------------------
  createMobUIContainer(mob, mobInfo) {
    // Place container above the mob. We’ll fine-tune position in updateMobUI().
    const container = this.scene.add.container(mob.x, mob.y - 40);

    // 1) Name Text (smaller font, centered)
    const nameText = this.scene.add
      .text(0, 0, mobInfo.name, {
        font: "12px Arial",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0);

    // 2) HP Bar (Graphics)
    //   We'll do a background, then a fill
    //   Place it below the name text, say at y=16
    const hpBarBG = this.scene.add.graphics();
    hpBarBG.fillStyle(0x333333, 1);
    // This bar is 40 wide, 4 high, centered horizontally
    hpBarBG.fillRect(-20, 16, 40, 4);

    const hpBarFill = this.scene.add.graphics();

    // 3) Mana Bar (Graphics)
    //   Another background + fill
    //   Place it at y=22 so it's just a few pixels below HP bar
    const manaBarBG = this.scene.add.graphics();
    manaBarBG.fillStyle(0x333333, 1);
    manaBarBG.fillRect(-20, 22, 40, 4);

    const manaBarFill = this.scene.add.graphics();

    // Add them all to the container
    container.add([nameText, hpBarBG, hpBarFill, manaBarBG, manaBarFill]);

    // Store references for update
    mob.customData.uiContainer = container;
    mob.customData.nameText = nameText;
    mob.customData.hpBarFill = hpBarFill;
    mob.customData.manaBarFill = manaBarFill;
  }

  // -------------------------------------
  // Update container position & bar fills
  // -------------------------------------
  updateMobUI(mob) {
    const container = mob.customData.uiContainer;
    if (!container) return;

    // Move container 40 px above the mob's Y
    container.setPosition(mob.x, mob.y - 40);

    // Update HP fill
    const mobInfo = mobsData[mob.customData.id];
    const currentHP = mob.customData.hp;
    const maxHP = mobInfo.health;
    const hpPercent = Math.max(0, currentHP / maxHP);

    // The bar fill is 40 px wide max, 4 px high
    const hpBarFill = mob.customData.hpBarFill;
    hpBarFill.clear();
    hpBarFill.fillStyle(0xe74c3c, 1);
    hpBarFill.fillRect(-20, 16, 40 * hpPercent, 4);

    // Update Mana fill
    const manaBarFill = mob.customData.manaBarFill;
    manaBarFill.clear();
    if (mobInfo.mana && mobInfo.mana > 0) {
      const currentMana = mob.customData.mana;
      const maxMana = mobInfo.mana;
      const manaPercent = Math.max(0, currentMana / maxMana);
      manaBarFill.fillStyle(0x3498db, 1);
      manaBarFill.fillRect(-20, 22, 40 * manaPercent, 4);
    }
  }

  extractMobSkillsFromLoot(lootTable) {
    const skillList = [];
    lootTable.forEach((entry) => {
      const skill = allGameSkills.find((sk) => sk.id === entry.itemId);
      if (skill) {
        skillList.push({ ...skill });
      }
    });
    return skillList;
  }

  isAttackEvaded(evasionStat) {
    const roll = Phaser.Math.FloatBetween(0, 100);
    return roll < evasionStat;
  }

  updateMobs(player) {
    this.mobs.getChildren().forEach((mob) => {
      if (!mob.active) return;

      // Update overhead UI
      this.updateMobUI(mob);

      if (mob.customData.isDead) return;

      const mobKey = mob.customData.id;
      const mobInfo = mobsData[mobKey];
      if (!mobInfo) return;

      // If not an enemy, skip chase/attack logic
      if (mob.customData.currentType !== "enemy") {
        if (mob.customData.state === "wandering") {
          this.updateWandering(mob);
        }
        return;
      }

      // Enemy logic
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

  // --------------------------------------------------------
  // IDLE / WANDERING
  // --------------------------------------------------------
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

    const doIdle = Phaser.Math.Between(0, 1) === 0; // 50% chance
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
      // If we run into a wall or obstacle, pick a new behavior
      this.assignRandomIdleOrWander(mob);
    }
  }

  // --------------------------------------------------------
  // CHASING (with skill-range logic)
  // --------------------------------------------------------
  updateChasing(mob, player, mobInfo, distanceToPlayer) {
    // If this mob has skill(s) and mana, it tries to stay at that skill range
    const skillRange = this.getMobMaxSkillRange(mob);
    const canUseSkill = (skillRange > 0 && mob.customData.mana > 0);

    // Use skill range if canUseSkill is true, else fallback to normal attack range
    const desiredRange = canUseSkill ? skillRange : mobInfo.attackRange;

    // If out of agro range entirely
    if (distanceToPlayer > mobInfo.mobAgroRange) {
      this.scene.chatManager.addMessage(
        `Mob "${mob.customData.id}" stops chasing (out of range).`
      );
      this.stopChasing(mob);
      return;
    }

    // If close enough, start attacking
    if (distanceToPlayer <= desiredRange) {
      mob.customData.state = "attacking";
      mob.body.setVelocity(0, 0);
      mob.anims.stop();
      this.scene.chatManager.addMessage(
        `Mob "${mob.customData.id}" is attacking player.`
      );
      return;
    }

    this.chasePlayer(mob, player, mobInfo);

    // Check if stuck
    const now = this.scene.time.now;
    if (
      now - mob.customData.lastChaseCheckTime >= mob.customData.stuckCheckInterval
    ) {
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
    const direction = new Phaser.Math.Vector2(
      player.x - mob.x,
      player.y - mob.y
    ).normalize();
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

  getMobMaxSkillRange(mob) {
    let maxRange = 0;
    if (mob.customData.mobSkills && mob.customData.mobSkills.length > 0) {
      mob.customData.mobSkills.forEach((skill) => {
        if (skill.range && skill.range > maxRange) {
          maxRange = skill.range;
        }
      });
    }
    return maxRange;
  }

  // --------------------------------------------------------
  // ATTACKING
  // --------------------------------------------------------
  updateAttacking(mob, player, mobInfo, distanceToPlayer) {
    // If out of agro range, go idle
    if (distanceToPlayer > mobInfo.mobAgroRange) {
      mob.customData.state = "idle";
      this.scene.chatManager.addMessage(
        `Mob "${mob.customData.id}" stops attacking (player left agro range).`
      );
      return;
    }

    // If the mob is casting, skip
    if (mob.customData.isCastingSkill) return;

    // Try skill usage first
    if (this.mobTryUseSkill(mob, player, distanceToPlayer)) {
      return;
    }

    // Then do normal melee if in melee range
    if (distanceToPlayer <= mobInfo.attackRange) {
      this.mobAttackPlayer(mob, mobInfo);
    } else {
      // If not in melee range, go chase
      mob.customData.state = "chasing";
      this.scene.chatManager.addMessage(
        `Mob "${mob.customData.id}" resumes chasing player.`
      );
    }
  }

  mobTryUseSkill(mob, player, distanceToPlayer) {
    const mobSkills = mob.customData.mobSkills;
    if (!mobSkills || mobSkills.length === 0) return false;

    // 1) Healing if HP < threshold
    const hpPct = mob.customData.hp / mobsData[mob.customData.id].health;
    if (hpPct < mob.customData.healingThreshold) {
      const healSkill = mobSkills.find((s) => s.healHP || s.healMP);
      if (healSkill && this.canMobCastSkill(mob, healSkill)) {
        this.castMobSkill(mob, healSkill, null);
        return true;
      }
    }

    // 2) Offensive skill if in range
    for (const skill of mobSkills) {
      if (skill.healHP || skill.healMP) continue;
      if (distanceToPlayer <= (skill.range || 0)) {
        if (this.canMobCastSkill(mob, skill)) {
          this.castMobSkill(mob, skill, player);
          return true;
        }
      }
    }

    return false;
  }

  canMobCastSkill(mob, skill) {
    const neededMana = Math.round(skill.manaCost);
    if (mob.customData.mana < neededMana) return false;

    const cdLeft = mob.customData.mobSkillCooldowns[skill.id] || 0;
    if (cdLeft > 0) return false;

    return true;
  }

  castMobSkill(mob, skill, targetSprite) {
    mob.customData.isCastingSkill = true;
    this.scene.chatManager.addMessage(
      `Mob "${mob.customData.id}" begins casting ${skill.name}.`
    );

    if (skill.castingTime > 0) {
      this.scene.time.delayedCall(
        skill.castingTime * 1000,
        () => {
          if (!mob.active || mob.customData.isDead) {
            mob.customData.isCastingSkill = false;
            return;
          }
          this.executeMobSkill(mob, skill, targetSprite);
        },
        null,
        this
      );
    } else {
      this.executeMobSkill(mob, skill, targetSprite);
    }
  }

  executeMobSkill(mob, skill, targetSprite) {
    if (!mob.active || mob.customData.isDead) {
      mob.customData.isCastingSkill = false;
      return;
    }

    // Deduct mana
    const neededMana = Math.round(skill.manaCost);
    mob.customData.mana = Math.max(0, mob.customData.mana - neededMana);

    // Skill effect
    if (skill.healHP || skill.healMP) {
      // Heal
      const totalHP = mobsData[mob.customData.id].health;
      if (skill.healHP) {
        mob.customData.hp = Math.min(
          mob.customData.hp + skill.healHP,
          totalHP
        );
      }
      this.scene.chatManager.addMessage(
        `Mob "${mob.customData.id}" healed itself with ${skill.name}.`
      );
      this.triggerSkillAnimation(skill, mob);
    } else {
      // Offensive
      if (!targetSprite || !targetSprite.active) {
        this.scene.chatManager.addMessage(
          `Mob "${mob.customData.id}"'s ${skill.name} had no valid target.`
        );
      } else {
        const playerStats = this.scene.playerManager.getPlayerStats();
        let damage = 0;
        if (skill.magicAttack > 0) {
          const evaded = this.isAttackEvaded(playerStats.magicEvasion || 0);
          if (evaded) {
            this.scene.chatManager.addMessage(
              `Player evaded mob "${mob.customData.id}"'s ${skill.name} (magic).`
            );
          } else {
            const mobMagicAttack = mobsData[mob.customData.id].magicAttack || 0;
            const totalMagicAttack = mobMagicAttack + skill.magicAttack;
            const mobStats = { magicAttack: totalMagicAttack };
            damage = calculateMagicDamage(mobStats, playerStats);
            this.scene.chatManager.addMessage(
              `Mob "${mob.customData.id}" casts ${skill.name} for ${damage} magic damage.`
            );
            this.scene.playerManager.currentHealth = Math.max(
              0,
              this.scene.playerManager.currentHealth - damage
            );
            if (this.scene.playerManager.currentHealth <= 0) {
              this.scene.handlePlayerDeath();
            }
            this.scene.updateUI();
            this.triggerSkillAnimation(skill, targetSprite);
          }
        } else if (skill.meleeAttack > 0) {
          const evaded = this.isAttackEvaded(playerStats.meleeEvasion || 0);
          if (evaded) {
            this.scene.chatManager.addMessage(
              `Player evaded mob "${mob.customData.id}"'s ${skill.name} (melee).`
            );
          } else {
            const mobMeleeAttack =
              mobsData[mob.customData.id].meleeAttack || 0;
            const totalMelee = mobMeleeAttack + skill.meleeAttack;
            const mobStats = { meleeAttack: totalMelee };
            damage = calculateMeleeDamage(mobStats, playerStats);
            this.scene.chatManager.addMessage(
              `Mob "${mob.customData.id}" uses ${skill.name} for ${damage} melee damage.`
            );
            this.scene.playerManager.currentHealth = Math.max(
              0,
              this.scene.playerManager.currentHealth - damage
            );
            if (this.scene.playerManager.currentHealth <= 0) {
              this.scene.handlePlayerDeath();
            }
            this.scene.updateUI();
            this.triggerSkillAnimation(skill, targetSprite);
          }
        }
      }
    }

    // Start cooldown
    this.startMobSkillCooldown(mob, skill);

    // Casting finished
    mob.customData.isCastingSkill = false;
  }

  startMobSkillCooldown(mob, skill) {
    if (skill.cooldown > 0) {
      mob.customData.mobSkillCooldowns[skill.id] = skill.cooldown;
      this.scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          const cd = mob.customData.mobSkillCooldowns[skill.id];
          if (cd <= 0) {
            mob.customData.mobSkillCooldowns[skill.id] = 0;
          } else {
            mob.customData.mobSkillCooldowns[skill.id] = +(
              cd - 0.1
            ).toFixed(1);
          }
        },
      });
    }
  }

  triggerSkillAnimation(skill, targetSprite) {
    if (!targetSprite) return;
    const scene = this.scene;

    const skillSprite = scene.add.sprite(
      targetSprite.x,
      targetSprite.y,
      `${skill.name}_anim`
    );
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

    // Decide if we do melee or magic
    if (mobInfo.meleeAttack >= mobInfo.magicAttack) {
      const evaded = this.isAttackEvaded(playerStats.meleeEvasion || 0);
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
      const evaded = this.isAttackEvaded(playerStats.magicEvasion || 0);
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

  // --------------------------------------------------------
  // DEATH / RESPAWN / DAMAGE
  // --------------------------------------------------------
  handleMobDeath(mob) {
    mob.customData.isDead = true;
    mob.body.setVelocity(0, 0);
    mob.anims.play("mob-dead", true);
    mob.body.setEnable(false);

    // Award EXP
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

    // Keep corpse for a while, then respawn
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
    mob.customData.mana = mobInfo.mana || 0;
    mob.customData.currentType = mobInfo.mobType;
    mob.customData.state = "idle";
    mob.customData.isDead = false;
    mob.customData.droppedLoot = [];
    mob.customData.mobSkillCooldowns = {};
    mob.customData.isCastingSkill = false;

    mob.x = mob.customData.spawnX;
    mob.y = mob.customData.spawnY;

    mob.setActive(true).setVisible(true);
    mob.body.setEnable(true);

    // Reset overhead UI (e.g., full HP bar)
    this.updateMobUI(mob);

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

    if (mob.customData.hp <= 0) {
      this.scene.chatManager.addMessage("Mob died!");
      this.handleMobDeath(mob);
      this.scene.targetedMob = null;
    } else {
      if (mob.customData.currentType === "friend") {
        mob.customData.currentType = "enemy";
        mob.customData.state = "chasing";
        this.scene.chatManager.addMessage(
          `Mob "${mob.customData.id}" became enemy (now chasing).`
        );
        this.chasePlayer(
          mob,
          this.scene.playerManager.player,
          mobsData[mob.customData.id]
        );
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
      const distance = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        mob.x,
        mob.y
      );
      return distance <= range;
    });

    if (mobsInRange.length === 0) {
      this.scene.chatManager.addMessage("No mobs within TAB targeting range.");
      return;
    }

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

    this.scene.currentTargetIndex =
      (this.scene.currentTargetIndex + 1) % mobsInRange.length;

    const mob = mobsInRange[this.scene.currentTargetIndex];
    this.scene.targetedMob = mob;
    this.highlightMob(mob);

    this.scene.chatManager.addMessage(
      `Targeted Mob: ${mob.customData.id} at (${mob.x}, ${mob.y})`
    );
    if (typeof callback === "function") {
      callback();
    }
  }

  highlightMob(mob) {
    this.mobs.getChildren().forEach((m) => m.clearTint());
    mob.setTint(0xff0000);
  }

  onMobClicked(mob) {
    if (!mob.active) return;

    if (mob.customData.isDead && mob.customData.droppedLoot.length > 0) {
      this.scene.chatManager.addMessage(
        "Mob corpse clicked - opening loot window..."
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

    this.scene.currentTargetIndex = mobsInRange.indexOf(mob);

    this.scene.chatManager.addMessage(
      `Mob clicked: ${mob.customData.id} at (${mob.x}, ${mob.y})`
    );
  }
}
