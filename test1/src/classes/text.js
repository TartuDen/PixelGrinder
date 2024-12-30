import { Text } from './text.js';

export const ScoreOperations = {
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE',
  SET_VALUE: 'SET_VALUE'
};

export class Score extends Text {
  constructor(scene, x, y, initScore = 0) {
    super(scene, x, y, `Score: ${initScore}`);
    scene.add.existing(this);
    this.scoreValue = initScore;
  }

  changeValue(operation, value) {
    switch (operation) {
      case ScoreOperations.INCREASE:
        this.scoreValue += value;
        break;
      case ScoreOperations.DECREASE:
        this.scoreValue -= value;
        break;
      case ScoreOperations.SET_VALUE:
        this.scoreValue = value;
        break;
      default:
        break;
    }
    this.setText(`Score: ${this.scoreValue}`);
  }

  getValue() {
    return this.scoreValue;
  }
}
