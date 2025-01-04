// scenes/MainScene.js

import {
  playerProfile,
  mobsData,
  playerSkills, // Import playerSkills
  naturalRegeneration, // Import naturalRegeneration
} from "../MOCKdata.js";

import {
  calculatePlayerStats,
  calculateMagicDamage,
  calculateMeleeDamage,
} from "../helpers/calculatePlayerStats.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.currentTargetIndex = null;
    this.targetedMob = null;

    // Store skill references and player's current stats
    this.skillKeyMap = {}; // e.g., { 1: { name: 'magic_wip', ... }, 2: {...} }
    this.currentMana = 0;
    this.currentHealth = 0;
    this.maxMana = 0;
    this.maxHealth = 0;
  }

  preload() {
    this.loadAssets();
  }

  create() {
    this.createTilemap();
    this.defineAnimations();
    this.createPlayer();
    this.setupCamera();
    this.setupControls();
    this.createMobs();

    // -- Grab DOM references (UI)
    this.uiName = document.getElementById("player-name");
    this.uiHealthFill = document.getElementById("health-fill");
    this.uiManaFill = document.getElementById("mana-fill");
    this.uiLevel = document.getElementById("player-level");
    this.uiXP = document.getElementById("player-xp");

    // --- Casting Bar (10 slots) ---
    this.castingBarSlots = document.querySelectorAll(
      "#casting-bar .casting-slot"
    );

    // 1) Assign skills to keys 1..10 and update HTML
    this.setupSkills();

    // 2) Initialize player's current and max health/mana
    const playerStats = calculatePlayerStats();
    this.maxHealth = playerStats.health;
    this.currentHealth = this.maxHealth;
    this.maxMana = playerStats.mana;
    this.currentMana = this.maxMana;

    // 3) Start natural regeneration
    this.time.addEvent({
      delay: naturalRegeneration.regenerationTime, // milliseconds
      callback: this.regenerateStats,
      callbackScope: this,
      loop: true,
    });

    // TAB targeting logic
    this.input.keyboard.on("keydown-TAB", (event) => {
      event.preventDefault();
      this.cycleTarget();
      this.updateUI();
    });
  }

  update() {
    this.updateUI();
    this.handlePlayerMovement();

    // Update HP text positions for all mobs
    this.mobs.getChildren().forEach((mob) => {
      if (mob.active && mob.customData && mob.customData.hpText) {
        mob.customData.hpText.setPosition(mob.x, mob.y - 20);
      }
    });
  }

  /* ============================================= */
  /*           Skills & Key Assignments           */
  /* ============================================= */

  setupSkills() {
    const maxSlots = 10;
    const keyCodes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
      Phaser.Input.Keyboard.KeyCodes.EIGHT,
      Phaser.Input.Keyboard.KeyCodes.NINE,
      Phaser.Input.Keyboard.KeyCodes.ZERO,
    ];

    playerSkills.forEach((skill, index) => {
      if (index >= maxSlots) return; // Ignore extra skills beyond 10
      const key = keyCodes[index];
      const slotEl = this.castingBarSlots[index];

      // Update casting bar slot text with skill name and mana cost
      slotEl.textContent = `${skill.name} (${skill.manaCost})`;

      // Register skill to the corresponding key
      this.input.keyboard.addKey(key).on("down", () => {
        this.useSkill(skill);
      });
    });
  }

  useSkill(skill) {
    if (this.currentMana < skill.manaCost) {
      console.log(`Not enough mana to use ${skill.name}!`);
      return;
    }

    // Use the skill based on its type
    if (skill.magicAttack > 0) {
      const success = this.useMagicSkill(skill);
      if (success) this.deductMana(skill.manaCost); // Deduct mana only on success
    } else if (skill.meleeAttack > 0) {
      const success = this.useMeleeSkill(skill);
      if (success) this.deductMana(skill.manaCost); // Deduct mana only on success
    } else {
      console.log(`Skill ${skill.name} doesn't have a recognized damage type!`);
    }

    // Update the UI
    this.updateUI();
  }

  useMagicSkill(skill) {
    if (!this.targetedMob) {
      console.log(`No target selected for magic skill: ${skill.name}`);
      return false; // Indicate failure
    }

    const playerStats = calculatePlayerStats();
    const mobKey = this.targetedMob.customData.id;
    const mobStats = mobsData[mobKey];
    const damage =
      calculateMagicDamage(playerStats, mobStats) + skill.magicAttack;

    this.applyDamageToMob(this.targetedMob, damage);
    console.log(`Used magic skill: ${skill.name}, dealt ${damage} damage.`);
    return true; // Indicate success
  }

  useMeleeSkill(skill) {
    if (!this.targetedMob) {
      console.log(`No target selected for melee skill: ${skill.name}`);
      return false; // Indicate failure
    }

    const playerStats = calculatePlayerStats();
    const mobKey = this.targetedMob.customData.id;
    const mobStats = mobsData[mobKey];
    const damage =
      calculateMeleeDamage(playerStats, mobStats) + skill.meleeAttack;

    this.applyDamageToMob(this.targetedMob, damage);
    console.log(`Used melee skill: ${skill.name}, dealt ${damage} damage.`);
    return true; // Indicate success
  }

  deductMana(amount) {
    this.currentMana = Math.max(0, this.currentMana - amount);
  }

  regenerateStats() {
    // Regenerate mana
    const manaBefore = this.currentMana;
    this.currentMana = Math.min(
      this.maxMana,
      this.currentMana + naturalRegeneration.manaRegen
    );
    const manaAfter = this.currentMana;

    // Regenerate health
    const healthBefore = this.currentHealth;
    this.currentHealth = Math.min(
      this.maxHealth,
      this.currentHealth + naturalRegeneration.hpRegen
    );
    const healthAfter = this.currentHealth;

    // Debug log
    console.log(
      `Regenerated: +${manaAfter - manaBefore} mana, +${
        healthAfter - healthBefore
      } health.`
    );
  }

  applyDamageToMob(mob, damage) {
    mob.customData.hp = Math.max(0, mob.customData.hp - damage);
    mob.customData.hpText.setText(`HP: ${mob.customData.hp}`);

    if (mob.customData.hp <= 0) {
      console.log("Mob died!");
      this.handleMobDeath(mob);
      this.targetedMob = null;
    }
  }

  /* ============================================= */
  /*        Targeting, Attacking, & UI            */
  /* ============================================= */

  cycleTarget() {
    const mobArray = this.mobs.getChildren();
    if (!mobArray.length) return;

    if (this.currentTargetIndex === null) {
      this.currentTargetIndex = 0;
    } else {
      this.currentTargetIndex = (this.currentTargetIndex + 1) % mobArray.length;
    }
    this.targetedMob = mobArray[this.currentTargetIndex];
    this.highlightMob(this.targetedMob);
  }

  highlightMob(mob) {
    // Clear tint on all
    this.mobs.getChildren().forEach((m) => m.clearTint());
    // Tint the newly targeted mob
    mob.setTint(0xff0000);
  }

  handleMobDeath(mob) {
    // Mark as dead so movement code ignores it
    mob.customData.isDead = true;
    // Immediately stop velocity
    mob.body.setVelocity(0, 0);
    // Play dead animation
    mob.anims.play("mob-dead", true);

    // Delay hiding mob until the animation finishes
    this.time.delayedCall(1000, () => {
      mob.setActive(false).setVisible(false);
      mob.body.setEnable(false);
      mob.customData.hpText.setVisible(false);

      // Respawn after 5s
      this.time.addEvent({
        delay: 5000,
        callback: () => {
          this.respawnMob(mob);
        },
      });
    });
  }

  respawnMob(mob) {
    const mobInfo = mobsData[mob.customData.id];
    if (!mobInfo) return;

    // Reset HP
    mob.customData.hp = mobInfo.health;
    // Mark alive again
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
      `Respawning mob "${mob.customData.id}" at (${mob.x}, ${mob.y}) with HP: ${mob.customData.hp}`
    );

    this.assignMobMovement(mob);
  }

  spawnCorpse(x, y) {
    const corpse = this.add.sprite(x, y, "$dead").setFrame(9);
    corpse.setTint(0x666666);
    // Remove corpse after 10s
    this.time.delayedCall(10000, () => corpse.destroy());
  }

  updateUI() {
    const { name, totalExp } = playerProfile;
    const level = 5;

    // Update health bar
    const healthPercent = (this.currentHealth / this.maxHealth) * 100;
    this.uiHealthFill.style.width = `${healthPercent}%`;
    // Update health text
    const healthText = document.getElementById("health-text");
    healthText.textContent = `HP: ${this.currentHealth}/${this.maxHealth}`;

    // Update mana bar
    const manaPercent = (this.currentMana / this.maxMana) * 100;
    this.uiManaFill.style.width = `${manaPercent}%`;
    // Update mana text
    const manaText = document.getElementById("mana-text");
    manaText.textContent = `Mana: ${this.currentMana}/${this.maxMana}`;

    // Update texts
    this.uiName.textContent = `${name}`;
    this.uiLevel.textContent = `Level: ${level}`;
    this.uiXP.textContent = `XP: ${totalExp}`;
  }

  /* ============================================= */
  /*              Assets & Map Setup              */
  /* ============================================= */

  loadAssets() {
    // Tilemap JSON
    this.load.tilemapTiledJSON("Map0", "assets/map/map0..tmj");

    // Tileset image
    this.load.image("tmw_desert_spacing", "assets/map/tmw_desert_spacing.png");

    // Other assets
    this.load.image("player", "assets/player.png");

    // Characters sprite sheet
    this.load.spritesheet("characters", "assets/characters.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Dead mob animation
    this.load.spritesheet("$dead", "assets/$dead.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  createTilemap() {
    this.map = this.make.tilemap({ key: "Map0" });
    const tileset = this.map.addTilesetImage(
      "tmw_desert_spacing",
      "tmw_desert_spacing"
    );

    // Background layer
    this.backgroundLayer = this.map.createLayer("background", tileset, 0, 0);

    // Collisions layer
    this.collisionLayer = this.map.createLayer("collisions", tileset, 0, 0);
    this.collisionLayer.setCollision([
      30, 31, 32, 37, 38, 39, 40, 45, 46, 47, 48,
    ]);
  }

  defineAnimations() {
    // Player animations
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 0,
        end: 2,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 12,
        end: 14,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 24,
        end: 26,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 36,
        end: 38,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Mob animations
    this.anims.create({
      key: "mob-walk-down",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 48,
        end: 50,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-left",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 60,
        end: 62,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-right",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 72,
        end: 74,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-up",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 84,
        end: 86,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Dead animation for mobs
    this.anims.create({
      key: "mob-dead",
      frames: this.anims.generateFrameNumbers("$dead", { start: 7, end: 7 }),
      frameRate: 0,
      repeat: 0,
    });
  }

  createPlayer() {
    // Find HeroStart position from Tiled
    const heroStart = this.map.findObject(
      "GameObjects",
      (obj) => obj.name === "HeroStart"
    );
    this.player = this.physics.add.sprite(
      heroStart.x,
      heroStart.y,
      "characters"
    );
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1);

    // Collision with walls
    this.physics.add.collider(this.player, this.collisionLayer);

    // Start an idle or walk-down animation
    this.player.anims.play("walk-down");
    this.playerSpeed = 100;
  }

  setupCamera() {
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.physics.world.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.startFollow(this.player);
  }

  setupControls() {
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
  }

  /* ============================================= */
  /*                 Mobs Setup                   */
  /* ============================================= */

  createMobs() {
    const mobTypeID = "slime";
    const mobInfo = mobsData[mobTypeID];

    this.mobs = this.physics.add.group({ collideWorldBounds: true });
    this.physics.add.collider(this.mobs, this.player);
    this.physics.add.collider(this.mobs, this.collisionLayer);

    const mobSpawns = this.map
      .getObjectLayer("GameObjects")
      .objects.filter((obj) => obj.name.startsWith("MobSpawnZone"));

    mobSpawns.forEach((spawnZone) => {
      const mob = this.mobs.create(spawnZone.x, spawnZone.y, "characters");

      mob.customData = {
        id: mobTypeID,
        hp: mobInfo.health,
        spawnX: spawnZone.x,
        spawnY: spawnZone.y,
        isDead: false,
      };

      mob.customData.hpText = this.add
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
        this.onMobClicked(mob);
      });

      mob.setScale(1);
      mob.anims.play("mob-walk-down");
      this.assignMobMovement(mob);
    });
  }

  onMobClicked(mob) {
    if (!mob.active) return;

    this.mobs.getChildren().forEach((m) => m.clearTint());
    mob.setTint(0xff0000);

    this.targetedMob = mob;
    const mobArray = this.mobs.getChildren();
    this.currentTargetIndex = mobArray.indexOf(mob);
    console.log("Mob clicked:", mob.customData.id, "HP:", mob.customData.hp);
  }

  assignMobMovement(mob) {
    const changeDirection = () => {
      if (!mob.active || mob.customData.isDead) {
        return;
      }
      const randomDirection = Phaser.Math.Between(0, 3);
      const speed = 50;

      switch (randomDirection) {
        case 0:
          mob.body.setVelocity(speed, 0);
          mob.anims.play("mob-walk-right", true);
          break;
        case 1:
          mob.body.setVelocity(-speed, 0);
          mob.anims.play("mob-walk-left", true);
          break;
        case 2:
          mob.body.setVelocity(0, speed);
          mob.anims.play("mob-walk-down", true);
          break;
        case 3:
          mob.body.setVelocity(0, -speed);
          mob.anims.play("mob-walk-up", true);
          break;
      }

      mob.customData.hpText.setPosition(mob.x, mob.y - 20);
      this.time.addEvent({
        delay: Phaser.Math.Between(3000, 7000),
        callback: changeDirection,
        callbackScope: this,
      });
    };

    changeDirection();
  }

  handlePlayerMovement() {
    if (!this.player || !this.player.body) return;

    this.player.body.setVelocity(0);

    if (this.cursors.up.isDown) {
      this.player.body.setVelocityY(-this.playerSpeed);
      this.player.anims.play("walk-up", true);
    } else if (this.cursors.down.isDown) {
      this.player.body.setVelocityY(this.playerSpeed);
      this.player.anims.play("walk-down", true);
    }

    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-this.playerSpeed);
      this.player.anims.play("walk-left", true);
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(this.playerSpeed);
      this.player.anims.play("walk-right", true);
    }

    if (
      !this.cursors.up.isDown &&
      !this.cursors.down.isDown &&
      !this.cursors.left.isDown &&
      !this.cursors.right.isDown
    ) {
      this.player.anims.stop();
      // Optionally set an idle frame:
      // this.player.setFrame(0);
    }
  }

  /* ============================================= */
  /*        Targeting, Attacking, & UI            */
  /* ============================================= */

  /* (Already defined above) */

  /* ============================================= */
  /*           Damage Handling Methods             */
  /* ============================================= */

  /* (Already defined above: useSkill, useMagicSkill, useMeleeSkill, applyDamageToMob, etc.) */

  /* ============================================= */
  /*           Natural Regeneration                */
  /* ============================================= */

  regenerateStats() {
    // Regenerate mana
    const manaBefore = this.currentMana;
    this.currentMana = Math.min(
      this.maxMana,
      this.currentMana + naturalRegeneration.manaRegen
    );
    const manaAfter = this.currentMana;

    // Regenerate health
    const healthBefore = this.currentHealth;
    this.currentHealth = Math.min(
      this.maxHealth,
      this.currentHealth + naturalRegeneration.hpRegen
    );
    const healthAfter = this.currentHealth;

    // Debug log
    console.log(
      `Regenerated: +${manaAfter - manaBefore} mana, +${
        healthAfter - healthBefore
      } health.`
    );
  }

  /* ============================================= */
  /*        Additional Helper Methods             */
  /* ============================================= */

  /* (Already defined above: applyDamageToMob, etc.) */
}
