# RentCast API Smoke Test - Quick Start Guide

## Get Your API Key

1. Navigate to [RentCast API Dashboard](https://app.rentcast.io/app/api)
2. Sign in with your account (or create one)
3. Select a pricing plan (free plan available with 50 requests/month)
4. Create an API key from the dashboard
5. Copy your API key

## Running the Tests

### Option 1: Environment Variable (Recommended)

**PowerShell (Windows):**
```powershell
$env:RENTCAST_API_KEY = "your-api-key-here"
npm test
```

**Bash (macOS/Linux):**
```bash
export RENTCAST_API_KEY="your-api-key-here"
npm test
```

### Option 2: Command Line Argument

```bash
node test/smoketest.js --key "your-api-key-here"
```

### Option 3: .env File (Development)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API key:
   ```
   RENTCAST_API_KEY=your-api-key-here
   ```

3. Run tests:
   ```bash
   npm test
   ```

## Available Commands

```bash
# Run all smoke tests
npm test

# Run with verbose output (detailed logging)
npm test:verbose

# Run with custom API key
node test/smoketest.js --key "your-key"

# Run with custom timeout (milliseconds)
node test/smoketest.js --timeout 60000

# Run with custom API endpoint
node test/smoketest.js --url https://api.example.com/v1

# Combine options
node test/smoketest.js --key "your-key" --timeout 60000 --verbose
```

## Running Programmatically

```javascript
const RentCastSmokeTest = require('./index.js');

const smokeTest = new RentCastSmokeTest({
  apiKey: 'your-api-key-here',
  verbose: true
});

const results = await smokeTest.runAllTests();
smokeTest.printResults();
```

## Understanding Test Results

### Status Codes

- ✓ **PASS** - Test passed successfully
- ✗ **FAIL** - Test failed
- ⊘ **SKIP** - Test skipped (usually due to missing API key)
- ⚠ **WARN** - Test passed but with warnings (e.g., slow response time)

### Example Output

```
======================================================================
RENTCAST API SMOKE TEST RESULTS
======================================================================
Timestamp: 2026-04-11T14:16:27.054Z
Total Tests: 9
✓ Passed: 9
✗ Failed: 0
⊘ Skipped: 0
⚠ Warnings: 0
----------------------------------------------------------------------
✓ [PASS] API Authentication & Connectivity
  Message: API is reachable and authenticated
✓ [PASS] City-Based Property Search
  Message: Found 10 properties
...
======================================================================
```

## What's Being Tested

1. **API Authentication** - Verify valid API key and connectivity
2. **Address Search** - Lookup specific properties by full address
3. **City Search** - Search properties by city with filters
4. **Zip Code Search** - Search by zip code
5. **Rental Listings** - Search rental properties with multiple filters
6. **Sale Listings** - Search sale listings with price filters
7. **Response Format** - Validate JSON response structure
8. **Pagination** - Test offset and limit parameters
9. **Response Time** - Monitor performance (warns if >5 seconds)

## Rate Limits

- **Limit**: 20 requests per second per API key
- **Service handles**: Automatic backoff retries on rate limits
- **Test rate**: 500ms delay between tests (≈2 requests/second)

## Troubleshooting

### Tests are Skipped

**Issue**: All tests show as skipped

**Solution**: API key not provided
- Set `RENTCAST_API_KEY` environment variable, or
- Use `--key` argument, or
- Update `.env` file

### 401 Unauthorized

**Issue**: Tests fail with authentication error

**Solution**: Invalid or expired API key
- Verify your API key in the RentCast dashboard
- Regenerate the key if necessary

### 429 Rate Limited

**Issue**: Tests fail with rate limit error

**Solution**: Too many requests per second
- The service automatically retries with backoff
- Increase `delayBetweenTests` in config
- Use separate API keys for different applications

### 404 No Results

**Issue**: Search tests fail with no results

**Solution**: No properties match search criteria
- Try different search parameters
- Use different city/state combinations
- This is not necessarily an API failure

### Slow Responses

**Issue**: Tests warn about slow response times (>5 seconds)

**Action**: Monitor API performance
- Check your internet connection
- Monitor RentCast service status
- Contact RentCast support if persistent

## Configuration Examples

See `config.example.js` for preset configurations:
- **Production**: Longer timeouts, fewer retries
- **Development**: Verbose logging, quick feedback
- **CI/CD**: Balanced for automated testing
- **Local**: Quick iteration setup

## Continuous Monitoring

Set up periodic smoke tests with cron:

**Ubuntu/macOS:**
```bash
# Run every 5 minutes
*/5 * * * * cd /path/to/service && RENTCAST_API_KEY=$MY_KEY npm test >> smoketest.log 2>&1
```

**Windows Task Scheduler:**
```cmd
# Create task to run: powershell.exe -Command "$env:RENTCAST_API_KEY='YOUR_KEY'; cd C:\path\to\service; npm test"
```

## Integration with CI/CD

### GitHub Actions:

```yaml
- name: RentCast API Smoke Test
  env:
    RENTCAST_API_KEY: ${{ secrets.RENTCAST_API_KEY }}
  run: npm test
```

### GitLab CI:

```yaml
smoke_test:
  script:
    - npm install
    - npm test
  variables:
    RENTCAST_API_KEY: $RENTCAST_API_KEY
```

## Support

- **API Documentation**: https://developers.rentcast.io/
- **API Dashboard**: https://app.rentcast.io/app/api
- **Rate Limits**: https://developers.rentcast.io/reference/rate-limits
- **Response Codes**: https://developers.rentcast.io/reference/response-codes

## Next Steps

1. Get your API key from RentCast dashboard
2. Set `RENTCAST_API_KEY` environment variable
3. Run `npm test` to verify connectivity
4. Integrate into your CI/CD pipeline
5. Monitor with cronjobs or scheduled tasks

Happy testing! 🚀
