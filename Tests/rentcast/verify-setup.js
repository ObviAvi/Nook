#!/usr/bin/env node

/**
 * Setup verification script
 * Verifies that .env file loading is working correctly
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const fs = require('fs');
const path = require('path');

console.log('RentCast API Smoke Test - Setup Verification\n');
console.log('=============================================\n');

// Check .env file exists
const envPath = path.resolve(__dirname, '.env');
const envExamplePath = path.resolve(__dirname, '.env.example');

console.log('1. Checking .env file...');
if (fs.existsSync(envPath)) {
  console.log('   ✓ .env file exists');
} else {
  console.log('   ✗ .env file not found');
  console.log('   To create it, run: cp .env.example .env');
}

console.log('\n2. Checking .env.example file...');
if (fs.existsSync(envExamplePath)) {
  console.log('   ✓ .env.example file exists');
} else {
  console.log('   ✗ .env.example file not found');
}

console.log('\n3. Checking .env file loading...');
const apiKey = process.env.RENTCAST_API_KEY;
if (apiKey && apiKey !== 'your-api-key-here') {
  console.log('   ✓ API key loaded from .env file');
  console.log(`   ✓ API key: ${apiKey.substring(0, 10)}***${apiKey.substring(apiKey.length - 4)}`);
} else if (apiKey === 'your-api-key-here') {
  console.log('   ⚠ API key in .env is still set to placeholder value');
  console.log('   → Edit .env and replace with your actual RentCast API key');
} else {
  console.log('   ⚠ API key not found in environment');
  console.log('   → Make sure RENTCAST_API_KEY is set in .env file');
}

console.log('\n4. Checking dotenv package...');
try {
  require('dotenv');
  console.log('   ✓ dotenv package is installed');
} catch (e) {
  console.log('   ✗ dotenv package not found');
  console.log('   → Run: npm install');
}

console.log('\n5. Checking dependencies...');
const packageJson = require('./package.json');
if (packageJson.dependencies.dotenv) {
  console.log('   ✓ dotenv in package.json dependencies');
} else {
  console.log('   ✗ dotenv not in package.json');
}

console.log('\n=============================================');
console.log('Setup Verification Summary\n');

if (apiKey && apiKey !== 'your-api-key-here' && fs.existsSync(envPath)) {
  console.log('✓ All checks passed! Your setup is ready.');
  console.log('\nYou can now run:');
  console.log('  npm test              # Run smoke tests');
  console.log('  npm run test:verbose  # Run with verbose output');
} else {
  console.log('⚠ Setup needs attention:');
  if (!fs.existsSync(envPath)) {
    console.log('  1. Create .env file: cp .env.example .env');
  }
  if (!apiKey || apiKey === 'your-api-key-here') {
    console.log('  2. Edit .env and add your RentCast API key');
  }
  console.log('\nOnce complete, run: npm test');
}

console.log('\nFor help, see: QUICKSTART.md or README.md\n');
