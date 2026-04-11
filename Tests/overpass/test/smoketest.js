#!/usr/bin/env node

const OverpassSmokeTest = require('../index.js');

/**
 * Main smoke test runner
 */
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    verbose: args.includes('--verbose'),
    baseUrl: 'https://overpass-api.de/api',
    timeout: 30000
  };

  // Parse custom base URL if provided
  const urlIndex = args.indexOf('--url');
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    options.baseUrl = args[urlIndex + 1];
  }

  // Parse custom timeout if provided
  const timeoutIndex = args.indexOf('--timeout');
  if (timeoutIndex !== -1 && args[timeoutIndex + 1]) {
    options.timeout = parseInt(args[timeoutIndex + 1], 10);
  }

  const smokeTest = new OverpassSmokeTest(options);

  try {
    await smokeTest.runAllTests();
    const exitCode = smokeTest.printResults();
    process.exit(exitCode);
  } catch (error) {
    console.error('Fatal error running smoke tests:', error);
    process.exit(1);
  }
}

main();
