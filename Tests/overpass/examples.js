/**
 * Example: Using the Overpass Smoke Test Service
 * 
 * This file demonstrates how to use the smoke test service
 * in various ways.
 */

const OverpassSmokeTest = require('./index.js');

/**
 * Example 1: Basic usage with default settings
 */
async function example1_basicUsage() {
  console.log('Example 1: Basic Usage\n');
  
  const smokeTest = new OverpassSmokeTest();
  const results = await smokeTest.runAllTests();
  smokeTest.printResults();
}

/**
 * Example 2: Custom configuration with verbose logging
 */
async function example2_customConfig() {
  console.log('\n\nExample 2: Custom Configuration\n');
  
  const smokeTest = new OverpassSmokeTest({
    baseUrl: 'https://overpass-api.de/api',
    timeout: 45000,
    verbose: true
  });
  
  const results = await smokeTest.runAllTests();
  console.log('\nResults:', JSON.stringify(results, null, 2));
}

/**
 * Example 3: Running individual tests
 */
async function example3_individualTests() {
  console.log('\n\nExample 3: Running Individual Tests\n');
  
  const smokeTest = new OverpassSmokeTest({ verbose: true });
  
  // Run specific tests
  await smokeTest.testConnectivity();
  await smokeTest.testNodeQuery();
  await smokeTest.testResponseTime();
  
  smokeTest.printResults();
}

/**
 * Example 4: Programmatic result handling
 */
async function example4_resultHandling() {
  console.log('\n\nExample 4: Programmatic Result Handling\n');
  
  const smokeTest = new OverpassSmokeTest();
  const results = await smokeTest.runAllTests();
  
  // Process results programmatically
  const { summary, tests } = results;
  
  console.log(`API Status: ${summary.failed === 0 ? '✓ HEALTHY' : '✗ UNHEALTHY'}`);
  console.log(`Test Success Rate: ${(summary.passed / summary.total * 100).toFixed(2)}%`);
  
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
 * Example 5: Monitoring with periodic checks
 */
async function example5_periodicMonitoring() {
  console.log('\n\nExample 5: Periodic Monitoring (runs 3 times with 5s interval)\n');
  
  let checkCount = 0;
  const maxChecks = 3;
  const interval = 5000; // 5 seconds
  
  const monitor = setInterval(async () => {
    checkCount++;
    console.log(`\n--- Check ${checkCount} at ${new Date().toISOString()} ---`);
    
    const smokeTest = new OverpassSmokeTest();
    const results = await smokeTest.runAllTests();
    const { summary } = results;
    
    console.log(`Status: ${summary.failed === 0 ? '✓ UP' : '✗ DOWN'} (${summary.passed}/${summary.total} passed)`);
    
    if (checkCount >= maxChecks) {
      clearInterval(monitor);
      console.log('\nMonitoring completed.');
    }
  }, interval);
}

/**
 * Example 6: Alternative Overpass API instance
 */
async function example6_alternativeInstance() {
  console.log('\n\nExample 6: Testing Alternative Overpass Instance\n');
  
  // Note: This example shows how to test a different Overpass instance
  // Uncomment if you have an alternative Overpass API server
  
  const smokeTest = new OverpassSmokeTest({
    baseUrl: 'https://overpass-api.de/api', // or another instance
    verbose: true
  });
  
  const results = await smokeTest.runAllTests();
  smokeTest.printResults();
}

// Uncomment to run examples:
// example1_basicUsage();
// example2_customConfig();
// example3_individualTests();
// example4_resultHandling();
// example5_periodicMonitoring();
// example6_alternativeInstance();

module.exports = {
  example1_basicUsage,
  example2_customConfig,
  example3_individualTests,
  example4_resultHandling,
  example5_periodicMonitoring,
  example6_alternativeInstance
};
