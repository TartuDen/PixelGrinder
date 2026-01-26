import { npcVendors } from "../data/MOCKdata.js";

export default class NPCManager {
  constructor(scene) {
    this.scene = scene;
    this.npcs = null;
    this.npcById = new Map();
    this.zoneId = null;
    this.tilemap = null;
  }

  createNPCs(zoneId, tilemap) {
    this.zoneId = zoneId;
    this.tilemap = tilemap;
    this.clearNpcGroup();
    this.npcs = this.scene.physics.add.group({ collideWorldBounds: true });

    const vendorsForZone = npcVendors.filter((vendor) => vendor.zoneId === zoneId);
    if (vendorsForZone.length === 0) {
      return;
    }

    const npcObjects = this.getNpcObjectsFromMap(tilemap);
    vendorsForZone.forEach((vendor, index) => {
      const npcPos = npcObjects[vendor.id] || vendor.position;
      if (!npcPos) return;
      this.createNpcSprite(vendor, npcPos);
    });
  }

  clearNpcGroup() {
    if (!this.npcs) {
      this.npcById.clear();
      return;
    }
    this.npcs.getChildren().forEach((npc) => this.destroyNpc(npc));
    this.npcs.clear(true, true);
    this.npcById.clear();
  }

  createNpcSprite(vendor, npcPos) {
    if (!this.npcs || !vendor || !npcPos) return null;
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
      dragging: false,
    };

    npc.setInteractive({ useHandCursor: true });
    npc.on("pointerdown", () => {
      if (this.scene.adminNpcPlacementActive) return;
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
    this.npcById.set(vendor.id, npc);
    this.startWander(npc);
    return npc;
  }

  destroyNpc(npc) {
    if (!npc) return;
    if (npc.customData?.wanderTimer) {
      npc.customData.wanderTimer.remove(false);
      npc.customData.wanderTimer = null;
    }
    if (npc.customData?.label) {
      npc.customData.label.destroy();
    }
    npc.destroy();
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

  getNpcById(id) {
    return this.npcById.get(id) || null;
  }

  updateNpcVendor(vendor) {
    if (!vendor) return;
    const npc = this.getNpcById(vendor.id);
    if (!npc) return;
    if (npc.customData?.label) {
      npc.customData.label.setText(vendor.name || vendor.id);
    }
  }

  updateNpcPosition(vendorId, position, updateHome = true) {
    const npc = this.getNpcById(vendorId);
    if (!npc || !position) return;
    npc.setPosition(position.x, position.y);
    if (npc.body) {
      npc.body.reset(position.x, position.y);
    }
    if (npc.customData?.label) {
      npc.customData.label.setPosition(position.x, position.y - 30);
    }
    if (updateHome && npc.customData) {
      npc.customData.home = { x: position.x, y: position.y };
    }
  }

  removeNpcById(vendorId) {
    const npc = this.getNpcById(vendorId);
    if (!npc) return;
    this.destroyNpc(npc);
    this.npcById.delete(vendorId);
  }

  addNpcVendor(vendor) {
    if (!vendor || !this.npcs) return;
    if (vendor.zoneId !== this.zoneId) return;
    const position = vendor.position || { x: 0, y: 0 };
    this.createNpcSprite(vendor, position);
  }

  refreshNpcsFromData() {
    if (!this.zoneId || !this.tilemap) return;
    this.createNPCs(this.zoneId, this.tilemap);
  }

  setAdminPlacementEnabled(enabled) {
    if (!this.npcs) return;
    this.npcs.getChildren().forEach((npc) => {
      this.scene.input.setDraggable(npc, enabled);
      if (enabled) {
        if (npc.customData?.wanderTimer) {
          npc.customData.wanderTimer.remove(false);
          npc.customData.wanderTimer = null;
        }
        npc.body.setVelocity(0, 0);
      } else {
        this.startWander(npc);
      }
      if (!npc.__pgDragHooked) {
        npc.__pgDragHooked = true;
        npc.on("dragstart", () => {
          npc.customData.dragging = true;
          if (npc.customData.wanderTimer) {
            npc.customData.wanderTimer.remove(false);
            npc.customData.wanderTimer = null;
          }
          npc.body.setVelocity(0, 0);
        });
        npc.on("drag", (pointer, dragX, dragY) => {
          npc.setPosition(dragX, dragY);
          if (npc.customData?.label) {
            npc.customData.label.setPosition(dragX, dragY - 30);
          }
        });
        npc.on("dragend", () => {
          npc.customData.dragging = false;
          const vendor = npc.customData?.vendor;
          if (vendor) {
            vendor.position = { x: npc.x, y: npc.y };
            this.scene.uiManager?.scheduleAdminOverridesSave();
          }
          if (npc.customData) {
            npc.customData.home = { x: npc.x, y: npc.y };
          }
          this.startWander(npc);
        });
      }
    });
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
    if (this.scene.adminNpcPlacementActive || npc.customData?.dragging) {
      npc.body.setVelocity(0, 0);
      return;
    }
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
