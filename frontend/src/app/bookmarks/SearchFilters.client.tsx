'use client';

import { PlusIcon, SearchIcon, StarIcon } from '@/components/Icons';
import { useEffect, useState } from 'react';

export default function SearchFilters(props: {
  favoriteFilter: boolean;
  setFavoriteFilter: (v: boolean) => void;
  pathTypeFilter: string;
  setPathTypeFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  onOpenAddModal: () => void;
}) {
  const [localSearch, setLocalSearch] = useState(props.search || '');

  const { search: propSearch, setSearch: propSetSearch } = props;

  useEffect(() => {
    setLocalSearch(propSearch || '');
  }, [propSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      propSetSearch(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, propSetSearch]);

  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="relative flex-1">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
          <SearchIcon size={14} />
        </span>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="検索..."
          autoFocus
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
        />
      </div>

      <select
        value={props.pathTypeFilter}
        onChange={(e) => {
          props.setPathTypeFilter(e.target.value);
        }}
        className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-gray-900"
      >
        <option value="">すべて</option>
        <option value="url">URL</option>
        <option value="file">ファイル</option>
        <option value="network">ネットワーク</option>
      </select>

      <button
        onClick={() => props.setFavoriteFilter(!props.favoriteFilter)}
        className={`px-2 py-1.5 border rounded transition flex items-center justify-center ${
          props.favoriteFilter
            ? 'bg-yellow-50 border-yellow-300 text-yellow-600'
            : 'border-gray-300 text-gray-400 hover:bg-gray-50'
        }`}
      >
        <StarIcon size={14} filled={props.favoriteFilter} />
      </button>

      <button
        onClick={props.onOpenAddModal}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition flex items-center gap-1"
      >
        <PlusIcon size={14} />
        <span>追加</span>
      </button>
    </div>
  );
}
