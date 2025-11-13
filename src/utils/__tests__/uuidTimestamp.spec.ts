import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { generateUUID, createTask } from '../share_type'
import { useTasksStore } from '@/stores/tasksStore'
import type { Task } from '../share_type'

describe('UUID和Timestamp功能', () => {
  let tasksStore: ReturnType<typeof useTasksStore>
  let currentTime: number

  beforeEach(() => {
    // 设置Pinia环境
    const pinia = createPinia()
    setActivePinia(pinia)

    // 重置store
    tasksStore = useTasksStore()
    tasksStore.tasks = []
    currentTime = Date.now()
    vi.useFakeTimers()
    vi.setSystemTime(currentTime)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('generateUUID', () => {
    it('应该生成有效的UUID格式', () => {
      const uuid = generateUUID()

      // UUID v4格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(uuid).toMatch(uuidRegex)
    })

    it('应该生成唯一的UUID', () => {
      const uuid1 = generateUUID()
      const uuid2 = generateUUID()

      expect(uuid1).not.toBe(uuid2)
    })

    it('应该生成不同版本的UUID（版本4）', () => {
      const uuid = generateUUID()

      // 检查版本位（第3组以4开头）
      const versionGroup = uuid.split('-')[2]
      const version = versionGroup.charAt(0)
      expect(version).toBe('4')
    })

    it('应该生成有效的变体位（10xx）', () => {
      const uuid = generateUUID()

      // 检查变体位（第4组以8、9、a或b开头）
      const variantGroup = uuid.split('-')[3]
      const variant = variantGroup.charAt(0)
      expect(['8', '9', 'a', 'b']).toContain(variant)
    })

    it('应该能够生成大量不重复的UUID', () => {
      const uuidSet = new Set()
      const iterations = 10000

      for (let i = 0; i < iterations; i++) {
        const uuid = generateUUID()
        uuidSet.add(uuid)
      }

      expect(uuidSet.size).toBe(iterations)
    })
  })

  describe('createTask时间戳功能', () => {
    it('应该在创建任务时自动设置时间戳', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const task = createTask({
        name: '测试任务',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      expect(task.timestamp).toBe(now)
    })

    it('应该使用当前时间作为时间戳', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const task = createTask({
        name: '测试任务',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      expect(task.timestamp).toBe(now)
    })

    it('应该为不同任务创建不同的时间戳（如果有时间间隔）', () => {
      const now1 = Date.now()
      vi.setSystemTime(now1)

      const task1 = createTask({
        name: '任务1',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      // 推进时间
      vi.setSystemTime(now1 + 100)

      const task2 = createTask({
        name: '任务2',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      expect(task1.timestamp).toBeLessThan(task2.timestamp)
    })

    it('应该在截止时间少于24小时时自动设置紧急状态', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const urgentDeadline = now + 12 * 60 * 60 * 1000 // 12小时后

      const task = createTask({
        name: '紧急任务',
        estimatedTime: 60,
        deadline: urgentDeadline,
        longCycle: false
      })

      expect(task.urgent).toBe(true)
      expect(task.timestamp).toBe(now)
    })

    it('应该在截止时间超过24小时时保持非紧急状态', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const notUrgentDeadline = now + 48 * 60 * 60 * 1000 // 48小时后

      const task = createTask({
        name: '非紧急任务',
        estimatedTime: 60,
        deadline: notUrgentDeadline,
        longCycle: false
      })

      expect(task.urgent).toBe(false)
      expect(task.timestamp).toBe(now)
    })
  })

  describe('tasksStore时间戳自动更新', () => {
    it('应该在addTask时自动设置时间戳', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const task = tasksStore.addTask({
        name: '新任务',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      expect(task?.timestamp).toBe(now)
      expect(tasksStore.tasks[0].timestamp).toBe(now)
    })

    it('应该在updateTask时自动更新时间戳', () => {
      // 首先添加一个任务
      const task = tasksStore.addTask({
        name: '原始任务',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      const originalTimestamp = task?.timestamp || 0
      const now = Date.now() + 1000
      vi.setSystemTime(now)

      // 更新任务
      tasksStore.updateTask(task!.id, { name: '更新后的任务' })

      const updatedTask = tasksStore.tasks.find(t => t.id === task!.id)
      expect(updatedTask?.timestamp).toBeGreaterThan(originalTimestamp)
      expect(updatedTask?.timestamp).toBe(now)
    })

    it('应该在toggleTaskStatus时自动更新时间戳', () => {
      // 首先添加一个任务
      const task = tasksStore.addTask({
        name: '待切换任务',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      const originalTimestamp = task?.timestamp || 0
      const now = Date.now() + 1000
      vi.setSystemTime(now)

      // 切换任务状态
      tasksStore.toggleTaskStatus(task!.id)

      const updatedTask = tasksStore.tasks.find(t => t.id === task!.id)
      expect(updatedTask?.timestamp).toBeGreaterThan(originalTimestamp)
      expect(updatedTask?.timestamp).toBe(now)
    })

    it('应该在updateTaskProgress时自动更新时间戳', () => {
      // 首先添加一个任务
      const task = tasksStore.addTask({
        name: '进度更新任务',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      const originalTimestamp = task?.timestamp || 0
      const now = Date.now() + 1000
      vi.setSystemTime(now)

      // 更新进度
      tasksStore.updateTaskProgress(task!.id, 50)

      const updatedTask = tasksStore.tasks.find(t => t.id === task!.id)
      expect(updatedTask?.timestamp).toBeGreaterThan(originalTimestamp)
      expect(updatedTask?.timestamp).toBe(now)
      expect(updatedTask?.progress).toBe(50)
    })

    it('应该在updateTaskTimeStatus时自动更新时间戳', () => {
      // 首先添加一个任务
      const task = tasksStore.addTask({
        name: '时间状态更新任务',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      const originalTimestamp = task?.timestamp || 0
      const now = Date.now() + 1000
      vi.setSystemTime(now)

      // 更新时间状态
      tasksStore.updateTaskTimeStatus(task!.id, true)

      const updatedTask = tasksStore.tasks.find(t => t.id === task!.id)
      expect(updatedTask?.timestamp).toBeGreaterThan(originalTimestamp)
      expect(updatedTask?.timestamp).toBe(now)
      expect(updatedTask?.time_up).toBe(true)
    })
  })

  describe('localStorage数据格式验证', () => {
    it('应该正确保存任务到localStorage', () => {
      // 清空localStorage
      localStorage.removeItem('potato_tasks')

      // 添加任务
      const task = tasksStore.addTask({
        name: 'localStorage测试任务',
        estimatedTime: 60,
        deadline: Date.now() + 24 * 60 * 60 * 1000,
        longCycle: false
      })

      // 保存到localStorage
      tasksStore.saveToLocalStorage()

      // 检查localStorage
      const saved = localStorage.getItem('potato_tasks')
      expect(saved).toBeTruthy()

      const parsedTasks: Task[] = JSON.parse(saved!)
      expect(parsedTasks.length).toBe(1)
      expect(parsedTasks[0].id).toBe(task!.id)
      expect(parsedTasks[0].timestamp).toBe(task!.timestamp)
    })

    it('应该正确从localStorage加载任务', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const mockTask: Task = {
        id: generateUUID(),
        name: '从localStorage加载的任务',
        estimatedTime: 60,
        deadline: null,
        completed: false,
        cycleList: [],
        progress: 0,
        time_up: false,
        longCycle: false,
        urgent: false,
        important: false,
        timestamp: now
      }

      // 模拟localStorage数据
      localStorage.setItem('potato_tasks', JSON.stringify([mockTask]))

      // 清空当前任务
      tasksStore.tasks = []

      // 从localStorage加载
      tasksStore.loadFromLocalStorage()

      expect(tasksStore.tasks.length).toBe(1)
      expect(tasksStore.tasks[0].id).toBe(mockTask.id)
      expect(tasksStore.tasks[0].timestamp).toBe(mockTask.timestamp)
    })

    it('应该在localStorage加载后保持数据完整性', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const mockTasks: Task[] = [
        {
          id: generateUUID(),
          name: '任务1',
          estimatedTime: 60,
          deadline: Date.now() + 12 * 60 * 60 * 1000,
          completed: false,
          cycleList: [],
          progress: 30,
          time_up: false,
          longCycle: false,
          urgent: true,
          important: true,
          timestamp: now,
          description: '测试描述1'
        },
        {
          id: generateUUID(),
          name: '任务2',
          estimatedTime: 120,
          deadline: null,
          completed: true,
          cycleList: [],
          progress: 100,
          time_up: false,
          longCycle: true,
          urgent: false,
          important: false,
          timestamp: now + 1000,
          description: '测试描述2'
        }
      ]

      localStorage.setItem('potato_tasks', JSON.stringify(mockTasks))
      tasksStore.tasks = []
      tasksStore.loadFromLocalStorage()

      expect(tasksStore.tasks.length).toBe(2)
      expect(tasksStore.tasks[0]).toEqual(mockTasks[0])
      expect(tasksStore.tasks[1]).toEqual(mockTasks[1])
    })
  })

  describe('边界情况和错误处理', () => {
    it('应该在updateTask时处理不存在的任务ID', () => {
      const nonExistentId = generateUUID()
      const result = tasksStore.updateTask(nonExistentId, { name: '不存在的任务' })

      expect(result).toBeNull()
      expect(tasksStore.tasks.length).toBe(0)
    })

    it('应该在updateTaskProgress时处理不存在的任务ID', () => {
      const nonExistentId = generateUUID()
      const result = tasksStore.updateTaskProgress(nonExistentId, 50)

      expect(result).toBeNull()
      expect(tasksStore.tasks.length).toBe(0)
    })

    it('应该在updateTaskTimeStatus时处理不存在的任务ID', () => {
      const nonExistentId = generateUUID()
      const result = tasksStore.updateTaskTimeStatus(nonExistentId, true)

      expect(result).toBeNull()
      expect(tasksStore.tasks.length).toBe(0)
    })

    it('应该在deleteTask时处理不存在的任务ID', () => {
      const nonExistentId = generateUUID()
      const initialLength = tasksStore.tasks.length

      tasksStore.deleteTask(nonExistentId)

      expect(tasksStore.tasks.length).toBe(initialLength)
    })

    it('应该在快速连续操作时保持时间戳的准确性', () => {
      const task = tasksStore.addTask({
        name: '快速操作测试任务',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      const timestamps: number[] = [task?.timestamp || 0]
      const baseTime = Date.now()

      // 快速连续更新
      for (let i = 0; i < 10; i++) {
        vi.setSystemTime(baseTime + i * 10)
        tasksStore.updateTask(task!.id, { name: `更新${i}` })
        const currentTask = tasksStore.tasks.find(t => t.id === task!.id)
        timestamps.push(currentTask?.timestamp || 0)
      }

      // 验证时间戳是递增的或相等的（由于快速连续操作）
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1])
      }
    })

    it('应该在空localStorage时使用默认任务', () => {
      localStorage.removeItem('potato_tasks')
      tasksStore.tasks = []
      tasksStore.loadFromLocalStorage()

      expect(tasksStore.tasks.length).toBe(1)
      expect(tasksStore.tasks[0].name).toBe('default')
    })

    it('应该在localStorage数据损坏时使用默认任务', () => {
      localStorage.setItem('potato_tasks', 'invalid json data')
      tasksStore.tasks = []
      tasksStore.loadFromLocalStorage()

      expect(tasksStore.tasks.length).toBe(1)
      expect(tasksStore.tasks[0].name).toBe('default')
    })
  })

  describe('UUID唯一性验证', () => {
    it('应该在createTask中生成唯一的任务ID', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const task1 = createTask({
        name: '任务1',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      const task2 = createTask({
        name: '任务2',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      expect(task1.id).not.toBe(task2.id)
      expect(task1.timestamp).toBe(now)
      expect(task2.timestamp).toBe(now)
    })

    it('应该在tasksStore中为不同任务生成唯一的ID', () => {
      const task1 = tasksStore.addTask({
        name: 'Store任务1',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      const task2 = tasksStore.addTask({
        name: 'Store任务2',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      const task3 = tasksStore.addTask({
        name: 'Store任务3',
        estimatedTime: 60,
        deadline: null,
        longCycle: false
      })

      const ids = [task1?.id, task2?.id, task3?.id].filter(Boolean)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(3)
      expect(ids.length).toBe(3)
    })

    it('应该在大量任务创建时保持UUID的唯一性', () => {
      const taskCount = 1000
      const taskIds = new Set<string>()
      let duplicateCount = 0

      for (let i = 0; i < taskCount; i++) {
        const task = tasksStore.addTask({
          name: `批量任务${i}`,
          estimatedTime: 60,
          deadline: null,
          longCycle: false
        })

        if (taskIds.has(task!.id)) {
          duplicateCount++
        }
        taskIds.add(task!.id)
      }

      expect(duplicateCount).toBe(0)
      expect(taskIds.size).toBe(taskCount)
    })
  })
})
