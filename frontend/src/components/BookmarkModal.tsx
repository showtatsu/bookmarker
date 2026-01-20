'use client';

import type { Bookmark, Tag } from '@/lib/api';
import { useState, useMemo } from 'react';

interface BookmarkModalProps {
  bookmark: Bookmark | null;
  tags: Tag[];
  onClose: () => void;
  onSave: (data: {
    path: string;
    title: string;
    description?: string;
    tags?: string[];
    isFavorite?: boolean;
  }) => Promise<void>;
}

export function BookmarkModal({ bookmark, tags, onClose, onSave }: BookmarkModalProps) {
  const [path, setPath] = useState(bookmark?.path || '');
  const [title, setTitle] = useState(bookmark?.title || '');
  const [description, setDescription] = useState(bookmark?.description || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(bookmark?.tags || []);
  const [isFavorite, setIsFavorite] = useState(bookmark?.isFavorite || false);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // インクリメンタルサーチ用のフィルタリング
  const filteredTagSuggestions = useMemo(() => {
    return tags.filter(
      (tag) =>
        !selectedTags.includes(tag.name) &&
        tag.name.toLowerCase().includes(newTag.toLowerCase())
    );
  }, [tags, selectedTags, newTag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!path.trim()) {
      setError('URL/パスを入力してください');
      return;
    }

    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    setIsLoading(true);

    try {
      await onSave({
        path: path.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        tags: selectedTags,
        isFavorite,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    setNewTag('');
    setShowTagSuggestions(false);
  };

  const selectTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
    setNewTag('');
    setShowTagSuggestions(false);
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {bookmark ? 'ブックマークを編集' : 'ブックマークを追加'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL/パス <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="https://example.com または /path/to/file"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ブックマークのタイトル"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ブックマークの説明（任意）"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タグ
            </label>
            <div className="relative">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => {
                    setNewTag(e.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowTagSuggestions(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    } else if (e.key === 'Escape') {
                      setShowTagSuggestions(false);
                    }
                  }}
                  placeholder="タグを追加"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  +
                </button>
              </div>

              {/* タグ候補ドロップダウン */}
              {showTagSuggestions && (newTag || filteredTagSuggestions.length > 0) && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredTagSuggestions.length > 0 ? (
                    <>
                      {filteredTagSuggestions.slice(0, 10).map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectTag(tag.name)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                        >
                          {tag.name}
                        </button>
                      ))}
                    </>
                  ) : newTag.trim() ? (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectTag(newTag.trim())}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                    >
                      「{newTag.trim()}」を新規タグとして追加
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Selected tags */}
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1 text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Existing tags suggestions */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags
                  .filter((t) => !selectedTags.includes(t.name))
                  .slice(0, 8)
                  .map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setSelectedTags([...selectedTags, tag.name])}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
                    >
                      + {tag.name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">お気に入りに追加</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
            >
              {isLoading ? '保存中...' : bookmark ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
