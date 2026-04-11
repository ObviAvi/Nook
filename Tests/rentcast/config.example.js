/**
 * Configuration Examples for RentCast Smoke Test Service
 * 
 * Copy and modify these configurations as needed for your use case.
 */

/**
 * Production Configuration
 * - Longer timeouts for complex queries
 * - Less verbose logging
 * - Shorter delays between tests
 */
const productionConfig = {
  apiKey: process.env.RENTCAST_API_KEY,
  baseUrl: 'https://api.rentcast.io/v1',
  timeout: 60000,                    // 60 seconds
  maxRetries: 3,
  verbose: false,
  delayBetweenTests: 300             // 300ms (respects 20 req/sec limit)
};

/**
 * Development Configuration
 * - Shorter timeouts for quick feedback
 * - Verbose logging for debugging
 * - Longer delays for safety
 */
const developmentConfig = {
  apiKey: process.env.RENTCAST_API_KEY,
  baseUrl: 'https://api.rentcast.io/v1',
  timeout: 30000,                    // 30 seconds
  maxRetries: 1,
  verbose: true,
  delayBetweenTests: 1000            // 1 second delay
};

/**
 * CI/CD Pipeline Configuration
 * - Moderate timeouts
 * - Logging for diagnostics
 * - Suitable for automated testing
 */
const cicdConfig = {
  apiKey: process.env.RENTCAST_API_KEY,
  baseUrl: 'https://api.rentcast.io/v1',
  timeout: 45000,                    // 45 seconds
  maxRetries: 2,
  verbose: false,
  delayBetweenTests: 500             // 500ms
};

/**
 * Local Testing Configuration
 * - Very short timeouts for quick iteration
 * - Full debugging output
 * - Longer delays to reduce API quota usage
 */
const localConfig = {
  apiKey: process.env.RENTCAST_API_KEY,
  baseUrl: 'https://api.rentcast.io/v1',
  timeout: 15000,                    // 15 seconds
  maxRetries: 0,
  verbose: true,
  delayBetweenTests: 2000            // 2 seconds
};

/**
 * High-Load Configuration
 * - For stress testing
 * - Short delays and multiple parallel tests
 * - Use with separate API keys if possible
 */
const highLoadConfig = {
  apiKey: process.env.RENTCAST_API_KEY,
  baseUrl: 'https://api.rentcast.io/v1',
  timeout: 30000,
  maxRetries: 1,
  verbose: false,
  delayBetweenTests: 100             // 100ms - be careful!
};

/**
 * Get configuration based on environment
 */
function getConfig(env = process.env.NODE_ENV || 'development') {
  switch (env) {
    case 'production':
      return productionConfig;
    case 'ci':
      return cicdConfig;
    case 'local':
      return localConfig;
    case 'high-load':
      return highLoadConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

module.exports = {
  productionConfig,
  developmentConfig,
  cicdConfig,
  localConfig,
  highLoadConfig,
  getConfig
};
