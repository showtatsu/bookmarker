import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-6xl mb-6">🔍</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        404 - ページが見つかりません
      </h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
      >
        トップページへ戻る
      </Link>
    </div>
  );
}
