// __tests__/calculatePlayerStats.test.js
import {
    calculatePlayerStats,
  } from "../helpers/calculatePlayerStats.js";
  import {
    playerBaseStats,
    statWeights,
    weaponItems,
    armorItems,
    playerEquippedItems,
  } from "../data/MOCKdata.js";
  
  // Mock the data imports to control the test environment
  jest.mock("../data/MOCKdata.js", () => ({
    playerBaseStats: {
      health: 100,
      mana: 150,
      intellect: 3,
      strength: 3,
      dexterity: 3,
      constitution: 4,
    },
    statWeights: {
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
    },
    weaponItems: [
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
    ],
    armorItems: [
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
    ],
    playerEquippedItems: {
      weapon: "basic_staff",
      head: null,
      chest: "common_robe_chest",
      shoulders: null,
      legs: "common_robe_pants",
      feet: null,
    },
  }));
  
  describe("calculatePlayerStats", () => {
    test("calculates derived stats correctly with equipped items", () => {
      const expectedStats = {
        health: 100 + 0 + 10 + 3, // base health + weapon + chest armor + pants armor
        mana: 150 + 10 + 12 + 5, // base mana + weapon + chest armor + pants armor
        magicAttack:
          3 * 3 + // intellect * magicAttack
          3 * 0 + // strength * magicAttack
          3 * 1 + // dexterity * magicAttack
          0 + // constitution * magicAttack
          3, // weapon magicAttack
        meleeAttack:
          3 * 0 + // intellect * meleeAttack
          3 * 3 + // strength * meleeAttack
          3 * 1 + // dexterity * meleeAttack
          0 + // constitution * meleeAttack
          1, // weapon meleeAttack
        magicDefense:
          3 * 2 + // intellect * magicDefense
          3 * 0 + // strength * magicDefense
          3 * 0 + // dexterity * magicDefense
          4 * 3 + // constitution * magicDefense
          0 + // weapon magicDefense
          0 + // chest armor magicDefense
          0, // pants armor magicDefense
        meleeDefense:
          3 * 0 + // intellect * meleeDefense
          3 * 2 + // strength * meleeDefense
          3 * 0 + // dexterity * meleeDefense
          4 * 3 + // constitution * meleeDefense
          0 + // weapon meleeDefense
          0 + // chest armor meleeDefense
          0, // pants armor meleeDefense
        magicEvasion:
          3 * 1 + // intellect * magicEvasion
          3 * 0 + // strength * magicEvasion
          3 * 2 + // dexterity * magicEvasion
          4 * 0 + // constitution * magicEvasion
          0 + // weapon magicEvasion
          0 + // chest armor magicEvasion
          0, // pants armor magicEvasion
        meleeEvasion:
          3 * 0 + // intellect * meleeEvasion
          3 * 1 + // strength * meleeEvasion
          3 * 2 + // dexterity * meleeEvasion
          4 * 0 + // constitution * meleeEvasion
          0 + // weapon meleeEvasion
          0 + // chest armor meleeEvasion
          0, // pants armor meleeEvasion
      };
  
      const actualStats = calculatePlayerStats();
  
      expect(actualStats).toEqual(expectedStats);
    });
  
    test("handles no equipped items correctly", () => {
      // Modify the mock to have no equipped items
      const { playerEquippedItems } = require("../data/MOCKdata.js");
      playerEquippedItems.weapon = null;
      playerEquippedItems.chest = null;
      playerEquippedItems.legs = null;
  
      const expectedStats = {
        health: 100, // base health
        mana: 150, // base mana
        magicAttack:
          3 * 3 + // intellect * magicAttack
          3 * 0 + // strength * magicAttack
          3 * 1 + // dexterity * magicAttack
          0, // constitution * magicAttack
        meleeAttack:
          3 * 0 + // intellect * meleeAttack
          3 * 3 + // strength * meleeAttack
          3 * 1 + // dexterity * meleeAttack
          0, // constitution * meleeAttack
        magicDefense:
          3 * 2 + // intellect * magicDefense
          3 * 0 + // strength * magicDefense
          3 * 0 + // dexterity * magicDefense
          4 * 3, // constitution * magicDefense
        meleeDefense:
          3 * 0 + // intellect * meleeDefense
          3 * 2 + // strength * meleeDefense
          3 * 0 + // dexterity * meleeDefense
          4 * 3, // constitution * meleeDefense
        magicEvasion:
          3 * 1 + // intellect * magicEvasion
          3 * 0 + // strength * magicEvasion
          3 * 2 + // dexterity * magicEvasion
          4 * 0, // constitution * magicEvasion
        meleeEvasion:
          3 * 0 + // intellect * meleeEvasion
          3 * 1 + // strength * meleeEvasion
          3 * 2 + // dexterity * meleeEvasion
          4 * 0, // constitution * meleeEvasion
      };
  
      const actualStats = calculatePlayerStats();
  
      expect(actualStats).toEqual(expectedStats);
    });
  
    // Add more tests as needed
  });
  