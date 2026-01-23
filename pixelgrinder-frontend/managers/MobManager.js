// File: managers/MobManager.js

import {
  mobsData,
  MOB_CHASE_SPEED_MULT,
  TAB_TARGET_RANGE,
  expModifierRules,
  MOB_CORPSE_DURATION,
  allGameSkills,
} from "../data/MOCKdata.js";
import {
  calculateMeleeDamage,
  calculateMagicDamage,
} from "../helpers/calculatePlayerStats.js";
import { isAttackEvaded, triggerSkillAnimation } from "../helpers/combat.js";
import EasyStar from "easystarjs";

export default class MobManager {
  constructor(scene) {
    this.scene = scene;
    this.mobs = null;
    this.easystar = null;
    this.pathGrid = null;
    this.tileWidth = 0;
    this.tileHeight = 0;
    this.pathDebugEnabled = false;
    this.pathDebugGraphics = null;
    this.lastDynamicCostUpdate = 0;
  }

  clearIdleWanderTimers(mob) {
    if (mob.customData.idleTimer) {
      mob.customData.idleTimer.remove(false);
      mob.customData.idleTimer = null;
    }
    if (mob.customData.wanderTimer) {
      mob.customData.wanderTimer.remove(false);
      mob.customData.wanderTimer = null;
    }
  }

  hasAggroMemory(mob, behavior, now) {
    if (behavior.aggroDuration <= 0) return false;
    return now - mob.customData.lastAggroTime <= behavior.aggroDuration;
  }

  getMobBehavior(mobInfo) {
    return {
      profile: mobInfo.behaviorProfile || "melee",
      preferredRange:
        typeof mobInfo.preferredRange === "number"
          ? mobInfo.preferredRange
          : mobInfo.attackRange,
      leashRadius:
        typeof mobInfo.leashRadius === "number"
          ? mobInfo.leashRadius
          : mobInfo.mobAgroRange * 1.5,
      aggroDuration:
        typeof mobInfo.aggroDuration === "number" ? mobInfo.aggroDuration : 6000,
      strafeChance:
        typeof mobInfo.strafeChance === "number" ? mobInfo.strafeChance : 0,
      fleeHpPct:
        typeof mobInfo.fleeHpPct === "number" ? mobInfo.fleeHpPct : 0,
    };
  }

  getMobIdForSpawn(spawnZone, index) {
    const spawnProps = spawnZone.properties || [];
    const mobIdProp = spawnProps.find((prop) => prop.name === "mobId");
    if (mobIdProp && mobsData[mobIdProp.value]) {
      return mobIdProp.value;
    }

    const mobIds = Object.keys(mobsData);
    if (mobIds.length === 0) return null;
    return mobIds[index % mobIds.length];
  }

  setupPathfinding(tilemap) {
    if (
      !tilemap ||
      !this.scene.collisionLayer ||
      !this.scene.collisionLayer.getTileAt ||
      !this.scene.gatherRockLayer ||
      !this.scene.gatherRockLayer.getTileAt
    ) {
      return;
    }

    this.tileWidth = tilemap.tileWidth;
    this.tileHeight = tilemap.tileHeight;

    const grid = [];
    for (let y = 0; y < tilemap.height; y++) {
      const row = [];
      for (let x = 0; x < tilemap.width; x++) {
        const collisionTile = this.scene.collisionLayer.getTileAt(x, y);
        const gatherTile = this.scene.gatherRockLayer.getTileAt(x, y);
        const blocked =
          (collisionTile && collisionTile.collides) ||
          (gatherTile && gatherTile.collides);
        row.push(blocked ? 1 : 0);
      }
      grid.push(row);
    }

    const padding = 1;
    if (padding > 0) {
      const padded = grid.map((row) => row.slice());
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          if (grid[y][x] !== 1) continue;
          for (let dy = -padding; dy <= padding; dy++) {
            for (let dx = -padding; dx <= padding; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny < 0 || nx < 0 || ny >= grid.length || nx >= grid[0].length) {
                continue;
              }
              padded[ny][nx] = 1;
            }
          }
        }
      }
      this.pathGrid = padded;
    } else {
      this.pathGrid = grid;
    }
    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.pathGrid);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();
    this.easystar.disableCornerCutting();
  }

  refreshDynamicPathCosts() {
    if (!this.easystar || !this.pathGrid || !this.mobs) return;
    const now = this.scene.time.now;
    if (now - this.lastDynamicCostUpdate < 200) return;
    this.lastDynamicCostUpdate = now;

    this.easystar.removeAllAdditionalPointCosts();
    const maxY = this.pathGrid.length;
    const maxX = this.pathGrid[0].length;
    const mobTileCost = 50;

    this.mobs.getChildren().forEach((mob) => {
      if (!mob.active || mob.customData.isDead) return;
      const tx = this.worldToTileX(mob.x);
      const ty = this.worldToTileY(mob.y);
      if (tx < 0 || ty < 0 || ty >= maxY || tx >= maxX) return;
      this.easystar.setAdditionalPointCost(tx, ty, mobTileCost);
    });
  }

  getMobMoveSpeed(mobInfo) {
    return mobInfo.speed;
  }

  getMobSpriteKey(mobInfo) {
    return mobInfo.spriteKey || "goblinBeast";
  }

  getMobSpawnTextureKey(spriteKey) {
    return spriteKey.startsWith("mob") ? "mobs-sheet" : `${spriteKey}-walk-down`;
  }

  getMobAnimKey(mob, action, direction) {
    const spriteKey = mob.customData.spriteKey || "goblinBeast";
    const preferred = `${spriteKey}-${action}-${direction}`;
    if (this.scene.anims.exists(preferred)) return preferred;
    const fallback = `${spriteKey}-walk-${direction}`;
    if (this.scene.anims.exists(fallback)) return fallback;
    return null;
  }

  playMobAnimation(mob, action, direction, loop) {
    const key = this.getMobAnimKey(mob, action, direction);
    if (key) {
      mob.anims.play(key, loop);
    }
  }

  isWorldPointBlocked(x, y) {
    const collisionTile = this.scene.collisionLayer?.getTileAtWorldXY(x, y);
    const gatherTile = this.scene.gatherRockLayer?.getTileAtWorldXY(x, y);
    return (
      (collisionTile && collisionTile.collides) ||
      (gatherTile && gatherTile.collides)
    );
  }

  isWithinSpawnMargin(x, y, margin) {
    const mapWidth = this.scene.map?.widthInPixels || 0;
    const mapHeight = this.scene.map?.heightInPixels || 0;
    if (!mapWidth || !mapHeight) return true;
    return (
      x >= margin &&
      y >= margin &&
      x <= mapWidth - margin &&
      y <= mapHeight - margin
    );
  }

  getRandomSpawnPosition(spawnZone, options = {}) {
    const baseX = spawnZone.x || 0;
    const baseY = spawnZone.y || 0;
    const width = Math.max(0, Math.floor(spawnZone.width || 0));
    const height = Math.max(0, Math.floor(spawnZone.height || 0));
    const tries = options.tries || 24;
    const margin = options.margin ?? 64;
    const minDistanceSq = options.minDistanceSq ?? 0;
    const existing = options.existing || [];

    for (let i = 0; i < tries; i += 1) {
      const x = baseX + Phaser.Math.Between(0, width);
      const y = baseY + Phaser.Math.Between(0, height);
      if (!this.isWithinSpawnMargin(x, y, margin)) {
        continue;
      }
      if (this.isWorldPointBlocked(x, y)) {
        continue;
      }
      if (minDistanceSq > 0) {
        const tooClose = existing.some((pos) => {
          const dx = pos.x - x;
          const dy = pos.y - y;
          return dx * dx + dy * dy < minDistanceSq;
        });
        if (tooClose) {
          continue;
        }
      }
      if (!this.isWorldPointBlocked(x, y)) {
        return { x, y };
      }
    }

    return { x: baseX, y: baseY };
  }

  worldToTileX(x) {
    if (!this.tileWidth) return 0;
    return Math.floor(x / this.tileWidth);
  }

  worldToTileY(y) {
    if (!this.tileHeight) return 0;
    return Math.floor(y / this.tileHeight);
  }

  tileToWorldCenterX(x) {
    return x * this.tileWidth + this.tileWidth / 2;
  }

  tileToWorldCenterY(y) {
    return y * this.tileHeight + this.tileHeight / 2;
  }

  createMobs(tilemap) {
    this.mobs = this.scene.physics.add.group({ collideWorldBounds: true });

    // Colliders
    this.scene.physics.add.collider(
      this.mobs,
      this.scene.playerManager.player
    );
    this.scene.physics.add.collider(this.mobs, this.scene.collisionLayer);
    this.scene.physics.add.collider(this.mobs, this.scene.gatherRockLayer);

    const spawnLayer = tilemap.getObjectLayer("GameObjects");
    if (!spawnLayer) {
      console.warn("No 'GameObjects' object layer found for mob spawns!");
      return;
    }

    const mobSpawns = spawnLayer.objects.filter((obj) =>
      obj.name.startsWith("MobSpawnZone")
    );

    this.setupPathfinding(tilemap);
    if (this.pathDebugEnabled && !this.pathDebugGraphics) {
      this.pathDebugGraphics = this.scene.add.graphics();
      this.pathDebugGraphics.setDepth(9999);
    }

    mobSpawns.forEach((spawnZone, index) => {
      const spawnProps = spawnZone.properties || [];
      const countProp = spawnProps.find((prop) => prop.name === "count");
      const spawnCount = Number.isFinite(Number(countProp?.value))
        ? Number(countProp.value)
        : 3;
      const zoneSpawns = [];

      for (let i = 0; i < spawnCount; i += 1) {
        const mobTypeID = this.getMobIdForSpawn(
          spawnZone,
          index * spawnCount + i
        );
        const mobInfo = mobsData[mobTypeID];
        if (!mobInfo) {
          continue;
        }

        const spriteKey = this.getMobSpriteKey(mobInfo);
        const spawnPos = this.getRandomSpawnPosition(spawnZone, {
          existing: zoneSpawns,
          minDistanceSq: 48 * 48,
          margin: 64,
        });
        zoneSpawns.push(spawnPos);
        const spawnX = spawnPos.x;
        const spawnY = spawnPos.y;
        const mob = this.mobs.create(
          spawnX,
          spawnY,
          this.getMobSpawnTextureKey(spriteKey)
        );
        mob.setPushable(false);
        const mobScale =
          typeof mobInfo.scale === "number" && mobInfo.scale > 0
            ? mobInfo.scale
            : 1;
        mob.setScale(mobScale);

        mob.customData = {
          id: mobTypeID,
          spriteKey,
          hp: mobInfo.health,
          mana: mobInfo.mana || 0,
          magicDefense: mobInfo.magicDefense || 0,
          meleeDefense: mobInfo.meleeDefense || 0,
          magicEvasion: mobInfo.magicEvasion || 0,
          meleeEvasion: mobInfo.meleeEvasion || 0,
          spawnX,
          spawnY,
          spawnZoneX: spawnZone.x,
          spawnZoneY: spawnZone.y,
          spawnZoneW: spawnZone.width || 0,
          spawnZoneH: spawnZone.height || 0,
          isDead: false,
          currentType: mobInfo.mobType, // 'friend' or 'enemy'
          state: "idle",
          lastAttackTime: 0,
          droppedLoot: [],
          // Skills extracted from loot
          mobSkills: this.extractMobSkillsFromLoot(mobInfo.lootTable),
          mobSkillCooldowns: {},
          mobSkillTimers: {},
          isCastingSkill: false,
          // Heal threshold (50%)
          healingThreshold: mobInfo.healingSkillHPThreshold || 0.5,
          lastAggroTime: 0,
          lastSeenPosition: null,
          strafeUntil: 0,
          lastPathTime: 0,
          lastPathKey: null,
          path: null,
          pathIndex: 0,
          waitingForPath: false,
          lastPathLogTime: 0,

          // Used for stuck checks
          lastPosition: { x: spawnZone.x, y: spawnZone.y },
          stuckCheckInterval: 1000,
          lastStuckCheck: 0,
          isUnsticking: false,

          // For random wandering
          wanderDirection: new Phaser.Math.Vector2(0, 0),
          wanderBlockedUntil: 0,
          lastIdleWanderChange: 0,

          // Keep track of facing direction for animations
          lastDirection: "down",
        };

        this.createMobUIContainer(mob, mobInfo);
        this.createMobDebugText(mob);

        mob.setInteractive({ useHandCursor: true });
        mob.on("pointerdown", () => {
          this.scene.onMobClicked(mob);
        });

        this.playMobAnimation(mob, "walk", "down", true);

        this.assignRandomIdleOrWander(mob);
      }
    });
  }

  clearAggro() {
    if (!this.mobs) return;
    this.mobs.getChildren().forEach((mob) => {
      if (!mob || !mob.customData) return;
      mob.customData.state = "leashing";
      mob.customData.lastAggroTime = 0;
      mob.customData.lastSeenPosition = null;
      mob.customData.path = null;
      mob.customData.pathIndex = 0;
      mob.customData.waitingForPath = false;
      mob.customData.isCastingSkill = false;
      mob.body.setVelocity(0, 0);
    });
  }

  createMobUIContainer(mob, mobInfo) {
    const container = this.scene.add.container(mob.x, mob.y - 40);

    const nameText = this.scene.add
      .text(0, 0, mobInfo.name, {
        font: "12px Arial",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0);

    const hpBarBG = this.scene.add.graphics();
    hpBarBG.fillStyle(0x333333, 1);
    hpBarBG.fillRect(-20, 16, 40, 4);

    const hpBarFill = this.scene.add.graphics();

    const manaBarBG = this.scene.add.graphics();
    manaBarBG.fillStyle(0x333333, 1);
    manaBarBG.fillRect(-20, 22, 40, 4);

    const manaBarFill = this.scene.add.graphics();

    container.add([nameText, hpBarBG, hpBarFill, manaBarBG, manaBarFill]);

    mob.customData.uiContainer = container;
    mob.customData.nameText = nameText;
    mob.customData.hpBarFill = hpBarFill;
    mob.customData.manaBarFill = manaBarFill;
  }

  createMobDebugText(mob) {
    const debugText = this.scene.add
      .text(mob.x, mob.y - 62, "", {
        font: "10px Arial",
        fill: "#ffd479",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0);
    debugText.setVisible(false);
    mob.customData.debugText = debugText;
  }

  extractMobSkillsFromLoot(lootTable) {
    const skillList = [];
    lootTable.forEach((entry) => {
      const skill = allGameSkills.find((sk) => sk.id === entry.itemId);
      if (skill) {
        // Clone the skill object into mobSkills
        skillList.push({ ...skill });
      }
    });
    return skillList;
  }

  updateMobUI(mob) {
    const container = mob.customData.uiContainer;
    if (!container) return;
    container.setPosition(mob.x, mob.y - 40);

    if (mob.customData.debugText) {
      mob.customData.debugText.setVisible(
        Boolean(this.scene.uiManager?.isAdminOpen)
      );
      mob.customData.debugText.setPosition(mob.x, mob.y - 62);
      mob.customData.debugText.setText(
        `${mob.customData.id} (${mob.customData.spriteKey || "?"})`
      );
    }

    const mobInfo = mobsData[mob.customData.id];
    const currentHP = mob.customData.hp;
    const maxHP = mobInfo.health;
    const hpPercent = Math.max(0, currentHP / maxHP);

    const hpBarFill = mob.customData.hpBarFill;
    hpBarFill.clear();
    hpBarFill.fillStyle(0xe74c3c, 1);
    hpBarFill.fillRect(-20, 16, 40 * hpPercent, 4);

    if (mobInfo.mana && mobInfo.mana > 0) {
      const currentMana = mob.customData.mana;
      const maxMana = mobInfo.mana;
      const manaPercent = Math.max(0, currentMana / maxMana);
      const manaBarFill = mob.customData.manaBarFill;
      manaBarFill.clear();
      manaBarFill.fillStyle(0x3498db, 1);
      manaBarFill.fillRect(-20, 22, 40 * manaPercent, 4);
    }
  }

  updateMobs(player) {
    this.refreshDynamicPathCosts();
    this.mobs.getChildren().forEach((mob) => {
      if (!mob.active || mob.customData.isDead) return;

      const mobInfo = mobsData[mob.customData.id];
      const behavior = this.getMobBehavior(mobInfo);
      const now = this.scene.time.now;
      const distanceToSpawn = Phaser.Math.Distance.Between(
        mob.x,
        mob.y,
        mob.customData.spawnX,
        mob.customData.spawnY
      );

      this.updateMobUI(mob);

      // If mob is friendly, just idle or wander
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

      if (distanceToPlayer <= mobInfo.mobAgroRange) {
        mob.customData.lastAggroTime = now;
        mob.customData.lastSeenPosition = { x: player.x, y: player.y };
      }

      const aggroExpired =
        behavior.aggroDuration > 0 &&
        now - mob.customData.lastAggroTime > behavior.aggroDuration;
      const leashExceeded = distanceToSpawn > behavior.leashRadius;
      const hasLastSeen = Boolean(mob.customData.lastSeenPosition);
      if (
        (leashExceeded || (aggroExpired && !hasLastSeen)) &&
        mob.customData.state !== "leashing"
      ) {
        this.clearIdleWanderTimers(mob);
        mob.customData.state = "leashing";
        mob.body.setVelocity(0, 0);
      }

      switch (mob.customData.state) {
        case "idle":
          if (distanceToPlayer <= mobInfo.mobAgroRange) {
            this.clearIdleWanderTimers(mob);
            mob.customData.state = "chasing";
            mob.body.setVelocity(0, 0);
          }
          break;

        case "wandering":
          this.updateWandering(mob);
          if (distanceToPlayer <= mobInfo.mobAgroRange) {
            this.clearIdleWanderTimers(mob);
            mob.customData.state = "chasing";
            mob.body.setVelocity(0, 0);
          }
          break;

        case "chasing":
          this.updateChasing(mob, player, distanceToPlayer, behavior);
          break;

        case "attacking":
          this.updateAttacking(mob, player, distanceToPlayer, behavior);
          break;

        case "unsticking":
          // Let unstick run its course
          break;

        case "leashing":
          this.updateLeashing(mob, mobInfo, distanceToSpawn);
          break;
      }

      const isAttacking = mob.customData.state === "attacking";
      const isCasting = mob.customData.isCastingSkill;
      const velocitySq =
        (mob.body?.velocity?.x || 0) * (mob.body?.velocity?.x || 0) +
        (mob.body?.velocity?.y || 0) * (mob.body?.velocity?.y || 0);
      if (!isAttacking && !isCasting && velocitySq < 1) {
        mob.anims.stop();
      }
    });

    if (this.easystar) {
      this.easystar.calculate();
    }

    if (this.pathDebugEnabled && this.pathDebugGraphics) {
      this.pathDebugGraphics.clear();
      const mobToDraw =
        (this.scene.targetedMob && !this.scene.targetedMob.customData.isDead
          ? this.scene.targetedMob
          : this.mobs
              .getChildren()
              .find(
                (m) =>
                  m.customData.state === "chasing" ||
                  m.customData.state === "attacking"
              )) || null;
      if (mobToDraw && mobToDraw.customData.path) {
        this.pathDebugGraphics.lineStyle(2, 0xff3aa8, 1);
        const nodes = mobToDraw.customData.path;
        for (let i = 0; i < nodes.length - 1; i += 1) {
          const a = nodes[i];
          const b = nodes[i + 1];
          const ax = this.tileToWorldCenterX(a.x);
          const ay = this.tileToWorldCenterY(a.y);
          const bx = this.tileToWorldCenterX(b.x);
          const by = this.tileToWorldCenterY(b.y);
          this.pathDebugGraphics.strokeLineShape(
            new Phaser.Geom.Line(ax, ay, bx, by)
          );
        }
      }
    }
  }

  assignRandomIdleOrWander(mob) {
    const now = this.scene.time.now;
    if (now - mob.customData.lastIdleWanderChange < 800) {
      return;
    }
    mob.customData.lastIdleWanderChange = now;
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
    mob.customData.wanderBlockedUntil = 0;

    const mobInfo = mobsData[mob.customData.id];
    const speed = this.getMobMoveSpeed(mobInfo);

    const directions = [
      { x: 1, y: 0, dir: "right" },
      { x: -1, y: 0, dir: "left" },
      { x: 0, y: 1, dir: "down" },
      { x: 0, y: -1, dir: "up" },
    ];
    const chosen = Phaser.Utils.Array.GetRandom(directions);

    mob.customData.wanderDirection.set(chosen.x, chosen.y);
    mob.customData.lastDirection = chosen.dir;
    mob.body.setVelocity(chosen.x * speed, chosen.y * speed);
    this.playMobAnimation(mob, "walk", chosen.dir, true);

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

    // If next tile is blocked, pick a new direction
    const nextX = mob.x + dir.x * 20;
    const nextY = mob.y + dir.y * 20;
    const tile = this.scene.collisionLayer.getTileAtWorldXY(nextX, nextY);
    const gatherTile = this.scene.gatherRockLayer.getTileAtWorldXY(nextX, nextY);
    if ((tile && tile.collides) || (gatherTile && gatherTile.collides)) {
      const now = this.scene.time.now;
      if (now < mob.customData.wanderBlockedUntil) {
        return;
      }
      mob.customData.wanderBlockedUntil = now + 500;
      this.assignRandomIdleOrWander(mob);
    }
  }

  /**
   * Simple chasing logic:
   * - If mob has enough mana and an offensive skill, it tries to stay at skill range.
   * - If HP < 50% tries to heal.
   * - Else if no skill or no mana, chase up close for melee.
   * Also checks if stuck.
   */
  updateChasing(mob, player, distanceToPlayer) {
    const mobInfo = mobsData[mob.customData.id];
    const moveSpeed = this.getMobMoveSpeed(mobInfo);
    const behavior = this.getMobBehavior(mobInfo);
    const stopRange = Math.max(mobInfo.attackRange, behavior.preferredRange);
    const now = this.scene.time.now;
    const hasAggroMemory = this.hasAggroMemory(mob, behavior, now);
    const targetPos =
      distanceToPlayer <= mobInfo.mobAgroRange
        ? { x: player.x, y: player.y }
        : mob.customData.lastSeenPosition;
    if (mob.customData.isCastingSkill) {
      mob.body.setVelocity(0, 0);
      return;
    }
    const lastSeenPos = mob.customData.lastSeenPosition;
    if (lastSeenPos) {
      const distToLastSeen = Phaser.Math.Distance.Between(
        mob.x,
        mob.y,
        lastSeenPos.x,
        lastSeenPos.y
      );
      if (distToLastSeen <= 8) {
        mob.customData.lastSeenPosition = null;
      }
    }

    // If player left agro range
    if (
      distanceToPlayer > mobInfo.mobAgroRange &&
      !hasAggroMemory
    ) {
      mob.body.setVelocity(0, 0);
      mob.customData.state = "idle";
      return;
    }

    // Check if stuck
    this.checkIfMobIsStuck(mob);

    const hpPct = mob.customData.hp / mobInfo.health;
    if (behavior.fleeHpPct > 0 && hpPct <= behavior.fleeHpPct) {
      this.clearIdleWanderTimers(mob);
      mob.customData.state = "leashing";
      return;
    }

    if (hpPct < mob.customData.healingThreshold) {
      // Attempt heal skill
      const healSkill = this.findHealingSkill(mob);
      if (healSkill && this.canMobCastSkill(mob, healSkill)) {
        this.clearIdleWanderTimers(mob);
        mob.customData.state = "attacking";
        this.castMobSkill(mob, healSkill, null);
        return;
      }
    }

    const hasOffensiveSkill = this.mobHasOffensiveSkill(mob);
    const hasManaForOffensive = this.canMobCastAnyOffensiveSkill(mob);
    const preferredRange = behavior.preferredRange;

    if (behavior.profile === "caster" || behavior.profile === "skirmisher") {
      if (distanceToPlayer <= preferredRange) {
        mob.body.setVelocity(0, 0);
        this.clearIdleWanderTimers(mob);
        mob.customData.state = "attacking";
      } else {
        if (
          !this.followPathToTarget(
            mob,
            targetPos,
            moveSpeed * MOB_CHASE_SPEED_MULT,
            now
          )
        ) {
          if (this.easystar) {
            mob.body.setVelocity(0, 0);
          } else if (targetPos) {
            this.moveMobTowardsPosition(mob, targetPos, moveSpeed * MOB_CHASE_SPEED_MULT);
          } else {
            this.moveMobTowards(mob, player, moveSpeed * MOB_CHASE_SPEED_MULT);
          }
        }
      }
      return;
    }

    if (hasOffensiveSkill && hasManaForOffensive) {
      // Stay at skill range
      const bestRange = this.getBestOffensiveSkillRange(mob);
      if (distanceToPlayer <= bestRange) {
        // Switch to attacking
        mob.body.setVelocity(0, 0);
        this.clearIdleWanderTimers(mob);
        mob.customData.state = "attacking";
      } else {
        // Move closer
        if (
          !this.followPathToTarget(
            mob,
            targetPos,
            moveSpeed * MOB_CHASE_SPEED_MULT,
            now
          )
        ) {
          if (this.easystar) {
            mob.body.setVelocity(0, 0);
          } else {
            this.moveMobTowards(mob, player, moveSpeed * MOB_CHASE_SPEED_MULT);
          }
        }
      }
      return;
    }

    // Otherwise do melee approach
    if (distanceToPlayer <= stopRange) {
      mob.body.setVelocity(0, 0);
      this.clearIdleWanderTimers(mob);
      mob.customData.state = "attacking";
    } else {
      // Move in
      if (
        !this.followPathToTarget(
          mob,
          targetPos,
          moveSpeed * MOB_CHASE_SPEED_MULT,
          now
        )
      ) {
        if (this.easystar) {
          mob.body.setVelocity(0, 0);
        } else if (targetPos) {
          this.moveMobTowardsPosition(mob, targetPos, moveSpeed * MOB_CHASE_SPEED_MULT);
        } else {
          this.moveMobTowards(mob, player, moveSpeed * MOB_CHASE_SPEED_MULT);
        }
      }
    }
  }

  updateAttacking(mob, player, distanceToPlayer, behavior) {
    const mobInfo = mobsData[mob.customData.id];
    const moveSpeed = this.getMobMoveSpeed(mobInfo);
    const now = this.scene.time.now;

    if (distanceToPlayer > mobInfo.mobAgroRange) {
      if (this.hasAggroMemory(mob, behavior, now)) {
        mob.customData.state = "chasing";
      } else {
        mob.customData.state = "idle";
      }
      mob.body.setVelocity(0, 0);
      return;
    }
    if (mob.customData.isCastingSkill) {
      mob.body.setVelocity(0, 0);
      return;
    }

    // Try heal if low HP
    const hpPct = mob.customData.hp / mobInfo.health;
    if (behavior.fleeHpPct > 0 && hpPct <= behavior.fleeHpPct) {
      this.clearIdleWanderTimers(mob);
      mob.customData.state = "leashing";
      return;
    }
    if (hpPct < mob.customData.healingThreshold) {
      const healSkill = this.findHealingSkill(mob);
      if (healSkill && this.canMobCastSkill(mob, healSkill)) {
        this.clearIdleWanderTimers(mob);
        this.castMobSkill(mob, healSkill, null);
        return;
      }
    }

    if (
      (behavior.profile === "caster" || behavior.profile === "skirmisher") &&
      distanceToPlayer <= behavior.preferredRange &&
      behavior.strafeChance > 0
    ) {
      const now = this.scene.time.now;
      if (now >= mob.customData.strafeUntil) {
        if (Math.random() < behavior.strafeChance) {
          this.moveMobStrafe(mob, player, moveSpeed * 0.6);
          mob.customData.strafeUntil = now + 500;
        }
      }
    }

    // Try offensive skill if possible
    const hasOffensiveSkill = this.mobHasOffensiveSkill(mob);
    const hasManaForOffensive = this.canMobCastAnyOffensiveSkill(mob);

    if (hasOffensiveSkill && hasManaForOffensive) {
      const bestRange = this.getBestOffensiveSkillRange(mob);
      if (distanceToPlayer > bestRange) {
        // not in skill range, chase
        mob.customData.state = "chasing";
        return;
      }
      // If in range, attempt skill
      if (this.mobTryUseSkill(mob, player, distanceToPlayer)) {
        return;
      }
    }

    const stopRange = Math.max(mobInfo.attackRange, behavior.preferredRange);

    // If no skill or no mana or skill didn't fire, do melee
    if (distanceToPlayer > stopRange) {
      mob.customData.state = "chasing";
      return;
    }

    // Melee
    mob.body.setVelocity(0, 0);
    this.playAttackAnimation(mob, player);
    this.mobAttackPlayer(mob, mobInfo);
  }

  moveMobTowards(mob, player, speed) {
    const angle = Phaser.Math.Angle.Between(mob.x, mob.y, player.x, player.y);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    mob.body.setVelocity(vx, vy);

    // Decide walk animation
    if (Math.abs(vx) > Math.abs(vy)) {
      if (vx > 0) {
        this.playMobAnimation(mob, "walk", "right", true);
        mob.customData.lastDirection = "right";
      } else {
        this.playMobAnimation(mob, "walk", "left", true);
        mob.customData.lastDirection = "left";
      }
    } else {
      if (vy > 0) {
        this.playMobAnimation(mob, "walk", "down", true);
        mob.customData.lastDirection = "down";
      } else {
        this.playMobAnimation(mob, "walk", "up", true);
        mob.customData.lastDirection = "up";
      }
    }
  }

  followPathToTarget(mob, targetPos, speed, now) {
    if (!this.easystar || !this.pathGrid || !this.tileWidth || !this.tileHeight) {
      return false;
    }

    if (!targetPos) {
      return false;
    }

    const startX = this.worldToTileX(mob.x);
    const startY = this.worldToTileY(mob.y);
    const targetX = this.worldToTileX(targetPos.x);
    const targetY = this.worldToTileY(targetPos.y);

    if (
      startX < 0 ||
      startY < 0 ||
      targetX < 0 ||
      targetY < 0 ||
      startY >= this.pathGrid.length ||
      startX >= this.pathGrid[0].length ||
      targetY >= this.pathGrid.length ||
      targetX >= this.pathGrid[0].length
    ) {
      return false;
    }

    const targetKey = `${targetX},${targetY}`;
    const targetChanged = mob.customData.lastPathKey !== targetKey;
    const shouldRepath = now - mob.customData.lastPathTime >= 500;

    if (
      !mob.customData.waitingForPath &&
      (targetChanged || (!mob.customData.path && shouldRepath))
    ) {
      mob.customData.waitingForPath = true;
      mob.customData.lastPathTime = now;
      mob.customData.lastPathKey = targetKey;
      this.easystar.findPath(startX, startY, targetX, targetY, (path) => {
        mob.customData.waitingForPath = false;
        if (path && path.length > 1) {
          mob.customData.path = path;
          mob.customData.pathIndex = 1;
        } else {
          mob.customData.path = null;
          mob.customData.pathIndex = 0;
        }
        if (this.pathDebugEnabled) {
          const logNow = this.scene.time.now;
          if (logNow - mob.customData.lastPathLogTime > 1000) {
            mob.customData.lastPathLogTime = logNow;
            const pathLen = path ? path.length : 0;
            console.log(
              `[Path] ${mob.customData.id} ${startX},${startY} -> ${targetX},${targetY} len=${pathLen}`
            );
          }
        }
      });
    }

    if (!mob.customData.path || mob.customData.path.length === 0) {
      return false;
    }

    const node = mob.customData.path[mob.customData.pathIndex];
    if (!node) {
      mob.customData.path = null;
      mob.customData.pathIndex = 0;
      return false;
    }

    const nextPos = {
      x: this.tileToWorldCenterX(node.x),
      y: this.tileToWorldCenterY(node.y),
    };

    const distance = Phaser.Math.Distance.Between(
      mob.x,
      mob.y,
      nextPos.x,
      nextPos.y
    );
    if (distance <= 4) {
      mob.customData.pathIndex += 1;
      if (mob.customData.pathIndex >= mob.customData.path.length) {
        mob.customData.path = null;
        mob.customData.pathIndex = 0;
      }
    } else {
      this.moveMobTowardsPosition(mob, nextPos, speed);
    }

    return true;
  }

  moveMobTowardsPosition(mob, position, speed) {
    const angle = Phaser.Math.Angle.Between(
      mob.x,
      mob.y,
      position.x,
      position.y
    );
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    mob.body.setVelocity(vx, vy);

    if (Math.abs(vx) > Math.abs(vy)) {
      if (vx > 0) {
        this.playMobAnimation(mob, "walk", "right", true);
        mob.customData.lastDirection = "right";
      } else {
        this.playMobAnimation(mob, "walk", "left", true);
        mob.customData.lastDirection = "left";
      }
    } else {
      if (vy > 0) {
        this.playMobAnimation(mob, "walk", "down", true);
        mob.customData.lastDirection = "down";
      } else {
        this.playMobAnimation(mob, "walk", "up", true);
        mob.customData.lastDirection = "up";
      }
    }
  }

  moveMobStrafe(mob, player, speed) {
    const angle = Phaser.Math.Angle.Between(mob.x, mob.y, player.x, player.y);
    const strafeLeft = Math.random() < 0.5 ? 1 : -1;
    const strafeAngle = angle + strafeLeft * (Math.PI / 2);
    const vx = Math.cos(strafeAngle) * speed;
    const vy = Math.sin(strafeAngle) * speed;
    mob.body.setVelocity(vx, vy);

    if (Math.abs(vx) > Math.abs(vy)) {
      this.playMobAnimation(mob, "walk", vx > 0 ? "right" : "left", true);
    } else {
      this.playMobAnimation(mob, "walk", vy > 0 ? "down" : "up", true);
    }
  }

  // -------------------------
  // Stuck / Unsticking
  // -------------------------
  checkIfMobIsStuck(mob) {
    const now = this.scene.time.now;
    if (now - mob.customData.lastStuckCheck < mob.customData.stuckCheckInterval) {
      return;
    }
    mob.customData.lastStuckCheck = now;

    const distMoved = Phaser.Math.Distance.Between(
      mob.x,
      mob.y,
      mob.customData.lastPosition.x,
      mob.customData.lastPosition.y
    );
    mob.customData.lastPosition.x = mob.x;
    mob.customData.lastPosition.y = mob.y;

    if (distMoved < 5) {
      // Attempt unstick
      mob.customData.state = "unsticking";
      mob.body.setVelocity(0, 0);
      this.performUnsticking(mob);
    }
  }

  performUnsticking(mob) {
    if (!mob.active || mob.customData.isDead) return;

    const mobInfo = mobsData[mob.customData.id];
    const moveSpeed = this.getMobMoveSpeed(mobInfo);
    const pickLeft = Phaser.Math.Between(0, 1) === 0;
    // If velocity is zero, pick a random direction
    let vx = mob.body.velocity.x;
    let vy = mob.body.velocity.y;
    let currentDir = new Phaser.Math.Vector2(vx, vy).normalize();
    if (currentDir.lengthSq() === 0) {
      currentDir = new Phaser.Math.Vector2(1, 0);
    }

    let turnDir;
    if (pickLeft) {
      turnDir = new Phaser.Math.Vector2(currentDir.y, -currentDir.x);
    } else {
      turnDir = new Phaser.Math.Vector2(-currentDir.y, currentDir.x);
    }

    mob.body.setVelocity(
      turnDir.x * moveSpeed,
      turnDir.y * moveSpeed
    );

    // Quick animation
    if (Math.abs(turnDir.x) > Math.abs(turnDir.y)) {
      this.playMobAnimation(
        mob,
        "walk",
        turnDir.x > 0 ? "right" : "left",
        true
      );
    } else {
      this.playMobAnimation(mob, "walk", turnDir.y > 0 ? "down" : "up", true);
    }

    this.scene.time.addEvent({
      delay: 600,
      callback: () => {
        mob.customData.state = "chasing";
      },
    });
  }

  updateLeashing(mob, mobInfo, distanceToSpawn) {
    if (!mob.active || mob.customData.isDead) return;

    if (distanceToSpawn <= 8) {
      mob.body.setVelocity(0, 0);
      mob.customData.state = "idle";
      this.assignRandomIdleOrWander(mob);
      return;
    }

    const spawnPosition = {
      x: mob.customData.spawnX,
      y: mob.customData.spawnY,
    };
    const moveSpeed = this.getMobMoveSpeed(mobInfo);
    this.moveMobTowardsPosition(mob, spawnPosition, moveSpeed * MOB_CHASE_SPEED_MULT);
  }

  // -------------------------
  // Skills & Combat
  // -------------------------
  mobHasOffensiveSkill(mob) {
    const skills = mob.customData.mobSkills || [];
    return skills.some((s) => s.meleeAttack || s.magicAttack);
  }

  canMobCastAnyOffensiveSkill(mob) {
    const skills = mob.customData.mobSkills || [];
    return skills.some((s) => {
      if (s.meleeAttack || s.magicAttack) {
        return this.canMobCastSkill(mob, s);
      }
      return false;
    });
  }

  getBestOffensiveSkillRange(mob) {
    let best = 0;
    const skills = mob.customData.mobSkills || [];
    skills.forEach((s) => {
      if ((s.meleeAttack || s.magicAttack) && this.canMobCastSkill(mob, s)) {
        if (s.range > best) best = s.range;
      }
    });
    return best;
  }

  findHealingSkill(mob) {
    const skills = mob.customData.mobSkills || [];
    return skills.find((s) => s.healHP || s.healMP);
  }

  mobTryUseSkill(mob, player, distanceToPlayer) {
    const skills = mob.customData.mobSkills;
    if (!skills) return false;
    if (mob.customData.isCastingSkill) return false;

    for (const skill of skills) {
      if (skill.healHP || skill.healMP) continue; // skip heal here
      if (!this.canMobCastSkill(mob, skill)) continue;
      if (distanceToPlayer <= skill.range) {
        this.castMobSkill(mob, skill, player);
        return true;
      }
      }
      return false;
    }

  castMobSkill(mob, skill, targetSprite) {
    if (mob.customData.isCastingSkill) return;
    mob.customData.isCastingSkill = true;
    this.scene.chatManager.addMessage(
      `Mob "${mob.customData.id}" begins casting ${skill.name}.`
    );

    if (skill.castingTime && skill.castingTime > 0) {
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
    mob.customData.isCastingSkill = false;
    if (!mob.active || mob.customData.isDead) return;

    // Deduct Mana
    const neededMana = Math.round(skill.manaCost);
    mob.customData.mana = Math.max(0, mob.customData.mana - neededMana);

    // Healing skill
    if (skill.healHP || skill.healMP) {
      const mobInfo = mobsData[mob.customData.id];
      if (skill.healHP) {
        mob.customData.hp = Math.min(
          mob.customData.hp + skill.healHP,
          mobInfo.health
        );
      }
      if (skill.healMP) {
        mob.customData.mana = Math.min(
          mob.customData.mana + skill.healMP,
          mobInfo.mana || 0
        );
      }
      this.scene.chatManager.addMessage(
        `Mob "${mob.customData.id}" healed itself with ${skill.name}.`
      );
      triggerSkillAnimation(this.scene, skill, mob);
    } else {
      // Offensive skill
      if (!targetSprite || !targetSprite.active) {
        return;
      }
      const playerStats = this.scene.playerManager.getPlayerStats();
      let damage = 0;
      if (skill.magicAttack > 0) {
        if (isAttackEvaded(playerStats.magicEvasion || 0)) {
          this.scene.chatManager.addMessage(
            `Player evaded mob "${mob.customData.id}"'s ${skill.name} (magic).`
          );
        } else {
          const mobMagicAttack = mobsData[mob.customData.id].magicAttack || 0;
          const totalMA = mobMagicAttack + skill.magicAttack;
          damage = calculateMagicDamage({ magicAttack: totalMA }, playerStats);
          this.scene.chatManager.addMessage(
            `Mob "${mob.customData.id}" hits player with ${skill.name} for ${damage} magic damage.`
          );
          this.scene.playerManager.currentHealth = Math.max(
            0,
            this.scene.playerManager.currentHealth - damage
          );
          if (this.scene.playerManager.currentHealth <= 0) {
            this.scene.handlePlayerDeath();
          }
          this.scene.updateUI();
          triggerSkillAnimation(this.scene, skill, targetSprite);
        }
      } else if (skill.meleeAttack > 0) {
        if (isAttackEvaded(playerStats.meleeEvasion || 0)) {
          this.scene.chatManager.addMessage(
            `Player evaded mob "${mob.customData.id}"'s ${skill.name} (melee).`
          );
        } else {
          const mobMeleeAttack = mobsData[mob.customData.id].meleeAttack || 0;
          const totalMelee = mobMeleeAttack + skill.meleeAttack;
          damage = calculateMeleeDamage({ meleeAttack: totalMelee }, playerStats);
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
          triggerSkillAnimation(this.scene, skill, targetSprite);
        }
      }
    }

    // Start skill cooldown
    this.startMobSkillCooldown(mob, skill);
  }

  canMobCastSkill(mob, skill) {
    const neededMana = Math.round(skill.manaCost);
    if (mob.customData.mana < neededMana) return false;
    const cdLeft = mob.customData.mobSkillCooldowns[skill.id] || 0;
    return cdLeft <= 0;
  }

  startMobSkillCooldown(mob, skill) {
    if (skill.cooldown > 0) {
      mob.customData.mobSkillCooldowns[skill.id] = skill.cooldown;
      if (mob.customData.mobSkillTimers[skill.id]) {
        mob.customData.mobSkillTimers[skill.id].remove(false);
      }
      mob.customData.mobSkillTimers[skill.id] = this.scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          const cd = mob.customData.mobSkillCooldowns[skill.id];
          if (cd <= 0) {
            mob.customData.mobSkillCooldowns[skill.id] = 0;
            if (mob.customData.mobSkillTimers[skill.id]) {
              mob.customData.mobSkillTimers[skill.id].remove(false);
              mob.customData.mobSkillTimers[skill.id] = null;
            }
          } else {
            mob.customData.mobSkillCooldowns[skill.id] = +(
              cd - 0.1
            ).toFixed(1);
          }
        },
      });
    }
  }

  playAttackAnimation(mob, target) {
    const dx = target.x - mob.x;
    const dy = target.y - mob.y;

    let direction = mob.customData.lastDirection; // fallback
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? "right" : "left";
    } else {
      direction = dy > 0 ? "down" : "up";
    }
    mob.customData.lastDirection = direction;

    this.playMobAnimation(mob, "attack", direction, true);
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

    // Basic logic: whichever is higher, do that type of attack
    if (mobInfo.meleeAttack >= mobInfo.magicAttack) {
      if (isAttackEvaded(playerStats.meleeEvasion || 0)) {
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
      if (isAttackEvaded(playerStats.magicEvasion || 0)) {
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

  applyDamageToMob(mob, damage) {
    mob.customData.hp = Math.max(0, mob.customData.hp - damage);
    this.updateMobUI(mob);
    if (mob.customData.hp <= 0) {
      this.scene.chatManager.addMessage("Mob died!");
      this.handleMobDeath(mob);
      this.scene.targetedMob = null;
    } else {
      // if it was 'friend', become enemy
      if (mob.customData.currentType === "friend") {
        mob.customData.currentType = "enemy";
        mob.customData.lastAggroTime = this.scene.time.now;
        if (this.scene.playerManager?.player) {
          mob.customData.lastSeenPosition = {
            x: this.scene.playerManager.player.x,
            y: this.scene.playerManager.player.y,
          };
        }
        mob.customData.state = "chasing";
        this.scene.chatManager.addMessage(
          `Mob "${mob.customData.id}" became enemy (now chasing).`
        );
      } else if (mob.customData.state !== "chasing") {
        mob.customData.lastAggroTime = this.scene.time.now;
        if (this.scene.playerManager?.player) {
          mob.customData.lastSeenPosition = {
            x: this.scene.playerManager.player.x,
            y: this.scene.playerManager.player.y,
          };
        }
        mob.customData.state = "chasing";
      }
    }
  }

  handleMobDeath(mob) {
    mob.customData.isDead = true;
    if (mob.customData.uiContainer) {
      mob.customData.uiContainer.setVisible(false);
    }
    if (mob.customData.castBarBg) {
      mob.customData.castBarBg.setVisible(false);
    }
    if (mob.customData.castBarFill) {
      mob.customData.castBarFill.setVisible(false);
    }
    mob.body.setVelocity(0, 0);
    mob.customData.hp = 0;
    this.updateMobUI(mob);

    mob.anims.stop();
    mob.body.setEnable(false);

    const mobInfo = mobsData[mob.customData.id];
    const baseExp = mobInfo.expReward || 0;
    const mobLevel = mobInfo.level || 1;
    const playerLevel = this.scene.playerManager.getPlayerStats().level;
    const difference = mobLevel - playerLevel;
    const finalExp = this.calculateModifiedExp(baseExp, difference);

    if (finalExp > 0) {
      this.scene.gainExperience(finalExp);
      this.scene.chatManager.addMessage(
        `Player gained ${finalExp} EXP from defeating ${mob.customData.id}.`
      );
    } else {
      this.scene.chatManager.addMessage(
        `No EXP awarded. (Level diff = ${difference}).`
      );
    }

    mob.customData.droppedLoot = this.generateLoot(mobInfo.lootTable);
    this.scene.chatManager.addMessage(
      `Mob dropped loot: ${JSON.stringify(mob.customData.droppedLoot)}`
    );

    this.scene.time.addEvent({
      delay: MOB_CORPSE_DURATION,
      callback: () => {
        this.respawnMob(mob);
      },
    });
  }

  applyMobTypeChanges(mobTypeId) {
    if (!this.mobs) return;
    const mobInfo = mobsData[mobTypeId];
    if (!mobInfo) return;

    const updatedScale =
      typeof mobInfo.scale === "number" && mobInfo.scale > 0
        ? mobInfo.scale
        : 1;

    this.mobs.getChildren().forEach((mob) => {
      if (mob.customData.id !== mobTypeId) return;
      mob.customData.spriteKey = this.getMobSpriteKey(mobInfo);
      const textureKey = this.getMobSpawnTextureKey(mob.customData.spriteKey);
      if (mob.texture?.key !== textureKey) {
        mob.setTexture(textureKey);
      }
      mob.setScale(updatedScale);
      if (mob.body) {
        mob.body.setSize(mob.width, mob.height, true);
      }
      mob.customData.currentType = mobInfo.mobType;
      mob.customData.healingThreshold = mobInfo.healingSkillHPThreshold || 0.5;
      mob.customData.hp = Math.min(mob.customData.hp, mobInfo.health);
      mob.customData.mana = Math.min(mob.customData.mana, mobInfo.mana || 0);
      mob.customData.mobSkills = this.extractMobSkillsFromLoot(mobInfo.lootTable);
      if (mob.customData.currentType === "enemy") {
        mob.customData.lastAggroTime = this.scene.time.now;
        if (this.scene.playerManager?.player) {
          mob.customData.lastSeenPosition = {
            x: this.scene.playerManager.player.x,
            y: this.scene.playerManager.player.y,
          };
        }
        if (!mob.customData.isDead) {
          mob.customData.state = "chasing";
        }
      }
      if (mob.customData.nameText) {
        mob.customData.nameText.setText(mobInfo.name);
      }
      this.updateMobUI(mob);
    });
  }

  refreshMobSkillsFromLoot() {
    if (!this.mobs) return;
    this.mobs.getChildren().forEach((mob) => {
      const mobInfo = mobsData[mob.customData.id];
      if (!mobInfo) return;
      mob.customData.mobSkills = this.extractMobSkillsFromLoot(mobInfo.lootTable);
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
    if (difference >= 5) multiplier = mobAtLeast5Higher;
    else if (difference === 4) multiplier = mob4Higher;
    else if (difference === 3) multiplier = mob3Higher;
    else if (difference === 2) multiplier = mob2Higher;
    else if (difference === 1) multiplier = mob1Higher;
    else if (difference === 0) multiplier = equalLevel;
    else if (difference === -1) multiplier = player1Higher;
    else if (difference === -2) multiplier = player2Higher;
    else if (difference === -3) multiplier = player3Higher;
    else if (difference === -4) multiplier = player4Higher;
    else if (difference === -5) multiplier = player5Higher;
    else if (difference < -5) multiplier = none;

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
    mob.customData.mobSkillTimers = {};
    mob.customData.isCastingSkill = false;
    mob.customData.healingThreshold = mobInfo.healingSkillHPThreshold || 0.5;
    mob.customData.mobSkills = this.extractMobSkillsFromLoot(mobInfo.lootTable);
    if (mob.customData.uiContainer) {
      mob.customData.uiContainer.setVisible(true);
    }

    const spawnPos = this.getRandomSpawnPosition({
      x: mob.customData.spawnZoneX ?? mob.customData.spawnX,
      y: mob.customData.spawnZoneY ?? mob.customData.spawnY,
      width: mob.customData.spawnZoneW ?? 0,
      height: mob.customData.spawnZoneH ?? 0,
    });
    mob.customData.spawnX = spawnPos.x;
    mob.customData.spawnY = spawnPos.y;
    mob.x = spawnPos.x;
    mob.y = spawnPos.y;

    mob.setActive(true).setVisible(true);
    mob.body.setEnable(true);
    const mobScale =
      typeof mobInfo.scale === "number" && mobInfo.scale > 0
        ? mobInfo.scale
        : 1;
    mob.setScale(mobScale);
    if (mob.body) {
      mob.body.setSize(mob.width, mob.height, true);
    }

    this.updateMobUI(mob);

    mob.body.setVelocity(0, 0);
    this.playMobAnimation(mob, "walk", "down", true);
    mob.clearTint();

    this.scene.chatManager.addMessage(
      `Respawning mob "${mob.customData.id}" at (${mob.x}, ${mob.y}).`
    );
    this.assignRandomIdleOrWander(mob);
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
    const mobsInRange = this.mobs.getChildren().filter((m) => {
      if (m.customData.isDead) return false;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, m.x, m.y);
      return dist <= range;
    });
    if (mobsInRange.length === 0) {
      this.scene.chatManager.addMessage("No mobs within TAB targeting range.");
      return;
    }

    mobsInRange.sort((a, b) => {
      const distA = Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y);
      const distB = Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y);
      return distA - distB;
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
    const mobsInRange = this.mobs
      .getChildren()
      .filter((mobItem) => !mobItem.customData.isDead)
      .filter((mobItem) => {
        const distance = Phaser.Math.Distance.Between(
          player.x,
          player.y,
          mobItem.x,
          mobItem.y
        );
        return distance <= TAB_TARGET_RANGE;
      });

    mobsInRange.sort((a, b) => {
      const distA = Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y);
      const distB = Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y);
      return distA - distB;
    });

    this.scene.currentTargetIndex = mobsInRange.indexOf(mob);

    this.scene.chatManager.addMessage(
      `Mob clicked: ${mob.customData.id} at (${mob.x}, ${mob.y})`
    );
  }
}
