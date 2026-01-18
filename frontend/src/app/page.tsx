'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const features = [
  {
    icon: '🔖',
    title: 'ブックマーク管理',
    description: 'URLとファイルパスをまとめて管理',
  },
  {
    icon: '🏷️',
    title: 'タグ整理',
    description: '柔軟なタグ付けで素早く検索',
  },
  {
    icon: '⭐',
    title: 'お気に入り',
    description: '重要なブックマークをすぐにアクセス',
  },
  {
    icon: '🔒',
    title: '安全な管理',
    description: 'あなただけのプライベート空間',
  },
];

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/bookmarks');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          📚 Bookmarker
        </h1>
        <p className="text-xl text-gray-600 mb-4">
          あなたのブックマークをスマートに管理
        </p>
        <p className="text-gray-500 mb-10 max-w-2xl mx-auto">
          URLとファイルパスを一元管理。タグで整理、すぐに見つかる。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-lg"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
          >
            新規登録
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
            主な機能
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
