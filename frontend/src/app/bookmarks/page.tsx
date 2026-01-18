'use client';

import { BookmarkModal } from '@/components/BookmarkModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  EditIcon,
  FileIcon,
  FolderIcon,
  GlobeIcon,
  PlusIcon,
  ServerIcon,
  StarIcon,
  TrashIcon,
} from '@/components/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { api, type Bookmark, type Tag } from '@/lib/api';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
const SearchFilters = dynamic(() => import('./SearchFilters.client'), { ssr: false });

export default function BookmarksPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // フィルター状態（URLパラメータから初期化）
  const [search, setSearch] = useState('');
  const [pathTypeFilter, setPathTypeFilter] = useState<string>('');
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // ページネーション
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // モーダル状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bookmark | null>(null);

  // クイック追加メニュー状態
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    path: '',
    title: '',
    description: '',
    tags: [] as string[],
    isFavorite: false,
  });
  const [quickAddTagInput, setQuickAddTagInput] = useState('');
  const [isQuickAddSaving, setIsQuickAddSaving] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.getBookmarks({
        search: search || undefined,
        pathType: pathTypeFilter || undefined,
        favorite: favoriteFilter || undefined,
        tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
        page,
        limit,
      });
      setBookmarks(response.data);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotal(response.pagination.total);
      }
    } catch {
      setError('ブックマークの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [search, pathTypeFilter, favoriteFilter, selectedTags, page]);

  const fetchTags = useCallback(async () => {
    try {
      // お気に入りタグのみ取得
      const response = await api.getTags({ favorite: true });
      setTags(response.data);
    } catch {
      console.error('タグの取得に失敗しました');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // クライアントマウント後に URL の tags パラメータを読み取って初期化
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tagsParam = params.get('tags');
      if (tagsParam) {
        setSelectedTags(tagsParam.split(','));
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookmarks();
      fetchTags();
    }
  }, [isAuthenticated, fetchBookmarks, fetchTags]);

  // 検索のデバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleFavorite = async (bookmark: Bookmark) => {
    try {
      const response = await api.toggleFavorite(bookmark.id);
      setBookmarks((prev) =>
        prev.map((b) => (b.id === bookmark.id ? response.data : b))
      );
    } catch {
      setError('お気に入りの切り替えに失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteBookmark(deleteTarget.id);
      setBookmarks((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('ブックマークの削除に失敗しました');
    }
  };

  const handleSave = async (data: {
    path: string;
    title: string;
    description?: string;
    tags?: string[];
    isFavorite?: boolean;
  }) => {
    try {
      if (editingBookmark) {
        await api.updateBookmark(editingBookmark.id, data);
      } else {
        await api.createBookmark(data);
      }
      setIsModalOpen(false);
      setEditingBookmark(null);
      fetchBookmarks();
      fetchTags();
    } catch {
      throw new Error('保存に失敗しました');
    }
  };

  // クイック追加のハンドラー
  const handleQuickAddSave = async () => {
    if (!quickAddData.path || !quickAddData.title) {
      setError('URLとタイトルは必須です');
      return;
    }

    setIsQuickAddSaving(true);
    try {
      await api.createBookmark({
        path: quickAddData.path,
        title: quickAddData.title,
        description: quickAddData.description || undefined,
        tags: quickAddData.tags.length > 0 ? quickAddData.tags : undefined,
        isFavorite: quickAddData.isFavorite,
      });
      // 成功したらフォームをリセット
      setQuickAddData({
        path: '',
        title: '',
        description: '',
        tags: [],
        isFavorite: false,
      });
      setQuickAddTagInput('');
      fetchBookmarks();
      fetchTags();
    } catch {
      setError('ブックマークの追加に失敗しました');
    } finally {
      setIsQuickAddSaving(false);
    }
  };

  const handleQuickAddCancel = () => {
    setQuickAddData({
      path: '',
      title: '',
      description: '',
      tags: [],
      isFavorite: false,
    });
    setQuickAddTagInput('');
  };

  const handleQuickAddTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = quickAddTagInput.trim();
      if (tag && !quickAddData.tags.includes(tag)) {
        setQuickAddData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      }
      setQuickAddTagInput('');
    }
  };

  const handleQuickAddRemoveTag = (tagToRemove: string) => {
    setQuickAddData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };


  const getPathTypeIcon = (pathType: string) => {
    const iconClass = 'text-gray-500';
    switch (pathType) {
      case 'url':
        return <GlobeIcon className={iconClass} size={14} />;
      case 'file':
        return <FolderIcon className={iconClass} size={14} />;
      case 'network':
        return <ServerIcon className={iconClass} size={14} />;
      default:
        return <FileIcon className={iconClass} size={14} />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            閉じる
          </button>
        </div>
      )}

      {/* Search & Filters - client component */}
      <SearchFilters
        favoriteFilter={favoriteFilter}
        setFavoriteFilter={(v) => {
          setFavoriteFilter(v);
          setPage(1);
        }}
        pathTypeFilter={pathTypeFilter}
        setPathTypeFilter={(v) => {
          setPathTypeFilter(v);
          setPage(1);
        }}
        search={search}
        setSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onOpenAddModal={() => {
          setEditingBookmark(null);
          setIsModalOpen(true);
        }}
      />

      {/* Tags filter - 2行目 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.slice(0, 15).map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                setSelectedTags((prev) =>
                  prev.includes(tag.name)
                    ? prev.filter((t) => t !== tag.name)
                    : [...prev, tag.name]
                );
                setPage(1);
              }}
              className={`px-2 py-0.5 text-xs rounded-full transition ${
                selectedTags.includes(tag.name)
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Bookmarks Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500 mb-4">ブックマークがありません</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-blue-600 hover:underline"
          >
            最初のブックマークを追加する
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 w-8">
                      <StarIcon size={12} className="text-gray-400" />
                    </th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">
                      タイトル
                    </th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">
                      URL/パス
                    </th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 hidden lg:table-cell">
                      タグ
                    </th>
                    <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500 w-16">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookmarks.map((bookmark) => (
                    <tr key={bookmark.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1">
                        <button
                          onClick={() => handleToggleFavorite(bookmark)}
                          className={`hover:scale-110 transition ${bookmark.isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                        >
                          <StarIcon size={14} filled={bookmark.isFavorite} />
                        </button>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          {getPathTypeIcon(bookmark.pathType)}
                          <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                            {bookmark.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <a
                            href={bookmark.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline text-xs truncate block max-w-[280px]"
                            title={bookmark.path}
                          >
                            {bookmark.path}
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(bookmark.path);
                            }}
                            className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition flex-shrink-0"
                            title="URLをコピー"
                          >
                            <CopyIcon size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-1 hidden lg:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {bookmark.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {bookmark.tags.length > 3 && (
                            <span className="text-gray-400 text-xs">
                              +{bookmark.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingBookmark(bookmark);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="編集"
                          >
                            <EditIcon size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(bookmark)}
                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="削除"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              全{total}件中 {(page - 1) * limit + 1}-
              {Math.min(page * limit, total)}件を表示
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← 前へ
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Quick Add Menu */}
      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <span className="font-medium text-gray-900 flex items-center gap-2">
            <PlusIcon size={16} className="text-blue-600" />
            ブックマークを追加
          </span>
          {isQuickAddOpen ? (
            <ChevronUpIcon size={20} className="text-gray-500" />
          ) : (
            <ChevronDownIcon size={20} className="text-gray-500" />
          )}
        </button>

        {isQuickAddOpen && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mt-4">
              {/* URL */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  URL / パス <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickAddData.path}
                  onChange={(e) =>
                    setQuickAddData((prev) => ({ ...prev, path: e.target.value }))
                  }
                  placeholder="https://example.com"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                />
              </div>

              {/* タイトル */}
              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickAddData.title}
                  onChange={(e) =>
                    setQuickAddData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="タイトルを入力"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                />
              </div>

              {/* タグ */}
              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  タグ
                </label>
                <div className="flex flex-wrap gap-1 px-2 py-1 border border-gray-300 rounded min-h-[34px] bg-white">
                  {quickAddData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleQuickAddRemoveTag(tag)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={quickAddTagInput}
                    onChange={(e) => setQuickAddTagInput(e.target.value)}
                    onKeyDown={handleQuickAddTagKeyDown}
                    placeholder={quickAddData.tags.length === 0 ? 'タグを入力' : ''}
                    className="flex-1 min-w-[60px] text-sm outline-none text-gray-900"
                  />
                </div>
              </div>

              {/* お気に入り */}
              <div className="lg:col-span-1 flex items-end">
                <label className="flex items-center gap-2 cursor-pointer py-1.5">
                  <input
                    type="checkbox"
                    checked={quickAddData.isFavorite}
                    onChange={(e) =>
                      setQuickAddData((prev) => ({
                        ...prev,
                        isFavorite: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">お気に入り</span>
                </label>
              </div>

              {/* 操作ボタン */}
              <div className="lg:col-span-1 flex items-end gap-2">
                <button
                  onClick={handleQuickAddSave}
                  disabled={isQuickAddSaving || !quickAddData.path || !quickAddData.title}
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isQuickAddSaving ? '追加中...' : '追加'}
                </button>
                <button
                  onClick={handleQuickAddCancel}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition"
                >
                  クリア
                </button>
              </div>
            </div>

            {/* 説明（折りたたみ可能にするか、常に表示するか） */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                説明
              </label>
              <input
                type="text"
                value={quickAddData.description}
                onChange={(e) =>
                  setQuickAddData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="説明を入力（省略可）"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <BookmarkModal
          bookmark={editingBookmark}
          tags={tags}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBookmark(null);
          }}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="ブックマークを削除"
          message={`「${deleteTarget.title}」を削除してもよろしいですか？`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
