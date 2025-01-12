// managers/InputManager.js

export default class InputManager {
    constructor(scene, playerManager, skillManager) {
      this.scene = scene;
      this.playerManager = playerManager;
      this.skillManager = skillManager;
  
      this.cursors = null;
      this.skillKeys = [];
    }
  
    setupControls(playerSkills) {
      // Movement keys
      this.cursors = this.scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      });
  
      // Numeric keys 1-9 for skills
      const skillKeyCodes = [
        Phaser.Input.Keyboard.KeyCodes.ONE,
        Phaser.Input.Keyboard.KeyCodes.TWO,
        Phaser.Input.Keyboard.KeyCodes.THREE,
        Phaser.Input.Keyboard.KeyCodes.FOUR,
        Phaser.Input.Keyboard.KeyCodes.FIVE,
        Phaser.Input.Keyboard.KeyCodes.SIX,
        Phaser.Input.Keyboard.KeyCodes.SEVEN,
        Phaser.Input.Keyboard.KeyCodes.EIGHT,
        Phaser.Input.Keyboard.KeyCodes.NINE,
      ];
  
      playerSkills.forEach((skill, index) => {
        if (index < skillKeyCodes.length) {
          const key = this.scene.input.keyboard.addKey(skillKeyCodes[index]);
          key.on("down", () => {
            console.log(`Skill triggered: ${skill.name}`);
            this.skillManager.useSkill(skill);
          });
          this.skillKeys.push(key);
        }
      });
  
      // TAB key for cycling targets
      const tabKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.TAB
      );
      tabKey.on("down", () => {
        this.scene.cycleTarget();
        this.scene.updateUI();
      });
  
      // B key for stats logs & toggling
      this.scene.input.keyboard.on("keydown-B", () => {
        this.scene.summarizePlayerStats(); // Console logs
        this.scene.toggleStatsMenu();
      });
  
      // Capture the TAB key to prevent default browser behavior
      this.scene.input.keyboard.addCapture("TAB");
    }
  
    getInputKeys() {
      return this.cursors;
    }
  }
  