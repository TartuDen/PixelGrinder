// managers/GatherManager.js

import { GATHER_RANGE } from "../data/MOCKdata.js";

export default class GatherManager {
  constructor(scene, playerManager, uiManager, chatManager) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.uiManager = uiManager;
    this.chatManager = chatManager;

    this.gatherRockLayer = null;
    this.hoveredGatherTile = null;
    this.gatherTimer = null;
  }

  init(gatherRockLayer) {
    // Keep a reference to the gatherRockLayer from your Tiled map
    this.gatherRockLayer = gatherRockLayer;

    // Re-add pointerdown logic so left-click can gather
    this.scene.input.on("pointerdown", (pointer) => {
      if (pointer.button === 0 && this.hoveredGatherTile) {
        this.attemptGather(this.hoveredGatherTile);
      }
    });
  }

  update() {
    // Reset hovered tile
    this.hoveredGatherTile = null;

    // Get pointer and convert to world coords
    const pointer = this.scene.input.activePointer;
    if (!pointer) {
      this.scene.input.setDefaultCursor("default");
      return;
    }

    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile = this.gatherRockLayer.getTileAtWorldXY(worldPoint.x, worldPoint.y);

    if (tile) {
      this.hoveredGatherTile = tile;
      // Change cursor shape to indicate gatherable
      this.scene.input.setDefaultCursor("crosshair");
    } else {
      this.scene.input.setDefaultCursor("default");
    }
  }

  attemptGather(tile) {
    const player = this.playerManager.player;
    const px = player.x;
    const py = player.y;

    const tileWorldX =
      this.gatherRockLayer.tileToWorldX(tile.x) + this.scene.map.tileWidth / 2;
    const tileWorldY =
      this.gatherRockLayer.tileToWorldY(tile.y) + this.scene.map.tileHeight / 2;

    const distance = Phaser.Math.Distance.Between(px, py, tileWorldX, tileWorldY);
    if (distance > GATHER_RANGE) {
      this.chatManager.addMessage("Too far to gather this resource.");
      return;
    }

    // If already gathering or casting
    if (this.playerManager.isGathering || this.scene.skillManager.isCasting) {
      this.chatManager.addMessage("You're busy and can't gather right now.");
      return;
    }

    this.chatManager.addMessage("Starting gathering...");
    this.playerManager.isGathering = true;

    const playerStats = this.playerManager.getPlayerStats();
    const gatherSpeed = playerStats.gatherSpeed || 1;
    const baseTime = 3; // base gather time in seconds
    const gatherTime = baseTime / gatherSpeed;

    this.uiManager.showCastingProgress("Gathering...", gatherTime);

    let elapsedTime = 0;
    const step = 0.1;

    this.gatherTimer = this.scene.time.addEvent({
      delay: step * 1000,
      loop: true,
      callback: () => {
        elapsedTime += step;
        this.uiManager.updateCastingProgress(elapsedTime, gatherTime);

        // Check if player moved out of range
        const newDist = Phaser.Math.Distance.Between(
          player.x,
          player.y,
          tileWorldX,
          tileWorldY
        );
        if (newDist > GATHER_RANGE) {
          this.chatManager.addMessage("Gather canceled (moved out of range).");
          this.cancelGather();
          return;
        }

        // Done?
        if (elapsedTime >= gatherTime) {
          this.finishGather(tile);
        }
      },
    });
  }

  finishGather(tile) {
    this.chatManager.addMessage("Gather complete!");

    if (this.gatherTimer) {
      this.gatherTimer.remove(false);
      this.gatherTimer = null;
    }
    this.playerManager.isGathering = false;
    this.uiManager.hideCastingProgress();

    // Attempt to add item "simple_rock" (id=4000)
    const success = this.playerManager.addItemToInventory(4000, 1);
    if (success) {
      // If added successfully, remove tile from gather_rock layer
      this.gatherRockLayer.removeTileAt(tile.x, tile.y);
      this.chatManager.addMessage("You gathered a 'simple_rock'. Added to inventory!");
    } else {
      // Inventory was full or locked
      this.chatManager.addMessage("Your inventory is full. The rock remains on the ground.");
    }
  }

  cancelGather() {
    if (this.gatherTimer) {
      this.gatherTimer.remove(false);
      this.gatherTimer = null;
    }
    this.playerManager.isGathering = false;
    this.uiManager.hideCastingProgress();
  }
}
