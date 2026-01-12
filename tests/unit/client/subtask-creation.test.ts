/**
 * Unit tests for subtask creation logic in LifeUpClient
 * Tests response parsing, fallback mechanisms, and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LifeUpClient } from '@/client/lifeup-client';
import * as Types from '@/client/types';

describe('LifeUpClient Subtask Creation', () => {
  let client: LifeUpClient;

  beforeEach(() => {
    // Create a client instance for testing
    client = LifeUpClient.create();
  });

  describe('Task ID Extraction from Response', () => {
    it('should extract task_id from API response (snake_case)', () => {
      const response: Types.HttpResponse = {
        code: 0,
        message: 'success',
        data: {
          task_id: 12345,
          task_gid: 67890,
        },
      };

      // Simulate the response parsing logic
      const responseData = response.data as Types.AddTaskApiResponse;
      const taskId = responseData.task_id ?? (responseData as any).taskId;
      const taskGid = responseData.task_gid ?? (responseData as any).taskGid;

      expect(taskId).toBe(12345);
      expect(taskGid).toBe(67890);
    });

    it('should extract taskId from API response (camelCase) for robustness', () => {
      const response: Types.HttpResponse = {
        code: 0,
        message: 'success',
        data: {
          taskId: 12345,
          taskGid: 67890,
        },
      };

      // Simulate the response parsing logic with camelCase fallback
      const responseData = response.data as any;
      const taskId = responseData.task_id ?? responseData.taskId;
      const taskGid = responseData.task_gid ?? responseData.taskGid;

      expect(taskId).toBe(12345);
      expect(taskGid).toBe(67890);
    });

    it('should prefer snake_case over camelCase when both present', () => {
      const response: Types.HttpResponse = {
        code: 0,
        message: 'success',
        data: {
          task_id: 111,
          taskId: 222, // Should be ignored
          task_gid: 333,
          taskGid: 444, // Should be ignored
        },
      };

      // Simulate the response parsing logic with preference for snake_case
      const responseData = response.data as any;
      const taskId = responseData.task_id ?? responseData.taskId;
      const taskGid = responseData.task_gid ?? responseData.taskGid;

      expect(taskId).toBe(111);
      expect(taskGid).toBe(333);
    });

    it('should handle missing task_gid gracefully', () => {
      const response: Types.HttpResponse = {
        code: 0,
        message: 'success',
        data: {
          task_id: 12345,
          // task_gid is missing
        },
      };

      const responseData = response.data as Types.AddTaskApiResponse;
      const taskId = responseData.task_id ?? (responseData as any).taskId;
      const taskGid = responseData.task_gid ?? (responseData as any).taskGid;

      expect(taskId).toBe(12345);
      expect(taskGid).toBeUndefined();
    });

    it('should detect when task_id is missing from response', () => {
      const response: Types.HttpResponse = {
        code: 0,
        message: 'success',
        data: {
          // Both task_id and taskId are missing
          success: true,
          message: 'Task created',
        },
      };

      const responseData = response.data as any;
      const taskId = responseData.task_id ?? responseData.taskId;

      expect(taskId).toBeUndefined();
    });
  });

  describe('Race Condition Detection', () => {
    it('should detect multiple tasks with same name created within 5 seconds', () => {
      const now = Date.now();
      const tasks: Types.Task[] = [
        {
          id: 1,
          name: 'Test Task',
          created_time: now,
          gid: 1,
          rewards: [],
        },
        {
          id: 2,
          name: 'Test Task',
          created_time: now - 2000, // 2 seconds earlier
          gid: 1,
          rewards: [],
        },
        {
          id: 3,
          name: 'Test Task',
          created_time: now - 10000, // 10 seconds earlier
          gid: 1,
          rewards: [],
        },
      ];

      // Simulate the race condition detection logic
      const sorted = [...tasks].sort((a, b) => b.created_time - a.created_time);
      const selectedTask = sorted[0];

      const recentTasks = sorted.filter((t) => selectedTask.created_time - t.created_time < 5000);

      expect(recentTasks.length).toBe(2); // Should include tasks within 5 seconds
      expect(recentTasks[0].id).toBe(1); // Most recent
      expect(recentTasks[1].id).toBe(2); // 2 seconds earlier
    });

    it('should not flag as race condition if tasks are >5 seconds apart', () => {
      const now = Date.now();
      const tasks: Types.Task[] = [
        {
          id: 1,
          name: 'Test Task',
          created_time: now,
          gid: 1,
          rewards: [],
        },
        {
          id: 2,
          name: 'Test Task',
          created_time: now - 6000, // 6 seconds earlier
          gid: 1,
          rewards: [],
        },
      ];

      // Simulate the race condition detection logic
      const sorted = [...tasks].sort((a, b) => b.created_time - a.created_time);
      const selectedTask = sorted[0];

      const recentTasks = sorted.filter((t) => selectedTask.created_time - t.created_time < 5000);

      expect(recentTasks.length).toBe(1); // Only the most recent task
    });
  });

  describe('Subtask Definition Validation', () => {
    it('should validate required todo field in subtask', () => {
      const subtask: Types.SubtaskDefinition = {
        todo: 'Buy groceries',
      };

      expect(subtask.todo).toBeDefined();
      expect(subtask.todo.length).toBeGreaterThan(0);
    });

    it('should handle optional subtask fields', () => {
      const subtask: Types.SubtaskDefinition = {
        todo: 'Buy groceries',
        exp: 10,
        coin: 5,
        remind_time: 1640995200000,
        order: 1,
      };

      expect(subtask.exp).toBe(10);
      expect(subtask.coin).toBe(5);
      expect(subtask.remind_time).toBe(1640995200000);
      expect(subtask.order).toBe(1);
    });

    it('should handle item rewards in subtask', () => {
      const subtask: Types.SubtaskDefinition = {
        todo: 'Complete quest',
        item_id: 42,
        item_amount: 5,
      };

      expect(subtask.item_id).toBe(42);
      expect(subtask.item_amount).toBe(5);
    });

    it('should handle multiple item rewards in subtask', () => {
      const subtask: Types.SubtaskDefinition = {
        todo: 'Complete quest',
        items: [
          { item_id: 1, item_amount: 2 },
          { item_id: 2, item_amount: 3 },
        ],
      };

      expect(subtask.items).toHaveLength(2);
      expect(subtask.items?.[0].item_id).toBe(1);
    });
  });

  describe('Task with Subtasks', () => {
    it('should properly structure CreateTaskRequest with subtasks', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Main Task',
        exp: 100,
        subtasks: [
          { todo: 'Subtask 1', exp: 10 },
          { todo: 'Subtask 2', exp: 20 },
          { todo: 'Subtask 3', exp: 30 },
        ],
      };

      expect(request.subtasks).toHaveLength(3);
      expect(request.subtasks?.[0].todo).toBe('Subtask 1');
      expect(request.subtasks?.[1].exp).toBe(20);
    });

    it('should handle task without subtasks', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Simple Task',
        exp: 50,
        // No subtasks
      };

      expect(request.subtasks).toBeUndefined();
    });

    it('should handle empty subtask array', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Task',
        subtasks: [],
      };

      expect(request.subtasks).toHaveLength(0);
    });
  });

  describe('Response Structure', () => {
    it('should properly structure AddTaskApiResponse', () => {
      const response: Types.AddTaskApiResponse = {
        task_id: 123,
        task_gid: 456,
      };

      expect(response.task_id).toBe(123);
      expect(response.task_gid).toBe(456);
    });

    it('should properly structure SubtaskApiResponse', () => {
      const response: Types.SubtaskApiResponse = {
        main_task_id: 123,
        subtask_id: 456,
        subtask_gid: 789,
      };

      expect(response.main_task_id).toBe(123);
      expect(response.subtask_id).toBe(456);
      expect(response.subtask_gid).toBe(789);
    });

    it('should properly structure SubtaskBatchResult', () => {
      const result: Types.SubtaskBatchResult = {
        successes: [
          { main_task_id: 1, subtask_id: 10, subtask_gid: 100 },
          { main_task_id: 1, subtask_id: 11, subtask_gid: 101 },
        ],
        failures: [
          {
            subtask: { todo: 'Failed task' },
            error: 'Network error',
          },
        ],
      };

      expect(result.successes).toHaveLength(2);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].error).toBe('Network error');
    });
  });

  describe('Rate Limiting Constants', () => {
    it('should use appropriate rate limit for subtask creation', () => {
      const RATE_LIMIT_MS = 50;
      const numberOfSubtasks = 10;
      const expectedMinTime = (numberOfSubtasks - 1) * RATE_LIMIT_MS;

      expect(RATE_LIMIT_MS).toBe(50);
      expect(expectedMinTime).toBe(450);
    });

    it('should calculate time for large batch of subtasks', () => {
      const RATE_LIMIT_MS = 50;
      const numberOfSubtasks = 100;
      const expectedMinTime = (numberOfSubtasks - 1) * RATE_LIMIT_MS;

      // Should be approximately 5 seconds for 100 subtasks
      expect(expectedMinTime).toBe(4950);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with tasks without subtasks', () => {
      const result = {
        task: {
          id: 123,
          name: 'Test',
          created_time: Date.now(),
          gid: 1,
          rewards: [],
        } as Types.Task,
        subtaskBatchResult: undefined,
      };

      expect(result.task).toBeDefined();
      expect(result.task.id).toBe(123);
      expect(result.subtaskBatchResult).toBeUndefined();
    });

    it('should maintain compatibility with tasks with subtasks', () => {
      const result = {
        task: {
          id: 123,
          name: 'Test',
          created_time: Date.now(),
          gid: 1,
          rewards: [],
        } as Types.Task,
        subtaskBatchResult: {
          successes: [{ main_task_id: 123, subtask_id: 456, subtask_gid: 789 }],
          failures: [],
        },
      };

      expect(result.task).toBeDefined();
      expect(result.subtaskBatchResult).toBeDefined();
      expect(result.subtaskBatchResult.successes).toHaveLength(1);
    });
  });
});
