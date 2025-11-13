import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Task, CycleItem } from '@/utils/share_type'
import { default_task, infinite_task, generateUUID, createTask } from '@/utils/share_type'
import { updateTasksUrgency } from '@/utils/taskUrgency'

// Store 热重载支持
if (import.meta.hot) {
  import.meta.hot.accept()
}

export const useTasksStore = defineStore('tasks', () => {
  // 状态
  const tasks = ref<Task[]>([])
  const loading = ref(false)

  // 计算属性
  const completedTasks = computed(() => tasks.value.filter((task: Task) => task.completed))

  const uncompletedTasks = computed(() => tasks.value.filter((task: Task) => !task.completed))

  const getTaskById = computed(
    () => (id: string) => tasks.value.find((task: Task) => task.id === id),
  )

  // 数据持久化
  const saveToLocalStorage = () => {
    try {
      localStorage.setItem('potato_tasks', JSON.stringify(tasks.value))
    } catch (error) {
      console.error('保存任务数据失败:', error)
    }
  }

  const loadFromLocalStorage = () => {
    try {
      const savedTasks = localStorage.getItem('potato_tasks')
      if (savedTasks) {
        tasks.value = JSON.parse(savedTasks)
        // 加载后自动更新所有任务的紧急状态
        tasks.value = updateTasksUrgency(tasks.value)
      } else {
        tasks.value = [default_task]
      }
    } catch (error) {
      console.error('加载任务数据失败:', error)
      tasks.value = [default_task]
    }
  }

  // 防抖保存
  let saveTimeout: ReturnType<typeof setTimeout> | null = null
  const debouncedSave = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    saveTimeout = setTimeout(saveToLocalStorage, 500)
  }

  // 监听任务变化，自动保存
  watch(
    tasks,
    () => {
      debouncedSave()
    },
    { deep: true },
  )

  // 初始化
  const initializeStore = () => {
    loadFromLocalStorage()
  }

  // 任务管理方法
  const addTask = (taskData: {
    name: string
    estimatedTime: number
    deadline: number | null
    longCycle: boolean
    urgent?: boolean
    important?: boolean
  }) => {
    // 使用通用任务创建函数
    const task = createTask(taskData)

    // 生成番茄钟周期
    generateCycleList(task)

    tasks.value = [...tasks.value, task]
    return task
  }

  const updateTask = (id: string, updates: Partial<Task>) => {
    const taskIndex = tasks.value.findIndex((task: Task) => task.id === id)
    if (taskIndex === -1) return null

    const updatedTask = { ...tasks.value[taskIndex], ...updates, timestamp: Date.now() }

    // 如果更新时间或模式，重新生成周期
    if (updates.estimatedTime !== undefined || updates.longCycle !== undefined) {
      generateCycleList(updatedTask)
      updatedTask.time_up = false
    }

    // 如果更新了截止时间，自动更新紧急状态
    if (updates.deadline !== undefined) {
      const twentyFourHours = 24 * 60 * 60 * 1000
      if (updatedTask.deadline && updatedTask.deadline - Date.now() < twentyFourHours) {
        updatedTask.urgent = true
      } else if (!updatedTask.deadline) {
        updatedTask.urgent = false
      }
    }

    tasks.value = tasks.value.map((task: Task, index: number) =>
      index === taskIndex ? updatedTask : task,
    )

    return updatedTask
  }

  const deleteTask = (id: string) => {
    tasks.value = tasks.value.filter((task: Task) => task.id !== id)
  }

  const toggleTaskStatus = (id: string) => {
    const taskIndex = tasks.value.findIndex((task: Task) => task.id === id)
    if (taskIndex === -1) return null

    const currentTask = tasks.value[taskIndex]
    const newCompletedStatus = !currentTask.completed

    // 使用统一的多属性更新方法，符合统一架构要求
    const updatedTask = updateTaskMultiple(id, {
      completed: newCompletedStatus
    })

    return updatedTask
  }

  const getInfiniteTask = () => {
    return { ...infinite_task, id: generateUUID(), timestamp: Date.now() }
  }

  // 更新任务进度并自动更新时间戳
  const updateTaskProgress = (id: string, progress: number) => {
    const taskIndex = tasks.value.findIndex((task: Task) => task.id === id)
    if (taskIndex === -1) return null

    const updatedTask = {
      ...tasks.value[taskIndex],
      progress,
      timestamp: Date.now()
    }

    tasks.value = tasks.value.map((task: Task, index: number) =>
      index === taskIndex ? updatedTask : task,
    )

    return updatedTask
  }

  // 更新任务时间状态并自动更新时间戳
  const updateTaskTimeStatus = (id: string, timeUp: boolean) => {
    const taskIndex = tasks.value.findIndex((task: Task) => task.id === id)
    if (taskIndex === -1) return null

    const updatedTask = {
      ...tasks.value[taskIndex],
      time_up: timeUp,
      timestamp: Date.now()
    }

    tasks.value = tasks.value.map((task: Task, index: number) =>
      index === taskIndex ? updatedTask : task,
    )

    return updatedTask
  }

  // 统一更新任务单个属性
  const updateTaskProperty = <T extends keyof Task>(id: string, property: T, value: Task[T]) => {
    const taskIndex = tasks.value.findIndex((task: Task) => task.id === id)
    if (taskIndex === -1) return null

    const updatedTask = {
      ...tasks.value[taskIndex],
      [property]: value,
      timestamp: Date.now() // 自动更新时间戳
    }

    // 如果更新的是周期相关属性，重新生成周期列表
    if (property === 'estimatedTime' || property === 'longCycle') {
      generateCycleList(updatedTask)
      updatedTask.time_up = false
    }

    // 如果更新了截止时间，自动更新紧急状态
    if (property === 'deadline') {
      const twentyFourHours = 24 * 60 * 60 * 1000
      if (updatedTask.deadline && updatedTask.deadline - Date.now() < twentyFourHours) {
        updatedTask.urgent = true
      } else if (!updatedTask.deadline) {
        updatedTask.urgent = false
      }
    }

    tasks.value = tasks.value.map((task: Task, index: number) =>
      index === taskIndex ? updatedTask : task,
    )

    return updatedTask
  }

  // 统一更新任务多个属性
  const updateTaskMultiple = (id: string, updates: Partial<Task>) => {
    const taskIndex = tasks.value.findIndex((task: Task) => task.id === id)
    if (taskIndex === -1) return null

    const updatedTask = {
      ...tasks.value[taskIndex],
      ...updates,
      timestamp: Date.now() // 自动更新时间戳
    }

    // 如果更新了时间或模式，重新生成周期列表
    if (updates.estimatedTime !== undefined || updates.longCycle !== undefined) {
      generateCycleList(updatedTask)
      updatedTask.time_up = false
    }

    // 如果更新了截止时间，自动更新紧急状态
    if (updates.deadline !== undefined) {
      const twentyFourHours = 24 * 60 * 60 * 1000
      if (updatedTask.deadline && updatedTask.deadline - Date.now() < twentyFourHours) {
        updatedTask.urgent = true
      } else if (!updatedTask.deadline) {
        updatedTask.urgent = false
      }
    }

    tasks.value = tasks.value.map((task: Task, index: number) =>
      index === taskIndex ? updatedTask : task,
    )

    return updatedTask
  }

  // 私有方法：生成周期列表
  const generateCycleList = (task: Task) => {
    let min = task.estimatedTime * 60
    const timeArrange: CycleItem[] = []

    const focusTime = task.longCycle ? 50 : 25
    const restTime = task.longCycle ? 10 : 5
    const cycleTime = focusTime + restTime

    while (min > 0) {
      if (min >= cycleTime) {
        timeArrange.push([focusTime, 'focus'])
        timeArrange.push([restTime, 'rest'])
        min -= cycleTime
      } else if (min >= focusTime) {
        timeArrange.push([focusTime, 'focus'])
        timeArrange.push([min - focusTime, 'rest'])
        min = 0
      } else {
        timeArrange.push([min, 'focus'])
        min = 0
      }
    }

    timeArrange.push([100, 'end'])
    task.cycleList = timeArrange
  }

  // 检查并更新所有任务的紧急状态
  const checkAndUpdateUrgency = () => {
    tasks.value = updateTasksUrgency(tasks.value)
  }

  return {
    // 状态
    tasks,
    loading,

    // 计算属性
    completedTasks,
    uncompletedTasks,
    getTaskById,

    // 初始化
    initializeStore,

    // 任务管理
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    getInfiniteTask,

    // 进度管理
    updateTaskProgress,
    updateTaskTimeStatus,

    // 统一更新方法
    updateTaskProperty,
    updateTaskMultiple,

    // 数据管理
    saveToLocalStorage,
    loadFromLocalStorage,

    // 紧急状态管理
    checkAndUpdateUrgency,
  }
})
