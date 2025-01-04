// scenes/MainScene.js

import { worldW, worldH } from "../config.js"; // if you need them
import {
  player_data,
  player_basic_stats,
  player_main_stats,
  player_wear_items,
  player_backpack,
  mobsData
} from "../MOCKdata.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.currentTargetIndex = null;
    this.targetedMob = null;
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

    // 1) Always grab these references so they're never undefined
    this.uiName = document.getElementById("player-name");
    this.uiHealthFill = document.getElementById("health-fill");
    this.uiManaFill = document.getElementById("mana-fill");
    this.uiLevel = document.getElementById("player-level");
    this.uiXP = document.getElementById("player-xp");

    // TAB logic
    this.input.keyboard.on("keydown-TAB", (event) => {
      event.preventDefault();
      this.cycleTarget();
      this.updateUI();
    });

    // Basic attack on key "1"
    this.input.keyboard.on("keydown-ONE", () => {
      this.basicAttack();
    });
  }

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
    if (!this.targetedMob) return;

    const damage = Math.max(
      (this.player.customData.str || 0) -
        (this.targetedMob.customData.melee_def || 0),
      1
    );

    // Clamp HP at 0
    this.targetedMob.customData.hp = Math.max(
      0,
      this.targetedMob.customData.hp - damage
    );

    this.targetedMob.customData.hpText.setText(
      `HP: ${this.targetedMob.customData.hp}`
    );

    if (this.targetedMob.customData.hp <= 0) {
      console.log("Mob died!");

      const deadMob = this.targetedMob;

      // Mark as dead so movement code ignores it
      deadMob.customData.isDead = true;
      // Immediately stop velocity
      deadMob.body.setVelocity(0, 0);

      // Play dead animation
      deadMob.anims.play("mob-dead", true);

      // Delay hiding mob until the animation finishes
      this.time.delayedCall(1000, () => {
        deadMob.setActive(false).setVisible(false);
        deadMob.body.setEnable(false);
        deadMob.customData.hpText.setVisible(false);

        // Wait 5s then re-activate
        this.time.addEvent({
          delay: 5000,
          callback: () => {
            this.respawnMob(deadMob);
          },
        });
      });

      this.targetedMob = null;
    }
  }

  respawnMob(mob) {
    const mobInfo = mobsData[mob.customData.id];

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
    const corpse = this.add.sprite(x, y, "$dead").setFrame(9); // Set the first frame of the dead animation
    corpse.setTint(0x666666);
    // remove corpse after 10s
    this.time.delayedCall(10000, () => corpse.destroy());
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

  updateUI() {
    // Suppose we have "player_main_stats" object
    const { health, mana } = player_main_stats;
    // The player_data object might have a "currentLevel" or "totalExp"
    const { playerName, totalExp } = player_data;
    // If you have a "level" calculation, e.g. level = 5
    const level = 5; // placeholder
    const currentHealth = 80; // example; maybe you store this in your player object
    const maxHealth = health; // 100 from your data
    const currentMana = 130; // example
    const maxMana = mana; // 150 from your data

    // 1) Player Name
    this.uiName.textContent = `Name: ${playerName}`;

    // 2) Health
    const healthPercentage = (currentHealth / maxHealth) * 100;
    this.uiHealthFill.style.width = `${healthPercentage}%`;

    // 3) Mana
    const manaPercentage = (currentMana / maxMana) * 100;
    this.uiManaFill.style.width = `${manaPercentage}%`;

    // 4) Level
    this.uiLevel.textContent = `Level: ${level}`;

    // 5) XP
    this.uiXP.textContent = `XP: ${totalExp}`;
  }

  /* ================ Helper Methods ================ */

  loadAssets() {
    // 1) Load your tilemap JSON
    this.load.tilemapTiledJSON("Map0", "assets/map/map0..tmj");

    // 2) Load the tileset image
    this.load.image("tmw_desert_spacing", "assets/map/tmw_desert_spacing.png");

    // 3) Load other assets
    this.load.image("player", "assets/player.png");

    // 4) Load the sprite sheet for characters
    this.load.spritesheet("characters", "assets/characters.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    // DEAD MOB ANIMATION
    this.load.spritesheet("$dead", "assets/$dead.png", {
      frameWidth: 32, // Individual frame width (96px / 3 columns)
      frameHeight: 32, // Individual frame height (128px / 4 rows)
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

    // Optional debug
    // this.collisionLayer.renderDebug(this.add.graphics(), {
    //   tileColor: null,
    //   collidingTileColor: new Phaser.Display.Color(255, 0, 0, 100),
    //   faceColor: new Phaser.Display.Color(0, 255, 0, 100),
    // });
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
      frames: this.anims.generateFrameNumbers("$dead", {
        start: 7, // The frame index corresponding to row 3, column 2 (row index starts at 0)
        end: 7, // Adjust as needed for the number of frames in the dead animation
      }),
      frameRate: 0, // Animation speed
      repeat: 0, // Play only once
    });
  }

  createPlayer() {
    // HeroStart position
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

    this.physics.add.collider(this.player, this.collisionLayer);

    // Optionally start an idle or walk animation
    this.player.anims.play("walk-down");
    this.playerSpeed = 100;

    // asign player stats to the player object
    this.player.customData = {
      name: player_data.playerName,
      totalExp: player_data.totalExp,
      str: player_main_stats.melee_attack,
      def: player_main_stats.melee_def,
      // etc.
    };
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

  createMobs() {
    const mobTypeID = "slime"; // or "goblin"
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
        melee_def: mobInfo.melee_def,
        spawnX: spawnZone.x,
        spawnY: spawnZone.y,
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

      // ***** Make interactive & add click event
      mob.setInteractive({ useHandCursor: true });
      mob.on("pointerdown", () => {
        this.onMobClicked(mob);
      });

      // Basic setup
      mob.setScale(1);
      mob.anims.play("mob-walk-down");
      this.assignMobMovement(mob);
    });
  }

  onMobClicked(mob) {
    if (!mob.active) return;

    // Clear tints
    this.mobs.getChildren().forEach((m) => m.clearTint());

    // Tint this one
    mob.setTint(0xff0000);

    // Set as main target
    this.targetedMob = mob;

    // Sync the index if you want
    const mobArray = this.mobs.getChildren();
    this.currentTargetIndex = mobArray.indexOf(mob);

    console.log("Mob clicked:", mob.customData.id, "HP:", mob.customData.hp);
  }

  assignMobMovement(mob) {
    const changeDirection = () => {
      // If mob is inactive or flagged dead, skip
      if (!mob.active || mob.customData.isDead) {
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

      // Update HP text position
      mob.customData.hpText.setPosition(mob.x, mob.y - 20);

      // Schedule next direction change
      this.time.addEvent({
        delay: Phaser.Math.Between(3000, 7000),
        callback: changeDirection,
        callbackScope: this,
      });
    };

    changeDirection();
  }

  handlePlayerMovement() {
    if (!this.player || !this.player.body) return; // safety

    // Reset velocity
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

    // Idle
    if (
      !this.cursors.up.isDown &&
      !this.cursors.down.isDown &&
      !this.cursors.left.isDown &&
      !this.cursors.right.isDown
    ) {
      this.player.anims.stop();
      // this.player.setFrame(0);
    }
  }
}
