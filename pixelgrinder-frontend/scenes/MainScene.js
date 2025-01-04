// scenes/MainScene.js

import {
  playerProfile,
  mobsData,
  playerSkills, // <-- IMPORT playerSkills!
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

    // We'll store skill references here:
    this.skillKeyMap = {}; // e.g. { 1: { name: 'magic_wip', ... }, 2: {...} }
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
    this.castingBarSlots = document.querySelectorAll("#casting-bar .casting-slot");

    // 1) Assign skills to keys 1..10 and update HTML
    this.setupSkills();

    // TAB logic
    this.input.keyboard.on("keydown-TAB", (event) => {
      event.preventDefault();
      this.cycleTarget();
      this.updateUI();
    });

    // Just for demonstration, we'll keep the old "basicAttack" on key "1"
    // but it will be overridden if playerSkills[0] (1st skill) exists.
    // See setupSkills() below for how we register skill keys.
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
    // We have up to 10 skill slots
    const maxSlots = 10;

    // Phaser KeyCodes for digits 1..10
    // (10 is KeyCodes.ZERO, but let's keep it simple and do 1..9 and 0, if you prefer)
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

    // Loop through 0..9
    for (let i = 0; i < maxSlots; i++) {
      const skill = playerSkills[i]; // might be undefined if player has < i+1 skills
      const slotIndex = i; // 0-based
      const displayIndex = i + 1; // for human reading (slot #1..10)

      // Update the casting bar slot text
      const slotEl = this.castingBarSlots[i];
      if (skill) {
        slotEl.textContent = skill.name; 
      } else {
        // If no skill, you could leave blank or keep the default "1,2.."
        slotEl.textContent = "";
      }

      // Register the key input
      const key = this.input.keyboard.addKey(keyCodes[i]);

      // On press, execute the skill or fallback
      key.on("down", () => {
        if (!skill) {
          // No skill in this slot
          console.log(`Slot ${displayIndex} has no skill assigned.`);
          return;
        }
        // We do a simple check if the skill is magic or melee-based
        // based on whether skill object has "magicAttack" or "meleeAttack"
        // (This is flexible; adjust as you see fit.)
        if (skill.magicAttack && skill.magicAttack > 0) {
          this.useMagicSkill(skill);
        } else if (skill.meleeAttack && skill.meleeAttack > 0) {
          this.useMeleeSkill(skill);
        } else {
          console.log(`Skill ${skill.name} doesn't have a recognized damage type!`);
        }
      });
    }
  }

  useMagicSkill(skill) {
    if (!this.targetedMob) {
      console.log(`No target selected for magic skill: ${skill.name}`);
      return;
    }
    // 1) Get final player stats
    const playerStats = calculatePlayerStats();
    // 2) Get mob stats
    const mobKey = this.targetedMob.customData.id;
    const mobStats = mobsData[mobKey];

    // 3) Calculate magic damage
    const dmg = calculateMagicDamage(playerStats, mobStats);
    // Optionally scale by skill's magicAttack if you want, e.g. + skill.magicAttack
    const totalDamage = dmg + skill.magicAttack;

    // 4) Apply damage
    this.applyDamageToMob(this.targetedMob, totalDamage);
    console.log(`Used magic skill: ${skill.name}, dealt ${totalDamage} damage.`);
  }

  useMeleeSkill(skill) {
    if (!this.targetedMob) {
      console.log(`No target selected for melee skill: ${skill.name}`);
      return;
    }
    const playerStats = calculatePlayerStats();
    const mobKey = this.targetedMob.customData.id;
    const mobStats = mobsData[mobKey];

    const dmg = calculateMeleeDamage(playerStats, mobStats);
    const totalDamage = dmg + skill.meleeAttack;

    this.applyDamageToMob(this.targetedMob, totalDamage);
    console.log(`Used melee skill: ${skill.name}, dealt ${totalDamage} damage.`);
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

  basicAttack() {
    // (Optional fallback if you want a default melee attack on key "1")
    if (!this.targetedMob) return;

    const playerStats = calculatePlayerStats();
    const mobKey = this.targetedMob.customData.id;
    const mobStats = mobsData[mobKey];
    if (!mobStats) return;

    const damage = calculateMeleeDamage(playerStats, mobStats);

    this.applyDamageToMob(this.targetedMob, damage);
    console.log(`Player did a basic melee attack for ${damage} damage.`);
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
    // 1) Retrieve player's final stats
    const finalStats = calculatePlayerStats();
    const { health, mana } = finalStats; 

    // 2) Retrieve meta data from playerProfile
    const { name, totalExp } = playerProfile;
    // For demo: pretend level is 5
    const level = 5;

    // 3) Suppose current HP/Mana = derived HP/Mana
    const currentHealth = health;
    const currentMana = mana;

    // 4) Update UI
    this.uiName.textContent = `Name: ${name}`;
    const healthPercent = (currentHealth / health) * 100;
    this.uiHealthFill.style.width = `${healthPercent}%`;

    const manaPercent = (currentMana / mana) * 100;
    this.uiManaFill.style.width = `${manaPercent}%`;

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
      frames: this.anims.generateFrameNumbers("characters", { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("characters", { start: 12, end: 14 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("characters", { start: 24, end: 26 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("characters", { start: 36, end: 38 }),
      frameRate: 10,
      repeat: -1,
    });

    // Mob animations
    this.anims.create({
      key: "mob-walk-down",
      frames: this.anims.generateFrameNumbers("characters", { start: 48, end: 50 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-left",
      frames: this.anims.generateFrameNumbers("characters", { start: 60, end: 62 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-right",
      frames: this.anims.generateFrameNumbers("characters", { start: 72, end: 74 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-up",
      frames: this.anims.generateFrameNumbers("characters", { start: 84, end: 86 }),
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
    this.player = this.physics.add.sprite(heroStart.x, heroStart.y, "characters");
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
}
