/**
 * Configuration Examples for Overpass Smoke Test Service
 * 
 * Copy and modify these configurations as needed for your use case.
 */

/**
 * Production Configuration
 * - Longer timeouts for complex queries
 * - Less verbose logging
 */
const productionConfig = {
  baseUrl: 'https://overpass-api.de/api',
  timeout: 60000,        // 60 seconds
  maxRetries: 3,
  verbose: false
};

/**
 * Development Configuration
 * - Shorter timeouts for quick feedback
 * - Verbose logging for debugging
 */
const developmentConfig = {
  baseUrl: 'https://overpass-api.de/api',
  timeout: 30000,        // 30 seconds
  maxRetries: 1,
  verbose: true
};

/**
 * CI/CD Pipeline Configuration
 * - Moderate timeouts
 * - Logging for diagnostics
 * - Suitable for automated testing
 */
const cicdConfig = {
  baseUrl: 'https://overpass-api.de/api',
  timeout: 45000,        // 45 seconds
  maxRetries: 2,
  verbose: false
};

/**
 * Local Testing Configuration
 * - Very short timeouts for quick iteration
 * - Full debugging output
 */
const localConfig = {
  baseUrl: 'http://localhost:5000/api', // local instance
  timeout: 10000,        // 10 seconds
  maxRetries: 0,
  verbose: true
};

/**
 * Alternative Instance Configuration
 * - For testing against different Overpass instances
 */
const alternativeInstanceConfig = {
  baseUrl: 'https://overpass.osm.be/api',  // Belgian instance
  timeout: 30000,
  maxRetries: 2,
  verbose: false
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
  alternativeInstanceConfig,
  getConfig
};
