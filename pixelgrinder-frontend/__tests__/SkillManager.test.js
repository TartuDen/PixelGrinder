// pixelgrinder-frontend/__tests__/SkillManager.test.js

import * as calculatePlayerStats from "../helpers/calculatePlayerStats.js";
import SkillManager from "../managers/SkillManager.js";
import { SKILL_RANGE_EXTENDER } from "../data/MOCKdata.js";

// Mock Phaser globally before importing SkillManager
global.Phaser = {
  Math: {
    Distance: {
      Between: jest.fn(),
    },
    FloatBetween: jest.fn(),
  },
  // Add other Phaser mocks if needed
};

describe("SkillManager", () => {
  let mockScene;
  let mockPlayerManager;
  let mockMobManager;
  let mockUIManager;
  let skillManager;
  let getPlayerStatsMock;

  beforeEach(() => {
    jest.useFakeTimers();

    // Reset Phaser mocks before each test
    Phaser.Math.Distance.Between.mockReset();
    Phaser.Math.FloatBetween.mockReset();

    // Mock PlayerManager
    mockPlayerManager = {
      player: { x: 100, y: 100 },
      // getPlayerStats should return the structure used in SkillManager:
      getPlayerStats: jest.fn(() => ({
        currentMana: 100,
        maxMana: 100,
        magicAttack: 10,
      })),
      currentHealth: 100,
      maxHealth: 100,
      currentMana: 100,
      maxMana: 100,
      updatePlayerStats: jest.fn(),
    };

    // Mock MobManager
    mockMobManager = {
      getStats: jest.fn(() => ({
        magicDefense: 5,
        magicEvasion: 10,
        active: true,
      })),
      applyDamageToMob: jest.fn(),
      cycleTarget: jest.fn(),
      highlightMob: jest.fn(),
      onMobClicked: jest.fn(),
    };

    // Mock UIManager
    mockUIManager = {
      showCastingProgress: jest.fn(),
      updateCastingProgress: jest.fn(),
      hideCastingProgress: jest.fn(),
      updateSkillCooldown: jest.fn(),
    };

    // Mock scene
    mockScene = {
      playerManager: mockPlayerManager,
      mobManager: mockMobManager,
      uiManager: mockUIManager,
      targetedMob: { x: 120, y: 120, active: true, customData: { id: 1 } },
      time: {
        addEvent: jest.fn((eventConfig) => {
          if (eventConfig.loop) {
            const interval = setInterval(() => {
              eventConfig.callback();
            }, eventConfig.delay);
            return {
              remove: () => clearInterval(interval),
            };
          } else {
            const timeout = setTimeout(() => {
              eventConfig.callback();
            }, eventConfig.delay);
            return {
              remove: () => clearTimeout(timeout),
            };
          }
        }),
        delayedCall: jest.fn((delay, callback) => {
          const timeout = setTimeout(callback, delay);
          return {
            remove: () => clearTimeout(timeout),
          };
        }),
      },
      // Mock calls used in SkillManager
      deductMana: jest.fn((amount) => {
        // Deduct from the player's actual currentMana
        mockPlayerManager.currentMana = Math.max(
          0,
          mockPlayerManager.currentMana - amount
        );
        // Then let getPlayerStats reflect that
        mockPlayerManager.getPlayerStats.mockReturnValueOnce({
          currentMana: mockPlayerManager.currentMana,
          maxMana: mockPlayerManager.maxMana,
          magicAttack: 10,
        });
      }),
      emitStatsUpdate: jest.fn(), // <-- Add this so executeSkill doesn't throw
      // Example playerSkills
      playerSkills: [
        {
          id: 1,
          name: "magic_wip",
          manaCost: 5,
          range: 150,
          magicAttack: 2,
          meleeAttack: 0,
          castingTime: 0,
          cooldown: 2, // seconds
          icon: "icon_path",
          skillImage: "skill_image_path",
          animationSeq: [0, 7],
        },
        {
          id: 2,
          name: "fire_ball",
          manaCost: 10,
          range: 150,
          magicAttack: 3,
          meleeAttack: 0,
          castingTime: 1,
          cooldown: 2, // seconds
          icon: "icon_path",
          skillImage: "skill_image_path",
          animationSeq: [0, 7],
        },
      ],
      // Mock 'add' for skill animations
      add: {
        sprite: jest.fn().mockReturnValue({
          setScale: jest.fn().mockReturnThis(),
          play: jest.fn(),
          on: jest.fn(),
        }),
      },
      updateUI: jest.fn(),
    };

    // Spy on calculateMagicDamage and mock its return value
    jest.spyOn(calculatePlayerStats, "calculateMagicDamage").mockReturnValue(10);

    // Also mock calculateMeleeDamage if needed
    jest.spyOn(calculatePlayerStats, "calculateMeleeDamage").mockReturnValue(5);

    // Initialize getPlayerStatsMock (example usage, though we mostly rely on mockPlayerManager above)
    getPlayerStatsMock = jest.fn(() => ({
      currentMana: mockPlayerManager.currentMana,
      maxMana: mockPlayerManager.maxMana,
      magicAttack: 10,
    }));

    // Initialize SkillManager
    skillManager = new SkillManager(mockScene, getPlayerStatsMock);
    skillManager.preloadSkills();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.resetAllMocks();
  });

  test("should successfully use a skill when all conditions are met", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    // Mock Phaser.Math.Distance.Between to return a distance within range
    Phaser.Math.Distance.Between.mockReturnValue(100); // Within 150 range

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(true);
    // We called getPlayerStats() to check mana:
    expect(getPlayerStatsMock).toHaveBeenCalled();
    // Deduct mana
    expect(mockScene.deductMana).toHaveBeenCalledWith(skill.manaCost);
    // No casting time => no casting progress
    expect(mockScene.uiManager.showCastingProgress).not.toHaveBeenCalled();
    // Damage should be applied
    expect(mockMobManager.getStats).toHaveBeenCalledWith(mockScene.targetedMob);
    expect(calculatePlayerStats.calculateMagicDamage).toHaveBeenCalledWith(
      {
        currentMana: 95, // updated after deduction
        maxMana: 100,
        magicAttack: 10,
      },
      { magicDefense: 5, magicEvasion: 10, active: true },
      skill.magicAttack
    );
    expect(mockMobManager.applyDamageToMob).toHaveBeenCalledWith(
      mockScene.targetedMob,
      10
    );
    // Cooldown set
    expect(mockScene.uiManager.updateSkillCooldown).toHaveBeenCalledWith(
      skill.id,
      skill.cooldown
    );
    // Skill animation
    expect(mockScene.add.sprite).toHaveBeenCalledWith(
      mockScene.targetedMob.x,
      mockScene.targetedMob.y,
      `${skill.name}_anim`
    );
  });

  test("should not use a skill if it's on cooldown", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    // Manually set the skill on cooldown
    skillManager.cooldowns[skill.id] = 1;

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(false);
    expect(mockScene.uiManager.showCastingProgress).not.toHaveBeenCalled();
    expect(mockMobManager.applyDamageToMob).not.toHaveBeenCalled();
    expect(mockScene.deductMana).not.toHaveBeenCalled();
  });

  test("should not use a skill if there is not enough mana", () => {
    const skill = mockScene.playerSkills[1]; // fire_ball

    // Set player's current mana to less than skill's manaCost
    mockPlayerManager.currentMana = 5;
    // Update mock so getPlayerStats reflects new values
    mockPlayerManager.getPlayerStats.mockReturnValueOnce({
      currentMana: 5,
      maxMana: 100,
      magicAttack: 10,
    });

    // Distance within range
    Phaser.Math.Distance.Between.mockReturnValue(100);

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(false);
    expect(mockScene.uiManager.showCastingProgress).not.toHaveBeenCalled();
    expect(mockMobManager.getStats).not.toHaveBeenCalled();
    expect(mockMobManager.applyDamageToMob).not.toHaveBeenCalled();
    expect(mockScene.deductMana).not.toHaveBeenCalled();
  });

  test("should not use a skill if no target is selected", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    // Remove the target
    mockScene.targetedMob = null;

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(false);
    expect(mockScene.uiManager.showCastingProgress).not.toHaveBeenCalled();
    expect(mockMobManager.applyDamageToMob).not.toHaveBeenCalled();
    expect(mockScene.deductMana).not.toHaveBeenCalled();
  });

  test("should not use a skill if the target is out of range", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    Phaser.Math.Distance.Between.mockReturnValue(200); // Out of 150 range

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(false);
    expect(mockScene.uiManager.showCastingProgress).not.toHaveBeenCalled();
    expect(mockMobManager.applyDamageToMob).not.toHaveBeenCalled();
    expect(mockScene.deductMana).not.toHaveBeenCalled();
  });

  test("should handle skill with casting time correctly", () => {
    const skill = mockScene.playerSkills[1]; // fire_ball

    // Within range
    Phaser.Math.Distance.Between.mockReturnValue(100);

    // Start useSkill
    const result = skillManager.useSkill(skill);

    // We expect a cast to start
    expect(result.success).toBe(true);
    expect(mockScene.uiManager.showCastingProgress).toHaveBeenCalledWith(
      skill.name,
      skill.castingTime
    );
    expect(skillManager.isCasting).toBe(true);
    expect(skillManager.currentCastingSkill).toBe(skill);

    // Fast-forward the casting time
    jest.advanceTimersByTime(skill.castingTime * 1000);

    // Casting should be done now
    expect(skillManager.isCasting).toBe(false);
    expect(skillManager.currentCastingSkill).toBe(null);
    expect(mockScene.uiManager.hideCastingProgress).toHaveBeenCalled();

    // Mana deducted
    expect(mockScene.deductMana).toHaveBeenCalledWith(skill.manaCost);
    // Damage
    expect(mockMobManager.getStats).toHaveBeenCalledWith(mockScene.targetedMob);
    expect(calculatePlayerStats.calculateMagicDamage).toHaveBeenCalledWith(
      {
        currentMana: 90,
        maxMana: 100,
        magicAttack: 10,
      },
      { magicDefense: 5, magicEvasion: 10, active: true },
      skill.magicAttack
    );
    // Apply damage
    expect(mockMobManager.applyDamageToMob).toHaveBeenCalledWith(
      mockScene.targetedMob,
      10
    );
    // Cooldown
    expect(mockScene.uiManager.updateSkillCooldown).toHaveBeenCalledWith(
      skill.id,
      skill.cooldown
    );
    // Animation
    expect(mockScene.add.sprite).toHaveBeenCalledWith(
      mockScene.targetedMob.x,
      mockScene.targetedMob.y,
      `${skill.name}_anim`
    );
  });

  test("should cancel casting if target moves out of extended range during casting", () => {
    const skill = mockScene.playerSkills[1]; // fire_ball

    // Initially in range
    Phaser.Math.Distance.Between.mockReturnValue(100);
    const cancelSpy = jest.spyOn(skillManager, "cancelCasting");

    // Start cast
    const result = skillManager.useSkill(skill);
    expect(result.success).toBe(true);
    expect(skillManager.isCasting).toBe(true);

    // Now simulate target moving out of extended range (skill.range * 1.1)
    Phaser.Math.Distance.Between.mockReturnValue(9999); // definitely out of extended range

    // Let 100ms pass to trigger range check
    jest.advanceTimersByTime(100);

    expect(cancelSpy).toHaveBeenCalled();
    expect(skillManager.isCasting).toBe(false);
    expect(mockScene.uiManager.hideCastingProgress).toHaveBeenCalled();
    // No damage is applied
    expect(mockMobManager.applyDamageToMob).not.toHaveBeenCalled();
  });

  test("should enforce cooldown after skill use", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip
    Phaser.Math.Distance.Between.mockReturnValue(100);

    const result = skillManager.useSkill(skill);
    expect(result.success).toBe(true);

    // Cooldown is 2 seconds
    expect(skillManager.cooldowns[skill.id]).toBe(2);

    // Fast-forward 2 seconds
    jest.advanceTimersByTime(2000);

    expect(skillManager.cooldowns[skill.id]).toBe(0);
    // UI update when cooldown ends
    expect(mockScene.uiManager.updateSkillCooldown).toHaveBeenCalledWith(
      skill.id,
      0
    );
  });

  test("should deduct mana correctly when using a skill", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    // Initial mana = 100
    Phaser.Math.Distance.Between.mockReturnValue(100);

    const result = skillManager.useSkill(skill);
    expect(result.success).toBe(true);

    // DeductMana is called
    expect(mockScene.deductMana).toHaveBeenCalledWith(skill.manaCost);
    // Now currentMana should be 95
    expect(mockPlayerManager.currentMana).toBe(95);
    // Because we updated the mock to reflect that
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(2); 
  });

  test("should trigger skill animation upon successful execution", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    Phaser.Math.Distance.Between.mockReturnValue(100);
    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(true);
    // Check that an animation sprite was added
    expect(mockScene.add.sprite).toHaveBeenCalledWith(
      mockScene.targetedMob.x,
      mockScene.targetedMob.y,
      `${skill.name}_anim`
    );

    const lastCallIndex = mockScene.add.sprite.mock.calls.length - 1;
    const mockSkillSprite =
      mockScene.add.sprite.mock.results[lastCallIndex].value;

    expect(mockSkillSprite.setScale).toHaveBeenCalledWith(1);
    expect(mockSkillSprite.play).toHaveBeenCalledWith(`${skill.name}_anim`);
  });

  test("canUseSkill should return correct boolean", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    // Initially, skill is not on cooldown and not casting
    expect(skillManager.canUseSkill(skill)).toBe(true);

    // If skillManager is casting
    skillManager.isCasting = true;
    expect(skillManager.canUseSkill(skill)).toBe(false);
    skillManager.isCasting = false;

    // If skill is on cooldown
    skillManager.cooldowns[skill.id] = 1;
    expect(skillManager.canUseSkill(skill)).toBe(false);
    skillManager.cooldowns[skill.id] = 0;

    // If insufficient mana
    mockPlayerManager.currentMana = 4;
    getPlayerStatsMock.mockReturnValue({
      currentMana: 4,
      maxMana: 100,
      magicAttack: 10,
    });
    expect(skillManager.canUseSkill(skill)).toBe(false);
  });
});
