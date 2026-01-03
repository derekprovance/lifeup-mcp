/**
 * Tests for achievement update warnings
 * Verifies that appropriate warnings are shown when updating achievement conditions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AchievementTools } from '@/tools/achievement-tools';
import * as lifeupClientModule from '@/client/lifeup-client';
import * as configModule from '@/config/config';

// Mock the modules
vi.mock('@/client/lifeup-client', () => {
  const mockClient = {
    healthCheck: vi.fn().mockResolvedValue({ code: 200 }),
    getAchievements: vi.fn(),
    getAchievementCategories: vi.fn(),
    createAchievement: vi.fn(),
    updateAchievement: vi.fn(),
    deleteAchievement: vi.fn(),
  };
  return { lifeupClient: mockClient };
});

vi.mock('@/config/config', () => {
  const mockConfig = {
    getConfig: vi.fn(() => ({ debug: false })),
    logIfDebug: vi.fn(),
  };
  return { configManager: mockConfig };
});

// Mock tool helpers to avoid API call
vi.mock('@/tools/tool-helpers', () => {
  return {
    ensureServerHealthy: vi.fn().mockResolvedValue(undefined),
    handleToolError: vi.fn((error) => {
      if (error instanceof Error) {
        return `Error: ${error.message}`;
      }
      return 'Error occurred';
    }),
  };
});

describe('AchievementTools.updateAchievement with conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock a successful response
    const mockClient = lifeupClientModule.lifeupClient as any;
    mockClient.updateAchievement.mockResolvedValue({
      code: 200,
      message: 'success',
      data: 'success',
    });
  });

  describe('warning inclusion', () => {
    it('should include warning when updating conditions_json', async () => {
      const input = {
        edit_id: 109,
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('Important Notice About Conditions');
      expect(result).toContain('may not support updating conditions');
      expect(result).toContain('verify in your LifeUp app');
      expect(result).toContain('workaround');
    });

    it('should NOT include warning when updating other properties only', async () => {
      const input = {
        edit_id: 109,
        name: 'Updated Name',
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).not.toContain('Important Notice About Conditions');
    });

    it('should NOT include warning when updating with empty conditions_json', async () => {
      const input = {
        edit_id: 109,
        name: 'Updated Name',
        conditions_json: [],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).not.toContain('Important Notice About Conditions');
    });

    it('should include condition details in warning', async () => {
      const input = {
        edit_id: 109,
        conditions_json: [
          { type: 0, target: 1, related_id: 208 },
          { type: 7, target: 1000, related_id: undefined },
        ],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('Complete specific task');
      expect(result).toContain('Reach coin amount');
      expect(result).toContain('ID: 208');
      expect(result).toContain('Target: 1000');
    });

    it('should include workaround suggestions in warning', async () => {
      const input = {
        edit_id: 109,
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('delete_achievement');
      expect(result).toContain('create_achievement');
      expect(result).toContain('achievement #109');
    });
  });

  describe('condition type descriptions', () => {
    it('should describe condition type 0 correctly', async () => {
      const input = {
        edit_id: 1,
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('Complete specific task');
    });

    it('should describe condition type 7 correctly', async () => {
      const input = {
        edit_id: 1,
        conditions_json: [{ type: 7, target: 1000000 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('Reach coin amount');
    });

    it('should describe condition type 13 correctly', async () => {
      const input = {
        edit_id: 1,
        conditions_json: [{ type: 13, target: 5, related_id: 1 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('Skill level');
    });

    it('should reject invalid condition types in validation', async () => {
      // The validation schema rejects types > 20, so this is an expected rejection
      const input = {
        edit_id: 1,
        conditions_json: [{ type: 999, target: 100 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      // Validation should fail, not get to the API call
      expect(result).toContain('Error');
    });
  });

  describe('success response structure', () => {
    it('should still show success message with conditions warning', async () => {
      const input = {
        edit_id: 109,
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('✓ Achievement updated successfully');
      expect(result).toContain('109'); // Achievement ID appears somewhere
      expect(result).toContain('unlock conditions');
      expect(result).toContain('Important Notice About Conditions');
    });

    it('should include all updated properties in success message', async () => {
      const input = {
        edit_id: 109,
        name: 'New Name',
        desc: 'New Description',
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
        exp: 100,
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('✓ Achievement updated successfully');
      expect(result).toContain('name to "New Name"');
      expect(result).toContain('description');
      expect(result).toContain('unlock conditions');
      expect(result).toContain('experience reward');
    });
  });

  describe('multiple conditions', () => {
    it('should list all conditions in warning', async () => {
      const input = {
        edit_id: 109,
        conditions_json: [
          { type: 0, target: 1, related_id: 208 },
          { type: 7, target: 1000000 },
          { type: 13, target: 10, related_id: 5 },
        ],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('1. Complete specific task');
      expect(result).toContain('2. Reach coin amount');
      expect(result).toContain('3. Skill level');
    });

    it('should show condition count in warning', async () => {
      const input = {
        edit_id: 109,
        conditions_json: [
          { type: 0, target: 1, related_id: 208 },
          { type: 7, target: 1000000 },
        ],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('Conditions you requested');
      // Verify 2 conditions are listed by checking for the condition descriptions
      expect(result).toContain('1. Complete specific task');
      expect(result).toContain('2. Reach coin amount');
    });
  });
});
