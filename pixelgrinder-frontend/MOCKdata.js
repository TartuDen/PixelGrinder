// MOCKdata.js

const player_data = {
    playerName: "Omigod",
    totalExp: 0,
};

const player_basic_stats = {
    int_stat: 5,
    str_stat: 3,
    dex_stat: 3,
    con_stat: 4
};

const player_main_stats = {
    health: 100,
    mana: 150,
    magic_attack: 5,
    melee_attack: 5,
    magic_def: 5,
    melee_def: 5
}

const player_items = {
    weapon: "basic_staff",
    armor_head: null,
    armor_chest: null,
    armor_shoulders: null,
    armor_legs: null,
    armor_feet: null
};

const player_backpack = {
    cell_0_0: 0, cell_0_1: 0, cell_0_2: 0, cell_0_3: 0, cell_0_4: 0,
    cell_1_0: 0, cell_1_1: 0, cell_1_2: 0, cell_1_3: 0, cell_1_4: 0,
    cell_2_0: null, cell_2_1: null, cell_2_2: null, cell_2_3: null, cell_2_4: null,
    cell_3_0: null, cell_3_1: null, cell_3_2: null, cell_3_3: null, cell_3_4: null,
    cell_4_0: null, cell_4_1: null, cell_4_2: null, cell_4_3: null, cell_4_4: null,
    cell_5_0: null, cell_5_1: null, cell_5_2: null, cell_5_3: null, cell_5_4: null
};



//================= MOBS=======================
const mobsData = {
    slime: {
        name: "Slime",
        health: 22,
        mana: 0,
        magic_attack: 0,
        melee_attack: 3,
        magic_def: 2,
        melee_def: 3
    },
    goblin: {
      name: "Goblin",
      health: 40,
      mana: 0,
      magic_attack: 3,
      melee_attack: 4,
      magic_def: 2,
      melee_def: 5
    },
    // Add more mob types as needed
  };

export {
    player_data,
    player_basic_stats,
    player_main_stats,
    player_items,
    player_backpack,
    mobsData
  };