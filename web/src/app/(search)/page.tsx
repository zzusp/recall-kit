import { ExperienceList } from '@/components/experience/ExperienceList';
import { ExperienceService } from '@/lib/services/experienceService';
import Link from 'next/link';

export default async function HomePage() {
  const experienceService = new ExperienceService();
  const { experiences } = await experienceService.queryExperiences({
    limit: 10,
    sort: 'relevance'
  });

  const popularKeywords = await experienceService.getPopularKeywords();

  return (
    <>
      <div className="page-container">
        <div className="hero-section">
          <h1 className="hero-title">AI开发踩坑记录检索平台</h1>
          <p className="hero-subtitle">记录、分享、复用开发经验，让每一次踩坑都成为团队的智慧财富</p>
          <div className="button-group">
            <Link 
              href="/search" 
              className="btn btn-primary"
            >
              <i className="fas fa-search"></i> 立即搜索
            </Link>
            <Link href="/list" className="btn btn-secondary">
              <i className="fas fa-book-open"></i> 浏览知识库
            </Link>
          </div>
        </div>
        
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-tags"></i>
            </div>
            <h3 className="feature-title">经验分类标签</h3>
            <p className="feature-desc">归类AI开发踩坑经验，支持Vue、React、Next.js、Python、Java等主流技术栈分类</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-bug"></i>
            </div>
            <h3 className="feature-title">报错日志管理</h3>
            <p className="feature-desc">记录并分析报错日志，快速定位问题根源</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-lightbulb"></i>
            </div>
            <h3 className="feature-title">解决方案中心</h3>
            <p className="feature-desc">共享最佳实践和解决方案，避免重复踩坑</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-robot"></i>
            </div>
            <h3 className="feature-title">AI智能辅助</h3>
            <p className="feature-desc">AI大模型调用，提升问题解决效率</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-chart-pie"></i>
            </div>
            <h3 className="feature-title">数据分析</h3>
            <p className="feature-desc">知识库使用分析，优化团队学习路径</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3 className="feature-title">权限管理</h3>
            <p className="feature-desc">灵活的权限控制，保护团队知识资产</p>
          </div>
        </div>
      </div>
      
      <footer className="footer w-full">
        Recall Kit © 2023 | AI开发踩坑记录检索平台
      </footer>
    </>
  );
}