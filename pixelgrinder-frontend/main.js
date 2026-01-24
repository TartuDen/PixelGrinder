// File: main.js
import { gameConfig } from "./config.js";
import MainScene from "./scenes/MainScene.js";
// Import the new scene:
import CharacterCreationScene from "./scenes/CharacterCreationScene.js";

const enableDebugOverlay =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";

const appendDebugOverlay = (title, details) => {
  if (!enableDebugOverlay) return;
  let overlay = document.getElementById("debug-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "debug-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "10px";
    overlay.style.left = "10px";
    overlay.style.zIndex = "99999";
    overlay.style.maxWidth = "520px";
    overlay.style.maxHeight = "40vh";
    overlay.style.overflow = "auto";
    overlay.style.background = "rgba(0, 0, 0, 0.85)";
    overlay.style.color = "#f5d7b2";
    overlay.style.fontFamily = "monospace";
    overlay.style.fontSize = "12px";
    overlay.style.padding = "8px 10px";
    overlay.style.border = "1px solid rgba(245, 215, 178, 0.35)";
    overlay.style.borderRadius = "6px";
    overlay.style.whiteSpace = "pre-wrap";
    overlay.style.pointerEvents = "auto";
    document.body.appendChild(overlay);
  }
  const entry = document.createElement("div");
  const timestamp = new Date().toISOString();
  entry.textContent = `${timestamp}\n${title}\n${details}\n`;
  overlay.prepend(entry);
};

window.__pgDebugOverlay = appendDebugOverlay;

const getSceneInfo = () => {
  const game = window.__pgGame;
  if (!game || !game.scene) return "scene: unknown";
  const scenes = game.scene.getScenes(true).map((scene) => scene.scene.key);
  return `scene: ${scenes.join(", ") || "none"}`;
};

window.addEventListener("error", (event) => {
  if (event.target && (event.target.src || event.target.href)) {
    const url = event.target.src || event.target.href;
    const details = `Resource error\nurl: ${url}\n${getSceneInfo()}`;
    console.error("Resource error:", details);
    appendDebugOverlay("Resource error", details);
    return;
  }
  const details = [
    event.message,
    event.filename ? `file: ${event.filename}:${event.lineno}:${event.colno}` : "",
    event.error?.stack || "",
    getSceneInfo(),
  ]
    .filter(Boolean)
    .join("\n");
  console.error("Global error:", details);
  appendDebugOverlay("Global error", details);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const details = [
    reason?.message || String(reason),
    reason?.stack || "",
    getSceneInfo(),
  ]
    .filter(Boolean)
    .join("\n");
  console.error("Unhandled rejection:", details);
  appendDebugOverlay("Unhandled rejection", details);
});

// Add scenes to the config in order:
gameConfig.scene = [CharacterCreationScene, MainScene];

// Launch Phaser
const game = new Phaser.Game(gameConfig);
window.__pgGame = game;

if (window.Phaser?.Animations?.AnimationManager) {
  const proto = window.Phaser.Animations.AnimationManager.prototype;
  if (!proto.__pgWrapped) {
    const originalCreate = proto.create;
    const originalGenerate = proto.generateFrameNumbers;

    proto.create = function (config) {
      try {
        return originalCreate.call(this, config);
      } catch (err) {
        const details = [
          "AnimationManager.create failed",
          `key: ${config?.key}`,
          `framesType: ${Array.isArray(config?.frames) ? "array" : typeof config?.frames}`,
          `frameRate: ${config?.frameRate}`,
          `repeat: ${config?.repeat}`,
          err?.stack || err?.message || String(err),
        ].join("\n");
        console.error(details);
        appendDebugOverlay("AnimationManager.create failed", details);
        throw err;
      }
    };

    proto.generateFrameNumbers = function (key, config) {
      try {
        return originalGenerate.call(this, key, config);
      } catch (err) {
        const details = [
          "AnimationManager.generateFrameNumbers failed",
          `key: ${key}`,
          `config: ${JSON.stringify(config)}`,
          err?.stack || err?.message || String(err),
        ].join("\n");
        console.error(details);
        appendDebugOverlay("AnimationManager.generateFrameNumbers failed", details);
        throw err;
      }
    };

    proto.__pgWrapped = true;
  }
}
