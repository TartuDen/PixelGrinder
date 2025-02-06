import { playerProfile, playerBaseStats } from "../data/MOCKdata.js";

export default class CharacterCreationScene extends Phaser.Scene {
  constructor() {
    super("CharacterCreationScene");

    this.nameInput = null;
    this.intellectPoints = 0;
    this.strengthPoints = 0;
    this.dexterityPoints = 0;
    this.constitutionPoints = 0;
    this.pointsRemaining = 10;

    // We'll create some container or form elements in an HTML overlay.
    this.containerDiv = null;
  }

  preload() {
    // If you have any assets for the background, load them here
    // this.load.image("charCreationBG", "assets/char_creation_bg.png");
  }

  create() {
    // Optionally create a background image in Phaser:
    // this.add.image(400, 300, "charCreationBG").setDepth(0);

    // We'll create a DOM overlay that sits on top of the canvas.
    this.createDOMElements();
  }

  createDOMElements() {
    // Create a parent container for the character creation form
    this.containerDiv = document.createElement("div");
    this.containerDiv.id = "char-creation-container";
    this.containerDiv.classList.add("char-creation-container");

    // 1) Character Name
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

    // 2) Points Distribution
    // We'll show the remaining points and create plus/minus for each attribute.
    const remainingPoints = document.createElement("div");
    remainingPoints.id = "remaining-points";
    remainingPoints.textContent = `Points Remaining: ${this.pointsRemaining}`;
    remainingPoints.classList.add("char-creation-points-remaining");
    this.containerDiv.appendChild(remainingPoints);

    // Helper function to build a row for each stat
    const buildStatRow = (statName, displayName) => {
      const row = document.createElement("div");
      row.classList.add("char-creation-stat-row");

      const label = document.createElement("span");
      label.textContent = `${displayName}: `;
      label.classList.add("char-creation-stat-label");
      row.appendChild(label);

      // minus button
      const minusBtn = document.createElement("button");
      minusBtn.textContent = "-";
      minusBtn.classList.add("char-creation-stat-btn");
      minusBtn.onclick = () => {
        if (this[statName + "Points"] > 0) {
          this[statName + "Points"]--;
          this.pointsRemaining++;
          updateDisplay();
        }
      };
      row.appendChild(minusBtn);

      // numeric display
      const valueDisplay = document.createElement("span");
      valueDisplay.textContent = this[statName + "Points"];
      valueDisplay.classList.add("char-creation-stat-value");
      row.appendChild(valueDisplay);

      // plus button
      const plusBtn = document.createElement("button");
      plusBtn.textContent = "+";
      plusBtn.classList.add("char-creation-stat-btn");
      plusBtn.onclick = () => {
        if (this.pointsRemaining > 0) {
          this[statName + "Points"]++;
          this.pointsRemaining--;
          updateDisplay();
        }
      };
      row.appendChild(plusBtn);

      // updates row display
      const updateDisplay = () => {
        valueDisplay.textContent = this[statName + "Points"];
        remainingPoints.textContent = `Points Remaining: ${this.pointsRemaining}`;
      };

      return row;
    };

    const intellectRow = buildStatRow("intellect", "Intellect");
    const strengthRow = buildStatRow("strength", "Strength");
    const dexterityRow = buildStatRow("dexterity", "Dexterity");
    const constitutionRow = buildStatRow("constitution", "Constitution");

    this.containerDiv.appendChild(intellectRow);
    this.containerDiv.appendChild(strengthRow);
    this.containerDiv.appendChild(dexterityRow);
    this.containerDiv.appendChild(constitutionRow);

    // 3) Confirm Button
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    confirmBtn.classList.add("char-creation-confirm-btn");
    confirmBtn.onclick = () => this.onConfirm();
    this.containerDiv.appendChild(confirmBtn);

    // Finally, attach container to document body
    document.body.appendChild(this.containerDiv);
  }

  onConfirm() {
    const chosenName = this.nameInput.value.trim();
    if (!chosenName) {
      alert("Please enter a valid character name!");
      return;
    }
    // If the user didn't allocate all points, we can just let them continue or alert them.
    // For now, let's just continue even if some points remain. Or do:
    if (this.pointsRemaining > 0) {
      alert("You still have unallocated points!");
      return;
    }

    // 1) Populate playerProfile
    playerProfile.name = chosenName;
    playerProfile.level = 1; // Start at level 1
    playerProfile.totalExp = 0; // Start at 0 exp

    // 2) Add the allocated attribute points to playerBaseStats
    playerBaseStats.intellect += this.intellectPoints;
    playerBaseStats.strength += this.strengthPoints;
    playerBaseStats.dexterity += this.dexterityPoints;
    playerBaseStats.constitution += this.constitutionPoints;

    // Remove DOM from screen
    if (this.containerDiv) {
      document.body.removeChild(this.containerDiv);
      this.containerDiv = null;
    }

    // Start the main game scene
    this.scene.start("MainScene");
  }
}
