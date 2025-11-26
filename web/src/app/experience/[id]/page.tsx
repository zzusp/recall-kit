import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ExperienceService } from '@/lib/server/services/experience';

interface ExperienceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ExperienceDetailPage({ params }: ExperienceDetailPageProps) {
  // Next.js 15 requires params to be awaited
  const { id } = await params;
  
  const experienceService = new ExperienceService();
  
  // 先增加浏览次数并等待完成
  const newViewCount = await experienceService.incrementViewCount(id);
  
  // 获取经验记录数据
  const experience = await experienceService.getExperienceById(id);

  if (!experience) {
    notFound();
  }

  // 如果更新成功，使用新的浏览次数
  if (newViewCount > 0) {
    experience.view_count = newViewCount;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Link 
        href="/search"
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors duration-200"
      >
        <i className="fas fa-arrow-left mr-2"></i>
        返回搜索
      </Link>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <i className="fas fa-file-alt text-blue-600 mr-2"></i>
            {experience.title}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span><i className="fas fa-eye mr-1"></i> {experience.view_count || 0}次浏览</span>
            <span>
              <i className="fas fa-calendar mr-1"></i>
              {new Date(experience.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        {experience.keywords && experience.keywords.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {experience.keywords.map(keyword => (
                <span 
                  key={keyword} 
                  className="tag !text-sm"
                >
                  <i className="fas fa-tag mr-1"></i>
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-8">
          <div className="bg-white rounded-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              <i className="fas fa-exclamation-triangle text-orange-500 mr-2"></i>
              问题描述
            </h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {experience.problem_description}
            </div>
          </div>

          {experience.root_cause && (
            <div className="bg-white rounded-lg p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                <i className="fas fa-search text-red-500 mr-2"></i>
                根本原因
              </h2>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {experience.root_cause}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              <i className="fas fa-lightbulb text-green-500 mr-2"></i>
              解决方案
            </h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {experience.solution}
            </div>
          </div>

          {experience.context && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                <i className="fas fa-info-circle text-blue-500 mr-2"></i>
                背景信息
              </h2>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
                {experience.context}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}