//
// data/MOCKdata.js
//

// --- Player Profile (Meta info) ---
const playerProfile = {
  class: "mage",
  name: "Omigod",
  level: 1,
  totalExp: 9000000,
};

// --- Player Base Stats ---
const playerBaseStats = {
  health: 100,
  mana: 150,
  intellect: 3,
  strength: 0,
  dexterity: 3,
  constitution: 4,
  speed: 50,
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

// --------------------------------------------------------------------
// ALL GAME SKILLS (IDs starting at 1000)
// --------------------------------------------------------------------
const allGameSkills = [
  {
    id: 1000,
    name: "magic_wip",
    manaCost: 5,
    range: 150,
    magicAttack: 2,
    meleeAttack: 0,
    castingTime: 0,
    cooldown: 2,
    icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_04.png",
    skillImage: "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/4_1.png",
    animationSeq: [0, 7],
  },
  {
    id: 1001,
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
    id: 1002,
    name: "earth_root",
    manaCost: 8,
    range: 150,
    magicAttack: 10,
    meleeAttack: 0,
    castingTime: 5,
    cooldown: 10,
    icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_01.png",
    skillImage: "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/1.png",
    animationSeq: [0, 7],
  },
];

// --------------------------------------------------------------------
// PLAYER SKILLS (references to the above IDs)
// --------------------------------------------------------------------
const playerSkills = [
  {
    id: 1000,
    name: "magic_wip",
    manaCost: 5,
    range: 150,
    magicAttack: 2,
    meleeAttack: 0,
    castingTime: 0,
    cooldown: 2,
    icon: "assets/skills/free-pixel-magic-sprite-effects-pack/2 Icons/Icon_04.png",
    skillImage: "assets/skills/free-pixel-magic-sprite-effects-pack/1 Magic/4_1.png",
    animationSeq: [0, 7],
  },
  {
    id: 1001,
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
];

// --------------------------------------------------------------------
// ITEM LISTS
// --------------------------------------------------------------------

// 3) weaponItems: IDs start at 2000
const weaponItems = [
  {
    id: 2000,
    name: "basic_staff",
    type: "staff",
    slot: "weapon",
    health: 0,
    mana: 10,
    magicAttack: 3,
    meleeAttack: 1,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 0,
    speed: 0,
  },
  {
    id: 2001,
    name: "green_branch",
    type: "staff",
    slot: "weapon",
    health: 0,
    mana: 10,
    magicAttack: 5,
    meleeAttack: 2,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 0,
    speed: 0,
  },
];

// 4) armorItems: IDs start at 3000
const armorItems = [
  {
    id: 3000,
    name: "common_robe_chest",
    type: "robe",
    slot: "chest",
    health: 10,
    mana: 12,
    magicAttack: 0,
    meleeAttack: 0,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 0,
    speed: 0,
  },
  {
    id: 3001,
    name: "common_robe_pants",
    type: "robe",
    slot: "legs",
    health: 3,
    mana: 5,
    magicAttack: 0,
    meleeAttack: 0,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 0,
    speed: 0,
  },
  {
    id: 3002,
    name: "light_boots",
    type: "boots",
    slot: "feet",
    health: 2,
    mana: 0,
    magicAttack: 0,
    meleeAttack: 0,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 0,
    speed: 5,
  },
  {
    id: 3003,
    name: "swift_gauntlets",
    type: "gauntlets",
    slot: "shoulders",
    health: 1,
    mana: 0,
    magicAttack: 0,
    meleeAttack: 0,
    magicDefense: 0,
    meleeDefense: 0,
    magicEvasion: 0,
    meleeEvasion: 5,
    speed: 5,
  },
];

// Combine weapons + armor into one list
const allItems = [...weaponItems, ...armorItems];

// Build a quick lookup by item.id
const itemsMap = {};
allItems.forEach((item) => {
  itemsMap[item.id] = item;
});

// 5) Currently equipped: store item IDs (not names)
const playerEquippedItems = {
  weapon: 2000,   // "basic_staff" (was ID=1, now 2000)
  head: null,
  chest: null,
  shoulders: 3003, // "swift_gauntlets" (was ID=103, now 3003)
  legs: null,
  feet: 3002,     // "light_boots" (was ID=102, now 3002)
};

// 6) Player backpack: also store item IDs
const playerBackpack = {
  cell_0_0: 2000, // was 1 => basic_staff
  cell_0_1: 2001, // was 2 => green_branch
  cell_0_2: 0,
  cell_0_3: 0,
  cell_0_4: 0,
  cell_1_0: 3003, // was 103 => swift_gauntlets
  cell_1_1: 0,
  cell_1_2: 0,
  cell_1_3: 0,
  cell_1_4: 0,
  cell_2_0: 0,
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

// Track deleted items
const deletedItems = [];

// --------------------------------------------------------------------
// MOBS + LOOT
// --------------------------------------------------------------------
const mobsData = {
  slime: {
    name: "Slime",
    level: 2,
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
    attackCooldown: 2000,
    speed: 20,
    expReward: 10,
    // Loot references: itemId=2001 => "green_branch", skillId=1002 => "ice_shard"
    lootTable: [
      { itemId: 2001, chance: 80 }, // green_branch
      { itemId: 1002, chance: 80 }, // skill "ice_shard"
    ],
  },
  goblin: {
    name: "Goblin",
    level: 5,
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
    lootTable: [],
  },
};

// Experience modifier rules
const expModifierRules = {
  mobAtLeast5Higher: 1.2,
  mob4Higher: 1.15,
  mob3Higher: 1.1,
  mob2Higher: 1.05,
  mob1Higher: 1.03,
  equalLevel: 1.0,
  player1Higher: 0.97,
  player2Higher: 0.9,
  player3Higher: 0.8,
  player4Higher: 0.75,
  player5Higher: 0.5,
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
};
