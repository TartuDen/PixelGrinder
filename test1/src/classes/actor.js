import Phaser from 'phaser';

export class Actor extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, frame) {
    super(scene, x, y, texture, frame);

    // Default HP
    this.hp = 100;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.getBody().setCollideWorldBounds(true);
  }

  getDamage(value = 1) {
    // Attack animation (blink)
    this.scene.tweens.add({
      targets: this,
      duration: 100,
      repeat: 3,
      yoyo: true,
      alpha: 0.5,
      onStart: () => {
        this.hp = this.hp - value;
      },
      onComplete: () => {
        this.setAlpha(1);
      }
    });
  }

  getHPValue() {
    return this.hp;
  }

  checkFlip() {
    if (this.body.velocity.x < 0) {
      this.scaleX = -1;
    } else {
      this.scaleX = 1;
    }
  }

  getBody() {
    return this.body;
  }
}
