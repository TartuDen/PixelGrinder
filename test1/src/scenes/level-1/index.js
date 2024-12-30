import Phaser from 'phaser';
import { gameObjectsToObjectPoints } from '../../helpers/gameobject-to-object-point.js';
import { Player } from '../../classes/player.js';
import { EVENTS_NAME } from '../../consts.js';
import { Enemy } from '../../classes/enemy.js';

export class Level1 extends Phaser.Scene {
  constructor() {
    super('level-1-scene');
    this.enemies = [];
    this.chests = [];
  }

  // Initialize map
  initMap() {
    this.map = this.make.tilemap({ key: 'dungeon', tileWidth: 16, tileHeight: 16 });
    this.tileset = this.map.addTilesetImage('dungeon', 'tiles');
    this.groundLayer = this.map.createLayer('Ground', this.tileset, 0, 0);
    this.wallsLayer = this.map.createLayer('Walls', this.tileset, 0, 0);

    this.wallsLayer.setCollisionByProperty({ collides: true });
    this.physics.world.setBounds(0, 0, this.wallsLayer.width, this.wallsLayer.height);
  }

  // Intialize camera
  initCamera() {
    this.cameras.main.setSize(this.game.scale.width, this.game.scale.height);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(2);
  }

  // Initialize chests
  initChests() {
    const chestPoints = gameObjectsToObjectPoints(
      this.map.filterObjects('Chests', (obj) => obj.name === 'ChestPoint')
    );

    this.chests = chestPoints.map((chestPoint) =>
      this.physics.add
        .sprite(chestPoint.x, chestPoint.y, 'tiles_spr', 595)
        .setScale(1.5)
    );

    this.chests.forEach((chest) => {
      this.physics.add.overlap(this.player, chest, (obj1, obj2) => {
        this.game.events.emit(EVENTS_NAME.CHEST_LOOT);
        obj2.destroy();
        this.cameras.main.flash();
      });
    });
  }

  // Initialize enemies
  initEnemies() {
    const enemiesPoints = gameObjectsToObjectPoints(
      this.map.filterObjects('Enemies', (obj) => obj.name === 'EnemyPoint')
    );

    this.enemies = enemiesPoints.map((enemyPoint) =>
      new Enemy(this, enemyPoint.x, enemyPoint.y, 'tiles_spr', this.player, 503)
        .setName(enemyPoint.id.toString())
        .setScale(1.5)
    );

    this.physics.add.collider(this.enemies, this.wallsLayer);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.player, this.enemies, (obj1, obj2) => {
      obj1.getDamage(1);
    });
  }

  create() {
    // Load map
    this.initMap();

    // Add a player character
    this.player = new Player(this, 100, 100);

    // Load Chests
    this.initChests();

    // Load Enemies
    this.initEnemies();

    this.initCamera();

    // Collisions
    this.physics.add.collider(this.player, this.wallsLayer);
  }

  update() {
    if (this.player) {
      this.player.update();
    }
  }
}
