// MOCKdata.js

// --- Player Profile (Meta info) ---
const playerProfile = {
  class: "mage",
  name: "Omigod",
  totalExp: 0,
};

// --- Player Base Stats ---
const playerBaseStats = {
  health: 100,
  mana: 150,
  intellect: 5, // formerly int_stat
  strength: 3, // formerly str_stat
  dexterity: 3, // formerly dex_stat
  constitution: 4, // formerly con_stat
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

// --- Weapons and Armors ---
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
  },
];

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
  },
];

// --- What the player is currently wearing ---
const playerEquippedItems = {
  weapon: "basic_staff", // matches weaponItems[0].name
  head: null,
  chest: null,
  shoulders: null,
  legs: null,
  feet: null,
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
    name: "magic_wip",
    manaCost: 5,
    range: 20,
    magicAttack: 2,
    meleeAttack: 0,
    icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_04.png",
    skillImage:
      "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/4_1.png",
    animationSeq: [0, 7],
  },
  {
    name: "fire_ball",
    manaCost: 10,
    range: 20,
    magicAttack: 3,
    meleeAttack: 0,
    icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_03.png",
    skillImage:
      "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/3_2.png",
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
      meleeAttack: 20,
      magicDefense: 2,
      meleeDefense: 30,
      magicEvasion: 1,
      meleeEvasion: 1,
      mobType: "friend",
      mobAgroRange: 300,
      attackCooldown: 1000, // milliseconds between attacks
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
    },
  };
  

const naturalRegeneration = {
  manaRegen: 3, // Regenerates 3 mana per regenerationTime
  hpRegen: 4, // Regenerates 4 health per regenerationTime
  regenerationTime: 5000, // Time in milliseconds (e.g., 5000ms = 5 seconds)
};

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
};
