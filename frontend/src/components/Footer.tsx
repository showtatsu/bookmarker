import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>© 2026 Bookmarker</span>
          <nav className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-300">
              利用規約
            </Link>
            <Link href="/privacy" className="hover:text-gray-300">
              プライバシー
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
