// data/MOCKdata.js

// --- Player Profile (Meta info) ---
const playerProfile = {
  class: "mage",
  name: "Omigod",
  level: 1, // Added level for UI
  totalExp: 90,
};

// --- Player Base Stats ---
const playerBaseStats = {
  health: 100,
  mana: 150,
  intellect: 3, // formerly int_stat
  strength: 0,  // formerly str_stat
  dexterity: 3, // formerly dex_stat
  constitution: 4, // formerly con_stat
  speed: 50, // Added base speed (units can be pixels per second or similar)
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

// --- Stat Weights (How base stats affect derived stats) ---
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

// --- Weapons ---
const weaponItems = [
  {
    name: "basic_staff",
    type: "staff",
    health: 0,
    mana: 10,
    magicAttack: 3,
    meleeAttack: 1,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 0,
    speed: 0, // Default speed modifier
  },
  {
    name: "green_branch",
    type: "staff",
    health: 0,
    mana: 10,
    magicAttack: 5,
    meleeAttack: 2,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 0,
    speed: 0, // Default speed modifier
  },
  // Add more weapons here...
];

// --- Armors ---
const armorItems = [
  {
    name: "common_robe_chest",
    type: "robe",
    health: 10,
    mana: 12,
    magicAttack: 0,
    meleeAttack: 0,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 0,
    speed: 0, // Default speed modifier
  },
  {
    name: "common_robe_pants",
    type: "robe",
    health: 3,
    mana: 5,
    magicAttack: 0,
    meleeAttack: 0,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 0,
    speed: 0, // Default speed modifier
  },
  {
    name: "light_boots",
    type: "boots",
    health: 2,
    mana: 0,
    magicAttack: 0,
    meleeAttack: 0,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 0,
    speed: 5, // Increases player speed
  },
  {
    name: "swift_gauntlets",
    type: "gauntlets",
    health: 1,
    mana: 0,
    magicAttack: 0,
    meleeAttack: 0,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 5,
    speed: 5, // Increases player speed
  },
  // Add more armors here...
];

// --- What the player is currently wearing ---
const playerEquippedItems = {
  weapon: "basic_staff", // matches weaponItems[0].name
  head: null,
  chest: null,
  shoulders: null,
  legs: "swift_gauntlets",
  feet: "light_boots",
};

// --- Player Backpack / Inventory ---
const playerBackpack = {
  cell_0_0: 0,
  cell_0_1: 0,
  cell_0_2: 0,
  cell_0_3: 0,
  cell_0_4: 0,
  cell_1_0: 0,
  cell_1_1: 0,
  cell_1_2: 0,
  cell_1_3: 0,
  cell_1_4: 0,
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

// --- Skills / Attacks ---
const playerSkills = [
  {
    id: 1,
    name: "magic_wip",
    manaCost: 5,
    range: 150,
    magicAttack: 2,
    meleeAttack: 0,
    castingTime: 0,
    cooldown: 2, // in seconds
    icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_04.png",
    skillImage: "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/4_1.png",
    animationSeq: [0, 7],
  },
  {
    id: 2,
    name: "fire_ball",
    manaCost: 10,
    range: 150,
    magicAttack: 3,
    meleeAttack: 0,
    castingTime: 1,
    cooldown: 2,
    icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_03.png",
    skillImage: "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/3_2.png",
    animationSeq: [0, 7],
  },
  {
    id: 3,
    name: "earth_root",
    manaCost: 20,
    range: 150,
    magicAttack: 5,
    meleeAttack: 0,
    castingTime: 5,
    cooldown: 2,
    icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_01.png",
    skillImage: "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/1_2.png",
    animationSeq: [0, 7],
  },
];

// --- Mobs Data ---
// Added `level` property to each mob
const mobsData = {
  slime: {
    name: "Slime",
    level: 2,          // <--- mob level
    attackRange: 40,
    health: 50,
    mana: 0,
    magicAttack: 0,
    meleeAttack: 2,
    magicDefense: 2,
    meleeDefense: 30,
    magicEvasion: 1,
    meleeEvasion: 1,
    mobType: "friend",
    mobAgroRange: 300,
    attackCooldown: 2000,
    speed: 20,
    expReward: 10,
  },
  goblin: {
    name: "Goblin",
    level: 5,          // <--- mob level
    attackRange: 40,
    health: 40,
    mana: 0,
    magicAttack: 3,
    meleeAttack: 4,
    magicDefense: 2,
    meleeDefense: 5,
    magicEvasion: 2,
    meleeEvasion: 2,
    mobType: "enemy",
    mobAgroRange: 300,
    attackCooldown: 1500,
    speed: 70,
    expReward: 22,
  },
  // Add more mobs here...
};

// Example approach to define how experience is modified based on level difference
// We'll interpret "mobLevel - playerLevel = difference" and then determine a multiplier.
const expModifierRules = {
  // If mob is >= 5 levels above player
  mobAtLeast5Higher: 1.2, // => 120%
  // 4 levels higher
  mob4Higher: 1.15,       // => 115%
  mob3Higher: 1.1,        // => 110%
  mob2Higher: 1.05,       // => 105%
  mob1Higher: 1.03,       // => 103%
  equalLevel: 1.0,        // => 100%
  // Player is higher level:
  player1Higher: 0.97,    // => 97%
  player2Higher: 0.9,     // => 90%
  player3Higher: 0.8,     // => 80%
  player4Higher: 0.75,    // => 75%
  player5Higher: 0.5,     // => 50%
  // More than 5 levels higher => 0
  none: 0.0,
};

const naturalRegeneration = {
  manaRegen: 3,
  hpRegen: 4,
  regenerationTime: 5000,
};

const TAB_TARGET_RANGE = 400;
const MOB_CHASE_SPEED_MULT = 2.0;
const SKILL_RANGE_EXTENDER = 1.1;

// Export everything
export {
  playerProfile,
  playerBaseStats,
  playerGrowthStats,
  statWeights,
  weaponItems,
  armorItems,
  playerEquippedItems,
  playerBackpack,
  playerSkills,
  mobsData,
  naturalRegeneration,
  TAB_TARGET_RANGE,
  MOB_CHASE_SPEED_MULT,
  SKILL_RANGE_EXTENDER,
  expModifierRules, // <- make sure to export it
};
