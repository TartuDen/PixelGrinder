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
  // Start with base stats
  let { health, mana, intellect, strength, dexterity, constitution, speed } =
    playerBaseStats;

  // Initialize derived stats
  let magicAttack = 0;
  let meleeAttack = 0;
  let magicDefense = 0;
  let meleeDefense = 0;
  let magicEvasion = 0;
  let meleeEvasion = 0;

  // Apply stat weights
  for (const stat in statWeights) {
    const weight = statWeights[stat];
    const statValue = eval(stat); // e.g., intellect, strength

    magicAttack += statValue * weight.magicAttack;
    meleeAttack += statValue * weight.meleeAttack;
    magicDefense += statValue * weight.magicDefense;
    meleeDefense += statValue * weight.meleeDefense;
    magicEvasion += statValue * weight.magicEvasion;
    meleeEvasion += statValue * weight.meleeEvasion;
  }

  // Initialize total speed
  let totalSpeed = speed;

  // Add equipment contributions
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
      totalSpeed += equippedWeapon.speed;
    }
  }

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
        totalSpeed += equippedArmor.speed;
      }
    }
  });

  // Return final stats
  return {
    health,
    mana,
    magicAttack,
    meleeAttack,
    magicDefense,
    meleeDefense,
    magicEvasion,
    meleeEvasion,
    speed: totalSpeed,
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
export function calculateMagicDamage(
  attackerStats,
  defenderStats,
  skillMagicAttack = 0
) {
  const { magicAttack } = attackerStats;
  const { magicDefense } = defenderStats;

  // Combine player's magicAttack with skill's magicAttack
  const totalMagicAttack = magicAttack + skillMagicAttack;

  const rawDamage = totalMagicAttack - (magicDefense || 0);
  const withVariance = addRandomVariance(rawDamage);
  return Math.max(1, withVariance);
}
