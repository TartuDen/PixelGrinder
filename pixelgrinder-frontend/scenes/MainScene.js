// scenes/MainScene.js

import { worldW, worldH } from "../config.js"; // if you need them
import {
  player_data,
  player_basic_stats,
  player_main_stats,
  player_items,
  player_backpack,
  mobsData,
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

    // Tab-target logic
    this.input.keyboard.on("keydown-TAB", (event) => {
      event.preventDefault();
      this.cycleTarget();
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
    this.targetedMob.customData.hp -= damage;

    if (this.targetedMob.customData.hp <= 0) {
      console.log("Mob died!");
      // spawn a corpse
      this.spawnCorpse(this.targetedMob.x, this.targetedMob.y);

      // "Deactivate" this mob
      this.targetedMob.setActive(false).setVisible(false);
      this.targetedMob.body.setEnable(false); // remove collisions
      const deadMob = this.targetedMob;
      this.targetedMob = null; // no longer have a valid target

      // Wait 5s then re-activate
      this.time.addEvent({
        delay: 5000,
        callback: () => {
          this.respawnMob(deadMob);
        },
      });
    }
  }

  respawnMob(mob) {
    // Reset or fetch your mob’s base HP from data, or just pick a default
    mob.customData.hp = 30;

    // Move it back to spawn coords
    mob.x = mob.customData.spawnX;
    mob.y = mob.customData.spawnY;

    // Re-enable
    mob.setActive(true).setVisible(true);
    mob.body.setEnable(true);

    // Optionally set an initial animation
    mob.anims.play("mob-walk-down");
    console.log("Mob re-activated at:", mob.x, mob.y);
  }

  spawnCorpse(x, y) {
    const corpse = this.add.sprite(x, y, "characters");
    corpse.setTint(0x666666);
    // remove corpse after 10s
    this.time.delayedCall(10000, () => corpse.destroy());
  }

  update() {
    this.handlePlayerMovement();
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

    // Create group for mobs
    this.mobs = this.physics.add.group({ collideWorldBounds: true });

    // Collisions
    this.physics.add.collider(this.mobs, this.player);
    this.physics.add.collider(this.mobs, this.collisionLayer);

    // Find mob spawns
    const mobSpawns = this.map
      .getObjectLayer("GameObjects")
      .objects.filter((obj) => obj.name.startsWith("MobSpawnZone"));

    mobSpawns.forEach((spawnZone) => {
      const mob = this.mobs.create(spawnZone.x, spawnZone.y, "characters");

      // Assign customData, including spawn coords
      mob.customData = {
        id: mobTypeID,
        hp: mobInfo.health,
        melee_def: mobInfo.melee_def,
        spawnX: spawnZone.x,
        spawnY: spawnZone.y,
      };

      mob.setScale(1);
      mob.anims.play("mob-walk-down");

      this.assignMobMovement(mob);
    });
  }

  assignMobMovement(mob) {
    const changeDirection = () => {
      // If mob is no longer active, skip
      if (!mob.active) {
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

      // Re-trigger after a random delay
      this.time.addEvent({
        delay: Phaser.Math.Between(3000, 7000),
        callback: changeDirection,
        callbackScope: this,
        loop: false,
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
