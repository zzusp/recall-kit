// Test script for API key validation in submit_experience tool
const http = require('http');

// Test configuration
const SERVER_URL = 'http://localhost:3001';
const TEST_API_KEY = 'rk_test1234567890abcdef1234567890abcdef'; // From migration
const INVALID_API_KEY = 'invalid_key_here';

// Test data
const validExperienceData = {
  title: 'Test API Key Validation',
  problem_description: 'Testing API key validation in submit tool',
  root_cause: 'API key was not validated in submit tool',
  solution: 'Added API key validation only in submit_experience tool',
  context: 'Testing the MCP server API key functionality',
  keywords: ['api-key', 'validation', 'mcp', 'testing', 'authentication']
};

// Helper function to make HTTP request
function makeRequest(data, apiKey = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(apiKey && { 'X-API-Key': apiKey })
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ statusCode: res.statusCode, response });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Test cases
async function runTests() {
  console.log('🧪 Starting API Key Validation Tests...\n');

  // Test 1: Initialize MCP connection (should work without API key)
  console.log('Test 1: Initialize MCP connection (should work without API key)');
  try {
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };

    const initResponse = await makeRequest(initRequest);
    console.log('✅ Connection initialized successfully');
    console.log(`Response: ${JSON.stringify(initResponse.response, null, 2)}\n`);
  } catch (error) {
    console.log('❌ Connection initialization failed:', error.message);
    return;
  }

  // Test 2: Query experiences (should work without API key)
  console.log('Test 2: Query experiences (should work without API key)');
  try {
    const queryRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'query_experiences',
        arguments: {
          keywords: ['test'],
          limit: 5
        }
      }
    };

    const queryResponse = await makeRequest(queryRequest);
    console.log('✅ Query works without API key');
    console.log(`Response: ${JSON.stringify(queryResponse.response, null, 2)}\n`);
  } catch (error) {
    console.log('❌ Query failed:', error.message);
  }

  // Test 3: Submit without API key (should fail)
  console.log('Test 3: Submit experience without API key (should fail)');
  try {
    const submitRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'submit_experience',
        arguments: validExperienceData
      }
    };

    const submitResponse = await makeRequest(submitRequest);
    const result = submitResponse.response.result || submitResponse.response.error;
    
    if (result && result.error && result.error.includes('API key is required')) {
      console.log('✅ Correctly rejected submission without API key');
      console.log(`Error: ${result.error}\n`);
    } else {
      console.log('❌ Should have rejected submission without API key');
      console.log(`Response: ${JSON.stringify(submitResponse.response, null, 2)}\n`);
    }
  } catch (error) {
    console.log('❌ Submit without API key failed with error:', error.message);
  }

  // Test 4: Submit with invalid API key (should fail)
  console.log('Test 4: Submit experience with invalid API key (should fail)');
  try {
    const submitRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'submit_experience',
        arguments: validExperienceData
      }
    };

    const submitResponse = await makeRequest(submitRequest, INVALID_API_KEY);
    const result = submitResponse.response.result || submitResponse.response.error;
    
    if (result && result.error && result.error.includes('Invalid API key')) {
      console.log('✅ Correctly rejected submission with invalid API key');
      console.log(`Error: ${result.error}\n`);
    } else {
      console.log('❌ Should have rejected submission with invalid API key');
      console.log(`Response: ${JSON.stringify(submitResponse.response, null, 2)}\n`);
    }
  } catch (error) {
    console.log('❌ Submit with invalid API key failed with error:', error.message);
  }

  // Test 5: Submit with valid API key (should succeed)
  console.log('Test 5: Submit experience with valid API key (should succeed)');
  try {
    const submitRequest = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'submit_experience',
        arguments: {
          ...validExperienceData,
          title: 'Test API Key Validation - Valid Key'
        }
      }
    };

    const submitResponse = await makeRequest(submitRequest, TEST_API_KEY);
    const result = submitResponse.response.result;
    
    if (result && result.status === 'success' && result.experience_id) {
      console.log('✅ Successfully submitted experience with valid API key');
      console.log(`Experience ID: ${result.experience_id}\n`);
    } else {
      console.log('❌ Should have succeeded with valid API key');
      console.log(`Response: ${JSON.stringify(submitResponse.response, null, 2)}\n`);
    }
  } catch (error) {
    console.log('❌ Submit with valid API key failed with error:', error.message);
  }

  console.log('🎉 API Key Validation Tests Complete!');
}

// Run the tests
runTests().catch(console.error);