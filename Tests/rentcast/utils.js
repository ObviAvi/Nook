/**
 * Utility functions for RentCast Smoke Test Service
 */

const RentCastSmokeTest = require('./index.js');
const fs = require('fs');

/**
 * Run smoke tests and return exit code
 * Useful for scripts and CI/CD pipelines
 */
async function runSmokeTests(config = {}) {
  const smokeTest = new RentCastSmokeTest(config);
  const results = await smokeTest.runAllTests();
  smokeTest.printResults();
  return results.summary.failed === 0 ? 0 : 1;
}

/**
 * Check if API is healthy
 * Returns a simple boolean result
 */
async function isAPIHealthy(config = {}) {
  try {
    const smokeTest = new RentCastSmokeTest({ ...config, verbose: false });
    const results = await smokeTest.runAllTests();
    return results.summary.failed === 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get API status with detailed information
 */
async function getAPIStatus(config = {}) {
  const smokeTest = new RentCastSmokeTest(config);
  const results = await smokeTest.runAllTests();
  
  return {
    healthy: results.summary.failed === 0,
    uptime: results.summary.passed === results.summary.total - results.summary.skipped,
    passRate: `${(results.summary.passed / (results.summary.total - results.summary.skipped) * 100).toFixed(2)}%`,
    timestamp: results.summary.timestamp,
    summary: results.summary,
    details: results.tests
  };
}

/**
 * Send notifications based on test results
 * Customize for your notification service (Slack, email, etc.)
 */
async function notifyResults(results, notificationHandler) {
  const { summary } = results;
  
  const status = summary.failed === 0 ? 'PASS' : 'FAIL';
  const message = `
RentCast API Smoke Test Results:
Status: ${status}
Passed: ${summary.passed}/${summary.total - summary.skipped}
Skipped: ${summary.skipped}
Warnings: ${summary.warnings}
Timestamp: ${summary.timestamp}
  `;
  
  if (notificationHandler && typeof notificationHandler === 'function') {
    notificationHandler(status, message, results);
  }
}

/**
 * Export results to JSON file
 */
async function exportResultsToJSON(results, filename = 'rentcast-smoketest-results.json') {
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  return filename;
}

/**
 * Export results to CSV format
 */
async function exportResultsToCSV(results, filename = 'rentcast-smoketest-results.csv') {
  const { tests } = results;
  
  let csv = 'Test Name,Status,Message,Timestamp\n';
  tests.forEach(test => {
    csv += `"${test.test}","${test.status}","${test.message.replace(/"/g, '""')}","${results.summary.timestamp}"\n`;
  });
  
  fs.writeFileSync(filename, csv);
  return filename;
}

/**
 * Benchmark RentCast API performance
 * Runs tests multiple times and collects timing data
 */
async function benchmarkAPI(iterations = 5, config = {}) {
  const results = [];
  
  console.log(`Running ${iterations} iterations for performance benchmarking...`);
  
  for (let i = 1; i <= iterations; i++) {
    const smokeTest = new RentCastSmokeTest({ ...config, verbose: false });
    const start = Date.now();
    await smokeTest.runAllTests();
    const duration = Date.now() - start;
    
    results.push({
      iteration: i,
      duration,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Iteration ${i}/${iterations} completed in ${duration}ms`);
  }
  
  const times = results.map(r => r.duration);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
  
  return {
    iterations,
    results,
    statistics: {
      average: avg.toFixed(2),
      median: median,
      minimum: min,
      maximum: max,
      unit: 'milliseconds'
    }
  };
}

/**
 * Retry test execution on failure
 */
async function runWithRetry(testFn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxRetries}`);
      return await testFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        console.log(`Attempt failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Create a monitoring dashboard data structure
 */
async function createMonitoringSnapshot(config = {}) {
  const smokeTest = new RentCastSmokeTest(config);
  const results = await smokeTest.runAllTests();
  
  return {
    timestamp: new Date().toISOString(),
    apiOnline: results.summary.failed === 0,
    testsPassed: results.summary.passed,
    testsFailed: results.summary.failed,
    testsSkipped: results.summary.skipped,
    testsWarning: results.summary.warnings,
    totalTests: results.summary.total,
    successRate: `${((results.summary.passed / (results.summary.total - results.summary.skipped)) * 100).toFixed(2)}%`,
    tests: results.tests.filter(t => t.status !== 'SKIP')
  };
}

/**
 * Compare two test results
 */
function compareResults(before, after) {
  const comparison = {
    timestamp: new Date().toISOString(),
    before: before.summary,
    after: after.summary,
    changes: {
      passedDelta: after.summary.passed - before.summary.passed,
      failedDelta: after.summary.failed - before.summary.failed,
      warningsDelta: after.summary.warnings - before.summary.warnings
    },
    improved: after.summary.failed < before.summary.failed,
    degraded: after.summary.failed > before.summary.failed,
    stable: after.summary.failed === before.summary.failed
  };
  
  return comparison;
}

/**
 * Generate performance report
 */
function generatePerformanceReport(benchmarkResults) {
  const stats = benchmarkResults.statistics;
  const results = benchmarkResults.results;
  
  let report = 'Performance Benchmark Report\n';
  report += '============================\n\n';
  report += `Iterations: ${benchmarkResults.iterations}\n`;
  report += `Average Response Time: ${stats.average}ms\n`;
  report += `Median Response Time: ${stats.median}ms\n`;
  report += `Min Response Time: ${stats.minimum}ms\n`;
  report += `Max Response Time: ${stats.maximum}ms\n`;
  report += `Range: ${stats.maximum - stats.minimum}ms\n\n`;
  
  report += 'Individual Results:\n';
  results.forEach(result => {
    report += `  Iteration ${result.iteration}: ${result.duration}ms\n`;
  });
  
  return report;
}

module.exports = {
  runSmokeTests,
  isAPIHealthy,
  getAPIStatus,
  notifyResults,
  exportResultsToJSON,
  exportResultsToCSV,
  benchmarkAPI,
  runWithRetry,
  createMonitoringSnapshot,
  compareResults,
  generatePerformanceReport
};
