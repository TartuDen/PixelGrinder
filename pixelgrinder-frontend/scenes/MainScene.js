// scenes/MainScene.js

import UIManager from "../managers/UIManager.js";
import SkillManager from "../managers/SkillManager.js";
import MobManager from "../managers/MobManager.js";

import {
  naturalRegeneration,
  playerProfile,
  playerSkills,
  playerBaseStats,
  TAB_TARGET_RANGE, // Import TAB_TARGET_RANGE here
} from "../data/MOCKdata.js";

import { calculatePlayerStats } from "../helpers/calculatePlayerStats.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");

    this.currentTargetIndex = -1; // Initialize to -1 to start from the first mob
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

    // Load audio assets for SkillManager (Removed since no audio is used)
    // this.load.audio('cast-start', 'assets/sounds/cast-start.mp3');
    // this.load.audio('cast-end', 'assets/sounds/cast-end.mp3');
    // this.load.audio('cooldown-start', 'assets/sounds/cooldown-start.mp3');
    // this.load.audio('cooldown-end', 'assets/sounds/cooldown-end.mp3');

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
    this.uiManager = new UIManager(this); // Pass the scene reference
    // Pass a callback to handle closing the stats menu
    this.uiManager.init(() => {
      this.hideStatsMenu();
    });

    this.mobManager = new MobManager(this);
    this.mobManager.createMobs(this.map);

    // Setup UI
    this.uiManager.setupSkills(playerSkills);

    // Initialize player stats from playerBaseStats
    this.maxHealth = playerBaseStats.health;
    this.currentHealth = playerBaseStats.health;
    this.maxMana = playerBaseStats.mana;
    this.currentMana = playerBaseStats.mana;

    // Update the UI once at the start
    this.updateUI();

    // Create skill animations
    this.skillManager.createSkillAnimations();

    // Natural regeneration
    this.time.addEvent({
      delay: naturalRegeneration.regenerationTime, // Already in ms
      callback: this.regenerateStats,
      callbackScope: this,
      loop: true,
    });

    // TAB key for cycling targets
    const tabKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.TAB
    );
    tabKey.on("down", (event) => {
      event.preventDefault(); // Prevent default browser behavior
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
    this.handlePlayerMovement();
    this.mobManager.updateMobs(this.player);
    // UI is managed by UIManager, no need to update UI every frame
    // this.updateUI();
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
      level: playerProfile.level, // Use dynamic level if available
      xp: playerProfile.totalExp,
    };

    // Update the UI via UIManager
    this.uiManager.updateUI(playerStats);
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

    // Use imported playerBaseStats instead of hardcoding
    const { health, mana, intellect, strength, dexterity, constitution } =
      playerBaseStats;

    const dynamicBaseStats = {
      health,
      mana,
      intellect,
      strength,
      dexterity,
      constitution,
    };

    const baseStatsHTML = this.generateStatsTable(
      "Base Stats",
      dynamicBaseStats
    );
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
    // Delegate skill usage to SkillManager
    const result = this.skillManager.useSkill(skill);

    if (result.success) {
      // Additional logic if needed after successfully using a skill
    }
  }

  deductMana(amount) {
    this.currentMana = Math.max(0, this.currentMana - amount);
    // Update the UI to reflect mana deduction
    this.updateUI();
  }

  // --------------------------------------------------------------
  //  Targeting
  // --------------------------------------------------------------
  cycleTarget() {
    // Get all mobs that are alive and within the TAB_TARGET_RANGE
    const mobsInRange = this.mobManager.mobs.getChildren().filter((mob) => {
      if (mob.customData.isDead) return false; // Exclude dead mobs
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        mob.x,
        mob.y
      );
      return distance <= TAB_TARGET_RANGE;
    });

    if (mobsInRange.length === 0) {
      console.log("No mobs within TAB targeting range.");
      return; // No mobs to target
    }

    // Sort mobs by distance from the player (closest first)
    mobsInRange.sort((a, b) => {
      const distanceA = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        a.x,
        a.y
      );
      const distanceB = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        b.x,
        b.y
      );
      return distanceA - distanceB;
    });

    // Cycle to the next target
    this.currentTargetIndex =
      (this.currentTargetIndex + 1) % mobsInRange.length;

    // Set the new targeted mob
    const mob = mobsInRange[this.currentTargetIndex];
    this.targetedMob = mob;

    // Highlight the targeted mob
    this.highlightMob(mob);

    console.log(`Targeted Mob: ${mob.customData.id} at (${mob.x}, ${mob.y})`);
  }

  highlightMob(mob) {
    // Clear previous tints
    this.mobManager.mobs.getChildren().forEach((m) => m.clearTint());

    // Apply a tint to the targeted mob
    mob.setTint(0xff0000); // Red tint for highlighting
  }

  onMobClicked(mob) {
    if (!mob.active) return;

    // Clear previous tints
    this.mobManager.mobs.getChildren().forEach((m) => m.clearTint());

    // Highlight the clicked mob
    mob.setTint(0xff0000);

    // Set as targeted mob
    this.targetedMob = mob;

    // Find the index of the clicked mob within mobsInRange
    const mobsInRange = this.mobManager.mobs.getChildren().filter((mob) => {
      if (mob.customData.isDead) return false;
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        mob.x,
        mob.y
      );
      return distance <= TAB_TARGET_RANGE;
    });

    // Sort mobs by distance
    mobsInRange.sort((a, b) => {
      const distanceA = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        a.x,
        a.y
      );
      const distanceB = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        b.x,
        b.y
      );
      return distanceA - distanceB;
    });

    // Update currentTargetIndex based on clicked mob's position in the sorted list
    this.currentTargetIndex = mobsInRange.indexOf(mob);

    console.log(`Mob clicked: ${mob.customData.id} at (${mob.x}, ${mob.y})`);
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

    // Update the UI to reflect regeneration
    this.updateUI();
  }

  // --------------------------------------------------------------
  //  Asset Loading & World Setup
  // --------------------------------------------------------------
  // scenes/MainScene.js

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

    // Load skill animation spritesheets
    playerSkills.forEach((skill) => {
      this.load.spritesheet(
        `${skill.name}_anim`,
        skill.skillImage,
        {
          frameWidth: 72,
          frameHeight: 72
        }
      );
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

    // Skill Animations
    playerSkills.forEach((skill) => {
      this.anims.create({
        key: `${skill.name}_anim`,
        frames: this.anims.generateFrameNumbers(`${skill.name}_anim`, {
          start: 0,
          end: skill.animationSeq[1],
        }),
        frameRate: 15, // Adjust frame rate as needed
        repeat: 0, // Play once
      });
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

    // Numeric keys 1-3 for skills (since there are only 3 skills)
    const skillKeys = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
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

    // Prevent movement if casting
    if (this.skillManager.isCasting) {
      this.player.body.setVelocity(0);
      this.player.anims.stop();
      return;
    }

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
