export function calculateLevelProgress(totalExp, options = {}) {
  const maxLevel = Number.isFinite(options.maxLevel) ? options.maxLevel : 50;
  const baseExp = Number.isFinite(options.baseExp) ? options.baseExp : 100;
  const growthMultiplier =
    Number.isFinite(options.growthMultiplier) ? options.growthMultiplier : 1.5;

  let level = 1;
  let expForNextLevel = baseExp;
  let accumulatedExp = 0;

  while (totalExp >= accumulatedExp + expForNextLevel && level < maxLevel) {
    accumulatedExp += expForNextLevel;
    level += 1;
    expForNextLevel = Math.floor(expForNextLevel * growthMultiplier);
  }

  const currentExp = totalExp - accumulatedExp;
  const nextLevelExp = expForNextLevel;

  return {
    level,
    currentExp,
    nextLevelExp,
    accumulatedExp,
  };
}
