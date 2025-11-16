'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ExperienceList } from '@/components/experience/ExperienceList';
import { ExperienceRecord } from '@/lib/services/experienceService';

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="card text-center py-12">
          <div className="text-gray-500 text-lg">
            <i className="fas fa-spinner fa-spin mr-2"></i>
            加载中...
          </div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<ExperienceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [pageLoaded, setPageLoaded] = useState(false);

  // 通过 API 路由搜索经验记录
  const searchExperiences = async (query: string, keywords: string[] = [], limit: number = 20) => {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      sort: 'relevance'
    });

    // 添加keywords参数
    if (keywords.length > 0) {
      keywords.forEach(keyword => {
        params.append('keywords', keyword);
      });
    }

    // 禁用缓存，确保每次获取最新数据
    const response = await fetch(`/api/experiences?${params.toString()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '搜索失败，请稍后重试');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '搜索失败，请稍后重试');
    }

    return result.data.experiences as ExperienceRecord[];
  };

  // 加载默认记录
  const loadDefaultExperiences = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const experiences = await searchExperiences('', 10);
      setSearchResults(experiences);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 从URL参数初始化搜索
  useEffect(() => {
    const keywordsParam = searchParams.get('keywords');
    const queryParam = searchParams.get('q');
    
    if (keywordsParam) {
      // 如果URL中有keywords参数，解析并设置
      const keywords = decodeURIComponent(keywordsParam).split(',').filter(k => k.trim());
      setSelectedKeywords(keywords);
      setSearchTerm(keywords.join(', ')); // 在搜索框中显示关键词
      
      // 执行搜索
      setIsLoading(true);
      setError('');
      searchExperiences('', keywords, 20)
        .then(experiences => {
          setSearchResults(experiences);
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : '搜索失败，请稍后重试');
        })
        .finally(() => {
          setIsLoading(false);
          setPageLoaded(true);
        });
    } else if (queryParam) {
      // 如果URL中有q参数，设置搜索词并执行搜索
      setSearchTerm(queryParam);
      setIsLoading(true);
      setError('');
      searchExperiences(queryParam, [], 20)
        .then(experiences => {
          setSearchResults(experiences);
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : '搜索失败，请稍后重试');
        })
        .finally(() => {
          setIsLoading(false);
          setPageLoaded(true);
        });
    } else {
      // 如果没有URL参数，加载默认记录
      setPageLoaded(true);
      const preloadResources = async () => {
        try {
          await import('@/components/experience/ExperienceList');
          await loadDefaultExperiences();
        } catch (error) {
          console.log('预加载资源失败:', error);
        }
      };
      preloadResources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // 如果搜索词为空且没有选中的关键词，加载默认记录
    if (!searchTerm.trim() && selectedKeywords.length === 0) {
      await loadDefaultExperiences();
      // 清除URL参数
      router.push('/search');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 如果搜索框有内容，使用搜索框内容；否则使用选中的关键词
      const query = searchTerm.trim();
      const keywords = selectedKeywords.length > 0 && !query ? selectedKeywords : [];
      
      const experiences = await searchExperiences(query, keywords, 20);
      
      // 更新URL参数
      const newParams = new URLSearchParams();
      if (query) {
        newParams.set('q', query);
      }
      if (keywords.length > 0) {
        newParams.set('keywords', keywords.join(','));
      }
      const newUrl = newParams.toString() ? `/search?${newParams.toString()}` : '/search';
      router.push(newUrl);
      
      // Debug: log experiences to check keywords
      console.log('Search results:', experiences.map(exp => ({
        id: exp.id,
        title: exp.title,
        keywords: exp.keywords,
        similarity: exp.similarity
      })));
      
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
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {searchResults.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {searchTerm || selectedKeywords.length > 0 
                ? `搜索结果 (${searchResults.length}条)` 
                : `推荐内容 (${searchResults.length}条)`}
            </div>
            {(searchTerm || selectedKeywords.length > 0) && (
              <div className="text-gray-600">
                关于 "{searchTerm || selectedKeywords.join(', ')}"
                {selectedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedKeywords.map((keyword, idx) => (
                      <span 
                        key={idx}
                        className="tag !text-xs !px-2 !py-1"
                        onClick={() => {
                          // 点击标签可以移除
                          const newKeywords = selectedKeywords.filter((_, i) => i !== idx);
                          setSelectedKeywords(newKeywords);
                          if (newKeywords.length === 0) {
                            setSearchTerm('');
                            router.push('/search');
                            loadDefaultExperiences();
                          } else {
                            setSearchTerm(newKeywords.join(', '));
                            searchExperiences('', newKeywords, 20)
                              .then(setSearchResults)
                              .catch(err => setError(err instanceof Error ? err.message : '搜索失败'));
                          }
                        }}
                      >
                        {keyword} <i className="fas fa-times ml-1 cursor-pointer"></i>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            {searchResults.map((experience, index) => (
              <Link 
                key={experience.id} 
                href={`/experience/${experience.id}`}
                className="block"
              >
                <div className="feature-card !items-start !text-left cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="feature-title !text-left w-full">
                    <i className="fas fa-file-alt text-blue-600 mr-2"></i>
                    {experience.title}
                  </div>
                  <p className="text-gray-600 my-3 text-left w-full">
                    {experience.problem_description.length > 100 
                      ? experience.problem_description.substring(0, 100) + '...' 
                      : experience.problem_description}
                  </p>
                  <div className="flex justify-between items-center w-full text-sm text-gray-500 mt-auto pt-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <i className="fas fa-tag mr-1"></i>
                      {experience.keywords && Array.isArray(experience.keywords) && experience.keywords.length > 0 ? (
                        experience.keywords.map((keyword, idx) => (
                          <span key={idx} className="tag !text-xs !px-2 !py-1">
                            {keyword}
                          </span>
                        ))
                      ) : (
                        <span className="tag !text-xs !px-2 !py-1">General</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {experience.similarity !== undefined && experience.similarity !== null && (
                        <span 
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                            experience.similarity >= 0.7 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : experience.similarity >= 0.5 
                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                              : 'bg-orange-100 text-orange-700 border border-orange-300'
                          }`}
                          title={`匹配度: ${(experience.similarity * 100).toFixed(1)}%`}
                        >
                          <i className="fas fa-chart-line text-xs"></i>
                          <span>匹配度 {(experience.similarity * 100).toFixed(0)}%</span>
                        </span>
                      )}
                      <span><i className="fas fa-eye mr-1"></i> {experience.view_count || 0}次浏览</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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