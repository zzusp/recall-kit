const { sql } = require('./dist/lib/db/config');
const { EmbeddingService } = require('./dist/services/embeddingService');
const { SystemConfigService } = require('./dist/services/systemConfigService');

async function testSimilarityThreshold() {
  try {
    const systemConfigService = new SystemConfigService();
    const embeddingService = new EmbeddingService(systemConfigService);
    
    // 生成查询向量
    const queryText = 'nextjs cors api';
    const queryEmbedding = await embeddingService.generateEmbedding(queryText);
    
    console.log('测试不同的相似度阈值...');
    
    const thresholds = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
    
    for (const threshold of thresholds) {
      const query = `
        SELECT 
          er.id,
          er.title,
          1 - (er.embedding <=> $1) as similarity
        FROM experience_records er
        WHERE er.publish_status = 'published'
          AND er.is_deleted = false
          AND er.embedding IS NOT NULL
          AND 1 - (er.embedding <=> $1) > ${threshold}
        ORDER BY er.embedding <=> $1
      `;
      
      const result = await sql.unsafe(query, [`[${queryEmbedding.join(',')}]`]);
      
      console.log(`\n阈值 > ${threshold}: 找到 ${result.length} 条结果`);
      result.forEach(row => {
        console.log(`  - ${row.title} (相似度: ${row.similarity.toFixed(4)})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testSimilarityThreshold();