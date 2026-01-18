'use client';

import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import {
  EditIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  TrashIcon,
} from '@/components/Icons';
import { TagModal } from '@/components/TagModal';
import { useAuth } from '@/contexts/AuthContext';
import { api, type Tag } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function TagsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<string>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // モーダル状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.getTags({
        search: search || undefined,
        sort,
        order,
      });
      setTags(response.data);
    } catch {
      setError('タグの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [search, sort, order]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTags();
    }
  }, [isAuthenticated, fetchTags]);

  // 検索のデバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        fetchTags();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, isAuthenticated, fetchTags]);

  const handleCreate = async (name: string) => {
    try {
      await api.createTag(name);
      setIsModalOpen(false);
      fetchTags();
    } catch {
      throw new Error('タグの作成に失敗しました');
    }
  };

  const handleUpdate = async (name: string) => {
    if (!editingTag) return;
    try {
      await api.updateTag(editingTag.id, { name });
      setEditingTag(null);
      setIsModalOpen(false);
      fetchTags();
    } catch {
      throw new Error('タグの更新に失敗しました');
    }
  };

  const handleToggleFavorite = async (tag: Tag) => {
    try {
      const response = await api.toggleTagFavorite(tag.id);
      setTags((prev) => prev.map((t) => (t.id === tag.id ? response.data : t)));
    } catch {
      setError('お気に入りの切り替えに失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteTag(deleteTarget.id);
      setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('タグの削除に失敗しました');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            閉じる
          </button>
        </div>
      )}

      {/* Search & Sort - 1行 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon size={14} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="タグを検索..."
            autoFocus
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
          />
        </div>
        <select
          value={`${sort}-${order}`}
          onChange={(e) => {
            const [newSort, newOrder] = e.target.value.split('-');
            setSort(newSort);
            setOrder(newOrder as 'asc' | 'desc');
          }}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-gray-900"
        >
          <option value="name-asc">名前 A→Z</option>
          <option value="name-desc">名前 Z→A</option>
          <option value="bookmark_count-desc">使用数↓</option>
          <option value="bookmark_count-asc">使用数↑</option>
          <option value="created_at-desc">新しい順</option>
          <option value="created_at-asc">古い順</option>
        </select>
        <button
          onClick={() => {
            setEditingTag(null);
            setIsModalOpen(true);
          }}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition flex items-center gap-1"
        >
          <PlusIcon size={14} />
          <span>新規</span>
        </button>
      </div>

      {/* Tags List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tags.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500 mb-4">
            {search ? '検索結果がありません' : 'タグがありません'}
          </p>
          {!search && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-blue-600 hover:underline"
            >
              最初のタグを作成する
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 w-8">
                  <StarIcon size={12} className="text-gray-400" />
                </th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">
                  タグ名
                </th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500 w-16">
                  件数
                </th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500 w-16">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1">
                    <button
                      onClick={() => handleToggleFavorite(tag)}
                      className="p-1 rounded transition hover:bg-gray-100"
                      title={
                        tag.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'
                      }
                    >
                      <StarIcon
                        size={14}
                        filled={tag.isFavorite}
                        className={
                          tag.isFavorite ? 'text-yellow-500' : 'text-gray-400'
                        }
                      />
                    </button>
                  </td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() =>
                        router.push(
                          `/bookmarks?tags=${encodeURIComponent(tag.name)}`
                        )
                      }
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      title="このタグのブックマークを表示"
                    >
                      {tag.name}
                    </button>
                  </td>
                  <td className="px-2 py-1 text-right">
                    <span className="text-xs text-gray-500">
                      {tag.bookmarkCount}
                    </span>
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditingTag(tag);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="編集"
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(tag)}
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
      )}

      {/* Modals */}
      {isModalOpen && (
        <TagModal
          tag={editingTag}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTag(null);
          }}
          onSave={editingTag ? handleUpdate : handleCreate}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="タグを削除"
          message={`「${deleteTarget.name}」を削除してもよろしいですか？このタグが付いているブックマークからもタグが削除されます。`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
