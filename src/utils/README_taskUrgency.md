# 任务自动紧急状态功能

## 功能说明

该功能会自动检查任务的截止时间，如果剩余时间小于24小时（包括已超时的任务），会自动将任务的 `urgent` 属性设为 `true`。

## 触发时机

1. **应用加载时**：从 localStorage 加载任务后，自动更新所有任务的紧急状态
2. **添加任务时**：添加新任务时，根据截止时间自动设置紧急状态
3. **更新任务时**：修改任务的截止时间时，自动重新计算紧急状态
4. **手动触发**：调用 `checkAndUpdateUrgency()` 方法手动更新所有任务的紧急状态

## 使用方法

### 在组件中使用

```vue
<script setup lang="ts">
import { useTasksStore } from '@/stores/tasksStore'
import { onMounted, onBeforeUnmount } from 'vue'

const tasksStore = useTasksStore()

// 定期检查任务紧急状态（每5分钟）
let urgencyCheckInterval: number

onMounted(() => {
  // 设置定时器，每5分钟检查一次
  urgencyCheckInterval = setInterval(
    () => {
      tasksStore.checkAndUpdateUrgency()
    },
    5 * 60 * 1000,
  ) // 5分钟
})

onBeforeUnmount(() => {
  // 清除定时器
  if (urgencyCheckInterval) {
    clearInterval(urgencyCheckInterval)
  }
})
</script>
```

### 工具函数使用

```typescript
import { shouldBeUrgent, updateTaskUrgency, updateTasksUrgency } from '@/utils/taskUrgency'
import type { Task } from '@/utils/share_type'

// 检查单个任务是否应该标记为紧急
const task: Task = {
  id: 1,
  name: '示例任务',
  deadline: Date.now() + 12 * 60 * 60 * 1000, // 12小时后
  // ... 其他属性
}

const isUrgent = shouldBeUrgent(task)
console.log('任务是否紧急:', isUrgent) // true

// 更新单个任务的紧急状态
const updatedTask = updateTaskUrgency(task)
console.log('更新后的紧急状态:', updatedTask.urgent)

// 批量更新多个任务的紧急状态
const tasks: Task[] = [task1, task2, task3]
const updatedTasks = updateTasksUrgency(tasks)
```

## 判断逻辑

任务会被标记为紧急（`urgent = true`）当且仅当：

1. 任务有截止时间（`deadline !== null`）
2. 任务未完成（`completed === false`）
3. 剩余时间 < 24小时（`remainingTime < 24 * 60 * 60 * 1000`）

### 特殊情况

- **无截止时间的任务**：不会被标记为紧急
- **已完成的任务**：即使超时也不会被标记为紧急
- **已超时的任务**：会被标记为紧急（剩余时间为负数）
- **正好24小时**：不会被标记为紧急（`<` 而不是 `<=`）

## 示例场景

### 场景1：添加新任务

```typescript
const tasksStore = useTasksStore()

// 添加一个12小时后到期的任务
tasksStore.addTask({
  name: '紧急任务',
  estimatedTime: 60,
  deadline: Date.now() + 12 * 60 * 60 * 1000, // 12小时后
  longCycle: false,
})

// 任务会自动被标记为紧急 (urgent = true)
```

### 场景2：更新任务截止时间

```typescript
const tasksStore = useTasksStore()

// 将任务的截止时间改为3小时后
tasksStore.updateTask(taskId, {
  deadline: Date.now() + 3 * 60 * 60 * 1000, // 3小时后
})

// 任务会自动被标记为紧急 (urgent = true)
```

### 场景3：定期检查

```typescript
const tasksStore = useTasksStore()

// 手动触发检查（例如在页面获得焦点时）
window.addEventListener('focus', () => {
  tasksStore.checkAndUpdateUrgency()
})
```

## API 文档

### `shouldBeUrgent(task: Task): boolean`

检查任务是否应该被标记为紧急。

**参数：**

- `task`: 任务对象

**返回值：**

- `true`: 任务应该被标记为紧急
- `false`: 任务不应该被标记为紧急

### `updateTaskUrgency(task: Task): Task`

更新单个任务的紧急状态。

**参数：**

- `task`: 任务对象

**返回值：**

- 更新后的任务对象（包含正确的 `urgent` 状态）

### `updateTasksUrgency(tasks: Task[]): Task[]`

批量更新多个任务的紧急状态。

**参数：**

- `tasks`: 任务数组

**返回值：**

- 更新后的任务数组

### `checkAndUpdateUrgency()`

Store 方法，检查并更新所有任务的紧急状态。

**用法：**

```typescript
const tasksStore = useTasksStore()
tasksStore.checkAndUpdateUrgency()
```

## 测试

运行单元测试：

```bash
npm run test:unit -- src/utils/__tests__/taskUrgency.spec.ts
```

测试覆盖了以下场景：

- ✅ 剩余时间 < 24小时 → 标记为紧急
- ✅ 剩余时间 > 24小时 → 不标记为紧急
- ✅ 无截止时间 → 不标记为紧急
- ✅ 已完成的任务 → 不标记为紧急
- ✅ 已超时的任务 → 标记为紧急
- ✅ 正好24小时 → 不标记为紧急
- ✅ 批量更新多个任务

## 注意事项

1. **不会覆盖用户手动设置**：虽然函数会根据截止时间计算紧急状态，但用户可以在 Store 的 `addTask` 和 `updateTask` 方法中手动指定 `urgent` 值
2. **性能考虑**：批量更新操作使用 `map` 方法，对大量任务也能保持良好性能
3. **时间精度**：使用毫秒级时间戳，确保精确计算
4. **定期检查建议**：建议在应用中设置定时器，每5-10分钟检查一次任务紧急状态
