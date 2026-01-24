const STORAGE_KEY = "pixelgrinder_admin_overrides_v2";
const DATA_VERSION = 2;

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function loadAdminOverrides() {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  if (!parsed || parsed.version !== DATA_VERSION) {
    return null;
  }
  return parsed.payload || null;
}

export function saveAdminOverrides(payload) {
  if (typeof localStorage === "undefined") return;
  const data = {
    version: DATA_VERSION,
    savedAt: new Date().toISOString(),
    payload,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearAdminOverrides() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem("pixelgrinder_admin_overrides_v1");
  localStorage.removeItem(STORAGE_KEY);
}

export function applyAdminOverrides(overrides, refs) {
  if (!overrides || !refs) return;
  const {
    playerProfile,
    playerBaseStats,
    playerGrowthStats,
    naturalRegeneration,
    playerEquippedItems,
    mobsData,
    allGameSkills,
    spawnControls,
  } = refs;

  if (overrides.playerProfile && playerProfile) {
    Object.assign(playerProfile, overrides.playerProfile);
  }
  if (overrides.playerBaseStats && playerBaseStats) {
    Object.assign(playerBaseStats, overrides.playerBaseStats);
  }
  if (overrides.playerGrowthStats && playerGrowthStats) {
    Object.assign(playerGrowthStats, overrides.playerGrowthStats);
  }
  if (overrides.naturalRegeneration && naturalRegeneration) {
    Object.assign(naturalRegeneration, overrides.naturalRegeneration);
  }
  if (overrides.playerEquippedItems && playerEquippedItems) {
    Object.keys(playerEquippedItems).forEach((key) => delete playerEquippedItems[key]);
    Object.assign(playerEquippedItems, overrides.playerEquippedItems);
  }
  if (overrides.mobsData && mobsData) {
    Object.keys(overrides.mobsData).forEach((mobId) => {
      if (!mobsData[mobId]) {
        mobsData[mobId] = { ...overrides.mobsData[mobId] };
        return;
      }
      Object.assign(mobsData[mobId], overrides.mobsData[mobId]);
    });
  }
  if (overrides.allGameSkills && allGameSkills) {
    overrides.allGameSkills.forEach((skillOverride) => {
      const existing = allGameSkills.find((skill) => skill.id === skillOverride.id);
      if (existing) {
        Object.assign(existing, skillOverride);
      } else {
        allGameSkills.push({ ...skillOverride });
      }
    });
  }
  if (overrides.spawnControls && spawnControls) {
    const { enabledMobIds, perMobCap, globalCap } = overrides.spawnControls;
    if (enabledMobIds && spawnControls.enabledMobIds) {
      Object.assign(spawnControls.enabledMobIds, enabledMobIds);
    }
    if (perMobCap && spawnControls.perMobCap) {
      Object.assign(spawnControls.perMobCap, perMobCap);
    }
    if (globalCap !== undefined) {
      spawnControls.globalCap = globalCap;
    }
  }
}
