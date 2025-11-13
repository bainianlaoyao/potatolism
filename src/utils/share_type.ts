export type CycleItem = [number, string]

// UUID生成函数
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 通用任务创建辅助函数
export const createTask = (taskData: {
  name: string
  estimatedTime: number
  deadline: number | null
  longCycle: boolean
  urgent?: boolean
  important?: boolean
  description?: string
}): Task => {
  const now = Date.now()
  let autoUrgent = taskData.urgent || false

  // 自动检查是否应该设为紧急
  if (taskData.deadline && taskData.deadline - now < 24 * 60 * 60 * 1000) {
    console.log(`🔥 任务 "${taskData.name}" 自动设为紧急 (剩余 ${((taskData.deadline - now) / (1000 * 60 * 60)).toFixed(2)} 小时)`)
    autoUrgent = true
  }

  return {
    id: generateUUID(),
    name: taskData.name.trim(),
    estimatedTime: taskData.estimatedTime,
    deadline: taskData.deadline,
    completed: false,
    cycleList: [],
    progress: 0,
    time_up: false,
    longCycle: taskData.longCycle,
    urgent: autoUrgent,
    important: taskData.important || false,
    description: (taskData.description || '').trim(),
    timestamp: now
  }
}

export interface Task {
  id: string
  name: string
  estimatedTime: number
  cycleSet?: number[]
  longCycle: boolean
  cycleList: CycleItem[]
  progress: number
  deadline: number | null
  completed: boolean,
  time_up: boolean,
  urgent: boolean,
  important: boolean,
  description?: string,
  timestamp: number
}
export const default_task:Task = {
  id: generateUUID(),
  name: 'default',
  estimatedTime: 1,
  longCycle: false,
  deadline: Date.now(),
  completed: false,
  cycleList: [[25, 'focus'], [5, 'rest'],[25, 'focus'], [5, 'rest'],[100, 'end']],
  progress: 0,
  time_up: false,
  urgent: false,
  important: false,
  description: '',
  timestamp: Date.now()
}
export const infinite_task:Task = {
  id: generateUUID(),
  name: 'infinite',
  estimatedTime: 1,
  longCycle: true,
  deadline: Date.now(),
  completed: false,
  cycleList: [[50, 'focus'], [10, 'rest'],[25, 'focus'], [5, 'rest']],
  progress: 0,
  time_up: false,
  urgent: false,
  important: false,
  description: '',
  timestamp: Date.now()
}
