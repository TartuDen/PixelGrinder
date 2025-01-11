// pixelgrinder-frontend/helpers/calculatePlayerStats.js

import {
  playerBaseStats,
  statWeights,
  weaponItems,
  armorItems,
  playerEquippedItems,
} from "../data/MOCKdata.js";

/**
 * Returns the player's final derived stats based on:
 *   (1) base stats + stat weights
 *   (2) equipped weapon & armor
 */
export function calculatePlayerStats() {
  // 1) Start with base stats
  let {
    health,
    mana,
    intellect,
    strength,
    dexterity,
    constitution,
    speed, // Added speed from base stats
  } = playerBaseStats;

  // 2) Derived stats from base stats * statWeights
  let magicAttack = 0;
  let meleeAttack = 0;
  let magicDefense = 0;
  let meleeDefense = 0;
  let magicEvasion = 0;
  let meleeEvasion = 0;

  // a) Apply intellect
  magicAttack += intellect * statWeights.intellect.magicAttack;
  meleeAttack += intellect * statWeights.intellect.meleeAttack;
  magicDefense += intellect * statWeights.intellect.magicDefense;
  meleeDefense += intellect * statWeights.intellect.meleeDefense;
  magicEvasion += intellect * statWeights.intellect.magicEvasion;
  meleeEvasion += intellect * statWeights.intellect.meleeEvasion;

  // b) Apply strength
  magicAttack += strength * statWeights.strength.magicAttack;
  meleeAttack += strength * statWeights.strength.meleeAttack;
  magicDefense += strength * statWeights.strength.magicDefense;
  meleeDefense += strength * statWeights.strength.meleeDefense;
  magicEvasion += strength * statWeights.strength.magicEvasion;
  meleeEvasion += strength * statWeights.strength.meleeEvasion;

  // c) Apply dexterity
  magicAttack += dexterity * statWeights.dexterity.magicAttack;
  meleeAttack += dexterity * statWeights.dexterity.meleeAttack;
  magicDefense += dexterity * statWeights.dexterity.magicDefense;
  meleeDefense += dexterity * statWeights.dexterity.meleeDefense;
  magicEvasion += dexterity * statWeights.dexterity.magicEvasion;
  meleeEvasion += dexterity * statWeights.dexterity.meleeEvasion;

  // d) Apply constitution
  magicAttack += constitution * statWeights.constitution.magicAttack;
  meleeAttack += constitution * statWeights.constitution.meleeAttack;
  magicDefense += constitution * statWeights.constitution.magicDefense;
  meleeDefense += constitution * statWeights.constitution.meleeDefense;
  magicEvasion += constitution * statWeights.constitution.magicEvasion;
  meleeEvasion += constitution * statWeights.constitution.meleeEvasion;

  // Initialize total speed with base speed
  let totalSpeed = speed; // From playerBaseStats.speed

  // 3) Add contributions from equipped weapon & armor
  // a) Weapon
  if (playerEquippedItems.weapon) {
    const equippedWeapon = weaponItems.find(
      (w) => w.name === playerEquippedItems.weapon
    );
    if (equippedWeapon) {
      health += equippedWeapon.health;
      mana += equippedWeapon.mana;
      magicAttack += equippedWeapon.magicAttack;
      meleeAttack += equippedWeapon.meleeAttack;
      magicDefense += equippedWeapon.magicDefense;
      meleeDefense += equippedWeapon.meleeDefense;
      magicEvasion += equippedWeapon.magicEvasion;
      meleeEvasion += equippedWeapon.meleeEvasion;
      totalSpeed += equippedWeapon.speed; // Add weapon speed modifier
    }
  }

  // b) Armor pieces
  const armorSlots = ["head", "chest", "shoulders", "legs", "feet"];
  armorSlots.forEach((slot) => {
    const armorItemName = playerEquippedItems[slot];
    if (armorItemName) {
      const equippedArmor = armorItems.find((a) => a.name === armorItemName);
      if (equippedArmor) {
        health += equippedArmor.health;
        mana += equippedArmor.mana;
        magicAttack += equippedArmor.magicAttack;
        meleeAttack += equippedArmor.meleeAttack;
        magicDefense += equippedArmor.magicDefense;
        meleeDefense += equippedArmor.meleeDefense;
        magicEvasion += equippedArmor.magicEvasion;
        meleeEvasion += equippedArmor.meleeEvasion;
        totalSpeed += equippedArmor.speed; // Add armor speed modifier
      }
    }
  });

  // 4) Return final compiled stats, including speed
  return {
    health,
    mana,
    magicAttack,
    meleeAttack,
    magicDefense,
    meleeDefense,
    magicEvasion,
    meleeEvasion,
    speed: totalSpeed, // Total player speed
  };
}

/**
 * Adds a small ±2 random variance to a base damage.
 */
function addRandomVariance(base) {
  // Random integer from -2 to +2
  const randomAdjustment = Math.floor(Math.random() * 5) - 2;
  return base + randomAdjustment;
}

/**
 * Calculate damage for a melee attack.
 */
export function calculateMeleeDamage(attackerStats, defenderStats) {
  const { meleeAttack } = attackerStats;
  const { meleeDefense } = defenderStats;
  const rawDamage = meleeAttack - (meleeDefense || 0);

  const withVariance = addRandomVariance(rawDamage);
  return Math.max(1, withVariance);
}

/**
 * Calculate damage for a magic attack, incorporating skill's magicAttack.
 */
export function calculateMagicDamage(attackerStats, defenderStats, skillMagicAttack = 0) {
  const { magicAttack } = attackerStats;
  const { magicDefense } = defenderStats;

  // Combine player's magicAttack with skill's magicAttack
  const totalMagicAttack = magicAttack + skillMagicAttack;

  const rawDamage = totalMagicAttack - (magicDefense || 0);
  const withVariance = addRandomVariance(rawDamage);
  return Math.max(1, withVariance);
}
