import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ExperienceService } from '@/lib/services/experienceService';

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
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Link 
        href="/"
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        ← Back to Home
      </Link>

      <article className="card">
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{experience.title}</h1>
          
          {experience.keywords && experience.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {experience.keywords.map(keyword => (
                <span 
                  key={keyword} 
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span><i className="fas fa-eye mr-1"></i> {experience.view_count || 0}次浏览</span>
            <span>
              Added on {new Date(experience.created_at).toLocaleDateString()}
            </span>
          </div>
        </header>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Problem Description</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {experience.problem_description}
            </p>
          </div>

          {experience.root_cause && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Root Cause</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {experience.root_cause}
              </p>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-3">Solution</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {experience.solution}
            </p>
          </div>

          {experience.context && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Context</h2>
              <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap break-words">
                {experience.context}
              </div>
            </div>
          )}
        </section>
      </article>
    </div>
  );
}