// helpers/calculatePlayerStats.js

import {
  playerBaseStats,
  statWeights,
  playerEquippedItems,
  itemsMap,         // <-- Use itemsMap for all item lookups
} from "../data/MOCKdata.js";

/**
 * Returns the player's final derived stats based on:
 *   (1) base stats + stat weights
 *   (2) ALL equipped items (weapon & armor), looked up by ID in itemsMap
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

  // 1) Apply stat weights
  for (const stat in statWeights) {
    const weight = statWeights[stat];
    // "eval" usage keeps your code style, but you could also map keys to values
    const statValue = eval(stat); // e.g. stat==='intellect' => statValue = intellect

    magicAttack += statValue * weight.magicAttack;
    meleeAttack += statValue * weight.meleeAttack;
    magicDefense += statValue * weight.magicDefense;
    meleeDefense += statValue * weight.meleeDefense;
    magicEvasion += statValue * weight.magicEvasion;
    meleeEvasion += statValue * weight.meleeEvasion;
  }

  // We'll accumulate total speed separately from the base "speed".
  let totalSpeed = speed;

  // 2) Add equipment contributions
  //    We assume that playerEquippedItems has keys: "weapon", "head", "chest", "shoulders", "legs", "feet".
  for (const slot in playerEquippedItems) {
    const itemId = playerEquippedItems[slot];
    if (!itemId) continue; // Nothing equipped in this slot

    const equippedItem = itemsMap[itemId];
    if (!equippedItem) continue; // Shouldn't happen unless invalid ID

    health        += equippedItem.health        || 0;
    mana          += equippedItem.mana          || 0;
    magicAttack   += equippedItem.magicAttack   || 0;
    meleeAttack   += equippedItem.meleeAttack   || 0;
    magicDefense  += equippedItem.magicDefense  || 0;
    meleeDefense  += equippedItem.meleeDefense  || 0;
    magicEvasion  += equippedItem.magicEvasion  || 0;
    meleeEvasion  += equippedItem.meleeEvasion  || 0;
    totalSpeed    += equippedItem.speed         || 0;
  }

  // 3) Return final stats
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
