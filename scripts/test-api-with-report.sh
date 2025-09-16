#!/bin/bash

# Run Playwright API tests with arguments, then show report
# Usage: ./scripts/test-api-with-report.sh [playwright test arguments]

echo "Running API tests..."

# Remove any old cached reports to ensure fresh results
rm -rf playwright-report/ 2>/dev/null || true

# Run playwright test with all provided arguments and generate HTML report
npx playwright test --project=api --reporter=html "$@"

# Store the exit code of the test command
TEST_EXIT_CODE=$?

# Always show the report regardless of test results
echo "Opening test report..."

# Kill any existing report server to avoid port conflicts
pkill -f "playwright show-report" 2>/dev/null || true

# Wait a moment for the process to fully terminate
sleep 1

# Start the new report server
npx playwright show-report

# Exit with the same code as the test command
exit $TEST_EXIT_CODE