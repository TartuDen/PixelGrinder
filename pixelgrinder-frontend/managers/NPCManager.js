import { npcVendors } from "../data/MOCKdata.js";

export default class NPCManager {
  constructor(scene) {
    this.scene = scene;
    this.npcs = null;
  }

  createNPCs(zoneId, tilemap) {
    this.npcs = this.scene.physics.add.group({ collideWorldBounds: true });

    const vendorsForZone = npcVendors.filter((vendor) => vendor.zoneId === zoneId);
    if (vendorsForZone.length === 0) {
      return;
    }

    const npcObjects = this.getNpcObjectsFromMap(tilemap);
    vendorsForZone.forEach((vendor, index) => {
      const npcPos = npcObjects[vendor.id] || vendor.position;
      if (!npcPos) return;

      const npc = this.npcs.create(npcPos.x, npcPos.y, "npc-vendor");
      npc.setPushable(false);
      npc.setImmovable(true);
      npc.setDepth(5);
      npc.customData = {
        id: vendor.id,
        vendor,
        home: { x: npcPos.x, y: npcPos.y },
        wanderRadius: 18,
        wanderTimer: null,
        bobTween: null,
        lastDirection: "down",
      };

      npc.setInteractive({ useHandCursor: true });
      npc.on("pointerdown", () => {
        this.scene.uiManager.openShop(vendor);
      });

      const label = this.scene.add
        .text(npc.x, npc.y - 30, vendor.name, {
          font: "12px Arial",
          fill: "#f1c40f",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0.5);
      npc.customData.label = label;
      this.startWander(npc);
    });
  }

  getNpcObjectsFromMap(tilemap) {
    if (!tilemap) return {};
    const layer = tilemap.getObjectLayer("NPCs");
    if (!layer) return {};

    const map = {};
    layer.objects.forEach((obj) => {
      if (!obj.name) return;
      map[obj.name] = { x: obj.x, y: obj.y };
    });
    return map;
  }

  update() {
    if (!this.npcs) return;
    this.npcs.getChildren().forEach((npc) => {
      if (npc.customData && npc.customData.label) {
        npc.customData.label.setPosition(npc.x, npc.y - 30);
      }
    });
  }

  startWander(npc) {
    const { wanderRadius } = npc.customData;
    if (npc.customData.wanderTimer) {
      npc.customData.wanderTimer.remove(false);
      npc.customData.wanderTimer = null;
    }

    const doIdle = Phaser.Math.Between(0, 1) === 0;
    if (doIdle) {
      npc.body.setVelocity(0, 0);
      this.playIdle(npc);
      npc.customData.wanderTimer = this.scene.time.addEvent({
        delay: Phaser.Math.Between(1200, 2000),
        callback: () => this.startWander(npc),
      });
      return;
    }

    const { home } = npc.customData;
    let chosen = this.pickRandomDirection();
    if (this.isOutsideRadius(npc, wanderRadius)) {
      chosen = this.directionTowardHome(npc, home);
    }

    const speed = 20;
    npc.customData.lastDirection = chosen.dir;
    npc.body.setVelocity(chosen.x * speed, chosen.y * speed);
    npc.anims.play(`npc-walk-${chosen.dir}`, true);

    npc.customData.wanderTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(1200, 2200),
      callback: () => {
        npc.body.setVelocity(0, 0);
        this.playIdle(npc);
        this.startWander(npc);
      },
    });
  }

  playIdle(npc) {
    const dir = npc.customData.lastDirection || "down";
    npc.anims.stop();
    npc.anims.play(`npc-walk-${dir}`, true);
    npc.anims.pause();
  }

  pickRandomDirection() {
    const directions = [
      { x: 1, y: 0, dir: "right" },
      { x: -1, y: 0, dir: "left" },
      { x: 0, y: 1, dir: "down" },
      { x: 0, y: -1, dir: "up" },
    ];
    return Phaser.Utils.Array.GetRandom(directions);
  }

  isOutsideRadius(npc, radius) {
    const { home } = npc.customData;
    const dx = npc.x - home.x;
    const dy = npc.y - home.y;
    return Math.abs(dx) > radius || Math.abs(dy) > radius;
  }

  directionTowardHome(npc, home) {
    const dx = home.x - npc.x;
    const dy = home.y - npc.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx >= 0 ? { x: 1, y: 0, dir: "right" } : { x: -1, y: 0, dir: "left" };
    }
    return dy >= 0 ? { x: 0, y: 1, dir: "down" } : { x: 0, y: -1, dir: "up" };
  }
}
