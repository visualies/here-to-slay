#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const featureTests = {
  'room-creation': 'tests/e2e/features/room-creation.spec.ts',
  'room-joining': 'tests/e2e/features/room-joining.spec.ts', 
  'card-drawing': 'tests/e2e/features/card-drawing.spec.ts',
  'game-state': 'tests/e2e/features/game-state-persistence.spec.ts',
  'core-flow': 'tests/e2e/game-flow.spec.ts',
  'infrastructure': 'tests/e2e/infrastructure/',
  'api': 'tests/e2e/infrastructure/database-api.spec.ts',
  'websocket': 'tests/e2e/infrastructure/websocket-connection.spec.ts',
  'simple': 'tests/e2e/infrastructure/simple-game-flow.spec.ts',
  'all-features': 'tests/e2e/features/',
  'all-infrastructure': 'tests/e2e/infrastructure/'
};

const feature = process.argv[2];
const reportFlag = process.argv.includes('--report');

if (!feature || !featureTests[feature]) {
  console.log('Available feature tests:');
  Object.keys(featureTests).forEach(key => {
    console.log(`  ${key}: ${featureTests[key]}`);
  });
  console.log('\nUsage: node run-feature-tests.js <feature-name> [--report]');
  console.log('Example: node run-feature-tests.js card-drawing');
  console.log('Example: node run-feature-tests.js card-drawing --report');
  process.exit(1);
}

const testPath = featureTests[feature];
const reporter = reportFlag ? '--reporter=html' : '--reporter=list';
console.log(`Running ${feature} tests: ${testPath}${reportFlag ? ' (with HTML report)' : ''}`);

try {
  const command = `npx playwright test ${testPath} --project=chromium ${reporter}`;
  console.log(`Executing: ${command}`);
  execSync(command, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '../..')
  });
} catch (error) {
  console.error(`Test failed: ${error.message}`);
  process.exit(1);
}
