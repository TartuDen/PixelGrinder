// main.js
import { gameConfig } from "./config.js";
import MainScene from "./scenes/MainScene.js";
import {
  player_data,
  player_basic_stats,
  player_main_stats,
  player_items,
  player_backpack,
} from "./MOCKdata.js";

console.log("Player Data:", player_data);

// Merge scenes into gameConfig
gameConfig.scene = [MainScene];

// Launch Phaser game
const game = new Phaser.Game(gameConfig);
