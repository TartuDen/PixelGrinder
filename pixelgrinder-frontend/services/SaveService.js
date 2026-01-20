const STORAGE_KEY = "pixelgrinder_save_v1";
const DATA_VERSION = 1;

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function hasSave() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

export function loadSave() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  if (!parsed || parsed.version !== DATA_VERSION) {
    return null;
  }
  return parsed;
}

export function saveGame(payload) {
  const data = {
    version: DATA_VERSION,
    savedAt: new Date().toISOString(),
    ...payload,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearSave() {
  localStorage.removeItem(STORAGE_KEY);
}

export function applySaveData(saveData, refs) {
  if (!saveData || !refs) return;
  const {
    playerProfile,
    playerBaseStats,
    playerEquippedItems,
    playerBackpack,
    playerSkills,
  } = refs;

  if (saveData.playerProfile && playerProfile) {
    Object.assign(playerProfile, saveData.playerProfile);
  }
  if (saveData.playerBaseStats && playerBaseStats) {
    Object.assign(playerBaseStats, saveData.playerBaseStats);
  }
  if (saveData.playerEquippedItems && playerEquippedItems) {
    Object.keys(playerEquippedItems).forEach((key) => delete playerEquippedItems[key]);
    Object.assign(playerEquippedItems, saveData.playerEquippedItems);
  }
  if (saveData.playerBackpack && playerBackpack) {
    Object.keys(playerBackpack).forEach((key) => delete playerBackpack[key]);
    Object.assign(playerBackpack, saveData.playerBackpack);
  }
  if (saveData.playerSkills && Array.isArray(playerSkills)) {
    playerSkills.length = 0;
    saveData.playerSkills.forEach((skill) => {
      playerSkills.push(cloneJson(skill));
    });
  }
}
