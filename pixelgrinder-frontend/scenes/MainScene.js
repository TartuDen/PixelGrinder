// scenes/MainScene.js

import { worldW, worldH } from "../config.js"; // if you need them

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
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
    this.collisionLayer.setCollision([30, 31, 32, 37, 38, 39, 40, 45, 46, 47, 48]);

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
      frames: this.anims.generateFrameNumbers("characters", { start: 51, end: 53 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-left",
      frames: this.anims.generateFrameNumbers("characters", { start: 75, end: 77 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-right",
      frames: this.anims.generateFrameNumbers("characters", { start: 63, end: 65 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-up",
      frames: this.anims.generateFrameNumbers("characters", { start: 87, end: 89 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  createPlayer() {
    // HeroStart position
    const heroStart = this.map.findObject("GameObjects", (obj) => obj.name === "HeroStart");
    this.player = this.physics.add.sprite(heroStart.x, heroStart.y, "characters");
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1);

    this.physics.add.collider(this.player, this.collisionLayer);

    // Optionally start an idle or walk animation
    this.player.anims.play("walk-down");
    this.playerSpeed = 100;
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
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
    // Create group for mobs
    this.mobs = this.physics.add.group({ collideWorldBounds: true });

    // Collisions
    // this.physics.add.collider(this.mobs, this.mobs);
    this.physics.add.collider(this.mobs, this.player);
    this.physics.add.collider(this.mobs, this.collisionLayer);

    // Find mob spawns
    const mobSpawns = this.map
      .getObjectLayer("GameObjects")
      .objects.filter((obj) => obj.name.startsWith("MobSpawnZone"));

    mobSpawns.forEach((spawnZone) => {
      const mob = this.mobs.create(spawnZone.x, spawnZone.y, "characters");
      mob.setScale(1);
      mob.anims.play("mob-walk-down");

      this.assignMobMovement(mob);
    });
  }

  assignMobMovement(mob) {
    const changeDirection = () => {
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

      // Random re-trigger
      this.time.addEvent({
        delay: Phaser.Math.Between(3000, 6000),
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
