export type CycleItem = [number, string]

export interface Task {
  id: number
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
  description?: string
}
export const default_task:Task = {
  id: Date.now(),
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
  description: ''
}
export const infinite_task:Task = {
  id: Date.now(),
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
  description: ''
}
