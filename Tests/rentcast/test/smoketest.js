#!/usr/bin/env node

// Load .env file
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const RentCastSmokeTest = require('../index.js');

/**
 * Main smoke test runner
 */
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    verbose: args.includes('--verbose'),
    baseUrl: 'https://api.rentcast.io/v1',
    timeout: 30000,
    apiKey: process.env.RENTCAST_API_KEY || null
  };

  // Parse custom API key if provided
  const keyIndex = args.indexOf('--key');
  if (keyIndex !== -1 && args[keyIndex + 1]) {
    options.apiKey = args[keyIndex + 1];
  }

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

  if (!options.apiKey) {
    console.warn('\n⚠ WARNING: RENTCAST_API_KEY not set');
    console.warn('Set the RENTCAST_API_KEY environment variable or pass --key argument');
    console.warn('Tests that require authentication will be skipped\n');
  }

  const smokeTest = new RentCastSmokeTest(options);

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
