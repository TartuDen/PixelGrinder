// pixelgrinder-frontend\config.js

export const worldW = 800;
export const worldH = 600;

// Map generation mode: "generated" (current map1Data) or "procedural"
export const mapMode = "procedural";
export const mapSeed = 12345;
export const zoneWidth = 128;
export const zoneHeight = 128;
export const editorEnabled = true;

export const gameConfig = {
  type: Phaser.AUTO,
  width: worldW,
  height: worldH,
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  // We'll inject scenes from outside (e.g., MainScene)
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
};
