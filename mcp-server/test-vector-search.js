// Test script for vector search functionality
const { initQueryHandler } = require('./dist/mcp/queryHandler');
const { SystemConfigService } = require('./dist/services/systemConfigService');
const { EmbeddingService } = require('./dist/services/embeddingService');

async function testVectorSearch() {
  console.log('Testing vector search functionality...');
  
  try {
    // Initialize services
    const systemConfigService = new SystemConfigService();
    const embeddingService = new EmbeddingService(systemConfigService);
    
    // Check if embedding service is available
    const isAvailable = await embeddingService.isAvailable();
    console.log('Embedding service available:', isAvailable);
    
    if (!isAvailable) {
      console.log('Embedding service not available, testing fallback to text search...');
    }
    
    // Initialize query handler
    const queryHandler = await initQueryHandler({
      defaultLimit: 5,
      maxLimit: 10,
      embeddingService
    });
    
    // Test 1: Query with keywords that should match sample data
    console.log('\n=== Test 1: Query with Next.js keywords ===');
    const result1 = await queryHandler({
      keywords: ['nextjs', 'cors', 'api'],
      limit: 3,
      sort: 'relevance'
    });
    console.log('Results:', JSON.stringify(result1, null, 2));
    
    // Test 2: Query with TypeScript keywords
    console.log('\n=== Test 2: Query with TypeScript keywords ===');
    const result2 = await queryHandler({
      keywords: ['typescript', 'type-narrowing'],
      limit: 3,
      sort: 'relevance'
    });
    console.log('Results:', JSON.stringify(result2, null, 2));
    
    // Test 3: Empty query (should return recent experiences)
    console.log('\n=== Test 3: Empty query ===');
    const result3 = await queryHandler({
      limit: 3,
      sort: 'created_at'
    });
    console.log('Results:', JSON.stringify(result3, null, 2));
    
    // Test 4: Test embedding generation directly
    if (isAvailable) {
      console.log('\n=== Test 4: Test embedding generation ===');
      try {
        const embedding = await embeddingService.generateEmbedding('Next.js API route CORS issue');
        console.log('Generated embedding dimensions:', embedding.length);
        console.log('First few values:', embedding.slice(0, 5));
      } catch (error) {
        console.error('Failed to generate embedding:', error.message);
      }
    }
    
    console.log('\nVector search tests completed!');
  } catch (error) {
    console.error('Vector search test failed:', error);
  }
}

testVectorSearch();