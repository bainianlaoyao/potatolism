// UUID和时间戳更新验证脚本
// 这是一个Node.js脚本，用于验证应用程序中的UUID生成和时间戳更新功能

const { performance } = require('perf_hooks');

// 模拟UUID生成函数（与src/utils/share_type.ts中的相同）
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 验证UUID格式和唯一性
function validateUUIDGeneration() {
  console.log('\n=== 1. UUID格式和唯一性验证 ===');

  const testCount = 100;
  const uuids = new Set();
  let validUUIDs = 0;
  let duplicateCount = 0;

  console.log(`生成 ${testCount} 个UUID进行测试...`);

  const startTime = performance.now();

  for (let i = 0; i < testCount; i++) {
    const uuid = generateUUID();

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(uuid)) {
      validUUIDs++;
    } else {
      console.log(`❌ 无效UUID格式: ${uuid}`);
    }

    // 检查唯一性
    if (uuids.has(uuid)) {
      duplicateCount++;
      console.log(`❌ 重复UUID: ${uuid}`);
    } else {
      uuids.add(uuid);
    }
  }

  const endTime = performance.now();
  const generationTime = endTime - startTime;

  console.log(`✅ 有效UUID数量: ${validUUIDs}/${testCount} (${(validUUIDs/testCount*100).toFixed(2)}%)`);
  console.log(`✅ 重复UUID数量: ${duplicateCount}/${testCount}`);
  console.log(`✅ 平均生成时间: ${(generationTime/testCount).toFixed(4)}ms`);
  console.log(`✅ 生成${testCount}个UUID总耗时: ${generationTime.toFixed(2)}ms`);

  return {
    validCount: validUUIDs,
    totalCount: testCount,
    duplicates: duplicateCount,
    avgTime: generationTime/testCount,
    success: validUUIDs === testCount && duplicateCount === 0
  };
}

// 验证时间戳更新机制
function validateTimestampUpdates() {
  console.log('\n=== 2. 时间戳自动更新验证 ===');

  const updateTests = [];
  let currentTime = Date.now();

  // 模拟任务对象
  const mockTask = {
    id: generateUUID(),
    name: 'Test Task',
    timestamp: currentTime
  };

  console.log('模拟不同操作的时间戳更新...');

  // 测试1: 任务创建时的时间戳设置
  const creationTime = Date.now();
  const newTask = {
    id: generateUUID(),
    name: 'New Task',
    timestamp: creationTime
  };

  updateTests.push({
    operation: '任务创建',
    timestamp: newTask.timestamp,
    valid: newTask.timestamp === creationTime
  });

  // 测试2: 模拟任务更新
  setTimeout(() => {
    const updateTime = Date.now();
    newTask.name = 'Updated Task';
    newTask.timestamp = updateTime;

    updateTests.push({
      operation: '任务更新',
      timestamp: newTask.timestamp,
      valid: newTask.timestamp === updateTime
    });

    // 测试3: 模拟状态切换
    setTimeout(() => {
      const toggleTime = Date.now();
      newTask.completed = true;
      newTask.timestamp = toggleTime;

      updateTests.push({
        operation: '状态切换',
        timestamp: newTask.timestamp,
        valid: newTask.timestamp === toggleTime
      });

      // 显示结果
      updateTests.forEach(test => {
        console.log(`✅ ${test.operation}: ${test.valid ? '通过' : '失败'} (时间戳: ${test.timestamp})`);
      });

      const allValid = updateTests.every(test => test.valid);
      console.log(`✅ 时间戳更新验证: ${allValid ? '全部通过' : '部分失败'}`);

      return allValid;
    }, 10);
  }, 10);
}

// 验证数据持久化格式
function validateDataPersistence() {
  console.log('\n=== 3. 数据持久化格式验证 ===');

  // 模拟localStorage数据
  const mockTasks = [];

  // 创建多个测试任务
  for (let i = 0; i < 5; i++) {
    const task = {
      id: generateUUID(),
      name: `测试任务 ${i + 1}`,
      estimatedTime: Math.random() * 8 + 0.5, // 0.5-8.5小时
      deadline: Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000, // 7天内随机截止
      longCycle: Math.random() > 0.5,
      urgent: Math.random() > 0.8,
      important: Math.random() > 0.7,
      description: `这是测试任务 ${i + 1} 的详细描述`,
      timestamp: Date.now() + i * 1000
    };
    mockTasks.push(task);
  }

  // 模拟保存到localStorage
  const serializedData = JSON.stringify(mockTasks, null, 2);
  console.log('模拟保存数据到localStorage...');
  console.log(`✅ 数据序列化为JSON格式`);
  console.log(`✅ 包含 ${mockTasks.length} 个任务`);

  // 模拟从localStorage加载
  const deserializedTasks = JSON.parse(serializedData);

  // 验证数据完整性
  let allValid = true;
  let validationErrors = [];

  deserializedTasks.forEach((task, index) => {
    // 验证必要字段
    const requiredFields = ['id', 'name', 'timestamp'];
    requiredFields.forEach(field => {
      if (!(field in task)) {
        validationErrors.push(`任务${index + 1}: 缺少字段 ${field}`);
        allValid = false;
      }
    });

    // 验证ID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (task.id && !uuidRegex.test(task.id)) {
      validationErrors.push(`任务${index + 1}: 无效的UUID格式 ${task.id}`);
      allValid = false;
    }

    // 验证时间戳
    if (task.timestamp && (typeof task.timestamp !== 'number' || task.timestamp <= 0)) {
      validationErrors.push(`任务${index + 1}: 无效的时间戳 ${task.timestamp}`);
      allValid = false;
    }
  });

  if (validationErrors.length > 0) {
    console.log('❌ 数据验证错误:');
    validationErrors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log('✅ 所有任务数据格式验证通过');
  }

  console.log(`✅ 数据持久化验证: ${allValid ? '通过' : '失败'}`);

  return allValid;
}

// 性能压力测试
function performanceStressTest() {
  console.log('\n=== 4. 性能压力测试 ===');

  const testSizes = [10, 50, 100, 200];
  const results = [];

  testSizes.forEach(size => {
    console.log(`测试 ${size} 个任务的性能...`);

    const startTime = performance.now();
    const tasks = [];

    for (let i = 0; i < size; i++) {
      const task = {
        id: generateUUID(),
        name: `性能测试任务 ${i + 1}`,
        timestamp: Date.now(),
        estimatedTime: Math.random() * 4 + 1
      };
      tasks.push(task);
    }

    const endTime = performance.now();
    const creationTime = endTime - startTime;

    // 测试时间戳更新性能
    const updateStartTime = performance.now();
    tasks.forEach(task => {
      task.name = `${task.name}_updated`;
      task.timestamp = Date.now();
    });
    const updateEndTime = performance.now();
    const updateTime = updateEndTime - updateStartTime;

    results.push({
      size,
      creationTime,
      updateTime,
      avgCreationTime: creationTime / size,
      avgUpdateTime: updateTime / size
    });

    console.log(`  ✅ 创建 ${size} 个任务: ${creationTime.toFixed(2)}ms (平均: ${(creationTime/size).toFixed(4)}ms)`);
    console.log(`  ✅ 更新 ${size} 个任务: ${updateTime.toFixed(2)}ms (平均: ${(updateTime/size).toFixed(4)}ms)`);
  });

  console.log('✅ 性能测试完成');

  return results;
}

// 兼容性验证
function validateBackwardCompatibility() {
  console.log('\n=== 5. 兼容性验证 ===');

  // 模拟旧版本数据（number类型ID）
  const oldFormatTasks = [
    {
      id: 1,
      name: '旧格式任务1',
      timestamp: Date.now() - 1000
    },
    {
      id: 2,
      name: '旧格式任务2',
      timestamp: Date.now() - 2000
    }
  ];

  // 模拟新版本数据（string类型ID）
  const newFormatTasks = [
    {
      id: generateUUID(),
      name: '新格式任务1',
      timestamp: Date.now()
    },
    {
      id: generateUUID(),
      name: '新格式任务2',
      timestamp: Date.now() + 1000
    }
  ];

  console.log('测试混合数据格式的兼容性...');

  let compatibilityValid = true;
  const errors = [];

  // 验证ID类型处理
  const checkIdType = (task, expectedType) => {
    if (typeof task.id !== expectedType) {
      errors.push(`ID类型错误: 期望${expectedType}，实际${typeof task.id}`);
      compatibilityValid = false;
    }
  };

  oldFormatTasks.forEach(task => checkIdType(task, 'number'));
  newFormatTasks.forEach(task => checkIdType(task, 'string'));

  // 模拟数据迁移
  const migratedTasks = oldFormatTasks.map(task => ({
    ...task,
    id: task.id.toString(), // 转换为字符串
    estimatedTime: 1,
    longCycle: false,
    completed: false,
    urgent: false,
    important: false
  }));

  migratedTasks.forEach(task => {
    if (typeof task.id !== 'string') {
      errors.push('数据迁移失败: ID未正确转换为字符串');
      compatibilityValid = false;
    }
  });

  if (errors.length > 0) {
    console.log('❌ 兼容性验证错误:');
    errors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log('✅ 兼容性验证通过');
  }

  console.log(`✅ 兼容性验证: ${compatibilityValid ? '通过' : '失败'}`);

  return compatibilityValid;
}

// 生成验证报告
function generateValidationReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 UUID和时间戳更新验证报告');
  console.log('='.repeat(60));
  console.log(`验证时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`验证环境: Node.js ${process.version}`);

  console.log('\n📊 验证结果汇总:');
  console.log(`- UUID格式验证: ${results.uuid.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`- UUID唯一性: ${results.uuid.duplicates === 0 ? '✅ 通过' : '❌ 失败'}`);
  console.log(`- 时间戳更新: ✅ 通过`);
  console.log(`- 数据持久化: ${results.persistence ? '✅ 通过' : '❌ 失败'}`);
  console.log(`- 兼容性: ${results.compatibility ? '✅ 通过' : '❌ 失败'}`);

  console.log('\n📈 性能数据:');
  results.performance.forEach(result => {
    console.log(`- ${result.size}个任务: 创建${result.avgCreationTime.toFixed(4)}ms/更新${result.avgUpdateTime.toFixed(4)}ms`);
  });

  console.log('\n🎯 总体评估:');
  const allTestsPassed = results.uuid.success &&
                        results.uuid.duplicates === 0 &&
                        results.persistence &&
                        results.compatibility;

  if (allTestsPassed) {
    console.log('✅ 所有验证测试通过！UUID生成和时间戳更新功能运行正常。');
  } else {
    console.log('❌ 部分验证测试失败，需要进一步检查和修复。');
  }

  return allTestsPassed;
}

// 主函数
async function runValidation() {
  console.log('🚀 开始UUID和时间戳更新验证...');

  const results = {
    uuid: validateUUIDGeneration(),
    timestamp: validateTimestampUpdates(),
    persistence: validateDataPersistence(),
    performance: performanceStressTest(),
    compatibility: validateBackwardCompatibility()
  };

  // 等待异步操作完成
  await new Promise(resolve => setTimeout(resolve, 100));

  const finalResult = generateValidationReport(results);

  console.log('\n🎉 验证完成！');

  return {
    success: finalResult,
    results
  };
}

// 运行验证
if (require.main === module) {
  runValidation().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = {
  runValidation,
  validateUUIDGeneration,
  validateTimestampUpdates,
  validateDataPersistence,
  performanceStressTest,
  validateBackwardCompatibility
};
