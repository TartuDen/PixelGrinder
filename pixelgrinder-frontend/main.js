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
  /**
   * The constructor simply calls the parent Phaser.Scene constructor
   * with a key (optional). We'll call our scene "MainScene".
   */
  constructor() {
    super("MainScene");
  }

  /**
   * preload()
   *
   * - Loads assets (images, sprites, sound, etc.) into memory
   *   before the game starts.
   * - This function is called automatically by Phaser before create().
   */
  preload() {
    // 1) Load your tilemap JSON
    // In Tiled, exporting as JSON typically uses extension .json or .tmj, so "tilemapTiledJSON" is the correct loader
    this.load.tilemapTiledJSON("Map0", "assets/map/map0..tmj");

    // 2) Load the tileset image
    this.load.image("tmw_desert_spacing", "assets/map/tmw_desert_spacing.png");

    // 3) (Optional) load other assets, e.g., the player
    this.load.image("player", "assets/player.png");

    this.load.spritesheet("characters", "assets/characters.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  /**
   * create()
   *
   * - Called once after all assets in preload() are loaded.
   * - Usually used to set up objects, sprites, text, etc. in your scene.
   */
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

    // 1) Walking Down (row 0: frames 0..2)
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 0,
        end: 2,
      }),
      frameRate: 10, // frames per second
      repeat: -1, // loop forever
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

    // Add the player at the HeroStart position
    // this.player = this.physics.add.sprite(heroStart.x, heroStart.y, "player");
    this.player = this.physics.add.sprite(
      heroStart.x,
      heroStart.y,
      "characters"
    );
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1);
    this.physics.add.collider(this.player, this.collisionLayer);

    // For demonstration, let’s just play "walk-down"
    // this.player.anims.play("walk-down");

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

    this.playerSpeed = 200;
  }

  /**
   * update(time, delta)
   *
   * - Runs in a loop ~60 times per second (depending on your device).
   * - Great for continuously checking input, moving sprites, collisions, etc.
   * @param {number} time - The current time in milliseconds since the game started
   * @param {number} delta - The delta time in ms since the last frame
   */
  update() {
    // Reset velocity
    this.player.body.setVelocity(0);

    // Movement logic
    if (this.cursors.up.isDown) {
      this.player.body.setVelocityY(-this.playerSpeed);
      // Play the "walk-up" animation if it's not already playing
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

    // If no keys are pressed, optionally stop on the first frame of "walk-down" or a separate "idle" anim
    if (
      !this.cursors.up.isDown &&
      !this.cursors.down.isDown &&
      !this.cursors.left.isDown &&
      !this.cursors.right.isDown
    ) {
      this.player.anims.stop();
      // Optionally set the frame to a default pose, e.g. frame 0
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

//============= main methods ===================
// this.player.setOrigin(0,0); // changing the center of the image form center to top left corner

// this.player.x = 11  // this can be used to set position

// this.player.setScale(1,1); // to scale the img
// this.player.scaleX = 2 // alternative way to scale
// this.player.displayWidth = 300 // altenative way to scale

// this.player.flipX = true; // way of flipping the img

// this.player.angle = 45; // rotate img 45deg clockwise
// this.player.setAngle(- 45); // same thing with rotation

//================================================================
