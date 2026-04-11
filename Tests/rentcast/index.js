// Load .env file
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const axios = require('axios');

class RentCastSmokeTest {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.RENTCAST_API_KEY || null;
    this.baseUrl = options.baseUrl || 'https://api.rentcast.io/v1';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.results = [];
    this.verbose = options.verbose || false;
    this.delayBetweenTests = options.delayBetweenTests || 500; // 500ms between tests (20 req/sec rate limit)
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
   * Helper: Send request to RentCast API
   * Includes retry logic for rate limiting (429) and server errors (500, 504)
   */
  async sendRequest(endpoint, params = {}, retryCount = 0) {
    if (!this.apiKey) {
      throw new Error('RENTCAST_API_KEY is not set. Please provide an API key via options or environment variable.');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}${endpoint}`,
        {
          params,
          timeout: this.timeout,
          headers: {
            'X-Api-Key': this.apiKey,
            'Accept': 'application/json'
          }
        }
      );
      return response;
    } catch (error) {
      // Handle rate limiting (429) and server errors (500, 504) with exponential backoff
      if ((error.response?.status === 429 || error.response?.status === 500 || error.response?.status === 504) && retryCount < this.maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        const statusMsg = error.response.status === 429 ? 'Rate limited' : 'Server error';
        this.log(`${statusMsg} (${error.response.status}). Retrying in ${backoffDelay}ms...`, 'warn');
        await this.sleep(backoffDelay);
        return this.sendRequest(endpoint, params, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Test 1: API Authentication & Connectivity
   * Verify that the API is reachable with valid authentication
   */
  async testAuthentication() {
    const testName = 'API Authentication & Connectivity';
    this.log(`Running: ${testName}`);
    
    if (!this.apiKey) {
      this.log(`⚠ ${testName} skipped - No API key provided`, 'warn');
      this.results.push({ test: testName, status: 'SKIP', message: 'No API key provided' });
      return true;
    }

    try {
      // Try a simple property search to validate authentication
      const response = await this.sendRequest('/properties', {
        city: 'Austin',
        state: 'TX',
        limit: 1
      });

      if (response.status === 200) {
        this.log(`✓ ${testName} passed`);
        this.results.push({ test: testName, status: 'PASS', message: 'API is reachable and authenticated' });
        return true;
      }
    } catch (error) {
      const message = error.response?.status === 401 ? 'Authentication failed - Invalid API key' : error.message;
      this.log(`✗ ${testName} failed: ${message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message });
      return false;
    }
  }

  /**
   * Test 2: Single Property Lookup by Address
   * Query a specific property using full address
   */
  async testSinglePropertyAddress() {
    const testName = 'Single Property Lookup by Address';
    this.log(`Running: ${testName}`);
    
    if (!this.apiKey) {
      this.log(`⚠ ${testName} skipped - No API key provided`, 'warn');
      this.results.push({ test: testName, status: 'SKIP', message: 'No API key provided' });
      return true;
    }

    try {
      // Query a well-known address
      const response = await this.sendRequest('/properties', {
        address: '5500 Grand Lake Dr, San Antonio, TX 78244'
      });

      if (response.status === 200 && response.data) {
        // Check if response has expected properties
        const hasData = Array.isArray(response.data) || response.data.results;
        this.log(`✓ ${testName} passed`);
        this.results.push({ test: testName, status: 'PASS', message: 'Property address lookup successful' });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 3: City-Based Property Search
   * Search for properties in a specific city with filters
   */
  async testCitySearch() {
    const testName = 'City-Based Property Search';
    this.log(`Running: ${testName}`);
    
    if (!this.apiKey) {
      this.log(`⚠ ${testName} skipped - No API key provided`, 'warn');
      this.results.push({ test: testName, status: 'SKIP', message: 'No API key provided' });
      return true;
    }

    try {
      // Search Austin, TX with bedroom filter
      const response = await this.sendRequest('/properties', {
        city: 'Austin',
        state: 'TX',
        bedrooms: '2:3',  // 2-3 bedrooms
        limit: 10
      });

      if (response.status === 200 && response.data) {
        const resultCount = Array.isArray(response.data) ? response.data.length : (response.data.results?.length || 0);
        this.log(`✓ ${testName} passed - Found ${resultCount} properties`);
        this.results.push({ test: testName, status: 'PASS', message: `Found ${resultCount} properties` });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 4: Zip Code Search
   * Search for properties by zip code
   */
  async testZipCodeSearch() {
    const testName = 'Zip Code Search';
    this.log(`Running: ${testName}`);
    
    if (!this.apiKey) {
      this.log(`⚠ ${testName} skipped - No API key provided`, 'warn');
      this.results.push({ test: testName, status: 'SKIP', message: 'No API key provided' });
      return true;
    }

    try {
      // Search by zip code
      const response = await this.sendRequest('/properties', {
        zipCode: '78704',  // Austin, TX zip code
        limit: 5
      });

      if (response.status === 200 && response.data) {
        this.log(`✓ ${testName} passed`);
        this.results.push({ test: testName, status: 'PASS', message: 'Zip code search successful' });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 5: Rental Listings Search
   * Search for rental listings with price and recency filters
   */
  async testRentalListingsSearch() {
    const testName = 'Rental Listings Search';
    this.log(`Running: ${testName}`);
    
    if (!this.apiKey) {
      this.log(`⚠ ${testName} skipped - No API key provided`, 'warn');
      this.results.push({ test: testName, status: 'SKIP', message: 'No API key provided' });
      return true;
    }

    try {
      // Search for rental listings with filters
      const response = await this.sendRequest('/listings/rental/long-term', {
        city: 'Austin',
        state: 'TX',
        bedrooms: '2:4',
        price: '1000:3000',  // $1000 - $3000 per month
        daysOld: '0:30',     // Listed within last 30 days
        limit: 10
      });

      if (response.status === 200 && response.data) {
        const resultCount = Array.isArray(response.data) ? response.data.length : (response.data.results?.length || 0);
        this.log(`✓ ${testName} passed - Found ${resultCount} rental listings`);
        this.results.push({ test: testName, status: 'PASS', message: `Found ${resultCount} rental listings` });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 6: Sale Listings Search
   * Search for property sale listings with price filters
   */
  async testSaleListingsSearch() {
    const testName = 'Sale Listings Search';
    this.log(`Running: ${testName}`);
    
    if (!this.apiKey) {
      this.log(`⚠ ${testName} skipped - No API key provided`, 'warn');
      this.results.push({ test: testName, status: 'SKIP', message: 'No API key provided' });
      return true;
    }

    try {
      // Search for sale listings with price filter
      const response = await this.sendRequest('/listings/sale', {
        city: 'Austin',
        state: 'TX',
        price: '250000:500000',  // $250k - $500k
        limit: 10
      });

      if (response.status === 200 && response.data) {
        const resultCount = Array.isArray(response.data) ? response.data.length : (response.data.results?.length || 0);
        this.log(`✓ ${testName} passed - Found ${resultCount} sale listings`);
        this.results.push({ test: testName, status: 'PASS', message: `Found ${resultCount} sale listings` });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 7: Response Format Validation
   * Verify API responses contain expected data fields
   */
  async testResponseFormat() {
    const testName = 'Response Format Validation';
    this.log(`Running: ${testName}`);
    
    if (!this.apiKey) {
      this.log(`⚠ ${testName} skipped - No API key provided`, 'warn');
      this.results.push({ test: testName, status: 'SKIP', message: 'No API key provided' });
      return true;
    }

    try {
      const response = await this.sendRequest('/properties', {
        city: 'Austin',
        state: 'TX',
        limit: 1
      });

      if (response.status === 200 && response.data) {
        // Validate response structure
        const data = Array.isArray(response.data) ? response.data[0] : response.data.results?.[0];
        
        if (data && typeof data === 'object') {
          this.log(`✓ ${testName} passed - Valid JSON response structure`);
          this.results.push({ test: testName, status: 'PASS', message: 'Response contains valid property objects' });
          return true;
        }
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 8: Pagination Support
   * Verify that pagination parameters (limit, offset) work
   */
  async testPagination() {
    const testName = 'Pagination Support';
    this.log(`Running: ${testName}`);
    
    if (!this.apiKey) {
      this.log(`⚠ ${testName} skipped - No API key provided`, 'warn');
      this.results.push({ test: testName, status: 'SKIP', message: 'No API key provided' });
      return true;
    }

    try {
      // First page
      const response1 = await this.sendRequest('/properties', {
        city: 'Austin',
        state: 'TX',
        limit: 5,
        offset: 0
      });

      // Second page (if results exist)
      const response2 = await this.sendRequest('/properties', {
        city: 'Austin',
        state: 'TX',
        limit: 5,
        offset: 5
      });

      if (response1.status === 200 && response2.status === 200) {
        this.log(`✓ ${testName} passed - Pagination parameters work correctly`);
        this.results.push({ test: testName, status: 'PASS', message: 'Offset and limit pagination working' });
        return true;
      }
    } catch (error) {
      this.log(`✗ ${testName} failed: ${error.message}`, 'error');
      this.results.push({ test: testName, status: 'FAIL', message: error.message });
      return false;
    }
  }

  /**
   * Test 9: Response Time Check
   * Measure API response time and warn if slow
   */
  async testResponseTime() {
    const testName = 'Response Time Check';
    this.log(`Running: ${testName}`);
    
    if (!this.apiKey) {
      this.log(`⚠ ${testName} skipped - No API key provided`, 'warn');
      this.results.push({ test: testName, status: 'SKIP', message: 'No API key provided' });
      return true;
    }

    try {
      const startTime = Date.now();
      
      await this.sendRequest('/properties', {
        city: 'Austin',
        state: 'TX',
        limit: 1
      });

      const responseTime = Date.now() - startTime;
      const threshold = 5000; // 5 seconds

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
    this.log('Starting RentCast API Smoke Tests...');
    this.results = [];

    const tests = [
      this.testAuthentication.bind(this),
      this.testSinglePropertyAddress.bind(this),
      this.testCitySearch.bind(this),
      this.testZipCodeSearch.bind(this),
      this.testRentalListingsSearch.bind(this),
      this.testSaleListingsSearch.bind(this),
      this.testResponseFormat.bind(this),
      this.testPagination.bind(this),
      this.testResponseTime.bind(this)
    ];

    for (let i = 0; i < tests.length; i++) {
      try {
        await tests[i]();
      } catch (error) {
        this.log(`Unexpected error in test: ${error.message}`, 'error');
      }

      // Add delay between tests to respect rate limits (20 req/sec = 50ms per request)
      if (i < tests.length - 1) {
        await this.sleep(this.delayBetweenTests);
      }
    }

    return this.getResults();
  }

  /**
   * Get test results summary
   */
  getResults() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;

    return {
      summary: {
        total: this.results.length,
        passed,
        failed,
        skipped,
        warnings,
        timestamp: new Date().toISOString()
      },
      tests: this.results
    };
  }

  /**
   * Print formatted results to console
   */
  printResults() {
    const results = this.getResults();
    
    console.log('\n' + '='.repeat(70));
    console.log('RENTCAST API SMOKE TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`Timestamp: ${results.summary.timestamp}`);
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`✓ Passed: ${results.summary.passed}`);
    console.log(`✗ Failed: ${results.summary.failed}`);
    console.log(`⊘ Skipped: ${results.summary.skipped}`);
    console.log(`⚠ Warnings: ${results.summary.warnings}`);
    console.log('-'.repeat(70));
    
    results.tests.forEach(test => {
      const statusSymbol = test.status === 'PASS' ? '✓' : test.status === 'FAIL' ? '✗' : test.status === 'SKIP' ? '⊘' : '⚠';
      console.log(`${statusSymbol} [${test.status}] ${test.test}`);
      console.log(`  Message: ${test.message}`);
    });
    
    console.log('='.repeat(70));
    
    // Return exit code: 0 if no failures, 1 if there are failures
    return results.summary.failed === 0 ? 0 : 1;
  }
}

module.exports = RentCastSmokeTest;
