'use client';

import { useState, useEffect } from 'react';
import { ExperienceRecord } from '@/lib/services/experienceService';
import Link from 'next/link';

export default function ListPage() {
  const [activeTag, setActiveTag] = useState('Vue.js');
  const [searchTerm, setSearchTerm] = useState('');
  const [experiences, setExperiences] = useState<ExperienceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 增加查看次数的函数
  const incrementViewCount = async (experienceId: string) => {
    try {
      const response = await fetch(`/api/experiences/${experienceId}/view`, {
        method: 'POST',
        cache: 'no-store'
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.success ? result.data?.newCount || 0 : 0;
      }
      return 0;
    } catch (error) {
      console.error('Failed to increment view count:', error);
      return 0;
    }
  };

  useEffect(() => {
    const loadExperiences = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          keywords: activeTag || '',
          limit: '12',
          sort: 'relevance'
        });

        const response = await fetch(`/api/experiences?${params.toString()}`, {
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch experiences');
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data) {
          throw new Error('Invalid response format');
        }
        
        setExperiences(result.data.experiences || []);
      } catch (error) {
        console.error('Failed to load experiences:', error);
        setExperiences([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadExperiences();
  }, [activeTag]);

  const tags = ['Vue.js', 'React', 'Node.js', 'Python', 'Java', 'TypeScript'];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h2 className="list-title mb-8">
        <i className="fas fa-book mr-3 text-blue-600"></i> 知识库列表
      </h2>
      
      <div className="card mb-8">
        <div className="filter-bar">
          <div className="tag-list">
            {tags.map(tag => (
              <span 
                key={tag}
                className={`tag ${activeTag === tag ? 'active' : ''}`}
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
          
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索知识条目..." 
            className="form-input w-64"
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="card text-center py-12">
          <div className="text-gray-500 text-lg">
            <i className="fas fa-spinner fa-spin mr-2"></i>
            加载中...
          </div>
        </div>
      ) : (
        <>
          <div className="feature-grid">
            {experiences.length > 0 ? (
              experiences.map(experience => (
                <div 
                  key={experience.id} 
                  className="feature-card cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  onClick={async () => {
                    // 在跳转前增加查看次数
                    await incrementViewCount(experience.id);
                    window.location.href = `/experience/${experience.id}`;
                  }}
                >
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
              ))
            ) : (
              <div className="feature-card text-center py-12">
                <div className="text-gray-500 text-lg">
                  没有找到相关经验记录
                </div>
              </div>
            )}
          </div>
        </>
      )}
      
      <div className="flex justify-center gap-2 mt-8">
        <button className="btn bg-gray-100 text-gray-600">
          <i className="fas fa-chevron-left"></i>
        </button>
        <button className="btn bg-blue-600 text-white">1</button>
        <button className="btn bg-gray-100 text-gray-600">2</button>
        <button className="btn bg-gray-100 text-gray-600">3</button>
        <button className="btn bg-gray-100 text-gray-600">4</button>
        <button className="btn bg-gray-100 text-gray-600">
          <i className="fas fa-ellipsis-h"></i>
        </button>
        <button className="btn bg-gray-100 text-gray-600">
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}