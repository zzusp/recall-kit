const http = require('http');

let sessionId = '';

// Test SSE connection first
console.log('Testing SSE connection...');
const sseReq = http.get('http://127.0.0.1:3001/sse?api_key=rk_test123456789', (res) => {
  console.log(`SSE Status: ${res.statusCode}`);
  console.log(`SSE Headers:`, res.headers);
  
  // Listen for session ID from SSE response
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
    // Try to extract session ID from SSE data
    const lines = data.split('\n');
    for (const line of lines) {
      if (line.startsWith('session:')) {
        sessionId = line.replace('session:', '').trim();
        console.log('Found sessionId:', sessionId);
      }
    }
  });
  
  // Wait a moment for connection to establish and get session ID
  setTimeout(() => {
    if (!sessionId) {
      // If no session ID from SSE, use a fallback approach
      console.log('No session ID from SSE, checking if we can still test logs...');
      // Let's just trigger some server activity to see the logs
      console.log('Testing with direct request to trigger logs...');
      
      // Make a simple request to health endpoint to ensure server is responding
      http.get('http://127.0.0.1:3001/health', (healthRes) => {
        console.log('Health check status:', healthRes.statusCode);
        console.log('Check server console for SSE connection logs.');
        console.log('The API key should be visible in the logs when SSE connection was made.');
        process.exit(0);
      });
      return;
    }
    
    // Now test tool call with session ID
    console.log('Testing tool call with sessionId:', sessionId);
    
    const toolCallData = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "submit_experience",
        arguments: {
          title: "Test Title",
          problem_description: "Test problem",
          root_cause: "Test cause",
          solution: "Test solution",
          context: "Test context",
          keywords: ["test", "debug", "api"]
        }
      }
    };
    
    const postData = JSON.stringify(toolCallData);
    
    const toolReq = http.request({
      hostname: '127.0.0.1',
      port: 3001,
      path: `/messages?sessionId=${sessionId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (toolRes) => {
      console.log(`Tool Call Status: ${toolRes.statusCode}`);
      
      let data = '';
      toolRes.on('data', (chunk) => {
        data += chunk;
      });
      
      toolRes.on('end', () => {
        console.log('Tool Call Response:', data);
        console.log('Test completed. Check server logs for the debug output.');
        process.exit(0);
      });
    });
    
    toolReq.on('error', (err) => {
      console.error('Tool call error:', err);
      process.exit(1);
    });
    
    toolReq.write(postData);
    toolReq.end();
    
  }, 2000);
});

sseReq.on('error', (err) => {
  console.error('SSE connection error:', err);
  process.exit(1);
});