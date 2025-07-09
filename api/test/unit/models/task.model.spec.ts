import { Task } from '../../../lib/core/models/task.model';

describe('Task Model', () => {
  describe('constructor', () => {
    it('should create a task with all properties', () => {
      const now = new Date();
      const task = new Task({
        id: '123',
        content: 'Test task',
        projectId: 'project1',
        isCompleted: false,
        url: 'https://todoist.com/task/123',
        createdAt: now,
      });

      expect(task.id).toBe('123');
      expect(task.content).toBe('Test task');
      expect(task.projectId).toBe('project1');
      expect(task.isCompleted).toBe(false);
      expect(task.url).toBe('https://todoist.com/task/123');
      expect(task.createdAt).toBe(now);
    });

    it('should create a task with default values', () => {
      const task = new Task({
        id: '123',
        content: 'Test task',
      });

      expect(task.id).toBe('123');
      expect(task.content).toBe('Test task');
      expect(task.projectId).toBeNull();
      expect(task.isCompleted).toBe(false);
      expect(task.url).toBeNull();
      expect(task.createdAt).toBeInstanceOf(Date);
    });

    it('should create an immutable task object', () => {
      const task = new Task({
        id: '123',
        content: 'Test task',
      });

      // TypeScript should prevent direct property assignment
      // This is a runtime check to ensure immutability
      expect(() => {
        // @ts-expect-error - Testing immutability
        task.content = 'Modified content';
      }).toThrow();
    });
  });

  describe('isInInbox', () => {
    it('should return true when projectId is null', () => {
      const task = new Task({
        id: '123',
        content: 'Test task',
        projectId: null,
      });

      expect(task.isInInbox()).toBe(true);
    });

    it('should return false when projectId is set', () => {
      const task = new Task({
        id: '123',
        content: 'Test task',
        projectId: 'project1',
      });

      expect(task.isInInbox()).toBe(false);
    });
  });

  describe('withDeepLink', () => {
    it('should append View Task deeplink to content', () => {
      const task = new Task({
        id: '123',
        content: 'Test task',
        url: 'https://todoist.com/task/123',
      });

      const contentWithLink = task.withDeepLink();
      expect(contentWithLink).toBe(
        'Test task [View Task](https://todoist.com/task/123)',
      );
    });

    it('should handle tasks without a URL', () => {
      const task = new Task({
        id: '123',
        content: 'Test task',
        url: null,
      });

      const contentWithLink = task.withDeepLink();
      expect(contentWithLink).toBe('Test task');
    });
  });

  describe('createFrom', () => {
    it('should create a Task from a Todoist API response', () => {
      const todoistTask = {
        id: '123',
        content: 'Test task',
        project_id: 'project1',
        is_completed: false,
        url: 'https://todoist.com/task/123',
        created_at: '2023-01-01T12:00:00.000Z',
      };

      const task = Task.createFrom(todoistTask);

      expect(task.id).toBe('123');
      expect(task.content).toBe('Test task');
      expect(task.projectId).toBe('project1');
      expect(task.isCompleted).toBe(false);
      expect(task.url).toBe('https://todoist.com/task/123');
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.createdAt?.toISOString()).toBe('2023-01-01T12:00:00.000Z');
    });
  });
});
