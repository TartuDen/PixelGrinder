// config.js

export const worldW = 800;
export const worldH = 600;

export const gameConfig = {
  type: Phaser.AUTO,
  width: worldW,
  height: worldH,
  // We'll inject scenes from outside (e.g., MainScene)
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
};
