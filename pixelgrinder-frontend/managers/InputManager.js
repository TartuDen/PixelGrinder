// File: managers/InputManager.js

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

  /**
   * We no longer pass `playerSkills`. Instead, we read from
   * `this.scene.uiManager.skillBarSlots` to bind keys to the correct skills.
   */
  setupControls() {
    // 1) Movement keys: set up once if needed
    if (!this.cursors) {
      this.cursors = this.scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      });
    }

    // 2) Clear old skill key listeners
    this.skillKeys.forEach((key) => {
      key.removeAllListeners();
    });
    this.skillKeys = [];

    // 3) Bind keys 1..9 to bar slots 0..8
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

    // The current arrangement of skills on the bar
    const barSlots = this.scene.uiManager.skillBarSlots;

    // For each slot, assign the corresponding key
    for (let i = 0; i < skillKeyCodes.length; i++) {
      const keyCode = skillKeyCodes[i];
      const assignedSkill = barSlots[i]; // can be null if no skill in that slot
      const key = this.scene.input.keyboard.addKey(keyCode);

      if (assignedSkill) {
        // Pressing this key should cast the skill
        key.on("down", () => {
          this.scene.chatManager.addMessage(
            `Skill triggered (Slot ${i + 1}): ${assignedSkill.name}`
          );
          this.skillManager.useSkill(assignedSkill);
        });
      } else {
        // No skill in that slot => do nothing or show a message
        key.on("down", () => {
          this.scene.chatManager.addMessage(
            `No skill assigned to slot ${i + 1}.`
          );
        });
      }

      this.skillKeys.push(key);
    }

    // 4) Tab Target (if not done yet)
    if (!this.tabKey) {
      this.tabKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.TAB
      );
      this.tabKey.on("down", () => {
        this.scene.cycleTarget();
        this.scene.updateUI();
      });
      // Prevent browser focus change
      this.scene.input.keyboard.addCapture("TAB");
    }

    // 5) B => Toggle Stats
    if (!this.bKey) {
      this.bKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.B
      );
      this.bKey.on("down", () => {
        this.scene.chatManager.addMessage("B pressed → toggling Stats menu");
        this.scene.toggleStatsMenu();
      });
    }

    // 6) I => Toggle Inventory
    if (!this.iKey) {
      this.iKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.I
      );
      this.iKey.on("down", () => {
        this.scene.chatManager.addMessage("I pressed → toggling Inventory");
        this.scene.toggleInventoryMenu();
      });
    }

    // 7) O => Toggle Skill Book
    if (!this.oKey) {
      this.oKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.O
      );
      this.oKey.on("down", () => {
        this.scene.chatManager.addMessage("O pressed → toggling Skill Book");
        this.scene.uiManager.toggleSkillBook();
      });
    }
  }

  getInputKeys() {
    return this.cursors;
  }
}
