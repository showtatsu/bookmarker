'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-6xl mb-6">⚠️</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        エラーが発生しました
      </h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        申し訳ございません。予期しないエラーが発生しました。
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
      >
        再試行
      </button>
    </div>
  );
}
