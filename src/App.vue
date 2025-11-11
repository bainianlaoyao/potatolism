<script setup lang="ts">
import { NMessageProvider, NConfigProvider, darkTheme, NGlobalStyle } from 'naive-ui'
import { ref, watch, provide } from 'vue'
import potato_clock from './components/potato_clock.vue'
import misson_l from './components/misson_l.vue'
import NintendoSwitchTransition from './components/NintendoSwitchTransition.vue'
import type { Task } from '@/utils/share_type'
import { default_task } from '@/utils/share_type'
import hover_card from './components/hover_card.vue'
const transitionRef = ref<InstanceType<typeof NintendoSwitchTransition>>()
const clockRef = ref<InstanceType<typeof potato_clock>>()
const clockKey = ref(0)

// 防抖保存函数
let saveTimeout: number | null = null
const debouncedSave = (data: Task[]) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem('potato_tasks', JSON.stringify(data))
    } catch (error) {
      console.error('保存任务数据失败:', error)
    }
  }, 500) // 500ms 防抖
}

// 加载保存的任务数据或使用默认值
const loadTasks = (): Task[] => {
  try {
    const savedTasks = localStorage.getItem('potato_tasks')
    return savedTasks ? JSON.parse(savedTasks) : [default_task]
  } catch (error) {
    console.error('加载任务数据失败:', error)
    return [default_task]
  }
}

// 全局任务列表
const tasks = ref<Task[]>(loadTasks())

// 监听任务变化，防抖保存到localStorage
watch(
  tasks,
  (newTasks) => {
    debouncedSave(newTasks)
  },
  { deep: true },
)

// 提供给子组件的方法
const appMethods = {
  task_start: (task: Task, infinite: boolean) => {
    console.log('Task 全部信息:', JSON.stringify(task, null, 2))

    clockRef.value?.setConfig({ task: task, infinite: infinite })
    transitionRef.value?.transitionTo('right', 2)
    clockRef.value?.resetTimer()
  },
  task_quit: (task: Task) => {
    //check complete
    if (task.progress == task.cycleList.length - 1) {
      //complete
      console.log('complete')
      transitionRef.value?.transitionTo('left', 1)
    } else {
      //quit
      console.log('quit')
      transitionRef.value?.transitionTo('left', 1)
    }
  },
  restartClock: () => {
    clockKey.value++
  },
}

// 使用 provide 提供方法给子组件
provide('appMethods', appMethods)

// onMounted(() => {
//   transitionRef.value?.transitionTo('right', 1)
//   console.log('App mounted!')
// })
</script>

<template>
  <n-config-provider :theme="darkTheme">
    <!-- 新增：使用暗黑主题 -->
    <n-message-provider>
      <NintendoSwitchTransition ref="transitionRef" class="full-screen" :slotCount="5">
        <template #slot1>
          <!-- 修改：通过 v-model:tasks 双向绑定任务 -->
          <misson_l v-model:tasks="tasks" />
        </template>
        <template #slot2>
          <potato_clock ref="clockRef" />
        </template>
        <template #slot3>
          <hover_card style="height: 100%" />
        </template>
        <!-- <potato_clock  /> -->
        <!-- <misson_list /> -->
        <!-- <misson_l /> -->
      </NintendoSwitchTransition>
    </n-message-provider>
    <NGlobalStyle />
  </n-config-provider>
  <!-- <header>
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <HelloWorld msg="You did it!" />

      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView /> -->
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}
.full-screen {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
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
