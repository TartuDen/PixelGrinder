// managers/InputManager.js

export default class InputManager {
  constructor(scene, playerManager, skillManager) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.skillManager = skillManager;

    this.cursors = null;
    this.skillKeys = [];
    
    // FIX: We store references to non-skill keys so we don’t rebind them repeatedly.
    this.tabKey = null;
    this.bKey = null;
    this.iKey = null;
    this.oKey = null;
  }

  /**
   * Re-bind (or bind) only the movement and skill hotkeys. 
   * Non-skill keys ("I", "B", etc.) are bound only once.
   */
  setupControls(playerSkills) {
    // 1) Movement keys — bound once. If already set, skip.
    if (!this.cursors) {
      this.cursors = this.scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      });
    }

    // 2) Skill keys (1-9). First, remove old listeners.
    this.skillKeys.forEach((key) => {
      // Removes any existing .on("down") handlers
      key.removeAllListeners();
    });
    this.skillKeys = [];

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

    const assignableSkills = playerSkills.slice(0, skillKeyCodes.length);
    assignableSkills.forEach((skill, index) => {
      if (skill && skill.name) {
        const keyCode = skillKeyCodes[index];
        const key = this.scene.input.keyboard.addKey(keyCode);

        if (key) {
          key.on("down", () => {
            console.log(`Skill triggered: ${skill.name}`);
            this.skillManager.useSkill(skill);
          });
          this.skillKeys.push(key);
        } else {
          console.warn(
            `No key found for skill "${skill.name}" at index ${index}.`
          );
        }
      } else {
        console.warn(
          `Invalid skill at index ${index}. Ensure each skill has a valid "name" property.`
        );
      }
    });

    if (playerSkills.length > skillKeyCodes.length) {
      console.warn(
        `InputManager: Only the first ${
          skillKeyCodes.length
        } skills will be assigned to keys.
         ${
           playerSkills.length - skillKeyCodes.length
         } additional skills will be ignored.`
      );
    }

    // 3) TAB for cycle target — only bind once
    if (!this.tabKey) {
      this.tabKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.TAB
      );
      this.tabKey.on("down", () => {
        this.scene.cycleTarget();
        this.scene.updateUI();
      });
      this.scene.input.keyboard.addCapture("TAB");
    }

    // 4) B for stats — only bind once
    if (!this.bKey) {
      this.bKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.B
      );
      this.bKey.on("down", () => {
        this.scene.summarizePlayerStats();
        this.scene.toggleStatsMenu();
      });
    }

    // 5) I for inventory — only bind once
    if (!this.iKey) {
      this.iKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.I
      );
      this.iKey.on("down", () => {
        console.log("I key pressed → toggling inventory");
        this.scene.toggleInventoryMenu();
      });
    }

    // 6) O for skill book — only bind once
    if (!this.oKey) {
      this.oKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.O
      );
      this.oKey.on("down", () => {
        console.log("O key pressed → toggling skill book");
        this.scene.uiManager.toggleSkillBook();
      });
    }
  }

  getInputKeys() {
    return this.cursors;
  }
}
