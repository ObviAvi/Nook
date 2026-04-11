#!/usr/bin/env node

// Test that .env file is being loaded
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

console.log('Testing .env file loading...\n');

if (process.env.RENTCAST_API_KEY) {
  console.log('✓ API Key successfully loaded from .env file');
  console.log(`✓ API Key: ${process.env.RENTCAST_API_KEY}`);
  console.log('\n✓ The .env file is being loaded correctly!');
} else {
  console.log('✗ API Key not loaded from .env file');
  console.log('Make sure .env file exists in the current directory');
}

// Also show what the smoketest will receive
const RentCastSmokeTest = require('./index.js');
const testInstance = new RentCastSmokeTest();

console.log('\n--- Smoke Test Configuration ---');
console.log(`API Key Set: ${testInstance.apiKey ? 'Yes' : 'No'}`);
console.log(`API Key Value: ${testInstance.apiKey || '(not set)'}`);
