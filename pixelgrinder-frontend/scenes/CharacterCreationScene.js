import { calculateCreationStats } from "../helpers/calculateCreationStats.js";
import {
  playerProfile,
  playerBaseStats,
  availableCharacterSkins,
  playerEquippedItems,
  playerBackpack,
  playerSkills,
} from "../data/MOCKdata.js";
import { applySaveData, hasSave, loadSave } from "../services/SaveService.js";

export default class CharacterCreationScene extends Phaser.Scene {
  constructor() {
    super("CharacterCreationScene");

    this.nameInput = null;
    this.intellectPoints = 0;
    this.strengthPoints = 0;
    this.dexterityPoints = 0;
    this.constitutionPoints = 0;
    this.pointsRemaining = 10;

    this.tempSelectedSkin = null;  // hold the chosen skin key

    this.containerDiv = null;
    this.finalStatsDiv = null;
    this.remainingPointsDiv = null;
  }

  preload() {
    // Make sure the path and file exist and that you EMBED your tileset in Tiled
    this.load.tilemapTiledJSON("charCreationMap", "assets/map/char_creation_map.tmj");
    this.load.image("terrain", "assets/map/terrain.png");

    // Preload the GIF previews (treated as static images by Phaser).
    availableCharacterSkins.forEach((skin) => {
      this.load.image(`${skin.key}_preview`, skin.previewGif);
    });
  }

  create() {
    if (hasSave()) {
      const saveData = loadSave();
      if (saveData) {
        applySaveData(saveData, {
          playerProfile,
          playerBaseStats,
          playerEquippedItems,
          playerBackpack,
          playerSkills,
        });
        this.scene.start("MainScene");
        return;
      }
    }
    this.createTilemap();
    this.createDOMElements();
    this.updateFinalStatsUI();
  }

  createTilemap() {
    // Create the tilemap from the JSON
    this.map = this.make.tilemap({ key: "charCreationMap" });
    // Must match the "name" in Tiled & the loaded key above
    const tileset = this.map.addTilesetImage("terrain", "terrain");

    // Check the Tiled layer name. If it's not called "background", rename here or rename in Tiled.
    this.backgroundLayer = this.map.createLayer("background", tileset, 0, 0);
    if (!this.backgroundLayer) {
      console.warn("No 'background' layer found. Check your Tiled layer name!");
    }

    // Center the camera on this map
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

    const intellectRow = buildStatRow("intellect", "Intellect");
    const strengthRow = buildStatRow("strength", "Strength");
    const dexterityRow = buildStatRow("dexterity", "Dexterity");
    const constitutionRow = buildStatRow("constitution", "Constitution");

    [intellectRow, strengthRow, dexterityRow, constitutionRow].forEach((row) => {
      this.containerDiv.appendChild(row);
    });

    // -- Final Stats Preview
    this.finalStatsDiv = document.createElement("div");
    this.finalStatsDiv.classList.add("char-creation-final-stats");
    this.containerDiv.appendChild(this.finalStatsDiv);

    // -- Skin Selection
    const skinSelectionHeading = document.createElement("h3");
    skinSelectionHeading.textContent = "Select Character Skin:";
    this.containerDiv.appendChild(skinSelectionHeading);

    const skinsContainer = document.createElement("div");
    skinsContainer.classList.add("skin-selection-container");
    this.containerDiv.appendChild(skinsContainer);

    availableCharacterSkins.forEach((skin) => {
      const skinDiv = document.createElement("div");
      skinDiv.classList.add("skin-option");

      const img = document.createElement("img");
      img.src = skin.previewGif;
      img.alt = skin.displayName;
      img.style.width = "100px";
      img.style.height = "100px";
      img.classList.add("skin-preview-img");
      skinDiv.appendChild(img);

      const label = document.createElement("div");
      label.textContent = skin.displayName;
      skinDiv.appendChild(label);

      skinDiv.onclick = () => {
        this.tempSelectedSkin = skin.key;
        // highlight chosen
        document.querySelectorAll(".skin-option").forEach(d => {
          d.classList.remove("selected-skin");
        });
        skinDiv.classList.add("selected-skin");
      };

      skinsContainer.appendChild(skinDiv);
    });

    // -- Confirm
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    confirmBtn.classList.add("char-creation-confirm-btn");
    confirmBtn.onclick = () => this.onConfirm();
    this.containerDiv.appendChild(confirmBtn);
  }

  updateFinalStatsUI() {
    this.remainingPointsDiv.textContent = `Points Remaining: ${this.pointsRemaining}`;

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

    playerProfile.name = chosenName;
    playerProfile.level = 1;
    playerProfile.totalExp = 0;
    playerProfile.selectedSkin = this.tempSelectedSkin;

    // Apply the allocated points
    playerBaseStats.intellect += this.intellectPoints;
    playerBaseStats.strength += this.strengthPoints;
    playerBaseStats.dexterity += this.dexterityPoints;
    playerBaseStats.constitution += this.constitutionPoints;

    document.body.removeChild(this.containerDiv);

    this.scene.start("MainScene");
  }
}
