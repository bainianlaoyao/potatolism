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

const SETTINGS_KEY = 'potato_sync_settings';

const saveSettings = () => {
  const settingsToSave = {
    syncEnabled: syncEnabled.value,
    syncConfig: syncConfig.value,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));
};

const loadSettings = () => {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      syncEnabled.value = parsed.syncEnabled || false;
      syncConfig.value = parsed.syncConfig || {
        token: '',
        baseUrl: 'http://localhost:3000',
        lastSync: 0,
      };
    } catch (error) {
      console.error('加载同步设置失败:', error);
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
  } catch (error) {
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
      headers: {
        'X-Token': syncConfig.value.token || 'test',
      },
    });

    if (response.ok) {
      message.success('连接成功');
    } else {
      message.error('连接失败');
    }
  } catch (error) {
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
