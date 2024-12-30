import Phaser from 'phaser';
import { EVENTS_NAME, GameStatus } from '../consts.js';
import { Actor } from './actor.js';
import { Text } from './text.js';

export class Player extends Actor {
  constructor(scene, x, y) {
    super(scene, x, y, 'king');

    this.initAnimations();

    // KEYS
    this.keyUp = this.scene.input.keyboard.addKey('UP');
    this.keyLeft = this.scene.input.keyboard.addKey('LEFT');
    this.keyDown = this.scene.input.keyboard.addKey('DOWN');
    this.keyRight = this.scene.input.keyboard.addKey('RIGHT');
    this.keySpace = this.scene.input.keyboard.addKey(32);

    // Attack
    this.keySpace.on('down', () => {
      this.anims.play('attack', true);
      this.scene.game.events.emit(EVENTS_NAME.ATTACK);
    });

    // HP text
    this.hpValue = new Text(this.scene, this.x, this.y - this.height, this.hp.toString())
      .setFontSize(12)
      .setOrigin(0.8, 0.5);

    this.getBody().setSize(30, 30);
    this.getBody().setOffset(8, 0);

    this.on('destroy', () => {
      this.keySpace.removeAllListeners();
    });
  }

  initAnimations() {
    this.scene.anims.create({
      key: 'run',
      frames: this.scene.anims.generateFrameNames('a-king', {
        prefix: 'run-',
        end: 7
      }),
      frameRate: 8
    });

    this.scene.anims.create({
      key: 'attack',
      frames: this.scene.anims.generateFrameNames('a-king', {
        prefix: 'attack-',
        end: 2
      }),
      frameRate: 8
    });
  }

  update() {
    this.getBody().setVelocity(0);

    if (this.keyUp.isDown) {
      this.body.velocity.y = -110;
      if (!this.anims.isPlaying) this.anims.play('run', true);
    }
    if (this.keyLeft.isDown) {
      this.body.velocity.x = -110;
      this.checkFlip();
      this.getBody().setOffset(48, 15);
      if (!this.anims.isPlaying) this.anims.play('run', true);
    }
    if (this.keyDown.isDown) {
      this.body.velocity.y = 110;
      if (!this.anims.isPlaying) this.anims.play('run', true);
    }
    if (this.keyRight.isDown) {
      this.body.velocity.x = 110;
      this.checkFlip();
      this.getBody().setOffset(15, 15);
      if (!this.anims.isPlaying) this.anims.play('run', true);
    }

    // Move HP text
    this.hpValue.setPosition(this.x, this.y - this.height * 0.4);
    this.hpValue.setOrigin(0.8, 0.5);
  }

  // Overwrite getDamage from Actor
  getDamage(value = 1) {
    super.getDamage(value);
    this.hpValue.setText(this.hp.toString());

    if (this.hp <= 0) {
      this.scene.game.events.emit(EVENTS_NAME.GAME_END, GameStatus.LOSE);
    }
  }
}
