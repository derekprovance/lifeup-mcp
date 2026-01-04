/**
 * Tests for achievement update with delete + recreate for conditions
 * Verifies that updating conditions triggers recreation with new conditions
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

// Mock tool helpers
vi.mock('@/tools/tool-helpers', () => {
  return {
    ensureServerHealthy: vi.fn().mockResolvedValue(undefined),
    handleToolError: vi.fn((error) => {
      if (error instanceof Error) {
        return `❌ ${error.message}`;
      }
      return '❌ Error occurred';
    }),
  };
});

describe('AchievementTools.updateAchievement - Delete + Recreate for Conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock a successful delete + create response
    const mockClient = lifeupClientModule.lifeupClient as any;
    mockClient.deleteAchievement.mockResolvedValue({
      code: 200,
      message: 'success',
      data: 'success',
    });
    mockClient.updateAchievement.mockResolvedValue({
      code: 200,
      message: 'success',
      data: 'success',
    });
  });

  describe('recreate behavior when conditions provided', () => {
    it('should recreate achievement when conditions_json is provided', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.getAchievements.mockResolvedValue([
        {
          id: 109,
          name: 'Test Achievement',
          category_id: 1,
          description: 'Test desc',
          exp: 50,
          coin: 100,
        },
      ]);
      mockClient.createAchievement.mockResolvedValue({
        code: 200,
        message: 'success',
        data: { id: 110 },
      });

      const input = {
        edit_id: 109,
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('Achievement recreated with new conditions');
      expect(result).toContain('109 (deleted)');
      expect(result).toContain('110');
      expect(mockClient.deleteAchievement).toHaveBeenCalledWith({ edit_id: 109 });
      expect(mockClient.createAchievement).toHaveBeenCalled();
    });

    it('should use normal update when no conditions provided', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;

      const input = {
        edit_id: 109,
        name: 'Updated Name',
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('✓ Achievement updated successfully');
      expect(result).not.toContain('recreated');
      expect(mockClient.deleteAchievement).not.toHaveBeenCalled();
      expect(mockClient.createAchievement).not.toHaveBeenCalled();
      expect(mockClient.updateAchievement).toHaveBeenCalledWith(input);
    });

    it('should use normal update when conditions_json is empty array', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;

      const input = {
        edit_id: 109,
        name: 'Updated Name',
        conditions_json: [],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('✓ Achievement updated successfully');
      expect(result).not.toContain('recreated');
      expect(mockClient.deleteAchievement).not.toHaveBeenCalled();
      expect(mockClient.createAchievement).not.toHaveBeenCalled();
    });
  });

  describe('property merging during recreation', () => {
    it('should merge update properties with original properties', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.getAchievements.mockResolvedValue([
        {
          id: 109,
          name: 'Original Name',
          category_id: 1,
          description: 'Original desc',
          exp: 50,
          coin: 100,
          color: '#FF0000',
          secret: true,
        },
      ]);
      mockClient.createAchievement.mockResolvedValue({ code: 200, data: { id: 110 } });

      const input = {
        edit_id: 109,
        name: 'New Name', // Override name
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
        // exp and coin should be kept from original
      };

      await AchievementTools.updateAchievement(input);

      const createCall = mockClient.createAchievement.mock.calls[0][0];
      expect(createCall.name).toBe('New Name'); // Overridden
      expect(createCall.exp).toBe(50); // From original
      expect(createCall.coin).toBe(100); // From original
      expect(createCall.color).toBe('#FF0000'); // From original
      expect(createCall.secret).toBe(true); // From original
      expect(createCall.conditions_json).toEqual([{ type: 0, target: 1, related_id: 208 }]);
    });

    it('should override rewards when provided in update request', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.getAchievements.mockResolvedValue([
        {
          id: 109,
          name: 'Test Achievement',
          category_id: 1,
          description: 'Test desc',
          exp: 50,
          coin: 100,
        },
      ]);
      mockClient.createAchievement.mockResolvedValue({ code: 200, data: { id: 110 } });

      const input = {
        edit_id: 109,
        exp: 200, // Override exp
        coin: 300, // Override coin
        skills: [1], // Required when exp is provided
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      await AchievementTools.updateAchievement(input);

      const createCall = mockClient.createAchievement.mock.calls[0][0];
      expect(createCall.exp).toBe(200); // Overridden
      expect(createCall.coin).toBe(300); // Overridden
    });

    it('should preserve category when not overridden', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.getAchievements.mockResolvedValue([
        {
          id: 109,
          name: 'Test Achievement',
          category_id: 5,
          description: 'Test desc',
        },
      ]);
      mockClient.createAchievement.mockResolvedValue({ code: 200, data: { id: 110 } });

      const input = {
        edit_id: 109,
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      await AchievementTools.updateAchievement(input);

      const createCall = mockClient.createAchievement.mock.calls[0][0];
      expect(createCall.category_id).toBe(5); // From original
    });

    it('should create as locked even if original was unlocked', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.getAchievements.mockResolvedValue([
        {
          id: 109,
          name: 'Test Achievement',
          category_id: 1,
          description: 'Test desc',
          unlocked: true, // Originally unlocked
        },
      ]);
      mockClient.createAchievement.mockResolvedValue({ code: 200, data: { id: 110 } });

      const input = {
        edit_id: 109,
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      await AchievementTools.updateAchievement(input);

      const createCall = mockClient.createAchievement.mock.calls[0][0];
      expect(createCall.unlocked).toBe(false); // Always created as locked
    });
  });

  describe('success response format', () => {
    it('should show recreated message with IDs', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.getAchievements.mockResolvedValue([
        { id: 109, name: 'Test', category_id: 1, description: 'Test' },
      ]);
      mockClient.createAchievement.mockResolvedValue({ code: 200, data: { id: 110 } });

      const input = {
        edit_id: 109,
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('✓ Achievement recreated with new conditions');
      expect(result).toContain('109 (deleted)');
      expect(result).toContain('110');
      expect(result).toContain('1 condition(s)');
      expect(result).toContain('Unlock history was reset');
    });

    it('should include name in response', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.getAchievements.mockResolvedValue([
        { id: 109, name: 'My Achievement', category_id: 1, description: 'Test' },
      ]);
      mockClient.createAchievement.mockResolvedValue({ code: 200, data: { id: 110 } });

      const input = {
        edit_id: 109,
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('My Achievement');
    });

    it('should show multiple conditions count', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.getAchievements.mockResolvedValue([
        { id: 109, name: 'Test', category_id: 1, description: 'Test' },
      ]);
      mockClient.createAchievement.mockResolvedValue({ code: 200, data: { id: 110 } });

      const input = {
        edit_id: 109,
        conditions_json: [
          { type: 0, target: 1, related_id: 208 },
          { type: 7, target: 1000000 },
          { type: 13, target: 10, related_id: 5 },
        ],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('3 condition(s)');
    });
  });

  describe('error handling', () => {
    it('should handle achievement not found error', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.getAchievements.mockResolvedValue([
        { id: 999, name: 'Different Achievement', category_id: 1, description: 'Test' },
      ]);

      const input = {
        edit_id: 109, // Not in the list
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('❌');
      expect(result).toContain('Achievement #109 not found');
      expect(mockClient.deleteAchievement).not.toHaveBeenCalled();
      expect(mockClient.createAchievement).not.toHaveBeenCalled();
    });

    it('should handle getAchievements returning null', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.getAchievements.mockResolvedValue(null);

      const input = {
        edit_id: 109,
        conditions_json: [{ type: 0, target: 1, related_id: 208 }],
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('❌');
      expect(result).toContain('Achievement #109 not found');
    });
  });

  describe('normal updates without conditions', () => {
    it('should not recreate when only updating name', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.updateAchievement.mockResolvedValue({ code: 200 });

      const input = {
        edit_id: 109,
        name: 'New Name',
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(mockClient.getAchievements).not.toHaveBeenCalled();
      expect(mockClient.deleteAchievement).not.toHaveBeenCalled();
      expect(mockClient.createAchievement).not.toHaveBeenCalled();
      expect(mockClient.updateAchievement).toHaveBeenCalledWith(input);
    });

    it('should handle normal update response format', async () => {
      const mockClient = lifeupClientModule.lifeupClient as any;
      mockClient.updateAchievement.mockResolvedValue({ code: 200 });

      const input = {
        edit_id: 109,
        exp: 200,
        skills: [1], // Required when exp is provided
      };

      const result = await AchievementTools.updateAchievement(input);

      expect(result).toContain('✓ Achievement updated successfully');
      expect(result).toContain('109');
      expect(result).toContain('experience reward');
    });
  });
});
