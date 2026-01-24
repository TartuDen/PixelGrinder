// File: data/MOCKdata.js
import { allGameSkills, startingSkills } from "./content/skills.js";
import {
  weaponItems,
  armorItems,
  gatherableItems,
  allItems,
  itemsMap,
} from "./content/items.js";
import { mobsData, expModifierRules } from "./content/mobs.js";
import { zones } from "./content/zones.js";
import { npcVendors } from "./content/npcs.js";
import { applyAdminOverrides, loadAdminOverrides } from "../services/AdminOverrides.js";

// --- Player Profile (Meta info) ---
const playerProfile = {
  name: "",
  level: 1,
  totalExp: 0,
  // NEW: which skin the player selected (e.g. "necromancer" | "sorceress" | "warrior")
  selectedSkin: null,
  gold: 100,
  gameMode: "normal",
};

// We can store 3 different character skins (plus references to a showreel GIF or image)
const availableCharacterSkins = [
  {
    key: "necromancer",
    displayName: "Necromancer",
    previewGif: "assets/Foozle_2DC0010_Lucifer_Necromancer_Pixel_Art/Necromancer animations showreel.gif",
  },
  {
    key: "warrior",
    displayName: "Warrior",
    previewGif: "assets/Foozle_2DC0009_Lucifer_Warrior_Pixel_Art/Warrior Showreel.gif",
  },
  {
    key: "sorceress",
    displayName: "Sorceress",
    previewGif: "assets/Foozle_2DC0011_Lucifer_Sorceress_Pixel_Art/Sorceress Animation Showreel.gif",
  },
];

// --- Player Base Stats ---
const playerBaseStats = {
  health: 100,
  mana: 150,
  intellect: 0,
  strength: 0,
  dexterity: 0,
  constitution: 0,
  speed: 50,
  gatherSpeed: 1,
};

const playerGrowthStats = {
  health: 7,
  mana: 10,
  intellect: 1,
  strength: 1,
  dexterity: 1,
  constitution: 1,
  speed: 3,
};

// Stat Weights
const statWeights = {
  intellect: {
    magicAttack: 3,
    meleeAttack: 0,
    magicDefense: 2,
    meleeDefense: 0,
    magicEvasion: 1,
    meleeEvasion: 0,
  },
  strength: {
    magicAttack: 0,
    meleeAttack: 3,
    magicDefense: 0,
    meleeDefense: 2,
    magicEvasion: 0,
    meleeEvasion: 1,
  },
  dexterity: {
    magicAttack: 1,
    meleeAttack: 1,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 2,
    meleeEvasion: 2,
  },
  constitution: {
    magicAttack: 0,
    meleeAttack: 0,
    magicDefense: 3,
    meleeDefense: 3,
    magicEvasion: 0,
    meleeEvasion: 0,
  },
};

// --------------------------------------------------------------------
// Skill Enhancements
// --------------------------------------------------------------------
const skillEnhancements = {
  default: {
    manaCost: 0.1,
    range: 0.0,
    magicAttack: 0.1,
    castingTime: -0.1,
    cooldown: -0.1,
  },
  self_heal: {
    manaCost: 0.1,
    castingTime: -0.15,
    cooldown: -0.2,
    healHP: 0.2,
    healMP: 0.2,
  },
};

const playerSkills = startingSkills.map((skill) => ({ ...skill }));

// Currently equipped
const playerEquippedItems = {
  weapon: 2000,
  head: null,
  chest: null,
  shoulders: 3003,
  legs: null,
  feet: 3002,
};

// Backpack
const playerBackpack = {
  cell_0_0: 2000,
  cell_0_1: 2001,
  cell_0_2: 0,
  cell_0_3: 0,
  cell_0_4: 0,
  cell_1_0: 3000,
  cell_1_1: 3001,
  cell_1_2: 3002,
  cell_1_3: 3003,
  cell_1_4: null,
  cell_2_0: null,
  cell_2_1: null,
  cell_2_2: null,
  cell_2_3: null,
  cell_2_4: null,
  cell_3_0: null,
  cell_3_1: null,
  cell_3_2: null,
  cell_3_3: null,
  cell_3_4: null,
  cell_4_0: null,
  cell_4_1: null,
  cell_4_2: null,
  cell_4_3: null,
  cell_4_4: null,
  cell_5_0: null,
  cell_5_1: null,
  cell_5_2: null,
  cell_5_3: null,
  cell_5_4: null,
};

const deletedItems = [];

const naturalRegeneration = {
  manaRegen: 3,
  hpRegen: 4,
  regenerationTime: 5000,
};

const TAB_TARGET_RANGE = 400;
const MOB_CHASE_SPEED_MULT = 1.05;
const SKILL_RANGE_EXTENDER = 1.1;
const GATHER_RANGE = 50;
const MOB_CORPSE_DURATION = 8000;

const defaultPlayerProfile = JSON.parse(JSON.stringify(playerProfile));
const defaultPlayerBaseStats = JSON.parse(JSON.stringify(playerBaseStats));
const defaultPlayerGrowthStats = JSON.parse(JSON.stringify(playerGrowthStats));
const defaultNaturalRegeneration = JSON.parse(JSON.stringify(naturalRegeneration));
const defaultPlayerEquippedItems = JSON.parse(JSON.stringify(playerEquippedItems));
const defaultAllGameSkills = JSON.parse(JSON.stringify(allGameSkills));
const defaultMobsData = JSON.parse(JSON.stringify(mobsData));

const buildDefaultSpawnControls = () => {
  const enabledMobIds = {};
  const perMobCap = {};
  Object.keys(mobsData).forEach((mobId) => {
    enabledMobIds[mobId] = true;
    perMobCap[mobId] = null;
  });
  return {
    enabledMobIds,
    perMobCap,
    globalCap: null,
  };
};

const spawnControls = buildDefaultSpawnControls();
const defaultSpawnControls = JSON.parse(JSON.stringify(spawnControls));

const adminOverrides = loadAdminOverrides();
applyAdminOverrides(adminOverrides, {
  playerProfile,
  playerBaseStats,
  playerGrowthStats,
  naturalRegeneration,
  playerEquippedItems,
  mobsData,
  allGameSkills,
  spawnControls,
});

export {
  playerProfile,
  availableCharacterSkins,
  playerBaseStats,
  playerGrowthStats,
  statWeights,
  skillEnhancements,
  weaponItems,
  armorItems,
  playerEquippedItems,
  playerBackpack,
  playerSkills,
  allGameSkills,
  mobsData,
  naturalRegeneration,
  TAB_TARGET_RANGE,
  MOB_CHASE_SPEED_MULT,
  SKILL_RANGE_EXTENDER,
  expModifierRules,
  allItems,
  itemsMap,
  deletedItems,
  GATHER_RANGE,
  MOB_CORPSE_DURATION,
  zones,
  npcVendors,
  spawnControls,
  defaultMobsData,
  defaultSpawnControls,
  defaultPlayerProfile,
  defaultPlayerBaseStats,
  defaultPlayerGrowthStats,
  defaultNaturalRegeneration,
  defaultPlayerEquippedItems,
  defaultAllGameSkills,
};
