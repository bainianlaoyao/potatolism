import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Task } from '../utils/share_type'

const STORAGE_KEY = 'app-tasks'

export const useAppStore = defineStore('app', () => {
  // 状态
  const tasks = ref<Task[]>([])

  // 计算属性
  const completedTasks = computed(() => tasks.value.filter(task => task.completed))
  const pendingTasks = computed(() => tasks.value.filter(task => !task.completed))

  // 从localStorage加载数据
  const loadFromStorage = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        tasks.value = JSON.parse(stored)
      } catch (error) {
        console.error('Failed to parse tasks from localStorage:', error)
        tasks.value = []
      }
    }
  }

  // 保存到localStorage
  const saveToStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.value))
  }

  // 初始化时加载数据
  loadFromStorage()

  // CRUD操作
  const addTask = (task: Task) => {
    tasks.value.push(task)
    saveToStorage()
  }

  const updateTask = (id: number, updates: Partial<Task>) => {
    const index = tasks.value.findIndex(task => task.id === id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...updates }
      saveToStorage()
    }
  }

  const deleteTask = (id: number) => {
    const index = tasks.value.findIndex(task => task.id === id)
    if (index !== -1) {
      tasks.value.splice(index, 1)
      saveToStorage()
    }
  }

  const getTask = (id: number): Task | undefined => {
    return tasks.value.find(task => task.id === id)
  }

  const clearAllTasks = () => {
    tasks.value = []
    saveToStorage()
  }

  return {
    tasks,
    completedTasks,
    pendingTasks,
    addTask,
    updateTask,
    deleteTask,
    getTask,
    clearAllTasks,
    loadFromStorage
  }
})
