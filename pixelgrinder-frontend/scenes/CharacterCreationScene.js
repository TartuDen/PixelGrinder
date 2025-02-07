// File: scenes/CharacterCreationScene.js
import { calculateCreationStats } from "../helpers/calculateCreationStats.js"; // We'll define a small helper
import {
  playerProfile,
  playerBaseStats,
  availableCharacterSkins,
} from "../data/MOCKdata.js";

export default class CharacterCreationScene extends Phaser.Scene {
  constructor() {
    super("CharacterCreationScene");

    this.nameInput = null;
    this.intellectPoints = 0;
    this.strengthPoints = 0;
    this.dexterityPoints = 0;
    this.constitutionPoints = 0;
    this.pointsRemaining = 10;

    // We'll store chosen skin here while user picks
    this.tempSelectedSkin = null;

    this.containerDiv = null;
    this.finalStatsDiv = null;
    this.remainingPointsDiv = null;
  }

  preload() {
    // Load the Tiled map and tiles for background
    this.load.tilemapTiledJSON("charCreationMap", "assets/map/char_creation_map.tmj");
    this.load.image("charCreationTiles", "assets/map/terrain.png");

    // Optionally, preload the 3 preview GIFs
    availableCharacterSkins.forEach(skin => {
      this.load.image(`${skin.key}_preview`, skin.previewGif);
      // If these are actual .gif files, Phaser might not animate them. We'll just show them as static images in DOM or in plain HTML <img>.
    });
  }

  create() {
    // 1) Create tilemap background
    this.map = this.make.tilemap({ key: "charCreationMap" });
    const tileset = this.map.addTilesetImage("terrain", "charCreationTiles");
    this.backgroundLayer = this.map.createLayer("background", tileset, 0, 0);

    // 2) Setup DOM
    this.createDOMElements();
    this.updateFinalStatsUI(); // show initial stats
  }

  createDOMElements() {
    // Main container
    this.containerDiv = document.createElement("div");
    this.containerDiv.id = "char-creation-container";
    this.containerDiv.classList.add("char-creation-container");
    document.body.appendChild(this.containerDiv);

    // -- Character Name
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Character Name: ";
    nameLabel.classList.add("char-creation-label");
    this.containerDiv.appendChild(nameLabel);

    this.nameInput = document.createElement("input");
    this.nameInput.type = "text";
    this.nameInput.value = "";
    this.nameInput.placeholder = "Enter your hero name...";
    this.nameInput.classList.add("char-creation-input");
    this.containerDiv.appendChild(this.nameInput);

    // -- Points Remaining
    this.remainingPointsDiv = document.createElement("div");
    this.remainingPointsDiv.id = "remaining-points";
    this.remainingPointsDiv.classList.add("char-creation-points-remaining");
    this.containerDiv.appendChild(this.remainingPointsDiv);

    // Helper to build row
    const buildStatRow = (statName, displayName) => {
      const row = document.createElement("div");
      row.classList.add("char-creation-stat-row");

      const label = document.createElement("span");
      label.textContent = `${displayName}: `;
      label.classList.add("char-creation-stat-label");
      row.appendChild(label);

      const minusBtn = document.createElement("button");
      minusBtn.textContent = "-";
      minusBtn.classList.add("char-creation-stat-btn");
      minusBtn.onclick = () => {
        if (this[`${statName}Points`] > 0) {
          this[`${statName}Points`]--;
          this.pointsRemaining++;
          this.updateFinalStatsUI();
        }
      };
      row.appendChild(minusBtn);

      const valueDisplay = document.createElement("span");
      valueDisplay.textContent = this[`${statName}Points`];
      valueDisplay.classList.add("char-creation-stat-value");
      row.appendChild(valueDisplay);

      const plusBtn = document.createElement("button");
      plusBtn.textContent = "+";
      plusBtn.classList.add("char-creation-stat-btn");
      plusBtn.onclick = () => {
        if (this.pointsRemaining > 0) {
          this[`${statName}Points`]++;
          this.pointsRemaining--;
          this.updateFinalStatsUI();
        }
      };
      row.appendChild(plusBtn);

      // We'll store a quick reference so we can update the UI more easily
      row._valueDisplay = valueDisplay;

      return row;
    };

    // Create the stat rows
    const intellectRow = buildStatRow("intellect", "Intellect");
    const strengthRow = buildStatRow("strength", "Strength");
    const dexterityRow = buildStatRow("dexterity", "Dexterity");
    const constitutionRow = buildStatRow("constitution", "Constitution");

    [intellectRow, strengthRow, dexterityRow, constitutionRow].forEach((r) => {
      this.containerDiv.appendChild(r);
    });

    // -- Final Stats Panel
    this.finalStatsDiv = document.createElement("div");
    this.finalStatsDiv.classList.add("char-creation-final-stats");
    this.containerDiv.appendChild(this.finalStatsDiv);

    // -- Character Skin Selection
    const skinSelectionHeading = document.createElement("h3");
    skinSelectionHeading.textContent = "Select Character Skin:";
    this.containerDiv.appendChild(skinSelectionHeading);

    const skinsContainer = document.createElement("div");
    skinsContainer.classList.add("skin-selection-container");
    this.containerDiv.appendChild(skinsContainer);

    availableCharacterSkins.forEach((skin) => {
      const skinDiv = document.createElement("div");
      skinDiv.classList.add("skin-option");

      // We can show an <img> tag using the .previewGif path
      // For real .gif, consider using plain <img src="..."> in DOM
      const img = document.createElement("img");
      img.src = skin.previewGif; // or load image data?
      img.alt = skin.displayName;
      img.classList.add("skin-preview-img");
      skinDiv.appendChild(img);

      const label = document.createElement("div");
      label.textContent = skin.displayName;
      skinDiv.appendChild(label);

      // Mark the selected skin on click
      skinDiv.onclick = () => {
        this.tempSelectedSkin = skin.key;
        // highlight selection
        document.querySelectorAll(".skin-option").forEach(d => {
          d.classList.remove("selected-skin");
        });
        skinDiv.classList.add("selected-skin");
      };

      skinsContainer.appendChild(skinDiv);
    });

    // -- Confirm Button
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    confirmBtn.classList.add("char-creation-confirm-btn");
    confirmBtn.onclick = () => this.onConfirm();
    this.containerDiv.appendChild(confirmBtn);
  }

  updateFinalStatsUI() {
    // Update "Points Remaining" text
    if (this.remainingPointsDiv) {
      this.remainingPointsDiv.textContent = `Points Remaining: ${this.pointsRemaining}`;
    }

    // Get the final stats based on base stats + allocated points
    const derived = calculateCreationStats({
      intellect: this.intellectPoints,
      strength: this.strengthPoints,
      dexterity: this.dexterityPoints,
      constitution: this.constitutionPoints,
    });

    // Render them in finalStatsDiv
    this.finalStatsDiv.innerHTML = `
      <h4>Final Stats Preview:</h4>
      <ul>
        <li>Health: ${Math.round(derived.health)}</li>
        <li>Mana: ${Math.round(derived.mana)}</li>
        <li>Magic Attack: ${Math.round(derived.magicAttack)}</li>
        <li>Melee Attack: ${Math.round(derived.meleeAttack)}</li>
        <li>Magic Defense: ${Math.round(derived.magicDefense)}</li>
        <li>Melee Defense: ${Math.round(derived.meleeDefense)}</li>
        <li>Magic Evasion: ${Math.round(derived.magicEvasion)}</li>
        <li>Melee Evasion: ${Math.round(derived.meleeEvasion)}</li>
        <li>Speed: ${Math.round(derived.speed)}</li>
      </ul>
    `;
  }

  onConfirm() {
    const chosenName = this.nameInput.value.trim();
    if (!chosenName) {
      alert("Please enter a valid character name!");
      return;
    }
    if (this.pointsRemaining > 0) {
      alert("You still have unallocated points!");
      return;
    }
    if (!this.tempSelectedSkin) {
      alert("Please select a character skin!");
      return;
    }

    // 1) Save name, skin, level, exp
    playerProfile.name = chosenName;
    playerProfile.level = 1;
    playerProfile.totalExp = 0;
    playerProfile.selectedSkin = this.tempSelectedSkin; // e.g. "necromancer" or "warrior" etc.

    // 2) Add the allocated attribute points to base stats
    //    In many games, you'd store them in base stats or keep them separate, your choice:
    playerBaseStats.intellect += this.intellectPoints;
    playerBaseStats.strength += this.strengthPoints;
    playerBaseStats.dexterity += this.dexterityPoints;
    playerBaseStats.constitution += this.constitutionPoints;

    // Remove DOM
    if (this.containerDiv) {
      document.body.removeChild(this.containerDiv);
      this.containerDiv = null;
    }

    // Start the main game
    this.scene.start("MainScene");
  }
}
