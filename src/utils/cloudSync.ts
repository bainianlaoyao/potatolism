import { useTasksStore } from '@/stores/tasksStore'

type CloudSyncSettings = {
  enabled: boolean
  baseUrl: string
  token: string
  lastSyncTime?: number | null
  lastToken?: string | null
}

let syncing = false
let timerId: number | null = null

function loadSettings(): CloudSyncSettings {
  try {
    const raw = localStorage.getItem('cloudSyncSettings')
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        enabled: !!parsed.enabled,
        baseUrl: String(parsed.baseUrl || ''),
        token: String(parsed.token || ''),
        lastSyncTime: parsed.lastSyncTime ?? null,
        lastToken: typeof parsed.lastToken === 'string' ? parsed.lastToken : null,
      }
    }
    // 兼容旧/另一路由的设置存储
    const altRaw = localStorage.getItem('potato_sync_settings')
    if (altRaw) {
      const parsed = JSON.parse(altRaw)
      const cfg = parsed.syncConfig || {}
      return {
        enabled: !!parsed.syncEnabled,
        baseUrl: String(cfg.baseUrl || ''),
        token: String(cfg.token || ''),
        lastSyncTime: cfg.lastSync || null,
        lastToken: null,
      }
    }
  } catch {
    // ignore
  }
  return { enabled: false, baseUrl: '', token: '', lastSyncTime: null, lastToken: null }
}

function saveLastSync(ts: number) {
  try {
    const s = loadSettings()
    const next = { ...s, lastSyncTime: ts }
    localStorage.setItem('cloudSyncSettings', JSON.stringify(next))
    // 同步写入另一路由设置
    const altRaw = localStorage.getItem('potato_sync_settings')
    if (altRaw) {
      try {
        const parsed = JSON.parse(altRaw)
        const cfg = parsed.syncConfig || {}
        cfg.lastSync = ts
        const out = { ...parsed, syncConfig: cfg }
        localStorage.setItem('potato_sync_settings', JSON.stringify(out))
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

function saveLastToken(token: string) {
  try {
    const s = loadSettings()
    const next = { ...s, lastToken: token }
    localStorage.setItem('cloudSyncSettings', JSON.stringify(next))
  } catch {
    // ignore
  }
}

export async function performSync(): Promise<boolean> {
  const { enabled, baseUrl, token, lastToken } = loadSettings()
  if (!enabled) return false
  if (!baseUrl || !token) return false
  if (!navigator.onLine) return false
  if (syncing) return false

  const url = `${baseUrl.replace(/\/$/, '')}/sync`

  const store = useTasksStore()
  const tokenChanged = !!lastToken && lastToken !== token
  // 当 token 发生变化时，避免把旧 token 下的本地任务上传到新 token，先发空数组获取服务端该 token 下的数据
  const payload = { tasks: tokenChanged ? [] : store.tasks }

  syncing = true
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': token.trim(),
      },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) return false
    const data = await resp.json()
    if (Array.isArray(data?.tasks)) {
      // Pinia 解包，直接覆盖
      store.tasks = data.tasks
    }
    saveLastSync(Date.now())
    // 记录本次成功同步所用 token，确保后续切换 token 时不会把旧数据上传到新 token
    saveLastToken(token)
    return true
  } catch {
    return false
  } finally {
    syncing = false
  }
}

export function startAutoSync(intervalMs = 1000) {
  stopAutoSync()
  timerId = setInterval(() => {
    // fire and forget; internal锁保证不会并发
    void performSync()
  }, intervalMs) as unknown as number
}

export function stopAutoSync() {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
}

export function isSyncInProgress() {
  return syncing
}
