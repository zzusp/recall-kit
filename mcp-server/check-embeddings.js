const { sql } = require('./dist/lib/db/config');

async function checkEmbeddings() {
  try {
    console.log('检查已发布经验的嵌入向量状态...');
    const result = await sql`
      SELECT id, title, has_embedding, publish_status, is_deleted 
      FROM experience_records 
      WHERE publish_status = 'published' AND is_deleted = false
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    result.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Title: ${row.title}`);
      console.log(`Has Embedding: ${row.has_embedding}`);
      console.log(`Publish Status: ${row.publish_status}`);
      console.log(`Is Deleted: ${row.is_deleted}`);
      console.log('---');
    });
    
    // 检查实际有多少记录有嵌入向量
    const countResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN has_embedding = true THEN 1 END) as with_embedding,
        COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as embedding_not_null
      FROM experience_records 
      WHERE publish_status = 'published' AND is_deleted = false
    `;
    
    console.log('嵌入向量统计:');
    console.log(`总记录数: ${countResult[0].total}`);
    console.log(`有嵌入向量标记: ${countResult[0].with_embedding}`);
    console.log(`嵌入向量不为空: ${countResult[0].embedding_not_null}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkEmbeddings();