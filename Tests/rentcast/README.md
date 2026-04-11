# RentCast API Smoke Test Service

A comprehensive Node.js smoke test service for the [RentCast API](https://developers.rentcast.io/). This service verifies that the RentCast API is operational and capable of serving rental property listings and sale data.

## Overview

RentCast provides a robust API for accessing rental and sale property listings, including search filters, property information, and market data. This smoke test service performs automated checks to ensure:

- API authentication is working
- Property searches by address work
- City-based property searches function correctly
- Zip code searches return results
- Rental listing searches work with filters
- Sale listing searches work with filters
- API responses contain valid data
- Pagination works properly
- Response times are acceptable

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up your API key (choose one method):**

   **Method 1: Using `.env` file (Recommended - Easiest)**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env and replace 'your-api-key-here' with your actual API key
   ```
   
   The `.env` file is automatically loaded when running tests. Simply:
   ```bash
   npm test
   ```

   **Method 2: Environment Variable**
   ```bash
   export RENTCAST_API_KEY="your-api-key-here"
   npm test
   ```

   Or on Windows (PowerShell):
   ```powershell
   $env:RENTCAST_API_KEY = "your-api-key-here"
   npm test
   ```

   **Method 3: Command Line Argument**
   ```bash
   node test/smoketest.js --key "your-api-key-here"
   ```

   Get your API key from the [RentCast API Dashboard](https://app.rentcast.io/app/api)

## Usage

### Command Line

Run the smoke tests from the command line:

```bash
# Basic smoke test (requires API key)
npm test

# Verbose output
npm test:verbose

# Quick test (single test)
npm test:quick
```

### Advanced Options

```bash
# Provide API key via command line
node test/smoketest.js --key "your-api-key-here"

# Custom timeout (in milliseconds)
node test/smoketest.js --timeout 60000

# Custom API endpoint
node test/smoketest.js --url https://api.example.com/v1

# Verbose output
node test/smoketest.js --verbose

# Combine options
node test/smoketest.js --key "your-api-key" --timeout 60000 --verbose
```

### Programmatic Usage

You can also use the service in your own Node.js code:

```javascript
const RentCastSmokeTest = require('./index.js');

const smokeTest = new RentCastSmokeTest({
  apiKey: 'your-api-key-here',
  baseUrl: 'https://api.rentcast.io/v1',
  timeout: 30000,
  verbose: true
});

// Run all tests
const results = await smokeTest.runAllTests();
console.log(results);

// Or run individual tests
await smokeTest.testAuthentication();
await smokeTest.testCitySearch();

// Get formatted results
smokeTest.printResults();
```

## Tests Included

### 1. API Authentication & Connectivity
Verifies the API is reachable with valid authentication credentials.

### 2. Single Property Lookup by Address
Tests retrieval of a property using a full address.

### 3. City-Based Property Search
Searches for properties in a specific city with bedroom filters.

### 4. Zip Code Search
Searches for properties by zip code.

### 5. Rental Listings Search
Searches for rental properties with filters (bedrooms, price range, days old).

### 6. Sale Listings Search
Searches for properties for sale with price filters.

### 7. Response Format Validation
Validates that API responses contain valid property data objects.

### 8. Pagination Support
Tests that limit and offset pagination parameters work correctly.

### 9. Response Time Check
Measures response time and warns if requests exceed 5 seconds.

## Test Results

The service outputs test results in the following format:

```
======================================================================
RENTCAST API SMOKE TEST RESULTS
======================================================================
Timestamp: 2026-04-11T14:30:45.123Z
Total Tests: 9
✓ Passed: 9
✗ Failed: 0
⊘ Skipped: 0
⚠ Warnings: 0
----------------------------------------------------------------------
✓ [PASS] API Authentication & Connectivity
  Message: API is reachable and authenticated
✓ [PASS] Single Property Lookup by Address
  Message: Property address lookup successful
...
======================================================================
```

## Exit Codes

- `0` - All tests passed (or only warnings)
- `1` - One or more tests failed

## Configuration

When creating a new instance, you can customize:

```javascript
new RentCastSmokeTest({
  apiKey: 'your-api-key',              // RentCast API key
  baseUrl: 'https://api.rentcast.io/v1', // API base URL
  timeout: 30000,                       // Request timeout in ms
  maxRetries: 3,                        // Max retry attempts
  verbose: false,                       // Verbose logging
  delayBetweenTests: 500                // Delay between tests (ms)
});
```

### .env File Configuration

The service automatically loads the `.env` file from your project directory. Create or edit `.env` with:

```bash
# Required: Your API key
RENTCAST_API_KEY=your-actual-api-key

# Optional: Override defaults
# RENTCAST_TIMEOUT=60000
# RENTCAST_VERBOSE=true
```

The `.env` file is:
- **Required** for easy setup (copy `.env.example` → `.env`)
- **Automatically loaded** when the service starts
- **Never committed** to version control (listed in `.gitignore`)
- **Prioritized** after command-line arguments but before environment variables

## Rate Limiting

The RentCast API has a rate limit of **20 requests per second** per API key. The smoke test service:

- Automatically implements 500ms delays between tests (2 requests per second max)
- Retries failed requests with exponential backoff (1s, 2s, 4s)
- Handles 429 (Rate Limited) responses gracefully

## Authentication

API keys should be provided via (in order of priority):

1. **`.env` file** (Recommended for development):
   ```bash
   # Create or edit .env file
   RENTCAST_API_KEY=your-api-key
   
   # Tests automatically load from .env
   npm test
   ```

2. **Environment variable**:
   ```bash
   export RENTCAST_API_KEY="your-key"
   npm test
   ```

3. **Constructor option**:
   ```javascript
   new RentCastSmokeTest({ apiKey: 'your-key' })
   ```

4. **Command line argument**:
   ```bash
   node test/smoketest.js --key "your-key"
   ```

> ⚠️ **Security Note**: Never commit `.env` files to version control. Use environment variables or `.env` files for local development only (both are in `.gitignore`).

## Monitoring

This service can be integrated into CI/CD pipelines or cron jobs for continuous monitoring:

```bash
# Run every 5 minutes (requires API key in environment)
*/5 * * * * cd /path/to/service && npm test >> smoketest.log 2>&1

# With explicit API key
*/5 * * * * cd /path/to/service && RENTCAST_API_KEY=$MY_KEY npm test >> smoketest.log 2>&1
```

## API References

- [RentCast API Documentation](https://developers.rentcast.io/)
- [Getting Started Guide](https://developers.rentcast.io/reference/getting-started-guide)
- [Search Queries](https://developers.rentcast.io/reference/search-queries)
- [Property Records](https://developers.rentcast.io/reference/property-records)
- [Rental Listings](https://developers.rentcast.io/reference/rental-listings-long-term)
- [Sale Listings](https://developers.rentcast.io/reference/sale-listings)
- [Rate Limits](https://developers.rentcast.io/reference/rate-limits)
- [Response Codes](https://developers.rentcast.io/reference/response-codes)

## Error Handling

The service handles common errors gracefully:

- **401 Unauthorized** - Invalid or missing API key
- **404 Not Found** - No results for query
- **429 Rate Limited** - Too many requests (auto-retry with backoff)
- **500 Server Error** - Internal server error (auto-retry)
- **504 Gateway Timeout** - Server timeout (auto-retry)
- **Connection timeouts** - Network issues

All errors are logged with descriptive messages.

## Dependencies

- **axios** (^1.6.5) - HTTP client for making API requests

## License

ISC

## Contributing

To add custom smoke tests:

1. Add a new test method to the `RentCastSmokeTest` class
2. Follow the naming convention: `testFeatureName()`
3. Push results to `this.results` array
4. Add the test to the `runAllTests()` method

Example:

```javascript
async testCustomFeature() {
  const testName = 'Custom Feature Test';
  this.log(`Running: ${testName}`);
  
  try {
    const response = await this.sendRequest('/custom-endpoint', {
      param1: 'value1'
    });
    
    if (response.status === 200 && response.data) {
      this.results.push({ test: testName, status: 'PASS', message: 'Test passed' });
      return true;
    }
  } catch (error) {
    this.log(`✗ ${testName} failed: ${error.message}`, 'error');
    this.results.push({ test: testName, status: 'FAIL', message: error.message });
    return false;
  }
}
```

---

**Last Updated:** April 2026

**API Version:** v1

**Service Version:** 1.0.0
