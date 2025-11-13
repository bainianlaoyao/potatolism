import { test, expect } from '@playwright/test'

test.describe('UUID和时间戳更新验证', () => {
  test('应该在创建任务时生成有效的UUID', async ({ page }) => {
    // 等待应用加载
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 检查页面是否正确加载
    await expect(page.locator('text=任务列表')).toBeVisible()

    // 查找并点击"添加任务"按钮（通过检查页面上的按钮）
    const addButton = page.locator('button').filter({ hasText: '新增任务' })
    if (await addButton.isVisible()) {
      await addButton.click()
    } else {
      // 如果找不到按钮，尝试点击任何可能触发添加任务的元素
      await page.click('[data-testid="add-task"]')
    }

    // 填写任务表单
    await page.fill('input[placeholder*="任务名称"]', 'UUID测试任务')
    await page.fill('input[placeholder*="预估时间"]', '1')

    // 提交表单
    const submitButton = page.locator('button').filter({ hasText: '确认' })
    if (await submitButton.isVisible()) {
      await submitButton.click()
    }

    // 等待任务出现
    await page.waitForTimeout(1000)

    // 检查控制台日志以验证UUID生成
    const logs = []
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text())
      }
    })

    // 检查localStorage中的任务数据
    const tasks = await page.evaluate(() => {
      const stored = localStorage.getItem('potato_tasks')
      return stored ? JSON.parse(stored) : []
    })

    // 验证至少有一个任务
    expect(tasks.length).toBeGreaterThan(0)

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const taskIds = tasks.map(task => task.id)

    taskIds.forEach(id => {
      expect(typeof id).toBe('string')
      expect(uuidRegex.test(id)).toBe(true)
    })
  })

  test('应该在更新任务时自动更新时间戳', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 获取初始任务数据
    const initialTasks = await page.evaluate(() => {
      const stored = localStorage.getItem('potato_tasks')
      return stored ? JSON.parse(stored) : []
    })

    if (initialTasks.length === 0) {
      // 如果没有任务，先创建一个
      await page.click('button').filter({ hasText: '新增任务' })
      await page.fill('input[placeholder*="任务名称"]', '时间戳测试任务')
      await page.fill('input[placeholder*="预估时间"]', '1')
      await page.click('button').filter({ hasText: '确认' })
      await page.waitForTimeout(1000)
    }

    // 获取更新前的任务时间戳
    const beforeUpdate = await page.evaluate(() => {
      const stored = localStorage.getItem('potato_tasks')
      const tasks = stored ? JSON.parse(stored) : []
      if (tasks.length > 0) {
        return {
          id: tasks[0].id,
          timestamp: tasks[0].timestamp,
          name: tasks[0].name
        }
      }
      return null
    })

    expect(beforeUpdate).not.toBeNull()

    // 等待一段时间确保时间戳不同
    await page.waitForTimeout(100)

    // 编辑第一个任务
    page.click('[data-testid="edit-task"]').first()

    // 更改任务名称
    await page.fill('input[placeholder*="任务名称"]', '更新后的时间戳测试任务')

    // 保存更改
    await page.click('button').filter({ hasText: '保存' })
    await page.waitForTimeout(1000)

    // 检查更新后的任务数据
    const afterUpdate = await page.evaluate(() => {
      const stored = localStorage.getItem('potato_tasks')
      const tasks = stored ? JSON.parse(stored) : []
      if (tasks.length > 0) {
        return {
          id: tasks[0].id,
          timestamp: tasks[0].timestamp,
          name: tasks[0].name
        }
      }
      return null
    })

    expect(afterUpdate).not.toBeNull()
    expect(afterUpdate!.id).toBe(beforeUpdate!.id) // ID应该保持不变
    expect(afterUpdate!.timestamp).toBeGreaterThan(beforeUpdate!.timestamp) // 时间戳应该更新
    expect(afterUpdate!.name).toBe('更新后的时间戳测试任务') // 名称应该更新
  })

  test('应该在切换任务状态时更新时间戳', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 确保有任务可以测试
    const initialTasks = await page.evaluate(() => {
      const stored = localStorage.getItem('potato_tasks')
      return stored ? JSON.parse(stored) : []
    })

    if (initialTasks.length === 0) {
      // 创建测试任务
      await page.click('button').filter({ hasText: '新增任务' })
      await page.fill('input[placeholder*="任务名称"]', '状态切换测试任务')
      await page.fill('input[placeholder*="预估时间"]', '1')
      await page.click('button').filter({ hasText: '确认' })
      await page.waitForTimeout(1000)
    }

    // 获取切换前的状态
    const beforeToggle = await page.evaluate(() => {
      const stored = localStorage.getItem('potato_tasks')
      const tasks = stored ? JSON.parse(stored) : []
      if (tasks.length > 0) {
        return {
          id: tasks[0].id,
          timestamp: tasks[0].timestamp,
          completed: tasks[0].completed
        }
      }
      return null
    })

    expect(beforeToggle).not.toBeNull()

    // 等待确保时间戳差异
    await page.waitForTimeout(100)

    // 尝试切换任务状态
    const completeButton = page.locator('button[type="success"]').first()
    if (await completeButton.isVisible()) {
      await completeButton.click()
    } else {
      // 备选方案：点击任务本身
      await page.locator('.task-item').first().click()
    }

    await page.waitForTimeout(1000)

    // 检查切换后的状态
    const afterToggle = await page.evaluate(() => {
      const stored = localStorage.getItem('potato_tasks')
      const tasks = stored ? JSON.parse(stored) : []
      if (tasks.length > 0) {
        return {
          id: tasks[0].id,
          timestamp: tasks[0].timestamp,
          completed: tasks[0].completed
        }
      }
      return null
    })

    expect(afterToggle).not.toBeNull()
    expect(afterToggle!.id).toBe(beforeToggle!.id) // ID应该保持不变
    expect(afterToggle!.timestamp).toBeGreaterThan(beforeToggle!.timestamp) // 时间戳应该更新
    expect(afterToggle!.completed).toBe(!beforeToggle!.completed) // 完成状态应该切换
  })

  test('应该保持数据持久化在页面刷新后', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 确保有任务数据
    const initialTasks = await page.evaluate(() => {
      const stored = localStorage.getItem('potato_tasks')
      return stored ? JSON.parse(stored) : []
    })

    if (initialTasks.length === 0) {
      // 创建测试任务
      await page.click('button').filter({ hasText: '新增任务' })
      await page.fill('input[placeholder*="任务名称"]', '持久化测试任务')
      await page.fill('input[placeholder*="预估时间"]', '2')
      await page.click('button').filter({ hasText: '确认' })
      await page.waitForTimeout(1000)
    }

    // 获取刷新前的任务数据
    const beforeRefresh = await page.evaluate(() => {
      const stored = localStorage.getItem('potato_tasks')
      const tasks = stored ? JSON.parse(stored) : []
      return tasks.map(task => ({
        id: task.id,
        name: task.name,
        timestamp: task.timestamp
      }))
    })

    expect(beforeRefresh.length).toBeGreaterThan(0)

    // 刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 等待Vue应用重新加载
    await page.waitForTimeout(2000)

    // 获取刷新后的任务数据
    const afterRefresh = await page.evaluate(() => {
      const stored = localStorage.getItem('potato_tasks')
      const tasks = stored ? JSON.parse(stored) : []
      return tasks.map(task => ({
        id: task.id,
        name: task.name,
        timestamp: task.timestamp
      }))
    })

    // 验证数据保持不变
    expect(afterRefresh.length).toBe(beforeRefresh.length)

    for (let i = 0; i < beforeRefresh.length; i++) {
      expect(afterRefresh[i].id).toBe(beforeRefresh[i].id)
      expect(afterRefresh[i].name).toBe(beforeRefresh[i].name)
      expect(afterRefresh[i].timestamp).toBe(beforeRefresh[i].timestamp)
    }
  })

  test('应该验证任务的唯一性', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 创建多个任务
    const taskNames = ['唯一性测试1', '唯一性测试2', '唯一性测试3']

    for (const name of taskNames) {
      await page.click('button').filter({ hasText: '新增任务' })
      await page.fill('input[placeholder*="任务名称"]', name)
      await page.fill('input[placeholder*="预估时间"]', '1')
      await page.click('button').filter({ hasText: '确认' })
      await page.waitForTimeout(500)
    }

    // 检查localStorage中的任务数据
    const tasks = await page.evaluate(() => {
      const stored = localStorage.getItem('potato_tasks')
      const tasks = stored ? JSON.parse(stored) : []
      return tasks.map(task => task.id)
    })

    // 验证ID唯一性
    const uniqueIds = new Set(tasks)
    expect(uniqueIds.size).toBe(tasks.length) // 所有ID应该唯一

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    tasks.forEach(id => {
      expect(typeof id).toBe('string')
      expect(uuidRegex.test(id)).toBe(true)
    })
  })
})
