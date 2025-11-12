import type { Task } from './share_type'

/**
 * 检查任务是否应该被标记为紧急
 * 如果剩余时间小于24小时，返回true
 * @param task 任务对象
 * @returns 是否应该标记为紧急
 */
export function shouldBeUrgent(task: Task): boolean {
  // 如果任务没有截止时间，不标记为紧急
  if (task.deadline === null) {
    return false
  }

  // 如果任务已完成，不需要标记为紧急
  if (task.completed) {
    return false
  }

  const currentTime = Date.now()
  const remainingTime = task.deadline - currentTime

  // 剩余时间小于24小时（24 * 60 * 60 * 1000 毫秒）
  const twentyFourHours = 24 * 60 * 60 * 1000

  return remainingTime < twentyFourHours && remainingTime > -Infinity
}

/**
 * 更新任务的紧急状态
 * @param task 任务对象
 * @returns 更新后的任务对象
 */
export function updateTaskUrgency(task: Task): Task {
  return {
    ...task,
    urgent: shouldBeUrgent(task),
  }
}

/**
 * 批量更新任务列表的紧急状态
 * @param tasks 任务列表
 * @returns 更新后的任务列表
 */
export function updateTasksUrgency(tasks: Task[]): Task[] {
  return tasks.map((task) => updateTaskUrgency(task))
}

