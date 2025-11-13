<template>
  <div class="todo-app">
    <!-- 主内容区 -->
    <div class="main-content">
      <div class="list-header">
        <div class="list-title"><span class="emoji">👋</span> 任务列表</div>
      </div>

      <!-- 未完成任务列表 -->
      <n-infinite-scroll class="task-list">
        <hover_card
          v-for="task in uncompletedTasks"
          :key="task.id"
          :card-style="cardStyle"
          class="task-item"
        >
          <template #card>
            <n-card :hoverable="true" @click="onTaskClick(task, false)">
              <n-thing>
                <template #header>
                  <n-h3 prefix="bar" align-text>
                    <n-space align="center" justify="space-between">
                      <n-text type="">
                        {{ task.name }}
                      </n-text>
                      <n-space v-if="task.urgent || task.important" :size="4">
                        <n-tag v-if="task.urgent" type="error" size="small" round> 紧急 </n-tag>
                        <n-tag v-if="task.important" type="warning" size="small" round>
                          重要
                        </n-tag>
                      </n-space>
                    </n-space>
                  </n-h3>
                </template>
                <template #default>
                  <n-flex vertical>
                    <span class="task-time"
                      ><n-text strong>{{ task.estimatedTime }}</n-text> h</span
                    >
                    <span class="task-deadline" v-if="task.deadline">{{
                      formatDate(task.deadline)
                    }}</span>

                    <n-flex
                      v-if="task.description && task.description.trim()"
                      class="task-description"
                    >
                      <n-text depth="3" italic>{{ task.description }}</n-text>
                    </n-flex>

                    <n-flex :size="3">
                      <span
                        v-for="(cycle, idx) in task.cycleList.slice(0, -1)"
                        :key="idx"
                        :style="boxStyle(task, cycle[1], idx)"
                      />
                    </n-flex>
                  </n-flex>
                </template>
              </n-thing>
            </n-card>
          </template>
          <template #hover-area>
            <n-flex vertical justify="space-around">
              <n-button size="large" type="success" @click="toggleTaskStatus(task.id)">
                <template #icon>
                  <n-icon><checkmark-outline /></n-icon>
                </template>
              </n-button>
              <n-button size="large" strong secondary type="info" @click="SetTaskInfo(task.id)">
                <template #icon>
                  <n-icon><settings-outline /></n-icon>
                </template>
              </n-button>
            </n-flex>
          </template>
        </hover_card>
      </n-infinite-scroll>

      <!-- 已完成任务区域 -->
      <!-- <div class="completed-section" v-if="completedTasks.length > 0">
        <div class="completed-header" @click="showCompleted = !showCompleted">
          <n-icon class="toggle-icon" :class="{ rotated: showCompleted }">
            <chevron-down-outline />
          </n-icon>
          <span>已完成 {{ completedTasks.length }}</span>
        </div>

        <div class="completed-tasks" v-if="showCompleted">
          <div v-for="task in completedTasks" :key="task.id" class="task-item completed-task">
            <div class="task-checkbox" @click="toggleTaskStatus(task.id)">
              <n-icon class="completed"><checkmark-circle /></n-icon>
            </div>
            <div class="task-content">
              <div class="task-name">{{ task.name }}</div>
              <div class="task-details">
                <span class="task-time">预估: {{ task.estimatedTime }}小时</span>
                <span class="task-deadline">截止: {{ formatDate(task.deadline) }}</span>
              </div>
            </div>
            <div class="task-actions">
              <n-button quaternary circle size="small" @click="deleteTask(task.id)">
                <template #icon>
                  <n-icon><trash-outline /></n-icon>
                </template>
              </n-button>
            </div>
          </div>
        </div>
      </div> -->

      <!-- 添加任务按钮 -->
    </div>

    <!-- 新增任务弹窗 -->
    <n-modal v-model:show="showModal" preset="card" title="新增任务" style="width: 500px">
      <n-form ref="formRef" :model="newTask" :rules="rules">
        <n-form-item label="任务名称" path="name">
          <n-input v-model:value="newTask.name" placeholder="请输入任务名称" />
        </n-form-item>

        <n-form-item label="预估时间 (小时)" path="estimatedTime">
          <n-input-number
            v-model:value="newTask.estimatedTime"
            :min="0.5"
            :step="0.5"
            placeholder="请输入预估时间"
          />
        </n-form-item>

        <n-form-item label="截止日期" path="deadline">
          <n-date-picker
            v-model:value="newTask.deadline"
            type="datetime"
            clearable
            placeholder="请选择截止日期"
          />
        </n-form-item>

        <n-form-item label="番茄钟模式">
          <n-space align="center">
            <span>25/5</span>
            <n-switch v-model:value="newTask.longCycle" />
            <span>50/10</span>
          </n-space>
        </n-form-item>

        <n-form-item label="任务属性">
          <n-space align="center" justify="space-between">
            <n-space align="center">
              <span>紧急</span>
              <n-switch v-model:value="newTask.urgent" />
            </n-space>
            <n-space align="center">
              <span>重要</span>
              <n-switch v-model:value="newTask.important" />
            </n-space>
          </n-space>
        </n-form-item>

        <n-form-item label="详细描述" path="description">
          <n-input
            v-model:value="newTask.description"
            type="textarea"
            placeholder="请输入任务详细描述（可选）"
            :rows="3"
          />
        </n-form-item>

        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" @click="addTask">确认</n-button>
        </n-space>
      </n-form>
    </n-modal>

    <!-- 编辑任务弹窗 -->
    <n-modal v-model:show="showEditModal" preset="card" title="编辑任务" style="width: 500px">
      <n-form ref="editFormRef" :model="editingTask" :rules="rules">
        <n-form-item label="任务名称" path="name">
          <n-input v-model:value="editingTask.name" placeholder="请输入任务名称" />
        </n-form-item>

        <n-form-item label="预估时间 (小时)" path="estimatedTime">
          <n-input-number
            v-model:value="editingTask.estimatedTime"
            :min="0.5"
            :step="0.5"
            placeholder="请输入预估时间"
          />
        </n-form-item>

        <n-form-item label="截止日期" path="deadline">
          <n-date-picker
            v-model:value="editingTask.deadline"
            type="datetime"
            clearable
            placeholder="请选择截止日期"
          />
        </n-form-item>

        <n-form-item label="番茄钟模式">
          <n-space align="center">
            <span>25分钟专注/5分钟休息</span>
            <n-switch v-model:value="editingTask.longCycle" />
            <span>50分钟专注/10分钟休息</span>
          </n-space>
        </n-form-item>

        <n-form-item label="任务属性">
          <n-space align="center" justify="space-between">
            <n-space align="center">
              <span>紧急</span>
              <n-switch v-model:value="editingTask.urgent" />
            </n-space>
            <n-space align="center">
              <span>重要</span>
              <n-switch v-model:value="editingTask.important" />
            </n-space>
          </n-space>
        </n-form-item>

        <n-form-item label="详细描述" path="description">
          <n-input
            v-model:value="editingTask.description"
            type="textarea"
            placeholder="请输入任务详细描述（可选）"
            :rows="3"
          />
        </n-form-item>

        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" @click="updateTask">保存</n-button>
        </n-space>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject } from 'vue'
import { defineEmits, defineProps, defineExpose } from 'vue'
import {
  NButton,
  NSpace,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NDatePicker,
  NIcon,
  useMessage,
  NInfiniteScroll,
  NCard,
  NThing,
  NText,
  NFlex,
  NH3,
  NSwitch,
  NTag,
} from 'naive-ui'
import { CheckmarkOutline, SettingsOutline } from '@vicons/ionicons5'
import { type CycleItem, type Task } from '@/utils/share_type'
import hover_card from './hover_card.vue'

// Props
const props = defineProps<{
  tasks: Task[]
  filteredTasks?: Task[]
  taskStart?: (task: Task, infinite: boolean) => void
}>()

const emit = defineEmits(['update:tasks'])

// 暴露方法给父组件调用
defineExpose({
  showAddTaskModal: () => {
    showModal.value = true
  },
})

// 使用 inject 获取父组件提供的方法
const appMethods = inject<{
  task_start: (task: Task, infinite: boolean) => void
  task_quit: (task: Task) => void
  restartClock: () => void
}>('appMethods')

// 定义双向绑定 tasks
const tasksModel = computed({
  get: () => props.tasks,
  set: (val: Task[]) => emit('update:tasks', val),
})

// 消息提示
const message = useMessage()

// 修改计算属性，优先使用 filteredTasks，否则使用全部任务
const uncompletedTasks = computed(() => {
  const sourceTasks = props.filteredTasks || tasksModel.value
  return sourceTasks.filter((task) => !task.completed)
})

// 表单相关代码
const formRef = ref(null)
const showModal = ref(false)
interface NewTask {
  name: string
  estimatedTime: number
  deadline: number | null
  longCycle: boolean
  urgent: boolean
  important: boolean
  description: string
}

// 获取当天23:59的时间戳
const getTodayEndTime = (): number => {
  const today = new Date()
  today.setHours(23, 59, 0, 0)
  return today.getTime()
}

const newTask = reactive<NewTask>({
  name: '',
  estimatedTime: 1,
  deadline: getTodayEndTime(), // 默认设置为当天23:59
  longCycle: false, // 默认使用25/5模式
  urgent: false,
  important: false,
  description: '',
})

// 新增：补充 form 的校验规则
const rules = {
  name: {
    required: true,
    message: '任务名称不能为空',
    trigger: 'blur',
  },
  estimatedTime: {
    required: true,
    message: '预估时间不能为空',
    trigger: 'blur',
  },
}

// 修改：添加任务操作，从 tasksModel 更新任务数组（避免直接修改 props）
const addTask = () => {
  try {
    // 表单验证
    if (!newTask.name.trim()) {
      message.error('任务名称不能为空')
      return
    }
    if (newTask.estimatedTime <= 0) {
      message.error('预估时间必须大于0')
      return
    }

    // 自动检查是否应该设为紧急
    let autoUrgent = newTask.urgent
    if (newTask.deadline) {
      const remainingTime = newTask.deadline - Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000
      if (remainingTime < twentyFourHours && remainingTime > -Infinity) {
        autoUrgent = true
        console.log(
          `🔥 任务 "${newTask.name}" 自动设为紧急 (剩余 ${(remainingTime / (1000 * 60 * 60)).toFixed(2)} 小时)`,
        )
      }
    }

    const task: Task = {
      id: Date.now(),
      name: newTask.name.trim(),
      estimatedTime: newTask.estimatedTime,
      deadline: newTask.deadline,
      completed: false,
      cycleList: [],
      progress: 0,
      time_up: false,
      longCycle: newTask.longCycle,
      urgent: autoUrgent,
      important: newTask.important,
      description: newTask.description.trim(),
    }
    let min = task.estimatedTime * 60
    const timeArrange: CycleItem[] = []

    // 根据用户选择的模式生成番茄钟周期
    const focusTime = newTask.longCycle ? 50 : 25
    const restTime = newTask.longCycle ? 10 : 5
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
    timeArrange.push([0, 'end'])
    task.cycleList = timeArrange
    tasksModel.value = [...tasksModel.value, task]
    message.success('任务添加成功')
    showModal.value = false
    // 重置表单
    newTask.name = ''
    newTask.estimatedTime = 1
    newTask.deadline = getTodayEndTime() // 重置为当天23:59
    newTask.longCycle = false // 重置为默认模式
    newTask.urgent = false
    newTask.important = false
    newTask.description = ''
  } catch (error) {
    console.error('添加任务失败:', error)
    message.error('添加任务失败，请重试')
  }
}

const toggleTaskStatus = (id: number) => {
  try {
    if (!id || typeof id !== 'number') {
      message.error('无效的任务ID')
      return
    }

    const taskExists = tasksModel.value.some((task) => task.id === id)
    if (!taskExists) {
      message.error('任务不存在')
      return
    }

    const updated = tasksModel.value.map((task) => {
      if (task.id === id) {
        return { ...task, completed: !task.completed }
      }
      return task
    })
    tasksModel.value = updated
    const target = updated.find((task) => task.id === id)
    message.info(target?.completed ? '任务已完成' : '任务已重新激活')
  } catch (error) {
    console.error('切换任务状态失败:', error)
    message.error('切换任务状态失败，请重试')
  }
}

const deleteTask = (id: number) => {
  try {
    if (!id || typeof id !== 'number') {
      message.error('无效的任务ID')
      return
    }

    const taskExists = tasksModel.value.some((task) => task.id === id)
    if (!taskExists) {
      message.error('任务不存在')
      return
    }

    tasksModel.value = tasksModel.value.filter((task) => task.id !== id)
    message.success('任务已删除')
  } catch (error) {
    console.error('删除任务失败:', error)
    message.error('删除任务失败，请重试')
  }
}

const formatDate = (timestamp: number | null): string => {
  if (!timestamp) return '未设置'
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

const onTaskClick = (task: Task, infinite: boolean): void => {
  appMethods?.task_start(task, infinite)
}

const boxStyle = computed(() => (task: Task, cycleType: string, index: number) => {
  const fillColor = cycleType === 'focus' ? 'orange' : 'green'
  const isFilled = task.progress > index
  return {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    marginRight: '4px',
    borderRadius: '2px',
    backgroundColor: isFilled ? fillColor : 'transparent',
    border: `1px solid ${fillColor}`,
  }
})
const cardStyle = {
  width: '40%',
}

// 编辑任务模态框
const showEditModal = ref(false)
const editFormRef = ref(null)
const editingTask = reactive<Task>({
  id: 0,
  name: '',
  estimatedTime: 1,
  deadline: null,
  completed: false,
  cycleList: [],
  progress: 0,
  time_up: false,
  longCycle: false,
  urgent: false,
  important: false,
  description: '',
})
const editingTaskId = ref<number | null>(null)

// 实现 SetTaskInfo 函数
const SetTaskInfo = (id: number) => {
  const task = tasksModel.value.find((task) => task.id === id)
  if (task) {
    // 深拷贝任务数据到编辑状态
    editingTaskId.value = id
    editingTask.id = task.id
    editingTask.name = task.name
    editingTask.estimatedTime = task.estimatedTime
    editingTask.deadline = task.deadline
    editingTask.completed = task.completed
    editingTask.progress = task.progress
    editingTask.time_up = task.time_up
    editingTask.longCycle = task.longCycle || false // 兼容旧数据
    editingTask.urgent = task.urgent || false // 兼容旧数据
    editingTask.important = task.important || false // 兼容旧数据
    editingTask.description = task.description || '' // 兼容旧数据

    showEditModal.value = true
  }
}

// 更新任务函数
const updateTask = () => {
  try {
    if (!editingTaskId.value) {
      message.error('未选择要编辑的任务')
      return
    }

    // 表单验证
    if (!editingTask.name.trim()) {
      message.error('任务名称不能为空')
      return
    }
    if (editingTask.estimatedTime <= 0) {
      message.error('预估时间必须大于0')
      return
    }

    const taskExists = tasksModel.value.some((task) => task.id === editingTaskId.value)
    if (!taskExists) {
      message.error('任务不存在')
      return
    }

    // 更新任务，但保留任务完成状态和进度
    const updatedTasks = tasksModel.value.map((task) => {
      if (task.id === editingTaskId.value) {
        // 如果预估时间或番茄钟模式发生变化，需要重新计算 cycleList
        let cycleList = task.cycleList
        if (
          task.estimatedTime !== editingTask.estimatedTime ||
          task.longCycle !== editingTask.longCycle
        ) {
          let min = editingTask.estimatedTime * 60
          const timeArrange: CycleItem[] = []

          // 根据用户选择的模式生成番茄钟周期
          const focusTime = editingTask.longCycle ? 50 : 25
          const restTime = editingTask.longCycle ? 10 : 5
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
          cycleList = timeArrange.concat([[0, 'end']])
          task.time_up = false
        }

        // 自动检查是否应该设为紧急
        let autoUrgent = editingTask.urgent
        if (editingTask.deadline) {
          const remainingTime = editingTask.deadline - Date.now()
          const twentyFourHours = 24 * 60 * 60 * 1000
          if (remainingTime < twentyFourHours && remainingTime > -Infinity) {
            autoUrgent = true
            console.log(
              `🔥 任务 "${editingTask.name}" 自动设为紧急 (剩余 ${(remainingTime / (1000 * 60 * 60)).toFixed(2)} 小时)`,
            )
          }
        } else {
          // 如果移除了截止时间，则取消紧急状态
          autoUrgent = false
          console.log(`✅ 任务 "${editingTask.name}" 取消紧急状态（无截止时间）`)
        }

        return {
          ...task,
          name: editingTask.name.trim(),
          estimatedTime: editingTask.estimatedTime,
          deadline: editingTask.deadline,
          cycleList: cycleList,
          longCycle: editingTask.longCycle,
          urgent: autoUrgent,
          important: editingTask.important,
          description: (editingTask.description || '').trim(),
        }
      }
      return task
    })

    tasksModel.value = updatedTasks
    message.success('任务已更新')
    showEditModal.value = false
    editingTaskId.value = null
  } catch (error) {
    console.error('更新任务失败:', error)
    message.error('更新任务失败，请重试')
  }
}
</script>

<style scoped>
.todo-app {
  display: flex;
  height: 100vh;
  width: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 侧边栏样式 */
.sidebar {
  width: 280px;
  display: flex;
  flex-direction: column;
}

.user-profile {
  padding: 16px;
  display: flex;
  align-items: center;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.username {
  font-weight: 500;
}

.email {
  font-size: 12px;
}

.search-container {
  padding: 12px 16px;
}

.search-input {
  border-radius: 4px;
}

.nav-items {
  padding: 8px 0;
}

.nav-item {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.nav-item i {
  margin-right: 12px;
  font-size: 18px;
}

.nav-item span {
  flex: 1;
}

.count {
  padding: 0 8px;
  font-size: 12px;
}

.main-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.list-header {
  padding: 24px 24px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-title {
  font-size: 24px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji {
  margin-right: 8px;
  font-size: 28px;
}

.list-actions {
  display: flex;
  gap: 8px;
}

.task-list {
  padding: 0 24px;
  width: 100%;
}

.task-item {
  margin: 16px auto;
}

.task-checkbox {
  margin-right: 12px;
  cursor: pointer;
}

.task-content {
  flex: 1;
}

.task-name {
  font-size: 16px;
  margin-bottom: 4px;
}

.task-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.task-item:hover .task-actions {
  opacity: 1;
}

.completed-section {
  padding: 0 24px;
  margin-top: 16px;
}

.completed-header {
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
}

.toggle-icon {
  margin-right: 8px;
  transition: transform 0.2s;
}

.toggle-icon.rotated {
  transform: rotate(-90deg);
}

.completed-tasks {
  margin-top: 8px;
}

.completed-task .task-name {
  text-decoration: line-through;
}

.add-task {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  cursor: pointer;
  transition: color 0.2s;
  /* 移除 margin-top: auto; 避免推到底部 */
  margin-bottom: 16px; /* 添加底部间距与任务列表分隔 */
  justify-content: center; /* 让按钮居中显示 */
}

.cycle-box {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 4px;
  border-radius: 2px;
}

.task-description {
  margin: 8px 0;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid #18a058;
  border-radius: 4px;
  font-size: 0.9em;
  line-height: 1.4;
}
</style>
