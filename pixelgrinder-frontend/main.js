// main.js
import { gameConfig } from "./config.js";
import MainScene from "./scenes/MainScene.js";

// Add your main scene to the config
gameConfig.scene = [MainScene];

// Launch Phaser
const game = new Phaser.Game(gameConfig);
