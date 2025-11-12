import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Task, CycleItem } from '@/utils/share_type'
import { default_task, infinite_task } from '@/utils/share_type'
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
    () => (id: number) => tasks.value.find((task: Task) => task.id === id),
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
    const task: Task = {
      id: Date.now(),
      name: taskData.name.trim(),
      estimatedTime: taskData.estimatedTime,
      deadline: taskData.deadline,
      completed: false,
      cycleList: [],
      progress: 0,
      time_up: false,
      longCycle: taskData.longCycle,
      urgent: taskData.urgent || false,
      important: taskData.important || false,
    }

    // 生成番茄钟周期
    generateCycleList(task)
    
    // 根据截止时间自动设置紧急状态
    const twentyFourHours = 24 * 60 * 60 * 1000
    if (task.deadline && task.deadline - Date.now() < twentyFourHours) {
      task.urgent = true
    }
    
    tasks.value = [...tasks.value, task]
    return task
  }

  const updateTask = (id: number, updates: Partial<Task>) => {
    const taskIndex = tasks.value.findIndex((task: Task) => task.id === id)
    if (taskIndex === -1) return null

    const updatedTask = { ...tasks.value[taskIndex], ...updates }

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

  const deleteTask = (id: number) => {
    tasks.value = tasks.value.filter((task: Task) => task.id !== id)
  }

  const toggleTaskStatus = (id: number) => {
    const task = tasks.value.find((task: Task) => task.id === id)
    if (task) {
      task.completed = !task.completed
    }
  }

  const getInfiniteTask = () => {
    return { ...infinite_task, id: Date.now() }
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

    // 数据管理
    saveToLocalStorage,
    loadFromLocalStorage,
    
    // 紧急状态管理
    checkAndUpdateUrgency,
  }
})
