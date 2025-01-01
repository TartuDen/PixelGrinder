// main.js
import { gameConfig } from "./config.js";
import MainScene from "./scenes/MainScene.js";

// Merge scenes into gameConfig
gameConfig.scene = [MainScene];

// Launch Phaser game
const game = new Phaser.Game(gameConfig);
