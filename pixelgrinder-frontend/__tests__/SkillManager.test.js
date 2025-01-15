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
      getPlayerStats: jest.fn(() => ({
        mana: 100,
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
          if (!eventConfig.loop) {
            setTimeout(eventConfig.callback, eventConfig.delay);
          }
          return {
            remove: jest.fn(),
          };
        }),
        delayedCall: jest.fn((delay, callback) => {
          setTimeout(callback, delay);
          return {
            remove: jest.fn(),
          };
        }),
      },
      // Mock scene methods used in SkillManager
      deductMana: jest.fn((amount) => {
        mockPlayerManager.currentMana = Math.max(
          0,
          mockPlayerManager.currentMana - amount
        );
        // Mock the next call to getPlayerStats to reflect updated mana
        mockPlayerManager.getPlayerStats.mockReturnValueOnce({
          mana: mockPlayerManager.currentMana,
          magicAttack: 10,
        });
      }),
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
      // Mock the 'add' property with 'sprite' method including 'setScale'
      add: {
        sprite: jest.fn().mockReturnValue({
          setScale: jest.fn().mockReturnThis(), // Allow method chaining
          play: jest.fn(),
          on: jest.fn(),
        }),
      },
      // Mock 'updateUI' method
      updateUI: jest.fn(),
    };

    // Mock getPlayerStats callback
    getPlayerStatsMock = jest.fn(() => ({
      mana: mockPlayerManager.currentMana,
      magicAttack: 10,
    }));

    // Spy on calculateMagicDamage and mock its return value
    jest.spyOn(calculatePlayerStats, "calculateMagicDamage").mockReturnValue(10);

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
    expect(getPlayerStatsMock).toHaveBeenCalled();
    expect(mockScene.deductMana).toHaveBeenCalledWith(skill.manaCost);
    expect(mockScene.uiManager.showCastingProgress).not.toHaveBeenCalled(); // No casting time
    expect(mockMobManager.getStats).toHaveBeenCalledWith(mockScene.targetedMob);
    expect(calculatePlayerStats.calculateMagicDamage).toHaveBeenCalledWith(
      { mana: 100, magicAttack: 10 },
      { magicDefense: 5, magicEvasion: 10, active: true },
      2
    );
    expect(mockMobManager.applyDamageToMob).toHaveBeenCalledWith(
      mockScene.targetedMob,
      10
    );
    expect(mockScene.uiManager.updateSkillCooldown).toHaveBeenCalledWith(
      skill.id,
      skill.cooldown
    );
    expect(mockUIManager.updateCastingProgress).not.toHaveBeenCalled();
    // Ensure that the skill animation is triggered
    expect(skillManager.triggerSkillAnimation).toHaveBeenCalledWith(
      skill,
      mockPlayerManager.player,
      mockScene.targetedMob
    );
    // Ensure that 'add.sprite' was called correctly
    expect(mockScene.add.sprite).toHaveBeenCalledWith(
      mockScene.targetedMob.x,
      mockScene.targetedMob.y,
      `${skill.name}_anim`
    );
    // Ensure that setScale was called
    const mockSkillSprite = mockScene.add.sprite.mock.results[0].value;
    expect(mockSkillSprite.setScale).toHaveBeenCalledWith(1);
    // Ensure that play was called
    expect(mockSkillSprite.play).toHaveBeenCalledWith(`${skill.name}_anim`);
  });

  test("should not use a skill if it's on cooldown", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    // Manually set the skill on cooldown
    skillManager.cooldowns[skill.id] = 1;

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(false);
    expect(mockScene.uiManager.showCastingProgress).not.toHaveBeenCalled();
    expect(mockMobManager.getStats).not.toHaveBeenCalled();
    expect(mockMobManager.applyDamageToMob).not.toHaveBeenCalled();
    expect(mockScene.deductMana).not.toHaveBeenCalled();
  });

  test("should not use a skill if there is not enough mana", () => {
    const skill = mockScene.playerSkills[1]; // fire_ball

    // Set player's current mana to less than skill's manaCost
    mockPlayerManager.currentMana = 5;
    mockPlayerManager.getPlayerStats.mockReturnValueOnce({
      mana: 5,
      magicAttack: 10,
    });

    // Mock Phaser.Math.Distance.Between to return a distance within range
    Phaser.Math.Distance.Between.mockReturnValue(100); // Within 150 range

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
    expect(mockMobManager.getStats).not.toHaveBeenCalled();
    expect(mockMobManager.applyDamageToMob).not.toHaveBeenCalled();
    expect(mockScene.deductMana).not.toHaveBeenCalled();
  });

  test("should not use a skill if the target is out of range", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    // Mock Phaser.Math.Distance.Between to return a distance out of range
    Phaser.Math.Distance.Between.mockReturnValue(200); // Out of 150 range

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(false);
    expect(Phaser.Math.Distance.Between).toHaveBeenCalledWith(
      mockPlayerManager.player.x,
      mockPlayerManager.player.y,
      mockScene.targetedMob.x,
      mockScene.targetedMob.y
    );
    expect(mockScene.uiManager.showCastingProgress).not.toHaveBeenCalled();
    expect(mockMobManager.getStats).not.toHaveBeenCalled();
    expect(mockMobManager.applyDamageToMob).not.toHaveBeenCalled();
    expect(mockScene.deductMana).not.toHaveBeenCalled();
  });

  test("should handle skill with casting time correctly", () => {
    const skill = mockScene.playerSkills[1]; // fire_ball

    // Mock Phaser.Math.Distance.Between to return a distance within range
    Phaser.Math.Distance.Between.mockReturnValue(100); // Within 150 range

    // Mock Phaser.Math.FloatBetween to always return a value greater than magicEvasion to prevent evasion
    Phaser.Math.FloatBetween.mockReturnValue(50); // Assuming magicEvasion is 10%

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(true);
    expect(mockScene.uiManager.showCastingProgress).toHaveBeenCalledWith(
      skill.name,
      skill.castingTime
    );
    expect(skillManager.isCasting).toBe(true);
    expect(skillManager.currentCastingSkill).toBe(skill);

    // Fast-forward time to simulate casting time completion
    jest.advanceTimersByTime(skill.castingTime * 1000);

    // Ensure that casting is completed
    expect(skillManager.isCasting).toBe(false);
    expect(skillManager.currentCastingSkill).toBe(null);
    expect(mockScene.uiManager.updateCastingProgress).toHaveBeenCalled();
    expect(mockScene.uiManager.hideCastingProgress).toHaveBeenCalled();

    // Skill execution expectations
    expect(mockScene.deductMana).toHaveBeenCalledWith(skill.manaCost);
    expect(mockMobManager.getStats).toHaveBeenCalledWith(mockScene.targetedMob);
    expect(calculatePlayerStats.calculateMagicDamage).toHaveBeenCalledWith(
      { mana: 90, magicAttack: 10 }, // Mana deducted by 10
      { magicDefense: 5, magicEvasion: 10, active: true },
      3
    );
    expect(mockMobManager.applyDamageToMob).toHaveBeenCalledWith(
      mockScene.targetedMob,
      10
    );
    expect(mockScene.uiManager.updateSkillCooldown).toHaveBeenCalledWith(
      skill.id,
      skill.cooldown
    );
    // Ensure that the skill animation is triggered
    expect(skillManager.triggerSkillAnimation).toHaveBeenCalledWith(
      skill,
      mockPlayerManager.player,
      mockScene.targetedMob
    );
    // Ensure that 'add.sprite' was called correctly
    expect(mockScene.add.sprite).toHaveBeenCalledWith(
      mockScene.targetedMob.x,
      mockScene.targetedMob.y,
      `${skill.name}_anim`
    );
    // Ensure that setScale was called
    const mockSkillSprite = mockScene.add.sprite.mock.results[1].value;
    expect(mockSkillSprite.setScale).toHaveBeenCalledWith(1);
    // Ensure that play was called
    expect(mockSkillSprite.play).toHaveBeenCalledWith(`${skill.name}_anim`);
  });

  test("should cancel casting if target moves out of extended range during casting", () => {
    const skill = mockScene.playerSkills[1]; // fire_ball

    // Mock Phaser.Math.Distance.Between to initially be within range
    Phaser.Math.Distance.Between.mockReturnValue(100); // Within 150 range

    // Mock Phaser.Math.FloatBetween to always return a value greater than magicEvasion to prevent evasion
    Phaser.Math.FloatBetween.mockReturnValue(50); // Assuming magicEvasion is 10%

    const cancelMock = jest.spyOn(skillManager, "cancelCasting");

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(true);
    expect(skillManager.isCasting).toBe(true);

    // Mock the target moving out of extended range
    // Assuming SKILL_RANGE_EXTENDER is 1.1, extended range = 150 * 1.1 = 165
    // So set distance to 170
    Phaser.Math.Distance.Between.mockReturnValue(170);

    // Advance time to trigger the range check (assuming it's called every 100ms)
    jest.advanceTimersByTime(100);

    expect(cancelMock).toHaveBeenCalled();
    expect(skillManager.isCasting).toBe(false);
    expect(mockScene.uiManager.hideCastingProgress).toHaveBeenCalled();
    expect(mockMobManager.applyDamageToMob).not.toHaveBeenCalled();
  });

  test("should enforce cooldown after skill use", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    // Mock Phaser.Math.Distance.Between to return a distance within range
    Phaser.Math.Distance.Between.mockReturnValue(100); // Within 150 range

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(true);
    expect(skillManager.cooldowns[skill.id]).toBe(2);

    // Fast-forward time to end cooldown
    jest.advanceTimersByTime(2000);

    expect(skillManager.cooldowns[skill.id]).toBe(0);
    expect(mockScene.uiManager.updateSkillCooldown).toHaveBeenCalledWith(
      skill.id,
      0
    );
  });

  test("should deduct mana correctly when using a skill", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    // Initial mana
    const initialMana = mockPlayerManager.currentMana;

    // Mock Phaser.Math.Distance.Between to return a distance within range
    Phaser.Math.Distance.Between.mockReturnValue(100); // Within 150 range

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(true);
    expect(mockScene.deductMana).toHaveBeenCalledWith(skill.manaCost);
    expect(mockPlayerManager.currentMana).toBe(initialMana - skill.manaCost);
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(2); // Initial and after deduction
  });

  test("should trigger skill animation upon successful execution", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    // Mock triggerSkillAnimation
    skillManager.triggerSkillAnimation = jest.fn();

    // Mock Phaser.Math.Distance.Between to return a distance within range
    Phaser.Math.Distance.Between.mockReturnValue(100); // Within 150 range

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(true);
    expect(skillManager.triggerSkillAnimation).toHaveBeenCalledWith(
      skill,
      mockPlayerManager.player,
      mockScene.targetedMob
    );
    // Ensure that 'add.sprite' was called correctly
    expect(mockScene.add.sprite).toHaveBeenCalledWith(
      mockScene.targetedMob.x,
      mockScene.targetedMob.y,
      `${skill.name}_anim`
    );
    // Ensure that setScale was called
    const mockSkillSprite = mockScene.add.sprite.mock.results[2].value;
    expect(mockSkillSprite.setScale).toHaveBeenCalledWith(1);
    // Ensure that play was called
    expect(mockSkillSprite.play).toHaveBeenCalledWith(`${skill.name}_anim`);
  });

  test("canUseSkill should return correct boolean", () => {
    const skill = mockScene.playerSkills[0]; // magic_wip

    // Initially, skill can be used
    expect(skillManager.canUseSkill(skill)).toBe(true);

    // Set casting to true
    skillManager.isCasting = true;
    expect(skillManager.canUseSkill(skill)).toBe(false);
    skillManager.isCasting = false;

    // Set skill on cooldown
    skillManager.cooldowns[skill.id] = 1;
    expect(skillManager.canUseSkill(skill)).toBe(false);
    skillManager.cooldowns[skill.id] = 0;

    // Set insufficient mana
    mockPlayerManager.currentMana = 4;
    getPlayerStatsMock.mockReturnValueOnce({
      mana: 4,
      magicAttack: 10,
    });
    expect(skillManager.canUseSkill(skill)).toBe(false);
  });
});
