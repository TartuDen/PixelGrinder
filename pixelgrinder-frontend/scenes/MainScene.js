// scenes/MainScene.js
import UIManager from "../managers/UIManager.js";
import SkillManager from "../managers/SkillManager.js";
import MobManager from "../managers/MobManager.js";

import {
  naturalRegeneration,
  playerProfile,
  playerSkills,
} from "../data/MOCKdata.js";
import {
  calculatePlayerStats,
} from "../helpers/calculatePlayerStats.js";

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

    // Managers
    this.uiManager = new UIManager();
    this.uiManager.init();

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

    // TAB target
    this.input.keyboard.on("keydown-TAB", (event) => {
      event.preventDefault();
      this.cycleTarget();
      this.updateUI();
    });

    // B key for stats logs & toggling
    this.input.keyboard.on("keydown-B", () => {
      this.summarizePlayerStats(); // console logs
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
    // Implement game-over or respawn logic
  }

  // --------------------------------------------------------------
  //  UI
  // --------------------------------------------------------------
  updateUI() {
    this.uiManager.updateUI({
      name: playerProfile.name,
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      currentMana: this.currentMana,
      maxMana: this.maxMana,
      level: 5, // or read from your data
      xp: playerProfile.totalExp,
    });
  }

  toggleStatsMenu() {
    if (!this.uiManager.statsMenu) return;
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
      health: 100, // or dynamic
      mana: 150,
      intellect: 3,
      strength: 3,
      dexterity: 3,
      constitution: 4,
    };

    const baseStatsHTML = this.generateStatsTable("Base Stats", baseStats);
    const derivedStatsHTML = this.generateStatsTable("Derived Stats", derivedStats);

    return `
      <h3>Player Info</h3>
      <p>Name: ${name}</p>
      <p>Class: ${cls}</p>
      <p>Level: ${level || "N/A"}</p>
      <p>Experience: ${totalExp}</p>

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
    // your existing console logs or just keep it simpler
    console.log("=== Player Stats Summary ===");
    console.table(this.getPlayerStats());
    console.log("============================");
  }

  // --------------------------------------------------------------
  //  Skills
  // --------------------------------------------------------------
  useSkill(skill) {
    // We call skillManager
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
    const mobArray = this.mobManager.mobs.getChildren();
    if (!mobArray.length) return;

    if (this.currentTargetIndex === null) {
      this.currentTargetIndex = 0;
    } else {
      this.currentTargetIndex = (this.currentTargetIndex + 1) % mobArray.length;
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
    this.currentMana = Math.min(this.maxMana, this.currentMana + naturalRegeneration.manaRegen);

    const beforeHealth = this.currentHealth;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + naturalRegeneration.hpRegen);

    console.log(
      `Regenerated +${this.currentMana - beforeMana} mana, +${this.currentHealth - beforeHealth} HP`
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
      frames: this.anims.generateFrameNumbers("characters", { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("characters", { start: 12, end: 14 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("characters", { start: 24, end: 26 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("characters", { start: 36, end: 38 }),
      frameRate: 10,
      repeat: -1,
    });

    // Mob animations
    this.anims.create({
      key: "mob-walk-down",
      frames: this.anims.generateFrameNumbers("characters", { start: 48, end: 50 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-left",
      frames: this.anims.generateFrameNumbers("characters", { start: 60, end: 62 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-right",
      frames: this.anims.generateFrameNumbers("characters", { start: 72, end: 74 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "mob-walk-up",
      frames: this.anims.generateFrameNumbers("characters", { start: 84, end: 86 }),
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
    this.player = this.physics.add.sprite(heroStart.x, heroStart.y, "characters");
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1);

    // Collision with walls
    this.physics.add.collider(this.player, this.collisionLayer);

    // Start with a default animation
    this.player.anims.play("walk-down");
    this.playerSpeed = 100;
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.player);
  }

  setupControls() {
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Numeric keys are handled in UIManager setup if needed
  }
}
