<template>
  <!-- <div class="fullscreen-container"> -->
  <div class="pomodoro-content">
    <!-- <div class="pomodoro-header">
          <h1 class="pomodoro-title">Pomodoro Timer</h1>
        </div> -->
    <n-h1>
      {{ config.task.name }}
    </n-h1>
    <div class="timer-display">
      <div :style="timerContainerStyle">
        <vue-countdown
          ref="countdownRef"
          :time="currentModeTime"
          @end="onEnd"
          v-slot="{ totalMilliseconds, minutes, seconds }"
          v-if="countdown_start"
        >
          <n-progress
            type="circle"
            :percentage="
              config.task.time_up
                ? 100
                : Math.round(
                    (() => {
                      // 计算已完成阶段的总时间（分钟）
                      const completedTime = config.task.cycleList
                        .slice(0, config.task.progress)
                        .reduce((sum, [time]) => sum + time, 0)

                      // 当前阶段已完成的时间（分钟）
                      const currentCompletedTime =
                        (currentModeTime - totalMilliseconds) / (60 * 1000)

                      // 总时间（分钟）
                      const totalTime = config.task.cycleList.reduce((sum, [time]) => sum + time, 0)

                      // 计算进度百分比
                      return ((completedTime + currentCompletedTime) / totalTime) * 100
                    })(),
                  )
            "
            :color="modeColor"
            rail-style="{ stroke: '#18181b' }"
            :stroke-width="strokeWidth"
            :style="`transform: scale(${timerSize});transform-origin: center center;`"
          >
            <div class="timer-text">
              <span class="time" v-if="!config.task.time_up"
                >{{ minutes.toString().padStart(2, '0') }}:{{
                  seconds.toString().padStart(2, '0')
                }}</span
              >
              <div v-else>Complete!</div>
            </div>
          </n-progress>
        </vue-countdown>
      </div>
    </div>

    <div class="controls-container">
      <div class="timer-controls">
        <n-space>
          <!-- <n-button type="primary" size="large" @click="toggleTimer" class="control-button">
            {{ isRunning ? 'Pause' : 'Start' }}
          </n-button> -->
          <n-button
            type="default"
            size="large"
            @click="() => appMethods?.task_quit(config.task)"
            class="control-button"
          >
            quit
          </n-button>
          <n-button type="default" size="large" @click="debugEndTimer" class="control-button">
            Debug End
          </n-button>
        </n-space>
      </div>
    </div>
  </div>

  <!-- </div> -->
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount, onMounted, inject } from 'vue'
import { NButton, NSpace, NProgress, NH1 } from 'naive-ui'
import VueCountdown from '@chenfengyuan/vue-countdown'
import type { Task } from '@/utils/share_type'
import { default_task } from '@/utils/share_type'
import { useTasksStore } from '@/stores/tasksStore'
// import { defineEmits, defineExpose } from 'vue'
// 删除原 props 定义，使用 config 代替

const tasksStore = useTasksStore()

const config = reactive({
  task: default_task as Task,
  infinite: false,
})

// 使用 inject 获取父组件提供的方法
const appMethods = inject<{
  task_start: (task: Task, infinite: boolean) => void
  task_quit: (task: Task) => void
  restartClock: () => void
}>('appMethods')
// 新状态：使用cycleList进行周期遍历
const isRunning = ref(false)
const timerSize = ref(1.5)
const strokeWidth = ref(5)
const baseSize = ref(120)
const countdownRef = ref<InstanceType<typeof VueCountdown> | null>(null)
const countdown_start = ref(false)

// 音频配置
const soundEnabled = ref(true)
const sounds = reactive({
  focus: new Audio('/sounds/focus-start.mp3'),
  rest: new Audio('/sounds/rest-start.mp3'),
  complete: new Audio('/sounds/complete.mp3'),
})

// 设置音量
Object.values(sounds).forEach((audio) => {
  audio.volume = 0.7
})

// 音频控制函数
const playSound = async (soundType: 'focus' | 'rest' | 'complete') => {
  if (!soundEnabled.value) return
  return new Promise<void>((resolve) => {
    const audio = sounds[soundType]
    audio.currentTime = 0 // 重置音频播放位置
    audio.play()
    audio.onended = () => {
      resolve()
    }
  })
}

// 计算属性：当前周期时间（毫秒）、标签及颜色
const currentModeTime = computed(() => {
  // Check if progress is within bounds
  return config.task.cycleList[config.task.progress][0] * 60 * 1000
})
const currentModeLabel = computed(() => config.task.cycleList[config.task.progress][1])
const modeColor = computed(() => {
  const label = currentModeLabel.value.toLowerCase()
  if (label === 'focus' || label === 'focaus') return '#0ea5e9'
  if (label === 'rest') return '#10b981'
  return '#8b5cf6'
})

const timerContainerStyle = computed(() => {
  const scaledSize = baseSize.value * timerSize.value
  return {
    width: `${scaledSize}px`,
    height: `${scaledSize}px`,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }
})

// 修改后的onEnd：遍历cycleList，遍历完毕后emit事件并重置序号

// First add this function at the top level of the script setup
const nextStage = async () => {
  // 播放当前阶段完成的声音
  if (config.task.progress == config.task.cycleList.length - 1) {
    return
  }

  if (config.infinite) {
    // 无限模式下在 focus 和 rest 之间切换
    const newProgress = config.task.progress === 0 ? 1 : 0
    tasksStore.updateTaskProperty(config.task.id, 'progress', newProgress)
    config.task.progress = newProgress // 同步本地状态

    // 播放新阶段开始的声音
    await playSound(newProgress === 0 ? 'focus' : 'rest')
  } else {
    const newProgress = config.task.progress + 1
    tasksStore.updateTaskProperty(config.task.id, 'progress', newProgress)
    config.task.progress = newProgress // 同步本地状态

    if (newProgress == config.task.cycleList.length - 1) {
      tasksStore.updateTaskProperty(config.task.id, 'time_up', true)
      config.task.time_up = true // 同步本地状态

      await playSound('complete')
      appMethods?.task_quit(config.task)
      console.log('Cycle complete!')
      countdown_start.value = false
      return
    }
    countdownRef.value?.restart()
    isRunning.value = true

    // 根据当前阶段标签播放相应的声音
    const nextModeLabel = config.task.cycleList[newProgress][1].toLowerCase()
    if (nextModeLabel.includes('focus')) {
      await playSound('focus')
    } else if (nextModeLabel.includes('rest')) {
      await playSound('rest')
    }
  }
}

// Then modify the onEnd function to simply call nextStage
const onEnd = () => {
  nextStage()
}

const resetTimer = () => {
  countdownRef.value?.restart()
  isRunning.value = true
}

const debugEndTimer = () => {
  countdownRef.value?.pause()
  onEnd()
}

const updateTimerSize = () => {
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  const minDimension = Math.min(viewportHeight, viewportWidth)
  timerSize.value = (minDimension * 0.6) / 100
  strokeWidth.value = timerSize.value * 0.7
}

// 响应式尺寸调整
onMounted(() => {
  updateTimerSize()
  window.addEventListener('resize', updateTimerSize)
  // 预加载音频
  Object.values(sounds).forEach((audio) => {
    audio.load()
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateTimerSize)
  // 清理音频资源
  Object.values(sounds).forEach((audio) => {
    audio.onended = null
    audio.pause()
  })
})

// 新增 setConfig 函数并暴露给外部
const setConfig = (newConfig: Partial<{ task: Task; infinite: boolean }>) => {
  // isRunning.value = false
  if (newConfig.task) {
    config.task = newConfig.task
  }
  if (typeof newConfig.infinite !== 'undefined') {
    config.infinite = newConfig.infinite
  }
  console.log('Task 全部信息:', config.task)
  countdown_start.value = true
  countdownRef.value?.restart()
}

defineExpose({ setConfig, resetTimer })
</script>

<style scoped>
.fullscreen-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #121214;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.pomodoro-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 1rem;
}

.pomodoro-header {
  width: 100%;
  text-align: center;
  padding-top: 1rem;
  flex-shrink: 0;
}

.pomodoro-title {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  color: #ffffff;
  margin: 0;
  opacity: 0.8;
}

.timer-display {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 1rem;
}

.timer-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.time {
  font-size: clamp(0.5rem, 5vw, 1rem);
  font-weight: bold;
  line-height: 1;
}

.mode-label {
  font-size: clamp(1.2rem, 3vw, 2rem);
  margin-top: 1rem;
  opacity: 0.8;
}

.controls-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1.5rem;
  flex-shrink: 0;
}

.mode-buttons {
  display: flex;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.timer-controls {
  display: flex;
  justify-content: center;
}

.control-button {
  font-size: 1.2rem;
  padding: 0.5rem 1.5rem;
}

/* Responsive adjustments */
@media (max-height: 700px) {
  .pomodoro-header {
    padding-top: 0.5rem;
  }

  .controls-container {
    padding-bottom: 0.5rem;
  }

  .time {
    font-size: clamp(2rem, 8vw, 5rem);
  }

  .mode-label {
    font-size: clamp(1rem, 2vw, 1.5rem);
    margin-top: 0.5rem;
  }
}

@media (max-width: 600px) {
  .mode-buttons .n-space {
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-button {
    font-size: 1rem;
    padding: 0.4rem 1.2rem;
  }
}

.sound-control {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}
</style>
