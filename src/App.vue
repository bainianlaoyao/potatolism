<script setup lang="ts">
import {
  NMessageProvider,
  NConfigProvider,
  darkTheme,
  NGlobalStyle,
  NLayout,
  NLayoutContent,
} from 'naive-ui'
import { ref, provide, computed, onMounted, onBeforeUnmount } from 'vue'
import potato_clock from './components/potato_clock.vue'
import misson_l from './components/misson_l.vue'
import NintendoSwitchTransition from './components/NintendoSwitchTransition.vue'
import SideBar from './components/SideBar.vue'
import type { Task } from '@/utils/share_type'
import hover_card from './components/hover_card.vue'
import { useTasksStore } from '@/stores/tasksStore'
import SettingsView from './views/SettingsView.vue'
import AboutView from './views/AboutView.vue'
import { startAutoSync, stopAutoSync } from '@/utils/cloudSync'

const tasksStore = useTasksStore()

const transitionRef = ref<InstanceType<typeof NintendoSwitchTransition>>()
const clockRef = ref<InstanceType<typeof potato_clock>>()
const clockKey = ref(0)
const missonLRef = ref<InstanceType<typeof misson_l>>()

// 任务启动函数 - 供侧边栏调用
const task_start = (task: Task, infinite: boolean) => {
  console.log('Task 全部信息:', JSON.stringify(task, null, 2))

  clockRef.value?.setConfig({ task: task, infinite: infinite })
  transitionRef.value?.transitionTo('right', 2)
  clockRef.value?.resetTimer()
}

// 侧边栏相关方法
const showAddTaskModal = () => {
  // 触发添加任务模态框 - 直接调用 misson_l 组件的方法
  console.log('显示添加任务模态框')
  missonLRef.value?.showAddTaskModal()
}

const startInfiniteMode = () => {
  // 启动无限模式
  console.log('启动无限模式')
  const infiniteTask = tasksStore.getInfiniteTask()
  task_start(infiniteTask, true)
}

// 任务过滤分类
const selectedTaskCategory = ref('all')

// 过滤后的任务列表 - 使用store中的tasks
const filteredTasks = computed(() => {
  if (selectedTaskCategory.value === 'all') {
    return tasksStore.tasks
  }

  return tasksStore.tasks.filter((task) => {
    switch (selectedTaskCategory.value) {
      case 'urgent-important':
        return task.urgent && task.important
      case 'important-not-urgent':
        return !task.urgent && task.important
      case 'urgent-not-important':
        return task.urgent && !task.important
      case 'not-urgent-not-important':
        return !task.urgent && !task.important
      default:
        return true
    }
  })
})

// 处理过滤变化
const handleFilterChange = (category: string) => {
  selectedTaskCategory.value = category
  console.log('任务分类过滤:', category)
}

// 其他方法
const task_quit = (task: Task) => {
  // 使用统一的store方法检查任务完成状态
  const updatedTask = tasksStore.updateTaskTimeStatus(
    task.id,
    task.progress >= task.cycleList.length - 1,
  )

  if (updatedTask?.time_up) {
    //complete
    console.log('complete')
    transitionRef.value?.transitionTo('left', 1)
  } else {
    //quit
    console.log('quit')
    transitionRef.value?.transitionTo('left', 1)
  }
}

const restartClock = () => {
  clockKey.value++
}

// 提供给子组件的方法
const appMethods = {
  task_start,
  task_quit,
  restartClock,
  showSettings: () => transitionRef.value?.transitionTo('up', 4),
  showAbout: () => transitionRef.value?.transitionTo('down', 5),
  showHome: () => transitionRef.value?.transitionTo('left', 1),
}

// 使用 provide 提供方法给子组件
provide('appMethods', appMethods)

// 定期检查任务紧急状态
const checkTasksUrgency = () => {
  console.log('🔍 检查任务紧急状态...')
  tasksStore.checkAndUpdateUrgency()
  console.log('✨ 任务紧急状态检查完成')
}

// 设置定时器和事件监听
let urgencyCheckInterval: number | undefined

onMounted(() => {
  // 初始化store
  tasksStore.initializeStore()

  // 每5分钟检查一次任务紧急状态
  urgencyCheckInterval = setInterval(
    () => {
      checkTasksUrgency()
    },
    5 * 60 * 1000,
  ) as unknown as number

  // 当窗口获得焦点时也检查一次
  window.addEventListener('focus', checkTasksUrgency)

  // 启动云同步（每秒）
  startAutoSync()
})

onBeforeUnmount(() => {
  // 清理定时器和事件监听
  if (urgencyCheckInterval !== undefined) {
    clearInterval(urgencyCheckInterval)
  }
  window.removeEventListener('focus', checkTasksUrgency)

  // 停止云同步
  stopAutoSync()
})

// onMounted(() => {
//   transitionRef.value?.transitionTo('right', 1)
//   console.log('App mounted!')
// })
</script>

<template>
  <n-config-provider :theme="darkTheme">
    <!-- 新增：使用暗黑主题 -->
    <n-message-provider>
      <n-layout has-sider class="app-layout">
        <!-- 左侧边栏 -->
        <SideBar
          :tasks="tasksStore.tasks"
          :show-add-task-modal="showAddTaskModal"
          :start-infinite-mode="startInfiniteMode"
          @filter-change="handleFilterChange"
        />

        <!-- 主内容区域 -->
        <n-layout>
          <n-layout-content class="main-content">
            <NintendoSwitchTransition ref="transitionRef" class="full-screen" :slotCount="5">
              <template #slot1>
                <!-- 修改：通过 v-model:tasks 双向绑定任务，添加事件监听器 -->
                <misson_l
                  ref="missonLRef"
                  v-model:tasks="tasksStore.tasks"
                  :filtered-tasks="filteredTasks"
                  :task-start="task_start"
                />
              </template>
              <template #slot2>
                <potato_clock ref="clockRef" />
              </template>
              <template #slot3>
                <hover_card style="height: 100%" />
              </template>
              <template #slot4>
                <SettingsView />
              </template>
              <template #slot5>
                <AboutView />
              </template>
              <!-- <potato_clock  /> -->
              <!-- <misson_list /> -->
              <!-- <misson_l /> -->
            </NintendoSwitchTransition>
          </n-layout-content>
        </n-layout>
      </n-layout>
    </n-message-provider>
    <NGlobalStyle />
  </n-config-provider>
</template>

<style scoped>
.app-layout {
  height: 100vh;
}

.main-content {
  background: rgba(18, 18, 18, 1);
  height: 100vh;
}

.full-screen {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-layout {
    position: relative;
  }

  .main-content {
    margin-left: 0;
  }
}

header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
