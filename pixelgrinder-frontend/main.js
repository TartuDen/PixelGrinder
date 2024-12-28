/*******************************************************
 * main.js
 * 
 * Basic Phaser setup demonstrating:
 *  - A config object
 *  - A simple scene with preload(), create(), and update()
 *  - Drawing a sprite or text for testing
 *******************************************************/

// 1) Define a game scene
class MainScene extends Phaser.Scene {
    constructor() {
      super('MainScene');
    }
  
    preload() {
      // Load an image or sprite
      // e.g. this.load.image('player', 'assets/player.png');
      // For demo, we won't load any external assets yet
    }
  
    create() {
      // A basic text to confirm the scene is working
      this.add.text(50, 50, 'Hello PixelGrinder!', {
        font: '24px Arial',
        fill: '#ffffff'
      });
  
      // Example: fetch mock data from your Node server
      fetch('http://localhost:3000/api/player')
        .then(response => response.json())
        .then(data => {
          console.log('Player data fetched:', data);
          // You can now display or use the data in your game
        })
        .catch(err => console.error('Fetch error:', err));
    }
  
    update(time, delta) {
      // Called ~60 times per second
      // Put game logic (movement, collision checks, etc.) here
    }
  }
  
  // 2) Define Phaser game config
  const config = {
    type: Phaser.AUTO,              // Choose WebGL or Canvas automatically
    width: 800,                     // Width of the game canvas
    height: 600,                    // Height of the game canvas
    backgroundColor: '#1a1a1a',     // Optional background color
    parent: 'game-container',       // ID of the DOM element where you want to insert the game
    scene: [MainScene]              // Our single scene
  };
  
  // 3) Create the Phaser Game instance
  const game = new Phaser.Game(config);  