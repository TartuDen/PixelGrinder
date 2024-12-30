import { Actor } from './actor.js';
import { EVENTS_NAME } from '../consts.js';

export class Enemy extends Actor {
  constructor(scene, x, y, texture, target, frame) {
    super(scene, x, y, texture, frame);

    this.target = target;
    this.AGRESSOR_RADIUS = 100;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.getBody().setSize(16, 16);
    this.getBody().setOffset(0, 0);

    // Attack handler
    this.attackHandler = () => {
      // If enemy is within player's width range, enemy is damaged
      const distance = Phaser.Math.Distance.BetweenPoints(
        { x: this.x, y: this.y },
        { x: this.target.x, y: this.target.y }
      );
      if (distance < this.target.width) {
        this.getDamage();
        this.disableBody(true, false);
        this.scene.time.delayedCall(300, () => {
          this.destroy();
        });
      }
    };

    // Listen to the ATTACK event from the Player
    this.scene.game.events.on(EVENTS_NAME.ATTACK, this.attackHandler, this);

    // Clean up
    this.on('destroy', () => {
      this.scene.game.events.removeListener(EVENTS_NAME.ATTACK, this.attackHandler);
    });
  }

  preUpdate() {
    super.preUpdate();

    const distance = Phaser.Math.Distance.BetweenPoints(
      { x: this.x, y: this.y },
      { x: this.target.x, y: this.target.y }
    );

    // If close enough, chase
    if (distance < this.AGRESSOR_RADIUS) {
      this.getBody().setVelocityX(this.target.x - this.x);
      this.getBody().setVelocityY(this.target.y - this.y);
    } else {
      // else just wait
      this.getBody().setVelocity(0);
    }
  }

  setTarget(target) {
    this.target = target;
  }
}
