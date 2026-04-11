/**
 * Example: Using the RentCast Smoke Test Service
 * 
 * This file demonstrates how to use the smoke test service
 * in various ways. Note that most examples require an API key.
 */

// Load .env file
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const RentCastSmokeTest = require('./index.js');
const utils = require('./utils.js');

/**
 * Example 1: Basic usage with default settings
 */
async function example1_basicUsage() {
  console.log('Example 1: Basic Usage\n');
  
  if (!process.env.RENTCAST_API_KEY) {
    console.log('⚠ Skipping - RENTCAST_API_KEY not set\n');
    return;
  }

  const smokeTest = new RentCastSmokeTest({
    apiKey: process.env.RENTCAST_API_KEY
  });
  const results = await smokeTest.runAllTests();
  smokeTest.printResults();
}

/**
 * Example 2: Custom configuration with verbose logging
 */
async function example2_customConfig() {
  console.log('\n\nExample 2: Custom Configuration\n');
  
  if (!process.env.RENTCAST_API_KEY) {
    console.log('⚠ Skipping - RENTCAST_API_KEY not set\n');
    return;
  }

  const smokeTest = new RentCastSmokeTest({
    apiKey: process.env.RENTCAST_API_KEY,
    baseUrl: 'https://api.rentcast.io/v1',
    timeout: 45000,
    verbose: true
  });
  
  const results = await smokeTest.runAllTests();
  console.log('\nResults Summary:', JSON.stringify(results.summary, null, 2));
}

/**
 * Example 3: Running individual tests
 */
async function example3_individualTests() {
  console.log('\n\nExample 3: Running Individual Tests\n');
  
  if (!process.env.RENTCAST_API_KEY) {
    console.log('⚠ Skipping - RENTCAST_API_KEY not set\n');
    return;
  }

  const smokeTest = new RentCastSmokeTest({
    apiKey: process.env.RENTCAST_API_KEY,
    verbose: true
  });
  
  // Run specific tests only
  await smokeTest.testAuthentication();
  await smokeTest.testCitySearch();
  await smokeTest.testRentalListingsSearch();
  
  smokeTest.printResults();
}

/**
 * Example 4: Programmatic result handling
 */
async function example4_resultHandling() {
  console.log('\n\nExample 4: Programmatic Result Handling\n');
  
  if (!process.env.RENTCAST_API_KEY) {
    console.log('⚠ Skipping - RENTCAST_API_KEY not set\n');
    return;
  }

  const smokeTest = new RentCastSmokeTest({
    apiKey: process.env.RENTCAST_API_KEY
  });
  const results = await smokeTest.runAllTests();
  
  // Process results programmatically
  const { summary, tests } = results;
  
  console.log(`API Status: ${summary.failed === 0 ? '✓ HEALTHY' : '✗ UNHEALTHY'}`);
  console.log(`Test Success Rate: ${(summary.passed / (summary.total - summary.skipped) * 100).toFixed(2)}%`);
  console.log(`Tests Skipped: ${summary.skipped} (requires API key)`);
  
  // Find failed tests
  const failures = tests.filter(t => t.status === 'FAIL');
  if (failures.length > 0) {
    console.log('\nFailed Tests:');
    failures.forEach(test => {
      console.log(`  - ${test.test}: ${test.message}`);
    });
  }
}

/**
 * Example 5: Using utility functions
 */
async function example5_utilities() {
  console.log('\n\nExample 5: Using Utility Functions\n');
  
  if (!process.env.RENTCAST_API_KEY) {
    console.log('⚠ Skipping - RENTCAST_API_KEY not set\n');
    return;
  }

  const config = {
    apiKey: process.env.RENTCAST_API_KEY,
    verbose: false
  };

  // Check if API is healthy
  const isHealthy = await utils.isAPIHealthy(config);
  console.log(`API Health: ${isHealthy ? '✓ Healthy' : '✗ Unhealthy'}`);

  // Get detailed status
  const status = await utils.getAPIStatus(config);
  console.log(`\nDetailed Status:`, JSON.stringify(status, null, 2));
}

/**
 * Example 6: Benchmarking
 */
async function example6_benchmarking() {
  console.log('\n\nExample 6: Performance Benchmarking (3 iterations)\n');
  
  if (!process.env.RENTCAST_API_KEY) {
    console.log('⚠ Skipping - RENTCAST_API_KEY not set\n');
    return;
  }

  const config = {
    apiKey: process.env.RENTCAST_API_KEY,
    verbose: false
  };

  const benchmark = await utils.benchmarkAPI(3, config);
  const report = utils.generatePerformanceReport(benchmark);
  console.log(report);
}

/**
 * Example 7: Exporting results
 */
async function example7_exportResults() {
  console.log('\n\nExample 7: Exporting Test Results\n');
  
  if (!process.env.RENTCAST_API_KEY) {
    console.log('⚠ Skipping - RENTCAST_API_KEY not set\n');
    return;
  }

  const smokeTest = new RentCastSmokeTest({
    apiKey: process.env.RENTCAST_API_KEY,
    verbose: false
  });

  const results = await smokeTest.runAllTests();

  // Export to JSON
  const jsonFile = await utils.exportResultsToJSON(results, 'results.json');
  console.log(`Results exported to JSON: ${jsonFile}`);

  // Export to CSV
  const csvFile = await utils.exportResultsToCSV(results, 'results.csv');
  console.log(`Results exported to CSV: ${csvFile}`);
}

/**
 * Example 8: Monitoring snapshot for dashboard
 */
async function example8_monitoringSnapshot() {
  console.log('\n\nExample 8: Creating Monitoring Snapshot\n');
  
  if (!process.env.RENTCAST_API_KEY) {
    console.log('⚠ Skipping - RENTCAST_API_KEY not set\n');
    return;
  }

  const config = {
    apiKey: process.env.RENTCAST_API_KEY,
    verbose: false
  };

  const snapshot = await utils.createMonitoringSnapshot(config);
  console.log('Monitoring Snapshot:');
  console.log(JSON.stringify(snapshot, null, 2));
}

/**
 * Example 9: Retry logic
 */
async function example9_retryLogic() {
  console.log('\n\nExample 9: Retry Logic\n');
  
  if (!process.env.RENTCAST_API_KEY) {
    console.log('⚠ Skipping - RENTCAST_API_KEY not set\n');
    return;
  }

  let attempts = 0;

  const testFunction = async () => {
    attempts++;
    console.log(`Attempt ${attempts}`);
    
    const smokeTest = new RentCastSmokeTest({
      apiKey: process.env.RENTCAST_API_KEY,
      verbose: false
    });
    
    return await smokeTest.runAllTests();
  };

  try {
    const results = await utils.runWithRetry(testFunction, 2, 1000);
    console.log('✓ Succeeded after', attempts, 'attempts');
  } catch (error) {
    console.error('✗ Failed after', attempts, 'attempts:', error.message);
  }
}

// Uncomment to run examples:
// example1_basicUsage();
// example2_customConfig();
// example3_individualTests();
// example4_resultHandling();
// example5_utilities();
// example6_benchmarking();
// example7_exportResults();
// example8_monitoringSnapshot();
// example9_retryLogic();

module.exports = {
  example1_basicUsage,
  example2_customConfig,
  example3_individualTests,
  example4_resultHandling,
  example5_utilities,
  example6_benchmarking,
  example7_exportResults,
  example8_monitoringSnapshot,
  example9_retryLogic
};
