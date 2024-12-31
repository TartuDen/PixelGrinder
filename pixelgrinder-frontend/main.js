/*******************************************************
 * main.js
 *
 * This file sets up:
 *   1. A Phaser "config" object
 *   2. A basic "scene" with preload(), create(), update()
 *   3. Creates a new Phaser.Game instance
 *******************************************************/
const worldW = 800;
const worldH = 600;

// 1) Create a Scene
class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
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

  create() {
    // Create tilemap
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

    // Debugging (optional)
    // this.collisionLayer.renderDebug(this.add.graphics(), {
    //   tileColor: null, // No color for non-colliding tiles
    //   collidingTileColor: new Phaser.Display.Color(255, 0, 0, 100), // Red for colliding tiles
    //   faceColor: new Phaser.Display.Color(0, 255, 0, 100), // Green for colliding face edges
    // });

    // Find the "HeroStart" object in the "GameObjects" layer
    const heroStart = this.map.findObject(
      "GameObjects",
      (obj) => obj.name === "HeroStart"
    );

    // Define Player Animations
    // 1) Walking Down (row 0: frames 0..2)
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 0,
        end: 2,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // 2) Walking Left (row 1: frames 3..5)
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 12,
        end: 14,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // 3) Walking Right (row 2: frames 6..8)
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 24,
        end: 26,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // 4) Walking Up (row 3: frames 9..11)
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 36,
        end: 38,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Define Mob Animations (Slower Frame Rate)
    // Mob: Walking Down
    this.anims.create({
      key: "mob-walk-down",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 51,
        end: 53,
      }),
      frameRate: 10, // Slower frame rate
      repeat: -1,
    });

    // Mob: Walking Left
    this.anims.create({
      key: "mob-walk-left",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 75,
        end: 77,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Mob: Walking Right
    this.anims.create({
      key: "mob-walk-right",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 63,
        end: 65,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Mob: Walking Up
    this.anims.create({
      key: "mob-walk-up",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 87,
        end: 89,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Add the player at the HeroStart position
    this.player = this.physics.add.sprite(
      heroStart.x,
      heroStart.y,
      "characters"
    );
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1);
    this.physics.add.collider(this.player, this.collisionLayer);

    // Play initial animation based on direction or idle
    this.player.anims.play("walk-down"); // Example: start walking down

    // Camera
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

    // WASD keys
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.playerSpeed = 100;

    // ========== mobs ============
    // Group for mobs
    this.mobs = this.physics.add.group({
      collideWorldBounds: true, // auto-sets collideWorldBounds for children
      // You could also set immovable, bounce, etc. here if you want
    });
    // Prevent mobs from overlapping with other mobs
    this.physics.add.collider(this.mobs, this.mobs);

    // Prevent mobs from overlapping with the player (optional)
    this.physics.add.collider(this.mobs, this.player);

    // Find all mob spawn zones
    const mobSpawns = this.map
      .getObjectLayer("GameObjects")
      .objects.filter((obj) => obj.name.startsWith("MobSpawnZone"));

    console.log("Mob spawn zones:", mobSpawns);

    // Loop through spawn zones and spawn mobs
    mobSpawns.forEach((spawnZone) => {
      // Create the mob using the group's create(), not this.physics.add.sprite
      const mob = this.mobs.create(spawnZone.x, spawnZone.y, "characters");
      mob.setScale(1);

      // Now each child automatically respects collideWorldBounds, etc.
      mob.anims.play("mob-walk-down");

      // Assign movement
      this.assignMobMovement(mob);
    });

    // Optional: Add collisions between mobs and the world
    this.physics.add.collider(this.mobs, this.collisionLayer);
  }

  /**
   * Assigns movement behavior to a mob with randomized direction changes.
   * @param {Phaser.Physics.Arcade.Sprite} mob - The mob sprite to assign movement to.
   */
  assignMobMovement(mob) {
    // Function to change mob direction
    const changeDirection = () => {
      const randomDirection = Phaser.Math.Between(0, 3);
      const speed = 50; // Increased speed

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

      // Schedule the next direction change with a random delay (e.g., 3-6 seconds)
      this.time.addEvent({
        delay: Phaser.Math.Between(3000, 6000), // 3 to 6 seconds
        callback: changeDirection,
        callbackScope: this,
        loop: false,
      });
    };

    // Initialize the first direction change
    changeDirection();
  }

  update() {
    // Reset player velocity
    this.player.body.setVelocity(0);

    // Player Movement logic
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

    // If no keys are pressed, stop the animation
    if (
      !this.cursors.up.isDown &&
      !this.cursors.down.isDown &&
      !this.cursors.left.isDown &&
      !this.cursors.right.isDown
    ) {
      this.player.anims.stop();
      // Optionally set the frame to a default pose, e.g., idle
      // this.player.setFrame(0);
    }
  }
}

// 2) Create a Phaser config object
const config = {
  type: Phaser.AUTO,
  width: worldW,
  height: worldH,
  scene: [MainScene],
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
};

// 3) Launch the game
const game = new Phaser.Game(config);

/*============= main methods ===================*/
// this.player.setOrigin(0,0); // changing the center of the image form center to top left corner

// this.player.x = 11  // this can be used to set position

// this.player.setScale(1,1); // to scale the img
// this.player.scaleX = 2 // alternative way to scale
// this.player.displayWidth = 300 // alternative way to scale

// this.player.flipX = true; // way of flipping the img

// this.player.angle = 45; // rotate img 45deg clockwise
// this.player.setAngle(-45); // same thing with rotation

//================================================================
