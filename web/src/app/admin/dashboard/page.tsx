'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalExperiences: 0,
    publishedExperiences: 0,
    deletedExperiences: 0,
    recentSubmissions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Verify admin session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/admin/login');
          return;
        }

        // Check admin role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role !== 'admin') {
          await supabase.auth.signOut();
          router.push('/admin/login');
          return;
        }

        // Fetch stats
        const [
          { count: total },
          { count: published },
          { count: deleted },
          { count: recent }
        ] = await Promise.all([
          supabase.from('experience_records').select('*', { count: 'exact', head: true }),
          supabase.from('experience_records').select('*', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('experience_records').select('*', { count: 'exact', head: true }).eq('status', 'deleted'),
          supabase.from('experience_records').select('*', { count: 'exact', head: true })
            .eq('status', 'published')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        setStats({
          totalExperiences: total || 0,
          publishedExperiences: published || 0,
          deletedExperiences: deleted || 0,
          recentSubmissions: recent || 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/admin/login');
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Experiences" 
          value={stats.totalExperiences} 
          link="/admin/review"
        />
        <StatCard 
          title="Published" 
          value={stats.publishedExperiences} 
          link="/admin/review?status=published"
        />
        <StatCard 
          title="Deleted" 
          value={stats.deletedExperiences} 
          link="/admin/review?status=deleted"
        />
        <StatCard 
          title="Recent (7d)" 
          value={stats.recentSubmissions} 
          link="/admin/review?status=published&sort=recent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AdminCard title="Review Experiences">
          <p className="mb-4">Review and manage all experience records submitted by users.</p>
          <Link
            href="/admin/review"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Review
          </Link>
        </AdminCard>

        <AdminCard title="System Settings">
          <p className="mb-4">Configure system settings and integrations.</p>
          <Link
            href="/admin/settings"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Settings
          </Link>
        </AdminCard>
      </div>
    </div>
  );
}

function StatCard({ title, value, link }: { title: string; value: number; link: string }) {
  return (
    <Link href={link}>
      <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
        <h3 className="text-lg font-medium text-gray-500">{title}</h3>
        <p className="mt-2 text-3xl font-bold">{value}</p>
      </div>
    </Link>
  );
}

function AdminCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}