'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ExperienceRecord } from '@/lib/services/experienceService';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AdminReviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewContentInner />
    </Suspense>
  );
}

function ReviewContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [experiences, setExperiences] = useState<ExperienceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const status = searchParams.get('status') || 'published';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  useEffect(() => {
    const fetchExperiences = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Verify admin session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/admin/login');
          return;
        }

        // Fetch experiences with admin access
        const { data, error: fetchError } = await supabase
          .from('experience_records')
          .select(`
            *,
            experience_keywords:experience_keywords(keyword),
            profiles:user_id(username, email)
          `)
          .eq('status', status)
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        const formattedExperiences = (data || []).map(record => ({
          ...record,
          keywords: (record as any).experience_keywords?.map((k: any) => k.keyword) || [],
          author: (record as any).profiles || null
        }));

        setExperiences(formattedExperiences);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load experiences');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExperiences();
  }, [status, page, router]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('experience_records')
        .update({ 
          status: 'deleted',
          deleted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Refresh the list
      setExperiences(prev => prev.filter(exp => exp.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete experience');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('experience_records')
        .update({ 
          status: 'published',
          deleted_at: null
        })
        .eq('id', id);

      if (error) throw error;

      // Refresh the list
      setExperiences(prev => prev.filter(exp => exp.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore experience');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Review Experiences</h1>
        <p>Loading experiences...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Review Experiences</h1>
        <div className="flex gap-4">
          <select
            value={status}
            onChange={(e) => router.push(`/admin/review?status=${e.target.value}`)}
            className="px-3 py-2 border rounded"
          >
            <option value="published">Published</option>
            <option value="deleted">Deleted</option>
            <option value="all">All</option>
          </select>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {experiences.map(experience => (
          <div key={experience.id} className="border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-2">{experience.title}</h3>
            <p className="text-gray-600 mb-3">{experience.problem_description}</p>
            
            {experience.keywords && experience.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {experience.keywords.map(keyword => (
                  <span key={keyword} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                    {keyword}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>By {experience.author?.email || 'Anonymous'}</span>
              <span>{new Date(experience.created_at).toLocaleDateString()}</span>
            </div>

            <div className="flex gap-2">
              {experience.status === 'published' ? (
                <button
                  onClick={() => handleDelete(experience.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
              ) : (
                <button
                  onClick={() => handleRestore(experience.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Restore
                </button>
              )}
              <button
                onClick={() => router.push(`/experience/${experience.id}`)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {experiences.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No experiences found</p>
        </div>
      )}
    </div>
  );
}