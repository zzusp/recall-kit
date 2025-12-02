'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './docs.css?v=' + Date.now() + Math.random();

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000); // 2秒后重置状态
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedCode(text);
        setTimeout(() => setCopiedCode(null), 2000);
      } catch (err) {
        console.error('Fallback: Failed to copy text: ', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const menuItems = [
    { id: 'introduction', label: 'Recall Kit 介绍', icon: 'fas fa-book' },
    { id: 'getting-started', label: '快速开始', icon: 'fas fa-rocket' },
    { id: 'mcp-configuration', label: 'MCP 配置', icon: 'fas fa-plug' },
    { id: 'ide-usage', label: 'IDE 使用指南', icon: 'fas fa-code' },
    { id: 'admin-features', label: '后台管理功能', icon: 'fas fa-cog' },
    { id: 'deployment', label: '私有化部署', icon: 'fas fa-server' },
    { id: 'api-reference', label: 'API 参考', icon: 'fas fa-api' },
    { id: 'faq', label: '常见问题', icon: 'fas fa-question-circle' },
  ];

  return (
    <div className="docs-container">
      <div className="docs-header">
        <h1 className="docs-title">Recall Kit 使用文档</h1>
        <p className="docs-subtitle">AI开发踩坑记录检索平台的完整使用指南</p>
      </div>

      <div className="docs-layout">
        <nav className="docs-sidebar">
          <div className="docs-nav-content">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`docs-nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <main className="docs-main">
          <div className="docs-content">
            {activeSection === 'introduction' && (
              <section className="docs-section">
                <h2>Recall Kit 介绍</h2>
                <div className="docs-intro">
                  <div className="intro-card">
                    <div className="intro-icon">
                      <i className="fas fa-brain"></i>
                    </div>
                    <h3>什么是 Recall Kit？</h3>
                    <p>
                      Recall Kit 是一个专为开发团队设计的 AI 开发踩坑记录检索平台。
                      通过记录、分享和复用开发经验，让每一次踩坑都成为团队的智慧财富。
                    </p>
                  </div>
                  <div className="intro-card">
                    <div className="intro-icon">
                      <i className="fas fa-robot"></i>
                    </div>
                    <h3>AI 驱动的经验管理</h3>
                    <p>
                      集成先进的大语言模型，通过语义理解和智能检索，
                      帮助开发者快速找到相关的解决方案，减少重复劳动。
                    </p>
                  </div>
                  <div className="intro-card">
                    <div className="intro-icon">
                      <i className="fas fa-plug"></i>
                    </div>
                    <h3>MCP 协议集成</h3>
                    <p>
                      支持 MCP (Model Context Protocol) 协议，让 AI Agent 能够自动查询和保存经验，
                      无缝集成到开发工作流中。
                    </p>
                  </div>
                </div>
                <div className="features-grid">
                  <h3>核心特性</h3>
                  <div className="feature-list">
                    <div className="feature-item">
                      <i className="fas fa-search"></i>
                      <div>
                        <h4>智能向量检索</h4>
                        <p>基于语义理解的向量搜索，精准匹配相关经验</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <i className="fas fa-bug"></i>
                      <div>
                        <h4>报错日志管理</h4>
                        <p>记录并分析报错日志，快速定位问题根源</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <i className="fas fa-lightbulb"></i>
                      <div>
                        <h4>解决方案中心</h4>
                        <p>共享最佳实践和解决方案，避免重复踩坑</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <i className="fas fa-shield-alt"></i>
                      <div>
                        <h4>权限管理</h4>
                        <p>灵活的权限控制，保护团队知识资产</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'getting-started' && (
              <section className="docs-section">
                <h2>快速开始</h2>
                
                <div className="getting-started-container">
                  <div className="getting-started-step">
                    <div className="step-header">
                      <div className="step-badge">1</div>
                      <h3>创建账户</h3>
                    </div>
                    <p>访问 Recall Kit 管理后台，创建你的账户并登录系统。</p>
                    <div className="step-action">
                      <a href="/admin/login" className="action-button">访问管理后台</a>
                    </div>
                  </div>

                  <div className="getting-started-step">
                    <div className="step-header">
                      <div className="step-badge">2</div>
                      <h3>生成 API 密钥</h3>
                    </div>
                    <p>在管理后台中创建 API 密钥，用于连接 MCP 服务器。</p>
                    <div className="step-details">
                      <h4>步骤：</h4>
                      <ol>
                        <li>进入"API 密钥"页面</li>
                        <li>点击"创建新密钥"</li>
                        <li>设置密钥名称和权限</li>
                        <li>复制生成的密钥</li>
                      </ol>
                    </div>
                  </div>

                  <div className="getting-started-step">
                    <div className="step-header">
                      <div className="step-badge">3</div>
                      <h3>配置 IDE</h3>
                    </div>
                    <p>在你的 IDE 中配置 MCP 服务器连接。</p>
                    <div className="step-details">
                      <h4>配置文件示例：</h4>
                      <div className="code-block">
                        <div className="code-header">
                          <span>JSON</span>
                          <button 
                            className="copy-button"
                            onClick={() => copyToClipboard(`{
  "mcpServers": {
    "recall-kit": {
      "url": "http://www.codeva-cn.com:3101/sse?api_key=your-api-key"
    }
  }
}`)}
                          >
                            {copiedCode === `{
  "mcpServers": {
    "recall-kit": {
      "url": "http://www.codeva-cn.com:3101/sse?api_key=your-api-key"
    }
  }
}` ? '已复制!' : '复制'}
                          </button>
                        </div>
                        <pre>{`{
  "mcpServers": {
    "recall-kit": {
      "url": "http://www.codeva-cn.com:3101/sse?api_key=your-api-key"
    }
  }
}`}</pre>
                      </div>
                    </div>
                  </div>

                  <div className="getting-started-step">
                    <div className="step-header">
                      <div className="step-badge">4</div>
                      <h3>开始使用</h3>
                    </div>
                    <p>在 IDE 的 MCP 中开启，你就可以开始使用 Recall Kit 了。</p>
                    <div className="step-details">
                      <h4>可用功能：</h4>
                      <ul>
                        <li>通过自然语言查询、参考相关经验</li>
                        <li>借鉴相似场景案例的经验，实现功能或修复问题</li>
                        <li>让 AI 助手总结对话生成经验文档到本地</li>
                        <li>让 AI 助手提交经验文档到平台</li>
                        <li>在平台共享和积累开发经验</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="getting-started-next">
                  <h3>接下来做什么？</h3>
                  <div className="next-steps">
                    <div className="next-step-card">
                      <h4>了解 MCP 配置</h4>
                      <p>深入了解 MCP 协议和配置选项</p>
                      <button 
                        className="next-step-button"
                        onClick={() => setActiveSection('mcp-configuration')}
                      >
                        查看详情 →
                      </button>
                    </div>
                    <div className="next-step-card">
                      <h4>IDE 使用指南</h4>
                      <p>学习如何在 IDE 中高效使用 Recall Kit</p>
                      <button 
                        className="next-step-button"
                        onClick={() => setActiveSection('ide-usage')}
                      >
                        查看详情 →
                      </button>
                    </div>
                    <div className="next-step-card">
                      <h4>API 参考</h4>
                      <p>探索可用的 API 和 MCP 命令</p>
                      <button 
                        className="next-step-button"
                        onClick={() => setActiveSection('api-reference')}
                      >
                        查看详情 →
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'mcp-configuration' && (
              <section className="docs-section">
                <h2>MCP 配置</h2>
                <div className="config-section">
                  <h3>什么是 MCP？</h3>
                  <p>
                    MCP (Model Context Protocol) 是一种开放协议，允许 AI 安全地连接外部数据源和工具。
                    Recall Kit 通过 MCP 协议为 AI Agent 提供经验查询和保存功能。
                  </p>
                  <h3>配置步骤</h3>
                  <div className="config-steps">
                    <div className="config-step">
                      <h4>1. 获取 API 密钥</h4>
                      <ul>
                        <li>登录管理后台</li>
                        <li>导航到"API 密钥"页面</li>
                        <li>点击"创建新密钥"</li>
                        <li>复制生成的密钥</li>
                      </ul>
                    </div>
                    <div className="config-step">
                      <h4>2. 配置 IDE</h4>
                      <p>在你的 IDE 中配置 MCP 服务器：</p>
                      <div className="code-block">
                        <div className="code-header">
                          <span>JSON</span>
                          <button 
                            className="copy-button"
                            onClick={() => copyToClipboard(`{
  "mcpServers": {
    "recall-kit": {
      "url": "http://www.codeva-cn.com:3101/sse?api_key=your-api-key"
    }
  }
}`)}
                          >
                            {copiedCode === `{
  "mcpServers": {
    "recall-kit": {
      "url": "http://www.codeva-cn.com:3101/sse?api_key=your-api-key"
    }
  }
}` ? '已复制!' : '复制'}
                          </button>
                        </div>
                        <pre>{`{
  "mcpServers": {
    "recall-kit": {
      "url": "http://www.codeva-cn.com:3101/sse?api_key=your-api-key"
    }
  }
}`}</pre>
                      </div>
                    </div>
                    <div className="config-step">
                      <h4>3. 开启插件</h4>
                      <p>配置完成后，在 IDE 的 MCP 中开启，你就可以开始使用 Recall Kit 了。</p>
                    </div>
                  </div>
                  <div className="troubleshooting">
                    <h4>常见问题</h4>
                    <ul>
                      <li><strong>连接失败：</strong>检查 API 密钥是否正确，网络是否正常</li>
                      <li><strong>权限错误：</strong>确保 API 密钥具有相应的权限</li>
                      <li><strong>超时问题：</strong>检查网络连接和服务器状态</li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'ide-usage' && (
              <section className="docs-section">
                <h2>IDE 使用指南</h2>
                <div className="usage-section">
                  <h3>查询经验</h3>
                  <p>在 IDE 中，你可以通过自然语言查询相关经验：</p>
                  <div className="example-blocks">
                    <div className="example-block">
                      <h4>示例 1：特定错误修复</h4>
                      <div className="code-block">
                        <div className="code-header">
                          <span>查询示例</span>
                          <button 
                            className="copy-button"
                            onClick={() => copyToClipboard(`我遇到了 React 的 "Cannot read property 'map' of undefined" 错误，请修复。可以查找经验平台中相关的经验和解决方案用来参考`)}
                          >
                            {copiedCode === `我遇到了 React 的 "Cannot read property 'map' of undefined" 错误，请修复。可以查找经验平台中相关的经验和解决方案用来参考` ? '已复制!' : '复制'}
                          </button>
                        </div>
                        <pre>{`我遇到了 React 的 "Cannot read property 'map' of undefined" 错误，请修复。可以查找经验平台中相关的经验和解决方案用来参考`}</pre>
                      </div>
                    </div>
                    <div className="example-block">
                      <h4>示例 2：查询最佳实践</h4>
                      <div className="code-block">
                        <div className="code-header">
                          <span>查询示例</span>
                          <button 
                            className="copy-button"
                            onClick={() => copyToClipboard(`是否有Node.js 中处理异步操作的最佳实践的相关经验？`)}
                          >
                            {copiedCode === `是否有Node.js 中处理异步操作的最佳实践的相关经验？` ? '已复制!' : '复制'}
                          </button>
                        </div>
                        <pre>{`是否有Node.js 中处理异步操作的最佳实践的相关经验？`}</pre>
                      </div>
                    </div>
                    <div className="example-block">
                      <h4>示例 3：经验ID查询</h4>
                      <div className="code-block">
                        <div className="code-header">
                          <span>查询示例</span>
                          <button 
                            className="copy-button"
                            onClick={() => copyToClipboard(`请查询经验ID为 exp-12345 的详细内容`)}
                          >
                            {copiedCode === `请查询经验ID为 exp-12345 的详细内容` ? '已复制!' : '复制'}
                          </button>
                        </div>
                        <pre>{`请查询经验ID为 550e8400-e29b-41d4-a716-446655440000 的详细内容`}</pre>
                      </div>
                    </div>
                  </div>
                  <h3>总结经验</h3>
                  <p>在功能实现或问题修复后，你可以让 Agent 总结当前对话的完整上下文，提取关键信息，生成指定格式的文档：</p>
                  <div className="example-blocks">
                    <div className="example-block">
                      <h4>总结命令（支持MCP Prompt）</h4>
                      <div className="code-block">
                        <pre>{`/recall-kit/summarize_experience`}</pre>
                      </div>
                    </div>
                    <div className="example-block">
                      <h4>总结命令（不支持MCP Prompt）</h4>
                      <div className="code-block">
                        <pre>{`请按照 .recall-kit/summarize_experience.md 文件所写，总结当前对话，并生成文档`}</pre>
                      </div>
                    </div>
                  </div>
                  <div className="note-highlight">
                    💡 文档会自动生成在 <code className="directory-path">spec/experiences/</code> 目录下<br />
                    &nbsp;&nbsp;你可以检查生成文档的内容，并可以修改文档内容<br />
                    &nbsp;&nbsp;如：删除敏感信息、增改关键词等
                  </div>
                  <h3>提交经验</h3>
                  <p>当你检查过文档内容之后，可以让 Agent 提交文档内容到平台：</p>
                  <div className="example-blocks">
                    <div className="example-block">
                      <h4>提交命令（支持MCP Prompt）</h4>
                      <div className="code-block">
                        <pre>{`/recall-kit/submit_doc_experience`}</pre>
                      </div>
                    </div>
                    <div className="example-block">
                      <h4>提交命令（不支持MCP Prompt）</h4>
                      <div className="code-block">
                        <pre>{`请按照 .recall-kit/submit_doc_experience.md 文件所写，提交 spec/experiences/xxxxxx.md 文档到平台`}</pre>
                      </div>
                    </div>
                  </div>
                  <h3>支持的 IDE</h3>
                  <div className="ide-list">
                    <div className="ide-item">
                      <i className="fas fa-code"></i>
                      <div>
                        <h4>VS Code</h4>
                        <p>通过 MCP 插件集成，支持完整的查询和提交功能</p>
                      </div>
                    </div>
                    <div className="ide-item">
                      <i className="fas fa-rocket"></i>
                      <div>
                        <h4>Cursor</h4>
                        <p>原生支持 MCP 协议，无需额外配置</p>
                      </div>
                    </div>
                    <div className="ide-item">
                      <i className="fas fa-robot"></i>
                      <div>
                        <h4>其他支持 MCP 的 IDE</h4>
                        <p>只要支持 MCP 协议的 IDE 都可以使用 Recall Kit</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'admin-features' && (
              <section className="docs-section">
                <h2>后台管理功能</h2>
                <div className="admin-features">
                  <div className="feature-section">
                    <h3>API 密钥管理</h3>
                    <div className="feature-description">
                      <p>管理用于 MCP 连接的 API 密钥，确保安全的访问控制。</p>
                      <ul>
                        <li>创建新密钥</li>
                        <li>查看密钥使用统计</li>
                        <li>设置密钥权限和过期时间</li>
                        <li>禁用或删除密钥</li>
                      </ul>
                    </div>
                  </div>
                  <div className="feature-section">
                    <h3>个人经验管理</h3>
                    <div className="feature-description">
                      <p>查看和管理你提交的所有经验记录。</p>
                      <ul>
                        <li>浏览个人经验列表</li>
                        <li>编辑和更新经验内容</li>
                        <li>查看经验访问统计</li>
                        <li>删除不需要的经验</li>
                      </ul>
                    </div>
                  </div>
                  <div className="feature-section">
                    <h3>用户管理（管理员）</h3>
                    <div className="feature-description">
                      <p>管理系统用户和权限分配。</p>
                      <ul>
                        <li>查看用户列表</li>
                        <li>分配用户角色和权限</li>
                        <li>重置用户密码</li>
                        <li>管理用户状态</li>
                      </ul>
                    </div>
                  </div>
                  <div className="feature-section">
                    <h3>统计报表</h3>
                    <div className="feature-description">
                      <p>查看平台使用情况和数据分析。</p>
                      <ul>
                        <li>经验提交趋势</li>
                        <li>热门经验统计</li>
                        <li>用户活跃度分析</li>
                        <li>API 调用统计</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'deployment' && (
              <section className="docs-section">
                <h2>私有化部署</h2>
                <div className="deployment-section">
                  <h3>部署方式</h3>
                  <div className="deployment-options">
                    <div className="deployment-option">
                      <h4>Docker 部署（推荐）</h4>
                      <p>使用 Docker Compose 进行快速部署：</p>
                      <div className="code-block">
                        <pre>{`# 克隆项目
git clone https://github.com/your-org/recall-kit.git
cd recall-kit

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置必要的配置

# 启动服务
docker-compose up -d`}</pre>
                      </div>
                    </div>
                    <div className="deployment-option">
                      <h4>源码部署</h4>
                      <p>从源码构建和部署：</p>
                      <div className="code-block">
                        <pre>{`# 安装依赖
npm install

# 构建前端
cd web && npm run build

# 启动后端服务
cd ../mcp-server && npm start`}</pre>
                      </div>
                    </div>
                  </div>
                  <h3>环境配置</h3>
                  <div className="env-config">
                    <h4>必需配置</h4>
                    <ul>
                      <li><code>DATABASE_URL</code> - 数据库连接字符串</li>
                    </ul>
                    <h4>可选配置</h4>
                    <ul>
                      <li><code>LOG_LEVEL</code> - 日志级别</li>
                    </ul>
                  </div>
                  <h3>数据库设置</h3>
                  <p>Recall Kit 支持 PostgreSQL 数据库：</p>
                  <div className="code-block">
                    <pre>{`# 创建数据库
createdb recall_kit

# 运行迁移
npm run db:migrate

# 导入初始数据（可选）
npm run db:seed`}</pre>
                  </div>
                  <div className="deployment-tips">
                    <h4>部署建议</h4>
                    <ul>
                      <li>使用 HTTPS 确保数据传输安全</li>
                      <li>配置反向代理（如 Nginx）</li>
                      <li>设置定期数据库备份</li>
                      <li>监控服务器资源使用情况</li>
                      <li>配置日志轮转和监控</li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'api-reference' && (
              <section className="docs-section">
                <h2>API 参考</h2>
                <div className="api-reference">
                  <h3>REST API</h3>
                  <div className="api-endpoints">
                    <div className="api-endpoint">
                      <h4>查询经验</h4>
                      <div className="api-method">GET</div>
                      <div className="api-path">/api/experiences</div>
                      <div className="api-params">
                        <h5>参数：</h5>
                        <ul>
                          <li><code>query</code> - 搜索关键词</li>
                          <li><code>limit</code> - 返回数量限制</li>
                          <li><code>offset</code> - 偏移量</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <h3>MCP API</h3>
                  <div className="mcp-commands">
                    <div className="mcp-command">
                      <h4>query_experiences</h4>
                      <p>查询相关经验记录</p>
                      <div className="code-block">
                        <pre>{`{
  "tool": "query_experiences",
  "arguments": {
    "keywords": ["React", "error"],
    "ids": ["exp1", "exp2"],
    "limit": 10,
    "offset": 0,
    "sort": "relevance"
  }
}`}</pre>
                      </div>
                      <div className="api-params">
                        <h5>参数说明：</h5>
                        <ul>
                          <li><code>keywords</code> - 搜索关键词数组（可选）</li>
                          <li><code>ids</code> - 经验ID数组（可选）</li>
                          <li><code>limit</code> - 返回数量限制（可选，默认值由配置决定）</li>
                          <li><code>offset</code> - 偏移量（可选，默认0）</li>
                          <li><code>sort</code> - 排序方式（可选，默认relevance）：
                            <ul>
                              <li><code>relevance</code> - 相关性排序</li>
                              <li><code>query_count</code> - 查询次数排序</li>
                              <li><code>created_at</code> - 创建时间排序</li>
                            </ul>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="mcp-command">
                      <h4>submit_experience</h4>
                      <p>提交新的经验记录</p>
                      <div className="code-block">
                        <pre>{`{
  "tool": "submit_experience",
  "arguments": {
    "title": "React State 更新问题",
    "problem_description": "组件状态没有正确更新",
    "root_cause": "使用了直接修改状态的方式",
    "solution": "使用 setState 或不可变更新",
    "keywords": ["React", "state", "setState"]
  }
}`}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'faq' && (
              <section className="docs-section">
                <h2>常见问题</h2>
                <div className="faq-section">
                  <div className="faq-item">
                    <h3>Q: MCP 连接失败怎么办？</h3>
                    <div className="faq-answer">
                      <p><strong>A:</strong> 请按以下步骤排查：</p>
                      <ol>
                        <li>检查 API 密钥是否正确且有效</li>
                        <li>确认网络连接正常，可以访问 Recall Kit 服务</li>
                        <li>检查 MCP 配置文件格式是否正确</li>
                        <li>查看 IDE 日志中的错误信息</li>
                        <li>尝试重启 IDE</li>
                      </ol>
                    </div>
                  </div>
                  <div className="faq-item">
                    <h3>Q: 查询结果不准确怎么办？</h3>
                    <div className="faq-answer">
                      <p><strong>A:</strong> 可以尝试以下方法：</p>
                      <ol>
                        <li>使用更具体的关键词</li>
                        <li>尝试不同的表达方式</li>
                        <li>检查相关的经验记录是否存在</li>
                        <li>考虑提交新的经验记录</li>
                      </ol>
                    </div>
                  </div>
                  <div className="faq-item">
                    <h3>Q: 如何备份我的数据？</h3>
                    <div className="faq-answer">
                      <p><strong>A:</strong> 建议采取以下备份策略：</p>
                      <ol>
                        <li>定期备份数据库</li>
                        <li>导出重要的经验记录</li>
                        <li>备份配置文件和环境变量</li>
                        <li>使用版本控制管理自定义配置</li>
                      </ol>
                    </div>
                  </div>
                  <div className="faq-item">
                    <h3>Q: 支持哪些数据库？</h3>
                    <div className="faq-answer">
                      <p><strong>A:</strong> 目前主要支持 PostgreSQL 16+ 版本。未来计划支持更多数据库类型。</p>
                    </div>
                  </div>
                  <div className="faq-item">
                    <h3>Q: 如何提高查询性能？</h3>
                    <div className="faq-answer">
                      <p><strong>A:</strong> 性能优化建议：</p>
                      <ol>
                        <li>确保数据库有适当的索引</li>
                        <li>考虑使用 Redis 缓存</li>
                        <li>优化向量嵌入配置</li>
                        <li>定期清理过期数据</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}