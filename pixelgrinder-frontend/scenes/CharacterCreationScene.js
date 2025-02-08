// File: scenes/CharacterCreationScene.js
import { calculateCreationStats } from "../helpers/calculateCreationStats.js";
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

    this.tempSelectedSkin = null;

    this.containerDiv = null;
    this.finalStatsDiv = null;
    this.remainingPointsDiv = null;
  }

  preload() {
    // 1) Load map data and image for the tilemap
    this.load.tilemapTiledJSON("charCreationMap", "assets/map/char_creation_map.tmj");
    // The key here, "terrain", must match the name of the tileset in Tiled
    this.load.image("terrain", "assets/map/terrain.png");

    // 2) Preload the skin preview images (GIF or static).
    availableCharacterSkins.forEach((skin) => {
      // Even though these are GIFs, Phaser will treat them as static images by default.
      // We'll just avoid 404 errors by loading them here. We'll display them in DOM <img>.
      this.load.image(`${skin.key}_preview`, skin.previewGif);
    });
  }

  create() {
    // Create the tilemap background in the same style as MainScene
    this.createTilemap();

    // Now create the character creation UI in HTML
    this.createDOMElements();
    this.updateFinalStatsUI();
  }

  createTilemap() {
    // Make the tilemap from the key we loaded
    this.map = this.make.tilemap({ key: "charCreationMap" });

    // This must match the "name in Tiled" vs "key in Phaser"
    // If your Tiled tileset is called "terrain", do:
    const tileset = this.map.addTilesetImage("terrain", "terrain");

    // The layer name must match Tiled's layer name, e.g. "background"
    this.backgroundLayer = this.map.createLayer("background", tileset, 0, 0);

    if (!this.backgroundLayer) {
      console.warn("No 'background' layer found. Check your Tiled layer name!");
    }

    // Adjust camera so the map is visible.
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.centerOn(
      this.map.widthInPixels / 2,
      this.map.heightInPixels / 2
    );
  }

  createDOMElements() {
    // Main container
    this.containerDiv = document.createElement("div");
    this.containerDiv.id = "char-creation-container";
    // The class below must exist in your CSS file to style it
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

    // Helper to build a row for each stat
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
          valueDisplay.textContent = this[`${statName}Points`];
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
          valueDisplay.textContent = this[`${statName}Points`];
          this.updateFinalStatsUI();
        }
      };
      row.appendChild(plusBtn);

      return row;
    };

    // Build each row
    const intellectRow = buildStatRow("intellect", "Intellect");
    const strengthRow = buildStatRow("strength", "Strength");
    const dexterityRow = buildStatRow("dexterity", "Dexterity");
    const constitutionRow = buildStatRow("constitution", "Constitution");

    [intellectRow, strengthRow, dexterityRow, constitutionRow].forEach(r => {
      this.containerDiv.appendChild(r);
    });

    // -- Final Stats Preview
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

    // Make each skin clickable
    availableCharacterSkins.forEach((skin) => {
      const skinDiv = document.createElement("div");
      skinDiv.classList.add("skin-option");

      const img = document.createElement("img");
      img.src = skin.previewGif;
      img.alt = skin.displayName;
      // Force 100×100 so they're consistent
      img.style.width = "100px";
      img.style.height = "100px";
      img.classList.add("skin-preview-img");
      skinDiv.appendChild(img);

      const label = document.createElement("div");
      label.textContent = skin.displayName;
      skinDiv.appendChild(label);

      // Click event: choose the skin
      skinDiv.onclick = () => {
        this.tempSelectedSkin = skin.key;
        // Unselect all, then select this
        document.querySelectorAll(".skin-option").forEach(div => {
          div.classList.remove("selected-skin");
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
    this.remainingPointsDiv.textContent = `Points Remaining: ${this.pointsRemaining}`;

    // Calculate final stats
    const derived = calculateCreationStats({
      intellect: this.intellectPoints,
      strength: this.strengthPoints,
      dexterity: this.dexterityPoints,
      constitution: this.constitutionPoints,
    });

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

    // Save to global data
    playerProfile.name = chosenName;
    playerProfile.level = 1;
    playerProfile.totalExp = 0;
    playerProfile.selectedSkin = this.tempSelectedSkin; // e.g. "warrior" or "sorceress"

    // Add the allocated points to base stats
    playerBaseStats.intellect += this.intellectPoints;
    playerBaseStats.strength += this.strengthPoints;
    playerBaseStats.dexterity += this.dexterityPoints;
    playerBaseStats.constitution += this.constitutionPoints;

    // Remove DOM
    document.body.removeChild(this.containerDiv);

    // Go to main scene
    this.scene.start("MainScene");
  }
}
