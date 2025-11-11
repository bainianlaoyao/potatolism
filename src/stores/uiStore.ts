import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Store 热重载支持
if (import.meta.hot) {
  import.meta.hot.accept()
}

export type ThemeMode = 'light' | 'dark'
export type AnimationSpeed = 'slow' | 'normal' | 'fast'
export type TransitionType = 'slide' | 'fade' | 'bounce'

export interface UIConfig {
  theme: ThemeMode
  animationSpeed: AnimationSpeed
  transitionType: TransitionType
  soundEnabled: boolean
  autoSave: boolean
  showCompletedTasks: boolean
  compactMode: boolean
}

export const useUIStore = defineStore('ui', () => {
  // 状态
  const theme = ref<ThemeMode>('dark')
  const animationSpeed = ref<AnimationSpeed>('normal')
  const transitionType = ref<TransitionType>('slide')
  const soundEnabled = ref(true)
  const autoSave = ref(true)
  const showCompletedTasks = ref(false)
  const compactMode = ref(false)
  const sidebarCollapsed = ref(false)
  const modalVisible = ref({
    addTask: false,
    editTask: false,
    settings: false
  })

  // 计算属性
  const isDarkTheme = computed(() => theme.value === 'dark')

  const animationDuration = computed(() => {
    switch (animationSpeed.value) {
      case 'slow': return '0.5s'
      case 'fast': return '0.2s'
      default: return '0.3s'
    }
  })

  const transitionDuration = computed(() => {
    switch (animationSpeed.value) {
      case 'slow': return '0.4s'
      case 'fast': return '0.15s'
      default: return '0.25s'
    }
  })

  const transitionClass = computed(() => {
    return `transition-${transitionType.value}`
  })

  // 数据持久化
  const saveToLocalStorage = () => {
    try {
      const config: UIConfig = {
        theme: theme.value,
        animationSpeed: animationSpeed.value,
        transitionType: transitionType.value,
        soundEnabled: soundEnabled.value,
        autoSave: autoSave.value,
        showCompletedTasks: showCompletedTasks.value,
        compactMode: compactMode.value
      }
      localStorage.setItem('potato_ui_config', JSON.stringify(config))
    } catch (error) {
      console.error('保存UI配置失败:', error)
    }
  }

  const loadFromLocalStorage = () => {
    try {
      const savedConfig = localStorage.getItem('potato_ui_config')
      if (savedConfig) {
        const config: UIConfig = JSON.parse(savedConfig)
        theme.value = config.theme
        animationSpeed.value = config.animationSpeed
        transitionType.value = config.transitionType
        soundEnabled.value = config.soundEnabled
        autoSave.value = config.autoSave
        showCompletedTasks.value = config.showCompletedTasks
        compactMode.value = config.compactMode
      }
    } catch (error) {
      console.error('加载UI配置失败:', error)
    }
  }

  // 主题控制
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  const setTheme = (newTheme: ThemeMode) => {
    theme.value = newTheme
  }

  // 动画控制
  const setAnimationSpeed = (speed: AnimationSpeed) => {
    animationSpeed.value = speed
  }

  const setTransitionType = (type: TransitionType) => {
    transitionType.value = type
  }

  // 功能开关
  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
  }

  const toggleAutoSave = () => {
    autoSave.value = !autoSave.value
  }

  const toggleShowCompleted = () => {
    showCompletedTasks.value = !showCompletedTasks.value
  }

  const toggleCompactMode = () => {
    compactMode.value = !compactMode.value
  }

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // 模态框控制
  const showModal = (modalName: keyof typeof modalVisible.value) => {
    // 关闭其他模态框
    Object.keys(modalVisible.value).forEach(key => {
      if (key !== modalName) {
        modalVisible.value[key as keyof typeof modalVisible.value] = false
      }
    })
    modalVisible.value[modalName] = true
  }

  const hideModal = (modalName: keyof typeof modalVisible.value) => {
    modalVisible.value[modalName] = false
  }

  const hideAllModals = () => {
    Object.keys(modalVisible.value).forEach(key => {
      modalVisible.value[key as keyof typeof modalVisible.value] = false
    })
  }

  // 响应式控制
  const getResponsiveValue = <T>(mobile: T, tablet: T, desktop: T): T => {
    if (typeof window === 'undefined') return desktop

    const width = window.innerWidth
    if (width < 768) return mobile
    if (width < 1024) return tablet
    return desktop
  }

  const isMobile = computed(() => getResponsiveValue(true, false, false))
  const isTablet = computed(() => getResponsiveValue(false, true, false))
  const isDesktop = computed(() => getResponsiveValue(false, false, true))

  // 初始化
  const initializeStore = () => {
    loadFromLocalStorage()
  }

  // 重置为默认配置
  const resetToDefaults = () => {
    theme.value = 'dark'
    animationSpeed.value = 'normal'
    transitionType.value = 'slide'
    soundEnabled.value = true
    autoSave.value = true
    showCompletedTasks.value = false
    compactMode.value = false
    sidebarCollapsed.value = false
    hideAllModals()
  }

  // 导出配置
  const exportConfig = (): UIConfig => {
    return {
      theme: theme.value,
      animationSpeed: animationSpeed.value,
      transitionType: transitionType.value,
      soundEnabled: soundEnabled.value,
      autoSave: autoSave.value,
      showCompletedTasks: showCompletedTasks.value,
      compactMode: compactMode.value
    }
  }

  // 导入配置
  const importConfig = (config: UIConfig) => {
    theme.value = config.theme
    animationSpeed.value = config.animationSpeed
    transitionType.value = config.transitionType
    soundEnabled.value = config.soundEnabled
    autoSave.value = config.autoSave
    showCompletedTasks.value = config.showCompletedTasks
    compactMode.value = config.compactMode
  }

  return {
    // 状态
    theme,
    animationSpeed,
    transitionType,
    soundEnabled,
    autoSave,
    showCompletedTasks,
    compactMode,
    sidebarCollapsed,
    modalVisible,

    // 计算属性
    isDarkTheme,
    animationDuration,
    transitionDuration,
    transitionClass,
    isMobile,
    isTablet,
    isDesktop,

    // 初始化
    initializeStore,
    resetToDefaults,

    // 主题控制
    toggleTheme,
    setTheme,

    // 动画控制
    setAnimationSpeed,
    setTransitionType,

    // 功能开关
    toggleSound,
    toggleAutoSave,
    toggleShowCompleted,
    toggleCompactMode,
    toggleSidebar,

    // 模态框控制
    showModal,
    hideModal,
    hideAllModals,

    // 工具方法
    getResponsiveValue,
    saveToLocalStorage,
    loadFromLocalStorage,
    exportConfig,
    importConfig
  }
})
