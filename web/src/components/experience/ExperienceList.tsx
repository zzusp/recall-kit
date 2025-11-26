import Link from 'next/link';
import { ExperienceRecord } from '@/lib/server/services/experience';

interface ExperienceListProps {
  experiences: ExperienceRecord[];
}

export function ExperienceList({ experiences }: ExperienceListProps) {
  if (experiences.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">No experiences found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {experiences.map(experience => (
        <div 
          key={experience.id}
          className="feature-card"
        >
          <Link href={`/experience/${experience.id}`}>
            <h3 className="text-xl font-semibold mb-2 hover:text-blue-600">
              {experience.title}
            </h3>
          </Link>
          
          <p className="text-gray-600 mb-3 line-clamp-2">
            {experience.problem_description}
          </p>
          
          {experience.keywords && experience.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {experience.keywords.map(keyword => (
                <span 
                  key={keyword} 
                  className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Viewed {experience.query_count} times</span>
            <span>
              {new Date(experience.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}