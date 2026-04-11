# Overpass API Smoke Test Service

A comprehensive Node.js smoke test service for the [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API). This service verifies that the Overpass API is operational and responding correctly to queries.

## Overview

Overpass API is a query language and service for OpenStreetMap data. This smoke test service performs automated checks to ensure:

- API endpoint is reachable
- Basic node queries work correctly
- Bounding box queries function properly
- JSON output format is valid
- Query timeout parameters work
- Response times are acceptable

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

### Command Line

Run the smoke tests from the command line:

```bash
# Basic smoke test
npm test

# Verbose output
npm test:verbose

# Quick test (single test)
npm test:quick
```

### Advanced Options

```bash
# Custom base URL
node test/smoketest.js --url https://custom-overpass-api.com/api

# Custom timeout (in milliseconds)
node test/smoketest.js --timeout 60000

# Verbose output
node test/smoketest.js --verbose

# Combine options
node test/smoketest.js --url https://custom-overpass-api.com/api --timeout 60000 --verbose
```

### Programmatic Usage

You can also use the service in your own Node.js code:

```javascript
const OverpassSmokeTest = require('./index.js');

const smokeTest = new OverpassSmokeTest({
  baseUrl: 'https://overpass-api.de/api',
  timeout: 30000,
  verbose: true
});

// Run all tests
const results = await smokeTest.runAllTests();
console.log(results);

// Or run individual tests
await smokeTest.testConnectivity();
await smokeTest.testNodeQuery();

// Get formatted results
smokeTest.printResults();
```

## Tests Included

### 1. API Connectivity
Verifies the API status endpoint is reachable.

### 2. Node Query
Tests basic OSM node retrieval using the interpreter endpoint.

### 3. Bounding Box Query
Queries data within a geographic bounding box (San Francisco area).

### 4. JSON Output Format
Validates that JSON responses contain the expected OSM structure with version and elements fields.

### 5. Query Timeout Parameter
Tests that queries with explicit timeout settings are handled correctly.

### 6. Response Time Check
Measures response time and warns if it exceeds 10 seconds.

## Test Results

The service outputs test results in the following format:

```
============================================================
OVERPASS API SMOKE TEST RESULTS
============================================================
Timestamp: 2026-04-11T12:34:56.789Z
Total Tests: 6
✓ Passed: 6
✗ Failed: 0
⚠ Warnings: 0
------------------------------------------------------------
✓ [PASS] API Connectivity
  Message: API is reachable
✓ [PASS] Node Query
  Message: Retrieved 1 elements
...
============================================================
```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

## Configuration

When creating a new instance, you can customize:

```javascript
new OverpassSmokeTest({
  baseUrl: 'https://overpass-api.de/api',  // Overpass API base URL
  timeout: 30000,                           // Request timeout in ms
  maxRetries: 3,                            // Max retry attempts
  verbose: false                            // Verbose logging
});
```

## Monitoring

This service can be integrated into CI/CD pipelines or cron jobs for continuous monitoring:

```bash
# Run every 30 minutes
*/30 * * * * cd /path/to/service && npm test >> smoketest.log 2>&1
```

## API References

- [Overpass API Documentation](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Overpass QL Language](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL)
- [OSM JSON Format](https://wiki.openstreetmap.org/wiki/Overpass_API/JSON_Format)

## Error Handling

The service handles common errors gracefully:

- Connection timeouts
- Invalid responses
- API errors (4xx, 5xx)
- Malformed JSON
- Network failures

All errors are logged and reported in the test results with descriptive messages.

## Dependencies

- **axios** (^1.6.5) - HTTP client for making API requests

## License

ISC

## Contributing

To add custom smoke tests:

1. Add a new test method to the `OverpassSmokeTest` class
2. Follow the naming convention: `testFeatureName()`
3. Push results to `this.results` array
4. Add the test to the `runAllTests()` method

Example:

```javascript
async testCustomFeature() {
  const testName = 'Custom Feature Test';
  this.log(`Running: ${testName}`);
  
  try {
    // Your test logic here
    this.results.push({ test: testName, status: 'PASS', message: 'Test passed' });
    return true;
  } catch (error) {
    this.log(`✗ ${testName} failed: ${error.message}`, 'error');
    this.results.push({ test: testName, status: 'FAIL', message: error.message });
    return false;
  }
}
```

---

**Last Updated:** April 2026
