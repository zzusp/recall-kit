import { ExperienceService } from '@/lib/server/services/experience';
import Link from 'next/link';

export const revalidate = 0; // 禁用缓存，确保每次都获取最新数据

export default async function HomePage() {
  const experienceService = new ExperienceService();
  const { experiences, totalCount } = await experienceService.queryExperiences({
    limit: 6,
    sort: 'created_at'
  });

  const popularExperiences = await experienceService.getPopularExperiences(6);
  const platformStats = await experienceService.getPlatformStats();

  return (
    <>
      <div className="page-container">
        {/* Hero Section */}
        <div className="hero-section-modern">
          <div className="hero-content">
            <div className="hero-badge">
              <i className="fas fa-sparkles"></i>
              <span>AI开发经验分享平台</span>
            </div>
            <h1 className="hero-title-modern">
              让每一次踩坑
              <br />
              <span className="gradient-text">成为团队的智慧财富</span>
            </h1>
            <p className="hero-subtitle-modern">
              记录、分享、复用开发经验，通过MCP协议让AI Agent自动查询和复用经验，减少重复对话和token浪费
            </p>
            <div className="button-group-modern">
              <Link 
                href="/search" 
                className="btn btn-primary-modern"
              >
                <i className="fas fa-search"></i>
                <span>立即搜索</span>
              </Link>
              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-number">{platformStats.totalExperiences || 0}+</span>
                  <span className="stat-label">经验记录</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-number">{platformStats.totalViews || 0}+</span>
                  <span className="stat-label">总浏览量</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-number">{platformStats.totalQueries || 0}+</span>
                  <span className="stat-label">总查询数</span>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-decoration">
            <div className="decoration-circle circle-1"></div>
            <div className="decoration-circle circle-2"></div>
            <div className="decoration-circle circle-3"></div>
          </div>
        </div>

        {/* Popular Experiences Section */}
        {popularExperiences.length > 0 && (
          <section className="experiences-section">
            <div className="section-header">
              <h2 className="section-title">
                <i className="fas fa-fire"></i>
                热门经验
              </h2>
              <Link href="/search?sort=query_count" className="section-link">
                查看全部 <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
            <div className="experiences-grid">
              {popularExperiences.map(experience => (
                <Link
                  key={experience.id}
                  href={`/experience/${experience.id}`}
                  className="experience-card-modern"
                >
                  <div className="experience-header">
                    <h3 className="experience-title">{experience.title}</h3>
                    <div className="experience-meta">
                      <span className="meta-item">
                        <i className="fas fa-eye"></i>
                        {experience.view_count || 0}
                      </span>
                      <span className="meta-item">
                        <i className="fas fa-search"></i>
                        {experience.query_count || 0}
                      </span>
                      <span className="meta-item">
                        <i className="fas fa-calendar"></i>
                        {new Date(experience.created_at).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="experience-description">
                    {experience.problem_description.length > 120
                      ? experience.problem_description.substring(0, 120) + '...'
                      : experience.problem_description}
                  </p>
                  {experience.keywords && experience.keywords.length > 0 && (
                    <div className="experience-tags">
                      {experience.keywords.slice(0, 3).map(keyword => (
                        <span key={keyword} className="experience-tag">
                          {keyword}
                        </span>
                      ))}
                      {experience.keywords.length > 3 && (
                        <span className="experience-tag-more">
                          +{experience.keywords.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="experience-footer">
                    <span className="read-more">
                      查看详情 <i className="fas fa-arrow-right"></i>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Latest Experiences Section */}
        {experiences.length > 0 && (
          <section className="experiences-section">
            <div className="section-header">
              <h2 className="section-title">
                <i className="fas fa-clock"></i>
                最新经验记录
              </h2>
              <Link href="/search" className="section-link">
                查看更多 <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
            <div className="experiences-grid">
              {experiences.map(experience => (
                <Link
                  key={experience.id}
                  href={`/experience/${experience.id}`}
                  className="experience-card-modern"
                >
                  <div className="experience-header">
                    <h3 className="experience-title">{experience.title}</h3>
                    <div className="experience-meta">
                      <span className="meta-item">
                        <i className="fas fa-eye"></i>
                        {experience.view_count || 0}
                      </span>
                      <span className="meta-item">
                        <i className="fas fa-calendar"></i>
                        {new Date(experience.created_at).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="experience-description">
                    {experience.problem_description.length > 120
                      ? experience.problem_description.substring(0, 120) + '...'
                      : experience.problem_description}
                  </p>
                  {experience.keywords && experience.keywords.length > 0 && (
                    <div className="experience-tags">
                      {experience.keywords.slice(0, 3).map(keyword => (
                        <span key={keyword} className="experience-tag">
                          {keyword}
                        </span>
                      ))}
                      {experience.keywords.length > 3 && (
                        <span className="experience-tag-more">
                          +{experience.keywords.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="experience-footer">
                    <span className="read-more">
                      查看详情 <i className="fas fa-arrow-right"></i>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="features-section-modern">
          <div className="section-header">
            <h2 className="section-title">
              <i className="fas fa-star"></i>
              核心功能
            </h2>
          </div>
          <div className="feature-grid-modern">
            <div className="feature-card-modern">
              <div className="feature-icon-modern icon-tags">
                <i className="fas fa-tags"></i>
              </div>
              <h3 className="feature-title-modern">智能向量检索</h3>
              <p className="feature-desc-modern">基于语义理解的向量搜索，精准匹配相关经验，无需精确关键词匹配</p>
            </div>
            
            <div className="feature-card-modern">
              <div className="feature-icon-modern icon-bug">
                <i className="fas fa-bug"></i>
              </div>
              <h3 className="feature-title-modern">报错日志管理</h3>
              <p className="feature-desc-modern">记录并分析报错日志，快速定位问题根源</p>
            </div>
            
            <div className="feature-card-modern">
              <div className="feature-icon-modern icon-lightbulb">
                <i className="fas fa-lightbulb"></i>
              </div>
              <h3 className="feature-title-modern">解决方案中心</h3>
              <p className="feature-desc-modern">共享最佳实践和解决方案，避免重复踩坑</p>
            </div>
            
            <div className="feature-card-modern">
              <div className="feature-icon-modern icon-robot">
                <i className="fas fa-robot"></i>
              </div>
              <h3 className="feature-title-modern">AI智能辅助</h3>
              <p className="feature-desc-modern">AI大模型调用，提升问题解决效率</p>
            </div>
            
            <div className="feature-card-modern">
              <div className="feature-icon-modern icon-shield">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3 className="feature-title-modern">权限管理</h3>
              <p className="feature-desc-modern">灵活的权限控制，保护团队知识资产</p>
            </div>

            <div className="feature-card-modern">
              <div className="feature-icon-modern icon-mcp">
                <i className="fas fa-plug"></i>
              </div>
              <h3 className="feature-title-modern">MCP协议集成</h3>
              <p className="feature-desc-modern">通过MCP协议让AI Agent自动查询和保存经验，无缝集成工作流</p>
            </div>
          </div>
        </section>
      </div>
      
      <footer className="footer-modern">
        <div className="footer-content">
          <div className="footer-brand">
            <i className="fas fa-brain"></i>
            <span>Recall Kit</span>
          </div>
          <p className="footer-text">AI开发踩坑记录检索平台</p>
          <p className="footer-copyright">© 2024 Recall Kit. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}