#!/usr/bin/env node

/**
 * Test script to discover auto XP mode behavior
 * Tests whether omitting exp with importance/difficulty triggers auto-calculation
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const LIFEUP_HOST = process.env.LIFEUP_HOST || '10.103.2.235';
const LIFEUP_PORT = process.env.LIFEUP_PORT || '13276';
const LIFEUP_API_TOKEN = process.env.LIFEUP_API_TOKEN || '';

const API_URL = `http://${LIFEUP_HOST}:${LIFEUP_PORT}`;

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: LIFEUP_API_TOKEN ? { Authorization: `Bearer ${LIFEUP_API_TOKEN}` } : {},
});

// Test cases to discover auto XP behavior
const testCases = [
  {
    id: 1,
    name: 'Baseline: Omit exp entirely',
    params: {
      todo: 'Auto XP Test 1 - No exp',
      importance: 3,
      difficulty: 3,
      category: 0,
    },
    expectedBehavior: 'XP defaults to 0 (baseline)',
  },
  {
    id: 2,
    name: 'Explicit zero XP with skills',
    params: {
      todo: 'Auto XP Test 2 - Zero exp',
      exp: 0,
      skills: 1,
      importance: 3,
      difficulty: 3,
      category: 0,
    },
    expectedBehavior: 'XP should be 0',
  },
  {
    id: 3,
    name: 'Auto mode: Omit exp, high importance/difficulty',
    params: {
      todo: 'Auto XP Test 3 - Auto high',
      importance: 4,
      difficulty: 4,
      category: 0,
    },
    expectedBehavior: 'XP auto-calculated (if auto mode exists)',
  },
  {
    id: 4,
    name: 'Auto mode: Omit exp, low importance/difficulty',
    params: {
      todo: 'Auto XP Test 4 - Auto low',
      importance: 1,
      difficulty: 1,
      category: 0,
    },
    expectedBehavior: 'XP auto-calculated lower (if auto mode exists)',
  },
  {
    id: 5,
    name: 'Sentinel value test: exp=-1',
    params: {
      todo: 'Auto XP Test 5 - Sentinel -1',
      exp: -1,
      importance: 3,
      difficulty: 3,
      category: 0,
    },
    expectedBehavior: 'Test if -1 triggers auto mode (or errors)',
  },
  {
    id: 6,
    name: 'Only importance, no difficulty',
    params: {
      todo: 'Auto XP Test 6 - Partial auto',
      importance: 3,
      category: 0,
    },
    expectedBehavior: 'Test partial auto mode trigger',
  },
  {
    id: 7,
    name: 'Omit exp and importance/difficulty',
    params: {
      todo: 'Auto XP Test 7 - No auto params',
      category: 0,
    },
    expectedBehavior: 'XP defaults to 0 (no auto)',
  },
];

function buildLifeupUrl(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Handle arrays (e.g., skills=1&skills=2)
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return `lifeup://api/add_task?${searchParams.toString()}`;
}

async function runTests() {
  console.log('🧪 Auto XP Mode Discovery Tests\n');
  console.log(`Target: ${API_URL}`);
  console.log(`Checking connectivity...\n`);

  // Verify connectivity
  try {
    await client.get('/tasks');
  } catch (error) {
    console.error('❌ Cannot connect to LifeUp API');
    console.error(`Make sure LifeUp is running on ${LIFEUP_HOST}:${LIFEUP_PORT}`);
    process.exit(1);
  }

  const results = [];

  for (const testCase of testCases) {
    console.log(`Test ${testCase.id}: ${testCase.name}`);
    console.log(`  Params: ${JSON.stringify(testCase.params)}`);

    try {
      const lifeupUrl = buildLifeupUrl(testCase.params);
      console.log(`  URL: ${lifeupUrl}`);

      // Send via the API gateway endpoint (expects JSON body with urls array)
      const response = await client.post('/api', { urls: [lifeupUrl] });

      // Debug: log full response
      console.log(`  Response: code=${response.data?.code}, message=${response.data?.message}`);
      console.log(`  Full data: ${JSON.stringify(response.data?.data)}`);

      // Check for success response (code 200 means success in LifeUp API)
      if (response.data?.code === 200) {
        console.log(`  ✅ API Call Success`);
      } else {
        console.log(`  ❌ API Error (code ${response.data?.code}): ${response.data?.message || 'Unknown error'}`);
        results.push({
          testId: testCase.id,
          testName: testCase.name,
          params: JSON.stringify(testCase.params),
          xp: 'ERROR',
          expected: testCase.expectedBehavior,
          status: '✗',
        });
        console.log('');
        continue;
      }

      // The API doesn't return task ID, so we need to find it by name
      console.log(`  🔍 Looking up task by name in task list...`);

      // Wait a moment for task to be recorded
      await new Promise(resolve => setTimeout(resolve, 500));

      // Retrieve task details
      const taskResponse = await client.get(`/tasks`);
      const allTasks = taskResponse.data?.data || [];

      // Debug: log first task structure if available
      if (allTasks.length > 0 && testCase.id === 1) {
        console.log(`  Debug: First task structure: ${JSON.stringify(allTasks[0], null, 2).split('\n').slice(0, 5).join(' ')}`);
      }

      // Find the task we just created by matching the name
      const taskName = testCase.params.todo;
      const createdTask = allTasks.find(t => t.todo === taskName || t.name === taskName || t.title === taskName);

      if (createdTask) {
        const xp = createdTask.exp || 0;
        console.log(`  📊 Result: XP = ${xp}`);

        results.push({
          testId: testCase.id,
          testName: testCase.name,
          params: JSON.stringify(testCase.params),
          taskId: createdTask.id || createdTask.gid,
          xp,
          expected: testCase.expectedBehavior,
          status: '✓',
        });
      } else {
        console.log(`  ⚠️  Task created but not found in task list`);
        results.push({
          testId: testCase.id,
          testName: testCase.name,
          params: JSON.stringify(testCase.params),
          taskId: 'NOT_FOUND',
          xp: 'UNKNOWN',
          expected: testCase.expectedBehavior,
          status: '?',
        });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.log(`  ❌ Error: ${errorMsg}`);

      results.push({
        testId: testCase.id,
        testName: testCase.name,
        params: JSON.stringify(testCase.params),
        xp: 'ERROR',
        expected: testCase.expectedBehavior,
        status: '✗',
      });
    }

    console.log('');
  }

  // Print summary table
  console.log('\n📈 Results Summary\n');
  console.table(results, ['testId', 'testName', 'xp', 'expected', 'status']);

  // Analysis
  console.log('\n🔍 Analysis:\n');

  const xpValues = results.filter(r => typeof r.xp === 'number');

  if (xpValues.length === 0) {
    console.log('⚠️  No successful task creations. Check connectivity.');
    return;
  }

  const test3 = results[2]; // High importance/difficulty without exp
  const test4 = results[3]; // Low importance/difficulty without exp
  const test1 = results[0]; // Baseline

  if (test3 && test4 && typeof test3.xp === 'number' && typeof test4.xp === 'number') {
    if (test3.xp > 0 && test4.xp > 0 && test3.xp > test4.xp) {
      console.log('✅ AUTO XP MODE LIKELY WORKS!');
      console.log(`   - Test 3 (high diff/import): ${test3.xp} XP`);
      console.log(`   - Test 4 (low diff/import): ${test4.xp} XP`);
      console.log('   - Different values based on importance/difficulty ✓\n');
      console.log('🚀 Recommendation: Proceed with implementation (Step 2)');
    } else if (test3.xp === 0 && test4.xp === 0 && test1.xp === 0) {
      console.log('⚠️  AUTO XP MODE PROBABLY DOES NOT EXIST');
      console.log('   - All tests without exp parameter show 0 XP');
      console.log('   - Auto calculation not triggered\n');
      console.log('💡 Alternative: Verify this is expected LifeUp behavior');
    } else {
      console.log('⚠️  INCONCLUSIVE RESULTS');
      console.log('   - Need more investigation');
      console.log(`   - Test 1 (baseline): ${test1.xp} XP`);
      console.log(`   - Test 3 (high): ${test3.xp} XP`);
      console.log(`   - Test 4 (low): ${test4.xp} XP`);
    }
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Check the created tasks in LifeUp app manually');
  console.log('2. Verify which tasks have XP values');
  console.log('3. Complete a task to see if auto-calculated XP is awarded\n');
}

await runTests().catch(console.error);
