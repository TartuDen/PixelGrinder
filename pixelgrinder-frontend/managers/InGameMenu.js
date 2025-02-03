// File: managers/InGameMenu.js
export default class InGameMenu {
  constructor(scene, uiManager) {
    this.scene = scene;
    this.uiManager = uiManager;
    this.menuContainer = null;
  }

  createMenuButtons() {
    // Use an ID and let the CSS handle position, display, etc.
    this.menuContainer = document.createElement("div");
    this.menuContainer.id = "game-menu-container";
    document.body.appendChild(this.menuContainer);

    // Player Info button
    const playerInfoBtn = this.createMenuButton("PLAYER INFO", () => {
      this.scene.toggleInventoryMenu();
    });
    // Skill Book button
    const skillBookBtn = this.createMenuButton("SKILL BOOK", () => {
      this.uiManager.toggleSkillBook();
    });

    this.menuContainer.appendChild(playerInfoBtn);
    this.menuContainer.appendChild(skillBookBtn);
  }

  createMenuButton(label, onClick) {
    const btn = document.createElement("button");
    btn.textContent = label;
    // Instead of applying styles inline, just add a class:
    btn.classList.add("in-game-menu-button");
    btn.onclick = onClick;
    return btn;
  }
}
