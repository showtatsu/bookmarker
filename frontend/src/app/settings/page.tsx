'use client';

import { useAuth } from '@/contexts/AuthContext';
import { api, ImportResult } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Import/Export state
  const [importType, setImportType] = useState<'bookmarks' | 'tags'>('bookmarks');
  const [importMode, setImportMode] = useState<'skip' | 'update' | 'duplicate'>('skip');
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Export handlers
  const handleExportBookmarks = async () => {
    setIsExporting(true);
    try {
      const blob = await api.exportBookmarks();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTags = async () => {
    setIsExporting(true);
    try {
      const blob = await api.exportTags();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tags_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Import handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setImportPreview(null);

    try {
      const content = await file.text();
      setCsvContent(content);

      // Preview mode
      setIsImporting(true);
      const result =
        importType === 'bookmarks'
          ? await api.importBookmarks(content, { preview: true, mode: importMode })
          : await api.importTags(content, { preview: true, mode: importMode as 'skip' | 'update' });

      setImportPreview(result.data);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportExecute = async () => {
    if (!csvContent) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const result =
        importType === 'bookmarks'
          ? await api.importBookmarks(csvContent, { preview: false, mode: importMode })
          : await api.importTags(csvContent, { preview: false, mode: importMode as 'skip' | 'update' });

      setImportSuccess(
        `インポート完了: ${result.data.imported}件追加, ${result.data.updated}件更新, ${result.data.skipped}件スキップ` +
          (result.data.tagsCreated.length > 0
            ? `, 新規タグ: ${result.data.tagsCreated.join(', ')}`
            : '')
      );
      setImportPreview(null);
      setCsvContent(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'インポートに失敗しました');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCancel = () => {
    setImportPreview(null);
    setCsvContent(null);
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">設定</h1>

      <div className="space-y-6">
        {/* Account Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">アカウント</h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <h3 className="font-medium text-gray-900">ユーザー名</h3>
                <p className="text-sm text-gray-500">{user.username}</p>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <h3 className="font-medium text-gray-900">メールアドレス</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="flex justify-between items-center py-3">
              <div>
                <h3 className="font-medium text-gray-900">パスワード</h3>
                <p className="text-sm text-gray-500">••••••••</p>
              </div>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                変更
              </button>
            </div>
          </div>
        </div>

        {/* Session Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">セッション</h2>

          <div className="flex justify-between items-center py-3">
            <div>
              <h3 className="font-medium text-gray-900">ログアウト</h3>
              <p className="text-sm text-gray-500">現在のセッションからログアウトします</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* Data Export Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">データエクスポート</h2>
          <p className="text-sm text-gray-500 mb-4">
            ブックマークとタグをCSV形式でダウンロードできます。
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportBookmarks}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              ブックマークをエクスポート
            </button>
            <button
              onClick={handleExportTags}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              タグをエクスポート
            </button>
          </div>
        </div>

        {/* Data Import Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">データインポート</h2>
          <p className="text-sm text-gray-500 mb-4">
            CSVファイルからブックマークやタグをインポートできます。
            存在しないタグは自動的に作成されます。
          </p>

          {importError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {importError}
            </div>
          )}

          {importSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {importSuccess}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  インポート対象
                </label>
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as 'bookmarks' | 'tags')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="bookmarks">ブックマーク</option>
                  <option value="tags">タグ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重複時の動作
                </label>
                <select
                  value={importMode}
                  onChange={(e) =>
                    setImportMode(e.target.value as 'skip' | 'update' | 'duplicate')
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="skip">スキップ</option>
                  <option value="update">更新</option>
                  {importType === 'bookmarks' && (
                    <option value="duplicate">新規作成</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CSVファイル
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          {/* Import Preview */}
          {importPreview && (
            <div className="mt-6 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">プレビュー</h3>

              <div className="space-y-3 text-sm">
                {importPreview.preview.toImport.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-600 mb-1">
                      新規追加 ({importPreview.preview.toImport.length}件)
                    </h4>
                    <ul className="list-disc list-inside text-gray-600 max-h-32 overflow-y-auto">
                      {importPreview.preview.toImport.slice(0, 10).map((item, i) => (
                        <li key={i}>
                          {item.title}
                          {item.tags.length > 0 && (
                            <span className="text-gray-400 ml-1">
                              [{item.tags.join(', ')}]
                            </span>
                          )}
                        </li>
                      ))}
                      {importPreview.preview.toImport.length > 10 && (
                        <li className="text-gray-400">
                          ...他 {importPreview.preview.toImport.length - 10}件
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {importPreview.preview.toUpdate.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-600 mb-1">
                      更新 ({importPreview.preview.toUpdate.length}件)
                    </h4>
                    <ul className="list-disc list-inside text-gray-600 max-h-32 overflow-y-auto">
                      {importPreview.preview.toUpdate.slice(0, 10).map((item, i) => (
                        <li key={i}>{item.title}</li>
                      ))}
                      {importPreview.preview.toUpdate.length > 10 && (
                        <li className="text-gray-400">
                          ...他 {importPreview.preview.toUpdate.length - 10}件
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {importPreview.preview.toSkip.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-500 mb-1">
                      スキップ ({importPreview.preview.toSkip.length}件)
                    </h4>
                    <ul className="list-disc list-inside text-gray-400 max-h-32 overflow-y-auto">
                      {importPreview.preview.toSkip.slice(0, 5).map((item, i) => (
                        <li key={i}>
                          {item.title} - {item.reason}
                        </li>
                      ))}
                      {importPreview.preview.toSkip.length > 5 && (
                        <li>...他 {importPreview.preview.toSkip.length - 5}件</li>
                      )}
                    </ul>
                  </div>
                )}

                {importPreview.tagsCreated.length > 0 && (
                  <div>
                    <h4 className="font-medium text-purple-600 mb-1">
                      新規作成されるタグ ({importPreview.tagsCreated.length}件)
                    </h4>
                    <p className="text-gray-600">
                      {importPreview.tagsCreated.join(', ')}
                    </p>
                  </div>
                )}

                {importPreview.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-1">
                      エラー ({importPreview.errors.length}件)
                    </h4>
                    <ul className="list-disc list-inside text-red-500 max-h-32 overflow-y-auto">
                      {importPreview.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleImportExecute}
                  disabled={isImporting || importPreview.imported === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {isImporting ? 'インポート中...' : 'インポート実行'}
                </button>
                <button
                  onClick={handleImportCancel}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
          <h2 className="text-lg font-semibold text-red-600 mb-4">危険な操作</h2>

          <div className="flex justify-between items-center py-3">
            <div>
              <h3 className="font-medium text-gray-900">アカウント削除</h3>
              <p className="text-sm text-gray-500">
                アカウントと全てのデータを削除します。この操作は取り消せません。
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
            >
              削除
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              アカウントを削除しますか？
            </h2>
            <p className="text-gray-600 mb-6">
              この操作を行うと、すべてのブックマーク、タグ、設定が完全に削除されます。
              この操作は取り消すことができません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
