'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ExperienceList } from '@/components/experience/ExperienceList';
import { ExperienceService } from '@/lib/services/experienceService';
import { ExperienceRecord } from '@/lib/services/experienceService';

export default function SearchPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ExperienceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [pageLoaded, setPageLoaded] = useState(false);
  const searchCache = React.useRef(new Map());

  useEffect(() => {
    // 页面加载后标记为已加载
    setPageLoaded(true);
    
    // 预加载可能需要的资源
    const preloadResources = async () => {
      try {
        // 预加载组件和服务的代码
        await Promise.all([
          import('@/components/experience/ExperienceList'),
          import('@/lib/services/experienceService')
        ]);
      } catch (error) {
        console.log('预加载资源失败:', error);
      }
    };
    
    preloadResources();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // 检查缓存
    const cacheKey = searchTerm.toLowerCase().trim();
    if (searchCache.current.has(cacheKey)) {
      setSearchResults(searchCache.current.get(cacheKey));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const experienceService = new ExperienceService();
      const { experiences } = await experienceService.queryExperiences({
        q: searchTerm,
        limit: 20,
        sort: 'relevance'
      });
      
      // 缓存结果
      searchCache.current.set(cacheKey, experiences);
      setSearchResults(experiences);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="card mb-8">
        <h2 className="textQ-3xl font-semibold text-center mb-6">
          <i className="fas fa-search text-blue-600 mr-3"></i> 知识检索
        </h2>
        
        <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">
          输入报错信息、技术关键词或问题描述，快速找到解决方案
        </p>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-4 items-center max-w-2xl mx-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="输入报错信息、技术关键词或问题描述..."
              className="flex-1 px-6 py-4 border border-gray-200 rounded-full text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-md"
            />
            <button
              type="submit"
              disabled={isLoading || !searchTerm.trim()}
              className="btn btn-primary whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i> 搜索中...
                </>
              ) : (
                <>
                  <i className="fas fa-search mr-2"></i> 搜索
                </>
              )}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-3 justify-center">
          <span className="tag">Vue.js</span>
          <span className="tag">React</span>
          <span className="tag">Node.js</span>
          <span className="tag">Python</span>
          <span className="tag">Java</span>
          <span className="tag">TypeScript</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {searchResults.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <div className="card-title">搜索结果 ({searchResults.length}条)</div>
            <div className="text-gray-600">关于 "{searchTerm}"</div>
          </div>
          
          <div className="space-y-6">
            {searchResults.slice(0, 3).map((experience, index) => (
              <div key={experience.id} className="feature-card">
                <div className="feature-title">
                  <i className="fas fa-file-alt text-blue-600 mr-2"></i>
                  {experience.title}
                </div>
                <p className="text-gray-600 my-3">
                  {experience.problem_description.length > 100 
                    ? experience.problem_description.substring(0, 100) + '...' 
                    : experience.problem_description}
                </p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span><i className="fas fa-tag mr-1"></i> {experience.keywords?.[0] || 'General'}</span>
                  <span><i className="fas fa-eye mr-1"></i> {experience.view_count || 0}次浏览</span>
                </div>
              </div>
            ))}
          </div>

          {searchResults.length > 3 && (
            <div className="text-center mt-6">
              <button className="btn bg-gray-100 text-gray-600 hover:bg-gray-200">
                <i className="fas fa-ellipsis-h mr-2"></i> 加载更多结果
              </button>
            </div>
          )}
        </div>
      ) : searchTerm && !isLoading ? (
        <div className="card text-center">
          <div className="text-gray-500 text-lg py-8">
            没有找到关于 "{searchTerm}" 的解决方案
          </div>
        </div>
      ) : null}
    </div>
  );
}