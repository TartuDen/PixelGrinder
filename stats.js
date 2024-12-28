/*******************************************************
 * stats.js
 * 
 * Handles:
 *   - XP/level calculations based on total XP
 *   - Derived stats (magic_dmg, melee_dmg, def, evasion)
 *******************************************************/

/*******************************************************
 * 1) XP/LEVELING CONSTANTS & FUNCTIONS
 *******************************************************/
const MAX_LEVEL = 50;

/**
 * getTotalExpNeededToBeLevel(L)
 * 
 * Returns the total cumulative XP required 
 * to *be* at level L.
 * 
 * For linear progression with each level i requiring
 * 100*i XP, the sum needed for L is:
 *   sum( 100 * i ) for i=1..(L-1)
 * = 100 * (1 + 2 + ... + (L - 1))
 * = 100 * ((L - 1) * L / 2)
 * 
 * If L=1, no XP is needed (0).
 */
function getTotalExpNeededToBeLevel(L) {
  if (L <= 1) return 0;
  return 100 * ((L - 1) * L) / 2;
}

/**
 * getLevelFromExperience(totalExp)
 * 
 * Given the player's total accumulated XP, 
 * determines:
 *   - The player's current level (capped at MAX_LEVEL)
 *   - leftoverXP (how many XP are "in" the current level 
 *     but not enough to reach the next level)
 * 
 * Returns an object: { level, leftoverXP }
 */
function getLevelFromExperience(totalExp) {
  // If totalExp < XP for level 2, player is level 1
  if (totalExp < getTotalExpNeededToBeLevel(2)) {
    return {
      level: 1,
      leftoverXP: totalExp
    };
  }

  // Otherwise, iterate from level 2 up to MAX_LEVEL
  for (let L = 2; L <= MAX_LEVEL; L++) {
    const xpNeededForL = getTotalExpNeededToBeLevel(L);
    const xpNeededForLPlus1 = getTotalExpNeededToBeLevel(L + 1);

    if (totalExp < xpNeededForLPlus1) {
      const leftover = totalExp - xpNeededForL;
      return {
        level: L,
        leftoverXP: leftover
      };
    }
  }

  // If totalExp exceeds what's needed for MAX_LEVEL,
  // we consider the player "maxed out."
  return {
    level: MAX_LEVEL,
    leftoverXP: 0
  };
}

/**
 * getExpForNextLevel(currentLevel)
 * 
 * Optional helper function:
 * Returns how many XP are needed to go from 
 * currentLevel to currentLevel + 1.
 * 
 * Example usage: for a UI that shows 
 * "XP to next level" if you already know the player's level.
 */
function getExpForNextLevel(currentLevel) {
  const xpForCurrentLevel = getTotalExpNeededToBeLevel(currentLevel);
  const xpForNextLevel = getTotalExpNeededToBeLevel(currentLevel + 1);
  return xpForNextLevel - xpForCurrentLevel;
}

/*******************************************************
 * 2) STAT-DERIVED FORMULAS
 *******************************************************/
/**
 * Arbitrary weights for how each attribute 
 * (INT, STR, DEX, CON) affects derived stats.
 */
const STAT_WEIGHTS = {
  INT: {
    magicDmg: 3,  // 1 INT => +3 magic dmg
    meleeDmg: 0,  
    def: 0,       
    evasion: 1    // 1 INT => +1 evasion
  },
  STR: {
    magicDmg: 0,
    meleeDmg: 3,  // 1 STR => +3 melee dmg
    def: 1,       // 1 STR => +1 defense
    evasion: 0
  },
  DEX: {
    magicDmg: 1,  // 1 DEX => +1 magic dmg
    meleeDmg: 1,  // 1 DEX => +1 melee dmg
    def: 0,
    evasion: 2    // 1 DEX => +2 evasion
  },
  CON: {
    magicDmg: 0,
    meleeDmg: 0,
    def: 3,       // 1 CON => +3 defense
    evasion: 0
  }
};

/**
 * getDerivedStats(player_basic_stats)
 * 
 * Calculates magic_dmg, melee_dmg, def, evasion
 * based on int_stat, str_stat, dex_stat, con_stat.
 * 
 * @param {Object} player_basic_stats
 *  { 
 *    int_stat, str_stat, dex_stat, con_stat,
 *    (other optional fields)
 *  }
 * 
 * @returns {Object} 
 *  {
 *    magic_dmg, melee_dmg, def, evasion
 *  }
 */
function getDerivedStats(player_basic_stats) {
  const { int_stat, str_stat, dex_stat, con_stat } = player_basic_stats;

  const magic_dmg = (
    int_stat * STAT_WEIGHTS.INT.magicDmg +
    dex_stat * STAT_WEIGHTS.DEX.magicDmg
  );
  const melee_dmg = (
    str_stat * STAT_WEIGHTS.STR.meleeDmg +
    dex_stat * STAT_WEIGHTS.DEX.meleeDmg
  );
  const def = (
    str_stat * STAT_WEIGHTS.STR.def +
    con_stat * STAT_WEIGHTS.CON.def
  );
  const evasion = (
    int_stat * STAT_WEIGHTS.INT.evasion +
    dex_stat * STAT_WEIGHTS.DEX.evasion
  );

  return {
    magic_dmg,
    melee_dmg,
    def,
    evasion
  };
}

/*******************************************************
 * 3) EXPORT FUNCTIONS
 *******************************************************/
export {
  MAX_LEVEL,
  getTotalExpNeededToBeLevel,
  getLevelFromExperience,
  getExpForNextLevel,
  getDerivedStats
};


  