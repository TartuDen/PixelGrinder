// managers/InGameMenu.js

export default class InGameMenu {
    constructor(scene, uiManager) {
      this.scene = scene;
      this.uiManager = uiManager;
      this.menuContainer = null;
    }
  
    createMenuButtons() {
      this.menuContainer = document.createElement("div");
      this.menuContainer.id = "game-menu-container";
      this.menuContainer.style.position = "fixed";
      this.menuContainer.style.bottom = "20px";
      this.menuContainer.style.right = "20px";
      this.menuContainer.style.zIndex = 9999;
      this.menuContainer.style.display = "flex";
      this.menuContainer.style.gap = "10px";
      document.body.appendChild(this.menuContainer);
  
      const playerInfoBtn = this.createMenuButton("PLAYER INFO", () => {
        this.scene.toggleInventoryMenu();
      });
      const skillBookBtn = this.createMenuButton("SKILL BOOK", () => {
        this.uiManager.toggleSkillBook();
      });
  
      this.menuContainer.appendChild(playerInfoBtn);
      this.menuContainer.appendChild(skillBookBtn);
    }
  
    createMenuButton(label, onClick) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.padding = "10px 15px";
      btn.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      btn.style.border = "1px solid #f1c40f";
      btn.style.color = "#f1c40f";
      btn.style.fontFamily = "Cinzel, serif";
      btn.style.fontSize = "14px";
      btn.style.borderRadius = "5px";
      btn.style.cursor = "pointer";
  
      btn.addEventListener("mouseenter", () => {
        btn.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      });
  
      btn.onclick = onClick;
      return btn;
    }
  }
  