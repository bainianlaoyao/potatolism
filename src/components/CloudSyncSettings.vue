<template>
  <div class="cloud-sync-settings">
    <!-- 设置页面头部 -->
    <div class="settings-header">
      <h2>☁️ 云端同步设置</h2>
      <p class="settings-description">
        配置云端同步功能，在多设备间同步您的任务数据
      </p>
    </div>

    <!-- 云同步开关 -->
    <div class="setting-section">
      <div class="section-title">
        <span>启用云同步</span>
        <n-switch
          v-model:value="cloudSyncEnabled"
          @update:value="onCloudSyncToggle"
        />
      </div>
      <p class="section-description">
        启用后，您的任务数据将自动同步到云端
      </p>
    </div>

    <!-- 配置区域（仅在启用时显示） -->
    <div v-if="cloudSyncEnabled" class="config-section">
      <!-- 服务器地址配置 -->
      <div class="setting-item">
        <label class="setting-label">服务器地址</label>
        <n-input
          v-model:value="baseUrl"
          placeholder="请输入服务器地址，如：http://localhost:3000"
          :disabled="isSyncing"
          @blur="validateBaseUrl"
        />
        <p class="setting-help">
          请输入您的云端服务器地址
        </p>
      </div>

      <!-- Token配置 -->
      <div class="setting-item">
        <label class="setting-label">访问令牌</label>
        <div class="token-display">
          <n-input
            v-model:value="token"
            placeholder="请输入您的访问令牌"
            :disabled="isSyncing"
            type="password"
          />
          <n-button
            @click="generateNewToken"
            size="small"
            :disabled="isSyncing"
          >
            重新生成
          </n-button>
        </div>
        <p class="setting-help">
          令牌用于标识您的设备，请妥善保存
        </p>
      </div>

      <!-- Token显示和复制 -->
      <div v-if="token" class="token-info">
        <n-card size="small" class="token-card">
          <div class="token-content">
            <span class="token-label">当前令牌：</span>
            <code class="token-value">{{ token }}</code>
            <n-button
              @click="copyToken"
              size="tiny"
              quaternary
              :disabled="isSyncing"
            >
              复制
            </n-button>
          </div>
        </n-card>
      </div>
    </div>

    <!-- 同步状态 -->
    <div v-if="cloudSyncEnabled" class="sync-status-section">
      <div class="section-title">
        <span>同步状态</span>
        <div class="status-indicators">
          <n-tag
            :type="syncStatusTagType"
            size="small"
          >
            {{ syncStatusText }}
          </n-tag>
          <n-tag
            v-if="isOnline"
            type="success"
            size="small"
          >
            在线
          </n-tag>
          <n-tag
            v-else
            type="warning"
            size="small"
          >
            离线
          </n-tag>
        </div>
      </div>

      <div class="status-details">
        <div class="status-item">
          <span class="status-label">最后同步时间：</span>
          <span class="status-value">{{ lastSyncTimeText }}</span>
        </div>
        <div v-if="pendingChangesCount > 0" class="status-item">
          <span class="status-label">待同步变更：</span>
          <span class="status-value">{{ pendingChangesCount }} 项</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="sync-actions">
        <n-button
          @click="manualSync"
          type="primary"
          :loading="isSyncing"
          :disabled="!isOnline || !isConfigured"
        >
          {{ isSyncing ? '同步中...' : '立即同步' }}
        </n-button>
        <n-button
          @click="testConnection"
          secondary
          :disabled="!isConfigured || isSyncing"
        >
          测试连接
        </n-button>
        <n-button
          @click="clearLocalData"
          quaternary
          type="error"
          :disabled="isSyncing"
        >
          清除本地数据
        </n-button>
      </div>
    </div>

    <!-- 帮助信息 -->
    <div class="help-section">
      <h4>使用说明</h4>
      <ul class="help-list">
        <li>云同步功能使用Token认证，无需账号密码</li>
        <li>每个Token对应一个独立的数据空间，确保数据安全</li>
        <li>同步时会自动合并本地和云端的数据</li>
        <li>如需在其他设备使用，请在新设备上输入相同的Token</li>
      </ul>
    </div>

    <!-- 消息提示 -->
    <n-message-provider>
      <n-message
        v-if="message"
        :type="messageType"
        :content="message"
      />
    </n-message-provider>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTasksStore } from '@/stores/tasksStore'
import {
  NSwitch,
  NInput,
  NButton,
  NCard,
  NTag,
  useMessage,
  NMessageProvider
} from 'naive-ui'

// Props（保留类型提示，当前未使用）
defineProps<{ onClose?: () => void }>()

// 响应式数据
const cloudSyncEnabled = ref(false)
const baseUrl = ref('')
const token = ref('')
const isSyncing = ref(false)
const isOnline = ref(navigator.onLine)
const lastSyncTime = ref<number | null>(null)
const pendingChangesCount = ref(0)
const syncStatus = ref<'idle' | 'syncing' | 'error' | 'success'>('idle')
const message = ref('')
const messageType = ref<'success' | 'error' | 'warning' | 'info'>('info')

// 计算属性
const isConfigured = computed(() => {
  return baseUrl.value.trim() && token.value.trim()
})

const syncStatusText = computed(() => {
  switch (syncStatus.value) {
    case 'idle':
      return '待机中'
    case 'syncing':
      return '同步中'
    case 'error':
      return '同步失败'
    case 'success':
      return '同步成功'
    default:
      return '未知状态'
  }
})

const syncStatusTagType = computed(() => {
  switch (syncStatus.value) {
    case 'idle':
      return 'default'
    case 'syncing':
      return 'info'
    case 'error':
      return 'error'
    case 'success':
      return 'success'
    default:
      return 'default'
  }
})

const lastSyncTimeText = computed(() => {
  if (!lastSyncTime.value) {
    return '从未同步'
  }
  const date = new Date(lastSyncTime.value)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) { // 1天内
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    return date.toLocaleDateString()
  }
})

// 消息提示
const messageApi = useMessage()

// 加载配置
const loadSettings = () => {
  try {
    const settings = localStorage.getItem('cloudSyncSettings')
    if (settings) {
      const parsed = JSON.parse(settings)
      cloudSyncEnabled.value = parsed.enabled || false
      baseUrl.value = parsed.baseUrl || ''
      token.value = parsed.token || ''
      lastSyncTime.value = parsed.lastSyncTime || null
    }
  } catch (e) {
    console.error('加载设置失败:', e)
  }
}

// 保存配置
const saveSettings = () => {
  try {
    const settings = {
      enabled: cloudSyncEnabled.value,
      baseUrl: baseUrl.value.trim(),
      token: token.value.trim(),
      lastSyncTime: lastSyncTime.value
    }
    localStorage.setItem('cloudSyncSettings', JSON.stringify(settings))
  } catch (e) {
    console.error('保存设置失败:', e)
  }
}

// 验证服务器地址
const validateBaseUrl = () => {
  if (!baseUrl.value.trim()) {
    return
  }

  try {
    new URL(baseUrl.value)
  } catch {
    messageApi.warning('请输入有效的服务器地址')
  }
}

// 云同步开关变化
const onCloudSyncToggle = (enabled: boolean) => {
  if (!enabled) {
    // 关闭云同步时，显示确认对话框
    messageApi.info('已关闭云同步功能')
  } else {
    // 开启云同步时，提示用户配置
    if (!isConfigured.value) {
      messageApi.info('请配置服务器地址和Token以启用云同步')
    }
  }
  saveSettings()
}

// 生成新Token
const generateNewToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  token.value = result
  saveSettings()
  messageApi.success('已生成新的访问令牌')
}

// 复制Token
const copyToken = async () => {
  try {
    await navigator.clipboard.writeText(token.value)
    messageApi.success('Token已复制到剪贴板')
  } catch {
    messageApi.error('复制失败，请手动复制')
  }
}

// 手动同步
const manualSync = async () => {
  if (!isConfigured.value) {
    messageApi.warning('请先配置服务器地址和Token')
    return
  }

  if (!isOnline.value) {
    messageApi.warning('当前离线，无法执行同步')
    return
  }

  isSyncing.value = true
  syncStatus.value = 'syncing'

  try {
    // 调用后端同步接口
    const resp = await fetch(`${baseUrl.value.replace(/\/$/, '')}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': token.value.trim(),
      },
      body: JSON.stringify({ tasks: JSON.parse(localStorage.getItem('potato_tasks') || '[]') }),
    })

    if (!resp.ok) throw new Error('sync failed')
  const data = await resp.json()

  // 更新 Pinia 中的任务数据
  const tasksStore = useTasksStore()
  tasksStore.tasks = Array.isArray(data.tasks) ? data.tasks : []

    lastSyncTime.value = Date.now()
    syncStatus.value = 'success'
    messageApi.success('同步完成')
    saveSettings()
  } catch {
    syncStatus.value = 'error'
    messageApi.error('同步失败，请检查网络或配置')
  } finally {
    isSyncing.value = false
  }
}

// 测试连接
const testConnection = async () => {
  if (!isConfigured.value) {
    messageApi.warning('请先配置服务器地址和Token')
    return
  }

  try {
    const url = `${baseUrl.value.replace(/\/$/, '')}/health`
    const response = await fetch(url, {
      headers: {
        'X-Token': token.value.trim(),
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      messageApi.success('连接测试成功')
    } else {
      messageApi.error('连接测试失败，请检查配置')
    }
  } catch {
    messageApi.error('无法连接到服务器，请检查网络和配置')
  }
}

// 清除本地数据
const clearLocalData = () => {
  messageApi.info('此功能将清除本地任务数据，请谨慎操作')
}

// 监听网络状态变化
const handleOnline = () => {
  isOnline.value = true
  messageApi.success('网络连接已恢复')
}

const handleOffline = () => {
  isOnline.value = false
  messageApi.warning('网络连接已断开')
}

// 生命周期
onMounted(() => {
  loadSettings()

  // 监听网络状态
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})
</script>

<style scoped>
.cloud-sync-settings {
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
}

.settings-header {
  text-align: center;
  margin-bottom: 32px;
}

.settings-header h2 {
  margin: 0 0 8px 0;
  color: var(--n-text-color);
}

.settings-description {
  color: var(--n-text-color-disabled);
  margin: 0;
}

.setting-section,
.config-section,
.sync-status-section {
  margin-bottom: 32px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 500;
}

.section-description {
  color: var(--n-text-color-disabled);
  font-size: 14px;
  margin: 0;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--n-text-color);
}

.setting-help {
  color: var(--n-text-color-disabled);
  font-size: 12px;
  margin: 4px 0 0 0;
}

.token-display {
  display: flex;
  gap: 8px;
  align-items: center;
}

.token-display .n-input {
  flex: 1;
}

.token-info {
  margin-top: 16px;
}

.token-card {
  background: var(--n-card-color);
}

.token-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.token-label {
  font-weight: 500;
  white-space: nowrap;
}

.token-value {
  background: var(--n-code-color);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-indicators {
  display: flex;
  gap: 8px;
  align-items: center;
}

.status-details {
  margin: 16px 0;
  padding: 16px;
  background: var(--n-card-color);
  border-radius: 6px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  color: var(--n-text-color-disabled);
}

.status-value {
  color: var(--n-text-color);
  font-weight: 500;
}

.sync-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.help-section {
  margin-top: 32px;
  padding: 20px;
  background: var(--n-card-color);
  border-radius: 6px;
}

.help-section h4 {
  margin: 0 0 12px 0;
  color: var(--n-text-color);
}

.help-list {
  margin: 0;
  padding-left: 20px;
  color: var(--n-text-color-disabled);
}

.help-list li {
  margin-bottom: 6px;
  line-height: 1.5;
}

.help-list li:last-child {
  margin-bottom: 0;
}
</style>
