const axios = require('axios');

class OverpassSmokeTest {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://overpass-api.de/api';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.results = [];
    this.verbose = options.verbose || false;
    this.delayBetweenTests = options.delayBetweenTests || 2000; // 2 seconds default
  }

  log(message, level = 'info') {
    if (this.verbose || level === 'error') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Helper: Sleep for a specified duration
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: Send encoded query to Overpass API
   * Formats query using URLSearchParams for proper form encoding
   * Includes retry logic for rate limiting (429), timeouts (504), and temporary errors
   */
  async sendQuery(query, retryCount = 0) {
    const params = new URLSearchParams();
    params.append('data', query);
    
    try {
      return await axios.post(
        `${this.baseUrl}/interpreter`,
        params.toString(),
        {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
    } catch (error) {
      // Handle rate limiting (429) and gateway timeouts (504) with exponential backoff
      if ((error.response?.status === 429 || error.response?.status === 504) && retryCount < this.maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        const statusMsg = error.response.status === 429 ? 'Rate limited' : 'Gateway timeout';
        this.log(`${statusMsg} (${error.response.status}). Retrying in ${backoffDelay}ms...`, 'warn');
        await this.sleep(backoffDelay);
        return this.sendQuery(query, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Test 1: API Connectivity
   * Verify that the API endpoint is reachable
   */
  async testConnectivity() {
    const testName = 'API Connectivity';
    this.log(`Running: ${testName}`);
    
    try {
      const response = await axios.get(`${this.baseUrl}/status`, {
        timeout: this.timeout
      });
      
      if (response.status === 200) {
        this.log(`✓ ${testName} passed`);
        this.results.push({ test: testName, status: 'PASS', message: 'API is reachable' });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 2: Basic Node Query
   * Query a simple element (node) by ID
   */
  async testNodeQuery() {
    const testName = 'Node Query';
    this.log(`Running: ${testName}`);
    
    try {
      const query = `[out:json];node(1);out;`;
      const response = await this.sendQuery(query);

      if (response.status === 200 && response.data.elements) {
        this.log(`✓ ${testName} passed - Retrieved ${response.data.elements.length} elements`);
        this.results.push({ test: testName, status: 'PASS', message: `Retrieved ${response.data.elements.length} elements` });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 3: Bounding Box Query
   * Query data within a bounding box (smaller area to avoid timeouts)
   */
  async testBoundingBoxQuery() {
    const testName = 'Bounding Box Query';
    this.log(`Running: ${testName}`);
    
    try {
      // Smaller bounding box to keep response small and avoid server timeouts
      const query = `[out:json][bbox:37.77,-122.41,37.79,-122.39];(node;);out;`;
      
      const response = await this.sendQuery(query);

      if (response.status === 200 && response.data && typeof response.data === 'object') {
        this.log(`✓ ${testName} passed - Valid response received`);
        this.results.push({ test: testName, status: 'PASS', message: 'Valid bbox query response' });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 4: JSON Output Format
   * Verify that JSON output format is supported and valid
   */
  async testJSONFormat() {
    const testName = 'JSON Output Format';
    this.log(`Running: ${testName}`);
    
    try {
      const query = `[out:json];node(1);out;`;
      const response = await this.sendQuery(query);

      if (response.data && response.data.version && response.data.elements !== undefined) {
        this.log(`✓ ${testName} passed - Valid OSM JSON structure`);
        this.results.push({ test: testName, status: 'PASS', message: 'Valid JSON format with required fields' });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 5: Query Timeout Handling
   * Verify that queries with timeout parameter work correctly
   */
  async testTimeoutParameter() {
    const testName = 'Query Timeout Parameter';
    this.log(`Running: ${testName}`);
    
    try {
      // Query with explicit timeout setting
      const query = `[out:json][timeout:25];node(1);out;`;
      const response = await this.sendQuery(query);

      if (response.status === 200) {
        this.log(`✓ ${testName} passed`);
        this.results.push({ test: testName, status: 'PASS', message: 'Timeout parameter handled correctly' });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 6: Response Time Check
   * Verify that API responses are within acceptable time limits
   */
  async testResponseTime() {
    const testName = 'Response Time Check';
    this.log(`Running: ${testName}`);
    
    try {
      const startTime = Date.now();
      const query = `[out:json];node(1);out;`;
      
      await this.sendQuery(query);

      const responseTime = Date.now() - startTime;
      const threshold = 10000; // 10 seconds

      if (responseTime < threshold) {
        this.log(`✓ ${testName} passed - Response time: ${responseTime}ms`);
        this.results.push({ test: testName, status: 'PASS', message: `Response time: ${responseTime}ms` });
        return true;
      } else {
        this.log(`⚠ ${testName} warning - Response time: ${responseTime}ms (exceeds ${threshold}ms)`);
        this.results.push({ test: testName, status: 'WARN', message: `Response time: ${responseTime}ms` });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Run all smoke tests
   */
  async runAllTests() {
    this.log('Starting Overpass API Smoke Tests...');
    this.results = [];

    const tests = [
      this.testConnectivity.bind(this),
      this.testNodeQuery.bind(this),
      this.testBoundingBoxQuery.bind(this),
      this.testJSONFormat.bind(this),
      this.testTimeoutParameter.bind(this),
      this.testResponseTime.bind(this)
    ];

    for (let i = 0; i < tests.length; i++) {
      try {
        await tests[i]();
      } catch (error) {
        this.log(`Unexpected error in test: ${error.message}`, 'error');
      }

      // Add delay between tests to avoid rate limiting (except after the last test)
      if (i < tests.length - 1) {
        await this.sleep(this.delayBetweenTests);
      }
    }

    return this.getResults();
  }

  /**
   * Get test results
   */
  getResults() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;

    return {
      summary: {
        total: this.results.length,
        passed,
        failed,
        warnings,
        timestamp: new Date().toISOString()
      },
      tests: this.results
    };
  }

  /**
   * Print formatted results
   */
  printResults() {
    const results = this.getResults();
    
    console.log('\n' + '='.repeat(60));
    console.log('OVERPASS API SMOKE TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${results.summary.timestamp}`);
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`✓ Passed: ${results.summary.passed}`);
    console.log(`✗ Failed: ${results.summary.failed}`);
    console.log(`⚠ Warnings: ${results.summary.warnings}`);
    console.log('-'.repeat(60));
    
    results.tests.forEach(test => {
      const statusSymbol = test.status === 'PASS' ? '✓' : test.status === 'FAIL' ? '✗' : '⚠';
      console.log(`${statusSymbol} [${test.status}] ${test.test}`);
      console.log(`  Message: ${test.message}`);
    });
    
    console.log('='.repeat(60));
    
    return results.summary.failed === 0 ? 0 : 1;
  }
}

module.exports = OverpassSmokeTest;
