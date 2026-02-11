#!/bin/bash

# Comprehensive Achievement Handling Test Script
# This script tests achievement creation with task completion criteria

echo "═════════════════════════════════════════════════════════════════"
echo "🎯 COMPREHENSIVE ACHIEVEMENT HANDLING TEST"
echo "═════════════════════════════════════════════════════════════════"
echo ""

# Start the server in the background
echo "🚀 Starting MCP server..."
npm run start > /tmp/mcp-server.log 2>&1 &
SERVER_PID=$!

# Give the server time to start
sleep 3

# Function to call MCP tools via the server
call_tool() {
  local tool_name=$1
  local args=$2

  echo "Calling tool: $tool_name"
  # This would need actual MCP client implementation
  # For now, we'll document what would be tested
}

echo ""
echo "📝 Test 1: Create a normal task (Learning TypeScript)"
echo "   - Task type: 0 (Normal)"
echo "   - Reward: 50 coins"
echo "   - Importance: 3 (High)"
echo "   - Difficulty: 2 (Normal)"
echo ""

echo "📝 Test 2: Create a count task (Exercise)"
echo "   - Task type: 1 (Count)"
echo "   - Target: 5 completions"
echo "   - Reward: 100 coins"
echo "   - Importance: 2"
echo "   - Difficulty: 1 (Easy)"
echo ""

echo "📝 Test 3: Create a negative task (Procrastination)"
echo "   - Task type: 2 (Negative/Penalty)"
echo "   - Penalty: -50 coins"
echo "   - Importance: 1 (Low)"
echo "   - Difficulty: 1 (Easy)"
echo ""

echo "📝 Test 4: Create an achievement with completion criteria"
echo "   - Name: Master Learner"
echo "   - Unlock Condition 1: Complete normal task 1 time"
echo "   - Unlock Condition 2: Complete count task 3 times (out of 5)"
echo "   - Unlock Condition 3: Don't trigger negative task"
echo "   - Reward: 100 XP + 200 coins"
echo ""

echo "📝 Test 5: Verify achievement details and conditions"
echo "   - List achievements and verify test achievement appears"
echo "   - Check that unlock conditions are displayed"
echo ""

echo "📝 Test 6: Match tasks to relevant achievements"
echo "   - Test the achievement matching algorithm"
echo "   - Verify relevant achievements are suggested"
echo ""

echo "═════════════════════════════════════════════════════════════════"
echo "To run the full test with actual MCP calls, use:"
echo ""
echo "  npx tsx tests/e2e/comprehensive-achievement-test.ts"
echo ""
echo "Or add the test to the E2E test suite."
echo "═════════════════════════════════════════════════════════════════"
echo ""

# Clean up
echo "🛑 Stopping MCP server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "✅ Test documentation complete"
