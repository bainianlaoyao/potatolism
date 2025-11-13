<template>
  <div class="settings-container">
    <n-card title="云端同步" class="sync-settings-card">
      <n-form-item label="启用云端同步">
        <n-switch v-model:value="syncEnabled" />
      </n-form-item>

      <div v-if="syncEnabled" class="sync-config">
        <n-form-item label="访问令牌">
          <n-input
            v-model:value="syncConfig.token"
            type="password"
            placeholder="输入您的访问令牌"
            show-password-on="click"
          />
          <n-button @click="generateToken" size="small">生成新令牌</n-button>
        </n-form-item>

        <n-form-item label="服务器地址">
          <n-input
            v-model:value="syncConfig.baseUrl"
            placeholder="http://localhost:3000"
          />
        </n-form-item>

        <n-form-item label="同步状态">
          <n-space align="center">
            <n-tag :type="syncStatusType" size="small">
              {{ syncStatusText }}
            </n-tag>
            <n-button @click="testConnection" size="small">测试连接</n-button>
            <n-button type="primary" @click="performSync" size="small">立即同步</n-button>
          </n-space>
        </n-form-item>

        <n-form-item label="最后同步" v-if="syncConfig.lastSync">
          <n-text depth="3">{{ formatLastSyncTime(syncConfig.lastSync) }}</n-text>
        </n-form-item>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useTasksStore } from '@/stores/tasksStore';
import { NCard, NFormItem, NSwitch, NInput, NButton, NSpace, NTag, NText, useMessage } from 'naive-ui';

const tasksStore = useTasksStore();
const message = useMessage();

const syncEnabled = ref(false);
const syncConfig = ref({
  token: '',
  baseUrl: 'http://localhost:3000',
  lastSync: 0,
});
const syncStatus = ref('idle'); // idle/syncing/synced/error

const syncStatusText = computed(() => {
  const statusMap: { [key: string]: string } = {
    idle: '未同步',
    syncing: '同步中...',
    synced: '已同步',
    error: '同步失败',
  };
  return statusMap[syncStatus.value] || '未知状态';
});

const syncStatusType = computed(() => {
  const typeMap: { [key: string]: 'default' | 'warning' | 'success' | 'error' } = {
    idle: 'default',
    syncing: 'warning',
    synced: 'success',
    error: 'error',
  };
  return typeMap[syncStatus.value] || 'default';
});

// 统一与 utils/cloudSync.ts 的配置来源，避免两个不同的本地存储键导致混乱
const SETTINGS_KEY = 'cloudSyncSettings';

// 兼容旧键，读写时一并维护，防止已有用户数据丢失
const LEGACY_SETTINGS_KEY = 'potato_sync_settings';

const saveSettings = () => {
  // 与 cloudSync.ts 期望的结构保持一致
  const unified = {
    enabled: syncEnabled.value,
    baseUrl: syncConfig.value.baseUrl,
    token: syncConfig.value.token,
    lastSyncTime: syncConfig.value.lastSync || null,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(unified));

  // 同步写入旧结构，便于回退/兼容
  const legacy = {
    syncEnabled: syncEnabled.value,
    syncConfig: { ...syncConfig.value },
  };
  localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(legacy));
};

const loadSettings = () => {
  // 优先读取统一配置
  const savedUnified = localStorage.getItem(SETTINGS_KEY);
  if (savedUnified) {
    try {
      const parsed = JSON.parse(savedUnified);
      syncEnabled.value = !!parsed.enabled;
      syncConfig.value = {
        token: String(parsed.token || ''),
        baseUrl: String(parsed.baseUrl || 'http://localhost:3000'),
        lastSync: parsed.lastSyncTime ? Number(parsed.lastSyncTime) : 0,
      };
      return;
    } catch {
      console.error('加载统一同步设置失败:');
    }
  }

  // 回退读取旧结构
  const savedLegacy = localStorage.getItem(LEGACY_SETTINGS_KEY);
  if (savedLegacy) {
    try {
      const parsed = JSON.parse(savedLegacy);
      syncEnabled.value = parsed.syncEnabled || false;
      syncConfig.value = parsed.syncConfig || {
        token: '',
        baseUrl: 'http://localhost:3000',
        lastSync: 0,
      };
    } catch {
      console.error('加载旧版同步设置失败:');
    }
  }
};

watch(
  () => [syncEnabled.value, syncConfig.value],
  () => {
    saveSettings();
  },
  { deep: true }
);

onMounted(() => {
  loadSettings();
  if (syncEnabled.value && syncConfig.value.token) {
    testConnection();
  }
});

onUnmounted(() => {
  saveSettings();
});

const performSync = async () => {
  if (!syncEnabled.value) return;
  if (!syncConfig.value.token || !syncConfig.value.baseUrl) {
    message.warning('请配置同步参数');
    return;
  }

  syncStatus.value = 'syncing';

  try {
    const response = await fetch(`${syncConfig.value.baseUrl}/sync`, {
      method: 'POST',
      headers: {
        'X-Token': syncConfig.value.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tasks: tasksStore.tasks }),
    });

    if (response.ok) {
      const data = await response.json();
      tasksStore.tasks = data.tasks;
      syncConfig.value.lastSync = Date.now();
      syncStatus.value = 'synced';
      message.success('同步成功');
    } else {
      syncStatus.value = 'error';
      message.error('同步失败');
    }
  } catch {
    syncStatus.value = 'error';
    message.error('网络错误');
  }
};

const testConnection = async () => {
  if (!syncConfig.value.baseUrl) {
    message.warning('请输入服务器地址');
    return;
  }

  try {
    const response = await fetch(`${syncConfig.value.baseUrl}/health`, {
      method: 'GET',
      // /health 不需要认证，避免默认 token 干扰排查
    });

    if (response.ok) {
      message.success('连接成功');
    } else {
      message.error('连接失败');
    }
  } catch {
    message.error('网络错误');
  }
};

const generateToken = () => {
  syncConfig.value.token = 'pt_' + Math.random().toString(36).substring(2, 15);
  message.success('已生成新Token');
};

const formatLastSyncTime = (timestamp: number) => {
  if (!timestamp) return '从未同步';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return date.toLocaleString('zh-CN');
};
</script>

<style scoped>
.settings-container {
  padding: 20px;
}
.sync-settings-card {
  margin-top: 20px;
}
.sync-config {
  margin-top: 20px;
}
</style>
