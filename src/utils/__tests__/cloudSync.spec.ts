import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTasksStore } from '@/stores/tasksStore'
import { performSync, startAutoSync, stopAutoSync } from '../cloudSync'

const originalFetch = global.fetch
let mockFetch: ReturnType<typeof vi.fn>

function setSettings(settings: Record<string, unknown>) {
	localStorage.setItem('cloudSyncSettings', JSON.stringify(settings))
}

describe('cloudSync', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		localStorage.clear()
		vi.useFakeTimers()
		mockFetch = vi.fn()
		global.fetch = mockFetch as unknown as typeof fetch
		// online
		Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
	})

	afterEach(() => {
		stopAutoSync()
		vi.useRealTimers()
		global.fetch = originalFetch
	})

	it('should early-return when disabled', async () => {
		setSettings({ enabled: false })
		const ok = await performSync()
		expect(ok).toBe(false)
		expect(global.fetch).not.toHaveBeenCalled()
	})

	it('should call backend /sync with X-Token and update tasks', async () => {
		setSettings({ enabled: true, baseUrl: 'http://localhost:3000', token: 'abc' })
		const store = useTasksStore()
		store.tasks = []

			mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ tasks: [{ id: '1', name: 't', estimatedTime: 25, longCycle: false, cycleList: [], progress: 0, deadline: null, completed: false, time_up: false, urgent: false, important: false, description: '', timestamp: Date.now() }] }),
		})

		const ok = await performSync()
		expect(ok).toBe(true)
			expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/sync', expect.objectContaining({
			method: 'POST',
			headers: expect.objectContaining({ 'X-Token': 'abc' }),
		}))
		expect(store.tasks.length).toBe(1)
	})

	it('auto sync should tick every second', async () => {
		setSettings({ enabled: true, baseUrl: 'http://localhost:3000', token: 'abc' })
			mockFetch.mockResolvedValue({ ok: true, json: async () => ({ tasks: [] }) })
		startAutoSync(1000)
		vi.advanceTimersByTime(3000)
			expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2)
	})
})
