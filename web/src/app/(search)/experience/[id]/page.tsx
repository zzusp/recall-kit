import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ExperienceService } from '@/lib/services/experienceService';

interface ExperienceDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ExperienceDetailPage({ params }: ExperienceDetailPageProps) {
  const experienceService = new ExperienceService();
  const experience = await experienceService.getExperienceById(params.id);

  if (!experience) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Link 
        href="/"
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        ← Back to Home
      </Link>

      <article className="bg-white rounded-lg shadow-md p-6">
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
            <span>Viewed {experience.query_count} times</span>
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
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                {experience.context}
              </pre>
            </div>
          )}
        </section>
      </article>
    </main>
  );
}