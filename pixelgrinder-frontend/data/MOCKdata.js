// data/MOCKdata.js

// --- Player Profile (Meta info) ---
const playerProfile = {
  class: "mage",
  name: "Omigod",
  level: 1, // Added level for UI
  totalExp: 0,
};

// --- Player Base Stats ---
const playerBaseStats = {
  health: 100,
  mana: 150,
  intellect: 3, // formerly int_stat
  strength: 0, // formerly str_stat
  dexterity: 3, // formerly dex_stat
  constitution: 4, // formerly con_stat
  speed: 50, // Added base speed (units can be pixels per second or similar)
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
    speed: 10, // Increases player speed by 10 units
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
    meleeEvasion: 50,
    speed: 5, // Increases player speed by 5 units
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
    id: 1, // Added unique ID
    name: "magic_wip",
    manaCost: 5,
    range: 150,
    magicAttack: 2,
    meleeAttack: 0,
    castingTime: 0,
    cooldown: 2, //in seconds
    icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_04.png",
    skillImage:
      "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/4_1.png",
    animationSeq: [0, 7],
  },
  {
    id: 2, // Added unique ID
    name: "fire_ball",
    manaCost: 10,
    range: 150,
    magicAttack: 3,
    meleeAttack: 0,
    castingTime: 1,
    cooldown: 2, //in seconds
    icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_03.png",
    skillImage:
      "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/3_2.png",
    animationSeq: [0, 7],
  },
  {
    id: 3, // Added unique ID
    name: "earth_root",
    manaCost: 20,
    range: 150,
    magicAttack: 5,
    meleeAttack: 0,
    castingTime: 5,
    cooldown: 2, //in seconds
    icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_01.png",
    skillImage:
      "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/1_2.png",
    animationSeq: [0, 7],
  },
];

// --- Mobs Data ---
const mobsData = {
  slime: {
    name: "Slime",
    attackRange: 40,
    health: 50,
    mana: 0,
    magicAttack: 0,
    meleeAttack: 2,
    magicDefense: 2,
    meleeDefense: 30,
    magicEvasion: 1, // maximum evasion is 100 which corresponds to 100%
    meleeEvasion: 1,
    mobType: "friend",
    mobAgroRange: 300,
    attackCooldown: 2000, // milliseconds between attacks
    speed: 20, // Added speed
  },
  goblin: {
    name: "Goblin",
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
    speed: 70, // Added speed
  },
  // Add more mobs here...
};

const naturalRegeneration = {
  manaRegen: 3, // Regenerates 3 mana per regenerationTime
  hpRegen: 4, // Regenerates 4 health per regenerationTime
  regenerationTime: 5000, // Time in ms (5s)
};

// Define TAB targeting range (in pixels)
const TAB_TARGET_RANGE = 400; // Adjust this value as needed
const MOB_CHASE_SPEED_MULT = 2.0 // 10% increase of speed
const SKILL_RANGE_EXTENDER = 1.1 // 30% increase of casting distance


// Export everything
export {
  playerProfile,
  playerBaseStats,
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
  SKILL_RANGE_EXTENDER
};
