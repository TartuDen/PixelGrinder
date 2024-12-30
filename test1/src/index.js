import { Level1 } from './scenes/level-1/index.js';
import { LoadingScene } from './scenes/loading/index.js';
import { UIScene } from './scenes/ui/index.js';

// We can place additional config here if desired
// or simply inline it in gameConfig
// (We removed the TS types, but kept the property structure)

window.sizeChanged = () => {
  if (window.game.isBooted) {
    setTimeout(() => {
      window.game.scale.resize(window.innerWidth, window.innerHeight);
      window.game.canvas.setAttribute(
        'style',
        `display: block; width: ${window.innerWidth}px; height: ${window.innerHeight}px;`
      );
    }, 100);
  }
};

window.onresize = () => window.sizeChanged();

export const gameConfig = {
  title: 'Phaser game tutorial',
  type: Phaser.WEBGL,
  parent: 'game',
  backgroundColor: '#351f1b',
  scale: {
    mode: Phaser.Scale.NONE,
    width: window.innerWidth,
    height: window.innerHeight
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  render: {
    antialiasGL: false,
    pixelArt: true
  },
  callbacks: {
    postBoot: () => {
      window.sizeChanged();
    }
  },
  canvasStyle: `display: block; width: 100%; height: 100%;`,
  autoFocus: true,
  audio: {
    disableWebAudio: false
  },
  // Custom property we want to use in the game
  winScore: 40,

  scene: [LoadingScene, Level1, UIScene]
};

window.game = new Phaser.Game(gameConfig);
