// File: helpers/calculateCreationStats.js
import { playerBaseStats, statWeights } from "../data/MOCKdata.js";

export function calculateCreationStats(addedPoints) {
  // Start from base stats
  let {
    health,
    mana,
    intellect,
    strength,
    dexterity,
    constitution,
    speed
  } = playerBaseStats;

  // Add the newly allocated points
  intellect += addedPoints.intellect;
  strength += addedPoints.strength;
  dexterity += addedPoints.dexterity;
  constitution += addedPoints.constitution;

  // Derive additional stats from statWeights
  let magicAttack = 0;
  let meleeAttack = 0;
  let magicDefense = 0;
  let meleeDefense = 0;
  let magicEvasion = 0;
  let meleeEvasion = 0;

  for (const stat in statWeights) {
    const weight = statWeights[stat];
    const statValue = eval(stat); // e.g. if stat==="intellect" => statValue=intellect
    magicAttack   += statValue * weight.magicAttack;
    meleeAttack   += statValue * weight.meleeAttack;
    magicDefense  += statValue * weight.magicDefense;
    meleeDefense  += statValue * weight.meleeDefense;
    magicEvasion  += statValue * weight.magicEvasion;
    meleeEvasion  += statValue * weight.meleeEvasion;
  }

  // Speed is base speed + any increments from (for example) dex or something
  let totalSpeed = speed; // simplified assumption, or you can incorporate dex logic, etc.

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
