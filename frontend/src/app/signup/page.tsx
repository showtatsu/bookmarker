'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // ユーザー名バリデーション
    if (!username) {
      newErrors.username = 'ユーザー名を入力してください';
    } else if (username.length < 3) {
      newErrors.username = 'ユーザー名は3文字以上で入力してください';
    } else if (username.length > 30) {
      newErrors.username = 'ユーザー名は30文字以下で入力してください';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = 'ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます';
    }

    // メールアドレスバリデーション
    if (!email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    // パスワードバリデーション
    if (!password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (password.length < 8) {
      newErrors.password = 'パスワードは8文字以上で入力してください';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'パスワードは大文字、小文字、数字を含む必要があります';
    }

    // パスワード確認
    if (password !== passwordConfirm) {
      newErrors.passwordConfirm = 'パスワードが一致しません';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await register(username, email, password);
      router.push('/login?registered=true');
    } catch (err) {
      const error = err as Error & { code?: string; details?: { field: string; message: string }[] };
      if (error.code === 'CONFLICT') {
        if (error.details) {
          const fieldErrors: FormErrors = {};
          error.details.forEach((detail) => {
            if (detail.field === 'username') {
              fieldErrors.username = 'このユーザー名は既に使用されています';
            } else if (detail.field === 'email') {
              fieldErrors.email = 'このメールアドレスは既に使用されています';
            }
          });
          setErrors(fieldErrors);
        } else {
          setServerError('このユーザー名またはメールアドレスは既に使用されています');
        }
      } else {
        setServerError('登録に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
            新規登録
          </h1>

          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                ユーザー名 <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900 ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例: john_doe"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例: john@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="8文字以上、大文字・小文字・数字を含む"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="passwordConfirm"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                パスワード（確認） <span className="text-red-500">*</span>
              </label>
              <input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900 ${
                  errors.passwordConfirm ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="パスワードを再入力"
              />
              {errors.passwordConfirm && (
                <p className="mt-1 text-sm text-red-500">{errors.passwordConfirm}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
            >
              {isLoading ? '登録中...' : '登録する'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            既にアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
