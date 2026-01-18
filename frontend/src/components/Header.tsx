'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      setIsMenuOpen(false);
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const navLinks = [
    { href: '/bookmarks', label: 'ブックマーク' },
    { href: '/tags', label: 'タグ' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-12">
          {/* Navigation Tabs */}
          {isAuthenticated ? (
            <nav className="flex items-center h-full">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`h-full flex items-center px-3 sm:px-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                    pathname === link.href ||
                    pathname.startsWith(link.href + '/')
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : (
            <Link
              href="/"
              className="text-sm font-bold text-gray-900 whitespace-nowrap"
            >
              Bookmarker
            </Link>
          )}

          {/* Right Side - Account Menu */}
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded transition ${
                  isMenuOpen
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">👤</span>
                <span className="text-xs whitespace-nowrap">アカウント</span>
                <svg
                  className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500">ログイン中</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.username}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span>👤</span>
                    <span>プロフィール</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span>⚙️</span>
                    <span>設定</span>
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <span>🚪</span>
                    <span>ログアウト</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <nav className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap"
              >
                ログイン
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition whitespace-nowrap"
              >
                新規登録
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
