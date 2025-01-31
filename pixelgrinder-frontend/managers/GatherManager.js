// managers/GatherManager.js

import { GATHER_RANGE } from "../data/MOCKdata.js";

export default class GatherManager {
  /**
   * @param {Phaser.Scene} scene The scene (e.g. MainScene) where we do gathering
   * @param {Object} playerManager A reference to the PlayerManager
   * @param {Object} uiManager A reference to the UIManager
   * @param {Object} chatManager A reference to the ChatManager
   */
  constructor(scene, playerManager, uiManager, chatManager) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.uiManager = uiManager;
    this.chatManager = chatManager;

    this.hoveredGatherTile = null;
    this.gatherTimer = null;
    this.gatherTooltip = null;

    this.pointerScreenX = 0;
    this.pointerScreenY = 0;
  }

  init(gatherRockLayer) {
    // Keep a reference to the gatherRockLayer from your Tiled map
    this.gatherRockLayer = gatherRockLayer;

    // Create gather tooltip (floating "GATHER" text)
    this.gatherTooltip = document.createElement("div");
    this.gatherTooltip.style.position = "fixed";
    this.gatherTooltip.style.background = "rgba(0, 0, 0, 0.7)";
    this.gatherTooltip.style.color = "#f1c40f";
    this.gatherTooltip.style.padding = "3px 5px";
    this.gatherTooltip.style.borderRadius = "4px";
    this.gatherTooltip.style.fontFamily = "Cinzel, serif";
    this.gatherTooltip.style.display = "none";
    this.gatherTooltip.innerText = "GATHER";
    document.body.appendChild(this.gatherTooltip);

    // Track mouse position
    this.scene.input.on("pointermove", (pointer) => {
      this.pointerScreenX = pointer.x;
      this.pointerScreenY = pointer.y;
    });

    // Listen for LEFT-click to attempt gather
    this.scene.input.on("pointerdown", (pointer) => {
      if (pointer.button === 0 && this.hoveredGatherTile) {
        this.attemptGather(this.hoveredGatherTile);
      }
    });
  }

  update() {
    // Hide tooltip by default
    this.hoveredGatherTile = null;
    this.gatherTooltip.style.display = "none";

    // Convert mouse coords to world coords
    const worldPoint = this.scene.cameras.main.getWorldPoint(
      this.pointerScreenX,
      this.pointerScreenY
    );
    const tile = this.gatherRockLayer.getTileAtWorldXY(
      worldPoint.x,
      worldPoint.y
    );

    if (tile) {
      this.hoveredGatherTile = tile;
      this.scene.input.setDefaultCursor("pointer");

      // Compute the center of this tile in world coordinates
      const tileCenterX =
        this.gatherRockLayer.tileToWorldX(tile.x) +
        this.scene.map.tileWidth / 2;
      const tileCenterY =
        this.gatherRockLayer.tileToWorldY(tile.y) +
        this.scene.map.tileHeight / 2;

      // Convert that world position to "screen" coords inside the Phaser canvas
      const camera = this.scene.cameras.main;
      const zoom = camera.zoom;

      // 1) Adjust for camera scroll
      let screenX = (tileCenterX - camera.scrollX) * zoom;
      let screenY = (tileCenterY - camera.scrollY) * zoom;

      // 2) Get the bounding rect of your <canvas> to place the tooltip in DOM
      const canvasRect = this.scene.game.canvas.getBoundingClientRect();

      screenX += canvasRect.left;
      screenY += canvasRect.top;

      // Display the tooltip in that position
      this.gatherTooltip.style.display = "block";
      this.gatherTooltip.style.left = `${screenX}px`;
      this.gatherTooltip.style.top = `${screenY}px`;
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

    const distance = Phaser.Math.Distance.Between(
      px,
      py,
      tileWorldX,
      tileWorldY
    );
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

    // Remove tile from gather_rock layer
    this.gatherRockLayer.removeTileAt(tile.x, tile.y);

    // Give item to inventory
    this.playerManager.addItemToInventory(4000, 1);
    this.chatManager.addMessage(
      "You gathered a 'simple_rock'. Added to inventory!"
    );
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
