import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shouldBeUrgent, updateTaskUrgency, updateTasksUrgency } from '../taskUrgency'
import type { Task } from '../share_type'

describe('taskUrgency', () => {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
  let currentTime: number

  beforeEach(() => {
    currentTime = Date.now()
    vi.useFakeTimers()
    vi.setSystemTime(currentTime)
  })

  describe('shouldBeUrgent', () => {
    it('应该在剩余时间小于24小时时返回true', () => {
      const task: Task = {
        id: 1,
        name: '测试任务',
        estimatedTime: 60,
        deadline: currentTime + 12 * 60 * 60 * 1000, // 12小时后
        completed: false,
        cycleList: [],
        progress: 0,
        time_up: false,
        longCycle: false,
        urgent: false,
        important: false,
      }

      expect(shouldBeUrgent(task)).toBe(true)
    })

    it('应该在剩余时间大于24小时时返回false', () => {
      const task: Task = {
        id: 1,
        name: '测试任务',
        estimatedTime: 60,
        deadline: currentTime + 48 * 60 * 60 * 1000, // 48小时后
        completed: false,
        cycleList: [],
        progress: 0,
        time_up: false,
        longCycle: false,
        urgent: false,
        important: false,
      }

      expect(shouldBeUrgent(task)).toBe(false)
    })

    it('应该在任务没有截止时间时返回false', () => {
      const task: Task = {
        id: 1,
        name: '测试任务',
        estimatedTime: 60,
        deadline: null,
        completed: false,
        cycleList: [],
        progress: 0,
        time_up: false,
        longCycle: false,
        urgent: false,
        important: false,
      }

      expect(shouldBeUrgent(task)).toBe(false)
    })

    it('应该在任务已完成时返回false', () => {
      const task: Task = {
        id: 1,
        name: '测试任务',
        estimatedTime: 60,
        deadline: currentTime + 12 * 60 * 60 * 1000, // 12小时后
        completed: true,
        cycleList: [],
        progress: 0,
        time_up: false,
        longCycle: false,
        urgent: false,
        important: false,
      }

      expect(shouldBeUrgent(task)).toBe(false)
    })

    it('应该在任务已超时时返回true（负数剩余时间）', () => {
      const task: Task = {
        id: 1,
        name: '测试任务',
        estimatedTime: 60,
        deadline: currentTime - 12 * 60 * 60 * 1000, // 12小时前
        completed: false,
        cycleList: [],
        progress: 0,
        time_up: false,
        longCycle: false,
        urgent: false,
        important: false,
      }

      expect(shouldBeUrgent(task)).toBe(true)
    })

    it('应该在剩余时间正好是24小时时返回false', () => {
      const task: Task = {
        id: 1,
        name: '测试任务',
        estimatedTime: 60,
        deadline: currentTime + TWENTY_FOUR_HOURS,
        completed: false,
        cycleList: [],
        progress: 0,
        time_up: false,
        longCycle: false,
        urgent: false,
        important: false,
      }

      expect(shouldBeUrgent(task)).toBe(false)
    })
  })

  describe('updateTaskUrgency', () => {
    it('应该更新任务的紧急状态为true', () => {
      const task: Task = {
        id: 1,
        name: '测试任务',
        estimatedTime: 60,
        deadline: currentTime + 12 * 60 * 60 * 1000, // 12小时后
        completed: false,
        cycleList: [],
        progress: 0,
        time_up: false,
        longCycle: false,
        urgent: false,
        important: false,
      }

      const updatedTask = updateTaskUrgency(task)
      expect(updatedTask.urgent).toBe(true)
    })

    it('应该更新任务的紧急状态为false', () => {
      const task: Task = {
        id: 1,
        name: '测试任务',
        estimatedTime: 60,
        deadline: currentTime + 48 * 60 * 60 * 1000, // 48小时后
        completed: false,
        cycleList: [],
        progress: 0,
        time_up: false,
        longCycle: false,
        urgent: true,
        important: false,
      }

      const updatedTask = updateTaskUrgency(task)
      expect(updatedTask.urgent).toBe(false)
    })

    it('应该保持任务的其他属性不变', () => {
      const task: Task = {
        id: 1,
        name: '测试任务',
        estimatedTime: 60,
        deadline: currentTime + 12 * 60 * 60 * 1000, // 12小时后
        completed: false,
        cycleList: [[25, 'focus']],
        progress: 50,
        time_up: false,
        longCycle: false,
        urgent: false,
        important: true,
      }

      const updatedTask = updateTaskUrgency(task)
      expect(updatedTask.id).toBe(task.id)
      expect(updatedTask.name).toBe(task.name)
      expect(updatedTask.important).toBe(task.important)
      expect(updatedTask.progress).toBe(task.progress)
    })
  })

  describe('updateTasksUrgency', () => {
    it('应该批量更新多个任务的紧急状态', () => {
      const tasks: Task[] = [
        {
          id: 1,
          name: '紧急任务',
          estimatedTime: 60,
          deadline: currentTime + 12 * 60 * 60 * 1000, // 12小时后
          completed: false,
          cycleList: [],
          progress: 0,
          time_up: false,
          longCycle: false,
          urgent: false,
          important: false,
        },
        {
          id: 2,
          name: '非紧急任务',
          estimatedTime: 60,
          deadline: currentTime + 48 * 60 * 60 * 1000, // 48小时后
          completed: false,
          cycleList: [],
          progress: 0,
          time_up: false,
          longCycle: false,
          urgent: true,
          important: false,
        },
        {
          id: 3,
          name: '无截止时间任务',
          estimatedTime: 60,
          deadline: null,
          completed: false,
          cycleList: [],
          progress: 0,
          time_up: false,
          longCycle: false,
          urgent: false,
          important: false,
        },
      ]

      const updatedTasks = updateTasksUrgency(tasks)
      expect(updatedTasks[0].urgent).toBe(true)
      expect(updatedTasks[1].urgent).toBe(false)
      expect(updatedTasks[2].urgent).toBe(false)
    })
  })
})
