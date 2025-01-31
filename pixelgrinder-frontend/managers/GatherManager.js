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
    // Always hide tooltip first
    this.hoveredGatherTile = null;
    this.gatherTooltip.style.display = "none";

    const pointer = this.scene.input.activePointer;
    if (!pointer) return;

    // Convert pointer.x/pointer.y into DOM coordinates
    const canvasRect = this.scene.game.canvas.getBoundingClientRect();
    const domX = canvasRect.left + pointer.x;
    const domY = canvasRect.top + pointer.y;

    // Check if the mouse is hovering over a gather tile
    const worldPoint = this.scene.cameras.main.getWorldPoint(
      pointer.x,
      pointer.y
    );
    const tile = this.gatherRockLayer.getTileAtWorldXY(
      worldPoint.x,
      worldPoint.y
    );

    if (tile) {
      // Over gatherable tile → show "GATHER" near cursor
      this.hoveredGatherTile = tile;
      this.scene.input.setDefaultCursor("pointer");

      this.gatherTooltip.style.display = "block";
      // Offset a bit so it’s not behind the actual cursor
      this.gatherTooltip.style.left = `${domX +15}px`;
      this.gatherTooltip.style.top = `${domY +15}px`;
    } else {
      // Not on a gatherable tile
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
