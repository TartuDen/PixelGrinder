// managers/InputManager.js

export default class InputManager {
  constructor(scene, playerManager, skillManager) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.skillManager = skillManager;

    this.cursors = null;
    this.skillKeys = [];

    this.tabKey = null;
    this.bKey = null;
    this.iKey = null;
    this.oKey = null;
  }

  setupControls(playerSkills) {
    if (!this.cursors) {
      this.cursors = this.scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      });
    }

    this.skillKeys.forEach((key) => {
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
            this.scene.chatManager.addMessage(`Skill triggered: ${skill.name}`);
            this.skillManager.useSkill(skill);
          });
          this.skillKeys.push(key);
        } else {
          // If needed, we can log an error or ignore
          this.scene.chatManager.addMessage(
            `No key found for skill "${skill.name}" at index ${index}.`
          );
        }
      }
    });

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

    if (!this.bKey) {
      this.bKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.B
      );
      this.bKey.on("down", () => {
        this.scene.summarizePlayerStats();
        this.scene.toggleStatsMenu();
      });
    }

    if (!this.iKey) {
      this.iKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.I
      );
      this.iKey.on("down", () => {
        this.scene.chatManager.addMessage("I key pressed → toggling inventory");
        this.scene.toggleInventoryMenu();
      });
    }

    if (!this.oKey) {
      this.oKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.O
      );
      this.oKey.on("down", () => {
        this.scene.chatManager.addMessage("O key pressed → toggling skill book");
        this.scene.uiManager.toggleSkillBook();
      });
    }
  }

  getInputKeys() {
    return this.cursors;
  }
}
