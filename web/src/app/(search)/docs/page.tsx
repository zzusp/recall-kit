'use client';

import { useState } from 'react';
import Link from 'next/link';
import './docs.css';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');

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
        <div className="docs-breadcrumb">
          <Link href="/" className="breadcrumb-link">首页</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">文档</span>
        </div>
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
                <div className="steps-container">
                  <div className="step-item">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3>注册账号</h3>
                      <p>访问 Recall Kit 平台，点击"管理后台登录"进行账号注册或登录。</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h3>获取 API 密钥</h3>
                      <p>在管理后台的"API 密钥"页面创建新的 API 密钥，用于后续的 MCP 配置。</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>配置 MCP</h3>
                      <p>在你的 IDE 中配置 MCP 服务器，使用获取的 API 密钥进行身份验证。</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <div className="step-number">4</div>
                    <div className="step-content">
                      <h3>开始使用</h3>
                      <p>配置完成后，即可在 IDE 中使用 AI 助手查询和提交经验记录。</p>
                    </div>
                  </div>
                </div>
                <div className="quick-commands">
                  <h3>快速命令参考</h3>
                  <div className="command-list">
                    <div className="command-item">
                      <code>查询相关经验</code>
                      <p>在 IDE 中直接询问 AI 助手相关问题，它会自动查询 Recall Kit 中的相关经验</p>
                    </div>
                    <div className="command-item">
                      <code>提交新经验</code>
                      <p>告诉 AI 助手"请保存这个经验"，它会将当前问题的解决方案保存到平台</p>
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
                        <pre>{`{
  "mcpServers": {
    "recall-kit": {
      "command": "node",
      "args": ["mcp-server/src/index.js"],
      "env": {
        "RECALL_KIT_API_KEY": "your-api-key-here",
        "RECALL_KIT_BASE_URL": "https://your-domain.com"
      }
    }
  }
}`}</pre>
                      </div>
                    </div>
                    <div className="config-step">
                      <h4>3. 重启 IDE</h4>
                      <p>配置完成后，重启你的 IDE 以加载 MCP 服务器。</p>
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
                      <h4>示例 1：查询特定错误</h4>
                      <div className="code-block">
                        <pre>{`我遇到了 React 的 "Cannot read property 'map' of undefined" 错误，有什么解决方案吗？`}</pre>
                      </div>
                    </div>
                    <div className="example-block">
                      <h4>示例 2：查询最佳实践</h4>
                      <div className="code-block">
                        <pre>{`Node.js 中处理异步操作的最佳实践是什么？`}</pre>
                      </div>
                    </div>
                  </div>
                  <h3>提交经验</h3>
                  <p>当你解决了问题时，可以告诉 AI 助手保存经验：</p>
                  <div className="example-blocks">
                    <div className="example-block">
                      <h4>提交命令</h4>
                      <div className="code-block">
                        <pre>{`请将刚才的解决方案保存到 Recall Kit，包含：
- 问题描述
- 根本原因
- 解决方案
- 相关关键词`}</pre>
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
                      <li><code>JWT_SECRET</code> - JWT 签名密钥</li>
                      <li><code>OPENAI_API_KEY</code> - OpenAI API 密钥（用于向量嵌入）</li>
                    </ul>
                    <h4>可选配置</h4>
                    <ul>
                      <li><code>REDIS_URL</code> - Redis 连接字符串（缓存）</li>
                      <li><code>SMTP_CONFIG</code> - 邮件服务配置</li>
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
                    <div className="api-endpoint">
                      <h4>创建经验</h4>
                      <div className="api-method">POST</div>
                      <div className="api-path">/api/experiences</div>
                      <div className="api-params">
                        <h5>请求体：</h5>
                        <div className="code-block">
                          <pre>{`{
  "title": "经验标题",
  "problem_description": "问题描述",
  "root_cause": "根本原因",
  "solution": "解决方案",
  "keywords": ["关键词1", "关键词2"]
}`}</pre>
                        </div>
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
    "limit": 5
  }
}`}</pre>
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
                      <p><strong>A:</strong> 目前主要支持 PostgreSQL 12+ 版本。未来计划支持更多数据库类型。</p>
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