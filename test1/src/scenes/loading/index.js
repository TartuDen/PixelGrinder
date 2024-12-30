import Phaser from 'phaser';

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super('loading-scene');
  }

  preload() {
    // Use your actual path or server route
    this.load.baseURL = 'assets/';

    // Our king texture
    this.load.image('king', 'sprites/king.png');

    // Our king atlas
    this.load.atlas('a-king', 'spritesheets/a-king.png', 'spritesheets/a-king_atlas.json');

    // Loading Map
    this.load.image({
      key: 'tiles',
      url: 'tilemaps/tiles/dungeon-16-16.png'
    });
    this.load.tilemapTiledJSON('dungeon', 'tilemaps/json/dungeon.json');

    // CHEST LOADING
    this.load.spritesheet('tiles_spr', 'tilemaps/tiles/dungeon-16-16.png', {
      frameWidth: 16,
      frameHeight: 16
    });
  }

  create() {
    this.scene.start('level-1-scene');
    this.scene.start('ui-scene');
  }
}
