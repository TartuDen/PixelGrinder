// File: main.js
import { gameConfig } from "./config.js";
import MainScene from "./scenes/MainScene.js";
// Import the new scene:
import CharacterCreationScene from "./scenes/CharacterCreationScene.js";

// Add scenes to the config in order:
gameConfig.scene = [CharacterCreationScene, MainScene];

// Launch Phaser
const game = new Phaser.Game(gameConfig);
