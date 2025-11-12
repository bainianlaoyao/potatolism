<template>
  <!-- 侧边栏主体 -->
  <n-layout-sider
    v-model:collapsed="collapsed"
    :width="280"
    :collapsed-width="0"
    :show-trigger="false"
    collapse-mode="width"
    :native-scrollbar="false"
    bordered
    :content-style="{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: 0,
    }"
  >
    <!-- 边栏展开时的收缩按钮 -->
    <n-button
      v-if="!collapsed"
      quaternary
      size="large"
      @click="collapsed = true"
      style="position: absolute; top: 16px; right: 16px; z-index: 1000"
    >
      <n-icon size="20">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 16.59L10.83 12L15.41 7.41L14 6L8 12L14 18L15.41 16.59Z" />
        </svg>
      </n-icon>
    </n-button>

    <!-- 侧边栏头部 -->
    <n-space
      justify="center"
      align="center"
      style="padding: 16px; border-bottom: 1px solid var(--n-border-color); flex-shrink: 0"
    >
      <span v-if="!collapsed" style="font-size: 18px; font-weight: 600">🍅 番茄主义</span>
      <span v-else style="font-size: 24px">🍅</span>
    </n-space>

    <!-- 主要功能按钮 -->
    <n-space vertical :size="12" style="padding: 16px; flex-shrink: 0">
      <n-tooltip trigger="hover" placement="right" :disabled="!collapsed">
        <template #trigger>
          <n-button
            @click="showAddTaskModal"
            type="info"
            size="large"
            block
            :render-icon="renderAddIcon"
          >
            <span v-if="!collapsed">新增任务</span>
          </n-button>
        </template>
        <span>新增任务</span>
      </n-tooltip>

      <n-tooltip trigger="hover" placement="right" :disabled="!collapsed">
        <template #trigger>
          <n-button
            @click="startInfiniteMode"
            type="error"
            size="large"
            block
            :render-icon="renderInfiniteIcon"
          >
            <span v-if="!collapsed">无限模式</span>
            <span v-else>♾</span>
          </n-button>
        </template>
        <span>无限模式</span>
      </n-tooltip>
    </n-space>

    <!-- 中间可滚动区域 -->
    <div style="flex: 1; overflow-y: auto; overflow-x: hidden">
      <n-space v-if="!collapsed" vertical :size="0">
        <!-- 任务分类过滤 -->
        <n-space vertical :size="0" style="padding: 16px; padding-bottom: 8px">
          <n-divider style="margin: 0 0 12px 0">任务分类</n-divider>
          <n-radio-group v-model:value="selectedCategory" name="taskCategory" style="width: 100%">
            <n-space vertical :size="8" style="width: 100%">
              <n-radio-button
                v-for="category in taskCategories"
                :key="category.value"
                :value="category.value"
                :disabled="category.count === 0"
                style="width: 100%; display: flex"
              >
                <n-space justify="space-between" align="center" style="width: 100%; flex: 1">
                  <span style="font-size: 13px; font-weight: 500">{{ category.label }}</span>
                  <n-tag :type="category.tagType" size="small" round>{{ category.count }}</n-tag>
                </n-space>
              </n-radio-button>
            </n-space>
          </n-radio-group>
        </n-space>

        <!-- 任务统计信息 -->
        <n-space vertical :size="0" style="padding: 16px; padding-top: 8px">
          <n-divider style="margin: 0 0 12px 0">任务统计</n-divider>
          <n-space vertical :size="8">
            <n-space justify="space-between" align="center">
              <span style="font-size: 14px">总任务</span>
              <n-tag type="info" size="small">{{ totalTasks }}</n-tag>
            </n-space>
            <n-space justify="space-between" align="center">
              <span style="font-size: 14px">未完成</span>
              <n-tag type="warning" size="small">{{ uncompletedTasksCount }}</n-tag>
            </n-space>
            <n-space justify="space-between" align="center">
              <span style="font-size: 14px">已完成</span>
              <n-tag type="success" size="small">{{ completedTasksCount }}</n-tag>
            </n-space>
          </n-space>
        </n-space>
      </n-space>
    </div>

    <!-- 底部容器 - 固定在最底部 -->
    <n-space
      vertical
      :size="12"
      style="
        padding: 16px;
        border-top: 1px solid var(--n-border-color);
        flex-shrink: 0;
        background: var(--n-color);
      "
    >
      <!-- 设置按钮 -->
      <n-tooltip trigger="hover" placement="right" :disabled="!collapsed">
        <template #trigger>
          <n-button
            @click="showSettings"
            quaternary
            size="large"
            block
            :render-icon="renderSettingsIcon"
          >
            <span v-if="!collapsed">设置</span>
          </n-button>
        </template>
        <span>设置</span>
      </n-tooltip>

      <!-- 关于按钮 -->
      <n-tooltip trigger="hover" placement="right" :disabled="!collapsed">
        <template #trigger>
          <n-button @click="showAbout" quaternary size="large" block :render-icon="renderHelpIcon">
            <span v-if="!collapsed">关于</span>
          </n-button>
        </template>
        <span>关于</span>
      </n-tooltip>
    </n-space>
  </n-layout-sider>

  <!-- 边栏收缩时的展开按钮 -->
  <n-button
    v-if="collapsed"
    quaternary
    size="large"
    @click="collapsed = false"
    style="position: fixed; top: 16px; left: 16px; z-index: 1001"
  >
    <n-icon size="20" style="transform: rotate(180deg)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.41 16.59L10.83 12L15.41 7.41L14 6L8 12L14 18L15.41 16.59Z" />
      </svg>
    </n-icon>
  </n-button>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import {
  NLayoutSider,
  NButton,
  NTooltip,
  NDivider,
  NTag,
  NIcon,
  NRadioGroup,
  NRadioButton,
  NSpace,
} from 'naive-ui'
import type { Task } from '@/utils/share_type'

// Props
const props = defineProps<{
  tasks: Task[]
  showAddTaskModal: () => void
  startInfiniteMode: () => void
}>()

// Emits
const emit = defineEmits<{
  'filter-change': [category: string]
}>()

// 响应式数据
const collapsed = ref(false)
const selectedCategory = ref('all')

// 任务分类配置
interface TaskCategory {
  value: string
  label: string
  priority: number
  tagType: 'error' | 'warning' | 'info' | 'success' | 'default'
  count: number
  filter: (task: Task) => boolean
}

// 计算每个分类的任务数量
const taskCategories = computed<TaskCategory[]>(() => {
  const categories = [
    {
      value: 'all',
      label: '全部',
      priority: 0,
      tagType: 'info' as const,
      filter: () => true,
    },
    {
      value: 'urgent-important',
      label: '紧急重要',
      priority: 4,
      tagType: 'error' as const,
      filter: (task: Task) => task.urgent && task.important,
    },
    {
      value: 'important-not-urgent',
      label: '重要不紧急',
      priority: 3,
      tagType: 'warning' as const,
      filter: (task: Task) => !task.urgent && task.important,
    },
    {
      value: 'urgent-not-important',
      label: '紧急不重要',
      priority: 2,
      tagType: 'warning' as const,
      filter: (task: Task) => task.urgent && !task.important,
    },
    {
      value: 'not-urgent-not-important',
      label: '不紧急不重要',
      priority: 1,
      tagType: 'default' as const,
      filter: (task: Task) => !task.urgent && !task.important,
    },
  ]

  // 计算每个分类的任务数量
  return categories.map((category) => ({
    ...category,
    count: props.tasks.filter((task) => !task.completed && category.filter(task)).length,
  }))
})

// 监听分类变化并通知父组件
import { watch } from 'vue'
watch(selectedCategory, (newValue) => {
  emit('filter-change', newValue)
})

// 计算属性
const totalTasks = computed(() => props.tasks.length)
const uncompletedTasksCount = computed(() => props.tasks.filter((task) => !task.completed).length)
const completedTasksCount = computed(() => props.tasks.filter((task) => task.completed).length)

// 图标渲染函数
const renderAddIcon = () => {
  return h('div', { style: 'display: flex; align-items: center; justify-content: center;' }, [
    h('svg', { width: '20', height: '20', viewBox: '0 0 24 24' }, [
      h('path', {
        fill: 'currentColor',
        d: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
      }),
    ]),
  ])
}

const renderInfiniteIcon = () => {
  return h('div', { style: 'display: flex; align-items: center; justify-content: center;' }, [
    h('span', { style: 'font-size: 18px;' }, '♾'),
  ])
}

const renderSettingsIcon = () => {
  return h('div', { style: 'display: flex; align-items: center; justify-content: center;' }, [
    h('svg', { width: '20', height: '20', viewBox: '0 0 24 24' }, [
      h('path', {
        fill: 'currentColor',
        d: 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z',
      }),
    ]),
  ])
}

const renderHelpIcon = () => {
  return h('div', { style: 'display: flex; align-items: center; justify-content: center;' }, [
    h('svg', { width: '20', height: '20', viewBox: '0 0 24 24' }, [
      h('path', {
        fill: 'currentColor',
        d: '11,18H13V8H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z',
      }),
    ]),
  ])
}

// 方法
const showSettings = () => {
  console.log('显示设置')
  // TODO: 实现设置功能
}

const showAbout = () => {
  console.log('显示关于')
  // TODO: 实现关于功能
}
</script>

<style scoped>
/* 单选按钮样式 */
:deep(.n-radio-button) {
  width: 100%;
}

:deep(.n-radio-button .n-radio-button__state-border) {
  border-radius: 6px;
  width: 100%;
}

:deep(.n-radio-button__label) {
  width: 100%;
}
</style>
