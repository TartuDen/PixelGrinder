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
    // Example: if you have an image in "assets/player.png", you could load it here:
    this.load.image("player", "assets/player.png");
    this.load.image("grassBg", "assets/grass bg 4.png");

  }

  /**
   * create()
   *
   * - Called once after all assets in preload() are loaded.
   * - Usually used to set up objects, sprites, text, etc. in your scene.
   */
  create() {

    // 1) Enable Arcade Physics for this scene
    this.physics.world.setBounds(0, 0, worldW, worldH);

    this.bg = this.add.sprite(worldH/2, worldH/2, "grassBg")

    // 2) Create a physics-enabled sprite
    this.player = this.physics.add.sprite(100, 100, "player");
    this.player.depth = 999;

    this.player.setScale(0.1); // to scale the img


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

    // So the player can't leave the game bounds
    this.player.setCollideWorldBounds(true);

    // 3) Create WASD keys
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Movement speed in pixels per second
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
  update(time, delta) {

    // this.player.x += 1;
    /// 4) Set up velocity each frame
    this.player.body.setVelocity(0);

    if (this.cursors.up.isDown) {
      this.player.body.setVelocityY(-this.playerSpeed);
    } else if (this.cursors.down.isDown) {
      this.player.body.setVelocityY(this.playerSpeed);
    }

    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-this.playerSpeed);
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(this.playerSpeed);
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

/**
 * Explanation of core config properties:
 * - type: Phaser.AUTO tries WebGL first, then falls back to Canvas if not supported.
 * - width, height: The dimension of your game’s canvas in pixels.
 * - parent: An HTML element ID where Phaser will create the <canvas> or <webgl> context.
 * - scene: An array (or single object) of Scenes to load. We only have one (MainScene).
 * - backgroundColor: The default background color, can be hex or other CSS color formats.
 */
