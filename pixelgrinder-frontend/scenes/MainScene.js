// scenes/MainScene.js
import UIManager from "../managers/UIManager.js";
import SkillManager from "../managers/SkillManager.js";
import MobManager from "../managers/MobManager.js";

import {
  naturalRegeneration,
  playerProfile,
  playerSkills,
} from "../data/MOCKdata.js";
import { calculatePlayerStats } from "../helpers/calculatePlayerStats.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");

    this.currentTargetIndex = null;
    this.targetedMob = null;

    // Player stats
    this.currentMana = 0;
    this.currentHealth = 0;
    this.maxMana = 0;
    this.maxHealth = 0;

    // Managers
    this.uiManager = null;
    this.skillManager = null;
    this.mobManager = null;

    // Input keys
    this.cursors = null;
  }

  // A helper to always get up-to-date stats
  getPlayerStats() {
    return calculatePlayerStats();
  }

  preload() {
    // Load default assets (tilemap, etc.)
    this.loadAssets();

    // Prepare skill manager
    this.skillManager = new SkillManager(this, () => this.getPlayerStats());
    this.skillManager.preloadSkills();
  }

  create() {
    this.createTilemap();
    this.defineAnimations();
    this.createPlayer();
    this.setupCamera();
    this.setupControls();

    // Initialize Managers
    this.uiManager = new UIManager();
    // Pass a callback to handle closing the stats menu
    this.uiManager.init(() => {
      this.hideStatsMenu();
    });

    this.mobManager = new MobManager(this);
    this.mobManager.createMobs(this.map);

    // Setup UI
    this.uiManager.setupSkills(playerSkills);

    // Initialize player stats
    const pStats = this.getPlayerStats();
    this.maxHealth = pStats.health;
    this.currentHealth = pStats.health;
    this.maxMana = pStats.mana;
    this.currentMana = pStats.mana;

    // Update the UI once at the start
    this.updateUI();

    // Create skill animations
    this.skillManager.createSkillAnimations();

    // Natural regeneration
    this.time.addEvent({
      delay: naturalRegeneration.regenerationTime,
      callback: this.regenerateStats,
      callbackScope: this,
      loop: true,
    });

    // TAB key for cycling targets
    this.input.keyboard.on("keydown-TAB", (event) => {
      event.preventDefault();
      this.cycleTarget();
      this.updateUI();
    });

    // B key for stats logs & toggling
    this.input.keyboard.on("keydown-B", () => {
      this.summarizePlayerStats(); // Console logs
      this.toggleStatsMenu();
    });
  }

  update(time, delta) {
    this.updateUI();
    this.handlePlayerMovement();
    this.mobManager.updateMobs(this.player);
  }

  // --------------------------------------------------------------
  //  Player Death
  // --------------------------------------------------------------
  handlePlayerDeath() {
    console.log("Player died!");
    // Implement game-over or respawn logic here
    // For example, restart the scene after a delay
    this.time.delayedCall(2000, () => {
      this.scene.restart();
    });
  }

  // --------------------------------------------------------------
  //  UI
  // --------------------------------------------------------------
  updateUI() {
    const playerStats = {
      name: playerProfile.name,
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      currentMana: this.currentMana,
      maxMana: this.maxMana,
      level: 5, // Replace with dynamic level if available
      xp: playerProfile.totalExp,
    };

    this.uiManager.updateUI(playerStats);

    // Update Health Bar Width
    const healthPercent =
      (playerStats.currentHealth / playerStats.maxHealth) * 100;
    document.getElementById("health-fill").style.width = `${healthPercent}%`;

    // Update Mana Bar Width
    const manaPercent = (playerStats.currentMana / playerStats.maxMana) * 100;
    document.getElementById("mana-fill").style.width = `${manaPercent}%`;
  }

  toggleStatsMenu() {
    if (this.uiManager.statsMenu.style.display === "block") {
      this.hideStatsMenu();
    } else {
      this.showStatsMenu();
    }
  }

  showStatsMenu() {
    // Generate stats HTML
    const statsHTML = this.generateStatsHTML();
    this.uiManager.showStatsMenu(statsHTML);

    // Pause the scene
    this.scene.pause();
  }

  hideStatsMenu() {
    this.uiManager.hideStatsMenu();
    this.scene.resume();
  }

  generateStatsHTML() {
    // Collect stats
    const derivedStats = this.getPlayerStats();
    const { name, class: cls, level, totalExp } = playerProfile;

    // Assuming you want to include base stats and derived stats
    const baseStats = {
      health: 100, // Replace with dynamic base stats if available
      mana: 150,
      intellect: 3,
      strength: 3,
      dexterity: 3,
      constitution: 4,
    };

    const baseStatsHTML = this.generateStatsTable("Base Stats", baseStats);
    const derivedStatsHTML = this.generateStatsTable(
      "Derived Stats",
      derivedStats
    );

    return `
      <h3>Player Info</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Class:</strong> ${cls}</p>
      <p><strong>Level:</strong> ${level || "N/A"}</p>
      <p><strong>Experience:</strong> ${totalExp}</p>

      ${baseStatsHTML}
      ${derivedStatsHTML}
    `;
  }

  generateStatsTable(title, stats) {
    let rows = "";
    for (const [key, value] of Object.entries(stats)) {
      const formattedKey = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      rows += `
        <tr>
          <th>${formattedKey}</th>
          <td>${value}</td>
        </tr>
      `;
    }
    return `
      <h3>${title}</h3>
      <table>
        <thead>
          <tr>
            <th>Stat</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // --------------------------------------------------------------
  //  Summarize Stats in Console
  // --------------------------------------------------------------
  summarizePlayerStats() {
    // Your existing console logs or just keep it simpler
    console.log("=== Player Stats Summary ===");
    console.table(this.getPlayerStats());
    console.log("============================");
  }

  // --------------------------------------------------------------
  //  Skills
  // --------------------------------------------------------------
  useSkill(skill) {
    // Call SkillManager to use the skill
    const { success, damage } = this.skillManager.useSkill(
      skill,
      this.currentMana,
      this.targetedMob
    );
    if (success) {
      this.deductMana(skill.manaCost);
      this.mobManager.applyDamageToMob(this.targetedMob, damage);
      this.updateUI();
    }
  }

  deductMana(amount) {
    this.currentMana = Math.max(0, this.currentMana - amount);
  }

  // --------------------------------------------------------------
  //  Targeting
  // --------------------------------------------------------------
  cycleTarget() {
    const mobArray = this.mobManager.mobs
      .getChildren()
      .filter((mob) => !mob.customData.isDead);
    if (!mobArray.length) return;

    if (
      this.currentTargetIndex === null ||
      this.currentTargetIndex >= mobArray.length - 1
    ) {
      this.currentTargetIndex = 0;
    } else {
      this.currentTargetIndex += 1;
    }
    this.targetedMob = mobArray[this.currentTargetIndex];
    this.highlightMob(this.targetedMob);
  }

  highlightMob(mob) {
    this.mobManager.mobs.getChildren().forEach((m) => m.clearTint());
    mob.setTint(0xff0000);
  }

  onMobClicked(mob) {
    if (!mob.active) return;

    this.mobManager.mobs.getChildren().forEach((m) => m.clearTint());
    mob.setTint(0xff0000);

    this.targetedMob = mob;
    const mobArray = this.mobManager.mobs.getChildren();
    this.currentTargetIndex = mobArray.indexOf(mob);
    console.log("Mob clicked:", mob.customData.id, "HP:", mob.customData.hp);
  }

  // --------------------------------------------------------------
  //  Natural Regeneration
  // --------------------------------------------------------------
  regenerateStats() {
    const beforeMana = this.currentMana;
    this.currentMana = Math.min(
      this.maxMana,
      this.currentMana + naturalRegeneration.manaRegen
    );

    const beforeHealth = this.currentHealth;
    this.currentHealth = Math.min(
      this.maxHealth,
      this.currentHealth + naturalRegeneration.hpRegen
    );

    console.log(
      `Regenerated +${this.currentMana - beforeMana} mana, +${
        this.currentHealth - beforeHealth
      } HP`
    );
  }

  // --------------------------------------------------------------
  //  Asset Loading & World Setup
  // --------------------------------------------------------------
  loadAssets() {
    // Tilemap JSON
    this.load.tilemapTiledJSON("Map0", "assets/map/map0..tmj");

    // Tileset image
    this.load.image("tmw_desert_spacing", "assets/map/tmw_desert_spacing.png");

    // Other assets
    this.load.image("player", "assets/player.png");

    // Characters sprite sheet
    this.load.spritesheet("characters", "assets/characters.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Dead mob sprite
    this.load.spritesheet("$dead", "assets/$dead.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  createTilemap() {
    this.map = this.make.tilemap({ key: "Map0" });
    const tileset = this.map.addTilesetImage(
      "tmw_desert_spacing",
      "tmw_desert_spacing"
    );

    // Background layer
    this.backgroundLayer = this.map.createLayer("background", tileset, 0, 0);

    // Collisions layer
    this.collisionLayer = this.map.createLayer("collisions", tileset, 0, 0);
    this.collisionLayer.setCollision([
      30, 31, 32, 37, 38, 39, 40, 45, 46, 47, 48,
    ]);
  }

  defineAnimations() {
    // Player animations
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 0,
        end: 2,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 12,
        end: 14,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 24,
        end: 26,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 36,
        end: 38,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Mob animations
    this.anims.create({
      key: "mob-walk-down",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 48,
        end: 50,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-left",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 60,
        end: 62,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-right",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 72,
        end: 74,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-up",
      frames: this.anims.generateFrameNumbers("characters", {
        start: 84,
        end: 86,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Dead mob animation
    this.anims.create({
      key: "mob-dead",
      frames: this.anims.generateFrameNumbers("$dead", { start: 7, end: 7 }),
      frameRate: 0,
      repeat: 0,
    });
  }

  createPlayer() {
    const heroStart = this.map.findObject(
      "GameObjects",
      (obj) => obj.name === "HeroStart"
    );
    this.player = this.physics.add.sprite(
      heroStart.x,
      heroStart.y,
      "characters"
    );
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1);

    // Collision with walls
    this.physics.add.collider(this.player, this.collisionLayer);

    // Start with a default animation
    this.player.anims.play("walk-down");
    this.playerSpeed = 100;
  }

  setupCamera() {
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.physics.world.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.startFollow(this.player);
  }

  setupControls() {
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Numeric keys 1-10 for skills
    const skillKeys = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
      Phaser.Input.Keyboard.KeyCodes.EIGHT,
      Phaser.Input.Keyboard.KeyCodes.NINE,
      Phaser.Input.Keyboard.KeyCodes.ZERO, // Assuming 0 is mapped to key 10
    ];

    playerSkills.forEach((skill, index) => {
      if (index < skillKeys.length) {
        const key = this.input.keyboard.addKey(skillKeys[index]);
        key.on("down", () => {
          console.log(`Skill triggered: ${skill.name}`);
          this.useSkill(skill);
        });
      }
    });
  }

  // --------------------------------------------------------------
  //  Player Movement Handling
  // --------------------------------------------------------------
  handlePlayerMovement() {
    if (!this.player || !this.player.body) return;

    this.player.body.setVelocity(0);

    if (this.cursors.up.isDown) {
      this.player.body.setVelocityY(-this.playerSpeed);
      this.player.anims.play("walk-up", true);
    } else if (this.cursors.down.isDown) {
      this.player.body.setVelocityY(this.playerSpeed);
      this.player.anims.play("walk-down", true);
    }

    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-this.playerSpeed);
      this.player.anims.play("walk-left", true);
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(this.playerSpeed);
      this.player.anims.play("walk-right", true);
    }

    if (
      !this.cursors.up.isDown &&
      !this.cursors.down.isDown &&
      !this.cursors.left.isDown &&
      !this.cursors.right.isDown
    ) {
      this.player.anims.stop();
    }
  }
}
