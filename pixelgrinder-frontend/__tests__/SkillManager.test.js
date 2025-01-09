// __tests__/SkillManager.test.js
import SkillManager from "../managers/SkillManager.js";
import { playerSkills } from "../data/MOCKdata.js";

describe("SkillManager", () => {
  let skillManager;
  let mockScene;

  beforeEach(() => {
    // Mock the Phaser Scene and its methods
    mockScene = {
      time: {
        delayedCall: jest.fn(),
      },
      deductMana: jest.fn(),
      mobManager: {
        getStats: jest.fn(),
        applyDamageToMob: jest.fn(),
      },
      targetedMob: {
        customData: {
          id: 'mob1', // Define the id to prevent undefined error
        },
        x: 100, // Mocked position
        y: 200,
      },
      uiManager: {
        updateSkillCooldown: jest.fn(),
      },
      updateUI: jest.fn(),
      add: {
        sprite: jest.fn(), // Mocked sprite method
      },
    };

    // Mock function to get player stats
    const mockGetPlayerStats = jest.fn(() => ({
      currentMana: 100,
      maxMana: 150,
      health: 100,
      magicAttack: 10,
      magicDefense: 5,
    }));

    skillManager = new SkillManager(mockScene, mockGetPlayerStats);
    skillManager.skills = playerSkills; // Assign skills directly

    // Ensure isCasting is false and cooldowns are empty
    skillManager.isCasting = false;
    skillManager.cooldowns = {};
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mock history after each test
  });

  test("uses a skill successfully when not casting and not on cooldown", () => {
    const skill = playerSkills[0]; // Example skill

    // Mock mobManager.getStats to return defenderStats
    mockScene.mobManager.getStats.mockReturnValue({
      magicDefense: 3,
      // Add other necessary defender stats if required
    });

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(true);
    expect(mockScene.deductMana).toHaveBeenCalledWith(skill.manaCost);
    expect(mockScene.mobManager.applyDamageToMob).toHaveBeenCalledWith(mockScene.targetedMob, expect.any(Number));
    expect(mockScene.uiManager.updateSkillCooldown).toHaveBeenCalledWith(skill.id, skill.cooldown);
    expect(mockScene.updateUI).toHaveBeenCalled();
    expect(mockScene.add.sprite).toHaveBeenCalledWith(
      mockScene.targetedMob.x,
      mockScene.targetedMob.y,
      `${skill.name}_anim`
    );
  });

  test("prevents using a skill when already casting", () => {
    // Set the isCasting flag to true
    skillManager.isCasting = true;
    const skill = playerSkills[0];

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(false);
    expect(mockScene.deductMana).not.toHaveBeenCalled();
    expect(mockScene.mobManager.applyDamageToMob).not.toHaveBeenCalled();
    expect(mockScene.uiManager.updateSkillCooldown).not.toHaveBeenCalled();
    expect(mockScene.updateUI).not.toHaveBeenCalled();
    expect(mockScene.add.sprite).not.toHaveBeenCalled();
  });

  test("prevents using a skill when on cooldown", () => {
    const skill = playerSkills[0];
    // Mock that the skill is on cooldown
    skillManager.cooldowns[skill.id] = 1; // Cooldown remaining: 1 second

    const result = skillManager.useSkill(skill);

    expect(result.success).toBe(false);
    expect(mockScene.deductMana).not.toHaveBeenCalled();
    expect(mockScene.mobManager.applyDamageToMob).not.toHaveBeenCalled();
    expect(mockScene.uiManager.updateSkillCooldown).not.toHaveBeenCalled();
    expect(mockScene.updateUI).not.toHaveBeenCalled();
    expect(mockScene.add.sprite).not.toHaveBeenCalled();
  });

  // Add more tests for casting time, insufficient mana, etc.
});
